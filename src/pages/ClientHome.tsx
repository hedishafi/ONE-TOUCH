/**
 * ClientHome.tsx — Post-login client landing page
 *
 * Primary flow: Pick a service category → voice assistant call simulation
 * → job request created with price range → status tracking.
 *
 * Completely separate from Provider experience.
 */
import { useState, useEffect, useRef } from 'react';
import {
  Box, Text, Group, Stack, SimpleGrid, Badge, Button, Modal,
  ThemeIcon, Paper, Divider, ActionIcon, Avatar, Anchor, Center,
  RingProgress, Transition, Loader,
} from '@mantine/core';
import {
  IconCar, IconSparkles, IconDroplets, IconBolt, IconTruck,
  IconHeart, IconSchool, IconTool, IconBell, IconBellFilled,
  IconPhone, IconPhoneOff, IconMicrophone, IconMicrophoneOff,
  IconCheck, IconClock, IconCircleFilled, IconChevronRight,
  IconArrowRight, IconWifi, IconLogout, IconMenu2, IconX, IconUser,
  IconHistory, IconWallet, IconStar, IconMessageCircle, IconAlertCircle,
  IconPlayerStop, IconVolume, IconMessage,
} from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { notifications } from '@mantine/notifications';
import { useAuthStore } from '../store/authStore';
import { useJobStore, useNotificationStore } from '../store/jobStore';
import { storage, STORAGE_KEYS } from '../utils/storage';
import { COLORS, ROUTES, JOB_STATUS_CONFIG, CURRENCY_SYMBOL } from '../utils/constants';
import { MOCK_CATEGORIES } from '../mock/mockServices';
import type { ClientProfile, Job, Category } from '../types';

// ─── Category icon map ─────────────────────────────────────────────────────────
const CATEGORY_ICON: Record<string, React.ReactNode> = {
  'cat-001': <IconCar size={26} />,
  'cat-002': <IconSparkles size={26} />,
  'cat-003': <IconDroplets size={26} />,
  'cat-004': <IconBolt size={26} />,
  'cat-005': <IconTruck size={26} />,
  'cat-006': <IconHeart size={26} />,
  'cat-007': <IconSchool size={26} />,
};

// ─── Call flow stages ──────────────────────────────────────────────────────────
type CallStage = 'dialing' | 'connected' | 'listening' | 'processing' | 'done';

const PRICE_RANGES: Record<string, [number, number]> = {
  'cat-001': [120, 350], 'cat-002': [60, 180], 'cat-003': [80, 250],
  'cat-004': [90, 300], 'cat-005': [150, 500], 'cat-006': [30, 120],
  'cat-007': [25, 90],
};

const ASSISTANT_PROMPTS = [
  'Hi there! I can hear you clearly. Please describe the service you need in as much detail as possible.',
  "I understand. Can you also tell me your approximate location or address?",
];

// ─── Helpers ───────────────────────────────────────────────────────────────────
function greet(name: string) {
  const h = new Date().getHours();
  const time = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  return `${time}, ${name.split(' ')[0]}! 👋`;
}

function statusColor(s: Job['status']) {
  const map: Record<string, string> = {
    pending_agreement: 'yellow', active: 'blue', in_progress: 'teal',
    completed: 'green', cancelled: 'gray', disputed: 'red',
  };
  return map[s] ?? 'gray';
}

function eta(createdAt: string) {
  const diff = Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000);
  if (diff < 1) return 'Just now';
  if (diff < 60) return `${diff}m ago`;
  return `${Math.floor(diff / 60)}h ago`;
}

