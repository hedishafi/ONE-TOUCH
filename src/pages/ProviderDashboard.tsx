// ProviderDashboard — fully translated

import { useState } from 'react';
import {
  Box, Text, Group, Stack, SimpleGrid, Card, Badge, Button,
  Table, ScrollArea, Paper, Divider, ThemeIcon, Center,
  Avatar, Switch, ActionIcon, Modal, PasswordInput, Tabs,
} from '@mantine/core';
import {
  IconBriefcase, IconUser, IconStar, IconCheck, IconMapPin,
  IconShieldCheck, IconPhone, IconCurrencyDollar, IconX,
  IconAlertCircle, IconLock, IconLockOpen, IconWifiOff,
  IconStarFilled, IconShieldLock, IconChartBar, IconListCheck,
  IconPercentage, IconTrophy,
} from '@tabler/icons-react';
import { BarChart } from '@mantine/charts';
import { useTranslation } from 'react-i18next';
import { notifications } from '@mantine/notifications';
import { ProviderLayout } from '../components/ProviderLayout';
import { JobCard } from '../components/JobCard';
import { StatusBadge } from '../components/StatusBadge';
import { useAuthStore } from '../store/authStore';
import { useJobStore } from '../store/jobStore';
import { storage, STORAGE_KEYS } from '../utils/storage';
import { formatCurrency, formatTimeAgo } from '../utils/formatting';
import { COLORS } from '../utils/constants';
import type { WalletTransaction, ProviderProfile } from '../types';
import type { JobStatus } from '../types';

const N = COLORS.navyBlue;
const T = COLORS.tealBlue;

const MOCK_JOB = {
  clientName: 'Selam A.', clientRating: 4.7, clientJobs: 12,
  service: 'Home Cleaning',
  description: 'Deep clean of a 3-bedroom apartment — kitchen & bathrooms included.',
  location: 'Bole, Addis Ababa', distance: 2.4,
  priceMin: 180, priceMax: 280, phone: '+251911234567',
};

const CANCEL_REASON_KEYS = [
  'providerDashboard.cancel_reason_0',
  'providerDashboard.cancel_reason_1',
  'providerDashboard.cancel_reason_2',
  'providerDashboard.cancel_reason_3',
  'providerDashboard.cancel_reason_4',
  'providerDashboard.cancel_reason_5',
];

