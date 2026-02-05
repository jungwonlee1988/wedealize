"""
WeDealize Email Service
카탈로그 요청 이메일 발송 및 수신 처리
"""

import asyncio
import email
import imaplib
import smtplib
import os
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.header import decode_header
from typing import List, Dict, Optional, Tuple
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from pathlib import Path
import logging
import hashlib
import re

logger = logging.getLogger(__name__)


@dataclass
class EmailTemplate:
    """이메일 템플릿"""
    subject: str
    body_html: str
    body_text: str


@dataclass
class ReceivedEmail:
    """수신된 이메일"""
    message_id: str
    sender: str
    subject: str
    body_text: str
    body_html: Optional[str]
    received_at: datetime
    attachments: List[Dict[str, str]]  # [{"filename": "...", "path": "...", "content_type": "..."}]
    in_reply_to: Optional[str] = None  # 회신인 경우 원본 메일 ID


@dataclass
class CatalogRequest:
    """카탈로그 요청 정보"""
    id: str
    supplier_id: int
    supplier_name: str
    supplier_email: str
    sent_at: Optional[datetime] = None
    status: str = "pending"  # pending, sent, replied, received, failed
    email_message_id: Optional[str] = None
    reply_received_at: Optional[datetime] = None
    catalog_files: List[str] = field(default_factory=list)
    error_message: Optional[str] = None


