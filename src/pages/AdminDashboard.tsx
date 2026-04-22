import { useEffect, useState } from 'react';
import {
  Text, Group, Stack, SimpleGrid, Card, Badge, Button,
  Table, ScrollArea, Select, TextInput, NumberInput,
  Slider, Modal, ActionIcon, Alert, ThemeIcon, Center,
  Textarea, Avatar,
} from '@mantine/core';
import {
  IconUsers, IconCurrencyDollar, IconCategory, IconShield,
  IconScale, IconReceipt, IconChartBar, IconLanguage,
  IconCheck, IconX, IconAlertTriangle, IconEdit, IconTrash,
  IconPlus, IconRefresh, IconTrendingUp, IconBolt,
} from '@tabler/icons-react';
import { BarChart } from '@mantine/charts';
import { useTranslation } from 'react-i18next';
import { notifications } from '@mantine/notifications';
import { DashboardLayout } from '../components/DashboardLayout';
import { storage, STORAGE_KEYS } from '../utils/storage';
import { formatCurrency, formatTimeAgo } from '../utils/formatting';
import { COLORS, ROUTES } from '../utils/constants';
import { useServiceCatalog } from '../hooks/useServiceCatalog';
import type {
  User, Job, WalletTransaction,
  FraudFlag, Dispute, CommissionConfig,
} from '../types';
import type { NavItem } from '../types/nav';

const ADMIN_NAV: NavItem[] = [
  { path: ROUTES.adminDashboard, label: 'Analytics', icon: <IconChartBar size={18} /> },
  { path: ROUTES.adminUsers, label: 'User Verification', icon: <IconUsers size={18} /> },
  { path: ROUTES.adminCommission, label: 'Commission Settings', icon: <IconCurrencyDollar size={18} /> },
  { path: ROUTES.adminCategories, label: 'Categories', icon: <IconCategory size={18} /> },
  { path: ROUTES.adminFraud, label: 'Fraud Monitoring', icon: <IconShield size={18} /> },
  { path: ROUTES.adminDisputes, label: 'Dispute Resolution', icon: <IconScale size={18} /> },
  { path: ROUTES.adminTransactions, label: 'Transactions', icon: <IconReceipt size={18} /> },
  { path: ROUTES.adminContent, label: 'Content Manager', icon: <IconLanguage size={18} /> },
];

// ─── ANALYTICS ────────────────────────────────────────────────────────────────
export function AdminAnalytics() {
  const { t } = useTranslation();
  const users = storage.get<User[]>(STORAGE_KEYS.users, []);
  const jobs = storage.get<Job[]>(STORAGE_KEYS.jobs, []);
  const txns = storage.get<WalletTransaction[]>(STORAGE_KEYS.walletTransactions, []);
  const totalRevenue = txns.filter(t => t.type === 'commission').reduce((s, t) => s + Math.abs(t.amount), 0);

  const revenueData = [
    { month: 'Jan', revenue: 1200, jobs: 34 },
    { month: 'Feb', revenue: 1800, jobs: 52 },
    { month: 'Mar', revenue: 2400, jobs: 71 },
    { month: 'Apr', revenue: 2100, jobs: 63 },
    { month: 'May', revenue: 3200, jobs: 94 },
    { month: 'Jun', revenue: 3800, jobs: 112 },
  ];

  const kpis = [
    { label: 'Total Users', value: users.length, icon: <IconUsers size={20} />, color: COLORS.navyBlue },
    { label: 'Active Jobs', value: jobs.filter(j => j.status === 'in_progress').length, icon: <IconBolt size={20} />, color: COLORS.tealBlue },
    { label: 'Platform Revenue', value: formatCurrency(totalRevenue), icon: <IconCurrencyDollar size={20} />, color: '#2A9D8F' },
    { label: 'Completed Jobs', value: jobs.filter(j => j.status === 'completed').length, icon: <IconCheck size={20} />, color: '#3A86FF' },
  ];

  return (
    <DashboardLayout navItems={ADMIN_NAV} title={t('admin.analytics')}>
      <Stack gap="lg">
        <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="md">
          {kpis.map(k => (
            <Card key={k.label} radius="lg" withBorder p="lg">
              <Group justify="space-between" mb="xs">
                <Text size="sm" c="dimmed" fw={500}>{k.label}</Text>
                <ThemeIcon size={32} radius="md" variant="light" style={{ background: `${k.color}15`, color: k.color }}>
                  {k.icon}
                </ThemeIcon>
              </Group>
              <Text size="xl" fw={800} c={k.color}>{k.value}</Text>
            </Card>
          ))}
        </SimpleGrid>
        <Card radius="lg" withBorder p="xl">
          <Text fw={700} mb="md">Platform Revenue (Monthly)</Text>
          <BarChart
            h={280}
            data={revenueData}
            dataKey="month"
            series={[
              { name: 'revenue', color: COLORS.tealBlue, label: 'Revenue ($)' },
              { name: 'jobs', color: COLORS.navyBlue, label: 'Jobs Count' },
            ]}
            barProps={{ radius: [4, 4, 0, 0] }}
          />
        </Card>
      </Stack>
    </DashboardLayout>
  );
}

