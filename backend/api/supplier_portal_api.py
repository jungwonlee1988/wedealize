"""
WeDealize Supplier Portal API
공급사 포털 관련 API 엔드포인트
"""

from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Depends, BackgroundTasks
from fastapi.responses import JSONResponse
from pydantic import BaseModel, EmailStr
from typing import List, Optional
from datetime import datetime, timedelta
import os
import uuid
import logging
import random
import string
import hashlib
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

logger = logging.getLogger(__name__)

# 이메일 설정 (환경 변수에서 로드)
EMAIL_CONFIG = {
    "smtp_host": os.getenv("SMTP_HOST", "smtp.gmail.com"),
    "smtp_port": int(os.getenv("SMTP_PORT", "587")),
    "email": os.getenv("SMTP_EMAIL") or os.getenv("GMAIL_EMAIL"),
    "password": os.getenv("SMTP_PASSWORD") or os.getenv("GMAIL_APP_PASSWORD"),
    "sender_name": os.getenv("SMTP_SENDER_NAME", "WeDealize"),
}

router = APIRouter(prefix="/api/v1/supplier", tags=["Supplier Portal"])

# 임시 저장소 (실제 구현에서는 Redis 또는 DB 사용)
verification_codes = {}  # {email: {"code": "123456", "expires": datetime, "data": {...}}}
password_reset_tokens = {}  # {token: {"email": email, "expires": datetime}}


# ==================== Pydantic Models ====================

class SupplierRegisterRequest(BaseModel):
    company_name: str
    email: EmailStr
    password: str
    country: Optional[str] = None
    website: Optional[str] = None
    category: Optional[str] = None


class SupplierLoginRequest(BaseModel):
    email: EmailStr
    password: str


class SupplierLoginResponse(BaseModel):
    access_token: str
    supplier_id: int
    company_name: str
    email: str


class SendVerificationRequest(BaseModel):
    email: EmailStr
    company_name: Optional[str] = None


class VerifyEmailRequest(BaseModel):
    email: EmailStr
    code: str
    company_name: Optional[str] = None
    password: Optional[str] = None
    country: Optional[str] = None
    category: Optional[str] = None


class GoogleAuthRequest(BaseModel):
    credential: str  # JWT token from Google


class GoogleUserInfoRequest(BaseModel):
    email: EmailStr
    name: str
    picture: Optional[str] = None
    google_id: str


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str


class ProductUpdateRequest(BaseModel):
    product_id: int
    moq: Optional[int] = None
    unit_price_min: Optional[float] = None
    unit_price_max: Optional[float] = None
    certifications: Optional[List[str]] = None
    specifications: Optional[dict] = None
    lead_time_days: Optional[int] = None


class DataCompletenessResponse(BaseModel):
    completeness_score: float
    total_products: int
    missing_summary: List[dict]
    recommendations: List[str]


class UploadProcessingStatus(BaseModel):
    job_id: str
    status: str  # uploading, parsing, extracting, complete, error
    progress: int  # 0-100
    products_extracted: int
    errors: List[str]


# ==================== Auth Endpoints ====================

def generate_verification_code() -> str:
    """6자리 인증 코드 생성"""
    return ''.join(random.choices(string.digits, k=6))


def generate_reset_token() -> str:
    """비밀번호 재설정 토큰 생성"""
    return hashlib.sha256(os.urandom(32)).hexdigest()[:32]


@router.post("/auth/send-verification")
async def send_verification_code(request: SendVerificationRequest, background_tasks: BackgroundTasks):
    """이메일 인증 코드 발송"""
    email = request.email
    code = generate_verification_code()

    # 인증 코드 저장 (10분 유효)
    verification_codes[email] = {
        "code": code,
        "expires": datetime.utcnow() + timedelta(minutes=10),
        "company_name": request.company_name
    }

    # 백그라운드에서 이메일 발송
    background_tasks.add_task(
        send_verification_email,
        email=email,
        code=code,
        company_name=request.company_name
    )

    logger.info(f"Verification code sent to {email}: {code}")  # 개발용 로그

    return {
        "success": True,
        "message": "Verification code sent to your email."
    }


async def send_verification_email(email: str, code: str, company_name: str = None):
    """인증 이메일 발송 (TODO: 실제 이메일 서비스 연동)"""
    # TODO: EmailService 연동
    logger.info(f"[EMAIL] To: {email}, Code: {code}")
    # 실제 구현:
    # email_service = EmailService(config)
    # await email_service.send_verification_email(email, code)


