"""
WeDealize AI Agent Orchestrator
전체 공급사 탐색 및 데이터 수집 파이프라인 관리
"""

import asyncio
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime
from dataclasses import dataclass
from enum import Enum

# 내부 모듈
from .supplier_discovery_agent import (
    SupplierDiscoveryAgent,
    SearchCriteria,
    DiscoveredSupplier,
    AlibabaCrawler,
    GlobalSourcesCrawler,
    WebSearchCrawler
)
from ..parsers.catalog_parser import CatalogParser, ExtractedProduct
from ..models.database import (
    Supplier, Product, Catalog, CrawlJob,
    SupplierStatus, CrawlStatus,
    init_database, get_session
)

# 로깅 설정
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class PipelineStage(Enum):
    IDLE = "idle"
    DISCOVERING = "discovering"
    CRAWLING = "crawling"
    PARSING = "parsing"
    STORING = "storing"
    COMPLETED = "completed"
    ERROR = "error"


@dataclass
class PipelineResult:
    """파이프라인 실행 결과"""
    stage: PipelineStage
    suppliers_discovered: int = 0
    products_extracted: int = 0
    catalogs_parsed: int = 0
    errors: List[str] = None
    execution_time_seconds: float = 0
    details: Dict[str, Any] = None

    def __post_init__(self):
        self.errors = self.errors or []
        self.details = self.details or {}


