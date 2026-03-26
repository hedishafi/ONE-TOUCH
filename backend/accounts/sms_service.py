"""
SMS Service for sending OTP codes.

This module provides an abstraction layer for SMS delivery.
Currently uses a MOCK implementation for testing.
Later, replace with real Ethio Telecom integration without changing other code.
"""

import logging
import os

logger = logging.getLogger(__name__)


def send_otp_sms(phone_number: str, otp_code: str) -> bool:
	"""
	Send OTP via SMS.
	
	Args:
		phone_number: Normalized phone number (+251XXXXXXXXX)
		otp_code: 6-digit OTP code
	
	Returns:
		True if SMS sent successfully, False otherwise.
	
	CURRENT: Mock implementation (prints to console for testing)
	LATER: Replace with real Ethio Telecom API calls
	"""
	
	# ═══════════════════════════════════════════════════════════════════════════
	# MOCK IMPLEMENTATION (FOR TESTING NOW)
	# ═══════════════════════════════════════════════════════════════════════════
	
	logger.info(f'[SMS MOCK] OTP sent to {phone_number}: {otp_code}')
	print(f'\n🔐 OTP CODE FOR TESTING: {otp_code}\n')
	return True
	
	
	# ═══════════════════════════════════════════════════════════════════════════
	# FUTURE: REAL ETHIO TELECOM IMPLEMENTATION (Replace above when ready)
	# ═══════════════════════════════════════════════════════════════════════════
	
	# Uncomment and implement when integrating with Ethio Telecom:
	"""
	import requests
	from django.conf import settings
	
	api_url = settings.ETHIO_TELECOM_API_URL
	api_key = settings.ETHIO_TELECOM_API_KEY
	sender_id = settings.ETHIO_TELECOM_SENDER_ID
	
	payload = {
		'phone': phone_number,
		'message': f'Your OneTouch OTP: {otp_code}',
		'sender': sender_id,
	}
	
	headers = {
		'Authorization': f'Bearer {api_key}',
		'Content-Type': 'application/json',
	}
	
	try:
		response = requests.post(api_url, json=payload, headers=headers, timeout=10)
		if response.status_code == 200:
			logger.info(f'SMS sent to {phone_number}')
			return True
		else:
			logger.error(f'Ethio Telecom API error: {response.status_code} - {response.text}')
			return False
	except Exception as exc:
		logger.error(f'Failed to send SMS to {phone_number}: {str(exc)}')
		return False
	"""