// ─── USER VERIFICATION ────────────────────────────────────────────────────────
export function UserVerification() {
  const { t } = useTranslation();
  const [users, setUsers] = useState<User[]>(storage.get<User[]>(STORAGE_KEYS.users, []));
  const pending = users.filter(u => u.role === 'provider' && u.verificationStatus === 'pending');

  const approve = (id: string) => {
    const updated = users.map(u => u.id === id ? { ...u, verificationStatus: 'verified' as const } : u);
    storage.set(STORAGE_KEYS.users, updated);
    setUsers(updated);
    notifications.show({ title: 'Provider Approved ✅', message: 'Provider is now verified and visible on the platform.', color: 'teal' });
  };

  const reject = (id: string) => {
    const updated = users.filter(u => u.id !== id);
    storage.set(STORAGE_KEYS.users, updated);
    setUsers(updated);
    notifications.show({ title: 'Provider Rejected', message: 'Account has been removed from the queue.', color: 'red' });
  };

  return (
    <DashboardLayout navItems={ADMIN_NAV} title={t('admin.user_verification')}>
      <Stack gap="md">
        <Group justify="space-between">
          <Badge color={pending.length > 0 ? 'red' : 'teal'} size="lg">
            {pending.length} pending verification{pending.length !== 1 ? 's' : ''}
          </Badge>
          <Button variant="light" color="teal" size="sm" leftSection={<IconRefresh size={14} />}>
            Refresh
          </Button>
        </Group>
        {pending.length === 0 ? (
          <Center py={60}>
            <Stack align="center" gap="sm">
              <ThemeIcon size={56} radius="xl" color="teal" variant="light">
                <IconCheck size={28} />
              </ThemeIcon>
              <Text fw={600}>All providers verified!</Text>
              <Text c="dimmed" size="sm">No pending verification requests.</Text>
            </Stack>
          </Center>
        ) : (
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Provider</Table.Th>
                <Table.Th>Email</Table.Th>
                <Table.Th>Joined</Table.Th>
                <Table.Th>Actions</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {pending.map(u => (
                <Table.Tr key={u.id}>
                  <Table.Td>
                    <Group gap="xs">
                      <Avatar size={32} radius="xl" color="teal">{u.email.charAt(0).toUpperCase()}</Avatar>
                      <Text size="sm" fw={500}>{u.email}</Text>
                    </Group>
                  </Table.Td>
                  <Table.Td><Text size="sm">{u.email}</Text></Table.Td>
                  <Table.Td><Text size="xs" c="dimmed">{formatTimeAgo(u.createdAt)}</Text></Table.Td>
                  <Table.Td>
                    <Group gap="xs">
                      <Button size="xs" color="teal" onClick={() => approve(u.id)} leftSection={<IconCheck size={12} />}>
                        Approve
                      </Button>
                      <Button size="xs" color="red" variant="light" onClick={() => reject(u.id)} leftSection={<IconX size={12} />}>
                        Reject
                      </Button>
                    </Group>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        )}
      </Stack>
    </DashboardLayout>
  );
}

// ─── COMMISSION SETTINGS ──────────────────────────────────────────────────────
export function CommissionSettings() {
  const saved = storage.get<CommissionConfig>(STORAGE_KEYS.commissionConfig, { baseRate: 10, loyaltyDiscounts: { rising_pro: 0, trusted_pro: 2, elite_pro: 4 }, repeatBookingCashback: 5 });
  const [baseRate, setBaseRate] = useState(saved.baseRate);
  const [tierDiscounts, setTierDiscounts] = useState<Record<string, number>>(saved.loyaltyDiscounts);

  const save = () => {
    storage.set(STORAGE_KEYS.commissionConfig, { baseRate, loyaltyDiscounts: tierDiscounts, repeatBookingCashback: 5 });
    notifications.show({ title: 'Settings Saved ✅', message: 'Commission rates updated.', color: 'teal' });
  };

  return (
    <DashboardLayout navItems={ADMIN_NAV} title="Commission Settings">
      <Stack gap="xl" maw={600}>
        <Card radius="lg" withBorder p="xl">
          <Text fw={700} mb="md">Base Commission Rate</Text>
          <Text size="sm" c="dimmed" mb="lg">This rate applies to all jobs before loyalty discounts.</Text>
          <Group gap="md" align="center">
            <Slider flex={1} value={baseRate} onChange={setBaseRate} min={5} max={20} step={0.5}
              marks={[{ value: 5, label: '5%' }, { value: 10, label: '10%' }, { value: 15, label: '15%' }, { value: 20, label: '20%' }]}
              color="teal" label={v => `${v}%`} />
            <Badge size="lg" color="teal" w={60}>{baseRate}%</Badge>
          </Group>
        </Card>

        <Card radius="lg" withBorder p="xl">
          <Text fw={700} mb="md">Provider Tier Discounts</Text>
          {Object.entries(tierDiscounts).map(([tier, discount]) => (
            <Group key={tier} mb="md" justify="space-between">
              <Stack gap={0}>
                <Text size="sm" fw={600} tt="capitalize">{tier.replace(/_/g, ' ')}</Text>
                <Text size="xs" c="dimmed">Applied on top of base rate</Text>
              </Stack>
              <NumberInput
                size="sm"
                w={110}
                value={discount}
                onChange={v => setTierDiscounts(prev => ({ ...prev, [tier]: Number(v) }))}
                suffix="%"
                min={0}
                max={10}
              />
            </Group>
          ))}
          <Alert color="blue" icon={<IconTrendingUp size={14} />} mt="md">
            Elite Pro providers pay {baseRate - (tierDiscounts.elite_pro ?? 4)}% effective commission rate.
          </Alert>
        </Card>

        <Button size="md" onClick={save} style={{ background: COLORS.navyBlue }}>
          Save Commission Settings
        </Button>
      </Stack>
    </DashboardLayout>
  );
}

// ─── CATEGORY MANAGER ─────────────────────────────────────────────────────────
export function CategoryManager() {
  const { categories } = useServiceCatalog();
  const [cats, setCats] = useState(categories);
  const [addModal, setAddModal] = useState(false);
  const [newName, setNewName] = useState('');

  useEffect(() => {
    if (cats.length === 0 && categories.length > 0) {
      setCats(categories);
    }
  }, [categories, cats.length]);

  const deletecat = (id: string) => {
    setCats(prev => prev.filter(c => c.id !== id));
    notifications.show({ title: 'Category Deleted', message: '', color: 'red' });
  };

  const addCat = () => {
    if (!newName) return;
    setCats(prev => [...prev, { id: Date.now().toString(), name: newName, icon: 'bolt', color: '#777', subcategories: [] }]);
    setNewName('');
    setAddModal(false);
    notifications.show({ title: 'Category Added ✅', message: newName, color: 'teal' });
  };

  return (
    <DashboardLayout navItems={ADMIN_NAV} title="Category Management">
      <Stack gap="md">
        <Group justify="space-between">
          <Badge size="lg" color="navy">{cats.length} categories</Badge>
          <Button size="sm" color="teal" leftSection={<IconPlus size={14} />} onClick={() => setAddModal(true)}>
            Add Category
          </Button>
        </Group>
        <Table striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Icon</Table.Th>
              <Table.Th>Category</Table.Th>
              <Table.Th>Subcategories</Table.Th>
              <Table.Th>Actions</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {cats.map(c => (
              <Table.Tr key={c.id}>
                <Table.Td><Text size="xl">{c.icon}</Text></Table.Td>
                <Table.Td><Text size="sm" fw={600}>{c.name}</Text></Table.Td>
                <Table.Td><Badge size="sm" color="teal" variant="light">{c.subcategories.length}</Badge></Table.Td>
                <Table.Td>
                  <Group gap="xs">
                    <ActionIcon size="sm" variant="light" color="blue"><IconEdit size={12} /></ActionIcon>
                    <ActionIcon size="sm" variant="light" color="red" onClick={() => deletecat(c.id)}><IconTrash size={12} /></ActionIcon>
                  </Group>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Stack>
      <Modal opened={addModal} onClose={() => setAddModal(false)} title="Add New Category" radius="lg">
        <Stack gap="md">
          <TextInput label="Category Name" value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g. Healthcare" />
          <Button onClick={addCat} color="teal">Add Category</Button>
        </Stack>
      </Modal>
    </DashboardLayout>
  );
}

// ─── FRAUD MONITORING ─────────────────────────────────────────────────────────
export function FraudMonitoring() {
  const [flags, setFlags] = useState<FraudFlag[]>(storage.get<FraudFlag[]>(STORAGE_KEYS.fraudFlags, []));

  const dismiss = (id: string) => {
    const updated = flags.filter(f => f.id !== id);
    storage.set(STORAGE_KEYS.fraudFlags, updated);
    setFlags(updated);
    notifications.show({ title: 'Flag Dismissed', message: '', color: 'gray' });
  };

  const ban = (id: string) => {
    const updated = flags.filter(f => f.id !== id);
    storage.set(STORAGE_KEYS.fraudFlags, updated);
    setFlags(updated);
    notifications.show({ title: 'User Suspended ⛔', message: 'Account has been suspended.', color: 'red' });
  };

  return (
    <DashboardLayout navItems={ADMIN_NAV} title="Fraud Monitoring">
      <Stack gap="md">
        <Group justify="space-between">
          <Group gap="xs">
            {flags.length > 0 && <ThemeIcon size={24} radius="xl" color="red" variant="filled"><IconAlertTriangle size={14} /></ThemeIcon>}
            <Badge color={flags.length > 0 ? 'red' : 'teal'} size="lg">{flags.length} active flags</Badge>
          </Group>
        </Group>
        {flags.length === 0 ? (
          <Center py={60}>
            <Stack align="center" gap="xs">
              <ThemeIcon size={56} radius="xl" color="teal" variant="light"><IconShield size={28} /></ThemeIcon>
              <Text fw={600}>No active fraud flags</Text>
            </Stack>
          </Center>
        ) : (
          flags.map(f => (
            <Card key={f.id} radius="lg" withBorder p="lg" style={{ border: '1px solid #FFE0E0', background: '#FFF5F5' }}>
              <Group justify="space-between">
                <Stack gap="xs">
                  <Group gap="xs">
                    <Badge color="red" size="sm">{f.reason.replace(/_/g, ' ')}</Badge>
                    <Badge color={f.severity === 'high' ? 'red' : f.severity === 'medium' ? 'yellow' : 'gray'} size="sm" variant="light">
                      {f.severity.toUpperCase()}
                    </Badge>
                  </Group>
                  <Text size="sm">{f.reason}</Text>
                  <Text size="xs" c="dimmed">User: {f.userId} · {formatTimeAgo(f.createdAt)}</Text>
                </Stack>
                <Group gap="xs">
                  <Button size="xs" variant="light" color="gray" onClick={() => dismiss(f.id)}>Dismiss</Button>
                  <Button size="xs" color="red" onClick={() => ban(f.userId)}>Suspend</Button>
                </Group>
              </Group>
            </Card>
          ))
        )}
      </Stack>
    </DashboardLayout>
  );
}

// ─── DISPUTE RESOLUTION ───────────────────────────────────────────────────────
export function DisputeResolution() {
  const [disputes, setDisputes] = useState<Dispute[]>(storage.get<Dispute[]>(STORAGE_KEYS.disputes, []));
  const [resolveModal, setResolveModal] = useState<Dispute | null>(null);
  const [resolution, setResolution] = useState('');

  const resolve = () => {
    if (!resolveModal || !resolution) return;
    const updated = disputes.map(d =>
      d.id === resolveModal.id ? { ...d, status: 'resolved_client' as const, resolution } : d
    );
    storage.set(STORAGE_KEYS.disputes, updated);
    setDisputes(updated);
    setResolveModal(null);
    setResolution('');
    notifications.show({ title: 'Dispute Resolved ✅', message: '', color: 'teal' });
  };

  return (
    <DashboardLayout navItems={ADMIN_NAV} title="Dispute Resolution">
      <Stack gap="md">
        {disputes.map(d => (
          <Card key={d.id} radius="lg" withBorder p="lg"
            style={{ border: d.status === 'open' ? '1px solid #FFD166' : '1px solid #E9ECEF' }}>
            <Group justify="space-between">
              <Stack gap="xs">
                <Group gap="xs">
                  <Badge color={d.status === 'open' ? 'yellow' : (d.status === 'resolved_client' || d.status === 'resolved_provider') ? 'teal' : 'blue'}>
                    {d.status}
                  </Badge>
                  <Text size="sm" fw={600}>Job: {d.jobId}</Text>
                </Group>
                <Text size="sm">{d.reason}</Text>
                {d.resolution && <Alert color="teal" icon={<IconCheck size={12} />} p="xs" radius="md">{d.resolution}</Alert>}
                <Text size="xs" c="dimmed">Raised by {d.raisedBy} · {formatTimeAgo(d.createdAt)}</Text>
              </Stack>
              {d.status === 'open' && (
                <Button size="sm" color="teal" onClick={() => setResolveModal(d)}>
                  Resolve
                </Button>
              )}
            </Group>
          </Card>
        ))}
      </Stack>
      <Modal opened={!!resolveModal} onClose={() => setResolveModal(null)} title="Resolve Dispute" radius="lg">
        <Stack gap="md">
          <Alert color="yellow" icon={<IconScale size={14} />}>
            Dispute: {resolveModal?.reason}
          </Alert>
          <Select
            label="Decision"
            data={[
              { value: 'refund_client', label: 'Refund client — job incomplete' },
              { value: 'release_provider', label: 'Release to provider — work completed' },
              { value: 'partial_split', label: 'Split 50/50 — partial completion' },
            ]}
          />
          <Textarea label="Resolution Notes" value={resolution} onChange={e => setResolution(e.target.value)} placeholder="Document your decision..." rows={3} />
          <Button onClick={resolve} color="teal" disabled={!resolution}>Confirm Resolution</Button>
        </Stack>
      </Modal>
    </DashboardLayout>
  );
}

// ─── TRANSACTION MONITORING ───────────────────────────────────────────────────
export function TransactionMonitoring() {
  const txns = storage.get<WalletTransaction[]>(STORAGE_KEYS.walletTransactions, []);

  return (
    <DashboardLayout navItems={ADMIN_NAV} title="Transaction Monitoring">
      <Stack gap="md">
        <Group justify="space-between">
          <Badge size="lg" color="navy">{txns.length} total transactions</Badge>
        </Group>
        <Card radius="lg" withBorder p={0} style={{ overflow: 'hidden' }}>
          <ScrollArea h={520}>
            <Table striped highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>ID</Table.Th>
                  <Table.Th>User</Table.Th>
                  <Table.Th>Type</Table.Th>
                  <Table.Th>Amount</Table.Th>
                  <Table.Th>Status</Table.Th>
                  <Table.Th>Date</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {txns.map(tx => (
                  <Table.Tr key={tx.id}>
                    <Table.Td><Text size="xs" c="dimmed">{tx.id.slice(0, 8)}</Text></Table.Td>
                    <Table.Td><Text size="sm">{tx.userId}</Text></Table.Td>
                    <Table.Td><Text size="sm" tt="capitalize">{tx.type.replace(/_/g, ' ')}</Text></Table.Td>
                    <Table.Td>
                      <Text size="sm" fw={600} c={tx.amount >= 0 ? 'teal' : 'red'}>
                        {tx.amount >= 0 ? '+' : ''}{formatCurrency(tx.amount)}
                      </Text>
                    </Table.Td>
                    <Table.Td><Badge size="xs" color={tx.type === 'payment' || tx.type === 'commission' ? 'teal' : 'yellow'}>{tx.type}</Badge></Table.Td>
                    <Table.Td><Text size="xs" c="dimmed">{formatTimeAgo(tx.createdAt)}</Text></Table.Td>
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

// ─── CONTENT MANAGER ──────────────────────────────────────────────────────────
export function ContentManager() {
  const [lang, setLang] = useState('en');
  const [filter, setFilter] = useState('');
  const sampleKeys = [
    ['brand.name', 'ONE TOUCH'],
    ['brand.tagline', 'Connect. Work. Earn.'],
    ['nav.browse', 'Browse Services'],
    ['auth.login', 'Sign In'],
    ['auth.signup', 'Create Account'],
    ['client.wallet', 'My Wallet'],
    ['provider.earnings', 'My Earnings'],
    ['admin.analytics', 'Analytics'],
    ['loyalty.tier', 'Loyalty Tier'],
    ['job.status_completed', 'Completed'],
  ];

  const displayed = filter ? sampleKeys.filter(([k]) => k.includes(filter)) : sampleKeys;

  return (
    <DashboardLayout navItems={ADMIN_NAV} title="Content Manager">
      <Stack gap="md">
        <Group gap="sm">
          <Select
            data={[
              { value: 'en', label: '🇺🇸 English' },
              { value: 'am', label: '🇪🇹 Amharic' },
              { value: 'ar', label: '🇸🇦 Arabic' },
            ]}
            value={lang}
            onChange={v => setLang(v ?? 'en')}
            w={180}
          />
          <TextInput
            flex={1}
            placeholder="Filter by key..."
            value={filter}
            onChange={e => setFilter(e.target.value)}
          />
        </Group>
        <Table striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Key</Table.Th>
              <Table.Th>Value ({lang.toUpperCase()})</Table.Th>
              <Table.Th>Action</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {displayed.map(([k, v]) => (
              <Table.Tr key={k}>
                <Table.Td><Text size="xs" ff="monospace" c="dimmed">{k}</Text></Table.Td>
                <Table.Td><TextInput size="xs" defaultValue={v} styles={{ input: { border: 'none', background: 'transparent' } }} /></Table.Td>
                <Table.Td>
                  <Button size="xs" variant="subtle" color="teal">Save</Button>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Stack>
    </DashboardLayout>
  );
}
