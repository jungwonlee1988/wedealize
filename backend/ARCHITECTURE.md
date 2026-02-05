# WeDealize Backend Architecture

## 시스템 개요

AI 기반 글로벌 F&B Supplier Discovery 및 카탈로그 수집 시스템

## 전체 플로우

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          WeDealize Data Pipeline                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  [1] 사용자 검색                                                              │
│      "유기농 이탈리아산 올리브오일 공급업체"                                      │
│                    ↓                                                         │
│  [2] AI 쿼리 해석 (LLM)                                                       │
│      {keywords: ["olive oil"], country: "Italy", cert: ["Organic"]}          │
│                    ↓                                                         │
│  [3] 공급사 탐색 (Multi-Source Crawling)                                      │
│      ┌─────────────┬─────────────┬─────────────┐                            │
│      │  Alibaba    │  Global     │  Web Search │                            │
│      │  Crawler    │  Sources    │  Crawler    │                            │
│      └─────────────┴─────────────┴─────────────┘                            │
│                    ↓                                                         │
│  [4] 공급사 웹사이트 크롤링                                                    │
│      → Contact 페이지 찾기                                                    │
│      → 대표 이메일 추출                                                        │
│                    ↓                                                         │
│  [5] 카탈로그 요청 이메일 발송                                                  │
│      "Dear {supplier}, We are interested in your products..."                │
│                    ↓                                                         │
│  [6] 수신 메일함 모니터링 (IMAP)                                               │
│      → 회신 감지                                                              │
│      → 첨부파일 추출 (PDF, Excel)                                             │
│                    ↓                                                         │
│  [7] 카탈로그 파싱 (AI)                                                        │
│      → PDF 텍스트 추출                                                        │
│      → LLM으로 상품 정보 구조화                                                │
│                    ↓                                                         │
│  [8] DB 저장                                                                  │
│      Supplier → Product → PriceHistory                                       │
│                    ↓                                                         │
│  [9] 프론트엔드 검색 API                                                       │
│      /api/v1/search → 247개 상품 발견                                         │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 디렉토리 구조

```
backend/
├── agents/                          # AI 에이전트
│   ├── __init__.py
│   ├── supplier_discovery_agent.py  # 공급사 탐색 에이전트
│   └── orchestrator.py              # 파이프라인 오케스트레이터
│
├── crawlers/                        # 웹 크롤러
│   ├── __init__.py
│   ├── email_extractor.py           # 이메일 주소 추출
│   ├── alibaba_crawler.py           # (구현 예정)
│   └── web_search_crawler.py        # (구현 예정)
│
├── services/                        # 비즈니스 서비스
│   ├── __init__.py
│   └── email_service.py             # 이메일 발송/수신 서비스
│
├── parsers/                         # 문서 파서
│   ├── __init__.py
│   └── catalog_parser.py            # 카탈로그/가격표 파서
│
├── models/                          # 데이터베이스 모델
│   ├── __init__.py
│   ├── database.py                  # 기본 모델 (Supplier, Product)
│   └── email_tracking.py            # 이메일 추적 모델
│
├── api/                             # REST API
│   ├── __init__.py
│   └── main.py                      # FastAPI 엔드포인트
│
├── config/                          # 설정
│   ├── __init__.py
│   └── settings.py                  # 환경 설정
│
└── requirements.txt                 # 의존성
```

## 핵심 컴포넌트

### 1. SupplierDiscoveryAgent
공급사를 탐색하고 평가하는 AI 에이전트

```python
agent = SupplierDiscoveryAgent(llm_client=openai_client)

# 자연어 검색
criteria = await agent.interpret_search_query(
    "유기농 인증된 이탈리아산 올리브오일 공급업체"
)
# → {keywords: ["olive oil"], countries: ["Italy"], certifications: ["Organic"]}

# 공급사 탐색
suppliers = await agent.discover_suppliers(criteria)
# → [DiscoveredSupplier(name="Oleificio Ferrara", confidence=0.92), ...]
```

### 2. EmailExtractor
공급사 웹사이트에서 연락처 이메일 추출

```python
extractor = EmailExtractor(browser_client=playwright)

contact = await extractor.extract_from_website("https://supplier-website.com")
# → ExtractedContact(
#       emails=["sales@supplier.com", "info@supplier.com"],
#       primary_email="sales@supplier.com",
#       confidence_score=0.85
#   )
```

### 3. EmailService
카탈로그 요청 이메일 발송 및 회신 처리

```python
service = EmailService(config=gmail_config)

# 카탈로그 요청 발송
request = await service.send_catalog_request(
    supplier_id=1,
    supplier_name="Oleificio Ferrara",
    supplier_email="sales@oleificio.it",
    product_categories=["Olive Oil"],
    language="en"
)

# 수신 메일 확인 (IMAP)
replies = await service.check_inbox_for_replies()
for reply in replies:
    if reply.attachments:
        print(f"카탈로그 수신: {reply.attachments}")
```

### 4. CatalogParser
PDF/Excel 카탈로그에서 상품 정보 추출

```python
parser = CatalogParser(llm_client=openai_client)

products = await parser.parse("catalog.pdf")
# → [
#       ExtractedProduct(name="Extra Virgin Olive Oil", price_min=7.20, moq=200),
#       ExtractedProduct(name="Organic Balsamic Vinegar", price_min=5.50, moq=100),
#   ]
```

## 데이터베이스 스키마

### 주요 테이블

