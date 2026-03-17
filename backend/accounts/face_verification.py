"""
accounts/face_verification.py

Abstract face verification engine with pluggable implementations.
Supports liveness detection + face matching (selfie vs ID photo).
"""

import os
import random
from abc import ABC, abstractmethod
from typing import Any, Dict

import logging
logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────────────────────
# Abstract Base
# ─────────────────────────────────────────────────────────────────────────────

class FaceVerificationEngine(ABC):
    """Abstract base for face verification engines."""

    @abstractmethod
    def check_liveness(self, selfie_image_path: str) -> Dict[str, Any]:
        """
        Check if the selfie is a real live face (anti-spoofing).

        Args:
            selfie_image_path: Path to the selfie photo

        Returns:
            {
                'is_live': bool,
                'liveness_score': float (0.0 - 1.0),
                'confidence': float (0.0 - 1.0),
                'warnings': [str],
            }
        """
        pass

    @abstractmethod
    def compare_faces(self, id_photo_path: str, selfie_image_path: str) -> Dict[str, Any]:
        """
        Compare two faces (ID photo vs selfie).

        Args:
            id_photo_path: Path to the ID document photo
            selfie_image_path: Path to the selfie photo

        Returns:
            {
                'is_match': bool,
                'match_score': float (0.0 - 1.0),
                'confidence': float (0.0 - 1.0),
                'warnings': [str],
            }
        """
        pass


# ─────────────────────────────────────────────────────────────────────────────
# Local Simulation (development and testing)
# ─────────────────────────────────────────────────────────────────────────────

class LocalFaceSimulation(FaceVerificationEngine):
    """
    Local simulation for development/testing.
    Returns random but realistic scores without calling external APIs.
    """

    def check_liveness(self, selfie_image_path: str) -> Dict[str, Any]:
        """Simulate liveness check with random score."""
        liveness_score = round(random.uniform(0.75, 0.99), 4)
        is_live = liveness_score >= os.getenv('FACE_LIVENESS_THRESHOLD', 0.75)

        return {
            'is_live': is_live,
            'liveness_score': liveness_score,
            'confidence': 0.90,
            'warnings': [] if is_live else ['Low liveness score — selfie appears static.'],
        }

    def compare_faces(self, id_photo_path: str, selfie_image_path: str) -> Dict[str, Any]:
        """Simulate face comparison with random score."""
        match_score = round(random.uniform(0.70, 0.98), 4)
        threshold = float(os.getenv('FACE_MATCH_THRESHOLD', 0.85))
        is_match = match_score >= threshold

        return {
            'is_match': is_match,
            'match_score': match_score,
            'confidence': 0.85,
            'warnings': [] if is_match else ['Faces do not match sufficiently.'],
        }


# ─────────────────────────────────────────────────────────────────────────────
# Azure Face API Implementation (production-grade)
# ─────────────────────────────────────────────────────────────────────────────

