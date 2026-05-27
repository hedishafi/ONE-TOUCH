import logging

import whisper

logger = logging.getLogger(__name__)

_model = None


def get_model():
    global _model
    if _model is None:
        logger.info("Loading Whisper model: small")
        _model = whisper.load_model("small")
        logger.info("Whisper model 'small' loaded successfully")
    return _model


def transcribe_audio(audio_file_path, language=None):
    logger.info(
        "Whisper transcribe | model=small | language=%s | file=%s",
        language or "auto-detect",
        audio_file_path,
    )
    try:
        model = get_model()
        result = model.transcribe(
            audio_file_path,
            language=language,
            task="transcribe",
        )
        text = (result.get("text") or "").strip()
        logger.info(
            "Whisper transcription complete | detected_language=%s | chars=%d | preview=%s",
            result.get("language", "unknown"),
            len(text),
            text[:80],
        )
        return text
    except FileNotFoundError:
        logger.exception("Audio file not found for transcription: %s", audio_file_path)
    except Exception:
        logger.exception("Whisper transcription failed for %s", audio_file_path)
    return ""


def detect_language(audio_file_path):
    try:
        model = get_model()
        audio = whisper.load_audio(audio_file_path)
        audio = whisper.pad_or_trim(audio)
        mel = whisper.log_mel_spectrogram(audio).to(model.device)
        _, probs = model.detect_language(mel)
        detected = max(probs, key=probs.get)
        logger.info(
            "Whisper language detection | file=%s | detected=%s",
            audio_file_path,
            detected,
        )
        return detected
    except FileNotFoundError:
        logger.exception("Audio file not found for language detection: %s", audio_file_path)
    except Exception:
        logger.exception("Whisper language detection failed for %s", audio_file_path)
    return ""
