"""
WeDealize API Server
FastAPI 기반 REST API
"""

from fastapi import FastAPI, HTTPException, BackgroundTasks, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from datetime import datetime
import asyncio
import os

# 내부 모듈 (실제 구동 시 경로 조정 필요)
# from ..agents.orchestrator import SupplierDiscoveryOrchestrator, PipelineResult
# from ..models.database import init_database, get_session, Product, Supplier

app = FastAPI(
    title="WeDealize API",
    description="AI 기반 글로벌 F&B Supplier Discovery API",
    version="1.0.0"
)

# Supplier Portal API 라우터 등록
from .supplier_portal_api import router as supplier_router
app.include_router(supplier_router)

# 업로드 파일 정적 서빙 (프로덕션에서는 CDN 사용 권장)
uploads_dir = "uploads"
if os.path.exists(uploads_dir):
    app.mount("/static/uploads", StaticFiles(directory=uploads_dir), name="uploads")

# CORS 설정 (프론트엔드 연동)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 프로덕션에서는 특정 도메인만
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ==================== Pydantic Models ====================

class SearchRequest(BaseModel):
    """검색 요청"""
    query: str = Field(..., description="자연어 검색 쿼리", example="유기농 인증된 이탈리아산 올리브오일")
    filters: Optional[Dict[str, Any]] = Field(default=None, description="추가 필터")
    auto_crawl: bool = Field(default=False, description="자동 카탈로그 크롤링")


class ProductResponse(BaseModel):
    """상품 응답"""
    id: int
    name: str
    name_ko: Optional[str]
    supplier_name: str
    supplier_country: str
    country_flag: str
    specifications: Dict[str, Any]
    certifications: List[str]
    price_min: Optional[float]
    price_max: Optional[float]
    currency: str
    moq: Optional[int]
    moq_unit: Optional[str]
    thumbnail_url: Optional[str]


class SupplierResponse(BaseModel):
    """공급사 응답"""
    id: int
    name: str
    country: str
    country_flag: str
    website: Optional[str]
    certifications: List[str]
    product_count: int
    confidence_score: float
    status: str


class SearchResponse(BaseModel):
    """검색 응답"""
    query: str
    interpreted: Dict[str, Any]
    total_count: int
    products: List[ProductResponse]
    ai_analysis: str
    execution_time_ms: int


class PipelineStatusResponse(BaseModel):
    """파이프라인 상태 응답"""
    job_id: str
    stage: str
    progress: int
    suppliers_found: int
    products_extracted: int
    started_at: datetime
    estimated_completion: Optional[datetime]


# ==================== 데모 데이터 ====================