// ─── Jobs Tab ─────────────────────────────────────────────────────────────────
function JobsTab() {
  const { t } = useTranslation();
  const { currentUser } = useAuthStore();
  const { jobs } = useJobStore();
  const [reqState, setReqState] = useState<'pending'|'dismissed'>('pending');
  const [payOpen, setPayOpen] = useState(false);
  const [payStep, setPayStep] = useState<'input'|'verifying'|'success'>('input');
  const [pass, setPass] = useState('');
  const [passErr, setPassErr] = useState('');
  const [phoneVisible, setPhoneVisible] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelDone, setCancelDone] = useState(false);

  const myJobs = jobs.filter(j => j.providerId === currentUser?.id);
  const grouped: Record<string, typeof myJobs> = {
    pending_agreement: myJobs.filter(j => j.status === 'pending_agreement'),
    in_progress: myJobs.filter(j => j.status === 'in_progress'),
    active: myJobs.filter(j => j.status === 'active'),
    completed: myJobs.filter(j => j.status === 'completed'),
  };

  function openPay() { setPass(''); setPassErr(''); setPayStep('input'); setPayOpen(true); }
  function closePay() { if (payStep === 'verifying') return; setPayOpen(false); }
  function submitPay() {
    if (!pass.trim() || pass.trim().length < 4) { setPassErr(t('providerDashboard.telebirr_err_short')); return; }
    setPassErr(''); setPayStep('verifying');
    setTimeout(() => {
      setPayStep('success'); setPhoneVisible(true); setPass('');
      notifications.show({ title: t('providerDashboard.payment_verified_title'), message: t('providerDashboard.payment_verified_msg'), color: 'teal' });
    }, 2200);
  }
  function submitCancel() {
    if (!cancelReason) return;
    setCancelDone(true);
    setTimeout(() => {
      setCancelOpen(false);
      setTimeout(() => { setCancelDone(false); setCancelReason(''); setReqState('dismissed'); }, 300);
    }, 1800);
  }

  return (
    <Stack gap="md">
      {reqState === 'pending' && (
        <Paper p="lg" radius="xl" style={{ border: `2px solid ${T}55`, background: 'var(--ot-bg-card)' }}>
          <Group justify="space-between" mb="md">
            <Group gap={8}>
              <Box style={{ width: 10, height: 10, borderRadius: '50%', background: COLORS.success, boxShadow: `0 0 0 3px ${COLORS.success}44` }} />
              <Text size="xs" fw={700} c={T}>{t('providerDashboard.new_job_request')}</Text>
            </Group>
            <Badge size="sm" color="teal" variant="light">{MOCK_JOB.service}</Badge>
          </Group>
          <Group gap={14} mb="md" align="flex-start">
            <Avatar size={52} radius="xl" color="teal">{MOCK_JOB.clientName.charAt(0)}</Avatar>
            <Stack gap={4} style={{ flex: 1 }}>
              <Group gap={8}>
                <Text fw={800} size="md" c={N}>{MOCK_JOB.clientName}</Text>
                <Group gap={3}><IconStarFilled size={12} color={COLORS.warning} /><Text size="xs" fw={700}>{MOCK_JOB.clientRating}</Text></Group>
                <Text size="xs" c="dimmed">· {t('providerDashboard.jobs_done', { count: MOCK_JOB.clientJobs })}</Text>
              </Group>
              <Text size="sm" c="dimmed" lineClamp={2}>{MOCK_JOB.description}</Text>
            </Stack>
          </Group>
          <Paper p="sm" radius="lg" mb="md" style={{ background: `${N}08`, border: `1px solid ${N}18` }}>
            <Group justify="space-between" wrap="nowrap">
              <Group gap={6}><IconMapPin size={14} color={T} /><Text size="sm" fw={600} c={N}>{MOCK_JOB.location}</Text></Group>
              <Badge size="sm" color="blue" variant="light">{t('providerDashboard.km_away', { dist: MOCK_JOB.distance })}</Badge>
            </Group>
            <Group justify="space-between" mt={8}>
              <Text size="xs" c="dimmed">{t('providerDashboard.estimated_pay')}</Text>
              <Text size="sm" fw={800} c={N}>ETB {MOCK_JOB.priceMin}–{MOCK_JOB.priceMax}</Text>
            </Group>
          </Paper>
          <Paper p="sm" radius="lg" mb="lg" style={{ background: phoneVisible ? `${T}12` : `${N}06`, border: `1px solid ${phoneVisible ? T : N}22`, display: 'flex', alignItems: 'center', gap: 10 }}>
            {phoneVisible
              ? <><IconLockOpen size={16} color={T} /><Text size="sm" fw={700} c={N}>{MOCK_JOB.phone}</Text><Badge size="xs" color="teal" variant="light" ml="auto">{t('providerDashboard.visible')}</Badge></>
              : <><IconLock size={16} color="gray" /><Text size="sm" c="dimmed">{t('providerDashboard.client_phone_hidden')}</Text></>}
          </Paper>
          <Group gap={10}>
            <Button flex={1} size="md" radius="xl" style={{ background: `linear-gradient(135deg,${N},${T})`, border: 'none' }} leftSection={<IconCheck size={16} />} onClick={openPay}>{t('providerDashboard.confirm_btn')}</Button>
            <Button flex={1} size="md" radius="xl" variant="light" color="red" leftSection={<IconX size={16} />} onClick={() => setCancelOpen(true)}>{t('providerDashboard.cancel_btn')}</Button>
          </Group>
        </Paper>
      )}

      <Modal opened={payOpen} onClose={closePay} centered radius="xl" size="sm" withCloseButton={false} styles={{ content: { background: 'var(--ot-bg-card)' }, header: { display: 'none' } }}>
        <Stack gap="lg" p="md">
          <Group justify="space-between">
            <Group gap={10}>
              <Box w={40} h={40} style={{ borderRadius: 12, background: 'linear-gradient(135deg,#E6007A,#FF6B35)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Text fw={900} size="xs" c="white">TB</Text>
              </Box>
              <Box>
                <Text fw={800} size="sm" c={N}>{t('providerDashboard.telebirr_title')}</Text>
                <Text size="10px" c="dimmed">{t('providerDashboard.telebirr_encrypted')}</Text>
              </Box>
            </Group>
            {payStep !== 'verifying' && <ActionIcon variant="subtle" radius="xl" onClick={closePay}><IconX size={18} /></ActionIcon>}
          </Group>
          {payStep === 'input' && (
            <>
              <Paper p="md" radius="lg" style={{ background: `${T}10`, border: `1px solid ${T}33` }}>
                <Group justify="space-between" mb={4}><Text size="sm" c="dimmed">{t('providerDashboard.service_fee')}</Text><Text fw={800} size="lg" c={N}>ETB {MOCK_JOB.priceMin}</Text></Group>
                <Text size="xs" c="dimmed" mt={6}>{t('providerDashboard.telebirr_after_pay')}</Text>
              </Paper>
              <Stack align="center" gap={6}>
                <Box w={56} h={56} style={{ borderRadius: '50%', background: 'linear-gradient(135deg,#E6007A,#FF6B35)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <IconShieldLock size={26} color="white" />
                </Box>
              </Stack>
              <PasswordInput label={t('providerDashboard.telebirr_password_label')} placeholder={t('providerDashboard.telebirr_password_placeholder')} value={pass}
                onChange={e => { setPass(e.currentTarget.value); if (passErr) setPassErr(''); }}
                error={passErr || undefined} radius="lg" size="md"
                onKeyDown={e => { if (e.key === 'Enter') submitPay(); }} />
              <Button size="md" radius="xl" fullWidth disabled={!pass.trim()}
                style={{ background: pass.trim() ? 'linear-gradient(135deg,#E6007A,#FF6B35)' : undefined, border: 'none' }}
                leftSection={<IconCurrencyDollar size={16} />} onClick={submitPay}>
                {t('providerDashboard.pay_via_telebirr', { amount: MOCK_JOB.priceMin })}
              </Button>
            </>
          )}
          {payStep === 'verifying' && (
            <Stack align="center" gap="lg" py="md">
              <Box w={72} h={72} style={{ borderRadius: '50%', background: 'linear-gradient(135deg,#E6007A22,#FF6B3522)', border: '3px solid #E6007A66', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <IconShieldLock size={32} color="#E6007A" />
              </Box>
              <Text fw={800} size="md" c={N}>{t('providerDashboard.verifying_telebirr')}</Text>
              <Text size="xs" c="dimmed" ta="center">{t('providerDashboard.do_not_close')}</Text>
            </Stack>
          )}
          {payStep === 'success' && (
            <Stack align="center" gap="md" py={8}>
              <Box w={72} h={72} style={{ borderRadius: '50%', background: `linear-gradient(135deg,${COLORS.success},${T})`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <IconCheck size={36} color="white" />
              </Box>
              <Text fw={800} size="lg" c={N}>{t('providerDashboard.payment_confirmed')}</Text>
              <Paper p="md" radius="lg" w="100%" style={{ background: `${T}12`, border: `1.5px solid ${T}55`, textAlign: 'center' }}>
                <Text size="xs" c="dimmed" mb={6} fw={600}>{t('providerDashboard.client_phone_label')}</Text>
                <Group gap={8} justify="center"><IconPhone size={20} color={T} /><Text fw={800} size="xl" c={N}>{MOCK_JOB.phone}</Text></Group>
              </Paper>
              <Button size="md" radius="xl" fullWidth leftSection={<IconCheck size={16} />}
                style={{ background: `linear-gradient(135deg,${N},${T})`, border: 'none' }}
                onClick={() => { setPayOpen(false); setReqState('dismissed'); }}>
                {t('providerDashboard.start_job')}
              </Button>
            </Stack>
          )}
        </Stack>
      </Modal>

      <Modal opened={cancelOpen} onClose={() => { if (!cancelDone) setCancelOpen(false); }} centered radius="xl" size="sm" withCloseButton={false} styles={{ content: { background: 'var(--ot-bg-card)' }, header: { display: 'none' } }}>
        <Stack gap="md" p="md">
          {!cancelDone ? (
            <>
              <Group justify="space-between">
                <Text fw={800} size="md" c={N}>{t('providerDashboard.cancel_why')}</Text>
                <ActionIcon variant="subtle" onClick={() => setCancelOpen(false)}><IconX size={18} /></ActionIcon>
              </Group>
              <Stack gap={8}>
                {CANCEL_REASON_KEYS.map(key => {
                  const label = t(key);
                  return (
                    <Button key={key} size="sm" radius="xl" fullWidth variant={cancelReason === label ? 'filled' : 'light'} color={cancelReason === label ? 'red' : 'gray'}
                      styles={{ root: { justifyContent: 'flex-start', paddingLeft: 20, fontWeight: 600 } }}
                      onClick={() => setCancelReason(label)}>{label}</Button>
                  );
                })}
              </Stack>
              <Paper p="sm" radius="lg" style={{ background: `${COLORS.warning}18`, border: `1px solid ${COLORS.warning}44` }}>
                <Group gap={8}>
                  <IconAlertCircle size={16} color={COLORS.warning} />
                  <Text size="xs" c="dimmed" style={{ flex: 1 }}>
                    {t('providerDashboard.cancel_offline_hint_pre')} <Text span fw={700} c={N}>{t('providerDashboard.offline_word')}</Text> {t('providerDashboard.cancel_offline_hint_post')}
                  </Text>
                </Group>
                <Group gap={8} mt={10}>
                  <IconWifiOff size={14} color={COLORS.warning} />
                  <Text size="xs" fw={600} c={COLORS.warning}>{t('providerDashboard.go_offline')}</Text>
                  <Switch size="xs" color="orange" onChange={e => { if (e.currentTarget.checked) notifications.show({ title: t('providerDashboard.now_offline'), message: t('providerDashboard.now_offline_msg'), color: 'orange' }); }} />
                </Group>
              </Paper>
              <Button size="md" radius="xl" color="red" disabled={!cancelReason} onClick={submitCancel}>{t('providerDashboard.submit_cancellation')}</Button>
            </>
          ) : (
            <Stack align="center" gap="md" py={12}>
              <Box w={64} h={64} style={{ borderRadius: '50%', background: `linear-gradient(135deg,${COLORS.warning},#ff6b35)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <IconCheck size={32} color="white" />
              </Box>
              <Text fw={800} size="lg" c={N}>{t('providerDashboard.cancellation_recorded')}</Text>
            </Stack>
          )}
        </Stack>
      </Modal>

      {myJobs.length === 0 ? (
        <Center py={60}>
          <Stack align="center" gap="sm">
            <ThemeIcon size={56} radius="xl" color="gray" variant="light"><IconBriefcase size={28} /></ThemeIcon>
            <Text c="dimmed">{t('provider.no_jobs')}</Text>
            <Text size="xs" c="dimmed">{t('providerDashboard.no_jobs_hint')}</Text>
          </Stack>
        </Center>
      ) : (
        <>
          {Object.entries(grouped).filter(([, items]) => items.length > 0).map(([status, items]) => (
            <Stack key={status} gap="sm">
              <Group gap="xs">
                <StatusBadge status={status as JobStatus} />
                <Text size="sm" c="dimmed">({items.length})</Text>
              </Group>
              {items.map(job => <JobCard key={job.id} job={job} viewAs="provider" />)}
            </Stack>
          ))}
        </>
      )}
    </Stack>
  );
}

// ─── Commission Tab ───────────────────────────────────────────────────────────
function CommissionTab() {
  const { t } = useTranslation();
  const { currentUser } = useAuthStore();
  const txns = storage.get<WalletTransaction[]>(STORAGE_KEYS.walletTransactions, [])
    .filter(tx => tx.userId === currentUser?.id && tx.type === 'commission');
  const total = txns.reduce((s, t) => s + Math.abs(t.amount), 0);
  const chartData = [
    { month: 'Jan', commission: 32 }, { month: 'Feb', commission: 48 },
    { month: 'Mar', commission: 56 }, { month: 'Apr', commission: 62 },
    { month: 'May', commission: 75 }, { month: 'Jun', commission: 89 },
  ];
  return (
    <Stack gap="lg">
      <Card radius="lg" withBorder p="lg">
        <Group justify="space-between" mb="xs">
          <Text size="sm" c="dimmed" fw={500}>{t('providerDashboard.commission_total_label')}</Text>
          <ThemeIcon size={32} radius="md" variant="light" color="red"><IconPercentage size={18} /></ThemeIcon>
        </Group>
        <Text size="xl" fw={800} c="#E63946">{formatCurrency(total)}</Text>
        <Text size="xs" c="dimmed" mt={4}>{t('providerDashboard.commission_platform_fee')}</Text>
      </Card>
      <Card radius="lg" withBorder p="lg">
        <Text fw={700} mb="md">{t('providerDashboard.commission_monthly')}</Text>
        <BarChart h={220} data={chartData} dataKey="month"
          series={[{ name: 'commission', color: '#E63946', label: 'Commission' }]}
          barProps={{ radius: [4, 4, 0, 0] }} />
      </Card>
      <Card radius="lg" withBorder p={0} style={{ overflow: 'hidden' }}>
        <Text fw={700} p="lg" pb="xs">{t('providerDashboard.commission_history')}</Text>
        <Divider />
        <ScrollArea h={280}>
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr><Table.Th>{t('providerDashboard.col_description')}</Table.Th><Table.Th>{t('providerDashboard.col_amount')}</Table.Th><Table.Th>{t('providerDashboard.col_date')}</Table.Th></Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {txns.length === 0
                ? <Table.Tr><Table.Td colSpan={3}><Text size="sm" c="dimmed" ta="center" py="md">{t('providerDashboard.no_commission')}</Text></Table.Td></Table.Tr>
                : txns.map(tx => (
                  <Table.Tr key={tx.id}>
                    <Table.Td><Text size="sm">{tx.description}</Text></Table.Td>
                    <Table.Td><Text size="sm" fw={600} c="red">-{formatCurrency(Math.abs(tx.amount))}</Text></Table.Td>
                    <Table.Td><Text size="xs" c="dimmed">{formatTimeAgo(tx.createdAt)}</Text></Table.Td>
                  </Table.Tr>
                ))}
            </Table.Tbody>
          </Table>
        </ScrollArea>
      </Card>
    </Stack>
  );
}

// ─── Earnings Overview Tab ────────────────────────────────────────────────────
function EarningsOverviewTab() {
  const { t } = useTranslation();
  const { currentUser } = useAuthStore();
  const txns = storage.get<WalletTransaction[]>(STORAGE_KEYS.walletTransactions, [])
    .filter(tx => tx.userId === currentUser?.id);
  const totalEarned = txns.filter(t => t.type === 'payment' || t.type === 'cashback').reduce((s, t) => s + Math.abs(t.amount), 0);
  const totalComm = txns.filter(t => t.type === 'commission').reduce((s, t) => s + Math.abs(t.amount), 0);
  const net = totalEarned - totalComm;
  const chartData = [
    { month: 'Jan', earnings: 320, commission: 32 }, { month: 'Feb', earnings: 480, commission: 48 },
    { month: 'Mar', earnings: 560, commission: 56 }, { month: 'Apr', earnings: 620, commission: 62 },
    { month: 'May', earnings: 750, commission: 75 }, { month: 'Jun', earnings: 890, commission: 89 },
  ];
  return (
    <Stack gap="lg">
      <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
        {[
          { labelKey: 'providerDashboard.gross_earnings', value: formatCurrency(totalEarned), color: T, icon: <IconTrophy size={20} /> },
          { labelKey: 'providerDashboard.commission_pct', value: `-${formatCurrency(totalComm)}`, color: '#E63946', icon: <IconCurrencyDollar size={20} /> },
          { labelKey: 'providerDashboard.net_earnings', value: formatCurrency(net), color: N, icon: <IconCheck size={20} /> },
        ].map(kpi => (
          <Card key={kpi.labelKey} radius="lg" withBorder p="lg">
            <Group justify="space-between" mb="xs">
              <Text size="sm" c="dimmed" fw={500}>{t(kpi.labelKey)}</Text>
              <ThemeIcon size={32} radius="md" variant="light" color="teal">{kpi.icon}</ThemeIcon>
            </Group>
            <Text size="xl" fw={800} c={kpi.color}>{kpi.value}</Text>
          </Card>
        ))}
      </SimpleGrid>
      <Card radius="lg" withBorder p="lg">
        <Text fw={700} mb="md">{t('providerDashboard.monthly_chart')}</Text>
        <BarChart h={240} data={chartData} dataKey="month"
          series={[
            { name: 'earnings', color: T, label: 'Gross Earnings' },
            { name: 'commission', color: '#E63946', label: 'Commission' },
          ]}
          barProps={{ radius: [4, 4, 0, 0] }} />
      </Card>
      <Card radius="lg" withBorder p={0} style={{ overflow: 'hidden' }}>
        <Text fw={700} p="lg" pb="xs">{t('providerDashboard.transaction_history')}</Text>
        <Divider />
        <ScrollArea h={320}>
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr><Table.Th>{t('providerDashboard.col_type')}</Table.Th><Table.Th>{t('providerDashboard.col_amount')}</Table.Th><Table.Th>{t('providerDashboard.col_date')}</Table.Th><Table.Th>{t('providerDashboard.col_status')}</Table.Th></Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {txns.length === 0
                ? <Table.Tr><Table.Td colSpan={4}><Text size="sm" c="dimmed" ta="center" py="md">{t('providerDashboard.no_transactions')}</Text></Table.Td></Table.Tr>
                : txns.map(tx => (
                  <Table.Tr key={tx.id}>
                    <Table.Td><Text size="sm" tt="capitalize">{tx.type.replace(/_/g, ' ')}</Text></Table.Td>
                    <Table.Td><Text size="sm" fw={600} c={tx.amount >= 0 ? 'teal' : 'red'}>{tx.amount >= 0 ? '+' : ''}{formatCurrency(tx.amount)}</Text></Table.Td>
                    <Table.Td><Text size="xs" c="dimmed">{formatTimeAgo(tx.createdAt)}</Text></Table.Td>
                    <Table.Td><Badge size="xs" color={tx.type === 'payment' ? 'teal' : 'yellow'}>{tx.type}</Badge></Table.Td>
                  </Table.Tr>
                ))}
            </Table.Tbody>
          </Table>
        </ScrollArea>
      </Card>
    </Stack>
  );
}

// ─── EARNINGS ─────────────────────────────────────────────────────────────────
export function Earnings() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<string | null>('overview');
  return (
    <ProviderLayout title={t('providerDashboard.earnings_title')}>
      <Tabs value={activeTab} onChange={setActiveTab}
        styles={{
          tab: { fontWeight: 600, fontSize: 14, paddingTop: 10, paddingBottom: 10 },
          list: { borderBottom: '2px solid var(--ot-border)', gap: 4, marginBottom: 20 },
        }}>
        <Tabs.List>
          <Tabs.Tab value="overview" leftSection={<IconChartBar size={16} />}>{t('providerDashboard.tab_overview')}</Tabs.Tab>
          <Tabs.Tab value="jobs" leftSection={<IconListCheck size={16} />}>{t('providerDashboard.tab_jobs')}</Tabs.Tab>
          <Tabs.Tab value="commission" leftSection={<IconPercentage size={16} />}>{t('providerDashboard.tab_commission')}</Tabs.Tab>
        </Tabs.List>
        <Tabs.Panel value="overview"><EarningsOverviewTab /></Tabs.Panel>
        <Tabs.Panel value="jobs"><JobsTab /></Tabs.Panel>
        <Tabs.Panel value="commission"><CommissionTab /></Tabs.Panel>
      </Tabs>
    </ProviderLayout>
  );
}

// ─── PROVIDER PROFILE (read-only) ─────────────────────────────────────────────
export function ProviderProfile() {
  const { t } = useTranslation();
  const { currentUser } = useAuthStore();
  const profiles = storage.get<ProviderProfile[]>(STORAGE_KEYS.providerProfiles, []);
  const myProfile = profiles.find(p => p.userId === currentUser?.id);

  return (
    <ProviderLayout title={t('providerDashboard.profile_title')}>
      <Stack gap="lg">
        <Paper p="sm" radius="lg" style={{ background: `${T}10`, border: `1px solid ${T}33` }}>
          <Group gap={8}>
            <IconShieldCheck size={16} color={T} />
            <Text size="sm" c={T} fw={600}>
              {t('providerDashboard.profile_readonly')}
            </Text>
          </Group>
        </Paper>

        <Card radius="lg" withBorder p="xl">
          <Group gap="lg">
            <Box style={{ position: 'relative' }}>
              <Avatar size={80} radius="xl" color="teal">{myProfile?.fullName?.charAt(0) ?? 'P'}</Avatar>
              <Box style={{ position: 'absolute', bottom: -2, right: -2, width: 20, height: 20, background: T, borderRadius: '50%', border: '2px solid white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <IconCheck size={10} color="white" />
              </Box>
            </Box>
            <Stack gap="xs">
              <Text fw={700} size="lg">{myProfile?.fullName ?? '—'}</Text>
              <Text c="dimmed" size="sm">{currentUser?.email}</Text>
              <Group gap="xs">
                <Badge color="teal" size="sm" leftSection={<IconShieldCheck size={10} />}>{t('providerDashboard.verified_provider')}</Badge>
                <Badge color="yellow" size="sm">⭐ {myProfile?.rating ?? 4.7}</Badge>
              </Group>
            </Stack>
          </Group>
        </Card>

        <Card radius="lg" withBorder p="xl">
          <Text fw={700} mb="md">{t('providerDashboard.services_subservices')}</Text>
          <Stack gap="sm">
            {[
              { labelKey: 'providerDashboard.label_category', value: myProfile?.categoryId, badge: 'teal' as const },
              { labelKey: 'providerDashboard.label_subcategory', value: myProfile?.subcategoryId, badge: 'blue' as const },
              { labelKey: 'providerDashboard.label_pricing', value: myProfile?.pricingModel, badge: null },
              { labelKey: 'providerDashboard.label_coverage', value: myProfile?.coverageRadius ? `${myProfile.coverageRadius} km` : null, badge: null },
            ].map(row => (
              <Group key={row.labelKey} gap="xs">
                <Text size="sm" c="dimmed" w={120}>{t(row.labelKey)}:</Text>
                {row.badge
                  ? <Badge color={row.badge} variant="light">{row.value ?? '—'}</Badge>
                  : <Text size="sm" fw={600}>{row.value ?? '—'}</Text>}
              </Group>
            ))}
          </Stack>
        </Card>

        <Card radius="lg" withBorder p="xl">
          <Text fw={700} mb="md">{t('providerDashboard.skills_bio')}</Text>
          <Group gap="xs" mb="md">
            {['Reliable', 'Punctual', 'Professional'].map(s => (
              <Badge key={s} color="teal" variant="light">{s}</Badge>
            ))}
          </Group>
          {myProfile?.bio
            ? <Text size="sm" c="dimmed" style={{ lineHeight: 1.7 }}>{myProfile.bio}</Text>
            : <Text size="sm" c="dimmed">{t('providerDashboard.no_bio')}</Text>}
        </Card>

        <Card radius="lg" withBorder p="xl">
          <Text fw={700} mb="md">{t('providerDashboard.certifications')}</Text>
          <Text size="sm" c="dimmed">{t('providerDashboard.no_certs')}</Text>
        </Card>

        <Card radius="lg" withBorder p="xl">
          <Text fw={700} mb="md">{t('providerDashboard.portfolio')}</Text>
          {(myProfile?.portfolioImages ?? []).length === 0 ? (
            <Box p="xl" style={{ borderRadius: 12, border: '2px dashed var(--ot-border)', textAlign: 'center' }}>
              <Text c="dimmed" size="sm">{t('providerDashboard.no_portfolio')}</Text>
            </Box>
          ) : (
            <SimpleGrid cols={4} spacing="xs">
              {(myProfile?.portfolioImages ?? []).map((url, i) => (
                <Box key={i} style={{ borderRadius: 12, overflow: 'hidden', aspectRatio: '1', background: 'var(--ot-bg-row)' }}>
                  <img src={url} alt={`Portfolio ${i}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </Box>
              ))}
            </SimpleGrid>
          )}
        </Card>

        <Card radius="lg" withBorder p="xl">
          <Text fw={700} mb="md">{t('providerDashboard.performance')}</Text>
          <SimpleGrid cols={{ base: 2, sm: 3 }} spacing="md">
            {[
              { labelKey: 'providerDashboard.label_rating', value: `${myProfile?.rating ?? 0} ★`, icon: <IconStar size={16} color={COLORS.warning} /> },
              { labelKey: 'providerDashboard.label_jobs_completed', value: `${myProfile?.totalJobsCompleted ?? 0}`, icon: <IconCheck size={16} color={T} /> },
              { labelKey: 'providerDashboard.label_response_rate', value: `${myProfile?.responseRate ?? 0}%`, icon: <IconUser size={16} color={N} /> },
            ].map(s => (
              <Paper key={s.labelKey} p="md" radius="lg" style={{ background: 'var(--ot-bg-row)', border: '1px solid var(--ot-border)' }}>
                <Group gap={6} mb={4}>{s.icon}<Text size="xs" c="dimmed">{t(s.labelKey)}</Text></Group>
                <Text fw={800} size="lg" c={N}>{s.value}</Text>
              </Paper>
            ))}
          </SimpleGrid>
        </Card>
      </Stack>
    </ProviderLayout>
  );
}