```
Supplier (공급사)
├── id, name, country, website
├── certifications (JSON)
├── discovery_source, ai_confidence_score
└── status (discovered → contacted → verified → active)

Product (상품)
├── id, supplier_id, name, sku
├── specifications (JSON)
├── unit_price_min, unit_price_max, currency
├── moq, certifications
└── embedding (벡터 검색용)

EmailRequest (이메일 요청)
├── id, supplier_id, to_email
├── status (pending → sent → replied → catalog_received)
├── sent_at, reply_received_at
└── followup_count

ReceivedAttachment (수신 첨부파일)
├── id, email_request_id
├── filename, file_path, content_type
├── is_parsed, products_extracted
└── file_category (catalog, pricelist, certificate)
```

## API 엔드포인트

### 검색
```
POST /api/v1/search
{
    "query": "유기농 올리브오일",
    "filters": {"country": "Italy", "moq_max": 500}
}
→ {products: [...], ai_analysis: "247개 발견, 평균 FOB $8.50"}
```

### 파이프라인 실행
```
POST /api/v1/discovery/start
{
    "query": "organic olive oil Italy",
    "auto_email": true
}
→ {job_id: "job_123", status: "started"}

GET /api/v1/discovery/status/job_123
→ {stage: "emailing", progress: 45, suppliers_contacted: 12}
```

### 견적/샘플 요청
```
POST /api/v1/inquiry
{product_id: 1, quantity: 500, incoterm: "CIF"}

POST /api/v1/sample-request
{product_id: 1, quantity: 2, address: "..."}
```

## 스케줄러 작업

```python
# 일일 작업
- 02:00 AM: 신규 공급사 탐색 (기본 검색어 목록)
- 08:00 AM: 수신 메일함 확인
- 14:00 PM: 수신 메일함 확인
- 20:00 PM: 수신 메일함 확인

# 주간 작업
- 월요일: 팔로업 이메일 발송 (5일 이상 미응답)

# 월간 작업
- 1일: 가격 변동 분석 리포트
- 15일: 비활성 공급사 정리
```

## 환경 변수

```bash
# 데이터베이스
DATABASE_URL=postgresql://localhost/wedealize

# LLM API
OPENAI_API_KEY=sk-...
# 또는
ANTHROPIC_API_KEY=sk-ant-...

# 이메일 (Gmail 예시)
GMAIL_EMAIL=sourcing@wedealize.com
GMAIL_APP_PASSWORD=xxxx-xxxx-xxxx-xxxx

# 크롤링
ALIBABA_API_KEY=...
GOOGLE_API_KEY=...
GOOGLE_CX=...  # Custom Search Engine ID
```

## 실행 방법

```bash
# 의존성 설치
pip install -r requirements.txt

# 데이터베이스 초기화
python -m models.database

# API 서버 실행
uvicorn api.main:app --reload --port 8000

# 스케줄러 실행 (별도 프로세스)
python -m agents.scheduler
```

## 데이터 품질 관리

### DataQualityService
파싱된 데이터의 품질을 체크하고 누락 항목을 분석

```python
service = DataQualityService(db_session)

# 공급사 데이터 분석
report = await service.analyze_supplier_data(supplier_id=1)
# → DataQualityReport(
#       completeness_score=65.0,
#       missing_items=[
#           MissingDataItem(type=MOQ, count=5, priority=HIGH),
#           MissingDataItem(type=CERTIFICATIONS, count=8, priority=MEDIUM)
#       ],
#       recommendations=["Please add MOQ for 5 products..."]
#   )
```

### FollowupService
누락 데이터에 대해 자동 팔로업 이메일/알림 발송

```python
followup_service = FollowupService(db, email_service, data_quality_service)

# 팔로업 스케줄링
followups = await followup_service.check_and_schedule_followups(supplier_id=1)
# → [FollowupRequest(priority=HIGH, scheduled_at=3일 후)]

# 스케줄된 팔로업 발송
sent_count = await followup_service.send_scheduled_followups()
```

### 팔로업 스케줄러 작업

```python
# 일일 작업
- 09:00 AM: 데이터 완성도 체크 및 팔로업 스케줄링
- 09:00, 13:00, 17:00: 스케줄된 팔로업 발송
- 14:00 PM: 응답 없는 공급사 팔로업

# 주간 작업
- 월요일 10:00 AM: 주간 데이터 품질 리포트 발송
```

## 공급사 포털 API

### 파일 업로드
```
POST /api/v1/supplier/upload/catalog    (필수)
POST /api/v1/supplier/upload/pricelist  (선택)
POST /api/v1/supplier/upload/certificate (선택)
```

### 데이터 완성도
```
GET /api/v1/supplier/data-completeness/{supplier_id}
→ {completeness_score: 65, missing_summary: [...], recommendations: [...]}

POST /api/v1/supplier/data-completeness/refresh/{supplier_id}
→ 완성도 재계산
```

### 상품 관리
```
GET /api/v1/supplier/products/{supplier_id}?filter_missing=moq
PUT /api/v1/supplier/products/{product_id}
POST /api/v1/supplier/products/{product_id}/image
```

## 다음 단계 (TODO)

1. [ ] Alibaba 실제 크롤러 구현 (Playwright)
2. [ ] Google Custom Search API 연동
3. [ ] 이메일 열람 추적 (픽셀 트래킹)
4. [ ] 벡터 검색 구현 (ChromaDB/pgvector)
5. [ ] 관리자 대시보드 (발송 현황, 응답률 등)
6. [ ] 다국어 이메일 템플릿 (중국어, 일본어)
7. [ ] 공급사 인증서 검증 자동화
8. [x] 데이터 품질 관리 서비스
9. [x] 자동 팔로업 스케줄러
10. [x] 공급사 포털 API
