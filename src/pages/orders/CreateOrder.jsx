import { useEffect, useRef, useState } from 'react';
import { Box, Text, Group, Stack, Loader } from '@mantine/core';
import { IconMicrophone, IconSend, IconMapPin, 
         IconAlertCircle, IconCheck, IconMicrophoneOff } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { createOrder } from '../../api/ordersApi';

const N = '#000080';
const T = '#008080';

export const CreateOrder = () => {
  const { i18n } = useTranslation();
  const navigate = useNavigate();
  const isAmharic = i18n.language === 'am';

  const [latitude, setLatitude] = useState(null);
  const [longitude, setLongitude] = useState(null);
  const [locationError, setLocationError] = useState(null);
  const [locationAddress, setLocationAddress] = useState('');

  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState(null);
  const [textInput, setTextInput] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [permissionDenied, setPermissionDenied] = useState(false);

  const mediaRecorderRef = useRef(null);
  const timerIntervalRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLatitude(position.coords.latitude);
          setLongitude(position.coords.longitude);
          setLocationAddress(`${position.coords.latitude.toFixed(4)}, ${position.coords.longitude.toFixed(4)}`);
          setLocationError(null);
        },
        () => {
          setLocationError(isAmharic ? 'ሥፍራ ማግኘት አልተቻለም' : 'Location unavailable');
        }
      );
    }
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      const chunks = [];
      mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/wav' });
        setAudioBlob(blob);
      };
      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      setPermissionDenied(false);
      timerIntervalRef.current = setInterval(() => {
        setRecordingTime((t) => t + 1);
      }, 1000);
    } catch {
      setPermissionDenied(true);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach((t) => t.stop());
      setIsRecording(false);
      clearInterval(timerIntervalRef.current);
    }
  };

  const formatTime = (s) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  const handleSubmit = async () => {
    const hasText = textInput.trim();
    const hasVoice = audioBlob;

    if (!hasText && !hasVoice) {
      setError(isAmharic ? 'ጽሑፍ ያስገቡ ወይም ድምጽ ይቅዱ' : 'Type your request or record voice');
      return;
    }
    if (latitude === null || longitude === null) {
      setError(isAmharic ? 'ሥፍራ ያስፈልጋል' : 'Location is required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      if (hasVoice && !hasText) {
        formData.append('input_type', 'voice');
        formData.append('voice_file', audioBlob, 'recording.wav');
      } else {
        formData.append('input_type', 'text');
        formData.append('transcription', textInput);
      }
      formData.append('client_latitude', latitude);
      formData.append('client_longitude', longitude);

      const response = await createOrder(formData);
      setSuccess(isAmharic ? 'ቅደም ቁጥር ተፈጠረ!' : 'Order created!');
      setTimeout(() => navigate(`/orders/${response.order_id}`), 1800);
    } catch (err) {
      setError(typeof err === 'string' ? err : err.detail || (isAmharic ? 'ስህተት' : 'Error creating order'));
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const canSubmit = (textInput.trim() || audioBlob) && !loading;

  return (
    <Box style={{
      minHeight: '100vh',
      background: 'var(--ot-bg-page)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px 16px',
    }}>
      <Box style={{ width: '100%', maxWidth: 620 }}>

        {/* Header */}
        <Stack align="center" gap={8} mb={40}>
          <Box style={{
            width: 56, height: 56, borderRadius: 18,
            background: `linear-gradient(135deg, ${N}, ${T})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: `0 8px 32px ${N}44`,
          }}>
            <IconSend size={26} color="white" />
          </Box>
          <Text fw={900} size="xl" c={N} ta="center">
            {isAmharic ? 'አዲስ ቅደም ቁጥር' : 'New Service Request'}
          </Text>
          <Text size="sm" c="dimmed" ta="center">
            {isAmharic ? 'ጽሑፍ ያስገቡ ወይም ድምጽ ይቅዱ' : 'Type your request or tap the mic to speak'}
          </Text>
        </Stack>

        {/* Location pill */}
        <Group justify="center" mb={24}>
          <Box style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '6px 14px', borderRadius: 20,
            background: locationError ? '#FFF1F2' : '#F0FFF8',
            border: `1px solid ${locationError ? '#FCA5A5' : '#6EE7B7'}`,
          }}>
            <IconMapPin size={13} color={locationError ? '#EF4444' : T} />
            <Text size="xs" fw={600} c={locationError ? '#EF4444' : T}>
              {locationError ? locationError : locationAddress || (isAmharic ? 'ሥፍራ እየተፈለገ...' : 'Detecting location...')}
            </Text>
          </Box>
        </Group>

        {/* Success state */}
        {success && (
          <Box style={{
            background: '#F0FFF8', border: '1px solid #6EE7B7',
            borderRadius: 16, padding: '20px', marginBottom: 20, textAlign: 'center',
          }}>
            <Box style={{
              width: 48, height: 48, borderRadius: '50%',
              background: `linear-gradient(135deg, #2ECC71, ${T})`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 12px',
            }}>
              <IconCheck size={24} color="white" />
            </Box>
            <Text fw={700} c={N}>{success}</Text>
            <Text size="xs" c="dimmed" mt={4}>
              {isAmharic ? 'እየተላኩ ነው...' : 'Redirecting to your order...'}
            </Text>
          </Box>
        )}

        {/* Error */}
        {error && (
          <Box style={{
            background: '#FFF1F2', border: '1px solid #FCA5A5',
            borderRadius: 12, padding: '12px 16px', marginBottom: 16,
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <IconAlertCircle size={16} color="#EF4444" />
            <Text size="sm" c="#EF4444">{error}</Text>
          </Box>
        )}

        {/* Main input card */}
        <Box style={{
          background: 'var(--ot-bg-card)',
          border: `2px solid ${isRecording ? '#EF4444' : 'var(--ot-border)'}`,
          borderRadius: 24,
          padding: '16px',
          boxShadow: isRecording
            ? '0 0 0 4px rgba(239,68,68,0.15)'
            : `0 8px 40px ${N}18`,
          transition: 'all 0.3s ease',
        }}>

          {/* Recording indicator */}
          {isRecording && (
            <Group gap={8} mb={12} px={4}>
              <Box style={{
                width: 8, height: 8, borderRadius: '50%',
                background: '#EF4444',
                animation: 'recpulse 1s ease-in-out infinite',
              }} />
              <Text size="xs" fw={700} c="#EF4444">
                {isAmharic ? 'እየተቀዳ ነው' : 'Recording'} — {formatTime(recordingTime)}
              </Text>
            </Group>
          )}

          {/* Voice recorded indicator */}
          {audioBlob && !isRecording && (
            <Group gap={8} mb={12} px={4}>
              <IconCheck size={14} color={T} />
              <Text size="xs" fw={600} c={T}>
                {isAmharic ? 'ድምጽ ተቀዷል' : 'Voice recorded'} — {formatTime(recordingTime)}
              </Text>
              <Text
                size="xs" c="dimmed" style={{ cursor: 'pointer', textDecoration: 'underline' }}
                onClick={() => { setAudioBlob(null); setRecordingTime(0); }}
              >
                {isAmharic ? 'አጥፋ' : 'Remove'}
              </Text>
            </Group>
          )}

          {/* Textarea */}
          <textarea
            ref={textareaRef}
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isAmharic
              ? 'የሚፈልጉትን አገልግሎት ይግለጹ... (ለምሳሌ: ቧምቧ ጥገና)'
              : 'Describe the service you need... (e.g. Fix a leaking pipe)'}
            disabled={loading || isRecording}
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
              fontFamily: 'inherit',
              padding: '4px',
            }}
          />

          {/* Bottom toolbar */}
          <Group justify="space-between" align="center" mt={12} pt={12}
            style={{ borderTop: '1px solid var(--ot-border)' }}>

            {/* Mic button */}
            <Box
              onClick={isRecording ? stopRecording : startRecording}
              style={{
                width: 40, height: 40, borderRadius: '50%', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: isRecording ? '#FEE2E2' : `${T}18`,
                border: `2px solid ${isRecording ? '#EF4444' : T}`,
                transition: 'all 0.2s ease',
              }}
            >
              {isRecording
                ? <IconMicrophoneOff size={18} color="#EF4444" />
                : <IconMicrophone size={18} color={T} />}
            </Box>

            {/* Right side */}
            <Group gap={10}>
              {permissionDenied && (
                <Text size="xs" c="red">
                  {isAmharic ? 'ማይክ ፈቃድ የለም' : 'Mic permission denied'}
                </Text>
              )}
              <Text size="xs" c="dimmed">
                {isAmharic ? 'Enter ለማስገባት' : 'Enter to submit'}
              </Text>

              {/* Submit button */}
              <Box
                onClick={canSubmit ? handleSubmit : undefined}
                style={{
                  width: 40, height: 40, borderRadius: '50%',
                  background: canSubmit
                    ? `linear-gradient(135deg, ${N}, ${T})`
                    : 'var(--ot-border)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: canSubmit ? 'pointer' : 'default',
                  transition: 'all 0.2s ease',
                  boxShadow: canSubmit ? `0 4px 16px ${N}44` : 'none',
                }}
              >
                {loading
                  ? <Loader size={16} color="white" />
                  : <IconSend size={16} color="white" />}
              </Box>
            </Group>
          </Group>
        </Box>

        {/* Helper text */}
        <Text size="xs" c="dimmed" ta="center" mt={16}>
          {isAmharic
            ? 'ጽሑፍ ይጻፉ ወይም 🎤 ን ይጫኑ • GPS ሥፍራ ተይዟል'
            : 'Type your request or tap 🎤 to record • GPS location captured'}
        </Text>
      </Box>

      <style>{`
        @keyframes recpulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(1.3); }
        }
      `}</style>
    </Box>
  );
};