@router.post("/auth/verify-email")
async def verify_email_code(request: VerifyEmailRequest):
    """이메일 인증 코드 확인 및 회원가입 완료"""
    email = request.email
    code = request.code

    # 인증 코드 확인
    stored = verification_codes.get(email)
    if not stored:
        raise HTTPException(status_code=400, detail="Verification code expired or not found.")

    if datetime.utcnow() > stored["expires"]:
        del verification_codes[email]
        raise HTTPException(status_code=400, detail="Verification code expired.")

    if stored["code"] != code:
        raise HTTPException(status_code=400, detail="Invalid verification code.")

    # 인증 성공 - 회원가입 완료
    del verification_codes[email]

    # TODO: DB에 사용자 저장
    # supplier = await create_supplier(
    #     email=email,
    #     password=hash_password(request.password),
    #     company_name=request.company_name,
    #     country=request.country,
    #     category=request.category
    # )

    supplier_id = 1  # Demo

    return SupplierLoginResponse(
        access_token=f"verified_token_{supplier_id}",
        supplier_id=supplier_id,
        company_name=request.company_name or "New Supplier",
        email=email
    )


@router.post("/auth/google")
async def google_auth(request: GoogleAuthRequest):
    """Google OAuth JWT 토큰으로 인증"""
    try:
        # TODO: Google JWT 토큰 검증
        # from google.oauth2 import id_token
        # from google.auth.transport import requests
        # idinfo = id_token.verify_oauth2_token(
        #     request.credential,
        #     requests.Request(),
        #     GOOGLE_CLIENT_ID
        # )

        # 데모 응답
        return SupplierLoginResponse(
            access_token="google_auth_token_xxx",
            supplier_id=1,
            company_name="Google User",
            email="user@gmail.com"
        )

    except Exception as e:
        logger.error(f"Google auth error: {e}")
        raise HTTPException(status_code=401, detail="Invalid Google credentials.")


@router.post("/auth/google-userinfo")
async def google_userinfo_auth(request: GoogleUserInfoRequest):
    """Google 사용자 정보로 로그인/회원가입"""
    email = request.email
    name = request.name
    google_id = request.google_id

    # TODO: DB에서 기존 사용자 확인 또는 새로 생성
    # supplier = await get_or_create_supplier_by_google(
    #     email=email,
    #     name=name,
    #     google_id=google_id,
    #     picture=request.picture
    # )

    supplier_id = 1  # Demo

    return SupplierLoginResponse(
        access_token=f"google_token_{supplier_id}",
        supplier_id=supplier_id,
        company_name=name,
        email=email
    )


@router.post("/auth/forgot-password")
async def forgot_password(request: ForgotPasswordRequest, background_tasks: BackgroundTasks):
    """비밀번호 재설정 링크 발송"""
    email = request.email
    token = generate_reset_token()

    # 토큰 저장 (24시간 유효)
    password_reset_tokens[token] = {
        "email": email,
        "expires": datetime.utcnow() + timedelta(hours=24)
    }

    # 백그라운드에서 이메일 발송
    background_tasks.add_task(
        send_password_reset_email,
        email=email,
        token=token
    )

    logger.info(f"Password reset token for {email}: {token}")  # 개발용 로그

    return {
        "success": True,
        "message": "Password reset link sent to your email."
    }


