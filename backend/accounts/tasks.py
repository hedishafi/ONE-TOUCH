"""
accounts/tasks.py

Celery tasks for automated identity and face biometric verification.

Verification pipeline:
  1. OCR extraction        → ocr_confidence, extracted_fields
  2. Face liveness check   → liveness_score
  3. Face matching (ID vs selfie) → face_match_score
  4. Combined scoring      → auto-approve or flag for admin review

Auto-approve thresholds:
  - OCR_MIN_CONFIDENCE: 0.75 (from settings)
  - FACE_LIVENESS_THRESHOLD: 0.75 (from settings)
  - FACE_MATCH_THRESHOLD: 0.85 (from settings)
"""

import logging
import os
from datetime import datetime

from celery import shared_task
from django.conf import settings
from django.utils import timezone

logger = logging.getLogger(__name__)

# ── tuneable thresholds (can be overridden via env vars or settings) ────────
OCR_MIN_CONFIDENCE = float(os.getenv('OCR_MIN_CONFIDENCE', 0.75))
FACE_LIVENESS_THRESHOLD = float(os.getenv('FACE_LIVENESS_THRESHOLD', 0.75))
FACE_MATCH_THRESHOLD = float(os.getenv('FACE_MATCH_THRESHOLD', 0.85))


# ─────────────────────────────────────────────────────────────────────────────
# CELERY TASK — OCR + Liveness Verification
# ─────────────────────────────────────────────────────────────────────────────

@shared_task(
    bind=True,
    max_retries=3,
    default_retry_delay=60,
    name='accounts.tasks.run_verification',
)
def run_verification(self, identity_doc_id: int) -> dict:
    """
    Automated OCR verification for an IdentityDocument.

    Called immediately after a provider uploads their identity document.
    Extracts OCR fields and sets document status based on confidence.

    Sets IdentityDocument.status to:
      - 'approved'  → if ocr_confidence ≥ OCR_MIN_CONFIDENCE
      - 'flagged'   → if ocr_confidence < OCR_MIN_CONFIDENCE; admin reviews manually

    Also populates canonical OCR fields (extracted_name, extracted_id_number, etc.)
    and sets User.verification_status.
    """
    from accounts.models import IdentityDocument, User
    from accounts.ocr_engine import get_ocr_engine

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
        # Initialize OCR engine
        ocr_engine = get_ocr_engine()
        logger.info('Using OCR engine: %s', ocr_engine.__class__.__name__)

        # Run OCR on the document
        if not doc.document_url:
            logger.error('Document id=%s has no document_url – cannot run OCR', identity_doc_id)
            doc.status = IdentityDocument.STATUS_FLAGGED
            doc.save(update_fields=['status'])
            return {'error': 'no_document_url', 'id': identity_doc_id}

        ocr_result = ocr_engine.extract_text(doc.document_url.path)
        ocr_confidence = ocr_result.get('confidence', 0.0)
        ocr_extracted = ocr_result.get('extracted_fields', {})
        raw_text = ocr_result.get('raw_text', '')

        logger.info(
            'OCR completed for Document id=%s | confidence=%.4f | language=%s',
            identity_doc_id, ocr_confidence, ocr_result.get('language', 'unknown'),
        )

        # Map standardized OCR fields to model fields
        # OCR returns: full_name, id_number, date_of_birth, gender, nationality,
        #              region_sub_city, woreda, issue_date, expiry_date, phone_number
        doc.ocr_confidence = ocr_confidence
        doc.ocr_extracted = ocr_result
        doc.ocr_language = ocr_result.get('language')
        
        # Map extracted fields using standardized names
        doc.extracted_name = ocr_extracted.get('full_name') or ''
        doc.extracted_id_number = ocr_extracted.get('id_number') or ''
        doc.extracted_gender = ocr_extracted.get('gender') or ''
        doc.extracted_nationality = ocr_extracted.get('nationality') or ''
        doc.extracted_region = ocr_extracted.get('region_sub_city') or ''
        doc.extracted_wereda = ocr_extracted.get('woreda') or ''
        doc.extracted_phone = ocr_extracted.get('phone_number') or ''
        
        # Parse dates if provided
        if ocr_extracted.get('date_of_birth'):
            try:
                dob_str = ocr_extracted['date_of_birth']
                for fmt in ['%d/%m/%Y', '%Y-%m-%d', '%d-%m-%Y']:
                    try:
                        doc.extracted_dob = datetime.strptime(dob_str, fmt).date()
                        break
                    except ValueError:
                        continue
            except Exception as e:
                logger.warning(f'Could not parse DOB: {e}')
                doc.extracted_dob = None
        
        if ocr_extracted.get('issue_date'):
            try:
                issue_str = ocr_extracted['issue_date']
                for fmt in ['%d/%m/%Y', '%Y-%m-%d', '%d-%m-%Y']:
                    try:
                        doc.extracted_issue_date = datetime.strptime(issue_str, fmt).date()
                        break
                    except ValueError:
                        continue
            except Exception as e:
                logger.warning(f'Could not parse issue date: {e}')
                
        if ocr_extracted.get('expiry_date'):
            try:
                expiry_str = ocr_extracted['expiry_date']
                for fmt in ['%d/%m/%Y', '%Y-%m-%d', '%d-%m-%Y']:
                    try:
                        doc.extracted_expiry = datetime.strptime(expiry_str, fmt).date()
                        break
                    except ValueError:
                        continue
            except Exception as e:
                logger.warning(f'Could not parse expiry date: {e}')

        if ocr_confidence >= OCR_MIN_CONFIDENCE:
            # ── AUTO-APPROVE ───────────────────────────────────────────────
            doc.auto_verified = True
            doc.status = IdentityDocument.STATUS_APPROVED
            doc.reviewed_at = timezone.now()

            user = doc.user
            user.verification_status = User.STATUS_VERIFIED
            user.save(update_fields=['verification_status'])

            doc.save(update_fields=[
                'ocr_confidence', 'ocr_extracted', 'ocr_language',
                'extracted_name', 'extracted_id_number', 'extracted_dob', 'extracted_gender',
                'extracted_expiry', 'extracted_issue_date', 'extracted_nationality', 'extracted_phone',
                'extracted_region', 'extracted_wereda',
                'auto_verified', 'status', 'reviewed_at'
            ])

            logger.info('Document id=%s AUTO-APPROVED (ocr_confidence=%.4f)', identity_doc_id, ocr_confidence)
            return {
                'result': 'approved',
                'ocr_confidence': ocr_confidence,
                'extracted_fields': ocr_extracted,
            }

        else:
            # ── FLAG FOR ADMIN ─────────────────────────────────────────────
            doc.auto_verified = False
            doc.status = IdentityDocument.STATUS_FLAGGED
            doc.save(update_fields=[
                'ocr_confidence', 'ocr_extracted', 'ocr_language',
                'extracted_name', 'extracted_id_number', 'extracted_dob', 'extracted_gender',
                'extracted_expiry', 'extracted_issue_date', 'extracted_nationality', 'extracted_phone',
                'extracted_region', 'extracted_wereda',
                'auto_verified', 'status'
            ])

            logger.warning('Document id=%s FLAGGED for admin review (ocr_confidence=%.4f)', identity_doc_id, ocr_confidence)
            return {
                'result': 'flagged',
                'ocr_confidence': ocr_confidence,
                'reason': 'OCR confidence below threshold',
            }

    except Exception as exc:
        logger.exception('run_verification failed for id=%s: %s', identity_doc_id, exc)
        raise self.retry(exc=exc)