class AzureFaceVerification(FaceVerificationEngine):
    """
    Azure Face API implementation.
    Requires AZURE_FACE_ENDPOINT and AZURE_FACE_KEY env vars.
    """

    def __init__(self):
        self.endpoint = os.getenv('AZURE_FACE_ENDPOINT')
        self.key = os.getenv('AZURE_FACE_KEY')
        if not self.endpoint or not self.key:
            raise ValueError('AZURE_FACE_ENDPOINT and AZURE_FACE_KEY must be set.')

    def check_liveness(self, selfie_image_path: str) -> Dict[str, Any]:
        """
        Check liveness using Azure Face API.
        Requires Azure Computer Vision v3.2+ for liveness detection.
        """
        try:
            from azure.ai.vision.face import FaceClient
            from azure.ai.vision.face.models import FaceDetectionModel, FaceRecognitionModel
            from azure.core.credentials import AzureKeyCredential

            client = FaceClient(endpoint=self.endpoint, credential=AzureKeyCredential(self.key))

            # Upload and analyze image
            with open(selfie_image_path, 'rb') as f:
                result = client.detect(
                    image_content=f.read(),
                    detection_model=FaceDetectionModel.DETECTION_03,
                    recognition_model=FaceRecognitionModel.RECOGNITION_04,
                    return_face_attributes=['qualityForRecognition'],
                )

            if not result:
                return {
                    'is_live': False,
                    'liveness_score': 0.0,
                    'confidence': 1.0,
                    'warnings': ['No face detected in the image.'],
                }

            # Azure liveness score (experimental; use quality as proxy)
            # In real scenario, use Azure's liveness detection endpoint
            face = result[0]
            quality_score = face.face_attributes.quality_for_recognition
            liveness_score = 0.8 if quality_score == 'high' else 0.5

            is_live = liveness_score >= float(os.getenv('FACE_LIVENESS_THRESHOLD', 0.75))

            return {
                'is_live': is_live,
                'liveness_score': round(liveness_score, 4),
                'confidence': 0.92,
                'warnings': [] if is_live else ['Liveness check failed.'],
            }

        except Exception as exc:
            logger.exception('Azure liveness check error: %s', exc)
            return {
                'is_live': False,
                'liveness_score': 0.0,
                'confidence': 0.0,
                'warnings': [f'Liveness check error: {str(exc)}'],
            }

    def compare_faces(self, id_photo_path: str, selfie_image_path: str) -> Dict[str, Any]:
        """
        Compare two faces using Azure Face API.
        """
        try:
            from azure.ai.vision.face import FaceClient
            from azure.ai.vision.face.models import FaceDetectionModel, FaceRecognitionModel
            from azure.core.credentials import AzureKeyCredential

            client = FaceClient(endpoint=self.endpoint, credential=AzureKeyCredential(self.key))

            # Detect both photos
            with open(id_photo_path, 'rb') as f:
                id_faces = client.detect(
                    image_content=f.read(),
                    detection_model=FaceDetectionModel.DETECTION_03,
                    recognition_model=FaceRecognitionModel.RECOGNITION_04,
                )

            with open(selfie_image_path, 'rb') as f:
                selfie_faces = client.detect(
                    image_content=f.read(),
                    detection_model=FaceDetectionModel.DETECTION_03,
                    recognition_model=FaceRecognitionModel.RECOGNITION_04,
                )

            if not id_faces or not selfie_faces:
                return {
                    'is_match': False,
                    'match_score': 0.0,
                    'confidence': 1.0,
                    'warnings': ['Could not detect face in one or both images.'],
                }

            # Compare faces
            id_face_id = id_faces[0].face_id
            selfie_face_id = selfie_faces[0].face_id
            comparison = client.verify_face_to_face(id_face_id, selfie_face_id)

            match_score = round(comparison.confidence, 4)
            threshold = float(os.getenv('FACE_MATCH_THRESHOLD', 0.85))
            is_match = comparison.is_identical and match_score >= threshold

            return {
                'is_match': is_match,
                'match_score': match_score,
                'confidence': 0.95,
                'warnings': [] if is_match else ['Faces do not match.'],
            }

        except Exception as exc:
            logger.exception('Azure face comparison error: %s', exc)
            return {
                'is_match': False,
                'match_score': 0.0,
                'confidence': 0.0,
                'warnings': [f'Face comparison error: {str(exc)}'],
            }


# ─────────────────────────────────────────────────────────────────────────────
# Factory & Configuration
# ─────────────────────────────────────────────────────────────────────────────

def get_face_engine(engine_name: str = None) -> FaceVerificationEngine:
    """
    Factory function to get configured face verification engine.

    Args:
        engine_name: 'local' or 'azure'. If None, uses FACE_ENGINE env var or 'local'.

    Returns:
        Initialized face verification engine instance.
    """
    if engine_name is None:
        engine_name = os.getenv('FACE_ENGINE', 'local').lower()

    engines = {
        'local': LocalFaceSimulation,
        'azure': AzureFaceVerification,
    }

    if engine_name not in engines:
        logger.warning('Unknown face engine "%s", falling back to local', engine_name)
        engine_name = 'local'

    return engines[engine_name]()