// ─── Voice wave animation ──────────────────────────────────────────────────────
function VoiceWave({ active }: { active: boolean }) {
  const bars = [3, 6, 10, 8, 4, 9, 6, 3, 7, 5, 8, 4];
  return (
    <Group gap={3} align="flex-end" justify="center" style={{ height: 40 }}>
      {bars.map((h, i) => (
        <Box
          key={i}
          style={{
            width: 4,
            height: active ? h * 3.2 : 8,
            borderRadius: 2,
            background: active
              ? `linear-gradient(180deg, ${COLORS.tealBlue}, ${COLORS.navyBlue})`
              : 'var(--ot-border)',
            animation: active ? `wave-${i % 4} 0.8s ease-in-out infinite alternate` : 'none',
            animationDelay: `${i * 0.07}s`,
            transition: 'height 0.3s ease',
          }}
        />
      ))}
      <style>{`
        @keyframes wave-0 { from { transform: scaleY(0.5); } to { transform: scaleY(1); } }
        @keyframes wave-1 { from { transform: scaleY(0.7); } to { transform: scaleY(1.2); } }
        @keyframes wave-2 { from { transform: scaleY(0.4); } to { transform: scaleY(1); } }
        @keyframes wave-3 { from { transform: scaleY(0.6); } to { transform: scaleY(1.1); } }
      `}</style>
    </Group>
  );
}

// ─── Typing indicator ──────────────────────────────────────────────────────────
function TypingDots() {
  return (
    <Group gap={4} align="center">
      {[0, 1, 2].map(i => (
        <Box key={i} style={{
          width: 7, height: 7, borderRadius: '50%',
          background: COLORS.tealBlue, opacity: 0.7,
          animation: 'blink 1.2s ease-in-out infinite',
          animationDelay: `${i * 0.25}s`,
        }} />
      ))}
      <style>{`@keyframes blink { 0%,80%,100%{opacity:0.2} 40%{opacity:1} }`}</style>
    </Group>
  );
}

