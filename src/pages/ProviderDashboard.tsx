import { useState, useEffect } from 'react';
import {
  Box, Text, Group, Stack, SimpleGrid, Card, Badge, Button, Tabs,
  Table, ScrollArea, Progress, RingProgress, Paper, Divider,
  ThemeIcon, Center, Alert, NumberInput, Select, Textarea,
  FileButton, Avatar, Switch, Slider, ActionIcon, Timeline,
} from '@mantine/core';
import {
  IconBriefcase, IconWallet, IconUser, IconStar, IconTrendingUp,
  IconCheck, IconClock, IconMapPin, IconPhoto, IconUpload,
  IconEdit, IconArrowUp, IconArrowDown, IconGift, IconTrophy,
  IconBolt, IconShieldCheck, IconPhone, IconCircleFilled,
  IconBell, IconCurrencyDollar,
} from '@tabler/icons-react';
import { BarChart } from '@mantine/charts';
import { useTranslation } from 'react-i18next';
import { notifications } from '@mantine/notifications';
import { DashboardLayout } from '../components/DashboardLayout';
import { JobCard } from '../components/JobCard';
import { StatusBadge } from '../components/StatusBadge';
import { useAuthStore } from '../store/authStore';
import { useJobStore } from '../store/jobStore';
import { storage, STORAGE_KEYS } from '../utils/storage';
import { formatCurrency, formatTimeAgo, formatProviderTier } from '../utils/formatting';
import { COLORS, ROUTES, PROVIDER_TIER_COLORS } from '../utils/constants';
import { MOCK_CATEGORIES } from '../mock/mockServices';
import { LOYALTY_CONFIG } from '../mock/mockLoyalty';
import type { NavItem, WalletTransaction, ProviderProfile } from '../types';

const PROVIDER_NAV: NavItem[] = [
  { path: ROUTES.providerDashboard, label: 'Active Jobs', icon: <IconBriefcase size={18} /> },
  { path: ROUTES.providerEarnings, label: 'Earnings', icon: <IconTrendingUp size={18} /> },
  { path: ROUTES.providerProfile, label: 'My Profile', icon: <IconUser size={18} /> },
  { path: ROUTES.providerWallet, label: 'Provider Wallet', icon: <IconWallet size={18} /> },
  { path: ROUTES.providerLoyalty, label: 'Loyalty & Tier', icon: <IconStar size={18} /> },
];

// ─── ACTIVE JOBS ─────────────────────────────────────────────────────────────
export function ActiveJobs() {
  const { t } = useTranslation();
  const { currentUser } = useAuthStore();
  const { jobs } = useJobStore();
  const [hasIncoming, setHasIncoming] = useState(true);

  const myJobs = jobs.filter(j => j.providerId === currentUser?.id);
  const grouped: Record<string, typeof myJobs> = {
    pending_agreement: myJobs.filter(j => j.status === 'pending_agreement'),
    in_progress: myJobs.filter(j => j.status === 'in_progress'),
    active: myJobs.filter(j => j.status === 'active'),
    completed: myJobs.filter(j => j.status === 'completed'),
  };

  return (
    <DashboardLayout navItems={PROVIDER_NAV} title={t('provider.my_jobs')}>
      <Stack gap="md">
        {/* Incoming call banner */}
        {hasIncoming && (
          <Paper
            p="md"
            radius="xl"
            style={{
              background: `linear-gradient(135deg, ${COLORS.tealBlue} 0%, ${COLORS.tealDark} 100%)`,
              animation: 'pulse 2s infinite',
            }}
          >
            <Group justify="space-between">
              <Group gap="md">
                <ThemeIcon size={48} radius="xl" color="white" variant="filled" style={{ background: 'rgba(255,255,255,0.2)' }}>
                  <IconPhone size={24} color={COLORS.tealBlue} />
                </ThemeIcon>
                <Stack gap={2}>
                  <Text fw={700} c="white">Incoming Call from Alex J.</Text>
                  <Text size="sm" c="rgba(255,255,255,0.8)">House Cleaning · 3.2 km away · $80/session</Text>
                </Stack>
              </Group>
              <Group>
                <Button variant="white" color="red" size="sm" radius="xl" onClick={() => setHasIncoming(false)}>
                  Decline
                </Button>
                <Button color="yellow" size="sm" radius="xl" onClick={() => { setHasIncoming(false); notifications.show({ title: 'Call Accepted!', message: 'Job session started', color: 'teal' }); }}>
                  Accept
                </Button>
              </Group>
            </Group>
          </Paper>
        )}

        {myJobs.length === 0 ? (
          <Center py={60}>
            <Stack align="center" gap="sm">
              <ThemeIcon size={56} radius="xl" color="gray" variant="light">
                <IconBriefcase size={28} />
              </ThemeIcon>
              <Text c="dimmed">{t('provider.no_jobs')}</Text>
              <Text size="xs" c="dimmed">Set yourself as Online to receive job requests</Text>
            </Stack>
          </Center>
        ) : (
          <>
            {Object.entries(grouped).filter(([, items]) => items.length > 0).map(([status, items]) => (
              <Stack key={status} gap="sm">
                <Group gap="xs">
                  <StatusBadge status={status as any} />
                  <Text size="sm" c="dimmed">({items.length})</Text>
                </Group>
                {items.map(job => (
                  <JobCard key={job.id} job={job} role="provider" />
                ))}
              </Stack>
            ))}
          </>
        )}
      </Stack>
    </DashboardLayout>
  );
}

