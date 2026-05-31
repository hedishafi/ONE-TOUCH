import { useEffect, useRef, useState } from 'react';
import { Box, Text, Group, Stack, Loader, Button, Avatar, Badge } from '@mantine/core';
import {
  IconMicrophone,
  IconSend,
  IconMapPin,
  IconAlertCircle,
  IconCheck,
  IconMicrophoneOff,
  IconArrowLeft,
  IconRefresh,
  IconX,
  IconStar,
  IconStarFilled,
  IconUser,
} from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { createOrder, transcribeAudio, getSuggestedProviders, selectProvider } from '../../api/ordersApi';
import { ROUTES } from '../../utils/constants';

const N = '#000080';
const T = '#008080';

// ── Star rating helper ────────────────────────────────────────────────────────
function StarRating({ rating, max = 5 }) {
  const full = Math.floor(rating);
  const stars = Array.from({ length: max }, (_, i) => i < full);
  return (
    <Group gap={2}>
      {stars.map((filled, i) =>
        filled
          ? <IconStarFilled key={i} size={13} color="#F59E0B" />
          : <IconStar key={i} size={13} color="#D1D5DB" />
      )}
    </Group>
  );
}

// ── Provider card ─────────────────────────────────────────────────────────────
function ProviderCard({ provider, onSelect, isSelecting, t, N, T }) {
  return (
    <Box
      style={{
        background: 'var(--ot-bg-card)',
        border: '1.5px solid var(--ot-border)',
        borderRadius: 20,
        padding: '20px',
        boxShadow: `0 4px 20px ${N}10`,
        transition: 'box-shadow 0.2s ease',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.boxShadow = `0 8px 32px ${N}22`; }}
      onMouseLeave={(e) => { e.currentTarget.style.boxShadow = `0 4px 20px ${N}10`; }}
    >
      <Group gap={16} align="flex-start" wrap="nowrap">
        {/* Avatar */}
        {provider.profile_picture ? (
          <Box
            component="img"
            src={provider.profile_picture}
            alt={provider.full_name}
            style={{
              width: 60, height: 60, borderRadius: '50%',
              objectFit: 'cover', flexShrink: 0,
              border: `2px solid ${T}44`,
            }}
          />
        ) : (
          <Box
            style={{
              width: 60, height: 60, borderRadius: '50%', flexShrink: 0,
              background: `linear-gradient(135deg, ${N}22, ${T}33)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: `2px solid ${T}44`,
            }}
          >
            <IconUser size={26} color={T} />
          </Box>
        )}

        {/* Info */}
        <Box style={{ flex: 1, minWidth: 0 }}>
          <Group justify="space-between" align="flex-start" wrap="nowrap" mb={4}>
            <Text fw={800} size="md" c={N} lineClamp={1}>{provider.full_name}</Text>
            <Badge size="sm" variant="light" color="teal" style={{ flexShrink: 0 }}>
              {provider.distance_km} km
            </Badge>
          </Group>

          <Group gap={6} mb={6}>
            <StarRating rating={provider.rating} />
            <Text size="xs" c="dimmed">
              {provider.rating.toFixed(1)} ({provider.total_reviews})
            </Text>
          </Group>

          {provider.bio && (
            <Text size="xs" c="dimmed" lineClamp={2} mb={6}>
              {provider.bio}
            </Text>
          )}

          <Group gap={8} mb={12} wrap="wrap">
            <Group gap={4}>
              <Text size="xs" fw={600} c={N}>{t('createOrder.price_range')}:</Text>
              <Text size="xs" c={T} fw={700}>{provider.price_range}</Text>
            </Group>
            {provider.services?.length > 0 && (
              <Group gap={4} wrap="wrap">
                {provider.services.slice(0, 2).map((s) => (
                  <Badge key={s} size="xs" variant="outline" color="blue">{s}</Badge>
                ))}
              </Group>
            )}
          </Group>

          <Button
            size="sm"
            radius="xl"
            loading={isSelecting}
            onClick={() => onSelect(provider)}
            style={{
              background: `linear-gradient(135deg, ${N}, ${T})`,
              border: 'none',
              width: '100%',
            }}
          >
            {t('createOrder.select_provider')}
          </Button>
        </Box>
      </Group>
    </Box>
  );
}

// Voice recording flow states
const VOICE_STATE = {
  IDLE: 'idle',
  RECORDING: 'recording',
  TRANSCRIBING: 'transcribing',
  CONFIRM: 'confirm',
  ERROR: 'error',
};

// Rotating messages shown during order submission
const isAmharic = (lang) => lang === 'am';
const SUBMIT_MESSAGES_EN = [
  'Submitting your order...',
  'AI is categorizing your request...',
  'Finding nearby providers...',
  'Almost there...',
];
const SUBMIT_MESSAGES_AM = [
  'ቅደም ቁጥርዎ እየተላከ ነው...',
  'AI ጥያቄዎን እየመደበ ነው...',
  'ቅርብ አቅራቢዎችን እየፈለገ ነው...',
  'ትንሽ ይጠብቁ...',
];

export const CreateOrder = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  const whisperLanguage = i18n.language === 'am' ? 'am' : 'en';

  // Location
  const [latitude, setLatitude] = useState(null);
  const [longitude, setLongitude] = useState(null);
  const [locationError, setLocationError] = useState(null);
  const [locationAddress, setLocationAddress] = useState('');

  // Voice recording
  const [voiceState, setVoiceState] = useState(VOICE_STATE.IDLE);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState(null);
  const [transcriptionError, setTranscriptionError] = useState(null);

  // Text input
  const [textInput, setTextInput] = useState('');

  // Submission
  const [loading, setLoading] = useState(false);
  const [submitMsgIndex, setSubmitMsgIndex] = useState(0);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [permissionDenied, setPermissionDenied] = useState(false);

  // Provider selection (new flow)
  const [createdOrderId, setCreatedOrderId] = useState(null);
  const [suggestedProviders, setSuggestedProviders] = useState([]);
  const [showProviderSelection, setShowProviderSelection] = useState(false);
  const [loadingProviders, setLoadingProviders] = useState(false);
  const [selectingProvider, setSelectingProvider] = useState(null); // provider id being selected
  const [providerSelected, setProviderSelected] = useState(null);   // { id, full_name } after selection

  const mediaRecorderRef = useRef(null);
  const timerIntervalRef = useRef(null);
  const submitMsgIntervalRef = useRef(null);
  const cancelledRef = useRef(false); // tracks whether recording was cancelled
  const textareaRef = useRef(null);
  const confirmTextareaRef = useRef(null);

  // ── Geolocation ──────────────────────────────────────────────────────────
  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLatitude(position.coords.latitude);
          setLongitude(position.coords.longitude);
          setLocationAddress(
            `${position.coords.latitude.toFixed(4)}, ${position.coords.longitude.toFixed(4)}`
          );
          setLocationError(null);
        },
        () => setLocationError(t('createOrder.location_unavailable'))
      );
    }
  }, [t]);

  // ── Recording ─────────────────────────────────────────────────────────────
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      cancelledRef.current = false;
      const chunks = [];

      mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
      mediaRecorder.onstop = async () => {
        // If the user hit Cancel, don't transcribe — just go back to idle
        if (cancelledRef.current) return;
        const blob = new Blob(chunks, { type: 'audio/wav' });
        setAudioBlob(blob);
        await runTranscription(blob);
      };

      mediaRecorder.start();
      setVoiceState(VOICE_STATE.RECORDING);
      setRecordingTime(0);
      setPermissionDenied(false);
      setTranscriptionError(null);

      timerIntervalRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch {
      setPermissionDenied(true);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && voiceState === VOICE_STATE.RECORDING) {
      cancelledRef.current = false;
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
      clearInterval(timerIntervalRef.current);
      setVoiceState(VOICE_STATE.TRANSCRIBING);
    }
  };

  // Cancel recording — discard audio, return to idle without transcribing
  const cancelRecording = () => {
    if (mediaRecorderRef.current && voiceState === VOICE_STATE.RECORDING) {
      cancelledRef.current = true;
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
      clearInterval(timerIntervalRef.current);
      setRecordingTime(0);
      setAudioBlob(null);
      setVoiceState(VOICE_STATE.IDLE);
    }
  };

  // ── Transcription ─────────────────────────────────────────────────────────
  const runTranscription = async (blob) => {
    setVoiceState(VOICE_STATE.TRANSCRIBING);
    setTranscriptionError(null);
    try {
      const result = await transcribeAudio(blob, whisperLanguage);
      const text = result.transcription || '';
      console.log('Setting text input:', text);
      setTextInput(text);
      setVoiceState(VOICE_STATE.CONFIRM);
    } catch (err) {
      const msg =
        typeof err === 'string'
          ? err
          : err?.detail || t('createOrder.transcription_failed');
      setTranscriptionError(msg);
      setVoiceState(VOICE_STATE.ERROR);
    }
  };

  // ── Re-record ─────────────────────────────────────────────────────────────
  const handleReRecord = () => {
    setAudioBlob(null);
    setTextInput('');
    setTranscriptionError(null);
    setVoiceState(VOICE_STATE.IDLE);
  };

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    const finalText = textInput.trim();

    if (!finalText) {
      setError(t('createOrder.error_no_input'));
      return;
    }
    if (latitude === null || longitude === null) {
      setError(t('createOrder.error_no_location'));
      return;
    }

    setLoading(true);
    setSubmitMsgIndex(0);
    setError(null);

    // Rotate the loading message every 2.5 s
    const messages = isAmharic(i18n.language) ? SUBMIT_MESSAGES_AM : SUBMIT_MESSAGES_EN;
    submitMsgIntervalRef.current = setInterval(() => {
      setSubmitMsgIndex((i) => (i + 1) % messages.length);
    }, 2500);

    try {
      const formData = new FormData();
      formData.append('input_type', 'text');
      formData.append('transcription', finalText);
      formData.append('client_latitude', latitude);
      formData.append('client_longitude', longitude);

      const response = await createOrder(formData);
      clearInterval(submitMsgIntervalRef.current);
      setLoading(false);

      const orderId = response.order_id;
      setCreatedOrderId(orderId);

      // Fetch suggested providers
      setLoadingProviders(true);
      setShowProviderSelection(true);
      try {
        const providers = await getSuggestedProviders(orderId);
        setSuggestedProviders(providers || []);
      } catch {
        setSuggestedProviders([]);
      } finally {
        setLoadingProviders(false);
      }
    } catch (err) {
      clearInterval(submitMsgIntervalRef.current);
      setLoading(false);
      setError(
        typeof err === 'string'
          ? err
          : err?.detail || t('createOrder.error_creating')
      );
    }
  };

  // ── Select a provider ─────────────────────────────────────────────────────
  const handleSelectProvider = async (provider) => {
    if (!createdOrderId) return;
    setSelectingProvider(provider.id);
    setError(null);
    try {
      await selectProvider(createdOrderId, provider.id);
      setProviderSelected(provider);
    } catch (err) {
      setError(
        typeof err === 'string'
          ? err
          : err?.detail || t('createOrder.error_selecting_provider')
      );
    } finally {
      setSelectingProvider(null);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const formatTime = (s) =>
    `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  const isRecording = voiceState === VOICE_STATE.RECORDING;
  const isTranscribing = voiceState === VOICE_STATE.TRANSCRIBING;
  const isConfirm = voiceState === VOICE_STATE.CONFIRM;
  const isVoiceError = voiceState === VOICE_STATE.ERROR;
  const canSubmit = textInput.trim() && !loading;

  const submitMessages = isAmharic(i18n.language) ? SUBMIT_MESSAGES_AM : SUBMIT_MESSAGES_EN;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <Box
      style={{
        minHeight: '100vh',
        background: 'var(--ot-bg-page)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 16px',
      }}
    >
      {/* ── SUBMISSION LOADING OVERLAY ── */}
      {loading && (
        <Box
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            background: 'rgba(0,0,0,0.55)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backdropFilter: 'blur(4px)',
          }}
        >
          <Box
            style={{
              background: 'var(--ot-bg-card)',
              borderRadius: 24,
              padding: '40px 36px',
              textAlign: 'center',
              maxWidth: 320,
              width: '90%',
              boxShadow: `0 24px 64px ${N}44`,
            }}
          >
            {/* Spinning gradient ring */}
            <Box
              style={{
                width: 72,
                height: 72,
                borderRadius: '50%',
                background: `conic-gradient(${T}, ${N}, ${T})`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 20px',
                animation: 'spinRing 1.1s linear infinite',
              }}
            >
              <Box
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: '50%',
                  background: 'var(--ot-bg-card)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <IconSend size={22} color={T} />
              </Box>
            </Box>

            <Text fw={800} size="md" c={N} mb={8}>
              {submitMessages[submitMsgIndex]}
            </Text>
            <Text size="xs" c="dimmed">
              {t('createOrder.keep_page_open')}
            </Text>

            {/* Progress dots */}
            <Group justify="center" gap={6} mt={20}>
              {submitMessages.map((_, i) => (
                <Box
                  key={i}
                  style={{
                    width: i === submitMsgIndex ? 20 : 6,
                    height: 6,
                    borderRadius: 3,
                    background: i === submitMsgIndex ? T : `${T}44`,
                    transition: 'all 0.4s ease',
                  }}
                />
              ))}
            </Group>
          </Box>
        </Box>
      )}

      <Box style={{ width: '100%', maxWidth: 620 }}>
        {/* Back button */}
        <Group justify="space-between" mb={16}>
          <Button
            variant="subtle"
            leftSection={<IconArrowLeft size={16} />}
            onClick={() => navigate(ROUTES.clientDashboard)}
          >
            {t('nav.back_dashboard')}
          </Button>
        </Group>

        {/* Header */}
        <Stack align="center" gap={8} mb={40}>
          <Box
            style={{
              width: 56,
              height: 56,
              borderRadius: 18,
              background: `linear-gradient(135deg, ${N}, ${T})`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: `0 8px 32px ${N}44`,
            }}
          >
            <IconSend size={26} color="white" />
          </Box>
          <Text fw={900} size="xl" c={N} ta="center">
            {t('createOrder.title')}
          </Text>
          <Text size="sm" c="dimmed" ta="center">
            {t('createOrder.subtitle')}
          </Text>
        </Stack>

        {/* Location pill */}
        <Group justify="center" mb={24}>
          <Box
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 14px',
              borderRadius: 20,
              background: locationError ? '#FFF1F2' : '#F0FFF8',
              border: `1px solid ${locationError ? '#FCA5A5' : '#6EE7B7'}`,
            }}
          >
            <IconMapPin size={13} color={locationError ? '#EF4444' : T} />
            <Text size="xs" fw={600} c={locationError ? '#EF4444' : T}>
              {locationError
                ? locationError
                : locationAddress || t('createOrder.location_detecting')}
            </Text>
          </Box>
        </Group>

        {/* Success state */}
        {success && (
          <Box
            style={{
              background: '#F0FFF8',
              border: '1px solid #6EE7B7',
              borderRadius: 16,
              padding: '20px',
              marginBottom: 20,
              textAlign: 'center',
            }}
          >
            <Box
              style={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                background: `linear-gradient(135deg, #2ECC71, ${T})`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 12px',
              }}
            >
              <IconCheck size={24} color="white" />
            </Box>
            <Text fw={700} c={N}>{success}</Text>
            <Text size="xs" c="dimmed" mt={4}>
              {t('createOrder.redirecting')}
            </Text>
          </Box>
        )}

        {/* Submission error */}
        {error && (
          <Box
            style={{
              background: '#FFF1F2',
              border: '1px solid #FCA5A5',
              borderRadius: 12,
              padding: '12px 16px',
              marginBottom: 16,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <IconAlertCircle size={16} color="#EF4444" />
            <Text size="sm" c="#EF4444">{error}</Text>
          </Box>
        )}

        {/* ── TRANSCRIBING overlay ── */}
        {isTranscribing && (
          <Box
            style={{
              background: 'var(--ot-bg-card)',
              border: `2px solid ${T}`,
              borderRadius: 24,
              padding: '40px 24px',
              textAlign: 'center',
              boxShadow: `0 8px 40px ${T}22`,
            }}
          >
            <Loader size={40} color={T} style={{ marginBottom: 16 }} />
            <Text fw={700} size="md" c={N}>
              {t('createOrder.transcribing')}
            </Text>
            <Text size="xs" c="dimmed" mt={6}>
              {t('createOrder.transcribing_sub')}
            </Text>
          </Box>
        )}

        {/* ── TRANSCRIPTION ERROR ── */}
        {isVoiceError && (
          <Box
            style={{
              background: '#FFF1F2',
              border: '2px solid #FCA5A5',
              borderRadius: 24,
              padding: '28px 24px',
              textAlign: 'center',
            }}
          >
            <IconAlertCircle size={36} color="#EF4444" style={{ marginBottom: 12 }} />
            <Text fw={700} size="md" c="#EF4444" mb={6}>
              {t('createOrder.transcription_failed')}
            </Text>
            <Text size="sm" c="dimmed" mb={20}>
              {transcriptionError}
            </Text>
            <Group justify="center" gap={12}>
              <Button
                variant="outline"
                color="red"
                leftSection={<IconRefresh size={15} />}
                onClick={handleReRecord}
              >
                {t('createOrder.re_record')}
              </Button>
              <Button
                variant="subtle"
                color="gray"
                onClick={() => {
                  setVoiceState(VOICE_STATE.IDLE);
                  setTranscriptionError(null);
                  setTimeout(() => textareaRef.current?.focus(), 100);
                }}
              >
                {t('createOrder.type_manually')}
              </Button>
            </Group>
          </Box>
        )}

        {/* ── CONFIRM / EDIT TRANSCRIPTION ── */}
        {isConfirm && (
          <Box
            style={{
              background: 'var(--ot-bg-card)',
              border: `2px solid ${T}`,
              borderRadius: 24,
              padding: '20px',
              boxShadow: `0 8px 40px ${T}22`,
            }}
          >
            <Group gap={8} mb={14} px={2}>
              <Box
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  background: T,
                  flexShrink: 0,
                }}
              />
              <Text size="xs" fw={700} c={T}>
                {t('createOrder.transcribed_label')}
              </Text>
            </Group>

            <textarea
              ref={confirmTextareaRef}
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              rows={5}
              style={{
                width: '100%',
                border: '1.5px solid var(--ot-border)',
                borderRadius: 12,
                outline: 'none',
                resize: 'vertical',
                background: 'var(--ot-bg-page)',
                fontSize: 15,
                lineHeight: 1.6,
                color: 'var(--ot-text-body)',
                fontFamily: "'Inter', 'Noto Sans Ethiopic', 'Segoe UI', system-ui, sans-serif",
                padding: '10px 12px',
                boxSizing: 'border-box',
              }}
            />

            <Group justify="space-between" mt={16} gap={10}>
              <Button
                variant="outline"
                color="gray"
                leftSection={<IconRefresh size={15} />}
                onClick={handleReRecord}
                disabled={loading}
              >
                {t('createOrder.re_record')}
              </Button>

              <Button
                leftSection={<IconSend size={15} />}
                disabled={!canSubmit}
                onClick={handleSubmit}
                style={{
                  background: canSubmit
                    ? `linear-gradient(135deg, ${N}, ${T})`
                    : undefined,
                  border: 'none',
                }}
              >
                {t('createOrder.confirm_submit')}
              </Button>
            </Group>
          </Box>
        )}

        {/* ── MAIN INPUT CARD (IDLE + RECORDING) ── */}
        {!isTranscribing && !isConfirm && !isVoiceError && (
          <Box
            style={{
              background: 'var(--ot-bg-card)',
              border: `2px solid ${isRecording ? '#EF4444' : 'var(--ot-border)'}`,
              borderRadius: 24,
              padding: '16px',
              boxShadow: isRecording
                ? '0 0 0 4px rgba(239,68,68,0.15)'
                : `0 8px 40px ${N}18`,
              transition: 'all 0.3s ease',
            }}
          >
            {/* Recording indicator */}
            {isRecording && (
              <Group gap={10} mb={14} px={4} align="center">
                <Box style={{ position: 'relative', width: 32, height: 32, flexShrink: 0 }}>
                  <Box
                    style={{
                      position: 'absolute',
                      inset: 0,
                      borderRadius: '50%',
                      background: 'rgba(239,68,68,0.2)',
                      animation: 'recring 1.2s ease-out infinite',
                    }}
                  />
                  <Box
                    style={{
                      position: 'absolute',
                      inset: 4,
                      borderRadius: '50%',
                      background: '#EF4444',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      animation: 'recpulse 1.2s ease-in-out infinite',
                    }}
                  >
                    <IconMicrophone size={12} color="white" />
                  </Box>
                </Box>

                <Stack gap={0}>
                  <Text size="xs" fw={800} c="#EF4444" style={{ letterSpacing: '0.04em' }}>
                    {t('createOrder.recording')}
                  </Text>
                  <Text
                    size="xs"
                    fw={600}
                    c="#EF4444"
                    style={{ fontVariantNumeric: 'tabular-nums' }}
                  >
                    {formatTime(recordingTime)}
                  </Text>
                </Stack>
              </Group>
            )}

            {/* Textarea (IDLE mode) */}
            {!isRecording && (
              <textarea
                ref={textareaRef}
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={t('createOrder.placeholder')}
                disabled={loading}
                rows={4}
                style={{
                  width: '100%',
                  border: 'none',
                  outline: 'none',
                  resize: 'none',
                  background: 'transparent',
                  fontSize: 15,
                  lineHeight: 1.6,
                  color: 'var(--ot-text-body)',
                  fontFamily: "'Inter', 'Noto Sans Ethiopic', 'Segoe UI', system-ui, sans-serif",
                  padding: '4px',
                }}
              />
            )}

            {/* Spacer when recording */}
            {isRecording && <Box style={{ height: 60 }} />}

            {/* Bottom toolbar */}
            <Group
              justify="space-between"
              align="center"
              mt={12}
              pt={12}
              style={{ borderTop: '1px solid var(--ot-border)' }}
            >
              {/* Left: mic controls */}
              {isRecording ? (
                /* While recording — Stop + Cancel side by side */
                <Group gap={8}>
                  <Button
                    size="xs"
                    radius="xl"
                    color="red"
                    leftSection={<IconMicrophoneOff size={14} />}
                    onClick={stopRecording}
                    style={{ animation: 'micborder 1.2s ease-in-out infinite' }}
                  >
                    {t('createOrder.stop_recording')}
                  </Button>
                  <Button
                    size="xs"
                    radius="xl"
                    variant="light"
                    color="gray"
                    leftSection={<IconX size={14} />}
                    onClick={cancelRecording}
                  >
                    {t('common.cancel')}
                  </Button>
                </Group>
              ) : (
                /* Idle — mic icon button */
                <Box
                  onClick={startRecording}
                  role="button"
                  aria-label={t('createOrder.recording')}
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: `${T}18`,
                    border: `2px solid ${T}`,
                    transition: 'all 0.2s ease',
                  }}
                >
                  <IconMicrophone size={18} color={T} />
                </Box>
              )}

              {/* Right side */}
              <Group gap={10}>
                {permissionDenied && (
                  <Text size="xs" c="red">
                    {t('createOrder.mic_denied')}
                  </Text>
                )}
                {isRecording ? (
                  <Text size="xs" c="#EF4444" fw={600}>
                    {t('createOrder.tap_to_stop')}
                  </Text>
                ) : (
                  <Text size="xs" c="dimmed">
                    {t('createOrder.enter_to_submit')}
                  </Text>
                )}

                {/* Submit button (IDLE only) */}
                {!isRecording && (
                  <Box
                    onClick={canSubmit ? handleSubmit : undefined}
                    role="button"
                    aria-label={t('createOrder.confirm_submit')}
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: '50%',
                      background: canSubmit
                        ? `linear-gradient(135deg, ${N}, ${T})`
                        : 'var(--ot-border)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: canSubmit ? 'pointer' : 'default',
                      transition: 'all 0.2s ease',
                      boxShadow: canSubmit ? `0 4px 16px ${N}44` : 'none',
                    }}
                  >
                    <IconSend size={16} color="white" />
                  </Box>
                )}
              </Group>
            </Group>
          </Box>
        )}

        {/* Helper text */}
        {!isTranscribing && !isConfirm && !isVoiceError && (
          <Text size="xs" c="dimmed" ta="center" mt={16}>
            {t('createOrder.helper_text')}
          </Text>
        )}
      </Box>

      {/* ── PROVIDER SELECTION SCREEN (full-page overlay) ── */}
      {showProviderSelection && (
        <Box
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 900,
            background: 'var(--ot-bg-page)',
            overflowY: 'auto',
            padding: '24px 16px 48px',
          }}
        >
          <Box style={{ maxWidth: 620, margin: '0 auto' }}>

            {/* Header */}
            <Group justify="space-between" mb={24} align="center">
              <Button
                variant="subtle"
                leftSection={<IconArrowLeft size={16} />}
                onClick={() => navigate(`/orders/${createdOrderId}`)}
              >
                {t('createOrder.skip_selection')}
              </Button>
              <Text fw={800} size="lg" c={N}>{t('createOrder.choose_provider')}</Text>
              <Box style={{ width: 80 }} />
            </Group>

            <Text size="sm" c="dimmed" ta="center" mb={28}>
              {t('createOrder.choose_provider_sub')}
            </Text>

            {/* Error */}
            {error && (
              <Box
                style={{
                  background: '#FFF1F2', border: '1px solid #FCA5A5',
                  borderRadius: 12, padding: '12px 16px', marginBottom: 16,
                  display: 'flex', alignItems: 'center', gap: 8,
                }}
              >
                <IconAlertCircle size={16} color="#EF4444" />
                <Text size="sm" c="#EF4444">{error}</Text>
              </Box>
            )}

            {/* Loading providers */}
            {loadingProviders && (
              <Stack align="center" gap={12} py={60}>
                <Loader size={40} color={T} />
                <Text size="sm" c="dimmed">{t('createOrder.finding_providers')}</Text>
              </Stack>
            )}

            {/* Provider confirmed state */}
            {providerSelected && (
              <Box
                style={{
                  background: '#F0FFF8', border: '1.5px solid #6EE7B7',
                  borderRadius: 20, padding: '32px 24px', textAlign: 'center',
                  boxShadow: `0 8px 32px ${T}22`,
                }}
              >
                <Box
                  style={{
                    width: 64, height: 64, borderRadius: '50%',
                    background: `linear-gradient(135deg, #2ECC71, ${T})`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    margin: '0 auto 16px',
                    boxShadow: `0 6px 24px ${T}44`,
                  }}
                >
                  <IconCheck size={32} color="white" />
                </Box>
                <Text fw={800} size="xl" c={N} mb={8}>
                  {t('createOrder.request_sent_title')}
                </Text>
                <Text size="sm" c="dimmed" mb={4}>
                  {t('createOrder.request_sent_to', { name: providerSelected.full_name })}
                </Text>
                <Text size="xs" c="dimmed" mb={28}>
                  {t('createOrder.waiting_response')}
                </Text>
                <Button
                  size="md"
                  radius="xl"
                  style={{ background: `linear-gradient(135deg, ${N}, ${T})`, border: 'none' }}
                  onClick={() => navigate(`/orders/${createdOrderId}`)}
                >
                  {t('createOrder.view_order')}
                </Button>
              </Box>
            )}

            {/* Provider cards */}
            {!loadingProviders && !providerSelected && (
              <>
                {suggestedProviders.length === 0 ? (
                  <Box
                    style={{
                      background: 'var(--ot-bg-card)', border: '1px solid var(--ot-border)',
                      borderRadius: 20, padding: '40px 24px', textAlign: 'center',
                    }}
                  >
                    <Text size="xl" mb={12}>🔍</Text>
                    <Text fw={700} c={N} mb={6}>{t('createOrder.no_providers_title')}</Text>
                    <Text size="sm" c="dimmed" mb={24}>{t('createOrder.no_providers_sub')}</Text>
                    <Button
                      variant="light"
                      onClick={() => navigate(`/orders/${createdOrderId}`)}
                    >
                      {t('createOrder.view_order_anyway')}
                    </Button>
                  </Box>
                ) : (
                  <Stack gap={16}>
                    {suggestedProviders.map((provider) => (
                      <ProviderCard
                        key={provider.id}
                        provider={provider}
                        onSelect={handleSelectProvider}
                        isSelecting={selectingProvider === provider.id}
                        t={t}
                        N={N}
                        T={T}
                      />
                    ))}
                  </Stack>
                )}
              </>
            )}
          </Box>
        </Box>
      )}

      <style>{`
        @keyframes recpulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.75; transform: scale(0.88); }
        }
        @keyframes recring {
          0% { transform: scale(0.85); opacity: 0.7; }
          100% { transform: scale(1.9); opacity: 0; }
        }
        @keyframes micborder {
          0%, 100% { box-shadow: 0 0 0 0 rgba(239,68,68,0.4); }
          50% { box-shadow: 0 0 0 6px rgba(239,68,68,0); }
        }
        @keyframes spinRing {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>
    </Box>
  );
};
