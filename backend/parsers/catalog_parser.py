"""
WeDealize Catalog & Price List Parser
PDF, Excel 등 다양한 형식의 카탈로그/가격표에서 상품 정보 추출
"""

import json
import re
from typing import List, Dict, Any, Optional, Tuple
from dataclasses import dataclass
from abc import ABC, abstractmethod
from pathlib import Path
from enum import Enum


class FileType(Enum):
    PDF = "pdf"
    EXCEL = "excel"
    CSV = "csv"
    IMAGE = "image"  # 스캔된 카탈로그


@dataclass
class ExtractedProduct:
    """파싱된 상품 정보"""
    name: str
    sku: Optional[str] = None
    description: Optional[str] = None
    specifications: Dict[str, str] = None
    unit_price_min: Optional[float] = None
    unit_price_max: Optional[float] = None
    currency: str = "USD"
    price_unit: Optional[str] = None  # "per piece", "per kg"
    moq: Optional[int] = None
    moq_unit: Optional[str] = None
    certifications: List[str] = None
    images: List[str] = None
    raw_text: Optional[str] = None  # 원본 텍스트

    def __post_init__(self):
        self.specifications = self.specifications or {}
        self.certifications = self.certifications or []
        self.images = self.images or []


class CatalogParser:
    """
    AI 기반 카탈로그/가격표 파서

    지원 형식:
    - PDF (텍스트 기반, 이미지 기반)
    - Excel/CSV
    - 이미지 (OCR)
    """

    def __init__(self, llm_client=None):
        self.llm_client = llm_client
        self.parsers = {
            FileType.PDF: PDFParser(),
            FileType.EXCEL: ExcelParser(),
            FileType.CSV: CSVParser(),
            FileType.IMAGE: ImageOCRParser(),
        }

    def detect_file_type(self, file_path: str) -> FileType:
        """파일 타입 감지"""
        ext = Path(file_path).suffix.lower()
        mapping = {
            ".pdf": FileType.PDF,
            ".xlsx": FileType.EXCEL,
            ".xls": FileType.EXCEL,
            ".csv": FileType.CSV,
            ".png": FileType.IMAGE,
            ".jpg": FileType.IMAGE,
            ".jpeg": FileType.IMAGE,
        }
        return mapping.get(ext, FileType.PDF)

    async def parse(self, file_path: str) -> List[ExtractedProduct]:
        """
        카탈로그 파일 파싱 메인 함수

        1. 파일 타입 감지
        2. 원본 텍스트/데이터 추출
        3. AI로 구조화된 상품 정보 추출
        """
        file_type = self.detect_file_type(file_path)
        parser = self.parsers.get(file_type)

        if not parser:
            raise ValueError(f"Unsupported file type: {file_type}")

        # 원본 데이터 추출
        raw_data = await parser.extract_raw_data(file_path)

        # AI로 상품 정보 구조화
        products = await self._ai_extract_products(raw_data, file_type)

        return products

    async def _ai_extract_products(
        self,
        raw_data: Dict[str, Any],
        file_type: FileType
    ) -> List[ExtractedProduct]:
        """
        AI를 사용하여 원본 데이터에서 상품 정보 추출
        """

        # 텍스트 데이터인 경우
        if "text" in raw_data:
            return await self._extract_from_text(raw_data["text"])

        # 테이블 데이터인 경우 (Excel/CSV)
        if "tables" in raw_data:
            return await self._extract_from_tables(raw_data["tables"])

        return []

    async def _extract_from_text(self, text: str) -> List[ExtractedProduct]:
        """
        텍스트에서 상품 정보 추출 (PDF, OCR 결과)
        """

        prompt = f"""
        다음 카탈로그/가격표 텍스트에서 상품 정보를 추출해주세요.

        텍스트:
        {text[:8000]}  # 토큰 제한

        각 상품에 대해 다음 정보를 JSON 배열로 추출:
        {{
            "name": "상품명",
            "sku": "SKU/품번 (있으면)",
            "description": "상품 설명",
            "specifications": {{"weight": "500ml", "packaging": "Glass Bottle"}},
            "unit_price_min": 숫자 또는 null,
            "unit_price_max": 숫자 또는 null,
            "currency": "USD" 또는 해당 통화,
            "price_unit": "per piece" 등,
            "moq": 숫자 또는 null,
            "moq_unit": "pieces" 등,
            "certifications": ["인증1", "인증2"]
        }}

        JSON 배열만 반환해주세요.
        """

        if self.llm_client:
            response = await self.llm_client.complete(prompt)
            products_data = json.loads(response)
        else:
            # 데모: 간단한 규칙 기반 추출
            products_data = self._demo_extract_from_text(text)

        return [
            ExtractedProduct(
                name=p.get("name", "Unknown"),
                sku=p.get("sku"),
                description=p.get("description"),
                specifications=p.get("specifications", {}),
                unit_price_min=p.get("unit_price_min"),
                unit_price_max=p.get("unit_price_max"),
                currency=p.get("currency", "USD"),
                price_unit=p.get("price_unit"),
                moq=p.get("moq"),
                moq_unit=p.get("moq_unit"),
                certifications=p.get("certifications", []),
                raw_text=text[:500]
            )
            for p in products_data
        ]

    async def _extract_from_tables(
        self,
        tables: List[List[List[str]]]
    ) -> List[ExtractedProduct]:
        """
        테이블 데이터에서 상품 정보 추출 (Excel/CSV)
        """

        products = []

        for table in tables:
            if len(table) < 2:
                continue

            # 첫 행을 헤더로 가정
            headers = [h.lower().strip() for h in table[0]]

            # 컬럼 매핑 추론
            column_map = self._infer_column_mapping(headers)

            # 데이터 행 처리
            for row in table[1:]:
                if len(row) < len(headers):
                    continue

                product = self._extract_product_from_row(row, column_map)
                if product.name:
                    products.append(product)

        return products

    def _infer_column_mapping(self, headers: List[str]) -> Dict[str, int]:
        """
        헤더에서 컬럼 매핑 추론
        """
        mapping = {}

        patterns = {
            "name": ["product", "name", "item", "description", "상품명", "품명"],
            "sku": ["sku", "code", "item no", "품번", "코드"],
            "price": ["price", "unit price", "fob", "가격", "단가"],
            "moq": ["moq", "min order", "minimum", "최소주문"],
            "spec": ["spec", "specification", "size", "규격", "스펙"],
        }

        for field, keywords in patterns.items():
            for i, header in enumerate(headers):
                if any(kw in header for kw in keywords):
                    mapping[field] = i
                    break

        return mapping

    def _extract_product_from_row(
        self,
        row: List[str],
        column_map: Dict[str, int]
    ) -> ExtractedProduct:
        """행에서 상품 정보 추출"""

        def get_cell(field: str) -> Optional[str]:
            idx = column_map.get(field)
            if idx is not None and idx < len(row):
                return row[idx].strip()
            return None

        # 가격 파싱
        price_str = get_cell("price")
        price_min, price_max = self._parse_price(price_str)

        # MOQ 파싱
        moq_str = get_cell("moq")
        moq = self._parse_moq(moq_str)

        return ExtractedProduct(
            name=get_cell("name") or "",
            sku=get_cell("sku"),
            specifications={"raw_spec": get_cell("spec")} if get_cell("spec") else {},
            unit_price_min=price_min,
            unit_price_max=price_max,
            moq=moq
        )

    def _parse_price(self, price_str: Optional[str]) -> Tuple[Optional[float], Optional[float]]:
        """가격 문자열 파싱"""
        if not price_str:
            return None, None

        # "$7.50 - $8.00" 형태
        range_match = re.search(r'[\$€£]?\s*([\d,.]+)\s*[-~]\s*[\$€£]?\s*([\d,.]+)', price_str)
        if range_match:
            return (
                float(range_match.group(1).replace(",", "")),
                float(range_match.group(2).replace(",", ""))
            )

        # 단일 가격 "$7.50"
        single_match = re.search(r'[\$€£]?\s*([\d,.]+)', price_str)
        if single_match:
            price = float(single_match.group(1).replace(",", ""))
            return price, price

        return None, None

    def _parse_moq(self, moq_str: Optional[str]) -> Optional[int]:
        """MOQ 문자열 파싱"""
        if not moq_str:
            return None

        match = re.search(r'(\d+)', moq_str.replace(",", ""))
        if match:
            return int(match.group(1))

        return None

    def _demo_extract_from_text(self, text: str) -> List[Dict]:
        """데모용 텍스트 추출"""
        # 간단한 패턴 매칭
        products = []

        # 가격 패턴 찾기
        lines = text.split('\n')
        for line in lines:
            if re.search(r'\$[\d.]+', line):
                products.append({
                    "name": line[:50].strip(),
                    "unit_price_min": 10.0,
                    "unit_price_max": 15.0,
                    "currency": "USD"
                })

        return products[:20]  # 최대 20개