async def send_password_reset_email(email: str, token: str):
    """비밀번호 재설정 이메일 발송"""
    reset_link = f"https://wedealize.com/supplier-portal/reset-password?token={token}"

    # 이메일 설정 확인
    if not EMAIL_CONFIG.get("email") or not EMAIL_CONFIG.get("password"):
        logger.warning(f"[EMAIL] SMTP credentials not configured. Reset link for {email}: {reset_link}")
        return

    try:
        # 이메일 생성
        msg = MIMEMultipart("alternative")
        msg["Subject"] = "Password Reset - WeDealize Supplier Portal"
        msg["From"] = f"{EMAIL_CONFIG['sender_name']} <{EMAIL_CONFIG['email']}>"
        msg["To"] = email

        # 텍스트 본문
        text_body = f"""
Hello,

You requested a password reset for your WeDealize Supplier Portal account.

Click the link below to reset your password:
{reset_link}

This link will expire in 24 hours.

If you did not request this password reset, please ignore this email.

Best regards,
WeDealize Team
        """

        # HTML 본문
        html_body = f"""
<html>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #667eea;">Password Reset Request</h2>
        <p>Hello,</p>
        <p>You requested a password reset for your WeDealize Supplier Portal account.</p>
        <p>Click the button below to reset your password:</p>
        <p style="text-align: center; margin: 30px 0;">
            <a href="{reset_link}"
               style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                      color: white;
                      padding: 14px 28px;
                      text-decoration: none;
                      border-radius: 8px;
                      font-weight: bold;">
                Reset Password
            </a>
        </p>
        <p style="color: #666; font-size: 14px;">This link will expire in 24 hours.</p>
        <p style="color: #666; font-size: 14px;">If you did not request this password reset, please ignore this email.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        <p style="color: #999; font-size: 12px;">
            Best regards,<br>
            <strong>WeDealize Team</strong>
        </p>
    </div>
</body>
</html>
        """

        msg.attach(MIMEText(text_body, "plain", "utf-8"))
        msg.attach(MIMEText(html_body, "html", "utf-8"))

        # SMTP 발송
        with smtplib.SMTP(EMAIL_CONFIG["smtp_host"], EMAIL_CONFIG["smtp_port"]) as server:
            server.starttls()
            server.login(EMAIL_CONFIG["email"], EMAIL_CONFIG["password"])
            server.send_message(msg)

        logger.info(f"[EMAIL] Password reset email sent to {email}")

    except Exception as e:
        logger.error(f"[EMAIL] Failed to send password reset email to {email}: {e}")


@router.post("/auth/reset-password")
async def reset_password(request: ResetPasswordRequest):
    """비밀번호 재설정"""
    token = request.token
    new_password = request.new_password

    # 토큰 확인
    stored = password_reset_tokens.get(token)
    if not stored:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token.")

    if datetime.utcnow() > stored["expires"]:
        del password_reset_tokens[token]
        raise HTTPException(status_code=400, detail="Reset token expired.")

    email = stored["email"]
    del password_reset_tokens[token]

    # TODO: DB에서 비밀번호 업데이트
    # await update_supplier_password(email, hash_password(new_password))

    return {
        "success": True,
        "message": "Password reset successfully. You can now login with your new password."
    }


@router.post("/register")
async def register_supplier(request: SupplierRegisterRequest):
    """공급사 회원가입 (이메일 인증 없이 직접 가입 - 레거시)"""
    # TODO: 실제 구현
    # 1. 이메일 중복 체크
    # 2. 비밀번호 해시
    # 3. DB에 저장
    # 4. 환영 이메일 발송

    return {
        "success": True,
        "message": "Registration successful. Please check your email for verification.",
        "supplier_id": 1  # Demo
    }


@router.post("/login", response_model=SupplierLoginResponse)
async def login_supplier(request: SupplierLoginRequest):
    """공급사 로그인"""
    # TODO: 실제 구현
    # 1. 이메일/비밀번호 확인
    # 2. 이메일 인증 여부 확인
    # 3. JWT 토큰 생성

    return SupplierLoginResponse(
        access_token="demo_token_xxx",
        supplier_id=1,
        company_name="Demo Supplier Co.",
        email=request.email
    )


# ==================== File Upload Endpoints ====================

@router.post("/upload/catalog")
async def upload_catalog(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    supplier_id: int = Form(...)  # TODO: JWT에서 추출
):
    """
    상품 카탈로그 업로드 (필수)
    지원 형식: PDF, Excel, CSV
    """
    # 파일 검증
    allowed_extensions = {".pdf", ".xlsx", ".xls", ".csv"}
    file_ext = os.path.splitext(file.filename)[1].lower()

    if file_ext not in allowed_extensions:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type. Allowed: {', '.join(allowed_extensions)}"
        )

    # 파일 크기 체크 (50MB)
    max_size = 50 * 1024 * 1024
    content = await file.read()
    if len(content) > max_size:
        raise HTTPException(status_code=400, detail="File too large. Max size: 50MB")

    # 파일 저장
    job_id = str(uuid.uuid4())
    upload_dir = f"uploads/catalogs/{supplier_id}"
    os.makedirs(upload_dir, exist_ok=True)

    file_path = f"{upload_dir}/{job_id}_{file.filename}"
    with open(file_path, "wb") as f:
        f.write(content)

    # 백그라운드에서 파싱 시작
    background_tasks.add_task(
        process_catalog_upload,
        job_id=job_id,
        supplier_id=supplier_id,
        file_path=file_path,
        file_type="catalog"
    )

    return {
        "success": True,
        "job_id": job_id,
        "message": "Catalog uploaded successfully. Processing started.",
        "filename": file.filename
    }