class EmailService:
    """
    이메일 서비스

    기능:
    1. 카탈로그 요청 이메일 발송
    2. 수신 메일함 모니터링
    3. 첨부파일 추출 및 저장
    4. 자동 팔로업 이메일
    """

    def __init__(self, config: Dict[str, str]):
        """
        Args:
            config: {
                "smtp_host": "smtp.gmail.com",
                "smtp_port": 587,
                "imap_host": "imap.gmail.com",
                "imap_port": 993,
                "email": "your-email@gmail.com",
                "password": "app-specific-password",
                "sender_name": "WeDealize Sourcing Team",
                "attachment_dir": "./attachments"
            }
        """
        self.config = config
        self.attachment_dir = Path(config.get("attachment_dir", "./attachments"))
        self.attachment_dir.mkdir(parents=True, exist_ok=True)

        # 요청 추적
        self.pending_requests: Dict[str, CatalogRequest] = {}

    def _get_catalog_request_template(
        self,
        supplier_name: str,
        product_categories: List[str] = None,
        language: str = "en"
    ) -> EmailTemplate:
        """카탈로그 요청 이메일 템플릿 생성"""

        categories_text = ", ".join(product_categories) if product_categories else "F&B products"

        if language == "en":
            subject = f"Catalog & Price List Request - {supplier_name}"
            body_text = f"""
Dear {supplier_name} Team,

I hope this email finds you well.

We are WeDealize, a B2B distribution platform based in South Korea, specializing in connecting global F&B suppliers with retailers and distributors in the Asian market.

We are interested in your {categories_text} and would like to request:

1. Your latest product catalog (PDF or digital format)
2. FOB/CIF price list
3. MOQ (Minimum Order Quantity) information
4. Available certifications (HACCP, Organic, Halal, etc.)
5. Lead time for orders

We are looking for long-term partnership opportunities and would appreciate any information you can provide.

Please feel free to contact us if you have any questions.

Best regards,

WeDealize Sourcing Team
Email: sourcing@wedealize.com
Website: www.wedealize.com
            """

            body_html = f"""
<html>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
    <p>Dear {supplier_name} Team,</p>

    <p>I hope this email finds you well.</p>

    <p>We are <strong>WeDealize</strong>, a B2B distribution platform based in South Korea,
    specializing in connecting global F&B suppliers with retailers and distributors in the Asian market.</p>

    <p>We are interested in your <strong>{categories_text}</strong> and would like to request:</p>

    <ul>
        <li>Your latest product catalog (PDF or digital format)</li>
        <li>FOB/CIF price list</li>
        <li>MOQ (Minimum Order Quantity) information</li>
        <li>Available certifications (HACCP, Organic, Halal, etc.)</li>
        <li>Lead time for orders</li>
    </ul>

    <p>We are looking for long-term partnership opportunities and would appreciate any information you can provide.</p>

    <p>Please feel free to contact us if you have any questions.</p>

    <p>Best regards,</p>

    <p>
        <strong>WeDealize Sourcing Team</strong><br>
        Email: sourcing@wedealize.com<br>
        Website: <a href="https://www.wedealize.com">www.wedealize.com</a>
    </p>
</body>
</html>
            """

        elif language == "ko":
            subject = f"카탈로그 및 가격표 요청 - {supplier_name}"
            body_text = f"""
{supplier_name} 담당자님께,

안녕하세요.

저희는 대한민국에 본사를 둔 B2B 유통 플랫폼 WeDealize입니다.
아시아 시장의 리테일러 및 유통업체와 글로벌 F&B 공급사를 연결하는 서비스를 운영하고 있습니다.

귀사의 {categories_text} 제품에 관심이 있어 다음 자료를 요청드립니다:

1. 최신 제품 카탈로그 (PDF 또는 디지털 형식)
2. FOB/CIF 가격표
3. MOQ (최소 주문 수량) 정보
4. 보유 인증서 (HACCP, 유기농, 할랄 등)
5. 주문 리드타임

장기적인 파트너십을 희망하며, 관련 정보를 보내주시면 감사하겠습니다.

문의사항이 있으시면 언제든 연락 주시기 바랍니다.

감사합니다.

WeDealize 소싱팀
이메일: sourcing@wedealize.com
웹사이트: www.wedealize.com
            """
            body_html = body_text.replace("\n", "<br>")

        else:
            # 기본 영어
            return self._get_catalog_request_template(supplier_name, product_categories, "en")

        return EmailTemplate(
            subject=subject,
            body_html=body_html,
            body_text=body_text.strip()
        )

    async def send_catalog_request(
        self,
        supplier_id: int,
        supplier_name: str,
        supplier_email: str,
        product_categories: List[str] = None,
        language: str = "en"
    ) -> CatalogRequest:
        """
        카탈로그 요청 이메일 발송

        Args:
            supplier_id: 공급사 DB ID
            supplier_name: 공급사 이름
            supplier_email: 공급사 이메일
            product_categories: 관심 제품 카테고리
            language: 이메일 언어 ("en", "ko")
        """
        # 요청 ID 생성
        request_id = hashlib.md5(
            f"{supplier_id}_{datetime.now().isoformat()}".encode()
        ).hexdigest()[:12]

        request = CatalogRequest(
            id=request_id,
            supplier_id=supplier_id,
            supplier_name=supplier_name,
            supplier_email=supplier_email
        )

        try:
            # 템플릿 생성
            template = self._get_catalog_request_template(
                supplier_name, product_categories, language
            )

            # 이메일 생성
            msg = MIMEMultipart("alternative")
            msg["Subject"] = template.subject
            msg["From"] = f"{self.config.get('sender_name', 'WeDealize')} <{self.config['email']}>"
            msg["To"] = supplier_email
            msg["X-Request-ID"] = request_id  # 추적용 헤더

            # 텍스트 및 HTML 본문 추가
            msg.attach(MIMEText(template.body_text, "plain", "utf-8"))
            msg.attach(MIMEText(template.body_html, "html", "utf-8"))

            # SMTP 발송
            message_id = await self._send_email(msg)

            request.sent_at = datetime.now()
            request.status = "sent"
            request.email_message_id = message_id

            # 추적 목록에 추가
            self.pending_requests[request_id] = request

            logger.info(f"카탈로그 요청 발송 완료: {supplier_name} ({supplier_email})")

        except Exception as e:
            request.status = "failed"
            request.error_message = str(e)
            logger.error(f"카탈로그 요청 발송 실패 ({supplier_email}): {e}")

        return request

    async def _send_email(self, msg: MIMEMultipart) -> str:
        """SMTP로 이메일 발송"""
        loop = asyncio.get_event_loop()

        def _send():
            with smtplib.SMTP(
                self.config["smtp_host"],
                self.config.get("smtp_port", 587)
            ) as server:
                server.starttls()
                server.login(self.config["email"], self.config["password"])
                server.send_message(msg)
                return msg["Message-ID"]

        return await loop.run_in_executor(None, _send)

    async def check_inbox_for_replies(self) -> List[ReceivedEmail]:
        """
        수신 메일함에서 카탈로그 회신 확인

        Returns:
            새로 수신된 이메일 목록 (첨부파일 포함)
        """
        received_emails = []

        try:
            # IMAP 연결
            mail = imaplib.IMAP4_SSL(
                self.config["imap_host"],
                self.config.get("imap_port", 993)
            )
            mail.login(self.config["email"], self.config["password"])
            mail.select("INBOX")

            # 최근 7일 이메일 검색
            since_date = (datetime.now() - timedelta(days=7)).strftime("%d-%b-%Y")
            _, message_numbers = mail.search(None, f'(SINCE "{since_date}")')

            for num in message_numbers[0].split():
                _, msg_data = mail.fetch(num, "(RFC822)")
                email_body = msg_data[0][1]
                msg = email.message_from_bytes(email_body)

                # 이메일 파싱
                received = await self._parse_email(msg)
                if received:
                    # 첨부파일 저장
                    received.attachments = await self._save_attachments(msg, received.message_id)
                    received_emails.append(received)

                    # 우리가 보낸 요청에 대한 회신인지 확인
                    await self._match_reply_to_request(received)

            mail.logout()

        except Exception as e:
            logger.error(f"메일함 확인 실패: {e}")

        return received_emails

    async def _parse_email(self, msg) -> Optional[ReceivedEmail]:
        """이메일 메시지 파싱"""
        try:
            # 헤더 디코딩
            subject, encoding = decode_header(msg["Subject"])[0]
            if isinstance(subject, bytes):
                subject = subject.decode(encoding or "utf-8", errors="ignore")

            sender = msg.get("From", "")
            message_id = msg.get("Message-ID", "")
            in_reply_to = msg.get("In-Reply-To")

            # 본문 추출
            body_text = ""
            body_html = None

            if msg.is_multipart():
                for part in msg.walk():
                    content_type = part.get_content_type()
                    if content_type == "text/plain":
                        payload = part.get_payload(decode=True)
                        if payload:
                            body_text = payload.decode("utf-8", errors="ignore")
                    elif content_type == "text/html":
                        payload = part.get_payload(decode=True)
                        if payload:
                            body_html = payload.decode("utf-8", errors="ignore")
            else:
                body_text = msg.get_payload(decode=True).decode("utf-8", errors="ignore")

            return ReceivedEmail(
                message_id=message_id,
                sender=sender,
                subject=subject,
                body_text=body_text,
                body_html=body_html,
                received_at=datetime.now(),
                attachments=[],
                in_reply_to=in_reply_to
            )

        except Exception as e:
            logger.warning(f"이메일 파싱 실패: {e}")
            return None

    async def _save_attachments(
        self,
        msg,
        email_id: str
    ) -> List[Dict[str, str]]:
        """이메일 첨부파일 저장"""
        attachments = []

        if not msg.is_multipart():
            return attachments

        # 이메일별 폴더 생성
        email_dir = self.attachment_dir / email_id.replace("<", "").replace(">", "")[:20]
        email_dir.mkdir(parents=True, exist_ok=True)

        for part in msg.walk():
            content_disposition = str(part.get("Content-Disposition", ""))

            if "attachment" in content_disposition:
                filename = part.get_filename()
                if filename:
                    # 파일명 디코딩
                    decoded_name, encoding = decode_header(filename)[0]
                    if isinstance(decoded_name, bytes):
                        filename = decoded_name.decode(encoding or "utf-8", errors="ignore")

                    # 허용된 확장자 체크 (보안)
                    allowed_extensions = {'.pdf', '.xlsx', '.xls', '.csv', '.doc', '.docx', '.zip'}
                    ext = Path(filename).suffix.lower()

                    if ext in allowed_extensions:
                        filepath = email_dir / filename
                        with open(filepath, "wb") as f:
                            f.write(part.get_payload(decode=True))

                        attachments.append({
                            "filename": filename,
                            "path": str(filepath),
                            "content_type": part.get_content_type(),
                            "size": filepath.stat().st_size
                        })

                        logger.info(f"첨부파일 저장: {filename}")

        return attachments

    async def _match_reply_to_request(self, received: ReceivedEmail):
        """수신 메일을 기존 요청과 매칭"""
        sender_email = self._extract_email_address(received.sender)

        for request_id, request in self.pending_requests.items():
            # 발신자 이메일 매칭
            if sender_email.lower() == request.supplier_email.lower():
                request.status = "replied"
                request.reply_received_at = received.received_at

                # 첨부파일이 있으면 카탈로그로 기록
                if received.attachments:
                    request.status = "received"
                    request.catalog_files = [a["path"] for a in received.attachments]

                logger.info(f"회신 매칭: {request.supplier_name} - {len(received.attachments)}개 첨부파일")
                break

    def _extract_email_address(self, sender: str) -> str:
        """발신자 문자열에서 이메일 주소 추출"""
        match = re.search(r'<([^>]+)>', sender)
        if match:
            return match.group(1)
        return sender

    async def send_followup(
        self,
        request: CatalogRequest,
        days_since_sent: int = 5
    ) -> bool:
        """
        팔로업 이메일 발송

        Args:
            request: 원본 카탈로그 요청
            days_since_sent: 최초 발송 후 경과 일수
        """
        if request.status in ["received", "replied"]:
            return False  # 이미 회신 받음

        if not request.sent_at:
            return False

        # 경과 일수 확인
        elapsed = (datetime.now() - request.sent_at).days
        if elapsed < days_since_sent:
            return False

        subject = f"Re: Catalog Request Follow-up - {request.supplier_name}"
        body_text = f"""
Dear {request.supplier_name} Team,

I hope this email finds you well.

I am following up on my previous email regarding catalog and price list request.

We are very interested in establishing a business relationship and would appreciate
if you could send us your product information at your earliest convenience.

Thank you for your time and consideration.

Best regards,
WeDealize Sourcing Team
        """

        try:
            msg = MIMEMultipart()
            msg["Subject"] = subject
            msg["From"] = f"{self.config.get('sender_name', 'WeDealize')} <{self.config['email']}>"
            msg["To"] = request.supplier_email
            msg["In-Reply-To"] = request.email_message_id

            msg.attach(MIMEText(body_text, "plain", "utf-8"))

            await self._send_email(msg)
            logger.info(f"팔로업 발송: {request.supplier_name}")
            return True

        except Exception as e:
            logger.error(f"팔로업 발송 실패: {e}")
            return False

    def get_pending_requests(self) -> List[CatalogRequest]:
        """대기 중인 요청 목록"""
        return [r for r in self.pending_requests.values() if r.status == "sent"]

    def get_received_catalogs(self) -> List[CatalogRequest]:
        """수신된 카탈로그 목록"""
        return [r for r in self.pending_requests.values() if r.status == "received"]


