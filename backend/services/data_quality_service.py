"""
WeDealize Data Quality Service
파싱된 데이터의 품질을 체크하고, 누락된 정보에 대해 공급사에게 자동 팔로업 요청
"""

from dataclasses import dataclass, field
from typing import List, Dict, Optional, Any
from datetime import datetime, timedelta
from enum import Enum
import logging

logger = logging.getLogger(__name__)


class MissingDataType(Enum):
    """누락 데이터 유형"""
    MOQ = "moq"                          # 최소 주문 수량
    PRICE = "price"                      # 가격 정보
    UNIT_PRICE = "unit_price"            # 단가
    CERTIFICATIONS = "certifications"    # 인증서
    PRODUCT_IMAGES = "product_images"    # 상품 이미지
    SPECIFICATIONS = "specifications"    # 상품 규격
    LEAD_TIME = "lead_time"              # 리드타임
    SHELF_LIFE = "shelf_life"            # 유통기한
    INGREDIENTS = "ingredients"          # 원재료
    PACKAGING = "packaging"              # 포장 정보
    HS_CODE = "hs_code"                  # HS 코드
    ORIGIN_COUNTRY = "origin_country"    # 원산지


class FollowupPriority(Enum):
    """팔로업 우선순위"""
    HIGH = "high"       # MOQ, Price - 거래에 필수
    MEDIUM = "medium"   # Certifications, Images - 의사결정에 중요
    LOW = "low"         # Specifications, etc - 부가 정보


@dataclass
class MissingDataItem:
    """누락 데이터 항목"""
    data_type: MissingDataType
    priority: FollowupPriority
    product_ids: List[int] = field(default_factory=list)
    product_names: List[str] = field(default_factory=list)
    count: int = 0


@dataclass
class DataQualityReport:
    """데이터 품질 리포트"""
    supplier_id: int
    supplier_name: str
    total_products: int
    completeness_score: float  # 0-100
    missing_items: List[MissingDataItem] = field(default_factory=list)
    recommendations: List[str] = field(default_factory=list)
    generated_at: datetime = field(default_factory=datetime.utcnow)


@dataclass
class FollowupRequest:
    """팔로업 요청"""
    supplier_id: int
    supplier_email: str
    supplier_name: str
    missing_items: List[MissingDataItem]
    priority: FollowupPriority
    channel: str  # "email" or "portal_notification"
    scheduled_at: datetime
    message: str = ""


# 필드별 우선순위 및 가중치 정의
FIELD_CONFIG = {
    MissingDataType.MOQ: {
        "priority": FollowupPriority.HIGH,
        "weight": 15,
        "required": True,
        "label_en": "Minimum Order Quantity",
        "label_ko": "최소 주문 수량"
    },
    MissingDataType.PRICE: {
        "priority": FollowupPriority.HIGH,
        "weight": 15,
        "required": True,
        "label_en": "Price Information",
        "label_ko": "가격 정보"
    },
    MissingDataType.UNIT_PRICE: {
        "priority": FollowupPriority.HIGH,
        "weight": 10,
        "required": True,
        "label_en": "Unit Price",
        "label_ko": "단가"
    },
    MissingDataType.CERTIFICATIONS: {
        "priority": FollowupPriority.MEDIUM,
        "weight": 10,
        "required": False,
        "label_en": "Certifications",
        "label_ko": "인증서"
    },
    MissingDataType.PRODUCT_IMAGES: {
        "priority": FollowupPriority.MEDIUM,
        "weight": 10,
        "required": False,
        "label_en": "Product Images",
        "label_ko": "상품 이미지"
    },
    MissingDataType.SPECIFICATIONS: {
        "priority": FollowupPriority.MEDIUM,
        "weight": 8,
        "required": False,
        "label_en": "Product Specifications",
        "label_ko": "상품 규격"
    },
    MissingDataType.LEAD_TIME: {
        "priority": FollowupPriority.MEDIUM,
        "weight": 8,
        "required": False,
        "label_en": "Lead Time",
        "label_ko": "리드타임"
    },
    MissingDataType.SHELF_LIFE: {
        "priority": FollowupPriority.LOW,
        "weight": 6,
        "required": False,
        "label_en": "Shelf Life",
        "label_ko": "유통기한"
    },
    MissingDataType.INGREDIENTS: {
        "priority": FollowupPriority.LOW,
        "weight": 6,
        "required": False,
        "label_en": "Ingredients List",
        "label_ko": "원재료"
    },
    MissingDataType.PACKAGING: {
        "priority": FollowupPriority.LOW,
        "weight": 6,
        "required": False,
        "label_en": "Packaging Information",
        "label_ko": "포장 정보"
    },
    MissingDataType.HS_CODE: {
        "priority": FollowupPriority.LOW,
        "weight": 3,
        "required": False,
        "label_en": "HS Code",
        "label_ko": "HS 코드"
    },
    MissingDataType.ORIGIN_COUNTRY: {
        "priority": FollowupPriority.LOW,
        "weight": 3,
        "required": False,
        "label_en": "Country of Origin",
        "label_ko": "원산지"
    },
}


