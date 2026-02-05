"""
WeDealize Email Extractor
공급사 웹사이트에서 대표 이메일 주소 추출
"""

import re
import asyncio
from typing import List, Dict, Optional, Set
from dataclasses import dataclass
from urllib.parse import urljoin, urlparse
import logging

logger = logging.getLogger(__name__)


@dataclass
class ExtractedContact:
    """추출된 연락처 정보"""
    emails: List[str]
    phones: List[str]
    contact_page_url: Optional[str] = None
    contact_form_url: Optional[str] = None
    social_links: Dict[str, str] = None  # {"linkedin": "url", "facebook": "url"}
    address: Optional[str] = None
    confidence_score: float = 0.0  # 정확도 점수

    def __post_init__(self):
        self.social_links = self.social_links or {}

    @property
    def primary_email(self) -> Optional[str]:
        """가장 유력한 대표 이메일 반환"""
        if not self.emails:
            return None

        # 우선순위: sales > info > export > contact > 기타
        priority_prefixes = ['sales', 'export', 'info', 'contact', 'inquiry', 'business']

        for prefix in priority_prefixes:
            for email in self.emails:
                if email.lower().startswith(prefix):
                    return email

        return self.emails[0]


class EmailExtractor:
    """
    웹사이트에서 이메일 주소 추출

    전략:
    1. 메인 페이지 스캔
    2. Contact/About 페이지 찾아서 스캔
    3. Footer 영역 집중 스캔
    4. mailto: 링크 추출
    """

    # 이메일 정규식
    EMAIL_PATTERN = re.compile(
        r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}',
        re.IGNORECASE
    )

    # 전화번호 정규식 (국제 형식)
    PHONE_PATTERN = re.compile(
        r'[\+]?[(]?[0-9]{1,3}[)]?[-\s\.]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,4}[-\s\.]?[0-9]{1,9}'
    )

    # Contact 페이지 URL 패턴
    CONTACT_URL_PATTERNS = [
        r'/contact',
        r'/contact-us',
        r'/contactus',
        r'/about',
        r'/about-us',
        r'/aboutus',
        r'/inquiry',
        r'/enquiry',
        r'/get-in-touch',
        r'/reach-us',
    ]

    # 제외할 이메일 도메인 (일반적인 이메일 서비스)
    EXCLUDED_DOMAINS = {
        'example.com', 'test.com', 'email.com',
        'sentry.io', 'google.com', 'facebook.com',
        'twitter.com', 'instagram.com', 'linkedin.com',
        'wixpress.com', 'squarespace.com',
    }

    def __init__(self, browser_client=None):
        """
        Args:
            browser_client: Playwright 또는 Selenium 브라우저 클라이언트
        """
        self.browser_client = browser_client

    async def extract_from_website(self, url: str) -> ExtractedContact:
        """
        웹사이트에서 연락처 정보 추출

        Args:
            url: 공급사 웹사이트 URL
        """
        all_emails: Set[str] = set()
        all_phones: Set[str] = set()
        contact_page_url = None

        try:
            # 1. 메인 페이지 스캔
            main_page_html = await self._fetch_page(url)
            if main_page_html:
                emails, phones = self._extract_from_html(main_page_html)
                all_emails.update(emails)
                all_phones.update(phones)

                # Contact 페이지 링크 찾기
                contact_page_url = self._find_contact_page_url(main_page_html, url)

            # 2. Contact 페이지 스캔
            if contact_page_url:
                contact_html = await self._fetch_page(contact_page_url)
                if contact_html:
                    emails, phones = self._extract_from_html(contact_html)
                    all_emails.update(emails)
                    all_phones.update(phones)

            # 3. 이메일 필터링 및 정리
            filtered_emails = self._filter_emails(list(all_emails), url)

            # 4. 신뢰도 점수 계산
            confidence = self._calculate_confidence(filtered_emails, contact_page_url)

            return ExtractedContact(
                emails=filtered_emails,
                phones=list(all_phones)[:5],  # 상위 5개만
                contact_page_url=contact_page_url,
                confidence_score=confidence
            )

        except Exception as e:
            logger.error(f"이메일 추출 실패 ({url}): {e}")
            return ExtractedContact(emails=[], phones=[], confidence_score=0.0)

    async def _fetch_page(self, url: str) -> Optional[str]:
        """페이지 HTML 가져오기"""
        if self.browser_client:
            # Playwright 사용
            return await self._fetch_with_browser(url)
        else:
            # 간단한 HTTP 요청
            return await self._fetch_with_httpx(url)

    async def _fetch_with_httpx(self, url: str) -> Optional[str]:
        """httpx로 페이지 가져오기"""
        try:
            import httpx

            async with httpx.AsyncClient(
                timeout=30.0,
                follow_redirects=True,
                headers={
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
                }
            ) as client:
                response = await client.get(url)
                if response.status_code == 200:
                    return response.text
        except Exception as e:
            logger.warning(f"HTTP 요청 실패 ({url}): {e}")
        return None

    async def _fetch_with_browser(self, url: str) -> Optional[str]:
        """Playwright로 페이지 가져오기 (JS 렌더링 지원)"""
        try:
            page = await self.browser_client.new_page()
            await page.goto(url, wait_until="networkidle", timeout=30000)
            html = await page.content()
            await page.close()
            return html
        except Exception as e:
            logger.warning(f"브라우저 요청 실패 ({url}): {e}")
        return None

    def _extract_from_html(self, html: str) -> tuple[List[str], List[str]]:
        """HTML에서 이메일과 전화번호 추출"""
        # 이메일 추출
        emails = self.EMAIL_PATTERN.findall(html)

        # mailto: 링크에서 추가 추출
        mailto_pattern = re.compile(r'mailto:([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})')
        mailto_emails = mailto_pattern.findall(html)
        emails.extend(mailto_emails)

        # 중복 제거
        emails = list(set(emails))

        # 전화번호 추출
        phones = self.PHONE_PATTERN.findall(html)
        # 너무 짧은 것 제외
        phones = [p for p in phones if len(re.sub(r'\D', '', p)) >= 8]

        return emails, phones

    def _find_contact_page_url(self, html: str, base_url: str) -> Optional[str]:
        """Contact 페이지 URL 찾기"""
        from bs4 import BeautifulSoup

        try:
            soup = BeautifulSoup(html, 'html.parser')

            # 모든 링크 검사
            for link in soup.find_all('a', href=True):
                href = link.get('href', '').lower()
                text = link.get_text().lower()

                # URL 패턴 매칭
                for pattern in self.CONTACT_URL_PATTERNS:
                    if re.search(pattern, href):
                        return urljoin(base_url, link['href'])

                # 링크 텍스트 매칭
                if any(word in text for word in ['contact', 'about', 'inquiry', '연락', '문의']):
                    return urljoin(base_url, link['href'])

        except Exception as e:
            logger.warning(f"Contact 페이지 찾기 실패: {e}")

        return None

    def _filter_emails(self, emails: List[str], source_url: str) -> List[str]:
        """이메일 필터링 및 우선순위 정렬"""
        filtered = []
        source_domain = urlparse(source_url).netloc.replace('www.', '')

        for email in emails:
            email_lower = email.lower()
            email_domain = email_lower.split('@')[1] if '@' in email_lower else ''

            # 제외 도메인 체크
            if email_domain in self.EXCLUDED_DOMAINS:
                continue

            # 이미지 파일 확장자 제외 (가끔 잘못 매칭됨)
            if any(ext in email_lower for ext in ['.png', '.jpg', '.gif', '.svg']):
                continue

            # 너무 긴 이메일 제외
            if len(email) > 100:
                continue

            filtered.append(email)

        # 우선순위 정렬
        def priority(email: str) -> int:
            email_lower = email.lower()
            # 같은 도메인 우선
            if source_domain in email_lower:
                score = 0
            else:
                score = 100

            # sales, export, info 등 우선
            priority_prefixes = ['sales', 'export', 'info', 'contact', 'inquiry']
            for i, prefix in enumerate(priority_prefixes):
                if email_lower.startswith(prefix):
                    score += i
                    break
            else:
                score += 50

            return score

        filtered.sort(key=priority)
        return filtered[:10]  # 상위 10개만

    def _calculate_confidence(
        self,
        emails: List[str],
        contact_page_url: Optional[str]
    ) -> float:
        """추출 결과의 신뢰도 점수 계산"""
        score = 0.0

        if emails:
            score += 0.5  # 이메일 발견
            if len(emails) >= 2:
                score += 0.1  # 여러 이메일

        if contact_page_url:
            score += 0.2  # Contact 페이지 발견

        # sales@ 또는 export@ 이메일이 있으면 가산
        if any(e.lower().startswith(('sales', 'export')) for e in emails):
            score += 0.2

        return min(score, 1.0)


# 테스트
async def main():
    extractor = EmailExtractor()

    # 테스트 URL (실제 공급사 사이트로 교체)
    test_url = "https://example.com"

    result = await extractor.extract_from_website(test_url)
    print(f"추출된 이메일: {result.emails}")
    print(f"대표 이메일: {result.primary_email}")
    print(f"신뢰도: {result.confidence_score:.2f}")


if __name__ == "__main__":
    asyncio.run(main())
