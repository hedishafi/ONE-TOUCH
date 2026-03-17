#!/usr/bin/env python3
"""
Test OCR validation logic
Tests expiry date checking, nationality validation, and critical field checking
"""

import sys
sys.path.insert(0, '/Users/hafsahussien/Desktop/OneTouch/backend')

from accounts.ocr_engine import OCREngine
from datetime import date, timedelta

# Test cases
test_cases = [
    {
        'name': 'Valid Ethiopian document',
        'data': {
            'name': 'Abebe Kebede',
            'document_number': 'AA123456',
            'dob': '1990-01-01',
            'expiry_date': '2030-12-31',
            'nationality': 'Ethiopian',
            'phone': '+251911222333',
        },
        'expect_valid': True,
        'expect_expired': False,
        'expect_non_ethiopian': False,
    },
    {
        'name': 'Expired document',
        'data': {
            'name': 'John Doe',
            'document_number': 'AA123456',
            'dob': '1990-01-01',
            'expiry_date': (date.today() - timedelta(days=1)).strftime('%d/%m/%Y'),
            'nationality': 'Ethiopia',
            'phone': '+251911222333',
        },
        'expect_valid': False,
        'expect_expired': True,
        'expect_non_ethiopian': False,
    },
    {
        'name': 'Non-Ethiopian document',
        'data': {
            'name': 'Jane Smith',
            'document_number': 'US123456',
            'dob': '1990-01-01',
            'expiry_date': '2030-12-31',
            'nationality': 'United States',
            'phone': '+251911222333',
        },
        'expect_valid': False,
        'expect_expired': False,
        'expect_non_ethiopian': True,
    },
    {
        'name': 'Missing critical field (no name)',
        'data': {
            'name': '',
            'document_number': 'AA123456',
            'dob': '1990-01-01',
            'expiry_date': '2030-12-31',
            'nationality': 'Ethiopian',
            'phone': '+251911222333',
        },
        'expect_valid': False,
        'expect_expired': False,
        'expect_non_ethiopian': False,
    },
    {
        'name': 'Document expiring soon',
        'data': {
            'name': 'Ali Ahmed',
            'document_number': 'AA123456',
            'dob': '1990-01-01',
            'expiry_date': (date.today() + timedelta(days=60)).strftime('%d/%m/%Y'),
            'nationality': 'Ethiopia',
            'phone': '+251911222333',
        },
        'expect_valid': True,  # Still valid but with warning
        'expect_expired': False,
        'expect_non_ethiopian': False,
    },
    {
        'name': 'Amharic nationality variation',
        'data': {
            'name': 'ብርሃነ ዳበበ',
            'document_number': 'AA123456',
            'dob': '1990-01-01',
            'expiry_date': '2030-12-31',
            'nationality': 'Etiopia',
            'phone': '+251911222333',
        },
        'expect_valid': True,
        'expect_expired': False,
        'expect_non_ethiopian': False,
    },
]

print("=" * 80)
print("OCR Validation Test Suite")
print("=" * 80)

passed = 0
failed = 0

for i, test in enumerate(test_cases, 1):
    print(f"\nTest {i}: {test['name']}")
    print(f"  Input data: {test['data']}")
    
    result = OCREngine.validate_document(test['data'], strict=True)
    
    print(f"  Result: {result}")
    
    # Check expectations
    checks = [
        ('is_valid', result['is_valid'], test['expect_valid']),
        ('is_expired', result['is_expired'], test['expect_expired']),
        ('is_non_ethiopian', result['is_non_ethiopian'], test['expect_non_ethiopian']),
    ]
    
    test_passed = True
    for check_name, actual, expected in checks:
        status = "✓" if actual == expected else "✗"
        print(f"  {status} {check_name}: {actual} (expected {expected})")
        if actual != expected:
            test_passed = False
    
    if test_passed:
        print("  ✓ PASSED")
        passed += 1
    else:
        print("  ✗ FAILED")
        failed += 1

print("\n" + "=" * 80)
print(f"Summary: {passed} passed, {failed} failed")
print("=" * 80)

sys.exit(0 if failed == 0 else 1)