class BaseParser(ABC):
    """파서 베이스 클래스"""

    @abstractmethod
    async def extract_raw_data(self, file_path: str) -> Dict[str, Any]:
        """원본 데이터 추출"""
        pass


class PDFParser(BaseParser):
    """PDF 파서"""

    async def extract_raw_data(self, file_path: str) -> Dict[str, Any]:
        """
        PDF에서 텍스트 및 테이블 추출

        라이브러리: PyPDF2, pdfplumber, pdf2image + OCR
        """
        try:
            # pdfplumber 사용 (설치: pip install pdfplumber)
            import pdfplumber

            text_content = []
            tables = []

            with pdfplumber.open(file_path) as pdf:
                for page in pdf.pages:
                    # 텍스트 추출
                    text = page.extract_text()
                    if text:
                        text_content.append(text)

                    # 테이블 추출
                    page_tables = page.extract_tables()
                    tables.extend(page_tables)

            return {
                "text": "\n".join(text_content),
                "tables": tables,
                "page_count": len(pdf.pages)
            }

        except ImportError:
            # pdfplumber 없으면 빈 결과
            return {"text": "", "tables": [], "error": "pdfplumber not installed"}

        except Exception as e:
            return {"text": "", "tables": [], "error": str(e)}


class ExcelParser(BaseParser):
    """Excel 파서"""

    async def extract_raw_data(self, file_path: str) -> Dict[str, Any]:
        """
        Excel에서 시트별 테이블 데이터 추출

        라이브러리: openpyxl, pandas
        """
        try:
            import pandas as pd

            tables = []

            # 모든 시트 읽기
            excel_file = pd.ExcelFile(file_path)

            for sheet_name in excel_file.sheet_names:
                df = pd.read_excel(excel_file, sheet_name=sheet_name)

                # DataFrame을 리스트로 변환
                table = [df.columns.tolist()] + df.values.tolist()
                tables.append(table)

            return {
                "tables": tables,
                "sheet_names": excel_file.sheet_names
            }

        except ImportError:
            return {"tables": [], "error": "pandas not installed"}

        except Exception as e:
            return {"tables": [], "error": str(e)}