# 설정 예시
def get_gmail_config() -> Dict[str, str]:
    """Gmail 설정 (앱 비밀번호 필요)"""
    return {
        "smtp_host": "smtp.gmail.com",
        "smtp_port": 587,
        "imap_host": "imap.gmail.com",
        "imap_port": 993,
        "email": os.getenv("GMAIL_EMAIL"),
        "password": os.getenv("GMAIL_APP_PASSWORD"),  # 앱 비밀번호
        "sender_name": "WeDealize Sourcing Team",
        "attachment_dir": "./downloads/attachments"
    }


# 사용 예시
async def main():
    config = get_gmail_config()

    if not config["email"]:
        print("이메일 설정이 필요합니다. 환경 변수를 설정하세요:")
        print("  GMAIL_EMAIL=your-email@gmail.com")
        print("  GMAIL_APP_PASSWORD=your-app-password")
        return

    service = EmailService(config)

    # 카탈로그 요청 발송
    request = await service.send_catalog_request(
        supplier_id=1,
        supplier_name="Oleificio Ferrara",
        supplier_email="sales@example.com",
        product_categories=["Olive Oil", "Organic Products"],
        language="en"
    )

    print(f"요청 상태: {request.status}")

    # 수신 메일 확인
    # emails = await service.check_inbox_for_replies()
    # print(f"수신 메일: {len(emails)}개")


if __name__ == "__main__":
    asyncio.run(main())
