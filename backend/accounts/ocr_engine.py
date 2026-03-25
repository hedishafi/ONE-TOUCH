"""
accounts/ocr_engine.py

Abstract OCR engine layer with pluggable implementations.
Supports Amharic and English text extraction.
Includes document validation (expiry, nationality, critical fields).
"""

import os
from abc import ABC, abstractmethod
from typing import Any, Dict
from pathlib import Path
from datetime import datetime, date

import logging
logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────────────────────
# Abstract Base
# ─────────────────────────────────────────────────────────────────────────────

class OCREngine(ABC):
    """Abstract base for OCR engines."""

    @abstractmethod
    def extract_text(self, image_path: str, language: str = 'auto') -> Dict[str, Any]:
        """
        Extract text and structured data from an identity document image.

        Args:
            image_path: Path to the image file (local or uploaded file path)
            language: 'am' (Amharic), 'en' (English), or 'auto' (auto-detect)

        Returns:
            {
                'extracted_fields': {
                    'name': str,
                    'document_number': str or None,
                    'dob': '1990-01-01' or None,
                    'expiry_date': '2030-12-31' or None,
                    'nationality': str or None,
                    'phone': str or None,  # NEW: phone number extraction
                },
                'raw_text': str,  # full extracted text
                'confidence': float (0.0 - 1.0),
                'language': 'am' or 'en',
                'image_quality': float (0.0 - 1.0),  # NEW: blurriness + lighting quality
                'quality_warnings': [str],  # NEW: ["blurry", "poor_lighting", "partial_text"]
                'warnings': [str],  # e.g., ["Low confidence", "Skewed document"]
            }
        """
        pass

    @staticmethod
    def _detect_image_quality(image_path: str) -> tuple[float, list]:
        """
        Analyze image quality: detects blurriness and lighting issues.
        
        Args:
            image_path: Path to image file
            
        Returns:
            (quality_score: 0-1, warnings: list of issues)
        """
        try:
            from PIL import Image, ImageFilter, ImageStat
            import cv2
            import numpy as np
            
            img = cv2.imread(image_path, cv2.IMREAD_GRAYSCALE)
            if img is None:
                return 0.0, ["Cannot read image file"]
            
            warnings = []
            scores = []
            
            # 1. Blurriness Detection (Laplacian variance)
            laplacian = cv2.Laplacian(img, cv2.CV_64F)
            blur_variance = laplacian.var()
            blur_score = min(blur_variance / 500, 1.0)  # Normalize to 0-1
            if blur_score < 0.5:
                warnings.append("blurry")
            scores.append(blur_score)
            
            # 2. Brightness/Contrast Detection
            brightness = np.mean(img)
            contrast = np.std(img)
            
            if brightness < 50 or brightness > 200:
                warnings.append("poor_lighting")
            
            lighting_score = 1.0 if 50 <= brightness <= 200 else 0.6
            scores.append(lighting_score)
            
            # 3. Text Detection (check if image has visible text)
            edges = cv2.Canny(img, 100, 200)
            text_pixels = np.count_nonzero(edges)
            text_score = min(text_pixels / 10000, 1.0)
            
            if text_score < 0.3:
                warnings.append("partial_text")
            scores.append(text_score)
            
            # Overall quality score
            quality_score = np.mean(scores)
            
            return quality_score, warnings
            
        except Exception as e:
            logger.warning(f"Image quality check failed: {e}")
            return 0.5, ["quality_check_failed"]

    @staticmethod
    def validate_document(extracted_fields: Dict[str, Any], strict: bool = True) -> Dict[str, Any]:
        """
        Validate extracted document data against standardized fields.
        
        Args:
            extracted_fields: Dictionary of extracted standardized fields
            strict: If True, enforce all validations; if False, only warn
            
        Returns:
            {
                'is_valid': bool,
                'is_expired': bool,
                'is_non_ethiopian': bool,
                'warnings': [str],
                'errors': [str],  # only if strict=True
                'flagged': bool,   # True if any validation fails
            }
        """
        validation = {
            'is_valid': True,
            'is_expired': False,
            'is_non_ethiopian': False,
            'warnings': [],
            'errors': [],
            'flagged': False,
        }
        
        # 1. Check critical fields (full_name and id_number must be present)
        required_fields = ['full_name', 'id_number']
        missing_fields = [f for f in required_fields if not extracted_fields.get(f)]
        if missing_fields:
            msg = f'Missing critical fields: {", ".join(missing_fields)}'
            validation['errors'].append(msg)
            validation['flagged'] = True
            if strict:
                validation['is_valid'] = False
        
        # 2. Check expiry date
        expiry_str = extracted_fields.get('expiry_date')
        if expiry_str:
            try:
                # Try multiple date formats
                expiry_date = None
                for fmt in ['%d/%m/%Y', '%Y-%m-%d', '%d-%m-%Y', '%m/%d/%Y']:
                    try:
                        expiry_date = datetime.strptime(expiry_str.strip(), fmt).date()
                        break
                    except ValueError:
                        continue
                
                if expiry_date and expiry_date < date.today():
                    validation['is_expired'] = True
                    msg = f'Document expired on {expiry_str}'
                    validation['errors'].append(msg)
                    validation['flagged'] = True
                    if strict:
                        validation['is_valid'] = False
                elif expiry_date and (expiry_date - date.today()).days < 90:
                    msg = f'Document expiring soon ({expiry_str})'
                    validation['warnings'].append(msg)
                    
            except Exception as e:
                logger.warning(f"Could not parse expiry date {expiry_str}: {e}")
                validation['warnings'].append(f'Could not validate expiry date: {expiry_str}')
        else:
            validation['warnings'].append('No expiry date found on document')
        
        # 3. Check nationality
        nationality = extracted_fields.get('nationality', '').strip().lower()
        if nationality:
            # Acceptable variations of Ethiopian
            ethiopian_keywords = ['ethiopia', 'ethiopian', 'eth', 'etiopia', 'etiope']
            is_ethiopian = any(kw in nationality for kw in ethiopian_keywords)
            
            if not is_ethiopian:
                validation['is_non_ethiopian'] = True
                msg = f'Non-Ethiopian document detected: {nationality}'
                validation['errors'].append(msg)
                validation['flagged'] = True
                if strict:
                    validation['is_valid'] = False
        else:
            validation['warnings'].append('Nationality not detected on document')
        
        # 4. Check phone number format
        phone = extracted_fields.get('phone')
        if phone:
            # Should match Ethiopian phone format
            import re
            if not re.match(r'^\+251\d{9}$', phone):
                msg = f'Invalid phone format: {phone} (expected +251XXXXXXXXX)'
                validation['warnings'].append(msg)
        
        # 5. Check name quality
        name = extracted_fields.get('name', '').strip()
        if name:
            if len(name) < 5:
                msg = f'Name seems too short: "{name}"'
                validation['warnings'].append(msg)
            if not all(c.isalpha() or c.isspace() for c in name):
                msg = f'Name contains non-alphabetic characters: {name}'
                validation['warnings'].append(msg)
        
        return validation


