"""
WeDealize AI Agent - Supplier Discovery
전세계 F&B 공급사를 자동으로 탐색하고 정보를 수집하는 AI Agent
"""

import json
import asyncio
from typing import List, Dict, Any, Optional
from dataclasses import dataclass
from enum import Enum
from abc import ABC, abstractmethod


class AgentState(Enum):
    IDLE = "idle"
    SEARCHING = "searching"
    CRAWLING = "crawling"
    PARSING = "parsing"
    STORING = "storing"
    ERROR = "error"


@dataclass
class SearchCriteria:
    """검색 조건"""
    keywords: List[str]           # 검색 키워드
    categories: List[str]         # F&B 카테고리
    countries: List[str]          # 대상 국가
    certifications: List[str]     # 필수 인증
    min_moq: Optional[int] = None # 최대 MOQ
    max_moq: Optional[int] = None
    price_range: Optional[tuple] = None  # (min, max) USD


@dataclass
class DiscoveredSupplier:
    """발견된 공급사 정보"""
    name: str
    country: str
    website: str
    source: str                   # 발견 출처
    confidence_score: float       # AI 신뢰도 점수
    certifications: List[str]
    product_categories: List[str]
    contact_info: Dict[str, str]
    raw_data: Dict[str, Any]      # 원본 데이터


class SupplierDiscoveryAgent:
    """
    AI 기반 공급사 탐색 에이전트

    역할:
    1. 검색 조건 해석 (자연어 → 구조화된 쿼리)
    2. 다양한 소스에서 공급사 탐색
    3. 공급사 검증 및 점수 평가
    4. 카탈로그/가격표 수집 지시
    """

    def __init__(self, llm_client=None, db_session=None):
        self.llm_client = llm_client  # LLM API 클라이언트 (OpenAI, Claude 등)
        self.db_session = db_session
        self.state = AgentState.IDLE
        self.current_task = None

        # 데이터 소스 (크롤러들)
        self.data_sources = []

    async def interpret_search_query(self, natural_query: str) -> SearchCriteria:
        """
        자연어 검색 쿼리를 구조화된 검색 조건으로 변환

        예시 입력: "유기농 인증된 이탈리아산 올리브오일 공급업체, MOQ 500개 이하"
        """

        # LLM을 사용하여 쿼리 해석
        prompt = f"""
        다음 검색 요청을 분석하여 JSON 형식으로 구조화해주세요.

        검색 요청: "{natural_query}"

        응답 형식:
        {{
            "keywords": ["주요 키워드들"],
            "categories": ["F&B 카테고리"],
            "countries": ["대상 국가"],
            "certifications": ["필요한 인증"],
            "min_moq": null 또는 숫자,
            "max_moq": null 또는 숫자,
            "price_range": null 또는 [최소, 최대]
        }}

        F&B 카테고리 예시: oils, beverages, snacks, dairy, sauces, organic, frozen, grains
        인증 예시: Organic, HACCP, ISO22000, Halal, Kosher, Non-GMO, Vegan, Fair Trade
        """

        if self.llm_client:
            # 실제 LLM 호출
            response = await self.llm_client.complete(prompt)
            parsed = json.loads(response)
        else:
            # 데모용 파싱
            parsed = self._demo_parse_query(natural_query)

        return SearchCriteria(
            keywords=parsed.get("keywords", []),
            categories=parsed.get("categories", []),
            countries=parsed.get("countries", []),
            certifications=parsed.get("certifications", []),
            min_moq=parsed.get("min_moq"),
            max_moq=parsed.get("max_moq"),
            price_range=tuple(parsed["price_range"]) if parsed.get("price_range") else None
        )

    def _demo_parse_query(self, query: str) -> Dict:
        """데모용 쿼리 파싱"""
        query_lower = query.lower()

        result = {
            "keywords": [],
            "categories": [],
            "countries": [],
            "certifications": [],
            "min_moq": None,
            "max_moq": None,
            "price_range": None
        }

        # 키워드 추출
        keywords_map = {
            "올리브오일": "olive oil",
            "말차": "matcha",
            "꿀": "honey",
            "치즈": "cheese",
            "소스": "sauce",
            "스낵": "snacks",
            "음료": "beverages"
        }
        for ko, en in keywords_map.items():
            if ko in query_lower or en in query_lower:
                result["keywords"].append(en)

        # 국가 추출
        countries_map = {
            "이탈리아": "Italy",
            "일본": "Japan",
            "프랑스": "France",
            "미국": "USA",
            "뉴질랜드": "New Zealand",
            "유럽": "Europe"
        }
        for ko, en in countries_map.items():
            if ko in query_lower:
                result["countries"].append(en)

        # 인증 추출
        certs_map = {
            "유기농": "Organic",
            "haccp": "HACCP",
            "할랄": "Halal",
            "비건": "Vegan",
            "non-gmo": "Non-GMO"
        }
        for ko, en in certs_map.items():
            if ko in query_lower:
                result["certifications"].append(en)

        # MOQ 추출
        import re
        moq_match = re.search(r'moq\s*(\d+)', query_lower)
        if moq_match:
            result["max_moq"] = int(moq_match.group(1))

        return result

    async def discover_suppliers(self, criteria: SearchCriteria) -> List[DiscoveredSupplier]:
        """
        주어진 조건에 맞는 공급사 탐색
        """
        self.state = AgentState.SEARCHING
        discovered = []

        # 각 데이터 소스에서 병렬로 검색
        tasks = []
        for source in self.data_sources:
            task = source.search(criteria)
            tasks.append(task)

        if tasks:
            results = await asyncio.gather(*tasks, return_exceptions=True)
            for result in results:
                if isinstance(result, list):
                    discovered.extend(result)

        # AI로 결과 평가 및 점수 부여
        scored_suppliers = await self._evaluate_suppliers(discovered, criteria)

        self.state = AgentState.IDLE
        return scored_suppliers

    async def _evaluate_suppliers(
        self,
        suppliers: List[DiscoveredSupplier],
        criteria: SearchCriteria
    ) -> List[DiscoveredSupplier]:
        """
        발견된 공급사들을 AI로 평가하고 점수 부여
        """
        for supplier in suppliers:
            score = 0.0

            # 인증 매칭 점수
            if criteria.certifications:
                matched = set(supplier.certifications) & set(criteria.certifications)
                score += 0.3 * (len(matched) / len(criteria.certifications))

            # 국가 매칭
            if criteria.countries:
                if supplier.country in criteria.countries:
                    score += 0.2

            # 웹사이트 존재
            if supplier.website:
                score += 0.1

            # 기본 점수
            score += 0.4 * supplier.confidence_score

            supplier.confidence_score = min(score, 1.0)

        # 점수순 정렬
        return sorted(suppliers, key=lambda x: x.confidence_score, reverse=True)

    async def request_catalog(self, supplier: DiscoveredSupplier) -> Dict[str, Any]:
        """
        공급사에 카탈로그/가격표 요청

        방법:
        1. 웹사이트에서 직접 다운로드
        2. 자동 이메일 요청
        3. 연락처 폼 자동 작성
        """
        result = {
            "supplier_id": supplier.name,
            "catalogs_found": [],
            "contact_attempted": False,
            "status": "pending"
        }

        # TODO: 실제 구현
        # 1. 웹사이트 크롤링으로 카탈로그 링크 찾기
        # 2. PDF/Excel 다운로드
        # 3. 없으면 연락 시도

        return result

    def register_data_source(self, source):
        """데이터 소스 (크롤러) 등록"""
        self.data_sources.append(source)


