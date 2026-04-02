"""SMS delivery service with pluggable providers.

This module intentionally keeps a stable integration point:
`send_otp_sms(phone_number, otp_code)`.

Provider selection is env-driven and does not require changes to OTP flows.
"""

import json
import logging
import os
from abc import ABC, abstractmethod
from urllib import error as url_error
from urllib import request as url_request

logger = logging.getLogger(__name__)


class SMSProvider(ABC):
	@abstractmethod
	def send_otp(self, phone_number: str, otp_code: str) -> bool:
		raise NotImplementedError


class MockSMSProvider(SMSProvider):
	def send_otp(self, phone_number: str, otp_code: str) -> bool:
		logger.info('[SMS MOCK] OTP sent to %s: %s', phone_number, otp_code)
		print(f'\n🔐 OTP CODE FOR TESTING: {otp_code}\n')
		return True


class EthioTelecomSMSProvider(SMSProvider):
	def __init__(self) -> None:
		self.api_url = os.getenv('ETHIO_TELECOM_API_URL', '').strip()
		self.api_key = os.getenv('ETHIO_TELECOM_API_KEY', '').strip()
		self.sender_id = os.getenv('ETHIO_TELECOM_SENDER_ID', 'OneTouch').strip()
		self.request_timeout_seconds = int(os.getenv('ETHIO_TELECOM_TIMEOUT_SECONDS', '12'))

	def _is_configured(self) -> bool:
		return bool(self.api_url and self.api_key)

	def send_otp(self, phone_number: str, otp_code: str) -> bool:
		if not self._is_configured():
			logger.error('Ethio Telecom SMS provider is selected but not configured. Missing ETHIO_TELECOM_API_URL or ETHIO_TELECOM_API_KEY.')
			return False

		payload = {
			'phone': phone_number,
			'message': f'Your OneTouch OTP: {otp_code}',
			'sender': self.sender_id,
		}

		req = url_request.Request(
			url=self.api_url,
			data=json.dumps(payload).encode('utf-8'),
			headers={
				'Authorization': f'Bearer {self.api_key}',
				'Content-Type': 'application/json',
			},
			method='POST',
		)

		try:
			with url_request.urlopen(req, timeout=self.request_timeout_seconds) as response:
				status_code = response.getcode()
				if 200 <= status_code < 300:
					logger.info('Ethio Telecom SMS sent to %s', phone_number)
					return True

				body = response.read().decode('utf-8', errors='ignore')
				logger.error('Ethio Telecom API non-success status=%s body=%s', status_code, body)
				return False
		except url_error.HTTPError as exc:
			body = exc.read().decode('utf-8', errors='ignore') if hasattr(exc, 'read') else ''
			logger.error('Ethio Telecom HTTP error status=%s body=%s', getattr(exc, 'code', 'unknown'), body)
			return False
		except Exception as exc:
			logger.exception('Ethio Telecom SMS send failed: %s', exc)
			return False


def _resolve_provider() -> SMSProvider:
	provider_name = os.getenv('SMS_PROVIDER', 'mock').strip().lower()
	if provider_name in {'ethio_telecom', 'ethiotelecom', 'ethio'}:
		return EthioTelecomSMSProvider()
	return MockSMSProvider()


def send_otp_sms(phone_number: str, otp_code: str) -> bool:
	"""Send OTP via configured SMS provider.

	Public contract intentionally unchanged to avoid touching existing integration.
	"""
	provider = _resolve_provider()
	return provider.send_otp(phone_number, otp_code)