class SupplierDiscoveryOrchestrator:
    """
    AI Agent 오케스트레이터

    전체 플로우:
    1. 사용자 검색 쿼리 수신
    2. AI가 검색 조건 해석
    3. 다양한 소스에서 공급사 탐색
    4. 공급사 웹사이트 크롤링
    5. 카탈로그/가격표 수집 및 파싱
    6. DB 저장
    7. 결과 반환
    """

    def __init__(self, config: Dict[str, Any] = None):
        self.config = config or {}

        # 컴포넌트 초기화
        self.discovery_agent = SupplierDiscoveryAgent()
        self.catalog_parser = CatalogParser()

        # 데이터베이스
        db_url = self.config.get("database_url", "sqlite:///wedealize.db")
        self.engine = init_database(db_url)
        self.db_session = get_session(self.engine)

        # 데이터 소스 등록
        self._register_data_sources()

        # 상태
        self.current_stage = PipelineStage.IDLE
        self.current_job_id = None

    def _register_data_sources(self):
        """크롤러 데이터 소스 등록"""
        # Alibaba
        self.discovery_agent.register_data_source(
            AlibabaCrawler(api_key=self.config.get("alibaba_api_key"))
        )

        # Global Sources
        self.discovery_agent.register_data_source(GlobalSourcesCrawler())

        # Web Search
        self.discovery_agent.register_data_source(WebSearchCrawler())

    async def run_discovery_pipeline(
        self,
        query: str,
        auto_crawl: bool = True,
        auto_parse: bool = True
    ) -> PipelineResult:
        """
        전체 탐색 파이프라인 실행

        Args:
            query: 자연어 검색 쿼리
            auto_crawl: 자동으로 카탈로그 크롤링 수행
            auto_parse: 자동으로 카탈로그 파싱 수행
        """
        start_time = datetime.now()
        result = PipelineResult(stage=PipelineStage.IDLE)

        try:
            # 1. 검색 조건 해석
            logger.info(f"검색 쿼리 해석 중: {query}")
            self.current_stage = PipelineStage.DISCOVERING

            criteria = await self.discovery_agent.interpret_search_query(query)
            logger.info(f"해석된 조건: {criteria}")

            # 2. 공급사 탐색
            logger.info("공급사 탐색 시작...")
            suppliers = await self.discovery_agent.discover_suppliers(criteria)
            result.suppliers_discovered = len(suppliers)
            logger.info(f"발견된 공급사: {len(suppliers)}개")

            # 3. 공급사 정보 DB 저장
            saved_suppliers = await self._save_suppliers(suppliers, query)

            # 4. 카탈로그 크롤링 (옵션)
            if auto_crawl and suppliers:
                self.current_stage = PipelineStage.CRAWLING
                logger.info("카탈로그 크롤링 시작...")
                catalogs = await self._crawl_catalogs(saved_suppliers[:10])  # 상위 10개만
                result.catalogs_parsed = len(catalogs)

            # 5. 카탈로그 파싱 (옵션)
            if auto_parse and result.catalogs_parsed > 0:
                self.current_stage = PipelineStage.PARSING
                logger.info("카탈로그 파싱 시작...")
                products = await self._parse_catalogs(catalogs)
                result.products_extracted = len(products)

                # 상품 정보 DB 저장
                await self._save_products(products, saved_suppliers)

            self.current_stage = PipelineStage.COMPLETED
            result.stage = PipelineStage.COMPLETED

        except Exception as e:
            logger.error(f"파이프라인 오류: {str(e)}")
            self.current_stage = PipelineStage.ERROR
            result.stage = PipelineStage.ERROR
            result.errors.append(str(e))

        # 실행 시간 계산
        result.execution_time_seconds = (datetime.now() - start_time).total_seconds()

        return result

    async def _save_suppliers(
        self,
        suppliers: List[DiscoveredSupplier],
        original_query: str
    ) -> List[Supplier]:
        """공급사 정보 DB 저장"""
        saved = []

        for s in suppliers:
            # 중복 체크
            existing = self.db_session.query(Supplier).filter(
                Supplier.name == s.name,
                Supplier.country == s.country
            ).first()

            if existing:
                # 기존 데이터 업데이트
                existing.ai_confidence_score = s.confidence_score
                existing.updated_at = datetime.utcnow()
                saved.append(existing)
            else:
                # 새로 추가
                supplier = Supplier(
                    name=s.name,
                    country=s.country,
                    website=s.website,
                    certifications=s.certifications,
                    discovery_source=s.source,
                    discovery_query=original_query,
                    ai_confidence_score=s.confidence_score,
                    email=s.contact_info.get("email"),
                    status=SupplierStatus.DISCOVERED
                )
                self.db_session.add(supplier)
                saved.append(supplier)

        self.db_session.commit()
        return saved

    async def _crawl_catalogs(self, suppliers: List[Supplier]) -> List[Dict]:
        """공급사 웹사이트에서 카탈로그 크롤링"""
        catalogs = []

        for supplier in suppliers:
            if not supplier.website:
                continue

            try:
                # 카탈로그 요청
                catalog_info = await self.discovery_agent.request_catalog(
                    DiscoveredSupplier(
                        name=supplier.name,
                        country=supplier.country,
                        website=supplier.website,
                        source=supplier.discovery_source,
                        confidence_score=supplier.ai_confidence_score,
                        certifications=supplier.certifications or [],
                        product_categories=[],
                        contact_info={},
                        raw_data={}
                    )
                )

                if catalog_info.get("catalogs_found"):
                    catalogs.extend(catalog_info["catalogs_found"])

            except Exception as e:
                logger.warning(f"카탈로그 크롤링 실패 ({supplier.name}): {e}")

        return catalogs

    async def _parse_catalogs(self, catalogs: List[Dict]) -> List[ExtractedProduct]:
        """카탈로그 파일 파싱"""
        all_products = []

        for catalog in catalogs:
            file_path = catalog.get("file_path")
            if not file_path:
                continue

            try:
                products = await self.catalog_parser.parse(file_path)
                all_products.extend(products)

            except Exception as e:
                logger.warning(f"카탈로그 파싱 실패 ({file_path}): {e}")

        return all_products

    async def _save_products(
        self,
        products: List[ExtractedProduct],
        suppliers: List[Supplier]
    ):
        """상품 정보 DB 저장"""
        supplier_map = {s.name: s.id for s in suppliers}

        for p in products:
            product = Product(
                supplier_id=suppliers[0].id if suppliers else None,  # 임시
                name=p.name,
                sku=p.sku,
                description=p.description,
                specifications=p.specifications,
                unit_price_min=p.unit_price_min,
                unit_price_max=p.unit_price_max,
                currency=p.currency,
                price_unit=p.price_unit,
                moq=p.moq,
                moq_unit=p.moq_unit,
                certifications=p.certifications
            )
            self.db_session.add(product)

        self.db_session.commit()

    async def search_products(
        self,
        query: str,
        filters: Dict[str, Any] = None
    ) -> List[Product]:
        """
        저장된 상품 검색
        (프론트엔드 API용)
        """
        # 기본 쿼리
        q = self.db_session.query(Product)

        # 텍스트 검색
        if query:
            q = q.filter(
                Product.name.ilike(f"%{query}%") |
                Product.description.ilike(f"%{query}%")
            )

        # 필터 적용
        if filters:
            if filters.get("country"):
                q = q.join(Supplier).filter(Supplier.country == filters["country"])

            if filters.get("certifications"):
                # JSON 배열 필터링 (DB별로 다름)
                pass

            if filters.get("price_max"):
                q = q.filter(Product.unit_price_max <= filters["price_max"])

            if filters.get("moq_max"):
                q = q.filter(Product.moq <= filters["moq_max"])

        return q.limit(100).all()

    def get_pipeline_status(self) -> Dict[str, Any]:
        """현재 파이프라인 상태 반환"""
        return {
            "stage": self.current_stage.value,
            "job_id": self.current_job_id,
            "timestamp": datetime.utcnow().isoformat()
        }