class DataQualityService:
    """데이터 품질 관리 서비스"""

    def __init__(self, db_session, email_service=None):
        self.db = db_session
        self.email_service = email_service

    async def analyze_supplier_data(self, supplier_id: int) -> DataQualityReport:
        """
        공급사의 모든 상품 데이터 품질 분석

        Args:
            supplier_id: 공급사 ID

        Returns:
            DataQualityReport: 데이터 품질 리포트
        """
        # DB에서 공급사 및 상품 조회
        supplier = await self._get_supplier(supplier_id)
        products = await self._get_supplier_products(supplier_id)

        if not products:
            return DataQualityReport(
                supplier_id=supplier_id,
                supplier_name=supplier.get("name", "Unknown"),
                total_products=0,
                completeness_score=0,
                missing_items=[],
                recommendations=["No products found. Please upload a catalog."]
            )

        # 각 필드별 누락 현황 분석
        missing_analysis = self._analyze_missing_fields(products)

        # 완성도 점수 계산
        completeness_score = self._calculate_completeness_score(products, missing_analysis)

        # 권장 사항 생성
        recommendations = self._generate_recommendations(missing_analysis, completeness_score)

        return DataQualityReport(
            supplier_id=supplier_id,
            supplier_name=supplier.get("name", "Unknown"),
            total_products=len(products),
            completeness_score=completeness_score,
            missing_items=missing_analysis,
            recommendations=recommendations
        )

    def _analyze_missing_fields(self, products: List[Dict]) -> List[MissingDataItem]:
        """상품 목록에서 누락 필드 분석"""
        missing_items = []

        for data_type in MissingDataType:
            config = FIELD_CONFIG[data_type]
            missing_products = []
            missing_names = []

            for product in products:
                if self._is_field_missing(product, data_type):
                    missing_products.append(product.get("id"))
                    missing_names.append(product.get("name", "Unknown"))

            if missing_products:
                missing_items.append(MissingDataItem(
                    data_type=data_type,
                    priority=config["priority"],
                    product_ids=missing_products,
                    product_names=missing_names[:5],  # 최대 5개 이름만
                    count=len(missing_products)
                ))

        # 우선순위순 정렬
        priority_order = {FollowupPriority.HIGH: 0, FollowupPriority.MEDIUM: 1, FollowupPriority.LOW: 2}
        missing_items.sort(key=lambda x: (priority_order[x.priority], -x.count))

        return missing_items

    def _is_field_missing(self, product: Dict, data_type: MissingDataType) -> bool:
        """특정 필드가 누락되었는지 확인"""
        field_mappings = {
            MissingDataType.MOQ: lambda p: not p.get("moq"),
            MissingDataType.PRICE: lambda p: not p.get("unit_price_min") and not p.get("unit_price_max"),
            MissingDataType.UNIT_PRICE: lambda p: not p.get("unit_price_min"),
            MissingDataType.CERTIFICATIONS: lambda p: not p.get("certifications") or len(p.get("certifications", [])) == 0,
            MissingDataType.PRODUCT_IMAGES: lambda p: not p.get("image_url") and not p.get("images"),
            MissingDataType.SPECIFICATIONS: lambda p: not p.get("specifications") or len(p.get("specifications", {})) == 0,
            MissingDataType.LEAD_TIME: lambda p: not p.get("lead_time_days"),
            MissingDataType.SHELF_LIFE: lambda p: not p.get("shelf_life_days"),
            MissingDataType.INGREDIENTS: lambda p: not p.get("ingredients"),
            MissingDataType.PACKAGING: lambda p: not p.get("packaging_info"),
            MissingDataType.HS_CODE: lambda p: not p.get("hs_code"),
            MissingDataType.ORIGIN_COUNTRY: lambda p: not p.get("origin_country"),
        }

        checker = field_mappings.get(data_type)
        return checker(product) if checker else False

    def _calculate_completeness_score(self, products: List[Dict], missing_items: List[MissingDataItem]) -> float:
        """완성도 점수 계산 (0-100)"""
        if not products:
            return 0.0

        total_weight = sum(config["weight"] for config in FIELD_CONFIG.values())
        total_possible = total_weight * len(products)

        lost_score = 0
        for item in missing_items:
            weight = FIELD_CONFIG[item.data_type]["weight"]
            lost_score += weight * item.count

        actual_score = total_possible - lost_score
        completeness = (actual_score / total_possible) * 100 if total_possible > 0 else 0

        return round(max(0, min(100, completeness)), 1)

    def _generate_recommendations(self, missing_items: List[MissingDataItem], score: float) -> List[str]:
        """권장 사항 생성"""
        recommendations = []

        # 점수 기반 일반 권장사항
        if score < 50:
            recommendations.append("Data completeness is low. Please provide more product details for better visibility.")
        elif score < 80:
            recommendations.append("Good progress! A few more details will help buyers make decisions faster.")

        # 필수 필드 누락 시
        high_priority_missing = [item for item in missing_items if item.priority == FollowupPriority.HIGH]
        if high_priority_missing:
            missing_labels = [FIELD_CONFIG[item.data_type]["label_en"] for item in high_priority_missing]
            recommendations.append(f"Critical: Please add {', '.join(missing_labels)} for your products.")

        # 인증서 누락 시
        cert_missing = next((item for item in missing_items if item.data_type == MissingDataType.CERTIFICATIONS), None)
        if cert_missing and cert_missing.count > 0:
            recommendations.append(f"Adding certifications can increase buyer confidence. {cert_missing.count} products need certification info.")

        # 이미지 누락 시
        image_missing = next((item for item in missing_items if item.data_type == MissingDataType.PRODUCT_IMAGES), None)
        if image_missing and image_missing.count > 0:
            recommendations.append(f"Products with images get 3x more inquiries. {image_missing.count} products need images.")

        return recommendations

    async def _get_supplier(self, supplier_id: int) -> Dict:
        """DB에서 공급사 정보 조회 (구현 필요)"""
        # TODO: 실제 DB 쿼리 구현
        return {"id": supplier_id, "name": "Sample Supplier"}

    async def _get_supplier_products(self, supplier_id: int) -> List[Dict]:
        """DB에서 공급사 상품 목록 조회 (구현 필요)"""
        # TODO: 실제 DB 쿼리 구현
        return []