@router.post("/upload/pricelist")
async def upload_pricelist(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    supplier_id: int = Form(...)
):
    """
    가격표 업로드 (선택)
    지원 형식: PDF, Excel, CSV
    """
    allowed_extensions = {".pdf", ".xlsx", ".xls", ".csv"}
    file_ext = os.path.splitext(file.filename)[1].lower()

    if file_ext not in allowed_extensions:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type. Allowed: {', '.join(allowed_extensions)}"
        )

    max_size = 50 * 1024 * 1024
    content = await file.read()
    if len(content) > max_size:
        raise HTTPException(status_code=400, detail="File too large. Max size: 50MB")

    job_id = str(uuid.uuid4())
    upload_dir = f"uploads/pricelists/{supplier_id}"
    os.makedirs(upload_dir, exist_ok=True)

    file_path = f"{upload_dir}/{job_id}_{file.filename}"
    with open(file_path, "wb") as f:
        f.write(content)

    background_tasks.add_task(
        process_catalog_upload,
        job_id=job_id,
        supplier_id=supplier_id,
        file_path=file_path,
        file_type="pricelist"
    )

    return {
        "success": True,
        "job_id": job_id,
        "message": "Price list uploaded successfully. Processing started.",
        "filename": file.filename
    }


@router.post("/upload/certificate")
async def upload_certificate(
    file: UploadFile = File(...),
    supplier_id: int = Form(...),
    certificate_type: str = Form(...)  # organic, halal, kosher, haccp, etc.
):
    """
    인증서 업로드 (선택)
    지원 형식: PDF, JPG, PNG
    """
    allowed_extensions = {".pdf", ".jpg", ".jpeg", ".png"}
    file_ext = os.path.splitext(file.filename)[1].lower()

    if file_ext not in allowed_extensions:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type. Allowed: {', '.join(allowed_extensions)}"
        )

    max_size = 10 * 1024 * 1024  # 10MB
    content = await file.read()
    if len(content) > max_size:
        raise HTTPException(status_code=400, detail="File too large. Max size: 10MB")

    upload_dir = f"uploads/certificates/{supplier_id}"
    os.makedirs(upload_dir, exist_ok=True)

    file_id = str(uuid.uuid4())
    file_path = f"{upload_dir}/{file_id}_{file.filename}"
    with open(file_path, "wb") as f:
        f.write(content)

    # TODO: DB에 인증서 정보 저장

    return {
        "success": True,
        "certificate_id": file_id,
        "message": f"{certificate_type} certificate uploaded successfully.",
        "filename": file.filename
    }


@router.get("/upload/status/{job_id}", response_model=UploadProcessingStatus)
async def get_upload_status(job_id: str):
    """업로드 처리 상태 조회"""
    # TODO: Redis 또는 DB에서 상태 조회

    # Demo response
    return UploadProcessingStatus(
        job_id=job_id,
        status="complete",
        progress=100,
        products_extracted=24,
        errors=[]
    )


# ==================== Data Quality Endpoints ====================

@router.get("/data-completeness/{supplier_id}", response_model=DataCompletenessResponse)
async def get_data_completeness(supplier_id: int):
    """
    공급사 데이터 완성도 조회
    카탈로그 파싱 후 누락 데이터 현황 반환
    """
    # TODO: DataQualityService 연동

    # Demo response
    return DataCompletenessResponse(
        completeness_score=65.0,
        total_products=24,
        missing_summary=[
            {
                "type": "moq",
                "label": "Minimum Order Quantity",
                "count": 5,
                "priority": "high",
                "products": ["Aged Parmesan", "Raw Honey", "Balsamic Vinegar"]
            },
            {
                "type": "certifications",
                "label": "Certifications",
                "count": 8,
                "priority": "medium",
                "products": []
            },
            {
                "type": "images",
                "label": "Product Images",
                "count": 12,
                "priority": "medium",
                "products": []
            }
        ],
        recommendations=[
            "Critical: Please add Minimum Order Quantity for 5 products.",
            "Adding certifications can increase buyer confidence.",
            "Products with images get 3x more inquiries."
        ]
    )


@router.post("/data-completeness/refresh/{supplier_id}")
async def refresh_data_completeness(supplier_id: int, background_tasks: BackgroundTasks):
    """데이터 완성도 재계산 요청"""
    background_tasks.add_task(recalculate_completeness, supplier_id)

    return {
        "success": True,
        "message": "Completeness recalculation started."
    }


# ==================== Product Management Endpoints ====================

