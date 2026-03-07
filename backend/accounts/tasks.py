"""
accounts/tasks.py

Celery tasks for automated identity verification.

Simulated pipeline (replace with real OCR / liveness vendor SDK):
  1. OCR extraction  → ocr_confidence  (0.0 – 1.0)
  2. Liveness check  → liveness_score  (0.0 – 1.0)
  3. Combined score  = (ocr_confidence + liveness_score) / 2

Auto-approve threshold: combined ≥ OCR_LIVENESS_THRESHOLD (default 0.75)
Anything below → status = 'flagged' for admin manual review.
"""

import logging
import random
import time

from celery import shared_task
from django.utils import timezone

logger = logging.getLogger(__name__)

# ── tuneable thresholds ────────────────────────────────────────────────────────
OCR_LIVENESS_THRESHOLD = 0.75   # combined score required for auto-approval
SIMULATED_DELAY_SEC    = 2      # simulates network/API latency in dev/test


# ─────────────────────────────────────────────────────────────────────────────
# HELPER – simulate OCR extraction
# ─────────────────────────────────────────────────────────────────────────────

def _simulate_ocr(document_url) -> tuple[float, dict]:
    """
    Replace with real Tesseract / cloud OCR call.
    Returns (confidence_score, extracted_fields).
    """
    time.sleep(SIMULATED_DELAY_SEC)
    confidence = round(random.uniform(0.60, 0.99), 4)
    extracted  = {
        'name':           'Extracted Name',
        'id_number':      'ETH-' + str(random.randint(100000, 999999)),
        'date_of_birth':  '1990-01-01',
        'expiry_date':    '2030-01-01',
    }
    return confidence, extracted


# ─────────────────────────────────────────────────────────────────────────────
# HELPER – simulate liveness check
# ─────────────────────────────────────────────────────────────────────────────

def _simulate_liveness(selfie_url) -> float:
    """
    Replace with a real face-liveness vendor API call.
    Returns liveness_score (0.0 – 1.0).
    """
    time.sleep(SIMULATED_DELAY_SEC)
    return round(random.uniform(0.60, 0.99), 4)


# ─────────────────────────────────────────────────────────────────────────────
# CELERY TASK
# ─────────────────────────────────────────────────────────────────────────────

@shared_task(
    bind=True,
    max_retries=3,
    default_retry_delay=60,
    name='accounts.tasks.run_verification',
)
def run_verification(self, identity_doc_id: int) -> dict:
    """
    Automated OCR + liveness verification for an IdentityDocument.

    Called immediately after a provider uploads their document.
    Sets IdentityDocument.status to:
      - 'approved'  → if combined score ≥ OCR_LIVENESS_THRESHOLD
      - 'flagged'   → below threshold; admin reviews manually

    Also updates User.verification_status and biometric fields on approval.
    """
    from accounts.models import IdentityDocument, User  # local import avoids circular

    logger.info('run_verification started for IdentityDocument id=%s', identity_doc_id)

    try:
        doc = IdentityDocument.objects.select_related('user').get(pk=identity_doc_id)
    except IdentityDocument.DoesNotExist:
        logger.error('IdentityDocument id=%s not found – aborting task', identity_doc_id)
        return {'error': 'not_found', 'id': identity_doc_id}

    # Guard: skip if already reviewed
    if doc.status in (IdentityDocument.STATUS_APPROVED, IdentityDocument.STATUS_REJECTED):
        logger.info('Document id=%s already reviewed (status=%s) – skipping', identity_doc_id, doc.status)
        return {'skipped': True, 'status': doc.status}

    try:
        # 1. OCR
        ocr_confidence, ocr_extracted = _simulate_ocr(doc.document_url.name if doc.document_url else '')

        # 2. Liveness (only run if selfie was uploaded)
        if doc.biometric_selfie:
            liveness_score = _simulate_liveness(doc.biometric_selfie.name)
        else:
            liveness_score = 0.0   # no selfie → treat liveness as failed

        # 3. Combined score
        if doc.biometric_selfie:
            combined = (ocr_confidence + liveness_score) / 2
        else:
            combined = ocr_confidence * 0.6  # penalty for missing selfie

        logger.info(
            'Document id=%s | ocr=%.4f | liveness=%.4f | combined=%.4f',
            identity_doc_id, ocr_confidence, liveness_score, combined,
        )

        # 4. Persist OCR results
        doc.ocr_confidence = ocr_confidence
        doc.ocr_extracted  = ocr_extracted

        if combined >= OCR_LIVENESS_THRESHOLD:
            # ── AUTO-APPROVE ───────────────────────────────────────────────
            doc.auto_verified = True
            doc.status        = IdentityDocument.STATUS_APPROVED
            doc.reviewed_at   = timezone.now()

            user = doc.user
            user.verification_status  = User.STATUS_VERIFIED
            user.biometric_verified   = bool(doc.biometric_selfie)
            user.biometric_score      = liveness_score if doc.biometric_selfie else 0.0
            user.save(update_fields=['verification_status', 'biometric_verified', 'biometric_score'])

            doc.save(update_fields=['ocr_confidence', 'ocr_extracted', 'auto_verified', 'status', 'reviewed_at'])

            logger.info('Document id=%s AUTO-APPROVED (combined=%.4f)', identity_doc_id, combined)
            return {
                'result':       'approved',
                'combined':     combined,
                'ocr':          ocr_confidence,
                'liveness':     liveness_score,
            }

        else:
            # ── FLAG FOR ADMIN ─────────────────────────────────────────────
            doc.auto_verified = False
            doc.status        = IdentityDocument.STATUS_FLAGGED
            doc.save(update_fields=['ocr_confidence', 'ocr_extracted', 'auto_verified', 'status'])

            logger.warning('Document id=%s FLAGGED for admin review (combined=%.4f)', identity_doc_id, combined)
            return {
                'result':   'flagged',
                'combined': combined,
                'ocr':      ocr_confidence,
                'liveness': liveness_score,
            }

    except Exception as exc:
        logger.exception('run_verification failed for id=%s: %s', identity_doc_id, exc)
        raise self.retry(exc=exc)
