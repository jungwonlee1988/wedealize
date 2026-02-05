"""
WeDealize Backend Configuration
"""

import os
from typing import List, Optional
from dataclasses import dataclass, field


@dataclass
class DatabaseConfig:
    """데이터베이스 설정"""
    url: str = "sqlite:///wedealize.db"
    pool_size: int = 5
    max_overflow: int = 10
    echo: bool = False  # SQL 로깅


@dataclass
class LLMConfig:
    """LLM API 설정"""
    provider: str = "openai"  # "openai", "anthropic", "local"
    api_key: Optional[str] = None
    model: str = "gpt-4"
    temperature: float = 0.3
    max_tokens: int = 4000


@dataclass
class CrawlerConfig:
    """크롤러 설정"""
    # 요청 설정
    request_delay_seconds: float = 2.0  # 요청 간 딜레이
    timeout_seconds: int = 30
    max_retries: int = 3

    # User-Agent
    user_agent: str = "WeDealize-Bot/1.0 (Supplier Discovery)"

    # 프록시 (선택)
    proxy_url: Optional[str] = None

    # 병렬 처리
    max_concurrent_requests: int = 5

    # 저장 경로
    download_path: str = "./downloads"
    catalog_path: str = "./downloads/catalogs"


@dataclass
class DataSourceConfig:
    """데이터 소스별 설정"""
    # Alibaba
    alibaba_enabled: bool = True
    alibaba_api_key: Optional[str] = None

    # Global Sources
    globalsources_enabled: bool = True

    # Trade Korea
    tradekorea_enabled: bool = False

    # Web Search
    websearch_enabled: bool = True
    google_api_key: Optional[str] = None
    google_cx: Optional[str] = None  # Custom Search Engine ID


@dataclass
class EmailConfig:
    """이메일 발송 설정"""
    smtp_host: str = "smtp.gmail.com"
    smtp_port: int = 587
    email: Optional[str] = None
    password: Optional[str] = None  # Gmail 앱 비밀번호
    sender_name: str = "WeDealize"


@dataclass
class SchedulerConfig:
    """스케줄러 설정"""
    # 일일 탐색
    daily_discovery_enabled: bool = True
    daily_discovery_hour: int = 2  # 새벽 2시

    # 가격 업데이트
    price_update_enabled: bool = True
    price_update_day: int = 0  # 월요일 (0=월, 6=일)

    # 기본 검색 쿼리
    default_queries: List[str] = field(default_factory=lambda: [
        "organic food supplier Europe wholesale",
        "premium tea manufacturer Asia B2B",
        "olive oil producer Italy export",
        "honey supplier New Zealand bulk",
        "cheese manufacturer France wholesale",
        "organic snacks USA B2B",
        "matcha powder Japan wholesale",
        "spices supplier India export",
    ])


@dataclass
class Settings:
    """전체 설정"""
    # 환경
    env: str = "development"  # "development", "staging", "production"
    debug: bool = True

    # 컴포넌트 설정
    database: DatabaseConfig = field(default_factory=DatabaseConfig)
    llm: LLMConfig = field(default_factory=LLMConfig)
    crawler: CrawlerConfig = field(default_factory=CrawlerConfig)
    data_sources: DataSourceConfig = field(default_factory=DataSourceConfig)
    scheduler: SchedulerConfig = field(default_factory=SchedulerConfig)
    email: EmailConfig = field(default_factory=EmailConfig)

    @classmethod
    def from_env(cls) -> "Settings":
        """환경 변수에서 설정 로드"""
        settings = cls()

        # 환경
        settings.env = os.getenv("WEDEALIZE_ENV", "development")
        settings.debug = os.getenv("WEDEALIZE_DEBUG", "true").lower() == "true"

        # 데이터베이스
        if db_url := os.getenv("DATABASE_URL"):
            settings.database.url = db_url

        # LLM
        settings.llm.provider = os.getenv("LLM_PROVIDER", "openai")
        settings.llm.api_key = os.getenv("OPENAI_API_KEY") or os.getenv("ANTHROPIC_API_KEY")
        settings.llm.model = os.getenv("LLM_MODEL", "gpt-4")

        # Alibaba
        settings.data_sources.alibaba_api_key = os.getenv("ALIBABA_API_KEY")

        # Google Search
        settings.data_sources.google_api_key = os.getenv("GOOGLE_API_KEY")
        settings.data_sources.google_cx = os.getenv("GOOGLE_CX")

        # Email
        settings.email.email = os.getenv("SMTP_EMAIL") or os.getenv("GMAIL_EMAIL")
        settings.email.password = os.getenv("SMTP_PASSWORD") or os.getenv("GMAIL_APP_PASSWORD")
        if smtp_host := os.getenv("SMTP_HOST"):
            settings.email.smtp_host = smtp_host
        if smtp_port := os.getenv("SMTP_PORT"):
            settings.email.smtp_port = int(smtp_port)

        return settings


# 전역 설정 인스턴스
settings = Settings.from_env()


# 환경별 설정 프리셋
def get_development_settings() -> Settings:
    """개발 환경 설정"""
    return Settings(
        env="development",
        debug=True,
        database=DatabaseConfig(
            url="sqlite:///wedealize_dev.db",
            echo=True
        ),
        crawler=CrawlerConfig(
            request_delay_seconds=1.0,
            max_concurrent_requests=2
        )
    )


def get_production_settings() -> Settings:
    """프로덕션 환경 설정"""
    return Settings(
        env="production",
        debug=False,
        database=DatabaseConfig(
            url=os.getenv("DATABASE_URL", "postgresql://localhost/wedealize"),
            pool_size=10,
            max_overflow=20,
            echo=False
        ),
        crawler=CrawlerConfig(
            request_delay_seconds=3.0,
            max_concurrent_requests=10
        )
    )