# ─────────────────────────────────────────────────────────────────────────────
# Tesseract Implementation (free, supports Amharic + English)
# ─────────────────────────────────────────────────────────────────────────────

class TesseractOCR(OCREngine):
    """
    Tesseract OCR implementation.
    Supports Amharic ('amh') and English ('eng').
    """

    def extract_text(self, image_path: str, language: str = 'auto') -> Dict[str, Any]:
        try:
            import pytesseract
            from PIL import Image
        except ImportError:
            raise ImportError("Install pytesseract and Pillow: pip install pytesseract pillow")

        lang_map = {'am': 'amh', 'en': 'eng', 'auto': 'amh+eng'}
        lang_param = lang_map.get(language, 'amh+eng')

        try:
            # Check image quality FIRST
            img_quality, quality_warnings = self._detect_image_quality(image_path)
            
            # Load and preprocess image
            img = Image.open(image_path)
            img = self._preprocess_image(img)

            # Extract text with confidence
            raw_text = pytesseract.image_to_string(img, lang=lang_param)
            data = pytesseract.image_to_data(img, lang=lang_param, output_type='dict')

            # Calculate average confidence (Tesseract provides per-word scores)
            confidences = [int(conf) for conf in data['conf'] if conf != '-1']
            avg_confidence = (sum(confidences) / len(confidences) / 100.0) if confidences else 0.0

            # Extract structured fields
            extracted_fields = self._parse_fields(raw_text)

            # Detect language
            detected_lang = self._detect_language(raw_text)

            # Validate document (expiry, nationality, critical fields)
            validation = self.validate_document(extracted_fields, strict=True)

            return {
                'extracted_fields': extracted_fields,
                'raw_text': raw_text.strip(),
                'confidence': min(avg_confidence, 1.0),
                'language': detected_lang,
                'image_quality': img_quality,
                'quality_warnings': quality_warnings,
                'warnings': self._generate_warnings(avg_confidence, raw_text),
                'validation': validation,  # NEW: document validity checks
            }

        except Exception as exc:
            logger.exception('Tesseract OCR error: %s', exc)
            return {
                'extracted_fields': {},
                'raw_text': '',
                'confidence': 0.0,
                'language': 'auto',
                'image_quality': 0.0,
                'quality_warnings': ['ocr_error'],
                'warnings': [f'OCR error: {str(exc)}'],
                'validation': {
                    'is_valid': False,
                    'is_expired': False,
                    'is_non_ethiopian': False,
                    'warnings': [],
                    'errors': [f'OCR error: {str(exc)}'],
                    'flagged': True,
                },
            }

    def _preprocess_image(self, img):
        """Apply image enhancement: contrast, denoise, etc."""
        from PIL import ImageEnhance, ImageFilter
        
        # Increase contrast
        enhancer = ImageEnhance.Contrast(img)
        img = enhancer.enhance(1.5)
        
        # Reduce noise (slight blur + sharpen)
        img = img.filter(ImageFilter.MedianFilter(size=3))
        
        return img

    def _parse_fields(self, raw_text: str) -> Dict[str, any]:
        """
        Extract standardized fields from OCR text for all document types.
        
        Returns a unified structure that works for National ID, Driver's License, and Kebele ID:
        {
            'full_name': str or None,
            'id_number': str or None,
            'date_of_birth': str or None,         # DD/MM/YYYY format
            'gender': str or None,                # 'Male', 'Female', or None
            'nationality': str or None,           # 'Ethiopian', etc.
            'region_sub_city': str or None,       # e.g., 'Addis Ababa'
            'woreda': str or None,                # e.g., 'Bole'
            'issue_date': str or None,            # DD/MM/YYYY format
            'expiry_date': str or None,           # DD/MM/YYYY format
            'phone_number': str or None,          # e.g., '+251911234567'
        }
        
        Fields are set to None (not empty string) if not found.
        This standardizes output across national_id, drivers_license, kebele_id.
        """
        import re

        # Initialize all fields to None
        fields = {
            'full_name': None,
            'id_number': None,
            'date_of_birth': None,
            'gender': None,
            'nationality': None,
            'region_sub_city': None,
            'woreda': None,
            'issue_date': None,
            'expiry_date': None,
            'phone_number': None,
        }

        # ── Extract dates (DD/MM/YYYY or YYYY-MM-DD or DD-MM-YYYY format)
        # Capture up to 3 dates - typically DOB, Issue date, Expiry date
        date_pattern = r'(\d{1,2}[/-]\d{1,2}[/-]\d{4}|\d{4}[/-]\d{1,2}[/-]\d{1,2})'
        dates = re.findall(date_pattern, raw_text)
        
        if len(dates) >= 1:
            # Normalize to DD/MM/YYYY if it's YYYY-MM-DD
            fields['date_of_birth'] = self._normalize_date(dates[0])
        if len(dates) >= 2:
            fields['issue_date'] = self._normalize_date(dates[1])
        if len(dates) >= 3:
            fields['expiry_date'] = self._normalize_date(dates[2])

        # ── Extract ID number patterns (document-type specific)
        # Support multiple document formats:
        # National ID: ETH-NIDA-XXXXXXXX-AA
        # Driver's License: DL-XXXXXXXX or DL XXXXXXXX
        # Kebele ID: KID-XXXXXX
        id_patterns = [
            r'ETH-NIDA-[\d]{8}-[A-Z]{2}',           # National ID
            r'(?:DL|DLS?)[-\s]?[\w]{8,10}',         # Driver's License
            r'KID[-\s]?[\d]{6}',                    # Kebele ID
            r'[A-Z]{2,3}[-\s]?[\d]{6,10}',          # Generic pattern
        ]
        
        for pattern in id_patterns:
            matches = re.findall(pattern, raw_text, re.IGNORECASE)
            if matches:
                fields['id_number'] = matches[0].replace(' ', '-')
                break

        # ── Extract phone number (+251 format or 0251 or 09XX)
        phone_patterns = [
            r'\+251\d{9}',           # +251911234567
            r'(?:^|\W)251\d{9}',     # 251911234567
            r'0\d{9}',               # 0911234567
        ]
        for pattern in phone_patterns:
            phones = re.findall(pattern, raw_text)
            if phones:
                phone = phones[0].lstrip('+')
                # Normalize to +251 format
                if phone.startswith('251'):
                    fields['phone_number'] = '+' + phone
                elif phone.startswith('0'):
                    fields['phone_number'] = '+251' + phone[1:]
                else:
                    fields['phone_number'] = '+251' + phone
                break

        # ── Extract gender (Male, Female, M, F, ወ/ሴ in Amharic)
        gender_patterns = [
            (r'\b(?:Male|M|ወ)\b', 'Male'),
            (r'\b(?:Female|F|ሴ)\b', 'Female'),
        ]
        for pattern, gender in gender_patterns:
            if re.search(pattern, raw_text, re.IGNORECASE):
                fields['gender'] = gender
                break

        # ── Extract nationality (Ethiopian, Ethiopia, Ethiopian citizen, etc.)
        nationality_patterns = [
            r'(?:Ethiopian|Ethiopia|Ethiop)',
        ]
        for pattern in nationality_patterns:
            if re.search(pattern, raw_text, re.IGNORECASE):
                fields['nationality'] = 'Ethiopian'
                break

        # ── Extract location (Region/Sub-City and Woreda)
        # Common Ethiopian regions: Addis Ababa, Oromia, Amhara, SNNPR, etc.
        regions = [
            'Addis Ababa', 'Oromia', 'Amhara', 'SNNPR', 'Tigray', 'Somali', 
            'Afar', 'Benishangul-Gumuz', 'Gambela', 'Harari', 'Dire Dawa'
        ]
        for region in regions:
            if re.search(re.escape(region), raw_text, re.IGNORECASE):
                fields['region_sub_city'] = region
                break

        # For Woreda (district), look for common ones in Addis Ababa or other regions
        woredas = [
            'Bole', 'Kirkos', 'Lideta', 'Kolfe', 'Yeka', 'Arada', 'Nifas Silk-Lafto',
            'Gulele', 'Akaki Kality', 'Addis Ketema',
        ]
        for woreda in woredas:
            if re.search(re.escape(woreda), raw_text, re.IGNORECASE):
                fields['woreda'] = woreda
                break

        # ── Extract full name (longest sequence of letters + spaces in first few lines)
        lines = [l.strip() for l in raw_text.split('\n') if l.strip()]
        for line in lines[:5]:  # Check first 5 lines
            # Name should be 5+ characters, mostly letters (allow spaces, hyphens)
            if len(line) >= 5:
                # Count alphabetic characters
                alpha_count = sum(1 for c in line if c.isalpha())
                if alpha_count / max(len(line), 1) > 0.7:  # 70%+ alphabetic
                    fields['full_name'] = line
                    break

        # ── Ensure all None values are preserved (not converted to empty strings)
        return {k: (v.strip() if isinstance(v, str) else v) for k, v in fields.items()}

    @staticmethod
    def _normalize_date(date_str: str) -> str:
        """
        Normalize date to DD/MM/YYYY format.
        
        Handles inputs like:
        - DD/MM/YYYY → DD/MM/YYYY (no change)
        - YYYY-MM-DD → DD/MM/YYYY
        - DD-MM-YYYY → DD/MM/YYYY
        """
        import re
        
        date_str = date_str.strip()
        
        # Try YYYY-MM-DD or YYYY/MM/DD first
        match = re.match(r'(\d{4})[-/](\d{1,2})[-/](\d{1,2})', date_str)
        if match:
            year, month, day = match.groups()
            return f'{int(day):02d}/{int(month):02d}/{year}'
        
        # Try DD/MM/YYYY or DD-MM-YYYY (already normalized or needs slash conversion)
        match = re.match(r'(\d{1,2})[-/](\d{1,2})[-/](\d{4})', date_str)
        if match:
            day, month, year = match.groups()
            return f'{int(day):02d}/{int(month):02d}/{year}'
        
        # If can't parse, return as-is
        return date_str

    def _detect_language(self, text: str) -> str:
        """Simple language detection: check for Amharic script."""
        # Amharic Unicode range: U+1200 to U+137F
        amharic_count = sum(1 for c in text if 0x1200 <= ord(c) <= 0x137F)
        return 'am' if amharic_count > len(text) * 0.1 else 'en'

    def _generate_warnings(self, confidence: float, raw_text: str) -> list:
        """Generate warnings based on confidence and text quality."""
        warnings = []
        if confidence < 0.6:
            warnings.append('Low OCR confidence — document may be unclear.')
        if len(raw_text.strip()) < 20:
            warnings.append('Very little text detected — document may be incomplete.')
        return warnings