@router.get("/products/{supplier_id}")
async def get_supplier_products(
    supplier_id: int,
    filter_missing: Optional[str] = None,  # moq, certifications, images
    page: int = 1,
    limit: int = 20
):
    """
    공급사 상품 목록 조회
    filter_missing으로 누락 데이터가 있는 상품만 필터링 가능
    """
    # TODO: DB 쿼리 구현

    # Demo response
    return {
        "products": [
            {
                "id": 1,
                "name": "Extra Virgin Olive Oil 500ml",
                "sku": "OIL-001",
                "moq": 200,
                "unit_price": 7.20,
                "certifications": ["organic", "haccp"],
                "has_image": True,
                "completeness": 95
            },
            {
                "id": 3,
                "name": "Aged Parmesan 24 months",
                "sku": "CHE-003",
                "moq": None,  # Missing
                "unit_price": 15.50,
                "certifications": ["dop"],
                "has_image": True,
                "completeness": 75
            },
            {
                "id": 5,
                "name": "Raw Honey 500g",
                "sku": "HON-005",
                "moq": None,  # Missing
                "unit_price": 8.00,
                "certifications": [],  # Missing
                "has_image": False,  # Missing
                "completeness": 45
            }
        ],
        "total": 24,
        "page": page,
        "limit": limit
    }


@router.put("/products/{product_id}")
async def update_product(product_id: int, request: ProductUpdateRequest):
    """상품 정보 업데이트 (누락 데이터 채우기)"""
    # TODO: DB 업데이트 구현

    return {
        "success": True,
        "message": "Product updated successfully.",
        "product_id": product_id
    }


@router.post("/products/{product_id}/image")
async def upload_product_image(
    product_id: int,
    file: UploadFile = File(...),
    supplier_id: int = Form(...)
):
    """상품 이미지 업로드"""
    allowed_extensions = {".jpg", ".jpeg", ".png", ".webp"}
    file_ext = os.path.splitext(file.filename)[1].lower()

    if file_ext not in allowed_extensions:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type. Allowed: {', '.join(allowed_extensions)}"
        )

    max_size = 5 * 1024 * 1024  # 5MB
    content = await file.read()
    if len(content) > max_size:
        raise HTTPException(status_code=400, detail="File too large. Max size: 5MB")

    upload_dir = f"uploads/product_images/{supplier_id}"
    os.makedirs(upload_dir, exist_ok=True)

    file_id = str(uuid.uuid4())
    file_path = f"{upload_dir}/{product_id}_{file_id}{file_ext}"
    with open(file_path, "wb") as f:
        f.write(content)

    # TODO: DB에 이미지 경로 저장

    return {
        "success": True,
        "image_url": f"/static/{file_path}",
        "message": "Product image uploaded successfully."
    }


# ==================== Notifications Endpoints ====================

@router.get("/notifications/{supplier_id}")
async def get_notifications(supplier_id: int, unread_only: bool = False):
    """공급사 알림 목록 조회"""
    # TODO: DB 쿼리 구현

    return {
        "notifications": [
            {
                "id": 1,
                "type": "data_completion",
                "title": "Complete Your Product Data",
                "message": "5 products are missing MOQ information.",
                "priority": "high",
                "action_url": "/products?filter=no-moq",
                "is_read": False,
                "created_at": datetime.utcnow().isoformat()
            },
            {
                "id": 2,
                "type": "inquiry",
                "title": "New Inquiry Received",
                "message": "ABC Trading inquired about Extra Virgin Olive Oil.",
                "priority": "medium",
                "action_url": "/inquiries/123",
                "is_read": True,
                "created_at": datetime.utcnow().isoformat()
            }
        ],
        "unread_count": 1
    }


@router.put("/notifications/{notification_id}/read")
async def mark_notification_read(notification_id: int):
    """알림 읽음 처리"""
    # TODO: DB 업데이트
    return {"success": True}


# ==================== Background Tasks ====================

async def process_catalog_upload(
    job_id: str,
    supplier_id: int,
    file_path: str,
    file_type: str
):
    """카탈로그/가격표 파싱 백그라운드 작업"""
    logger.info(f"Processing {file_type} upload: {job_id}")

    try:
        # TODO: CatalogParser 연동
        # from parsers.catalog_parser import CatalogParser
        # parser = CatalogParser(llm_client=openai_client)
        # products = await parser.parse(file_path)

        # TODO: 파싱 결과 DB 저장

        # TODO: 데이터 완성도 체크 후 알림 생성
        # from services.data_quality_service import DataQualityService
        # quality_service = DataQualityService(db_session)
        # report = await quality_service.analyze_supplier_data(supplier_id)

        logger.info(f"Completed processing {file_type}: {job_id}")

    except Exception as e:
        logger.error(f"Error processing {file_type} {job_id}: {e}")
        # TODO: 에러 상태 저장


