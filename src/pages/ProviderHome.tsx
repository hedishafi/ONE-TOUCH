/**
 * ProviderHome.tsx — Post-login provider landing page
 *
 * Focuses on: availability toggle · incoming requests · free trial status · earnings.
 * Never shows client-facing features.
 */
import { useState, useEffect } from 'react';
import {
  Box, Text, Group, Stack, Badge, Button, Paper, ThemeIcon, Switch,
  ActionIcon, Avatar, Divider, SimpleGrid, Progress, RingProgress,
  Center, Anchor, ScrollArea,
} from '@mantine/core';
import {
  IconBriefcase, IconTrendingUp, IconUser, IconWallet, IconStar,
  IconBell, IconBellFilled, IconMenu2, IconX, IconLogout, IconPhone,
  IconCheck, IconChevronRight, IconClock, IconMapPin, IconAlertCircle,
  IconCircleFilled, IconGift, IconShieldCheck, IconCurrencyDollar,
  IconArrowUp, IconArrowDown, IconBolt, IconTool, IconSettings,
  IconEye, IconSend,
} from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { notifications } from '@mantine/notifications';
import { useAuthStore } from '../store/authStore';
import { useJobStore, useNotificationStore } from '../store/jobStore';
import { storage, STORAGE_KEYS } from '../utils/storage';
import { COLORS, ROUTES, JOB_STATUS_CONFIG, CURRENCY_SYMBOL } from '../utils/constants';
import { MOCK_CATEGORIES } from '../mock/mockServices';
import { LOYALTY_CONFIG } from '../mock/mockLoyalty';
import { formatCurrency } from '../utils/formatting';
import type { ProviderProfile, Job } from '../types';

// ─── Free trial config ─────────────────────────────────────────────────────────
const FREE_TRIAL_TOTAL = 3;
const FREE_TRIAL_KEY = 'ot_provider_free_trials';

function getFreeTrial(userId: string): number {
  const map = storage.get<Record<string, number>>(FREE_TRIAL_KEY, {});
  return map[userId] ?? FREE_TRIAL_TOTAL;
}

function setFreeTrialCount(userId: string, count: number) {
  const map = storage.get<Record<string, number>>(FREE_TRIAL_KEY, {});
  map[userId] = count;
  storage.set(FREE_TRIAL_KEY, map);
}

// ─── Helpers ───────────────────────────────────────────────────────────────────
function eta(createdAt: string) {
  const diff = Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000);
  if (diff < 1) return 'Just now';
  if (diff < 60) return `${diff}m ago`;
  return `${Math.floor(diff / 60)}h ago`;
}

function getCategoryName(catId: string) {
  return MOCK_CATEGORIES.find(c => c.id === catId)?.name ?? 'Service';
}

function getStatusColor(s: Job['status']) {
  const map: Record<string, string> = {
    pending_agreement: 'yellow', active: 'blue', in_progress: 'teal',
    completed: 'green', cancelled: 'gray', disputed: 'red',
  };
  return map[s] ?? 'gray';
}

// Mock incoming requests (pending, aimed at current provider's category)
const MOCK_INCOMING: Omit<Job, 'providerId'>[] = [
  {
    id: 'incoming-001', clientId: 'client-003', categoryId: 'cat-001', subcategoryId: 'sub-001',
    status: 'pending_agreement', estimatedPrice: 220, commissionRate: 10, createdAt: new Date(Date.now() - 180000).toISOString(),
    isRepeatBooking: false,
    clientLocation: { lat: 9.033, lng: 38.749, address: '14 Bole Road, Addis Ababa' },
  },
  {
    id: 'incoming-002', clientId: 'client-002', categoryId: 'cat-001', subcategoryId: 'sub-003',
    status: 'pending_agreement', estimatedPrice: 85, commissionRate: 10, createdAt: new Date(Date.now() - 420000).toISOString(),
    isRepeatBooking: true,
    clientLocation: { lat: 9.029, lng: 38.744, address: '7 Kazanchis, Addis Ababa' },
  },
];