# ─────────────────────────────────────────────────────────────────────────────
# Google Vision Implementation (higher accuracy, paid)
# ─────────────────────────────────────────────────────────────────────────────

class GoogleVisionOCR(OCREngine):
    """
    Google Cloud Vision OCR implementation.
    Requires GOOGLE_APPLICATION_CREDENTIALS env var or key file.
    """

    def extract_text(self, image_path: str, language: str = 'auto') -> Dict[str, Any]:
        try:
            from google.cloud import vision
        except ImportError:
            raise ImportError("Install google-cloud-vision: pip install google-cloud-vision")

        try:
            client = vision.ImageAnnotatorClient()

            # Read image
            with open(image_path, 'rb') as f:
                image_content = f.read()

            image = vision.Image(content=image_content)

            # Call Google Vision API
            response = client.text_detection(image=image)

            if not response.text_annotations:
                return {
                    'extracted_fields': {
                        'full_name': None,
                        'id_number': None,
                        'date_of_birth': None,
                        'gender': None,
                        'nationality': None,
                        'region_sub_city': None,
                        'woreda': None,
                        'issue_date': None,
                        'expiry_date': None,
                        'phone_number': None,
                    },
                    'raw_text': '',
                    'confidence': 0.0,
                    'language': 'auto',
                    'warnings': ['No text detected by Google Vision.'],
                }

            # Full text
            raw_text = response.text_annotations[0].description

            # Extract fields using standardized method
            extracted_fields = self._parse_fields(raw_text)

            # Google provides per-text-block confidence
            avg_confidence = min(
                sum(a.confidence for a in response.text_annotations[1:]) /
                max(len(response.text_annotations) - 1, 1),
                1.0
            )

            detected_lang = self._detect_language(raw_text)

            # Validate document (expiry, nationality, critical fields)
            validation = self.validate_document(extracted_fields, strict=True)

            return {
                'extracted_fields': extracted_fields,
                'raw_text': raw_text.strip(),
                'confidence': avg_confidence,
                'language': detected_lang,
                'warnings': self._generate_warnings(avg_confidence, raw_text),
                'validation': validation,  # NEW: document validity checks
            }

        except Exception as exc:
            logger.exception('Google Vision OCR error: %s', exc)
            return {
                'extracted_fields': {
                    'full_name': None,
                    'id_number': None,
                    'date_of_birth': None,
                    'gender': None,
                    'nationality': None,
                    'region_sub_city': None,
                    'woreda': None,
                    'issue_date': None,
                    'expiry_date': None,
                    'phone_number': None,
                },
                'raw_text': '',
                'confidence': 0.0,
                'language': 'auto',
                'warnings': [f'OCR error: {str(exc)}'],
                'validation': {
                    'is_valid': False,
                    'is_expired': False,
                    'is_non_ethiopian': False,
                    'warnings': [],
                    'errors': [f'OCR error: {str(exc)}'],
                    'flagged': True,
                },
            }

    # Reuse field parsing logic from Tesseract
    _parse_fields = TesseractOCR._parse_fields
    _detect_language = TesseractOCR._detect_language
    _generate_warnings = TesseractOCR._generate_warnings


# ─────────────────────────────────────────────────────────────────────────────
# Factory & Configuration
# ─────────────────────────────────────────────────────────────────────────────

def get_ocr_engine(engine_name: str = None) -> OCREngine:
    """
    Factory function to get configured OCR engine.

    Args:
        engine_name: 'tesseract' or 'google'. If None, uses OCR_ENGINE env var or 'tesseract'.

    Returns:
        Initialized OCR engine instance.
    """
    if engine_name is None:
        engine_name = os.getenv('OCR_ENGINE', 'tesseract').lower()

    engines = {
        'tesseract': TesseractOCR,
        'google': GoogleVisionOCR,
    }

    if engine_name not in engines:
        logger.warning('Unknown OCR engine "%s", falling back to Tesseract', engine_name)
        engine_name = 'tesseract'

    return engines[engine_name]()
