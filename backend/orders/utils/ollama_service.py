import json
import logging
import re

import requests

from services.models import ServiceCategory, SubService

logger = logging.getLogger(__name__)

OLLAMA_URL = "http://localhost:11434/api/generate"
OLLAMA_MODEL = "llama3:latest"


def _build_prompt(transcription_text):
    category_names = ["Cleaning", "Electrical", "Painting"]
    subservices_by_category = {name: [] for name in category_names}

    subservice_rows = SubService.objects.filter(
        category__name__in=category_names,
    ).select_related("category").values_list("category__name", "name")
    for category_name, subservice_name in subservice_rows:
        subservices_by_category.setdefault(category_name, []).append(subservice_name)

    subservice_lines = []
    for category_name in category_names:
        subservices = sorted(set(subservices_by_category.get(category_name, [])))
        subservice_lines.append(
            f"For {category_name}, available sub-services are: {subservices}. "
            "You must return ONLY exact sub-service names from this list."
        )

    return (
        "You are a service classifier for a home repair marketplace. "
        "Analyze the following request and return ONLY a JSON object with the keys "
        "category_name, sub_service_name, cleaned_description, confidence. "
        "The category and sub-service should be short names. "
        "You must use ONLY these exact category names: Cleaning, Electrical, Painting. "
        "Choose the closest match. "
        f"{' '.join(subservice_lines)} "
        "Confidence should be a float between 0 and 1.\n\n"
        f"Request: {transcription_text}\n"
    )


def categorise_order(transcription_text):
    payload = {
        "model": OLLAMA_MODEL,
        "prompt": _build_prompt(transcription_text),
        "stream": False,
        "options": {
            "num_predict": 150,
            "temperature": 0.1,
        },
    }
    try:
        response = requests.post(OLLAMA_URL, json=payload, timeout=300)
        response.raise_for_status()
        data = response.json()
        raw_text = data.get("response", "")
        logger.info(f"Ollama raw response: {raw_text}")
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
