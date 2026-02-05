"""
WeDealize Database Models
공급사, 상품, 가격 정보를 위한 데이터베이스 스키마
"""

from datetime import datetime
from typing import Optional, List
from sqlalchemy import create_engine, Column, Integer, String, Float, Text, DateTime, Boolean, ForeignKey, JSON, Enum
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship, sessionmaker
import enum

Base = declarative_base()


class SupplierStatus(enum.Enum):
    DISCOVERED = "discovered"      # AI가 발견
    CONTACTED = "contacted"        # 연락 시도
    VERIFIED = "verified"          # 검증 완료
    ACTIVE = "active"              # 활성 거래처
    INACTIVE = "inactive"          # 비활성


class CrawlStatus(enum.Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"


class Supplier(Base):
    """공급사 (Supplier) 테이블"""
    __tablename__ = "suppliers"

    id = Column(Integer, primary_key=True, autoincrement=True)

    # 기본 정보
    name = Column(String(255), nullable=False)
    name_local = Column(String(255))  # 현지 언어 이름
    country = Column(String(100), nullable=False)
    region = Column(String(100))  # 세부 지역

    # 연락처
    website = Column(String(500))
    email = Column(String(255))
    phone = Column(String(100))
    contact_person = Column(String(255))

    # 회사 정보
    company_type = Column(String(100))  # Manufacturer, Trading Company, etc.
    year_established = Column(Integer)
    employee_count = Column(String(50))
    annual_revenue = Column(String(100))

    # 인증 정보 (JSON 배열)
    certifications = Column(JSON, default=list)  # ["HACCP", "ISO22000", "Organic"]

    # 거래 조건
    min_order_value = Column(Float)
    payment_terms = Column(String(255))  # T/T, L/C, etc.
    lead_time_days = Column(Integer)
    shipping_methods = Column(JSON, default=list)  # ["FOB", "CIF", "DDP"]

    # AI 발견 정보
    discovery_source = Column(String(255))  # "alibaba", "globalsources", "web_search"
    discovery_query = Column(Text)  # 어떤 검색어로 발견했는지
    ai_confidence_score = Column(Float)  # AI가 평가한 신뢰도 (0-1)

    # 상태
    status = Column(Enum(SupplierStatus), default=SupplierStatus.DISCOVERED)
    verified_at = Column(DateTime)

    # 메타 정보
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # 관계
    products = relationship("Product", back_populates="supplier")
    catalogs = relationship("Catalog", back_populates="supplier")
    crawl_jobs = relationship("CrawlJob", back_populates="supplier")


class Category(Base):
    """상품 카테고리 테이블"""
    __tablename__ = "categories"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(255), nullable=False)
    name_ko = Column(String(255))  # 한국어 이름
    parent_id = Column(Integer, ForeignKey("categories.id"))
    level = Column(Integer, default=1)  # 카테고리 깊이

    # 관계
    parent = relationship("Category", remote_side=[id], backref="children")
    products = relationship("Product", back_populates="category")


class Product(Base):
    """상품 테이블"""
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, autoincrement=True)
    supplier_id = Column(Integer, ForeignKey("suppliers.id"), nullable=False)
    category_id = Column(Integer, ForeignKey("categories.id"))

    # 상품 기본 정보
    name = Column(String(500), nullable=False)
    name_ko = Column(String(500))  # 한국어 이름 (AI 번역)
    sku = Column(String(100))  # 공급사 SKU
    description = Column(Text)
    description_ko = Column(Text)  # 한국어 설명 (AI 번역)

    # 상품 스펙
    specifications = Column(JSON, default=dict)  # {"weight": "500ml", "packaging": "Glass Bottle"}
    ingredients = Column(Text)  # 원재료

    # 인증
    certifications = Column(JSON, default=list)  # ["Organic", "Non-GMO", "Halal"]

    # 이미지
    images = Column(JSON, default=list)  # ["url1", "url2"]
    thumbnail_url = Column(String(500))

    # 가격 정보
    unit_price_min = Column(Float)  # 최소 단가
    unit_price_max = Column(Float)  # 최대 단가
    currency = Column(String(10), default="USD")
    price_unit = Column(String(50))  # "per piece", "per kg", "per case"

    # MOQ
    moq = Column(Integer)  # 최소 주문 수량
    moq_unit = Column(String(50))  # "pieces", "cases", "kg"

    # AI 분석
    embedding = Column(JSON)  # 벡터 임베딩 (유사 상품 검색용)
    ai_tags = Column(JSON, default=list)  # AI가 추출한 태그
    quality_score = Column(Float)  # AI 품질 점수

    # 상태
    is_active = Column(Boolean, default=True)
    last_price_update = Column(DateTime)

    # 메타 정보
    source_url = Column(String(500))  # 원본 URL
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # 관계
    supplier = relationship("Supplier", back_populates="products")
    category = relationship("Category", back_populates="products")
    price_history = relationship("PriceHistory", back_populates="product")