# 스케줄러: 주기적 크롤링
class CrawlScheduler:
    """
    주기적 크롤링 스케줄러

    - 신규 공급사 탐색 (일 1회)
    - 기존 공급사 가격 업데이트 (주 1회)
    - 카탈로그 갱신 체크 (월 1회)
    """

    def __init__(self, orchestrator: SupplierDiscoveryOrchestrator):
        self.orchestrator = orchestrator
        self.scheduled_queries = [
            "organic olive oil manufacturer Europe",
            "premium matcha powder Japan wholesale",
            "honey supplier New Zealand B2B",
            "cheese manufacturer France export",
            "organic snacks supplier USA",
        ]

    async def run_daily_discovery(self):
        """일일 공급사 탐색"""
        for query in self.scheduled_queries:
            try:
                result = await self.orchestrator.run_discovery_pipeline(
                    query,
                    auto_crawl=True,
                    auto_parse=True
                )
                logger.info(f"일일 탐색 완료 ({query}): {result.suppliers_discovered}개 발견")
            except Exception as e:
                logger.error(f"일일 탐색 실패 ({query}): {e}")

            # 요청 간 딜레이
            await asyncio.sleep(60)

    async def run_price_update(self):
        """가격 정보 업데이트"""
        # TODO: 기존 공급사 웹사이트 재크롤링
        pass


# 실행 예시
async def main():
    """오케스트레이터 실행 예시"""

    config = {
        "database_url": "sqlite:///wedealize_dev.db",
        # "alibaba_api_key": "your-api-key",
    }

    orchestrator = SupplierDiscoveryOrchestrator(config)

    # 검색 실행
    result = await orchestrator.run_discovery_pipeline(
        query="유기농 인증된 이탈리아산 올리브오일 공급업체",
        auto_crawl=False,  # 데모에서는 크롤링 스킵
        auto_parse=False
    )

    print(f"\n=== 파이프라인 결과 ===")
    print(f"상태: {result.stage.value}")
    print(f"발견된 공급사: {result.suppliers_discovered}개")
    print(f"추출된 상품: {result.products_extracted}개")
    print(f"실행 시간: {result.execution_time_seconds:.2f}초")

    if result.errors:
        print(f"오류: {result.errors}")


if __name__ == "__main__":
    asyncio.run(main())