# ─────────────────────────────────────────────────────────────────────────────
# CELERY TASK — Face Biometric Verification
# ─────────────────────────────────────────────────────────────────────────────

@shared_task(
    bind=True,
    max_retries=3,
    default_retry_delay=60,
    name='accounts.tasks.run_face_verification',
)
def run_face_verification(self, face_verification_id: int) -> dict:
    """
    Automated face biometric verification (liveness + face matching).

    Called after a provider submits a selfie for face verification.
    Compares the selfie against the ID photo and checks liveness.

    Sets FaceBiometricVerification.status to:
      - 'approved'  → if liveness_score ≥ FACE_LIVENESS_THRESHOLD
                      AND face_match_score ≥ FACE_MATCH_THRESHOLD
      - 'flagged'   → if either score is below threshold; admin reviews manually

    Also updates User.biometric_verified and biometric_score on approval.
    """
    from accounts.models import FaceBiometricVerification, IdentityDocument, User
    from accounts.face_verification import get_face_engine

    logger.info('run_face_verification started for FaceBiometricVerification id=%s', face_verification_id)

    try:
        face_verification = FaceBiometricVerification.objects.select_related(
            'identity_document', 'identity_document__user'
        ).get(pk=face_verification_id)
    except FaceBiometricVerification.DoesNotExist:
        logger.error('FaceBiometricVerification id=%s not found – aborting task', face_verification_id)
        return {'error': 'not_found', 'id': face_verification_id}

    # Guard: skip if already reviewed
    if face_verification.status in (FaceBiometricVerification.STATUS_APPROVED, FaceBiometricVerification.STATUS_REJECTED):
        logger.info('Face verification id=%s already reviewed (status=%s) – skipping', face_verification_id, face_verification.status)
        return {'skipped': True, 'status': face_verification.status}

    try:
        doc = face_verification.identity_document

        # Validate that both images exist
        if not doc.biometric_selfie:
            logger.error('IdentityDocument id=%s has no biometric_selfie on file – cannot run face matching', doc.pk)
            face_verification.status = FaceBiometricVerification.STATUS_FLAGGED
            face_verification.rejection_reason = 'Original selfie not found.'
            face_verification.save(update_fields=['status', 'rejection_reason'])
            return {'error': 'no_original_selfie', 'doc_id': doc.pk}

        if not face_verification.selfie_image:
            logger.error('FaceBiometricVerification id=%s has no selfie_image – cannot run verification', face_verification_id)
            face_verification.status = FaceBiometricVerification.STATUS_FLAGGED
            face_verification.rejection_reason = 'Selfie submission not found.'
            face_verification.save(update_fields=['status', 'rejection_reason'])
            return {'error': 'no_submission_selfie', 'face_verification_id': face_verification_id}

        if not doc.document_url:
            logger.error('IdentityDocument id=%s has no document_url – cannot run face matching', doc.pk)
            face_verification.status = FaceBiometricVerification.STATUS_FLAGGED
            face_verification.rejection_reason = 'ID document not found.'
            face_verification.save(update_fields=['status', 'rejection_reason'])
            return {'error': 'no_id_document', 'doc_id': doc.pk}

        # Initialize face verification engine
        face_engine = get_face_engine()
        logger.info('Using face engine: %s', face_engine.__class__.__name__)

        # 1. Check liveness on the submitted selfie
        liveness_score = face_engine.check_liveness(face_verification.selfie_image.path)
        logger.info('Liveness check completed for face_verification id=%s | score=%.4f', face_verification_id, liveness_score)

        # 2. Compare selfie against ID photo
        face_match_score = face_engine.compare_faces(
            id_photo_path=doc.document_url.path,
            selfie_image_path=face_verification.selfie_image.path
        )
        logger.info('Face matching completed for face_verification id=%s | score=%.4f', face_verification_id, face_match_score)

        # Update scores
        face_verification.liveness_score = liveness_score
        face_verification.face_match_score = face_match_score

        # Determine approval
        liveness_pass = liveness_score >= FACE_LIVENESS_THRESHOLD
        face_match_pass = face_match_score >= FACE_MATCH_THRESHOLD

        if liveness_pass and face_match_pass:
            # ── AUTO-APPROVE ───────────────────────────────────────────────
            face_verification.auto_verified = True
            face_verification.status = FaceBiometricVerification.STATUS_APPROVED
            face_verification.reviewed_at = timezone.now()

            user = doc.user
            user.biometric_verified = True
            user.biometric_score = (liveness_score + face_match_score) / 2
            user.verification_status = User.STATUS_VERIFIED
            user.save(update_fields=['biometric_verified', 'biometric_score', 'verification_status'])

            face_verification.save(update_fields=[
                'liveness_score', 'face_match_score', 'auto_verified', 'status', 'reviewed_at'
            ])

            logger.info(
                'Face verification id=%s AUTO-APPROVED (liveness=%.4f, face_match=%.4f)',
                face_verification_id, liveness_score, face_match_score
            )
            return {
                'result': 'approved',
                'liveness_score': liveness_score,
                'face_match_score': face_match_score,
            }

        else:
            # ── FLAG FOR ADMIN ─────────────────────────────────────────────
            face_verification.auto_verified = False
            face_verification.status = FaceBiometricVerification.STATUS_FLAGGED
            reasons = []
            if not liveness_pass:
                reasons.append(f'Liveness score {liveness_score:.4f} < {FACE_LIVENESS_THRESHOLD}')
            if not face_match_pass:
                reasons.append(f'Face match score {face_match_score:.4f} < {FACE_MATCH_THRESHOLD}')
            face_verification.rejection_reason = '; '.join(reasons)

            face_verification.save(update_fields=[
                'liveness_score', 'face_match_score', 'auto_verified', 'status', 'rejection_reason'
            ])

            logger.warning(
                'Face verification id=%s FLAGGED for admin review (liveness=%.4f, face_match=%.4f)',
                face_verification_id, liveness_score, face_match_score
            )
            return {
                'result': 'flagged',
                'liveness_score': liveness_score,
                'face_match_score': face_match_score,
                'reason': face_verification.rejection_reason,
            }

    except Exception as exc:
        logger.exception('run_face_verification failed for id=%s: %s', face_verification_id, exc)