async def recalculate_completeness(supplier_id: int):
    """데이터 완성도 재계산"""
    logger.info(f"Recalculating completeness for supplier {supplier_id}")

    # TODO: DataQualityService 연동
    # from services.data_quality_service import DataQualityService
    # quality_service = DataQualityService(db_session)
    # report = await quality_service.analyze_supplier_data(supplier_id)

    # TODO: 알림 생성


# ==================== Inquiry Endpoints (추가) ====================

@router.get("/inquiries/{supplier_id}")
async def get_supplier_inquiries(supplier_id: int, status: Optional[str] = None):
    """공급사에게 들어온 문의 목록"""
    # TODO: DB 쿼리 구현

    return {
        "inquiries": [
            {
                "id": 1,
                "buyer_name": "ABC Trading Co.",
                "buyer_country": "Korea",
                "product_name": "Extra Virgin Olive Oil 500ml",
                "quantity": 500,
                "incoterm": "CIF",
                "message": "Please provide CIF price to Busan port.",
                "status": "pending",
                "created_at": datetime.utcnow().isoformat()
            }
        ],
        "total": 1
    }


@router.post("/inquiries/{inquiry_id}/respond")
async def respond_to_inquiry(
    inquiry_id: int,
    response_message: str = Form(...),
    price_quote: Optional[float] = Form(None)
):
    """문의 응답"""
    # TODO: DB 저장 및 이메일 발송

    return {
        "success": True,
        "message": "Response sent successfully."
    }


# ==================== Translation API ====================

import httpx
import json as json_module

# 환경변수에서 API 키 로드
DEEPL_API_KEY = os.getenv("DEEPL_API_KEY", "")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")

# 번역 캐시 (메모리 기반 - 프로덕션에서는 Redis 사용)
translation_cache = {}


class TranslateRequest(BaseModel):
    texts: List[str]
    target_lang: str
    source_lang: str = "en"


class TranslateBatchRequest(BaseModel):
    translations: dict  # {key: text} 형태의 영어 원본
    target_lang: str


async def translate_with_deepl(texts: List[str], target_lang: str, source_lang: str = "EN") -> List[str]:
    """DeepL API를 사용한 번역 (고품질)"""
    if not DEEPL_API_KEY:
        raise HTTPException(status_code=500, detail="DeepL API key not configured")

    # DeepL 언어 코드 매핑
    lang_map = {
        "en": "EN", "ko": "KO", "ja": "JA", "zh": "ZH",
        "es": "ES", "de": "DE", "fr": "FR", "it": "IT",
        "pt": "PT-PT", "ru": "RU", "ar": "AR", "th": "TH",  # DeepL doesn't support TH, AR
        "vi": "VI", "id": "ID", "tr": "TR", "nl": "NL",
        "pl": "PL", "hi": "HI"  # DeepL doesn't support HI
    }

    target = lang_map.get(target_lang, target_lang.upper())

    async with httpx.AsyncClient() as client:
        response = await client.post(
            "https://api-free.deepl.com/v2/translate",
            headers={"Authorization": f"DeepL-Auth-Key {DEEPL_API_KEY}"},
            data={
                "text": texts,
                "target_lang": target,
                "source_lang": "EN"
            }
        )

        if response.status_code == 200:
            data = response.json()
            return [t["text"] for t in data["translations"]]
        else:
            logger.error(f"DeepL error: {response.status_code} - {response.text}")
            raise HTTPException(status_code=500, detail="DeepL translation failed")