DEMO_PRODUCTS = [
    {
        "id": 1,
        "name": "Premium Extra Virgin Olive Oil - Organic",
        "name_ko": "프리미엄 엑스트라 버진 올리브오일 - 유기농",
        "supplier_name": "Oleificio Ferrara S.r.l.",
        "supplier_country": "Italy",
        "country_flag": "🇮🇹",
        "specifications": {"volume": "500ml", "packaging": "Glass Bottle", "extraction": "Cold Pressed"},
        "certifications": ["Organic", "HACCP", "ISO22000"],
        "price_min": 7.20,
        "price_max": 8.50,
        "currency": "USD",
        "moq": 200,
        "moq_unit": "bottles",
        "thumbnail_url": None
    },
    {
        "id": 2,
        "name": "Ceremonial Grade Matcha Powder",
        "name_ko": "의식용 등급 말차 파우더",
        "supplier_name": "Kyoto Matcha Co., Ltd.",
        "supplier_country": "Japan",
        "country_flag": "🇯🇵",
        "specifications": {"weight": "30g", "packaging": "Tin Can", "grade": "Ceremonial"},
        "certifications": ["JAS Organic"],
        "price_min": 15.00,
        "price_max": 18.00,
        "currency": "USD",
        "moq": 100,
        "moq_unit": "units",
        "thumbnail_url": None
    },
    {
        "id": 3,
        "name": "Organic Almond Butter - Creamy",
        "name_ko": "유기농 아몬드 버터 - 크리미",
        "supplier_name": "California Nuts Inc.",
        "supplier_country": "USA",
        "country_flag": "🇺🇸",
        "specifications": {"weight": "340g", "packaging": "Glass Jar", "type": "No Sugar Added"},
        "certifications": ["Vegan", "Non-GMO", "USDA Organic"],
        "price_min": 6.80,
        "price_max": 7.50,
        "currency": "USD",
        "moq": 300,
        "moq_unit": "jars",
        "thumbnail_url": None
    },
    {
        "id": 4,
        "name": "Aged Comté Cheese - 18 Months",
        "name_ko": "숙성 콩테 치즈 - 18개월",
        "supplier_name": "Fromagerie Dubois",
        "supplier_country": "France",
        "country_flag": "🇫🇷",
        "specifications": {"weight": "250g", "packaging": "Vacuum Packed", "aging": "18 months"},
        "certifications": ["AOC", "DOP"],
        "price_min": 12.00,
        "price_max": 14.50,
        "currency": "USD",
        "moq": 50,
        "moq_unit": "units",
        "thumbnail_url": None
    },
    {
        "id": 5,
        "name": "Manuka Honey UMF 15+",
        "name_ko": "마누카 꿀 UMF 15+",
        "supplier_name": "Manuka Health NZ Ltd.",
        "supplier_country": "New Zealand",
        "country_flag": "🇳🇿",
        "specifications": {"weight": "250g", "packaging": "Glass Jar", "grade": "UMF 15+ / MGO 514+"},
        "certifications": ["Organic", "UMF Certified"],
        "price_min": 35.00,
        "price_max": 42.00,
        "currency": "USD",
        "moq": 100,
        "moq_unit": "jars",
        "thumbnail_url": None
    },
    {
        "id": 6,
        "name": "Single Estate Ceylon Black Tea",
        "name_ko": "싱글 에스테이트 실론 홍차",
        "supplier_name": "Ceylon Tea Exporters",
        "supplier_country": "Sri Lanka",
        "country_flag": "🇱🇰",
        "specifications": {"weight": "100g", "type": "Loose Leaf", "grade": "High Grown"},
        "certifications": ["EU Organic", "Fair Trade", "Rainforest Alliance"],
        "price_min": 4.50,
        "price_max": 5.80,
        "currency": "USD",
        "moq": 500,
        "moq_unit": "units",
        "thumbnail_url": None
    },
]


# ==================== API Endpoints ====================

@app.get("/")
async def root():
    """API 상태 확인"""
    return {
        "service": "WeDealize API",
        "version": "1.0.0",
        "status": "running"
    }


@app.post("/api/v1/search", response_model=SearchResponse)
async def search_products(request: SearchRequest):
    """
    AI 기반 상품 검색

    자연어 쿼리를 해석하여 글로벌 F&B 공급사의 상품을 검색합니다.
    """
    import time
    start_time = time.time()

    # 쿼리 해석 (데모)
    interpreted = {
        "keywords": ["olive oil"] if "올리브" in request.query else ["food"],
        "countries": ["Italy"] if "이탈리아" in request.query else [],
        "certifications": ["Organic"] if "유기농" in request.query else []
    }

    # 필터링 (데모)
    filtered_products = DEMO_PRODUCTS
    if "올리브" in request.query.lower() or "olive" in request.query.lower():
        filtered_products = [p for p in DEMO_PRODUCTS if "olive" in p["name"].lower()]
    elif "말차" in request.query.lower() or "matcha" in request.query.lower():
        filtered_products = [p for p in DEMO_PRODUCTS if "matcha" in p["name"].lower()]

    # 없으면 전체 반환
    if not filtered_products:
        filtered_products = DEMO_PRODUCTS

    execution_time = int((time.time() - start_time) * 1000)

    return SearchResponse(
        query=request.query,
        interpreted=interpreted,
        total_count=len(filtered_products),
        products=[ProductResponse(**p) for p in filtered_products],
        ai_analysis=f'💡 "{request.query}" 검색 결과 {len(filtered_products)}개 상품을 찾았습니다. '
                    f'유럽 지역 공급사가 가장 많으며, 평균 FOB 가격은 $12.50입니다.',
        execution_time_ms=execution_time
    )