class FollowupService:
    """팔로업 자동화 서비스"""

    def __init__(self, db_session, email_service, data_quality_service: DataQualityService):
        self.db = db_session
        self.email_service = email_service
        self.data_quality_service = data_quality_service

        # 팔로업 설정
        self.followup_intervals = {
            FollowupPriority.HIGH: timedelta(days=3),    # 필수 정보: 3일 후
            FollowupPriority.MEDIUM: timedelta(days=7),  # 중요 정보: 7일 후
            FollowupPriority.LOW: timedelta(days=14),    # 부가 정보: 14일 후
        }
        self.max_followups = 3  # 최대 팔로업 횟수

    async def check_and_schedule_followups(self, supplier_id: int) -> List[FollowupRequest]:
        """
        공급사 데이터를 분석하고 필요한 팔로업 스케줄링

        Args:
            supplier_id: 공급사 ID

        Returns:
            List[FollowupRequest]: 스케줄된 팔로업 요청 목록
        """
        # 데이터 품질 분석
        report = await self.data_quality_service.analyze_supplier_data(supplier_id)

        # 팔로업이 필요한 누락 항목 필터링
        followup_needed = [
            item for item in report.missing_items
            if item.count > 0 and FIELD_CONFIG[item.data_type]["required"]
        ]

        if not followup_needed:
            # 필수 정보가 모두 있으면 중요 정보에 대해서만 팔로업
            followup_needed = [
                item for item in report.missing_items
                if item.count > 0 and item.priority == FollowupPriority.MEDIUM
            ][:3]  # 최대 3개

        if not followup_needed:
            logger.info(f"Supplier {supplier_id}: No followup needed (completeness: {report.completeness_score}%)")
            return []

        # 이전 팔로업 횟수 확인
        previous_followups = await self._get_followup_count(supplier_id)
        if previous_followups >= self.max_followups:
            logger.info(f"Supplier {supplier_id}: Max followup count reached ({self.max_followups})")
            return []

        # 팔로업 요청 생성
        supplier = await self.data_quality_service._get_supplier(supplier_id)
        supplier_email = await self._get_supplier_email(supplier_id)

        followup_requests = []

        # 우선순위가 가장 높은 항목 기준으로 팔로업 생성
        highest_priority = followup_needed[0].priority
        interval = self.followup_intervals[highest_priority]

        followup = FollowupRequest(
            supplier_id=supplier_id,
            supplier_email=supplier_email,
            supplier_name=supplier.get("name", ""),
            missing_items=followup_needed,
            priority=highest_priority,
            channel="email",
            scheduled_at=datetime.utcnow() + interval,
            message=self._generate_followup_message(supplier.get("name"), followup_needed, "en")
        )

        followup_requests.append(followup)

        # DB에 스케줄 저장
        await self._save_followup_schedule(followup)

        return followup_requests

    def _generate_followup_message(
        self,
        supplier_name: str,
        missing_items: List[MissingDataItem],
        language: str = "en"
    ) -> str:
        """팔로업 이메일 메시지 생성"""

        if language == "ko":
            return self._generate_korean_followup(supplier_name, missing_items)

        # English version
        missing_labels = [
            FIELD_CONFIG[item.data_type]["label_en"]
            for item in missing_items[:5]
        ]
        missing_list = "\n".join([f"  • {label}" for label in missing_labels])

        product_examples = []
        for item in missing_items[:3]:
            if item.product_names:
                product_examples.extend(item.product_names[:2])
        product_examples = list(set(product_examples))[:5]

        message = f"""Dear {supplier_name},

Thank you for providing your product catalog. We noticed that some information is missing for your products, which may affect buyer inquiries.

Missing Information:
{missing_list}

"""
        if product_examples:
            examples_str = ", ".join(product_examples)
            message += f"""Products that need updates:
  {examples_str}

"""

        message += """Having complete product information helps buyers make faster purchasing decisions and increases your chances of receiving inquiries.

You can update your product information by:
1. Replying to this email with the missing details
2. Logging into your WeDealize Supplier Portal

Best regards,
WeDealize Sourcing Team
"""
        return message

    def _generate_korean_followup(self, supplier_name: str, missing_items: List[MissingDataItem]) -> str:
        """한국어 팔로업 메시지 생성"""
        missing_labels = [
            FIELD_CONFIG[item.data_type]["label_ko"]
            for item in missing_items[:5]
        ]
        missing_list = "\n".join([f"  • {label}" for label in missing_labels])

        return f"""{supplier_name} 담당자님께,

제출해 주신 상품 카탈로그 감사합니다. 일부 상품 정보가 누락되어 안내드립니다.

누락된 정보:
{missing_list}

완전한 상품 정보는 바이어의 빠른 구매 결정을 돕고, 더 많은 문의로 이어집니다.

아래 방법으로 정보를 업데이트해 주세요:
1. 이 이메일에 회신하여 누락 정보 제공
2. WeDealize 공급사 포털에서 직접 업데이트

감사합니다.
WeDealize 소싱팀
"""

    async def send_scheduled_followups(self) -> int:
        """스케줄된 팔로업 발송 (스케줄러에서 호출)"""
        pending_followups = await self._get_pending_followups()
        sent_count = 0

        for followup in pending_followups:
            try:
                if followup.channel == "email" and self.email_service:
                    await self.email_service.send_followup_email(
                        to_email=followup.supplier_email,
                        supplier_name=followup.supplier_name,
                        subject="[WeDealize] Product Information Update Request",
                        body=followup.message
                    )
                    await self._mark_followup_sent(followup)
                    sent_count += 1
                    logger.info(f"Followup sent to {followup.supplier_email}")

            except Exception as e:
                logger.error(f"Failed to send followup to {followup.supplier_email}: {e}")

        return sent_count

    async def _get_followup_count(self, supplier_id: int) -> int:
        """공급사의 이전 팔로업 횟수 조회 (구현 필요)"""
        # TODO: 실제 DB 쿼리 구현
        return 0

    async def _get_supplier_email(self, supplier_id: int) -> str:
        """공급사 이메일 조회 (구현 필요)"""
        # TODO: 실제 DB 쿼리 구현
        return ""

    async def _save_followup_schedule(self, followup: FollowupRequest) -> None:
        """팔로업 스케줄 저장 (구현 필요)"""
        # TODO: 실제 DB 저장 구현
        pass

    async def _get_pending_followups(self) -> List[FollowupRequest]:
        """발송 대기 중인 팔로업 조회 (구현 필요)"""
        # TODO: 실제 DB 쿼리 구현
        return []

    async def _mark_followup_sent(self, followup: FollowupRequest) -> None:
        """팔로업 발송 완료 표시 (구현 필요)"""
        # TODO: 실제 DB 업데이트 구현
        pass