async def translate_with_openai(texts: List[str], target_lang: str) -> List[str]:
    """OpenAI GPT를 사용한 번역"""
    if not OPENAI_API_KEY:
        raise HTTPException(status_code=500, detail="OpenAI API key not configured")

    lang_names = {
        "ko": "Korean", "ja": "Japanese", "zh": "Chinese (Simplified)",
        "es": "Spanish", "de": "German", "fr": "French", "it": "Italian",
        "pt": "Portuguese", "ru": "Russian", "ar": "Arabic", "th": "Thai",
        "vi": "Vietnamese", "id": "Indonesian", "tr": "Turkish", "nl": "Dutch",
        "pl": "Polish", "hi": "Hindi"
    }

    target_name = lang_names.get(target_lang, target_lang)

    # 텍스트를 JSON 배열로 전달하여 일괄 번역
    prompt = f"""Translate the following texts from English to {target_name}.
Return ONLY a JSON array of translated strings in the same order.
Keep placeholders like {{percent}} unchanged.
Keep brand names like "WeDealize" unchanged.

Texts to translate:
{json_module.dumps(texts, ensure_ascii=False)}"""

    async with httpx.AsyncClient() as client:
        response = await client.post(
            "https://api.openai.com/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {OPENAI_API_KEY}",
                "Content-Type": "application/json"
            },
            json={
                "model": "gpt-4o-mini",
                "messages": [
                    {"role": "system", "content": "You are a professional translator. Translate accurately and naturally."},
                    {"role": "user", "content": prompt}
                ],
                "temperature": 0.3
            },
            timeout=60.0
        )

        if response.status_code == 200:
            data = response.json()
            content = data["choices"][0]["message"]["content"]
            # JSON 배열 파싱
            try:
                # ```json ... ``` 형태 처리
                if "```" in content:
                    content = content.split("```")[1]
                    if content.startswith("json"):
                        content = content[4:]
                return json_module.loads(content.strip())
            except:
                logger.error(f"Failed to parse OpenAI response: {content}")
                return texts
        else:
            logger.error(f"OpenAI error: {response.status_code} - {response.text}")
            raise HTTPException(status_code=500, detail="OpenAI translation failed")


async def translate_with_claude(texts: List[str], target_lang: str) -> List[str]:
    """Claude API를 사용한 번역"""
    if not ANTHROPIC_API_KEY:
        raise HTTPException(status_code=500, detail="Anthropic API key not configured")

    lang_names = {
        "ko": "Korean", "ja": "Japanese", "zh": "Chinese (Simplified)",
        "es": "Spanish", "de": "German", "fr": "French", "it": "Italian",
        "pt": "Portuguese", "ru": "Russian", "ar": "Arabic", "th": "Thai",
        "vi": "Vietnamese", "id": "Indonesian", "tr": "Turkish", "nl": "Dutch",
        "pl": "Polish", "hi": "Hindi"
    }

    target_name = lang_names.get(target_lang, target_lang)

    prompt = f"""Translate the following texts from English to {target_name}.
Return ONLY a JSON array of translated strings in the same order. No explanation.
Keep placeholders like {{percent}} unchanged.
Keep brand names like "WeDealize" unchanged.

Texts:
{json_module.dumps(texts, ensure_ascii=False)}"""

    async with httpx.AsyncClient() as client:
        response = await client.post(
            "https://api.anthropic.com/v1/messages",
            headers={
                "x-api-key": ANTHROPIC_API_KEY,
                "anthropic-version": "2023-06-01",
                "Content-Type": "application/json"
            },
            json={
                "model": "claude-3-haiku-20240307",
                "max_tokens": 4096,
                "messages": [
                    {"role": "user", "content": prompt}
                ]
            },
            timeout=60.0
        )

        if response.status_code == 200:
            data = response.json()
            content = data["content"][0]["text"]
            try:
                if "```" in content:
                    content = content.split("```")[1]
                    if content.startswith("json"):
                        content = content[4:]
                return json_module.loads(content.strip())
            except:
                logger.error(f"Failed to parse Claude response: {content}")
                return texts
        else:
            logger.error(f"Claude error: {response.status_code} - {response.text}")
            raise HTTPException(status_code=500, detail="Claude translation failed")


@router.post("/translate")
async def translate_texts(request: TranslateRequest):
    """텍스트 번역 API"""
    texts = request.texts
    target_lang = request.target_lang

    if target_lang == "en":
        return {"translations": texts}

    # 캐시 키 생성
    cache_key = f"{target_lang}:{hashlib.md5('|'.join(texts).encode()).hexdigest()}"

    if cache_key in translation_cache:
        return {"translations": translation_cache[cache_key], "cached": True}

    # 번역 수행 (우선순위: DeepL > OpenAI > Claude)
    translations = []
    provider = None

    try:
        if DEEPL_API_KEY and target_lang not in ["th", "ar", "hi"]:  # DeepL이 지원하지 않는 언어 제외
            translations = await translate_with_deepl(texts, target_lang)
            provider = "deepl"
        elif OPENAI_API_KEY:
            translations = await translate_with_openai(texts, target_lang)
            provider = "openai"
        elif ANTHROPIC_API_KEY:
            translations = await translate_with_claude(texts, target_lang)
            provider = "claude"
        else:
            raise HTTPException(
                status_code=500,
                detail="No translation API configured. Set DEEPL_API_KEY, OPENAI_API_KEY, or ANTHROPIC_API_KEY."
            )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Translation error: {e}")
        # 폴백: 원본 반환
        translations = texts

    # 캐시 저장
    translation_cache[cache_key] = translations

    return {
        "translations": translations,
        "provider": provider,
        "cached": False
    }