// ─── Provider Nav ──────────────────────────────────────────────────────────────
const PROVIDER_NAV = [
  { label: 'Home', icon: <IconCircleFilled size={18} />, route: ROUTES.providerDashboard },
  { label: 'Active Jobs', icon: <IconBriefcase size={18} />, route: ROUTES.providerJobs },
  { label: 'Earnings', icon: <IconTrendingUp size={18} />, route: ROUTES.providerEarnings },
  { label: 'My Profile', icon: <IconUser size={18} />, route: ROUTES.providerProfile },
  { label: 'Wallet', icon: <IconWallet size={18} />, route: ROUTES.providerWallet },
  { label: 'Loyalty & Tier', icon: <IconStar size={18} />, route: ROUTES.providerLoyalty },
];

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
export function ProviderHome() {
  const navigate = useNavigate();
  const { currentUser, providerProfile: authProfile, updateProviderOnlineStatus, logout } = useAuthStore();
  const { jobs } = useJobStore();
  const { notifications: appNotifications, fetchNotifications, unreadCount } = useNotificationStore();

  const [profile, setProfile] = useState<ProviderProfile | null>(authProfile);
  const [isOnline, setIsOnline] = useState(profile?.isOnline ?? false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [freeTrial, setFreeTrial] = useState(FREE_TRIAL_TOTAL);
  const [incoming, setIncoming] = useState(MOCK_INCOMING);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const navy = COLORS.navyBlue;
  const teal = COLORS.tealBlue;

  useEffect(() => {
    if (!currentUser) { navigate(ROUTES.login); return; }
    const profiles = storage.get<ProviderProfile[]>(STORAGE_KEYS.providerProfiles, []);
    const p = profiles.find(x => x.userId === currentUser.id);
    if (p) { setProfile(p); setIsOnline(p.isOnline); }
    setFreeTrial(getFreeTrial(currentUser.id));
    fetchNotifications(currentUser.id);
  }, [currentUser]);

  // ── My jobs (completed only — for earnings) ──────────────────────────────────
  const myJobs = jobs.filter(j => j.providerId === currentUser?.id);
  const completed = myJobs.filter(j => j.status === 'completed');
  const inProgress = myJobs.filter(j => ['active', 'in_progress'].includes(j.status));
  const todayEarnings = completed
    .filter(j => j.completedAt && new Date(j.completedAt).toDateString() === new Date().toDateString())
    .reduce((sum, j) => sum + (j.netProviderEarning ?? j.estimatedPrice * 0.9), 0);
  const totalEarnings = completed.reduce((sum, j) => sum + (j.netProviderEarning ?? j.estimatedPrice * 0.9), 0);

  // Tier
  const providerTier = profile?.loyaltyTier ?? 'rising_pro';
  const tierInfo = LOYALTY_CONFIG.providerTiers.find(t => t.tier === providerTier);
  const effectiveCommission = 10 - (tierInfo?.commissionDiscount ?? 0);
  const visibleIncoming = incoming.filter(r => !dismissed.has(r.id));

  // ── Toggle online ────────────────────────────────────────────────────────────
  function handleToggle(val: boolean) {
    setIsOnline(val);
    updateProviderOnlineStatus(val);
    notifications.show({
      title: val ? 'You are now Online' : 'You are now Offline',
      message: val
        ? 'Incoming job requests will appear here.'
        : 'You will not receive new job requests while offline.',
      color: val ? 'teal' : 'gray',
    });
  }

  // ── Accept request ───────────────────────────────────────────────────────────
  function acceptRequest(req: typeof MOCK_INCOMING[0]) {
    if (!isOnline) {
      notifications.show({ title: 'Go Online first', message: 'Toggle your status to receive jobs.', color: 'orange' });
      return;
    }
    const trialLeft = freeTrial;
    if (trialLeft > 0) {
      const newCount = trialLeft - 1;
      setFreeTrial(newCount);
      if (currentUser) setFreeTrialCount(currentUser.id, newCount);
      notifications.show({
        title: 'Job accepted — Free trial used',
        message: `${newCount} free confirmation${newCount !== 1 ? 's' : ''} remaining.`,
        color: 'teal',
      });
    } else {
      notifications.show({
        title: 'Job accepted — Commission will apply',
        message: `${effectiveCommission}% commission will be deducted from this job.`,
        color: 'blue',
      });
    }
    setDismissed(d => new Set([...d, req.id]));
  }

  // ── Decline request ──────────────────────────────────────────────────────────
  function declineRequest(id: string) {
    setDismissed(d => new Set([...d, id]));
    notifications.show({ title: 'Request declined', message: 'It will be sent to another provider.', color: 'gray' });
  }

  // ─── SIDEBAR ────────────────────────────────────────────────────────────────
  const Sidebar = (
    <Box style={{
      position: 'fixed', top: 0, left: 0, height: '100vh', width: 260, zIndex: 300,
      background: 'var(--ot-bg-card)', borderRight: '1px solid var(--ot-border)',
      transform: sidebarOpen ? 'translateX(0)' : 'translateX(-260px)',
      transition: 'transform 0.28s cubic-bezier(0.22,1,0.36,1)',
      display: 'flex', flexDirection: 'column',
    }}>
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

      <Box p="md">
        <Group gap={10}>
          <Avatar radius="xl" size="md" color="blue">
            {profile?.fullName?.charAt(0) ?? currentUser?.phone?.charAt(0) ?? 'P'}
          </Avatar>
          <Box>
            <Text size="sm" fw={700} c="var(--ot-text-body)" lineClamp={1}>{profile?.fullName ?? 'Provider'}</Text>
            <Group gap={6}>
              <Badge size="xs" variant="light" color="blue">{tierInfo?.label ?? 'Rising Pro'}</Badge>
              <Box w={6} h={6} style={{ borderRadius: '50%', background: isOnline ? COLORS.success : 'var(--ot-border)' }} />
              <Text size={10} c={isOnline ? COLORS.success : 'var(--ot-text-muted)'} fw={600}>
                {isOnline ? 'Online' : 'Offline'}
              </Text>
            </Group>
          </Box>
        </Group>
      </Box>

      <Divider />

      <Stack gap={2} p="sm" style={{ flex: 1 }}>
        {PROVIDER_NAV.map(n => (
          <Box key={n.label} p={10} style={{
            borderRadius: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10,
            color: 'var(--ot-text-body)', fontWeight: 600, fontSize: 14,
          }}
            onClick={() => { navigate(n.route); setSidebarOpen(false); }}>
            {n.icon} {n.label}
          </Box>
        ))}
      </Stack>

      <Box p="md" style={{ borderTop: '1px solid var(--ot-border)' }}>
        <Box p={10} style={{
          borderRadius: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, color: COLORS.error,
        }} onClick={() => { logout(); navigate(ROUTES.login); }}>
          <IconLogout size={18} /> Sign out
        </Box>
      </Box>
    </Box>
  );

  // ─── RENDER ─────────────────────────────────────────────────────────────────
  return (
    <Box style={{ minHeight: '100vh', background: 'var(--ot-bg-page)' }}>
      {/* Sidebar overlay */}
      {sidebarOpen && (
        <Box style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 299 }}
          onClick={() => setSidebarOpen(false)} />
      )}
      {Sidebar}

      {/* ── Top header ─────────────────────────────────────────────────────── */}
      <Box style={{
        position: 'sticky', top: 0, zIndex: 200,
        background: 'var(--ot-bg-card)', borderBottom: '1px solid var(--ot-border)',
      }}>
        <Box px={20} py={14} style={{ maxWidth: 960, margin: '0 auto' }}>
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
                <Text fw={800} size="sm" c={navy} visibleFrom="sm">OneTouch Provider</Text>
              </Group>
            </Group>
            <Group gap={10}>
              <ActionIcon variant="subtle" size="lg" style={{ position: 'relative' }}>
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
              <Avatar radius="xl" size="sm" color="blue" style={{ cursor: 'pointer' }}
                onClick={() => setSidebarOpen(true)}>
                {profile?.fullName?.charAt(0) ?? 'P'}
              </Avatar>
            </Group>
          </Group>
        </Box>
      </Box>

      {/* ── Body ───────────────────────────────────────────────────────────── */}
      <Box style={{ maxWidth: 960, margin: '0 auto', padding: '28px 20px 80px' }}>
        <Stack gap={28}>

          {/* ══ 1. AVAILABILITY HERO ════════════════════════════════════════ */}
          <Paper
            p="xl" radius="xl"
            style={{
              background: isOnline
                ? `linear-gradient(135deg, ${navy}ee, ${teal}ee)`
                : 'var(--ot-bg-card)',
              border: isOnline ? 'none' : '2px solid var(--ot-border)',
              transition: 'all 0.4s ease',
            }}
          >
            <Group justify="space-between" wrap="nowrap">
              <Box>
                <Group gap={10} mb={6}>
                  <Box
                    w={12} h={12}
                    style={{
                      borderRadius: '50%',
                      background: isOnline ? '#2ECC71' : '#aaa',
                      boxShadow: isOnline ? '0 0 0 4px rgba(46,204,113,0.3)' : 'none',
                      transition: 'all 0.3s',
                    }}
                  />
                  <Text fw={800} size="lg" c={isOnline ? 'white' : 'var(--ot-text-navy)'}>
                    {isOnline ? 'You are Online' : 'You are Offline'}
                  </Text>
                </Group>
                <Text size="sm" c={isOnline ? 'rgba(255,255,255,0.8)' : 'var(--ot-text-sub)'}>
                  {isOnline
                    ? 'Incoming job requests are being sent to you now.'
                    : 'Toggle Online to start receiving job requests.'}
                </Text>
                {isOnline && (
                  <Group gap={8} mt={14}>
                    <Badge variant="light" color="yellow" size="sm" leftSection={<IconBolt size={10} />}>
                      Actively receiving requests
                    </Badge>
                    {inProgress.length > 0 && (
                      <Badge variant="light" color="teal" size="sm">
                        {inProgress.length} job{inProgress.length > 1 ? 's' : ''} in progress
                      </Badge>
                    )}
                  </Group>
                )}
              </Box>

              <Switch
                checked={isOnline}
                onChange={e => handleToggle(e.currentTarget.checked)}
                size="xl"
                color="teal"
                onLabel="ON"
                offLabel="OFF"
                styles={{
                  track: {
                    border: '2px solid rgba(255,255,255,0.3)',
                    background: isOnline ? '#2ECC71' : '#ccc',
                    cursor: 'pointer',
                  },
                  thumb: { background: 'white', border: 'none' },
                }}
              />
            </Group>
          </Paper>

          {/* ══ 2. FREE TRIAL STATUS ════════════════════════════════════════ */}
          <Paper p="lg" radius="xl" style={{ background: 'var(--ot-bg-card)', border: '1px solid var(--ot-border)' }}>
            <Group justify="space-between" mb={12} wrap="nowrap">
              <Group gap={10}>
                <ThemeIcon size={38} radius="xl" variant="light" color="yellow">
                  <IconGift size={19} />
                </ThemeIcon>
                <Box>
                  <Text fw={700} size="sm" c="var(--ot-text-body)">Free Trial Confirmations</Text>
                  <Text size="xs" c="var(--ot-text-sub)">Accept jobs at zero commission during your trial</Text>
                </Box>
              </Group>
              <Badge
                size="lg" variant="filled"
                color={freeTrial > 0 ? 'teal' : 'red'}
                style={{ fontWeight: 800, fontSize: 15, minWidth: 48, textAlign: 'center' }}
              >
                {freeTrial}/{FREE_TRIAL_TOTAL}
              </Badge>
            </Group>

            <Progress
              value={(freeTrial / FREE_TRIAL_TOTAL) * 100}
              color={freeTrial > 1 ? 'teal' : freeTrial === 1 ? 'orange' : 'red'}
              size="md" radius="xl" mb={10}
            />

            {freeTrial === 0 ? (
              <Group gap={6}>
                <IconAlertCircle size={14} color={COLORS.error} />
                <Text size="xs" c={COLORS.error} fw={600}>
                  Free trial used. Jobs accepted from now will incur a {effectiveCommission}% commission via Chapa.
                </Text>
              </Group>
            ) : (
              <Group gap={6}>
                <IconShieldCheck size={14} color={teal} />
                <Text size="xs" c={teal} fw={600}>
                  Next {freeTrial} job acceptance{freeTrial > 1 ? 's' : ''} are free — enjoy zero commission!
                </Text>
              </Group>
            )}
          </Paper>

          {/* ══ 3. QUICK STATS ROW ══════════════════════════════════════════ */}
          <SimpleGrid cols={{ base: 2, sm: 4 }} spacing={14}>
            {[
              {
                label: "Today's Earnings", value: `${CURRENCY_SYMBOL} ${todayEarnings.toFixed(0)}`,
                icon: <IconCurrencyDollar size={20} />, color: COLORS.success,
                sub: todayEarnings > 0 ? '+from completed jobs' : 'Complete a job to earn',
              },
              {
                label: 'Total Earned', value: `${CURRENCY_SYMBOL} ${totalEarnings.toFixed(0)}`,
                icon: <IconTrendingUp size={20} />, color: navy,
                sub: `${completed.length} job${completed.length !== 1 ? 's' : ''} completed`,
              },
              {
                label: 'Your Rating', value: `${(profile?.rating ?? 0).toFixed(1)} ★`,
                icon: <IconStar size={20} />, color: COLORS.warning,
                sub: `${profile?.totalJobsCompleted ?? 0} reviews`,
              },
              {
                label: 'Completion Rate', value: `${profile?.completionRate ?? 0}%`,
                icon: <IconCheck size={20} />, color: teal,
                sub: `${profile?.responseRate ?? 0}% response rate`,
              },
            ].map(s => (
              <Paper key={s.label} p="md" radius="xl"
                style={{ background: 'var(--ot-bg-card)', border: '1px solid var(--ot-border)' }}>
                <Group gap={10} mb={8}>
                  <Box style={{
                    width: 36, height: 36, borderRadius: 10, background: `${s.color}18`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', color: s.color,
                  }}>
                    {s.icon}
                  </Box>
                </Group>
                <Text fw={800} size="lg" c={s.color}>{s.value}</Text>
                <Text size="11px" c="var(--ot-text-muted)" fw={500}>{s.label}</Text>
                <Text size="10px" c="var(--ot-text-muted)" mt={2}>{s.sub}</Text>
              </Paper>
            ))}
          </SimpleGrid>

          {/* ══ 4. INCOMING REQUESTS ════════════════════════════════════════ */}
          <Box>
            <Group justify="space-between" mb={14}>
              <Group gap={10}>
                <Text fw={800} size="md" c={navy}>Incoming Requests</Text>
                {visibleIncoming.length > 0 && (
                  <Badge size="sm" color="yellow" variant="filled" style={{ animation: 'blink 2s infinite' }}>
                    {visibleIncoming.length} new
                  </Badge>
                )}
              </Group>
              <Anchor size="sm" c={teal} style={{ cursor: 'pointer' }} onClick={() => navigate(ROUTES.providerJobs)}>
                View all jobs
              </Anchor>
              <style>{`@keyframes blink{0%,100%{opacity:1}50%{opacity:0.5}}`}</style>
            </Group>

            {!isOnline ? (
              <Paper p="xl" radius="xl" style={{
                background: 'var(--ot-bg-card)', border: '2px dashed var(--ot-border)', textAlign: 'center',
              }}>
                <Stack align="center" gap={10}>
                  <ThemeIcon size={56} radius="xl" variant="light" color="gray">
                    <IconPhone size={28} />
                  </ThemeIcon>
                  <Text fw={700} c="var(--ot-text-sub)">You're offline</Text>
                  <Text size="sm" c="var(--ot-text-muted)" style={{ maxWidth: 260 }}>
                    Toggle your status to Online above to start receiving job requests.
                  </Text>
                </Stack>
              </Paper>
            ) : visibleIncoming.length === 0 ? (
              <Paper p="xl" radius="xl" style={{ background: 'var(--ot-bg-card)', border: '1px solid var(--ot-border)', textAlign: 'center' }}>
                <Stack align="center" gap={10}>
                  <ThemeIcon size={56} radius="xl" variant="light" color="teal">
                    <IconBell size={28} />
                  </ThemeIcon>
                  <Text fw={700} c="var(--ot-text-sub)">No new requests right now</Text>
                  <Text size="sm" c="var(--ot-text-muted)">Stay online — requests will appear here in real time.</Text>
                </Stack>
              </Paper>
            ) : (
              <Stack gap={14}>
                {visibleIncoming.map(req => {
                  const cat = MOCK_CATEGORIES.find(c => c.id === req.categoryId);
                  const priceAfterCommission = req.estimatedPrice * (1 - effectiveCommission / 100);
                  const isFreeAccept = freeTrial > 0;
                  return (
                    <Paper key={req.id} p="lg" radius="xl"
                      style={{ background: 'var(--ot-bg-card)', border: `2px solid ${COLORS.warning}40` }}>
                      <Stack gap={12}>
                        {/* Request header */}
                        <Group justify="space-between" wrap="nowrap">
                          <Group gap={12} wrap="nowrap">
                            <Box style={{
                              width: 44, height: 44, borderRadius: 12, background: `${cat?.color ?? teal}18`,
                              display: 'flex', alignItems: 'center', justifyContent: 'center', color: cat?.color ?? teal, flexShrink: 0,
                            }}>
                              <IconTool size={22} />
                            </Box>
                            <Box>
                              <Group gap={8}>
                                <Text size="sm" fw={700} c="var(--ot-text-body)">{cat?.name ?? 'Service'}</Text>
                                {req.isRepeatBooking && <Badge size="xs" color="violet" variant="light">Repeat client</Badge>}
                              </Group>
                              <Group gap={8} mt={2}>
                                <Group gap={4}>
                                  <IconClock size={11} color="var(--ot-text-muted)" />
                                  <Text size="xs" c="var(--ot-text-muted)">{eta(req.createdAt)}</Text>
                                </Group>
                                <Group gap={4}>
                                  <IconMapPin size={11} color="var(--ot-text-muted)" />
                                  <Text size="xs" c="var(--ot-text-muted)" lineClamp={1} style={{ maxWidth: 160 }}>
                                    {req.clientLocation?.address ?? 'Location not set'}
                                  </Text>
                                </Group>
                              </Group>
                            </Box>
                          </Group>
                          <Badge color="yellow" variant="light" size="sm">New</Badge>
                        </Group>

                        {/* Price breakdown */}
                        <Paper p="md" radius="lg" style={{ background: 'var(--ot-bg-row)', border: '1px solid var(--ot-border)' }}>
                          <SimpleGrid cols={3} spacing={8}>
                            <Box ta="center">
                              <Text size="xs" c="var(--ot-text-muted)" mb={2}>Estimated job</Text>
                              <Text fw={800} size="sm" c="var(--ot-text-body)">
                                {CURRENCY_SYMBOL} {req.estimatedPrice}
                              </Text>
                            </Box>
                            <Box ta="center">
                              <Text size="xs" c="var(--ot-text-muted)" mb={2}>
                                {isFreeAccept ? 'Commission' : `Commission (${effectiveCommission}%)`}
                              </Text>
                              {isFreeAccept ? (
                                <Badge size="xs" color="teal" variant="light">FREE TRIAL</Badge>
                              ) : (
                                <Text fw={700} size="sm" c={COLORS.error}>
                                  − {CURRENCY_SYMBOL} {(req.estimatedPrice * effectiveCommission / 100).toFixed(0)}
                                </Text>
                              )}
                            </Box>
                            <Box ta="center">
                              <Text size="xs" c="var(--ot-text-muted)" mb={2}>You receive</Text>
                              <Text fw={800} size="sm" c={COLORS.success}>
                                {CURRENCY_SYMBOL} {isFreeAccept ? req.estimatedPrice : priceAfterCommission.toFixed(0)}
                              </Text>
                            </Box>
                          </SimpleGrid>
                        </Paper>

                        {/* CTA row */}
                        <Group gap={10}>
                          <Button
                            flex={1} size="sm" radius="xl"
                            style={{ background: `linear-gradient(135deg, ${navy}, ${teal})`, border: 'none' }}
                            leftSection={<IconCheck size={15} />}
                            onClick={() => acceptRequest(req)}
                          >
                            Accept{isFreeAccept ? ' (Free trial)' : ''}
                          </Button>
                          <Button
                            size="sm" radius="xl" variant="light" color="gray"
                            leftSection={<IconEye size={15} />}
                            onClick={() => navigate(ROUTES.providerJobs)}
                          >
                            Details
                          </Button>
                          <ActionIcon
                            size="lg" radius="xl" variant="light" color="red"
                            onClick={() => declineRequest(req.id)}
                          >
                            <IconX size={16} />
                          </ActionIcon>
                        </Group>
                      </Stack>
                    </Paper>
                  );
                })}
              </Stack>
            )}
          </Box>

          {/* ══ 5. RECENT COMPLETED JOBS ════════════════════════════════════ */}
          {completed.length > 0 && (
            <Box>
              <Group justify="space-between" mb={14}>
                <Text fw={800} size="md" c={navy}>Recent Completed Jobs</Text>
                <Anchor size="sm" c={teal} style={{ cursor: 'pointer' }} onClick={() => navigate(ROUTES.providerEarnings)}>
                  View earnings
                </Anchor>
              </Group>
              <Stack gap={10}>
                {completed.slice(0, 4).map(job => {
                  const cat = MOCK_CATEGORIES.find(c => c.id === job.categoryId);
                  return (
                    <Paper key={job.id} p="md" radius="xl"
                      style={{ background: 'var(--ot-bg-card)', border: '1px solid var(--ot-border)' }}>
                      <Group justify="space-between" wrap="nowrap">
                        <Group gap={12} wrap="nowrap">
                          <Box style={{
                            width: 38, height: 38, borderRadius: 10, background: `${cat?.color ?? teal}18`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center', color: cat?.color ?? teal, flexShrink: 0,
                          }}>
                            <IconBriefcase size={18} />
                          </Box>
                          <Box>
                            <Text size="sm" fw={700} c="var(--ot-text-body)">{cat?.name ?? 'Service'}</Text>
                            <Group gap={6} mt={2}>
                              <Badge size="xs" color="green" variant="light">Completed</Badge>
                              <Text size="xs" c="var(--ot-text-muted)">
                                {job.completedAt ? new Date(job.completedAt).toLocaleDateString() : '—'}
                              </Text>
                            </Group>
                          </Box>
                        </Group>
                        <Box ta="right" style={{ flexShrink: 0 }}>
                          <Text fw={800} size="sm" c={COLORS.success}>
                            +{CURRENCY_SYMBOL} {(job.netProviderEarning ?? job.estimatedPrice * 0.9).toFixed(0)}
                          </Text>
                          <Text size="xs" c="var(--ot-text-muted)">
                            {job.commissionAmount ? `−${CURRENCY_SYMBOL} ${job.commissionAmount.toFixed(0)} commission` : 'Free trial'}
                          </Text>
                        </Box>
                      </Group>
                    </Paper>
                  );
                })}
              </Stack>
            </Box>
          )}

          {/* ══ 6. TIER & LOYALTY CARD ══════════════════════════════════════ */}
          <Paper p="lg" radius="xl" style={{
            background: `linear-gradient(135deg, ${navy}10, ${teal}12)`,
            border: `1px solid ${teal}30`,
          }}>
            <Group justify="space-between" wrap="nowrap">
              <Group gap={14}>
                <Box style={{
                  width: 48, height: 48, borderRadius: '50%', flexShrink: 0,
                  background: `linear-gradient(135deg, ${tierInfo?.color ?? teal}, ${teal})`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <IconStar size={22} color="white" />
                </Box>
                <Box>
                  <Text fw={800} size="sm" c={navy}>{tierInfo?.label ?? 'Rising Pro'}</Text>
                  <Text size="xs" c="var(--ot-text-sub)">
                    {tierInfo?.commissionDiscount ? `${tierInfo.commissionDiscount}% commission discount applied` : 'Complete 50+ jobs to unlock Trusted Pro'}
                  </Text>
                  <Group gap={6} mt={4}>
                    {(tierInfo?.benefits ?? []).slice(0, 2).map((b, i) => (
                      <Badge key={i} size="xs" variant="light" color="teal">{b}</Badge>
                    ))}
                  </Group>
                </Box>
              </Group>
              <Button
                size="xs" variant="light" color="blue"
                rightSection={<IconChevronRight size={13} />}
                onClick={() => navigate(ROUTES.providerLoyalty)}
              >
                View tier
              </Button>
            </Group>
          </Paper>
        </Stack>
      </Box>
    </Box>
  );
}

export default ProviderHome;