class PriceHistory(Base):
    """가격 변동 이력 테이블"""
    __tablename__ = "price_history"

    id = Column(Integer, primary_key=True, autoincrement=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)

    price_min = Column(Float, nullable=False)
    price_max = Column(Float)
    currency = Column(String(10), default="USD")
    moq = Column(Integer)

    source = Column(String(255))  # 가격 출처 (catalog, website, quotation)
    recorded_at = Column(DateTime, default=datetime.utcnow)

    # 관계
    product = relationship("Product", back_populates="price_history")


class Catalog(Base):
    """카탈로그/가격표 파일 테이블"""
    __tablename__ = "catalogs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    supplier_id = Column(Integer, ForeignKey("suppliers.id"), nullable=False)

    # 파일 정보
    file_type = Column(String(50))  # "pdf", "excel", "csv"
    file_name = Column(String(500))
    file_url = Column(String(500))
    file_path = Column(String(500))  # 로컬 저장 경로
    file_size = Column(Integer)  # bytes

    # 파싱 상태
    is_parsed = Column(Boolean, default=False)
    parsed_at = Column(DateTime)
    products_extracted = Column(Integer, default=0)  # 추출된 상품 수

    # 유효 기간
    valid_from = Column(DateTime)
    valid_until = Column(DateTime)

    # 메타 정보
    source_url = Column(String(500))  # 다운로드 원본 URL
    created_at = Column(DateTime, default=datetime.utcnow)

    # 관계
    supplier = relationship("Supplier", back_populates="catalogs")


class CrawlJob(Base):
    """크롤링 작업 테이블"""
    __tablename__ = "crawl_jobs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    supplier_id = Column(Integer, ForeignKey("suppliers.id"))

    # 작업 정보
    job_type = Column(String(100))  # "discover_suppliers", "crawl_products", "fetch_catalog"
    target_url = Column(String(500))
    search_query = Column(Text)

    # 상태
    status = Column(Enum(CrawlStatus), default=CrawlStatus.PENDING)
    started_at = Column(DateTime)
    completed_at = Column(DateTime)

    # 결과
    items_found = Column(Integer, default=0)
    items_saved = Column(Integer, default=0)
    error_message = Column(Text)

    # 설정
    config = Column(JSON, default=dict)  # 크롤링 설정

    # 메타
    created_at = Column(DateTime, default=datetime.utcnow)

    # 관계
    supplier = relationship("Supplier", back_populates="crawl_jobs")


class AISearchQuery(Base):
    """AI 검색 쿼리 로그 테이블"""
    __tablename__ = "ai_search_queries"

    id = Column(Integer, primary_key=True, autoincrement=True)

    # 원본 쿼리
    raw_query = Column(Text, nullable=False)  # 사용자 입력

    # AI 해석 결과
    interpreted_query = Column(JSON)  # {"category": "olive oil", "origin": "italy", "certifications": ["organic"]}

    # 검색 결과
    results_count = Column(Integer)
    execution_time_ms = Column(Integer)

    # 사용자 정보
    user_id = Column(Integer)

    created_at = Column(DateTime, default=datetime.utcnow)


# 데이터베이스 초기화 함수
def init_database(database_url: str = "sqlite:///wedealize.db"):
    """데이터베이스 초기화 및 테이블 생성"""
    engine = create_engine(database_url, echo=True)
    Base.metadata.create_all(engine)
    return engine


def get_session(engine):
    """세션 팩토리 반환"""
    Session = sessionmaker(bind=engine)
    return Session()


if __name__ == "__main__":
    # 테스트용 SQLite DB 생성
    engine = init_database()
    print("Database tables created successfully!")