// ─── EARNINGS ─────────────────────────────────────────────────────────────────
export function Earnings() {
  const { t } = useTranslation();
  const { currentUser } = useAuthStore();
  const txns = storage.get<WalletTransaction[]>(STORAGE_KEYS.walletTransactions, [])
    .filter(tx => tx.userId === currentUser?.id);

  const totalEarned = txns.filter(t => t.type === 'job_payment' || t.type === 'cashback').reduce((s, t) => s + Math.abs(t.amount), 0);
  const totalCommission = txns.filter(t => t.type === 'commission').reduce((s, t) => s + Math.abs(t.amount), 0);
  const netEarnings = totalEarned - totalCommission;

  const chartData = [
    { month: 'Jan', earnings: 320, commission: 32 },
    { month: 'Feb', earnings: 480, commission: 48 },
    { month: 'Mar', earnings: 560, commission: 56 },
    { month: 'Apr', earnings: 620, commission: 62 },
    { month: 'May', earnings: 750, commission: 75 },
    { month: 'Jun', earnings: 890, commission: 89 },
  ];

  return (
    <DashboardLayout navItems={PROVIDER_NAV} title={t('provider.earnings')}>
      <Stack gap="lg">
        {/* KPI Row */}
        <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
          {[
            { label: 'Total Earned', value: formatCurrency(totalEarned), color: COLORS.tealBlue, icon: <IconTrendingUp size={20} /> },
            { label: `Commission (10%)`, value: `-${formatCurrency(totalCommission)}`, color: '#E63946', icon: <IconCurrencyDollar size={20} /> },
            { label: 'Net Earnings', value: formatCurrency(netEarnings), color: COLORS.navyBlue, icon: <IconCheck size={20} /> },
          ].map(kpi => (
            <Card key={kpi.label} radius="lg" withBorder p="lg">
              <Group justify="space-between" mb="xs">
                <Text size="sm" c="dimmed" fw={500}>{kpi.label}</Text>
                <ThemeIcon size={32} radius="md" variant="light" color="teal">
                  {kpi.icon}
                </ThemeIcon>
              </Group>
              <Text size="xl" fw={800} c={kpi.color}>{kpi.value}</Text>
            </Card>
          ))}
        </SimpleGrid>

        {/* Chart */}
        <Card radius="lg" withBorder p="lg">
          <Text fw={700} mb="md">Monthly Earnings vs Commission</Text>
          <BarChart
            h={240}
            data={chartData}
            dataKey="month"
            series={[
              { name: 'earnings', color: COLORS.tealBlue, label: 'Gross Earnings' },
              { name: 'commission', color: '#E63946', label: 'Commission' },
            ]}
            barProps={{ radius: [4, 4, 0, 0] }}
          />
        </Card>

        {/* Transaction Table */}
        <Card radius="lg" withBorder p={0} style={{ overflow: 'hidden' }}>
          <Text fw={700} p="lg" pb="xs">Transaction History</Text>
          <Divider />
          <ScrollArea h={320}>
            <Table striped highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Type</Table.Th>
                  <Table.Th>Amount</Table.Th>
                  <Table.Th>Date</Table.Th>
                  <Table.Th>Status</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {txns.map(tx => (
                  <Table.Tr key={tx.id}>
                    <Table.Td><Text size="sm" tt="capitalize">{tx.type.replace(/_/g, ' ')}</Text></Table.Td>
                    <Table.Td><Text size="sm" fw={600} c={tx.amount >= 0 ? 'teal' : 'red'}>{tx.amount >= 0 ? '+' : ''}{formatCurrency(tx.amount)}</Text></Table.Td>
                    <Table.Td><Text size="xs" c="dimmed">{formatTimeAgo(tx.createdAt)}</Text></Table.Td>
                    <Table.Td><Badge size="xs" color={tx.status === 'completed' ? 'teal' : 'yellow'}>{tx.status}</Badge></Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </ScrollArea>
        </Card>
      </Stack>
    </DashboardLayout>
  );
}

// ─── PROVIDER PROFILE ─────────────────────────────────────────────────────────
export function ProviderProfile() {
  const { t } = useTranslation();
  const { currentUser } = useAuthStore();
  const profiles = storage.get<ProviderProfile[]>(STORAGE_KEYS.providerProfiles, []);
  const myProfile = profiles.find(p => p.userId === currentUser?.id);
  const [bio, setBio] = useState(myProfile?.bio ?? '');
  const [radius, setRadius] = useState(myProfile?.coverageRadius ?? 10);
  const [pricingModel, setPricingModel] = useState(myProfile?.pricingModel ?? 'hourly');
  const [rate, setRate] = useState(myProfile?.hourlyRate ?? 50);
  const [isSaving, setIsSaving] = useState(false);

  const save = () => {
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      notifications.show({ title: 'Profile Updated!', message: 'Your changes have been saved.', color: 'teal' });
    }, 1000);
  };

  return (
    <DashboardLayout navItems={PROVIDER_NAV} title={t('provider.profile')}>
      <Stack gap="lg">
        {/* Avatar & verification */}
        <Card radius="lg" withBorder p="xl">
          <Group gap="lg">
            <Box style={{ position: 'relative' }}>
              <Avatar size={80} radius="xl" color="teal">
                {currentUser?.name?.charAt(0) ?? 'P'}
              </Avatar>
              <Box style={{ position: 'absolute', bottom: -2, right: -2, width: 20, height: 20, background: COLORS.tealBlue, borderRadius: '50%', border: '2px solid white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <IconCheck size={10} color="white" />
              </Box>
            </Box>
            <Stack gap="xs">
              <Text fw={700} size="lg">{currentUser?.name}</Text>
              <Text c="dimmed" size="sm">{currentUser?.email}</Text>
              <Group gap="xs">
                <Badge color="teal" size="sm" leftSection={<IconShieldCheck size={10} />}>Verified Provider</Badge>
                <Badge color="yellow" size="sm">⭐ {myProfile?.rating ?? 4.7}</Badge>
              </Group>
            </Stack>
            <Box style={{ marginLeft: 'auto' }}>
              <FileButton onChange={() => { }} accept="image/*">
                {(props) => (
                  <Button {...props} variant="light" color="teal" size="sm" leftSection={<IconUpload size={14} />}>
                    Update Photo
                  </Button>
                )}
              </FileButton>
            </Box>
          </Group>
        </Card>

        {/* Service Info */}
        <Card radius="lg" withBorder p="xl">
          <Text fw={700} mb="md">Service Details</Text>
          <Stack gap="md">
            <Textarea
              label="Professional Bio"
              value={bio}
              onChange={e => setBio(e.target.value)}
              rows={3}
              placeholder="Describe your expertise..."
            />
            <Select
              label="Pricing Model"
              data={[
                { value: 'hourly', label: '⏱ Hourly Rate' },
                { value: 'fixed', label: '💰 Fixed Price' },
                { value: 'custom', label: '🤝 Custom Estimate' },
              ]}
              value={pricingModel}
              onChange={v => setPricingModel(v ?? 'hourly')}
            />
            {pricingModel !== 'custom' && (
              <NumberInput
                label={pricingModel === 'hourly' ? 'Hourly Rate (USD)' : 'Fixed Price (USD)'}
                value={rate}
                onChange={v => setRate(Number(v))}
                prefix="$"
                min={10}
              />
            )}
            <Box>
              <Text size="sm" fw={600} mb="xs">Coverage Radius: {radius} km</Text>
              <Slider value={radius} onChange={setRadius} min={1} max={50} step={1} color="teal" />
            </Box>
          </Stack>
        </Card>

        {/* Portfolio */}
        <Card radius="lg" withBorder p="xl">
          <Group justify="space-between" mb="md">
            <Text fw={700}>{t('provider.portfolio')}</Text>
            <FileButton onChange={() => { }} accept="image/*" multiple>
              {(props) => (
                <Button {...props} variant="light" color="teal" size="sm" leftSection={<IconPhoto size={14} />}>
                  Add Photos
                </Button>
              )}
            </FileButton>
          </Group>
          <SimpleGrid cols={4} spacing="xs">
            {(myProfile?.portfolioImages ?? []).length === 0 ? (
              <Box
                p="xl"
                style={{ gridColumn: '1/-1', borderRadius: 12, border: '2px dashed #DEE2E6', textAlign: 'center' }}
              >
                <IconPhoto size={32} color="#DEE2E6" style={{ margin: '0 auto' }} />
                <Text c="dimmed" size="sm" mt="xs">No portfolio photos yet</Text>
              </Box>
            ) : (
              (myProfile?.portfolioImages ?? []).map((url, i) => (
                <Box key={i} style={{ borderRadius: 12, overflow: 'hidden', aspectRatio: '1', background: '#F8F9FA' }}>
                  <img src={url} alt={`Portfolio ${i}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </Box>
              ))
            )}
          </SimpleGrid>
        </Card>

        <Button size="md" onClick={save} loading={isSaving} style={{ background: COLORS.navyBlue }}>
          Save Changes
        </Button>
      </Stack>
    </DashboardLayout>
  );
}

// ─── PROVIDER WALLET ──────────────────────────────────────────────────────────
export function ProviderWallet() {
  const { t } = useTranslation();
  const { currentUser } = useAuthStore();
  const [withdrawAmount, setWithdrawAmount] = useState<number>(100);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const profiles = storage.get<ProviderProfile[]>(STORAGE_KEYS.providerProfiles, []);
  const myProfile = profiles.find(p => p.userId === currentUser?.id);
  const balance = myProfile?.walletBalance ?? 340;

  const withdraw = () => {
    if (withdrawAmount > balance) {
      notifications.show({ title: 'Insufficient Balance', message: 'Withdrawal amount exceeds wallet balance.', color: 'red' });
      return;
    }
    setIsWithdrawing(true);
    setTimeout(() => {
      setIsWithdrawing(false);
      notifications.show({ title: 'Withdrawal Requested!', message: `${formatCurrency(withdrawAmount)} will be deposited in 1-2 business days.`, color: 'teal' });
    }, 1500);
  };

  return (
    <DashboardLayout navItems={PROVIDER_NAV} title={t('provider.wallet')}>
      <Stack gap="lg">
        <Box
          p="xl"
          style={{
            borderRadius: 20,
            background: `linear-gradient(135deg, ${COLORS.navyBlue} 0%, ${COLORS.navyLight} 60%, ${COLORS.tealBlue} 100%)`,
            boxShadow: `0 8px 32px ${COLORS.navyBlue}40`,
          }}
        >
          <Text size="sm" c="rgba(255,255,255,0.7)">Available Balance</Text>
          <Text size={42} fw={800} c="white">{formatCurrency(balance)}</Text>
          <Text size="xs" c="rgba(255,255,255,0.5)">After commission deductions</Text>
        </Box>

        <Card radius="lg" withBorder p="lg">
          <Text fw={700} mb="md">{t('wallet.withdraw')}</Text>
          <Stack gap="md">
            <NumberInput
              label="Withdrawal Amount"
              value={withdrawAmount}
              onChange={v => setWithdrawAmount(Number(v))}
              prefix="$"
              min={10}
              max={balance}
            />
            <Select
              label="Withdrawal Method"
              data={[
                { value: 'bank', label: '🏦 Bank Transfer (1-2 days)' },
                { value: 'mpesa', label: '📱 M-Pesa (instant)' },
                { value: 'paypal', label: '💳 PayPal (instant)' },
              ]}
              defaultValue="bank"
            />
            <Button onClick={withdraw} loading={isWithdrawing} color="teal" size="md" radius="xl">
              {t('wallet.confirm_payment')}
            </Button>
          </Stack>
        </Card>
      </Stack>
    </DashboardLayout>
  );
}

// ─── PROVIDER LOYALTY ─────────────────────────────────────────────────────────
export function ProviderLoyalty() {
  const { t } = useTranslation();
  const { currentUser } = useAuthStore();
  const profiles = storage.get<ProviderProfile[]>(STORAGE_KEYS.providerProfiles, []);
  const myProfile = profiles.find(p => p.userId === currentUser?.id);
  const tier = myProfile?.loyaltyTier ?? 'rising_pro';
  const tiers = LOYALTY_CONFIG.providerTiers;
  const tierConfig = tiers.find(t => t.tier === tier) ?? tiers[0];
  const nextTier = tiers.find(t => t.minJobs > (tierConfig?.minJobs ?? 0));
  const completedJobs = myProfile?.completedJobs ?? 12;
  const progress = nextTier
    ? Math.min(100, (completedJobs / nextTier.minJobs) * 100)
    : 100;
  const tc = PROVIDER_TIER_COLORS[tier as keyof typeof PROVIDER_TIER_COLORS] ?? COLORS.tealBlue;

  return (
    <DashboardLayout navItems={PROVIDER_NAV} title={t('provider.loyalty')}>
      <Stack gap="lg">
        {/* Tier Card */}
        <Box
          p="xl"
          style={{
            borderRadius: 20,
            background: `linear-gradient(135deg, ${tc}20 0%, ${tc}10 100%)`,
            border: `2px solid ${tc}40`,
          }}
        >
          <Group gap="lg">
            <RingProgress
              size={100}
              thickness={8}
              sections={[{ value: progress, color: tc }]}
              label={<Center><IconTrophy size={24} color={tc} /></Center>}
            />
            <Stack gap="xs">
              <Badge size="lg" style={{ background: tc, color: 'white' }} w="fit-content">
                {formatProviderTier(tier)}
              </Badge>
              <Text size="sm" c="dimmed">{completedJobs} jobs completed</Text>
              {nextTier && (
                <Text size="xs" c="dimmed">
                  {nextTier.minJobs - completedJobs} more jobs to reach {formatProviderTier(nextTier.tier)}
                </Text>
              )}
              <Progress value={progress} color={tc} size="sm" h={6} w={200} radius="xl" />
            </Stack>
          </Group>
        </Box>

        {/* Tier comparison */}
        <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
          {tiers.map(t => {
            const color = PROVIDER_TIER_COLORS[t.tier as keyof typeof PROVIDER_TIER_COLORS] ?? '#777';
            const isActive = t.tier === tier;
            return (
              <Card key={t.tier} radius="lg" withBorder p="lg"
                style={{ border: isActive ? `2px solid ${color}` : undefined, opacity: isActive ? 1 : 0.65 }}>
                <Stack gap="xs">
                  <Group justify="space-between">
                    <Badge style={{ background: color, color: 'white' }} size="sm">{formatProviderTier(t.tier)}</Badge>
                    {isActive && <Badge color="teal" size="xs">Current</Badge>}
                  </Group>
                  <Text fw={700} size="sm">
                    {t.commissionDiscount > 0 ? `-${t.commissionDiscount}%` : 'Standard'} Commission
                  </Text>
                  <Text size="xs" c="dimmed">From {t.minJobs} jobs</Text>
                  <Divider />
                  <Stack gap={4}>
                    {t.perks.map(perk => (
                      <Group key={perk} gap="xs">
                        <IconGift size={12} color={color} />
                        <Text size="xs">{perk}</Text>
                      </Group>
                    ))}
                  </Stack>
                </Stack>
              </Card>
            );
          })}
        </SimpleGrid>
      </Stack>
    </DashboardLayout>
  );
}