class PortalNotificationService:
    """공급사 포털 알림 서비스"""

    def __init__(self, db_session):
        self.db = db_session

    async def create_data_completion_notification(
        self,
        supplier_id: int,
        report: DataQualityReport
    ) -> Dict:
        """
        공급사 포털에 데이터 완성도 알림 생성

        Args:
            supplier_id: 공급사 ID
            report: 데이터 품질 리포트

        Returns:
            생성된 알림 정보
        """
        notification = {
            "supplier_id": supplier_id,
            "type": "data_completion",
            "title": f"Data Completeness: {report.completeness_score}%",
            "message": self._build_notification_message(report),
            "priority": "high" if report.completeness_score < 70 else "medium",
            "action_url": "/dashboard/products",
            "action_label": "Update Products",
            "created_at": datetime.utcnow().isoformat(),
            "is_read": False
        }

        # TODO: DB에 저장
        # await self._save_notification(notification)

        return notification

    def _build_notification_message(self, report: DataQualityReport) -> str:
        """알림 메시지 생성"""
        if report.completeness_score >= 90:
            return "Great job! Your product data is almost complete."

        high_priority = [
            item for item in report.missing_items
            if item.priority == FollowupPriority.HIGH
        ]

        if high_priority:
            items = [FIELD_CONFIG[item.data_type]["label_en"] for item in high_priority[:3]]
            return f"Please add {', '.join(items)} to improve visibility."

        return "Complete your product information to get more buyer inquiries."

    async def get_supplier_notifications(self, supplier_id: int) -> List[Dict]:
        """공급사 알림 목록 조회 (구현 필요)"""
        # TODO: 실제 DB 쿼리 구현
        return []
