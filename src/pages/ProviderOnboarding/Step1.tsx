import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Button,
  Center,
  Container,
  Group,
  Paper,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import { IconAlertCircle, IconCamera, IconRefresh } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { notifications } from '@mantine/notifications';
import * as providerService from '../../services/providerOnboardingService';
import * as authService from '../../services/authService';
import { useAuthStore } from '../../store/authStore';
import type { User } from '../../types';
import { ROUTES } from '../../utils/constants';
import { STORAGE_KEYS, storage } from '../../utils/storage';

type CaptureTarget = 'id_front_image' | 'id_back_image' | 'selfie_image';

const TARGET_LABELS: Record<CaptureTarget, string> = {
  id_front_image: 'ID Front',
  id_back_image: 'ID Back',
  selfie_image: 'Selfie',
};

export const ProviderOnboardingStep1: React.FC = () => {
  const navigate = useNavigate();
  const RESUBMIT_SUCCESS_FLAG = 'provider_verification_resubmitted';
  const [loading, setLoading] = useState(false);
  const [cameraLoading, setCameraLoading] = useState(false);
  const [activeTarget, setActiveTarget] = useState<CaptureTarget>('id_front_image');
  const [frontImage, setFrontImage] = useState<File | null>(null);
  const [backImage, setBackImage] = useState<File | null>(null);
  const [selfieImage, setSelfieImage] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isResubmissionFlow, setIsResubmissionFlow] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const previewFront = useMemo(() => (frontImage ? URL.createObjectURL(frontImage) : null), [frontImage]);
  const previewBack = useMemo(() => (backImage ? URL.createObjectURL(backImage) : null), [backImage]);
  const previewSelfie = useMemo(() => (selfieImage ? URL.createObjectURL(selfieImage) : null), [selfieImage]);

  useEffect(() => {
    return () => {
      if (previewFront) URL.revokeObjectURL(previewFront);
      if (previewBack) URL.revokeObjectURL(previewBack);
      if (previewSelfie) URL.revokeObjectURL(previewSelfie);
    };
  }, [previewFront, previewBack, previewSelfie]);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  const startCamera = async (target: CaptureTarget) => {
    try {
      setCameraLoading(true);
      setError(null);
      setCameraReady(false);
      stopCamera();

      if (!navigator.mediaDevices?.getUserMedia) {
        setError('Camera is not supported in this browser. Please use a modern browser like Chrome or Safari.');
        return;
      }

      const prefersSelfie = target === 'selfie_image';
      const constraintAttempts: MediaStreamConstraints[] = [
        {
          video: {
            facingMode: { exact: prefersSelfie ? 'user' : 'environment' },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        },
        {
          video: {
            facingMode: prefersSelfie ? 'user' : 'environment',
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        },
        {
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        },
      ];

      let stream: MediaStream | null = null;
      let lastError: unknown = null;

      for (const constraints of constraintAttempts) {
        try {
          stream = await navigator.mediaDevices.getUserMedia(constraints);
          break;
        } catch (err) {
          lastError = err;
        }
      }

      if (!stream) {
        throw lastError ?? new Error('Unable to access camera stream.');
      }

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setCameraReady(true);
      }
    } catch (err: any) {
      const reason = err?.name ? ` (${err.name})` : '';
      setError(`Unable to access camera${reason}. Please allow camera permission and try again.`);
    } finally {
      setCameraLoading(false);
    }
  };

  useEffect(() => {
    startCamera(activeTarget);
    return () => {
      stopCamera();
    };
  }, [activeTarget]);

  useEffect(() => {
    let isMounted = true;

    const loadOnboardingStatus = async () => {
      try {
        const status = await authService.getProviderOnboardingStatus();
        if (!isMounted) return;

        if (status.verification_status === 'rejected' && status.rejection_reason) {
          setRejectionReason(status.rejection_reason.trim());
          setIsResubmissionFlow(true);
        } else {
          setRejectionReason('');
          setIsResubmissionFlow(false);
        }
      } catch {
        if (isMounted) {
          setRejectionReason('');
          setIsResubmissionFlow(false);
        }
      }
    };

    loadOnboardingStatus();

    return () => {
      isMounted = false;
    };
  }, []);

  const validateCapturedFile = (selectedFile: File): boolean => {
    if (selectedFile.size > 10 * 1024 * 1024) {
      setError('Captured image size must be less than 10MB. Please capture again.');
      return false;
    }
    return true;
  };

  const captureCurrentFrame = async () => {
    if (!videoRef.current || !canvasRef.current) {
      setError('Camera is not ready yet.');
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video.videoWidth || !video.videoHeight) {
      setError('Camera stream is not ready yet.');
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const context = canvas.getContext('2d');
    if (!context) {
      setError('Unable to capture image. Please try again.');
      return;
    }

    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((result) => resolve(result), 'image/jpeg', 0.92);
    });

    if (!blob) {
      setError('Capture failed. Please retake the photo.');
      return;
    }

    const file = new File([blob], `${activeTarget}-${Date.now()}.jpg`, { type: 'image/jpeg' });
    if (!validateCapturedFile(file)) return;

    if (activeTarget === 'id_front_image') setFrontImage(file);
    if (activeTarget === 'id_back_image') setBackImage(file);
    if (activeTarget === 'selfie_image') setSelfieImage(file);
    setError(null);

    if (activeTarget === 'id_front_image') setActiveTarget('id_back_image');
    if (activeTarget === 'id_back_image') setActiveTarget('selfie_image');
  };

  const syncProviderSession = async () => {
    try {
      const latest = await authService.getProfile();
      if (latest.role !== 'provider') return;

      const verificationStatus: User['verificationStatus'] =
        latest.verification_status === 'verified'
          ? 'verified'
          : latest.verification_status === 'rejected'
            ? 'rejected'
            : latest.verification_status === 're-verification-requested'
              ? 're-verification-requested'
              : 'pending';

      const user: User = {
        id: String(latest.id),
        email: latest.email || `${latest.phone_number}@onetouch.local`,
        phone: latest.phone_number,
        role: 'provider',
        createdAt: new Date().toISOString(),
        verificationStatus,
        providerUid: latest.provider_uid,
      };

      localStorage.setItem('user', JSON.stringify(latest));
      storage.set(STORAGE_KEYS.currentUser, user);
      useAuthStore.setState({
        currentUser: user,
        isAuthenticated: true,
        clientProfile: null,
        providerProfile: null,
      });
    } catch {
      const stored = authService.getStoredUser();
      if (!stored || stored.role !== 'provider') return;

      const verificationStatus: User['verificationStatus'] =
        stored.verification_status === 'verified'
          ? 'verified'
          : stored.verification_status === 'rejected'
            ? 'rejected'
            : stored.verification_status === 're-verification-requested'
              ? 're-verification-requested'
              : 'pending';

      const user: User = {
        id: String(stored.id),
        email: stored.email || `${stored.phone_number}@onetouch.local`,
        phone: stored.phone_number,
        role: 'provider',
        createdAt: new Date().toISOString(),
        verificationStatus,
        providerUid: stored.provider_uid,
      };

      storage.set(STORAGE_KEYS.currentUser, user);
      useAuthStore.setState({
        currentUser: user,
        isAuthenticated: true,
        clientProfile: null,
        providerProfile: null,
      });
    }
  };

  const handleSubmit = async () => {
    if (!frontImage || !backImage || !selfieImage) {
      setError('Please capture ID front, ID back, and selfie images.');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      await providerService.uploadProviderManualVerification({
        id_front_image: frontImage,
        id_back_image: backImage,
        selfie_image: selfieImage,
      });

      notifications.show({
        title: 'Verification Submitted',
        message: 'Your account is under review.',
        color: 'green',
      });

      if (isResubmissionFlow) {
        sessionStorage.setItem(RESUBMIT_SUCCESS_FLAG, '1');
      }

      await syncProviderSession();
      navigate(ROUTES.providerDashboard);
    } catch (err: any) {
      const message =
        err?.response?.data?.detail ||
        err?.response?.data?.id_front_image?.[0] ||
        err?.response?.data?.id_back_image?.[0] ||
        err?.response?.data?.selfie_image?.[0] ||
        err?.response?.data?.error ||
        'Failed to submit verification images.';
      setError(message);
      notifications.show({
        title: 'Submission Failed',
        message,
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container size="md" py="xl">
      <Paper p="xl" radius="md" withBorder>
        <Stack gap="lg">
          <Title order={2}>Identity Capture</Title>
          <Text c="dimmed">Capture ID front, ID back, and selfie using live camera only.</Text>

          {rejectionReason && (
            <Alert icon={<IconAlertCircle size={16} />} color="orange">
              Admin feedback: {rejectionReason}
            </Alert>
          )}

          {error && (
            <Alert icon={<IconAlertCircle size={16} />} color="red">
              {error}
            </Alert>
          )}

          <Group>
            {(Object.keys(TARGET_LABELS) as CaptureTarget[]).map((target) => (
              <Button
                key={target}
                variant={activeTarget === target ? 'filled' : 'default'}
                onClick={() => setActiveTarget(target)}
                disabled={loading || cameraLoading}
              >
                {TARGET_LABELS[target]}
              </Button>
            ))}
          </Group>

          <Paper withBorder p="md" radius="md">
            <Stack gap="sm">
              <Text fw={600}>Live Camera — {TARGET_LABELS[activeTarget]}</Text>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                style={{ width: '100%', minHeight: 280, background: '#000', borderRadius: 8 }}
              />
              <canvas ref={canvasRef} style={{ display: 'none' }} />
              <Group>
                <Button leftSection={<IconCamera size={16} />} onClick={captureCurrentFrame} disabled={loading || cameraLoading || !cameraReady}>
                  Capture
                </Button>
                <Button
                  variant="default"
                  leftSection={<IconRefresh size={16} />}
                  onClick={() => startCamera(activeTarget)}
                  disabled={loading || cameraLoading}
                >
                  Restart Camera
                </Button>
              </Group>
            </Stack>
          </Paper>

          <Group grow align="flex-start">
            {[
              { key: 'id_front_image' as CaptureTarget, label: TARGET_LABELS.id_front_image, src: previewFront, captured: !!frontImage },
              { key: 'id_back_image' as CaptureTarget, label: TARGET_LABELS.id_back_image, src: previewBack, captured: !!backImage },
              { key: 'selfie_image' as CaptureTarget, label: TARGET_LABELS.selfie_image, src: previewSelfie, captured: !!selfieImage },
            ].map((item) => (
              <Paper key={item.key} withBorder p="sm" radius="md">
                <Stack gap="xs">
                  <Text fw={600} size="sm">{item.label}</Text>
                  {item.src ? (
                    <img src={item.src} alt={item.label} style={{ width: '100%', height: 120, objectFit: 'cover', borderRadius: 8 }} />
                  ) : (
                    <Center style={{ height: 120, borderRadius: 8, border: '1px dashed #ccc' }}>
                      <Text size="xs" c="dimmed">Not captured</Text>
                    </Center>
                  )}
                  <Button
                    size="xs"
                    variant="light"
                    onClick={() => {
                      setActiveTarget(item.key);
                      if (item.key === 'id_front_image') setFrontImage(null);
                      if (item.key === 'id_back_image') setBackImage(null);
                      if (item.key === 'selfie_image') setSelfieImage(null);
                    }}
                  >
                    {item.captured ? 'Retake' : 'Capture'}
                  </Button>
                </Stack>
              </Paper>
            ))}
          </Group>

          <Group justify="flex-end">
            <Button variant="default" onClick={() => navigate('/provider/profile-setup')} disabled={loading}>
              Back
            </Button>
            <Button onClick={handleSubmit} loading={loading} disabled={!frontImage || !backImage || !selfieImage || cameraLoading}>
              Continue
            </Button>
          </Group>
        </Stack>
      </Paper>
    </Container>
  );
};
