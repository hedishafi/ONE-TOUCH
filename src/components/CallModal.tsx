import { useEffect, useRef } from 'react';
import {
  Modal, Stack, Text, Group, Avatar,
  ActionIcon, Box, Button, Divider, Badge,
} from '@mantine/core';
import {  IconPhoneOff, IconMicrophoneOff, IconVolume, IconShieldCheck } from '@tabler/icons-react';
import { useCallFlowStore } from '../store/jobStore';
import { MOCK_PROVIDER_PROFILES } from '../mock/mockUsers';
import { COLORS } from '../utils/constants';

interface CallModalProps {
  opened: boolean;
  onClose: () => void;
  onJobCreated: (providerId: string) => void;
}

export function CallModal({ opened, onClose, onJobCreated }: CallModalProps) {
  const { callStatus, callSeconds, callProviderId, setCallStatus, tickCall, endCall } =
    useCallFlowStore();
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const provider = MOCK_PROVIDER_PROFILES.find(p => p.userId === callProviderId);

  // Simulate call progression
  useEffect(() => {
    if (!opened || !callProviderId) return;
    setCallStatus('dialing');

    const t1 = setTimeout(() => setCallStatus('ringing'), 1500);
    const t2 = setTimeout(() => setCallStatus('connected'), 4000);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [opened, callProviderId, setCallStatus]);

  // Tick timer when connected
  useEffect(() => {
    if (callStatus === 'connected') {
      timerRef.current = setInterval(() => tickCall(), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [callStatus, tickCall]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  };

  const handleEndCall = () => {
    endCall();
    onClose();
  };

  const handleCreateJob = () => {
    endCall();
    if (callProviderId) onJobCreated(callProviderId);
    onClose();
  };

  return (
    <Modal
      opened={opened}
      onClose={handleEndCall}
      centered
      withCloseButton={false}
      radius="xl"
      size="sm"
      styles={{
        content: {
          background: `linear-gradient(180deg, ${COLORS.navyBlue} 0%, ${COLORS.navyDark} 100%)`,
          overflow: 'hidden',
        },
      }}
    >
      <Stack align="center" gap="xl" py="lg">
        {/* Provider Avatar */}
        <Box style={{ position: 'relative' }}>
          <Avatar
            src={provider?.selfieUrl}
            size={96}
            radius="xl"
            style={{
              border: `3px solid ${callStatus === 'connected' ? COLORS.tealBlue : COLORS.lemonYellow}`,
              boxShadow: callStatus === 'connected'
                ? `0 0 0 8px ${COLORS.tealBlue}30`
                : 'none',
            }}
          >
            {provider?.fullName[0]}
          </Avatar>
          <Badge
            size="xs"
            color="teal"
            style={{ position: 'absolute', bottom: -4, left: '50%', transform: 'translateX(-50%)', zIndex: 1 }}
          >
            <Group gap={4}>
              <IconShieldCheck size={10} />
              <span>Verified</span>
            </Group>
          </Badge>
        </Box>

        {/* Provider info */}
        <Stack align="center" gap={4}>
          <Text fw={700} size="xl" c="white">{provider?.fullName ?? 'Provider'}</Text>
          <Text size="sm" c="rgba(255,255,255,0.6)">
            {callStatus === 'dialing' && '📡 Dialing...'}
            {callStatus === 'ringing' && '📳 Ringing...'}
            {callStatus === 'connected' && `🟢 Connected • ${formatTime(callSeconds)}`}
            {callStatus === 'ended' && '📵 Call Ended'}
            {callStatus === 'declined' && '❌ Call Declined'}
          </Text>
        </Stack>

        {/* Masked number indicator */}
        <Box
          px="md"
          py="xs"
          style={{
            background: 'rgba(255,255,255,0.08)',
            borderRadius: 8,
            border: '1px solid rgba(255,255,255,0.12)',
          }}
        >
          <Group gap="xs">
            <IconShieldCheck size={14} color={COLORS.tealBlue} />
            <Text size="xs" c="rgba(255,255,255,0.7)">
              Phone numbers masked · Internet call (free)
            </Text>
          </Group>
        </Box>

        {/* Call controls */}
        {callStatus !== 'ended' && callStatus !== 'declined' && (
          <Group gap="xl" mt="xs">
            <Stack align="center" gap={4}>
              <ActionIcon size={52} radius="xl" variant="subtle" color="gray" disabled>
                <IconMicrophoneOff size={22} color="rgba(255,255,255,0.4)" />
              </ActionIcon>
              <Text size="xs" c="rgba(255,255,255,0.4)">Mute</Text>
            </Stack>

            <Stack align="center" gap={4}>
              <ActionIcon
                size={64}
                radius="xl"
                style={{ background: '#E74C3C', boxShadow: '0 4px 16px rgba(231,76,60,0.4)' }}
                onClick={handleEndCall}
              >
                <IconPhoneOff size={26} color="white" />
              </ActionIcon>
              <Text size="xs" c="rgba(255,255,255,0.6)">End</Text>
            </Stack>

            <Stack align="center" gap={4}>
              <ActionIcon size={52} radius="xl" variant="subtle" color="gray" disabled>
                <IconVolume size={22} color="rgba(255,255,255,0.4)" />
              </ActionIcon>
              <Text size="xs" c="rgba(255,255,255,0.4)">Speaker</Text>
            </Stack>
          </Group>
        )}

        {/* CTA when connected */}
        {callStatus === 'connected' && (
          <>
            <Divider color="rgba(255,255,255,0.1)" w="100%" />
            <Button
              fullWidth
              size="md"
              style={{
                background: `linear-gradient(135deg, ${COLORS.lemonYellow} 0%, #DEC400 100%)`,
                color: COLORS.navyBlue,
                fontWeight: 700,
              }}
              onClick={handleCreateJob}
            >
              Create Job Session →
            </Button>
            <Text size="xs" c="rgba(255,255,255,0.5)" ta="center">
              This will start a payment agreement workflow
            </Text>
          </>
        )}
      </Stack>
    </Modal>
  );
}
