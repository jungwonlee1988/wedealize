"""
WeDealize Email Tracking Models
이메일 요청 및 수신 추적을 위한 DB 모델
"""

from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, ForeignKey, Enum, JSON
from sqlalchemy.orm import relationship
import enum

from .database import Base


class EmailRequestStatus(enum.Enum):
    PENDING = "pending"           # 발송 대기
    SENT = "sent"                 # 발송 완료
    DELIVERED = "delivered"       # 전달 확인
    OPENED = "opened"             # 열람 확인 (추적 시)
    REPLIED = "replied"           # 회신 수신 (본문만)
    CATALOG_RECEIVED = "catalog_received"  # 카탈로그 첨부파일 수신
    BOUNCED = "bounced"           # 반송
    FAILED = "failed"             # 발송 실패
    FOLLOWUP_SENT = "followup_sent"  # 팔로업 발송


class EmailRequest(Base):
    """카탈로그 요청 이메일 추적 테이블"""
    __tablename__ = "email_requests"

    id = Column(Integer, primary_key=True, autoincrement=True)
    supplier_id = Column(Integer, ForeignKey("suppliers.id"), nullable=False)

    # 이메일 정보
    to_email = Column(String(255), nullable=False)
    to_name = Column(String(255))
    subject = Column(String(500))
    body_text = Column(Text)
    body_html = Column(Text)
    language = Column(String(10), default="en")  # en, ko, zh, etc.

    # 발송 정보
    message_id = Column(String(255))  # 이메일 Message-ID
    sent_at = Column(DateTime)
    status = Column(Enum(EmailRequestStatus), default=EmailRequestStatus.PENDING)

    # 회신 정보
    reply_received_at = Column(DateTime)
    reply_message_id = Column(String(255))
    reply_subject = Column(String(500))
    reply_body_preview = Column(Text)  # 회신 본문 미리보기

    # 팔로업
    followup_count = Column(Integer, default=0)
    last_followup_at = Column(DateTime)
    next_followup_at = Column(DateTime)

    # 오류
    error_message = Column(Text)
    bounce_reason = Column(String(255))

    # 메타
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # 관계
    supplier = relationship("Supplier", backref="email_requests")
    attachments = relationship("ReceivedAttachment", back_populates="email_request")


class ReceivedAttachment(Base):
    """수신된 첨부파일 테이블"""
    __tablename__ = "received_attachments"

    id = Column(Integer, primary_key=True, autoincrement=True)
    email_request_id = Column(Integer, ForeignKey("email_requests.id"), nullable=False)
    supplier_id = Column(Integer, ForeignKey("suppliers.id"))

    # 파일 정보
    filename = Column(String(500), nullable=False)
    file_path = Column(String(500))  # 저장된 경로
    file_size = Column(Integer)  # bytes
    content_type = Column(String(100))  # MIME type

    # 파일 분류
    file_category = Column(String(50))  # catalog, pricelist, certificate, other
    is_catalog = Column(Boolean, default=False)
    is_pricelist = Column(Boolean, default=False)

    # 파싱 상태
    is_parsed = Column(Boolean, default=False)
    parsed_at = Column(DateTime)
    products_extracted = Column(Integer, default=0)
    parse_error = Column(Text)

    # 메타
    received_at = Column(DateTime, default=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)

    # 관계
    email_request = relationship("EmailRequest", back_populates="attachments")


class EmailTemplate(Base):
    """이메일 템플릿 테이블"""
    __tablename__ = "email_templates"

    id = Column(Integer, primary_key=True, autoincrement=True)

    # 템플릿 정보
    name = Column(String(100), nullable=False)  # catalog_request, followup, etc.
    language = Column(String(10), default="en")
    subject = Column(String(500), nullable=False)
    body_text = Column(Text, nullable=False)
    body_html = Column(Text)

    # 변수
    variables = Column(JSON, default=list)  # ["supplier_name", "product_categories"]

    # 상태
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class EmailBlacklist(Base):
    """이메일 블랙리스트 (반송/스팸 신고 등)"""
    __tablename__ = "email_blacklist"

    id = Column(Integer, primary_key=True, autoincrement=True)
    email = Column(String(255), nullable=False, unique=True)
    reason = Column(String(255))  # bounced, unsubscribed, spam_reported
    blacklisted_at = Column(DateTime, default=datetime.utcnow)


class ContactAttempt(Base):
    """연락 시도 기록 테이블"""
    __tablename__ = "contact_attempts"

    id = Column(Integer, primary_key=True, autoincrement=True)
    supplier_id = Column(Integer, ForeignKey("suppliers.id"), nullable=False)

    # 연락 방법
    contact_method = Column(String(50))  # email, contact_form, phone, linkedin
    contact_target = Column(String(255))  # 이메일 주소, 폼 URL 등

    # 결과
    status = Column(String(50))  # success, failed, no_response
    attempted_at = Column(DateTime, default=datetime.utcnow)
    response_received_at = Column(DateTime)

    # 메모
    notes = Column(Text)


# 통계 쿼리를 위한 View 정의 (선택적)
"""
CREATE VIEW email_request_stats AS
SELECT
    DATE(sent_at) as date,
    COUNT(*) as total_sent,
    SUM(CASE WHEN status = 'catalog_received' THEN 1 ELSE 0 END) as catalogs_received,
    SUM(CASE WHEN status = 'replied' THEN 1 ELSE 0 END) as replies_received,
    SUM(CASE WHEN status = 'bounced' THEN 1 ELSE 0 END) as bounced,
    ROUND(SUM(CASE WHEN status IN ('replied', 'catalog_received') THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 2) as response_rate
FROM email_requests
WHERE sent_at IS NOT NULL
GROUP BY DATE(sent_at)
ORDER BY date DESC;
"""