@app.get("/api/v1/products", response_model=List[ProductResponse])
async def list_products(
    category: Optional[str] = None,
    country: Optional[str] = None,
    certification: Optional[str] = None,
    price_max: Optional[float] = None,
    moq_max: Optional[int] = None,
    limit: int = Query(default=20, le=100),
    offset: int = 0
):
    """
    상품 목록 조회

    필터 및 페이지네이션 지원
    """
    products = DEMO_PRODUCTS

    # 필터링
    if country:
        products = [p for p in products if p["supplier_country"].lower() == country.lower()]

    if certification:
        products = [p for p in products if certification in p["certifications"]]

    if price_max:
        products = [p for p in products if p["price_max"] and p["price_max"] <= price_max]

    if moq_max:
        products = [p for p in products if p["moq"] and p["moq"] <= moq_max]

    # 페이지네이션
    paginated = products[offset:offset + limit]

    return [ProductResponse(**p) for p in paginated]


@app.get("/api/v1/products/{product_id}", response_model=ProductResponse)
async def get_product(product_id: int):
    """상품 상세 조회"""
    for p in DEMO_PRODUCTS:
        if p["id"] == product_id:
            return ProductResponse(**p)

    raise HTTPException(status_code=404, detail="Product not found")


@app.post("/api/v1/discovery/start")
async def start_discovery(
    request: SearchRequest,
    background_tasks: BackgroundTasks
):
    """
    공급사 탐색 파이프라인 시작 (백그라운드)

    장기 실행 작업이므로 백그라운드에서 실행됩니다.
    """
    job_id = f"job_{datetime.now().strftime('%Y%m%d%H%M%S')}"

    # 백그라운드 작업 등록
    # background_tasks.add_task(run_discovery_pipeline, job_id, request.query)

    return {
        "job_id": job_id,
        "status": "started",
        "message": f"'{request.query}' 검색을 시작했습니다. /api/v1/discovery/status/{job_id}에서 진행 상황을 확인하세요."
    }


@app.get("/api/v1/discovery/status/{job_id}", response_model=PipelineStatusResponse)
async def get_discovery_status(job_id: str):
    """파이프라인 진행 상태 조회"""
    # 데모 응답
    return PipelineStatusResponse(
        job_id=job_id,
        stage="completed",
        progress=100,
        suppliers_found=15,
        products_extracted=247,
        started_at=datetime.now(),
        estimated_completion=None
    )


@app.post("/api/v1/inquiry")
async def submit_inquiry(
    product_id: int,
    quantity: int,
    message: Optional[str] = None,
    incoterm: str = "FOB"
):
    """
    견적 문의 제출

    공급업체에 견적 요청을 전송합니다.
    """
    return {
        "status": "submitted",
        "inquiry_id": f"INQ-{datetime.now().strftime('%Y%m%d%H%M%S')}",
        "product_id": product_id,
        "quantity": quantity,
        "message": "견적 요청이 공급업체에 전송되었습니다. 영업일 기준 1-2일 내 회신 예정입니다."
    }


@app.post("/api/v1/sample-request")
async def submit_sample_request(
    product_id: int,
    quantity: int = 1,
    shipping_address: str = ""
):
    """
    샘플 요청 제출
    """
    return {
        "status": "submitted",
        "request_id": f"SMP-{datetime.now().strftime('%Y%m%d%H%M%S')}",
        "product_id": product_id,
        "quantity": quantity,
        "message": "샘플 요청이 접수되었습니다. 공급업체에서 비용 안내 후 진행됩니다."
    }


# ==================== 서버 실행 ====================

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