@router.post("/translate/batch")
async def translate_batch(request: TranslateBatchRequest):
    """전체 번역 객체를 한 번에 번역"""
    translations_dict = request.translations
    target_lang = request.target_lang

    if target_lang == "en":
        return {"translations": translations_dict}

    # 캐시 키
    cache_key = f"batch:{target_lang}:{hashlib.md5(json_module.dumps(translations_dict, sort_keys=True).encode()).hexdigest()}"

    if cache_key in translation_cache:
        return {"translations": translation_cache[cache_key], "cached": True}

    # 모든 텍스트 수집
    texts = []
    paths = []

    def collect_texts(obj, path=""):
        if isinstance(obj, str):
            texts.append(obj)
            paths.append(path)
        elif isinstance(obj, dict):
            for key, value in obj.items():
                collect_texts(value, f"{path}.{key}" if path else key)

    collect_texts(translations_dict)

    # 번역 수행
    translated_texts = []
    provider = None
    batch_size = 50  # API 제한을 고려한 배치 크기

    try:
        for i in range(0, len(texts), batch_size):
            batch = texts[i:i + batch_size]

            if DEEPL_API_KEY and target_lang not in ["th", "ar", "hi"]:
                batch_result = await translate_with_deepl(batch, target_lang)
                provider = "deepl"
            elif OPENAI_API_KEY:
                batch_result = await translate_with_openai(batch, target_lang)
                provider = "openai"
            elif ANTHROPIC_API_KEY:
                batch_result = await translate_with_claude(batch, target_lang)
                provider = "claude"
            else:
                raise HTTPException(status_code=500, detail="No translation API configured")

            translated_texts.extend(batch_result)
    except Exception as e:
        logger.error(f"Batch translation error: {e}")
        translated_texts = texts  # 폴백

    # 결과를 원래 구조로 재구성
    result = {}
    for i, path in enumerate(paths):
        parts = path.split(".")
        current = result
        for j, part in enumerate(parts[:-1]):
            if part not in current:
                current[part] = {}
            current = current[part]
        current[parts[-1]] = translated_texts[i] if i < len(translated_texts) else texts[i]

    # 캐시 저장
    translation_cache[cache_key] = result

    return {
        "translations": result,
        "provider": provider,
        "cached": False
    }


@router.get("/translate/languages")
async def get_supported_languages():
    """지원 언어 목록"""
    return {
        "languages": [
            {"code": "en", "name": "English", "nativeName": "English"},
            {"code": "ko", "name": "Korean", "nativeName": "한국어"},
            {"code": "ja", "name": "Japanese", "nativeName": "日本語"},
            {"code": "zh", "name": "Chinese", "nativeName": "中文"},
            {"code": "es", "name": "Spanish", "nativeName": "Español"},
            {"code": "de", "name": "German", "nativeName": "Deutsch"},
            {"code": "fr", "name": "French", "nativeName": "Français"},
            {"code": "it", "name": "Italian", "nativeName": "Italiano"},
            {"code": "pt", "name": "Portuguese", "nativeName": "Português"},
            {"code": "ru", "name": "Russian", "nativeName": "Русский"},
            {"code": "ar", "name": "Arabic", "nativeName": "العربية"},
            {"code": "th", "name": "Thai", "nativeName": "ไทย"},
            {"code": "vi", "name": "Vietnamese", "nativeName": "Tiếng Việt"},
            {"code": "id", "name": "Indonesian", "nativeName": "Bahasa Indonesia"},
            {"code": "tr", "name": "Turkish", "nativeName": "Türkçe"},
            {"code": "nl", "name": "Dutch", "nativeName": "Nederlands"},
            {"code": "pl", "name": "Polish", "nativeName": "Polski"},
            {"code": "hi", "name": "Hindi", "nativeName": "हिन्दी"}
        ],
        "providers": {
            "deepl": bool(DEEPL_API_KEY),
            "openai": bool(OPENAI_API_KEY),
            "claude": bool(ANTHROPIC_API_KEY)
        }
    }
