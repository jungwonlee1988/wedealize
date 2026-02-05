"""
WeDealize Followup Scheduler
데이터 누락에 대한 자동 팔로업 스케줄러
"""

import asyncio
from datetime import datetime, timedelta
from typing import List
import logging
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger

logger = logging.getLogger(__name__)


class FollowupScheduler:
    """자동 팔로업 스케줄러"""

    def __init__(self, db_session, email_service, data_quality_service, followup_service):
        self.db = db_session
        self.email_service = email_service
        self.data_quality_service = data_quality_service
        self.followup_service = followup_service
        self.scheduler = AsyncIOScheduler()

    def start(self):
        """스케줄러 시작"""
        # 매일 오전 9시: 데이터 완성도 체크 및 팔로업 스케줄링
        self.scheduler.add_job(
            self.daily_completeness_check,
            CronTrigger(hour=9, minute=0),
            id="daily_completeness_check",
            name="Daily Data Completeness Check"
        )

        # 매 4시간: 스케줄된 팔로업 발송
        self.scheduler.add_job(
            self.send_pending_followups,
            CronTrigger(hour="9,13,17", minute=0),
            id="send_pending_followups",
            name="Send Pending Followup Emails"
        )

        # 매주 월요일 오전 10시: 주간 리포트 발송
        self.scheduler.add_job(
            self.send_weekly_report,
            CronTrigger(day_of_week="mon", hour=10, minute=0),
            id="weekly_report",
            name="Weekly Data Quality Report"
        )

        # 매일 오후 2시: 응답 없는 공급사 팔로업
        self.scheduler.add_job(
            self.followup_no_response,
            CronTrigger(hour=14, minute=0),
            id="followup_no_response",
            name="Followup No Response Suppliers"
        )

        self.scheduler.start()
        logger.info("Followup scheduler started")

    def stop(self):
        """스케줄러 중지"""
        self.scheduler.shutdown()
        logger.info("Followup scheduler stopped")

    async def daily_completeness_check(self):
        """
        일일 데이터 완성도 체크
        - 최근 카탈로그를 업로드한 공급사 대상
        - 완성도가 낮은 경우 팔로업 스케줄링
        """
        logger.info("Starting daily completeness check")

        try:
            # 최근 7일 이내 활동한 공급사 조회
            active_suppliers = await self._get_recently_active_suppliers(days=7)

            for supplier_id in active_suppliers:
                try:
                    # 데이터 품질 분석
                    report = await self.data_quality_service.analyze_supplier_data(supplier_id)

                    # 완성도가 80% 미만인 경우 팔로업 스케줄링
                    if report.completeness_score < 80:
                        await self.followup_service.check_and_schedule_followups(supplier_id)

                        # 포털 알림도 생성
                        from services.data_quality_service import PortalNotificationService
                        notification_service = PortalNotificationService(self.db)
                        await notification_service.create_data_completion_notification(
                            supplier_id, report
                        )

                        logger.info(
                            f"Scheduled followup for supplier {supplier_id} "
                            f"(completeness: {report.completeness_score}%)"
                        )

                except Exception as e:
                    logger.error(f"Error processing supplier {supplier_id}: {e}")

            logger.info(f"Completed daily completeness check for {len(active_suppliers)} suppliers")

        except Exception as e:
            logger.error(f"Error in daily completeness check: {e}")

    async def send_pending_followups(self):
        """스케줄된 팔로업 이메일 발송"""
        logger.info("Sending pending followup emails")

        try:
            sent_count = await self.followup_service.send_scheduled_followups()
            logger.info(f"Sent {sent_count} followup emails")

        except Exception as e:
            logger.error(f"Error sending followups: {e}")

    async def followup_no_response(self):
        """
        이메일 회신이 없는 공급사에게 팔로업
        - 카탈로그 요청 후 5일 이상 응답 없는 경우
        """
        logger.info("Processing no-response followups")

        try:
            # 5일 이상 응답 없는 이메일 요청 조회
            pending_requests = await self._get_no_response_requests(days=5)

            for request in pending_requests:
                # 최대 팔로업 횟수 체크
                if request.get("followup_count", 0) >= 3:
                    continue

                try:
                    await self.email_service.send_followup_email(
                        to_email=request["to_email"],
                        supplier_name=request["supplier_name"],
                        subject="[WeDealize] Following up on our catalog request",
                        body=self._generate_no_response_followup(request)
                    )

                    # 팔로업 횟수 업데이트
                    await self._increment_followup_count(request["id"])

                    logger.info(f"Sent no-response followup to {request['to_email']}")

                except Exception as e:
                    logger.error(f"Error sending no-response followup: {e}")

        except Exception as e:
            logger.error(f"Error in no-response followup: {e}")

    async def send_weekly_report(self):
        """
        주간 데이터 품질 리포트 발송
        - 관리자 및 공급사에게 요약 리포트 전송
        """
        logger.info("Generating weekly data quality report")

        try:
            # 통계 수집
            stats = await self._collect_weekly_stats()

            # 관리자 리포트 발송
            admin_report = self._generate_admin_report(stats)
            # TODO: 관리자 이메일로 발송

            logger.info("Weekly report generated and sent")

        except Exception as e:
            logger.error(f"Error generating weekly report: {e}")

    def _generate_no_response_followup(self, request: dict) -> str:
        """응답 없는 공급사용 팔로업 메시지"""
        supplier_name = request.get("supplier_name", "Sir/Madam")

        return f"""Dear {supplier_name},

We hope this email finds you well.

We recently reached out requesting your product catalog and price information for potential partnership opportunities. We haven't heard back from you yet and wanted to follow up.

At WeDealize, we connect global food & beverage suppliers with qualified distributors worldwide. Sharing your catalog with us can help expand your market reach significantly.

If you have any questions or need any clarification, please don't hesitate to reach out.

Looking forward to hearing from you.

Best regards,
WeDealize Sourcing Team
sourcing@wedealize.com
"""

    def _generate_admin_report(self, stats: dict) -> str:
        """관리자용 주간 리포트"""
        return f"""
WeDealize Weekly Data Quality Report
=====================================
Period: {stats.get('period', 'N/A')}

Summary:
- Total Active Suppliers: {stats.get('active_suppliers', 0)}
- Average Completeness Score: {stats.get('avg_completeness', 0):.1f}%
- New Catalogs Received: {stats.get('new_catalogs', 0)}
- Products Extracted: {stats.get('products_extracted', 0)}

Email Performance:
- Catalog Requests Sent: {stats.get('emails_sent', 0)}
- Responses Received: {stats.get('responses_received', 0)}
- Response Rate: {stats.get('response_rate', 0):.1f}%

Data Quality Issues:
- Suppliers below 50% completeness: {stats.get('low_completeness_count', 0)}
- Most common missing field: {stats.get('most_missing_field', 'N/A')}

Actions This Week:
- Followup emails sent: {stats.get('followups_sent', 0)}
- Products updated by suppliers: {stats.get('products_updated', 0)}
"""

    async def _get_recently_active_suppliers(self, days: int) -> List[int]:
        """최근 활동한 공급사 ID 목록 조회"""
        # TODO: 실제 DB 쿼리 구현
        return []

    async def _get_no_response_requests(self, days: int) -> List[dict]:
        """응답 없는 이메일 요청 조회"""
        # TODO: 실제 DB 쿼리 구현
        return []

    async def _increment_followup_count(self, request_id: int):
        """팔로업 횟수 증가"""
        # TODO: 실제 DB 업데이트 구현
        pass

    async def _collect_weekly_stats(self) -> dict:
        """주간 통계 수집"""
        # TODO: 실제 통계 쿼리 구현
        return {
            "period": "2024-01-15 ~ 2024-01-21",
            "active_suppliers": 0,
            "avg_completeness": 0,
            "new_catalogs": 0,
            "products_extracted": 0,
            "emails_sent": 0,
            "responses_received": 0,
            "response_rate": 0,
            "low_completeness_count": 0,
            "most_missing_field": "MOQ",
            "followups_sent": 0,
            "products_updated": 0
        }


# 스케줄러 인스턴스 생성 및 실행
def create_scheduler(db_session, email_service, data_quality_service, followup_service):
    """스케줄러 인스턴스 생성"""
    scheduler = FollowupScheduler(
        db_session=db_session,
        email_service=email_service,
        data_quality_service=data_quality_service,
        followup_service=followup_service
    )
    return scheduler


if __name__ == "__main__":
    # 테스트용 직접 실행
    import asyncio

    async def main():
        # TODO: 실제 서비스 인스턴스 생성
        scheduler = FollowupScheduler(None, None, None, None)
        scheduler.start()

        # 무한 대기
        try:
            while True:
                await asyncio.sleep(3600)
        except KeyboardInterrupt:
            scheduler.stop()

    asyncio.run(main())