// ─── Nav sidebar ──────────────────────────────────────────────────────────────
const CLIENT_NAV = [
  { label: 'Home', icon: <IconCircleFilled size={18} />, route: ROUTES.clientDashboard },
  { label: 'My Requests', icon: <IconHistory size={18} />, route: ROUTES.clientHistory },
  { label: 'Wallet', icon: <IconWallet size={18} />, route: ROUTES.clientWallet },
  { label: 'Rewards', icon: <IconStar size={18} />, route: ROUTES.clientLoyalty },
];

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
export function ClientHome() {
  const navigate = useNavigate();
  const { currentUser, clientProfile: authProfile, logout } = useAuthStore();
  const { jobs, createJob } = useJobStore();
  const { notifications: appNotifications, fetchNotifications, unreadCount } = useNotificationStore();

  const [profile, setProfile] = useState<ClientProfile | null>(authProfile);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  // Call modal state
  const [callOpen, setCallOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [callStage, setCallStage] = useState<CallStage>('dialing');
  const [promptIdx, setPromptIdx] = useState(0);
  const [transcript, setTranscript] = useState<{ from: 'assistant' | 'user'; text: string }[]>([]);
  const [userTyping, setUserTyping] = useState('');
  const [assistantTyping, setAssistantTyping] = useState(false);
  const [createdJob, setCreatedJob] = useState<Job | null>(null);
  const transcriptEnd = useRef<HTMLDivElement>(null);

  // My requests (from newer → older)
  const myJobs = jobs
    .filter(j => j.clientId === currentUser?.id)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 6);

  const activeJobs = myJobs.filter(j => ['active', 'in_progress', 'pending_agreement'].includes(j.status));

  useEffect(() => {
    if (!currentUser) { navigate(ROUTES.login); return; }
    const profiles = storage.get<ClientProfile[]>(STORAGE_KEYS.clientProfiles, []);
    const p = profiles.find(x => x.userId === currentUser.id);
    if (p) setProfile(p);
    fetchNotifications(currentUser.id);
  }, [currentUser]);

  useEffect(() => { transcriptEnd.current?.scrollIntoView({ behavior: 'smooth' }); }, [transcript]);

  // ── Start call flow ──────────────────────────────────────────────────────────
  function openCall(cat: Category) {
    setSelectedCategory(cat);
    setCallStage('dialing');
    setTranscript([]);
    setUserTyping('');
    setPromptIdx(0);
    setCreatedJob(null);
    setCallOpen(true);

    // Simulate ring → connect
    setTimeout(() => {
      setCallStage('connected');
      setTimeout(() => {
        setCallStage('listening');
        setAssistantTyping(true);
        setTimeout(() => {
          setAssistantTyping(false);
          setTranscript([{ from: 'assistant', text: ASSISTANT_PROMPTS[0] }]);
        }, 1400);
      }, 1200);
    }, 2200);
  }

  // ── Send user response ───────────────────────────────────────────────────────
  function sendUserMessage() {
    if (!userTyping.trim() || callStage !== 'listening') return;
    const msg = userTyping.trim();
    setTranscript(t => [...t, { from: 'user', text: msg }]);
    setUserTyping('');

    if (promptIdx === 0) {
      // Ask for location
      setAssistantTyping(true);
      setTimeout(() => {
        setAssistantTyping(false);
        setTranscript(t => [...t, { from: 'assistant', text: ASSISTANT_PROMPTS[1] }]);
        setPromptIdx(1);
      }, 1500);
    } else {
      // Wrap up
      setTranscript(t => [...t, {
        from: 'assistant',
        text: 'Thank you! Please wait a moment while we prepare your request.',
      }]);
      setCallStage('processing');
      setTimeout(() => finalize(msg), 2500);
    }
  }

  // ── Create job internally ────────────────────────────────────────────────────
  function finalize(description: string) {
    if (!selectedCategory || !currentUser) return;
    const [lo, hi] = PRICE_RANGES[selectedCategory.id] ?? [80, 200];
    const estimated = Math.round(lo + Math.random() * (hi - lo));
    const sub = selectedCategory.subcategories[0];
    const job = createJob({
      clientId: currentUser.id,
      providerId: '',
      categoryId: selectedCategory.id,
      subcategoryId: sub?.id ?? '',
      status: 'pending_agreement',
      estimatedPrice: estimated,
      commissionRate: 10,
      isRepeatBooking: false,
      clientLocation: { lat: 9.032, lng: 38.747, address: description },
    });
    setCreatedJob(job);
    setCallStage('done');
  }

  function closeCall() {
    setCallOpen(false);
    if (createdJob) {
      notifications.show({
        title: 'Request submitted!',
        message: 'We are finding available providers near you.',
        color: 'teal',
      });
    }
  }

  const navy = COLORS.navyBlue;
  const teal = COLORS.tealBlue;

  // ─── SIDEBAR ────────────────────────────────────────────────────────────────
  const Sidebar = (
    <Box style={{
      position: 'fixed', top: 0, left: 0, height: '100vh', width: 260, zIndex: 300,
      background: 'var(--ot-bg-card)', borderRight: '1px solid var(--ot-border)',
      transform: sidebarOpen ? 'translateX(0)' : 'translateX(-260px)',
      transition: 'transform 0.28s cubic-bezier(0.22,1,0.36,1)',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Brand */}
      <Box p="lg" style={{ borderBottom: '1px solid var(--ot-border)' }}>
        <Group justify="space-between">
          <Group gap={10}>
            <Box w={34} h={34} style={{
              borderRadius: 10, background: navy,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Text fw={900} size="xs" c="white">OT</Text>
            </Box>
            <Text fw={800} size="sm" c={navy}>OneTouch</Text>
          </Group>
          <ActionIcon variant="subtle" onClick={() => setSidebarOpen(false)}><IconX size={18} /></ActionIcon>
        </Group>
      </Box>

      {/* Profile chip */}
      <Box p="md">
        <Group gap={10}>
          <Avatar radius="xl" size="md" color="teal">
            {profile?.fullName?.charAt(0) ?? currentUser?.phone?.charAt(0) ?? 'C'}
          </Avatar>
          <Box>
            <Text size="sm" fw={700} c="var(--ot-text-body)" lineClamp={1}>
              {profile?.fullName ?? 'Client'}
            </Text>
            <Badge size="xs" variant="light" color="teal">{profile?.loyaltyTier ?? 'bronze'}</Badge>
          </Box>
        </Group>
      </Box>

      <Divider />

      {/* Nav links */}
      <Stack gap={2} p="sm" style={{ flex: 1 }}>
        {CLIENT_NAV.map(n => (
          <Box
            key={n.label}
            p={10}
            style={{
              borderRadius: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10,
              color: 'var(--ot-text-body)', fontWeight: 600, fontSize: 14,
            }}
            onClick={() => { navigate(n.route); setSidebarOpen(false); }}
          >
            {n.icon} {n.label}
          </Box>
        ))}
      </Stack>

      {/* Logout */}
      <Box p="md" style={{ borderTop: '1px solid var(--ot-border)' }}>
        <Box
          p={10} style={{ borderRadius: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, color: COLORS.error }}
          onClick={() => { logout(); navigate(ROUTES.login); }}
        >
          <IconLogout size={18} /> Sign out
        </Box>
      </Box>
    </Box>
  );

  // ─── CALL MODAL CONTENT ─────────────────────────────────────────────────────
  const CallContent = (
    <Stack gap="lg" style={{ minHeight: 380 }}>
      {/* Dialing */}
      {callStage === 'dialing' && (
        <Center style={{ flex: 1, flexDirection: 'column', gap: 20, paddingTop: 40 }}>
          <Box style={{
            width: 80, height: 80, borderRadius: '50%',
            background: `linear-gradient(135deg, ${navy}, ${teal})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            animation: 'pulse-ring 1.2s ease-out infinite',
          }}>
            <IconPhone size={36} color="white" />
          </Box>
          <Text fw={700} size="lg" c={navy}>Connecting…</Text>
          <Text size="sm" c="var(--ot-text-sub)">Reaching OneTouch voice assistant</Text>
          <style>{`@keyframes pulse-ring { 0%{box-shadow:0 0 0 0 rgba(0,128,128,0.5)} 70%{box-shadow:0 0 0 20px transparent} 100%{box-shadow:0 0 0 0 transparent} }`}</style>
        </Center>
      )}

      {/* Connected splash */}
      {callStage === 'connected' && (
        <Center style={{ flex: 1, flexDirection: 'column', gap: 16, paddingTop: 32 }}>
          <ThemeIcon size={72} radius="xl" style={{ background: `linear-gradient(135deg, ${navy}, ${teal})` }}>
            <IconVolume size={36} color="white" />
          </ThemeIcon>
          <Text fw={700} size="lg" c={navy}>Connected!</Text>
          <VoiceWave active={true} />
          <Text size="sm" c="var(--ot-text-sub)">OneTouch Assistant is ready</Text>
        </Center>
      )}

      {/* Listening — transcript + input */}
      {callStage === 'listening' && (
        <Stack gap="md">
          {/* Header */}
          <Group>
            <Box w={10} h={10} style={{ borderRadius: '50%', background: COLORS.success, animation: 'blink 1.4s infinite' }} />
            <Text size="sm" fw={600} c={teal}>Live call · {selectedCategory?.name}</Text>
            <style>{`@keyframes blink{0%,100%{opacity:1}50%{opacity:0.3}}`}</style>
          </Group>

          {/* Voice wave */}
          <VoiceWave active={true} />

          {/* Transcript */}
          <Box style={{
            background: 'var(--ot-bg-row)', borderRadius: 12, padding: 14,
            maxHeight: 220, overflowY: 'auto', border: '1px solid var(--ot-border)',
          }}>
            <Stack gap={10}>
              {transcript.map((msg, i) => (
                <Box key={i} style={{ textAlign: msg.from === 'assistant' ? 'left' : 'right' }}>
                  <Box style={{
                    display: 'inline-block', padding: '8px 14px', borderRadius: 12,
                    background: msg.from === 'assistant'
                      ? 'var(--ot-bg-card)'
                      : `linear-gradient(135deg, ${navy}, ${teal})`,
                    color: msg.from === 'assistant' ? 'var(--ot-text-body)' : 'white',
                    maxWidth: '85%', fontSize: 13, fontWeight: 500,
                  }}>
                    {msg.text}
                  </Box>
                </Box>
              ))}
              {assistantTyping && (
                <Box style={{ textAlign: 'left' }}>
                  <Box style={{
                    display: 'inline-block', padding: '10px 14px', borderRadius: 12,
                    background: 'var(--ot-bg-card)', border: '1px solid var(--ot-border)',
                  }}>
                    <TypingDots />
                  </Box>
                </Box>
              )}
              <div ref={transcriptEnd} />
            </Stack>
          </Box>

          {/* Input */}
          {!assistantTyping && transcript.length > 0 && (
            <Group gap={8}>
              <Box
                component="input"
                value={userTyping}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUserTyping(e.target.value)}
                onKeyDown={(e: React.KeyboardEvent) => e.key === 'Enter' && sendUserMessage()}
                placeholder="Type your response (simulating voice)…"
                style={{
                  flex: 1, padding: '10px 14px', borderRadius: 10, fontSize: 14,
                  background: 'var(--ot-bg-row)', border: '1px solid var(--ot-border-input)',
                  color: 'var(--ot-text-body)', outline: 'none',
                }}
              />
              <Button
                size="sm" onClick={sendUserMessage}
                style={{ background: `linear-gradient(135deg, ${navy}, ${teal})`, border: 'none', borderRadius: 10 }}
              >
                <IconArrowRight size={16} />
              </Button>
            </Group>
          )}
        </Stack>
      )}

      {/* Processing */}
      {callStage === 'processing' && (
        <Center style={{ flex: 1, flexDirection: 'column', gap: 20, paddingTop: 40 }}>
          <Loader size="lg" color="teal" type="dots" />
          <Text fw={700} size="lg" c={navy}>Preparing your request…</Text>
          <Text size="sm" c="var(--ot-text-sub)">Our system is analysing your service description</Text>
        </Center>
      )}

      {/* Done */}
      {callStage === 'done' && createdJob && (
        <Stack gap="md" pt={8}>
          <Center>
            <ThemeIcon size={64} radius="xl" color="teal" variant="light">
              <IconCheck size={34} />
            </ThemeIcon>
          </Center>
          <Text ta="center" fw={800} size="lg" c={navy}>Request Created!</Text>
          <Paper p="md" radius="md" style={{ background: 'var(--ot-bg-row)', border: '1px solid var(--ot-border)' }}>
            <Stack gap={8}>
              <Group justify="space-between">
                <Text size="sm" c="var(--ot-text-sub)">Service</Text>
                <Text size="sm" fw={700}>{selectedCategory?.name}</Text>
              </Group>
              <Group justify="space-between">
                <Text size="sm" c="var(--ot-text-sub)">Request ID</Text>
                <Text size="xs" ff="monospace" c={teal}>{createdJob.id}</Text>
              </Group>
              <Group justify="space-between">
                <Text size="sm" c="var(--ot-text-sub)">Estimated range</Text>
                <Text size="sm" fw={700} c={teal}>
                  {CURRENCY_SYMBOL} {Math.round(createdJob.estimatedPrice * 0.85)}–{Math.round(createdJob.estimatedPrice * 1.2)}
                </Text>
              </Group>
              <Divider my={4} />
              <Group gap={6}>
                <Box w={8} h={8} style={{ borderRadius: '50%', background: COLORS.warning }} />
                <Text size="xs" c="var(--ot-text-sub)">Waiting for providers to respond</Text>
              </Group>
            </Stack>
          </Paper>
          <Button
            fullWidth size="md" onClick={closeCall}
            style={{ background: `linear-gradient(135deg, ${navy}, ${teal})`, border: 'none' }}
          >
            Done — Track my Request
          </Button>
        </Stack>
      )}
    </Stack>
  );

  // ─── RENDER ─────────────────────────────────────────────────────────────────
  return (
    <Box style={{ minHeight: '100vh', background: 'var(--ot-bg-page)' }}>
      {/* Sidebar overlay */}
      {sidebarOpen && (
        <Box
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 299 }}
          onClick={() => setSidebarOpen(false)}
        />
      )}
      {Sidebar}

      {/* Top header */}
      <Box style={{
        position: 'sticky', top: 0, zIndex: 200,
        background: 'var(--ot-bg-card)', borderBottom: '1px solid var(--ot-border)',
      }}>
        <Box px={20} py={14} style={{ maxWidth: 900, margin: '0 auto' }}>
          <Group justify="space-between">
            <Group gap={12}>
              <ActionIcon variant="subtle" onClick={() => setSidebarOpen(true)} size="lg">
                <IconMenu2 size={22} />
              </ActionIcon>
              <Group gap={8}>
                <Box w={32} h={32} style={{
                  borderRadius: 9, background: navy,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Text fw={900} size={11} c="white">OT</Text>
                </Box>
                <Text fw={800} size="sm" c={navy} visibleFrom="sm">OneTouch</Text>
              </Group>
            </Group>
            <Group gap={10}>
              <ActionIcon
                variant="subtle" size="lg"
                style={{ position: 'relative' }}
                onClick={() => setNotifOpen(o => !o)}
              >
                {unreadCount > 0 ? <IconBellFilled size={22} color={teal} /> : <IconBell size={22} />}
                {unreadCount > 0 && (
                  <Box style={{
                    position: 'absolute', top: 2, right: 2, width: 16, height: 16, borderRadius: '50%',
                    background: COLORS.error, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Text size={9} c="white" fw={700}>{unreadCount}</Text>
                  </Box>
                )}
              </ActionIcon>
              <Avatar radius="xl" size="sm" color="teal" style={{ cursor: 'pointer' }}
                onClick={() => setSidebarOpen(true)}>
                {profile?.fullName?.charAt(0) ?? 'C'}
              </Avatar>
            </Group>
          </Group>
        </Box>
      </Box>

      {/* Page body */}
      <Box style={{ maxWidth: 900, margin: '0 auto', padding: '28px 20px 80px' }}>
        <Stack gap={32}>

          {/* ── Hero greeting ─────────────────────────────────────────────── */}
          <Box>
            <Text size="xl" fw={800} c={navy} mb={4}>
              {greet(profile?.fullName ?? 'there')}
            </Text>
            <Text size="sm" c="var(--ot-text-sub)">
              What service do you need today? Select a category below and we'll connect you right away.
            </Text>
          </Box>

          {/* ── Active job banner ─────────────────────────────────────────── */}
          {activeJobs.length > 0 && (
            <Paper p="md" radius="xl" style={{
              background: `linear-gradient(135deg, ${navy}10, ${teal}15)`,
              border: `1px solid ${teal}30`,
            }}>
              <Group justify="space-between" wrap="nowrap">
                <Group gap={12}>
                  <ThemeIcon variant="light" color="teal" size={42} radius="xl">
                    <IconCircleFilled size={14} style={{ color: COLORS.success }} />
                  </ThemeIcon>
                  <Box>
                    <Text fw={700} size="sm" c={navy}>
                      {activeJobs.length} active request{activeJobs.length > 1 ? 's' : ''}
                    </Text>
                    <Text size="xs" c="var(--ot-text-sub)">
                      {activeJobs[0].status === 'pending_agreement'
                        ? 'Waiting for provider response'
                        : activeJobs[0].status === 'in_progress'
                        ? 'Your service is in progress'
                        : 'Provider confirmed — awaiting start'}
                    </Text>
                  </Box>
                </Group>
                <Button
                  size="xs" variant="light" color="teal"
                  rightSection={<IconChevronRight size={14} />}
                  onClick={() => navigate(ROUTES.clientHistory)}
                >
                  Track
                </Button>
              </Group>
            </Paper>
          )}

          {/* ── Request a Service ─────────────────────────────────────────── */}
          <Box>
            <Group justify="space-between" mb={16}>
              <Box>
                <Text fw={800} size="lg" c={navy}>Request a Service</Text>
                <Text size="xs" c="var(--ot-text-sub)">Tap a category — we'll call you with our assistant</Text>
              </Box>
            </Group>

            <SimpleGrid cols={{ base: 2, xs: 3, sm: 4 }} spacing={14}>
              {MOCK_CATEGORIES.map(cat => (
                <Box
                  key={cat.id}
                  onClick={() => openCall(cat)}
                  style={{
                    background: 'var(--ot-bg-card)',
                    border: '1px solid var(--ot-border)',
                    borderRadius: 16,
                    padding: '20px 14px',
                    textAlign: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.18s ease',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLElement).style.transform = 'translateY(-3px)';
                    (e.currentTarget as HTMLElement).style.boxShadow = `0 8px 24px ${cat.color}25`;
                    (e.currentTarget as HTMLElement).style.borderColor = cat.color;
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
                    (e.currentTarget as HTMLElement).style.boxShadow = 'none';
                    (e.currentTarget as HTMLElement).style.borderColor = 'var(--ot-border)';
                  }}
                >
                  <Box style={{
                    width: 52, height: 52, borderRadius: 14,
                    background: `${cat.color}18`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: cat.color,
                  }}>
                    {CATEGORY_ICON[cat.id] ?? <IconTool size={26} />}
                  </Box>
                  <Text size="xs" fw={700} c="var(--ot-text-body)" style={{ lineHeight: 1.3 }}>{cat.name}</Text>
                  <Group gap={4}>
                    <IconPhone size={11} color={teal} />
                    <Text size={10} c={teal} fw={600}>Tap to call</Text>
                  </Group>
                </Box>
              ))}
            </SimpleGrid>
          </Box>

          {/* ── How it works ──────────────────────────────────────────────── */}
          <Paper p="lg" radius="xl" style={{ background: `${navy}08`, border: `1px solid ${navy}15` }}>
            <Text fw={700} size="sm" c={navy} mb={14}>How requesting works</Text>
            <SimpleGrid cols={{ base: 1, sm: 3 }} spacing={16}>
              {[
                { n: '1', title: 'Pick a category', sub: 'Choose the type of service you need.' },
                { n: '2', title: 'Voice assistant calls', sub: 'Describe your problem verbally — our assistant listens.' },
                { n: '3', title: 'Job created & priced', sub: 'We find the best provider and give you a price estimate.' },
              ].map(s => (
                <Group key={s.n} gap={12} align="flex-start">
                  <Box style={{
                    width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                    background: `linear-gradient(135deg, ${navy}, ${teal})`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Text size="xs" fw={800} c="white">{s.n}</Text>
                  </Box>
                  <Box>
                    <Text size="sm" fw={700} c={navy}>{s.title}</Text>
                    <Text size="xs" c="var(--ot-text-sub)">{s.sub}</Text>
                  </Box>
                </Group>
              ))}
            </SimpleGrid>
          </Paper>

          {/* ── Recent requests ───────────────────────────────────────────── */}
          {myJobs.length > 0 && (
            <Box>
              <Group justify="space-between" mb={14}>
                <Text fw={800} size="md" c={navy}>Recent Requests</Text>
                <Anchor onClick={() => navigate(ROUTES.clientHistory)} size="sm" c={teal} style={{ cursor: 'pointer' }}>
                  View all
                </Anchor>
              </Group>
              <Stack gap={10}>
                {myJobs.map(job => {
                  const cat = MOCK_CATEGORIES.find(c => c.id === job.categoryId);
                  const color = statusColor(job.status);
                  const label = JOB_STATUS_CONFIG[job.status]?.label ?? job.status;
                  return (
                    <Paper key={job.id} p="md" radius="xl"
                      style={{ background: 'var(--ot-bg-card)', border: '1px solid var(--ot-border)', cursor: 'pointer' }}>
                      <Group justify="space-between" wrap="nowrap">
                        <Group gap={12} wrap="nowrap">
                          <Box style={{
                            width: 40, height: 40, borderRadius: 12, background: `${cat?.color ?? teal}18`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: cat?.color ?? teal, flexShrink: 0,
                          }}>
                            {CATEGORY_ICON[job.categoryId] ?? <IconTool size={20} />}
                          </Box>
                          <Box>
                            <Text size="sm" fw={700} c="var(--ot-text-body)" lineClamp={1}>{cat?.name ?? 'Service'}</Text>
                            <Group gap={6} mt={2}>
                              <Badge size="xs" color={color} variant="light">{label}</Badge>
                              <Text size="xs" c="var(--ot-text-muted)">{eta(job.createdAt)}</Text>
                            </Group>
                          </Box>
                        </Group>
                        <Box style={{ textAlign: 'right', flexShrink: 0 }}>
                          <Text size="sm" fw={700} c={teal}>
                            {CURRENCY_SYMBOL} {job.finalPrice ?? job.estimatedPrice}
                          </Text>
                          <Text size="xs" c="var(--ot-text-muted)">
                            {job.finalPrice ? 'Final' : 'Estimate'}
                          </Text>
                        </Box>
                      </Group>
                    </Paper>
                  );
                })}
              </Stack>
            </Box>
          )}

          {/* ── Empty state ────────────────────────────────────────────────── */}
          {myJobs.length === 0 && (
            <Center py={40}>
              <Stack align="center" gap={12}>
                <ThemeIcon size={70} radius="xl" color="teal" variant="light">
                  <IconMessageCircle size={36} />
                </ThemeIcon>
                <Text fw={700} size="md" c={navy}>No requests yet</Text>
                <Text size="sm" c="var(--ot-text-sub)" ta="center" style={{ maxWidth: 280 }}>
                  Pick a service category above to make your first request. It takes under 2 minutes.
                </Text>
              </Stack>
            </Center>
          )}
        </Stack>
      </Box>

      {/* ── Call modal ──────────────────────────────────────────────────────── */}
      <Modal
        opened={callOpen}
        onClose={() => { if (callStage === 'done' || callStage === 'dialing') closeCall(); }}
        title={
          <Group gap={10}>
            <Box w={10} h={10} style={{ borderRadius: '50%', background: callStage === 'listening' ? COLORS.success : COLORS.warning }} />
            <Text fw={700} c={navy}>
              {callStage === 'dialing' ? 'Calling Assistant…'
                : callStage === 'connected' ? 'Call Connected'
                : callStage === 'listening' ? 'Describing your request'
                : callStage === 'processing' ? 'Processing…'
                : 'Request Confirmed'}
            </Text>
          </Group>
        }
        centered
        radius="xl"
        size="md"
        withCloseButton={callStage === 'done'}
        styles={{
          content: { background: 'var(--ot-bg-page)', border: '1px solid var(--ot-border)' },
          header: { background: 'var(--ot-bg-page)', borderBottom: '1px solid var(--ot-border)' },
        }}
      >
        {CallContent}
      </Modal>
    </Box>
  );
}

export default ClientHome;
