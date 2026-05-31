import { useState } from 'react';
import {
  Box, Text, Group, Stack, SimpleGrid, Card, Badge, Button,
  Table, ScrollArea, Progress, RingProgress, Paper, Divider,
  ThemeIcon, Center, NumberInput, Select, Textarea,
  FileButton, Avatar, Switch, Slider, ActionIcon, Modal, PasswordInput,
} from '@mantine/core';
import {
  IconBriefcase, IconWallet, IconUser, IconStar, IconTrendingUp,
  IconCheck, IconMapPin, IconPhoto, IconUpload,
  IconGift, IconTrophy,
  IconShieldCheck, IconPhone,
  IconCurrencyDollar, IconX, IconAlertCircle,
  IconLock, IconLockOpen, IconWifiOff, IconStarFilled, IconShieldLock,
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
import { LOYALTY_CONFIG } from '../mock/mockLoyalty';
import type { WalletTransaction, ProviderProfile, PricingModel, JobStatus } from '../types';
// ─── MOCK incoming job request (replace with real data source as needed) ─────
const MOCK_JOB_REQUEST = {
  clientName:    'Selam A.',
  clientRating:  4.7,
  clientJobs:    12,
  service:       'Home Cleaning',
  description:   'Deep clean of a 3-bedroom apartment — kitchen & bathrooms included.',
  location:      'Bole, Addis Ababa',
  distance:      2.4,   // km
  priceMin:      180,
  priceMax:      280,
  phone:         '+251911234567',
};

const CANCEL_REASON_KEYS = [
  'cancel_reason_already_on_job',
  'cancel_reason_too_far',
  'cancel_reason_price_mismatch',
  'cancel_reason_outside_expertise',
  'cancel_reason_personal_emergency',
  'cancel_reason_other',
] as const;

// ─── ACTIVE JOBS ─────────────────────────────────────────────────────────────
export function ActiveJobs() {
  const { t } = useTranslation();
  const { currentUser } = useAuthStore();
  const { jobs } = useJobStore();

  // Job request card state
  const [reqState, setReqState] = useState<'idle'|'pending'|'dismissed'>('pending');

  // TeleBirr payment modal — step machine: input → verifying → error → success
  const [payOpen,       setPayOpen]       = useState(false);
  const [payStep,       setPayStep]       = useState<'input'|'verifying'|'error'|'success'>('input');
  const [telebirrPass,  setTelebirrPass]  = useState('');
  const [payError,      setPayError]      = useState('');
  const [phoneVisible,  setPhoneVisible]  = useState(false);

  // Cancel reason modal
  const [cancelOpen,    setCancelOpen]    = useState(false);
  const [cancelReason,  setCancelReason]  = useState('');
  const [cancelDone,    setCancelDone]    = useState(false);

  const myJobs = jobs.filter(j => j.providerId === currentUser?.id);
  const grouped: Record<string, typeof myJobs> = {
    pending_agreement: myJobs.filter(j => j.status === 'pending_agreement'),
    in_progress:       myJobs.filter(j => j.status === 'in_progress'),
    active:            myJobs.filter(j => j.status === 'active'),
    completed:         myJobs.filter(j => j.status === 'completed'),
  };

  function handleConfirm() {
    setTelebirrPass('');
    setPayError('');
    setPayStep('input');
    setPayOpen(true);
  }

  function handlePay() {
    // Client-side validation
    if (!telebirrPass.trim()) {
      setPayError(t('providerDashboard.telebirr_err_empty'));
      return;
    }
    if (telebirrPass.trim().length < 4) {
      setPayError(t('providerDashboard.telebirr_err_short'));
      return;
    }

    setPayError('');
    setPayStep('verifying');

    // Simulate TeleBirr verification (2.2 s)
    setTimeout(() => {
      // In production this would be the API response.
      // For the demo any ≥4-char password succeeds.
      const verified = telebirrPass.trim().length >= 4;

      if (verified) {
        setPayStep('success');
        setPhoneVisible(true);
        setTelebirrPass('');
        notifications.show({
          title: t('providerDashboard.telebirr_verified_title'),
          message: t('providerDashboard.telebirr_verified_msg'),
          color: 'teal',
          autoClose: 5000,
        });
      } else {
        setPayStep('error');
        setPayError(t('providerDashboard.telebirr_err_wrong'));
        notifications.show({
          title: t('providerDashboard.telebirr_failed_title'),
          message: t('providerDashboard.telebirr_failed_msg'),
          color: 'red',
        });
      }
    }, 2200);
  }

  function handlePayModalClose() {
    // Prevent closing while verifying
    if (payStep === 'verifying') return;
    setPayOpen(false);
    setTelebirrPass('');
    setPayError('');
  }
  function handleCancelSubmit() {
    if (!cancelReason) return;
    setCancelDone(true);
    setTimeout(() => {
      setCancelOpen(false);
      setTimeout(() => {
        setCancelDone(false);
        setCancelReason('');
        setReqState('dismissed');
      }, 300);
    }, 2000);
  }

  const N = COLORS.navyBlue;
  const T = COLORS.tealBlue;

  return (
    <DashboardLayout title={t('provider.my_jobs')}>
      <Stack gap="md">

        {/* ── NEW JOB REQUEST CARD ──────────────────────────────────────── */}
        {reqState === 'pending' && (
          <Paper p="lg" radius="xl"
            style={{ border: `2px solid ${T}55`, background: 'var(--ot-bg-card)',
              boxShadow: `0 4px 24px ${N}18` }}>

            {/* Header */}
            <Group justify="space-between" mb="md">
              <Group gap={8}>
                <Box style={{ width: 10, height: 10, borderRadius: '50%',
                  background: COLORS.success, boxShadow: `0 0 0 3px ${COLORS.success}44`,
                  animation: 'pulse 1.6s ease-in-out infinite' }}/>
                <Text size="xs" fw={700} c={T}>{t('providerDashboard.new_job_request')}</Text>
              </Group>
              <Badge size="sm" color="teal" variant="light">{MOCK_JOB_REQUEST.service}</Badge>
            </Group>

            {/* Client info */}
            <Group gap={14} mb="md" align="flex-start">
              <Avatar size={52} radius="xl" color="teal" fw={800}>
                {MOCK_JOB_REQUEST.clientName.charAt(0)}
              </Avatar>
              <Stack gap={4} style={{ flex: 1 }}>
                <Group gap={8}>
                  <Text fw={800} size="md" c={N}>{MOCK_JOB_REQUEST.clientName}</Text>
                  <Group gap={3}>
                    <IconStarFilled size={12} color={COLORS.warning}/>
                    <Text size="xs" fw={700}>{MOCK_JOB_REQUEST.clientRating}</Text>
                  </Group>
                  <Text size="xs" c="dimmed">· {t('providerDashboard.jobs_done', { count: MOCK_JOB_REQUEST.clientJobs })}</Text>
                </Group>
                <Text size="sm" c="dimmed" lineClamp={2}>{MOCK_JOB_REQUEST.description}</Text>
              </Stack>
            </Group>

            {/* Location + Distance + Price */}
            <Paper p="sm" radius="lg" mb="md"
              style={{ background: `${N}08`, border: `1px solid ${N}18` }}>
              <Group justify="space-between" wrap="nowrap">
                <Group gap={6}>
                  <IconMapPin size={14} color={T}/>
                  <Text size="sm" fw={600} c={N}>{MOCK_JOB_REQUEST.location}</Text>
                </Group>
                <Badge size="sm" color="blue" variant="light">
                  {t('providerDashboard.km_away', { dist: MOCK_JOB_REQUEST.distance })}
                </Badge>
              </Group>
              <Group justify="space-between" mt={8}>
                <Text size="xs" c="dimmed">{t('providerDashboard.estimated_pay')}</Text>
                <Text size="sm" fw={800} c={N}>
                  ETB {MOCK_JOB_REQUEST.priceMin}–{MOCK_JOB_REQUEST.priceMax}
                </Text>
              </Group>
            </Paper>

            {/* Client phone — hidden until payment */}
            <Paper p="sm" radius="lg" mb="lg"
              style={{ background: phoneVisible ? `${T}12` : `${N}06`,
                border: `1px solid ${phoneVisible ? T : N}22`,
                display: 'flex', alignItems: 'center', gap: 10 }}>
              {phoneVisible
                ? <><IconLockOpen size={16} color={T}/>
                    <Text size="sm" fw={700} c={N}>{MOCK_JOB_REQUEST.phone}</Text>
                    <Badge size="xs" color="teal" variant="light" ml="auto">{t('providerDashboard.phone_visible')}</Badge>
                  </>
                : <><IconLock size={16} color="gray"/>
                    <Text size="sm" c="dimmed">{t('providerDashboard.phone_hidden')}</Text>
                  </>
              }
            </Paper>

            {/* Action buttons */}
            <Group gap={10}>
              <Button flex={1} size="md" radius="xl"
                style={{ background: `linear-gradient(135deg,${N},${T})`, border: 'none' }}
                leftSection={<IconCheck size={16}/>}
                onClick={handleConfirm}>
                {t('providerDashboard.confirm_btn')}
              </Button>
              <Button flex={1} size="md" radius="xl" variant="light" color="red"
                leftSection={<IconX size={16}/>}
                onClick={() => setCancelOpen(true)}>
                {t('providerDashboard.cancel_btn')}
              </Button>
            </Group>
          </Paper>
        )}

        {/* ── TELEBIRR PAYMENT MODAL ──────────────────────────────────── */}
        <Modal
          opened={payOpen}
          onClose={handlePayModalClose}
          centered
          radius="xl"
          size="sm"
          withCloseButton={false}
          styles={{ content: { background: 'var(--ot-bg-card)' }, header: { display: 'none' } }}
        >
          <Stack gap="lg" p="md">

            {/* ── Modal header ── */}
            <Group justify="space-between" align="center">
              <Group gap={10}>
                <Box w={40} h={40} style={{
                  borderRadius: 12,
                  background: 'linear-gradient(135deg,#E6007A,#FF6B35)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Text fw={900} size="xs" c="white">TB</Text>
                </Box>
                <Box>
                  <Text fw={800} size="sm" c={N}>{t('providerDashboard.telebirr_title')}</Text>
                  <Text size="10px" c="dimmed">{t('providerDashboard.telebirr_subtitle')}</Text>
                </Box>
              </Group>
              {payStep !== 'verifying' && payStep !== 'success' && (
                <ActionIcon variant="subtle" radius="xl" onClick={handlePayModalClose}>
                  <IconX size={18} />
                </ActionIcon>
              )}
            </Group>

            {/* ── STEP: input / error ── */}
            {(payStep === 'input' || payStep === 'error') && (
              <>
                {/* Amount summary */}
                <Paper p="md" radius="lg"
                  style={{ background: `${T}10`, border: `1px solid ${T}33` }}>
                  <Group justify="space-between" mb={6}>
                    <Text size="sm" c="dimmed">{t('providerDashboard.telebirr_service_fee')}</Text>
                    <Text fw={800} size="lg" c={N}>
                      ETB {MOCK_JOB_REQUEST.priceMin}
                    </Text>
                  </Group>
                  <Group justify="space-between">
                    <Text size="xs" c="dimmed">{t('providerDashboard.telebirr_job')}</Text>
                    <Text size="xs" fw={600} c={N}>{MOCK_JOB_REQUEST.service}</Text>
                  </Group>
                  <Group justify="space-between" mt={4}>
                    <Text size="xs" c="dimmed">{t('providerDashboard.telebirr_client')}</Text>
                    <Text size="xs" fw={600} c={N}>{MOCK_JOB_REQUEST.clientName}</Text>
                  </Group>
                  <Text size="xs" c="dimmed" mt={8}>
                    {t('providerDashboard.telebirr_after_payment')}
                  </Text>
                </Paper>

                {/* TeleBirr logo area */}
                <Stack align="center" gap={6}>
                  <Box w={56} h={56} style={{
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg,#E6007A,#FF6B35)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: '0 4px 16px #E6007A44',
                  }}>
                    <IconShieldLock size={26} color="white" />
                  </Box>
                  <Text size="xs" c="dimmed" ta="center">
                    {t('providerDashboard.telebirr_password_hint')}
                  </Text>
                </Stack>

                {/* Password field */}
                <PasswordInput
                  label={t('providerDashboard.telebirr_password_label')}
                  placeholder={t('providerDashboard.telebirr_password_placeholder')}
                  value={telebirrPass}
                  onChange={e => {
                    setTelebirrPass(e.currentTarget.value);
                    if (payError) setPayError('');
                  }}
                  error={payError || undefined}
                  radius="lg"
                  size="md"
                  autoComplete="current-password"
                  data-autofocus
                  onKeyDown={e => { if (e.key === 'Enter') handlePay(); }}
                  styles={{
                    input: {
                      borderColor: payError ? '#FA5252' : `${T}55`,
                      background: 'var(--ot-bg-card)',
                    },
                    label: { fontWeight: 600, fontSize: 13 },
                  }}
                />

                {/* Error banner */}
                {payStep === 'error' && payError && (
                  <Paper p="sm" radius="lg"
                    style={{ background: '#FFF0F0', border: '1px solid #FA525244', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    <IconAlertCircle size={16} color="#FA5252" style={{ flexShrink: 0, marginTop: 1 }} />
                    <Text size="xs" c="red">{payError}</Text>
                  </Paper>
                )}

                {/* Security note */}
                <Paper p="sm" radius="lg"
                  style={{ background: `${N}06`, border: `1px solid ${N}18`, display: 'flex', gap: 8, alignItems: 'center' }}>
                  <IconLock size={14} color="gray" style={{ flexShrink: 0 }} />
                  <Text size="xs" c="dimmed">
                    {t('providerDashboard.telebirr_security_note')}
                  </Text>
                </Paper>

                <Button
                  size="md" radius="xl" fullWidth
                  disabled={!telebirrPass.trim()}
                  style={{
                    background: telebirrPass.trim() ? 'linear-gradient(135deg,#E6007A,#FF6B35)' : undefined,
                    border: 'none',
                  }}
                  leftSection={<IconCurrencyDollar size={16} />}
                  onClick={handlePay}
                >
                  {t('providerDashboard.telebirr_pay_btn', { amount: MOCK_JOB_REQUEST.priceMin })}
                </Button>
              </>
            )}

            {/* ── STEP: verifying ── */}
            {payStep === 'verifying' && (
              <Stack align="center" gap="lg" py="md">
                <Box w={72} h={72} style={{
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg,#E6007A22,#FF6B3522)',
                  border: '3px solid #E6007A66',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <IconShieldLock size={32} color="#E6007A" />
                </Box>
                <Stack gap={4} align="center">
                  <Text fw={800} size="md" c={N}>{t('providerDashboard.telebirr_verifying')}</Text>
                  <Text size="xs" c="dimmed" ta="center">
                    {t('providerDashboard.telebirr_verifying_hint')}
                    <br />{t('providerDashboard.telebirr_no_close')}
                  </Text>
                </Stack>
                <Progress value={100} animated color="pink" radius="xl" size="sm" w="100%" />
                <Text size="xs" c="dimmed">{t('providerDashboard.telebirr_connecting')}</Text>
              </Stack>
            )}

            {/* ── STEP: success ── */}
            {payStep === 'success' && (
              <Stack align="center" gap="md" py={8}>
                <Box w={72} h={72} style={{
                  borderRadius: '50%',
                  background: `linear-gradient(135deg,${COLORS.success},${T})`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: `0 6px 24px ${COLORS.success}55`,
                }}>
                  <IconCheck size={36} color="white" />
                </Box>
                <Stack gap={2} align="center">
                  <Text fw={800} size="lg" c={N}>{t('providerDashboard.telebirr_success_title')}</Text>
                  <Text size="xs" c="dimmed">
                    {t('providerDashboard.telebirr_success_hint', { amount: MOCK_JOB_REQUEST.priceMin })}
                  </Text>
                </Stack>

                {/* Phone reveal */}
                <Paper p="md" radius="lg" w="100%"
                  style={{ background: `${T}12`, border: `1.5px solid ${T}55`, textAlign: 'center' }}>
                  <Text size="xs" c="dimmed" mb={6} fw={600}>
                    {t('providerDashboard.telebirr_phone_label')}
                  </Text>
                  <Group gap={8} justify="center">
                    <IconPhone size={20} color={T} />
                    <Text fw={800} size="xl" c={N}>{MOCK_JOB_REQUEST.phone}</Text>
                  </Group>
                  <Text size="xs" c="dimmed" mt={6}>
                    {t('providerDashboard.telebirr_phone_hint')}
                  </Text>
                </Paper>

                <Button size="md" radius="xl" fullWidth
                  leftSection={<IconCheck size={16} />}
                  style={{ background: `linear-gradient(135deg,${N},${T})`, border: 'none' }}
                  onClick={() => { setPayOpen(false); setReqState('dismissed'); }}>
                  {t('providerDashboard.telebirr_start_job')}
                </Button>
              </Stack>
            )}

          </Stack>
        </Modal>

        {/* ── CANCEL REASON MODAL ─────────────────────────────────────── */}
        <Modal opened={cancelOpen} onClose={() => { if (!cancelDone) setCancelOpen(false); }}
          centered radius="xl" size="sm" withCloseButton={false}
          styles={{ content: { background: 'var(--ot-bg-card)' }, header: { display: 'none' } }}>
          <Stack gap="md" p="md">
            {!cancelDone ? (
              <>
                <Group justify="space-between">
                <Text fw={800} size="md" c={N}>{t('providerDashboard.cancel_why')}</Text>
                  <ActionIcon variant="subtle" onClick={() => setCancelOpen(false)}>
                    <IconX size={18}/>
                  </ActionIcon>
                </Group>
                <Text size="xs" c="dimmed">
                  {t('providerDashboard.cancel_reason_hint')}
                </Text>
                <Stack gap={8}>
                  {CANCEL_REASON_KEYS.map(key => (
                    <Button key={key} size="sm" radius="xl" fullWidth
                      variant={cancelReason === key ? 'filled' : 'light'}
                      color={cancelReason === key ? 'red' : 'gray'}
                      styles={{ root: { justifyContent: 'flex-start', paddingLeft: 20, fontWeight: 600 } }}
                      onClick={() => setCancelReason(key)}>
                      {t(`providerDashboard.${key}`)}
                    </Button>
                  ))}
                </Stack>

                {/* Offline nudge */}
                <Paper p="sm" radius="lg"
                  style={{ background: `${COLORS.warning}18`, border: `1px solid ${COLORS.warning}44` }}>
                  <Group gap={8}>
                    <IconAlertCircle size={16} color={COLORS.warning}/>
                    <Text size="xs" c="dimmed" style={{ flex: 1 }}>
                      {t('providerDashboard.cancel_offline_hint')}
                      <Text span fw={700} c={N}> {t('providerDashboard.cancel_offline_word')}</Text>
                      {' '}{t('providerDashboard.cancel_offline_sub')}
                    </Text>
                  </Group>
                  <Group gap={8} mt={10}>
                    <IconWifiOff size={14} color={COLORS.warning}/>
                    <Text size="xs" fw={600} c={COLORS.warning}>{t('providerDashboard.cancel_go_offline')}</Text>
                    <Switch size="xs" color="orange"
                      onChange={e => {
                        if (e.currentTarget.checked)
                          notifications.show({ title: t('provider.now_offline'), message: t('provider.now_offline_msg'), color: 'orange' });
                      }}/>
                  </Group>
                </Paper>

                <Button size="md" radius="xl" color="red" disabled={!cancelReason}
                  onClick={handleCancelSubmit}>
                  {t('providerDashboard.cancel_submit')}
                </Button>
              </>
            ) : (
              <Stack align="center" gap="md" py={12}>
                <Box w={64} h={64} style={{ borderRadius: '50%',
                  background: `linear-gradient(135deg,${COLORS.warning},#ff6b35)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <IconCheck size={32} color="white"/>
                </Box>
                <Text fw={800} size="lg" c={N}>{t('providerDashboard.cancel_done_title')}</Text>
                <Text size="sm" c="dimmed" ta="center">
                  {t('providerDashboard.cancel_done_hint')}
                </Text>
              </Stack>
            )}
          </Stack>
        </Modal>

        {myJobs.length === 0 ? (
          <Center py={60}>
            <Stack align="center" gap="sm">
              <ThemeIcon size={56} radius="xl" color="gray" variant="light">
                <IconBriefcase size={28} />
              </ThemeIcon>
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
                {items.map(job => (
                  <JobCard key={job.id} job={job} viewAs="provider" />
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

  const totalEarned = txns.filter(t => t.type === 'payment' || t.type === 'cashback').reduce((s, t) => s + Math.abs(t.amount), 0);
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
    <DashboardLayout title={t('provider.earnings')}>
      <Stack gap="lg">
        {/* KPI Row */}
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
          {[
            { label: t('providerDashboard.earnings_commission_pct'), value: `-${formatCurrency(totalCommission)}`, color: '#E63946', icon: <IconCurrencyDollar size={20} /> },
            { label: t('providerDashboard.earnings_net'), value: formatCurrency(netEarnings), color: COLORS.navyBlue, icon: <IconCheck size={20} /> },
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
          <Text fw={700} mb="md">{t('providerDashboard.earnings_chart_title')}</Text>
          <BarChart
            h={240}
            data={chartData}
            dataKey="month"
            series={[
              { name: 'earnings',   color: COLORS.tealBlue, label: t('providerDashboard.earnings_gross') },
              { name: 'commission', color: '#E63946',        label: t('providerDashboard.earnings_commission') },
            ]}
            barProps={{ radius: [4, 4, 0, 0] }}
          />
        </Card>

        {/* Transaction Table */}
        <Card radius="lg" withBorder p={0} style={{ overflow: 'hidden' }}>
          <Text fw={700} p="lg" pb="xs">{t('providerDashboard.tx_history')}</Text>
          <Divider />
          <ScrollArea h={320}>
            <Table striped highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>{t('providerDashboard.col_type')}</Table.Th>
                  <Table.Th>{t('providerDashboard.col_amount')}</Table.Th>
                  <Table.Th>{t('providerDashboard.col_date')}</Table.Th>
                  <Table.Th>{t('providerDashboard.col_status')}</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {txns.map(tx => (
                  <Table.Tr key={tx.id}>
                    <Table.Td><Text size="sm" tt="capitalize">{tx.type.replace(/_/g, ' ')}</Text></Table.Td>
                    <Table.Td><Text size="sm" fw={600} c={tx.amount >= 0 ? 'teal' : 'red'}>{tx.amount >= 0 ? '+' : ''}{formatCurrency(tx.amount)}</Text></Table.Td>
                    <Table.Td><Text size="xs" c="dimmed">{formatTimeAgo(tx.createdAt)}</Text></Table.Td>
                    <Table.Td><Badge size="xs" color={tx.type === 'payment' || tx.type === 'commission' ? 'teal' : 'yellow'}>{tx.type}</Badge></Table.Td>
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
      notifications.show({ title: t('providerDashboard.profile_saved_title'), message: t('providerDashboard.profile_saved_msg'), color: 'teal' });
    }, 1000);
  };

  return (
    <DashboardLayout title={t('provider.profile')}>
      <Stack gap="lg">
        {/* Avatar & verification */}
        <Card radius="lg" withBorder p="xl">
          <Group gap="lg">
            <Box style={{ position: 'relative' }}>
              <Avatar size={80} radius="xl" color="teal">
                {myProfile?.fullName?.charAt(0) ?? 'P'}
              </Avatar>
              <Box style={{ position: 'absolute', bottom: -2, right: -2, width: 20, height: 20, background: COLORS.tealBlue, borderRadius: '50%', border: '2px solid white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <IconCheck size={10} color="white" />
              </Box>
            </Box>
            <Stack gap="xs">
              <Text fw={700} size="lg">{myProfile?.fullName}</Text>
              <Text c="dimmed" size="sm">{currentUser?.email}</Text>
              <Group gap="xs">
                <Badge color="teal" size="sm" leftSection={<IconShieldCheck size={10} />}>{t('providerDashboard.profile_verified')}</Badge>
                <Badge color="yellow" size="sm">⭐ {myProfile?.rating ?? 4.7}</Badge>
              </Group>
            </Stack>
            <Box style={{ marginLeft: 'auto' }}>
              <FileButton onChange={() => { }} accept="image/*">
                {(props) => (
                  <Button {...props} variant="light" color="teal" size="sm" leftSection={<IconUpload size={14} />}>
                    {t('providerDashboard.profile_update_photo')}
                  </Button>
                )}
              </FileButton>
            </Box>
          </Group>
        </Card>

        {/* Service Info */}
        <Card radius="lg" withBorder p="xl">
          <Text fw={700} mb="md">{t('providerDashboard.profile_service_details')}</Text>
          <Stack gap="md">
            <Textarea
              label={t('providerDashboard.profile_bio_label')}
              value={bio}
              onChange={e => setBio(e.target.value)}
              rows={3}
              placeholder={t('providerDashboard.profile_bio_placeholder')}
            />
            <Select
              label={t('providerDashboard.profile_pricing_model')}
              data={[
                { value: 'hourly', label: t('providerDashboard.profile_pricing_hourly') },
                { value: 'fixed',  label: t('providerDashboard.profile_pricing_fixed') },
                { value: 'custom', label: t('providerDashboard.profile_pricing_custom') },
              ]}
              value={pricingModel}
              onChange={v => setPricingModel((v as PricingModel) ?? 'hourly')}
            />
            {pricingModel !== 'custom' && (
              <NumberInput
                label={pricingModel === 'hourly' ? t('providerDashboard.profile_hourly_rate') : t('providerDashboard.profile_fixed_price')}
                value={rate}
                onChange={v => setRate(Number(v))}
                prefix="$"
                min={10}
              />
            )}
            <Box>
              <Text size="sm" fw={600} mb="xs">{t('providerDashboard.profile_coverage_radius', { radius })}</Text>
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
                  {t('providerDashboard.profile_add_photos')}
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
                <Text c="dimmed" size="sm" mt="xs">{t('providerDashboard.profile_no_photos')}</Text>
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
          {t('providerDashboard.profile_save')}
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
      notifications.show({ title: t('providerDashboard.wallet_insufficient'), message: t('providerDashboard.wallet_insufficient_msg'), color: 'red' });
      return;
    }
    setIsWithdrawing(true);
    setTimeout(() => {
      setIsWithdrawing(false);
      notifications.show({ title: t('providerDashboard.wallet_requested_title'), message: t('providerDashboard.wallet_requested_msg', { amount: formatCurrency(withdrawAmount) }), color: 'teal' });
    }, 1500);
  };

  return (
    <DashboardLayout title={t('provider.wallet')}>
      <Stack gap="lg">
        <Box
          p="xl"
          style={{
            borderRadius: 20,
            background: `linear-gradient(135deg, ${COLORS.navyBlue} 0%, ${COLORS.navyLight} 60%, ${COLORS.tealBlue} 100%)`,
            boxShadow: `0 8px 32px ${COLORS.navyBlue}40`,
          }}
        >
          <Text size="sm" c="rgba(255,255,255,0.7)">{t('providerDashboard.wallet_available')}</Text>
          <Text style={{ fontSize: 42 }} fw={800} c="white">{formatCurrency(balance)}</Text>
          <Text size="xs" c="rgba(255,255,255,0.5)">{t('providerDashboard.wallet_after_commission')}</Text>
        </Box>

        <Card radius="lg" withBorder p="lg">
          <Text fw={700} mb="md">{t('wallet.withdraw')}</Text>
          <Stack gap="md">
            <NumberInput
              label={t('providerDashboard.wallet_withdraw_amount')}
              value={withdrawAmount}
              onChange={v => setWithdrawAmount(Number(v))}
              prefix="$"
              min={10}
              max={balance}
            />
            <Select
              label={t('providerDashboard.wallet_withdraw_method')}
              data={[
                { value: 'bank',   label: t('providerDashboard.wallet_method_bank') },
                { value: 'mpesa',  label: t('providerDashboard.wallet_method_mpesa') },
                { value: 'paypal', label: t('providerDashboard.wallet_method_paypal') },
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
  const nextTier = tiers.find(t => t.minCompletions > (tierConfig?.minCompletions ?? 0));
  const completedJobs = myProfile?.totalJobsCompleted ?? 12;
  const progress = nextTier
    ? Math.min(100, (completedJobs / nextTier.minCompletions) * 100)
    : 100;
  const tc = PROVIDER_TIER_COLORS[tier as keyof typeof PROVIDER_TIER_COLORS] ?? COLORS.tealBlue;

  return (
    <DashboardLayout title={t('provider.loyalty')}>
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
              <Text size="sm" c="dimmed">{t('providerDashboard.loyalty_jobs_completed', { count: completedJobs })}</Text>
              {nextTier && (
                <Text size="xs" c="dimmed">
                  {t('providerDashboard.loyalty_more_jobs', { remaining: nextTier.minCompletions - completedJobs, tier: formatProviderTier(nextTier.tier) })}
                </Text>
              )}
              <Progress value={progress} color={tc} size="sm" h={6} w={200} radius="xl" />
            </Stack>
          </Group>
        </Box>

        {/* Tier comparison */}
        <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
          {tiers.map(tierItem => {
            const color = PROVIDER_TIER_COLORS[tierItem.tier as keyof typeof PROVIDER_TIER_COLORS] ?? '#777';
            const isActive = tierItem.tier === tier;
            return (
              <Card key={tierItem.tier} radius="lg" withBorder p="lg"
                style={{ border: isActive ? `2px solid ${color}` : undefined, opacity: isActive ? 1 : 0.65 }}>
                <Stack gap="xs">
                  <Group justify="space-between">
                    <Badge style={{ background: color, color: 'white' }} size="sm">{formatProviderTier(tierItem.tier)}</Badge>
                    {isActive && <Badge color="teal" size="xs">{t('providerDashboard.loyalty_current')}</Badge>}
                  </Group>
                  <Text fw={700} size="sm">
                    {tierItem.commissionDiscount > 0
                      ? t('providerDashboard.loyalty_commission_discount', { pct: tierItem.commissionDiscount })
                      : t('providerDashboard.loyalty_standard_commission')}{' '}
                    {t('providerDashboard.loyalty_commission_suffix')}
                  </Text>
                  <Text size="xs" c="dimmed">
                    {t('providerDashboard.loyalty_from_jobs', { count: tierItem.minCompletions })}
                  </Text>
                  <Divider />
                  <Stack gap={4}>
                    {tierItem.benefits.map(perk => (
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