class CSVParser(BaseParser):
    """CSV 파서"""

    async def extract_raw_data(self, file_path: str) -> Dict[str, Any]:
        """CSV 파일 파싱"""
        import csv

        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                reader = csv.reader(f)
                table = list(reader)

            return {"tables": [table]}

        except Exception as e:
            return {"tables": [], "error": str(e)}


class ImageOCRParser(BaseParser):
    """이미지 OCR 파서"""

    async def extract_raw_data(self, file_path: str) -> Dict[str, Any]:
        """
        이미지에서 OCR로 텍스트 추출

        라이브러리: pytesseract, Google Cloud Vision, AWS Textract
        """
        try:
            import pytesseract
            from PIL import Image

            image = Image.open(file_path)
            text = pytesseract.image_to_string(image, lang='eng+kor')

            return {"text": text}

        except ImportError:
            return {"text": "", "error": "pytesseract not installed"}

        except Exception as e:
            return {"text": "", "error": str(e)}


# 사용 예시
async def main():
    parser = CatalogParser()

    # Excel 가격표 파싱
    # products = await parser.parse("pricelist.xlsx")

    # PDF 카탈로그 파싱
    # products = await parser.parse("catalog.pdf")

    print("Catalog Parser initialized")


if __name__ == "__main__":
    import asyncio
    asyncio.run(main())
