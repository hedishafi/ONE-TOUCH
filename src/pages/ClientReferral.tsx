import { useState } from 'react';
import { Box, Text, Group, Stack, Card, Button, Paper, Badge, Divider, ThemeIcon, Center } from '@mantine/core';
import { IconGift, IconCopy, IconShare, IconUsers, IconCheck, IconArrowRight } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { DashboardLayout } from '../components/DashboardLayout';
import { useAuthStore } from '../store/authStore';
import { COLORS } from '../utils/constants';

const N = COLORS.navyBlue;
const T = COLORS.tealBlue;

const REFERRAL_CODE = 'OT-ABEBE2024';
const FRIENDS_INVITED = 0;
const REWARDS_EARNED = 0;

export function ClientReferral() {
  const { currentUser } = useAuthStore();
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(REFERRAL_CODE).catch(() => {});
    setCopied(true);
    notifications.show({ title: 'Copied!', message: 'Referral code copied to clipboard.', color: 'teal' });
    setTimeout(() => setCopied(false), 2000);
  };

  const share = () => {
    if (navigator.share) {
      navigator.share({ title: 'Join OneTouch', text: `Use my code ${REFERRAL_CODE} to get 100 ETB off your first booking on OneTouch!`, url: 'https://onetouch.et' });
    } else {
      copy();
    }
  };

  return (
    <DashboardLayout title="Invite Friends">
      <Stack gap="lg">

        {/* Hero */}
        <Card radius="lg" p="xl" style={{ background: `linear-gradient(135deg,${N},${T})`, border: 'none' }}>
          <Stack align="center" gap="md">
            <ThemeIcon size={64} radius="xl" style={{ background: 'rgba(255,255,255,0.2)', color: 'white' }}>
              <IconGift size={32} />
            </ThemeIcon>
            <Text fw={900} size="xl" c="white" ta="center">Invite Friends, Earn Rewards</Text>
            <Text size="sm" c="rgba(255,255,255,0.8)" ta="center" maw={400}>
              Share your code. When a friend books their first service, you both get <Text span fw={800} c={COLORS.lemonYellow}>100 ETB off</Text> your next booking.
            </Text>
          </Stack>
        </Card>

        {/* Referral code */}
        <Card radius="lg" withBorder p="xl">
          <Text fw={700} mb="xs" c={N}>Your Referral Code</Text>
          <Text size="xs" c="dimmed" mb="md">Share this code with friends to earn rewards together.</Text>
          <Paper p="lg" radius="lg" style={{ background: `${T}10`, border: `2px dashed ${T}55`, textAlign: 'center' }}>
            <Text fw={900} style={{ fontSize: 28, letterSpacing: 6, color: N }}>{REFERRAL_CODE}</Text>
          </Paper>
          <Group mt="md" gap="sm">
            <Button
              size="md" radius="xl" flex={1}
              leftSection={copied ? <IconCheck size={16} /> : <IconCopy size={16} />}
              style={{ background: `linear-gradient(135deg,${N},${T})`, border: 'none' }}
              onClick={copy}
            >
              {copied ? 'Copied!' : 'Copy Code'}
            </Button>
            <Button size="md" radius="xl" flex={1} variant="light" color="teal" leftSection={<IconShare size={16} />} onClick={share}>
              Share
            </Button>
          </Group>
        </Card>

        {/* Stats */}
        <Group grow gap="md">
          {[
            { label: 'Friends Invited', value: FRIENDS_INVITED, icon: <IconUsers size={22} />, color: T },
            { label: 'Rewards Earned', value: `${REWARDS_EARNED} ETB`, icon: <IconGift size={22} />, color: N },
          ].map(s => (
            <Card key={s.label} radius="lg" withBorder p="lg" ta="center">
              <Box style={{ color: s.color, display: 'flex', justifyContent: 'center', marginBottom: 8 }}>{s.icon}</Box>
              <Text fw={900} size="xl" c={s.color}>{s.value}</Text>
              <Text size="xs" c="dimmed">{s.label}</Text>
            </Card>
          ))}
        </Group>

        {/* How it works */}
        <Card radius="lg" withBorder p="xl">
          <Text fw={700} mb="md" c={N}>How It Works</Text>
          <Stack gap="md">
            {[
              { n: '1', text: 'Share your unique referral code with friends.' },
              { n: '2', text: 'Your friend signs up and books their first service using your code.' },
              { n: '3', text: 'You both receive 100 ETB off your next booking — automatically!' },
            ].map(step => (
              <Group key={step.n} gap={12} wrap="nowrap">
                <Box w={32} h={32} style={{ borderRadius: '50%', background: `linear-gradient(135deg,${N},${T})`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Text fw={900} size="sm" c="white">{step.n}</Text>
                </Box>
                <Text size="sm" c="dimmed" style={{ lineHeight: 1.6 }}>{step.text}</Text>
              </Group>
            ))}
          </Stack>
        </Card>

        {/* Empty rewards state */}
        {REWARDS_EARNED === 0 && (
          <Paper p="xl" radius="xl" style={{ background: `${T}08`, border: `1px dashed ${T}44`, textAlign: 'center' }}>
            <Text style={{ fontSize: 40 }}>🎁</Text>
            <Text fw={700} size="md" c={N} mt="sm">Start inviting friends to earn rewards!</Text>
            <Text size="sm" c="dimmed" mt={4}>Your rewards will appear here once a friend completes their first booking.</Text>
          </Paper>
        )}

      </Stack>
    </DashboardLayout>
  );
}