class DataSource(ABC):
    """데이터 소스 추상 클래스"""

    @abstractmethod
    async def search(self, criteria: SearchCriteria) -> List[DiscoveredSupplier]:
        """검색 조건에 맞는 공급사 검색"""
        pass


class AlibabaCrawler(DataSource):
    """Alibaba.com 크롤러"""

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key
        self.base_url = "https://www.alibaba.com"

    async def search(self, criteria: SearchCriteria) -> List[DiscoveredSupplier]:
        """Alibaba에서 공급사 검색"""
        # TODO: 실제 크롤링 구현
        # Playwright/Selenium으로 검색 페이지 접근
        # 검색 결과 파싱

        # 데모 데이터
        return [
            DiscoveredSupplier(
                name="Shandong Jining Green Food Co., Ltd.",
                country="China",
                website="https://example-supplier.com",
                source="alibaba",
                confidence_score=0.85,
                certifications=["HACCP", "ISO22000"],
                product_categories=["oils", "sauces"],
                contact_info={"email": "sales@example.com"},
                raw_data={}
            )
        ]


class GlobalSourcesCrawler(DataSource):
    """GlobalSources.com 크롤러"""

    async def search(self, criteria: SearchCriteria) -> List[DiscoveredSupplier]:
        # TODO: 실제 구현
        return []


class TradeKoreaCrawler(DataSource):
    """TradeKorea.com 크롤러 (한국 공급사)"""

    async def search(self, criteria: SearchCriteria) -> List[DiscoveredSupplier]:
        # TODO: 실제 구현
        return []


class WebSearchCrawler(DataSource):
    """일반 웹 검색 크롤러 (Google, Bing)"""

    async def search(self, criteria: SearchCriteria) -> List[DiscoveredSupplier]:
        """
        웹 검색으로 공급사 웹사이트 직접 발견

        검색 쿼리 예시:
        - "organic olive oil manufacturer Italy wholesale"
        - "matcha powder supplier Japan B2B"
        """
        # TODO: 실제 구현
        return []


# Agent 실행 예시
async def main():
    """에이전트 실행 예시"""

    # 에이전트 초기화
    agent = SupplierDiscoveryAgent()

    # 데이터 소스 등록
    agent.register_data_source(AlibabaCrawler())
    agent.register_data_source(GlobalSourcesCrawler())

    # 자연어 검색
    query = "유기농 인증된 이탈리아산 올리브오일 공급업체를 찾아줘. MOQ 500개 이하"

    # 검색 조건 해석
    criteria = await agent.interpret_search_query(query)
    print(f"해석된 검색 조건: {criteria}")

    # 공급사 탐색
    suppliers = await agent.discover_suppliers(criteria)
    print(f"발견된 공급사: {len(suppliers)}개")

    for supplier in suppliers[:5]:
        print(f"  - {supplier.name} ({supplier.country}) - Score: {supplier.confidence_score:.2f}")


if __name__ == "__main__":
    asyncio.run(main())
