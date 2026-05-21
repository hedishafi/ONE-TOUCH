import logging

import whisper

logger = logging.getLogger(__name__)

_model = None


def get_model():
    global _model
    if _model is None:
        _model = whisper.load_model("base")
    return _model


def transcribe_audio(audio_file_path):
    try:
        model = get_model()
        result = model.transcribe(audio_file_path)
        return (result.get("text") or "").strip()
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
        return max(probs, key=probs.get)
    except FileNotFoundError:
        logger.exception("Audio file not found for language detection: %s", audio_file_path)
    except Exception:
        logger.exception("Whisper language detection failed for %s", audio_file_path)
    return ""
