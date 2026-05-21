import json
import logging
import re

import requests

from services.models import ServiceCategory, SubService

logger = logging.getLogger(__name__)

OLLAMA_URL = "http://localhost:11434/api/generate"
OLLAMA_MODEL = "llama2"


def _build_prompt(transcription_text):
    return (
        "You are a service classifier for a home repair marketplace. "
        "Analyze the following request and return ONLY a JSON object with the keys "
        "category_name, sub_service_name, cleaned_description, confidence. "
        "The category and sub-service should be short names. "
        "Confidence should be a float between 0 and 1.\n\n"
        f"Request: {transcription_text}\n"
    )


def categorise_order(transcription_text):
    payload = {
        "model": OLLAMA_MODEL,
        "prompt": _build_prompt(transcription_text),
        "stream": False,
    }
    try:
        response = requests.post(OLLAMA_URL, json=payload, timeout=30)
        response.raise_for_status()
        data = response.json()
        raw_text = data.get("response", "")
        match = re.search(r'\{.*\}', raw_text, re.DOTALL)
        if match:
            return json.loads(match.group(0))
        logger.warning("Ollama response did not include JSON payload.")
    except (requests.RequestException, ValueError, json.JSONDecodeError):
        logger.exception("Ollama categorisation failed.")
    return {
        "category_name": None,
        "sub_service_name": None,
        "cleaned_description": transcription_text,
        "confidence": 0.0,
    }


def match_category_to_db(category_name, sub_service_name):
    category = None
    sub_service = None

    if category_name:
        category = ServiceCategory.objects.filter(name__iexact=category_name).first()

    if category and sub_service_name:
        sub_service = SubService.objects.filter(
            category=category,
            name__iexact=sub_service_name,
        ).first()

    return {
        "category_id": category.id if category else None,
        "sub_service_id": sub_service.id if sub_service else None,
    }
