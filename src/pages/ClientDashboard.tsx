import { useState, useEffect } from 'react';
import {
  Box, Text, Group, Stack, SimpleGrid, Card, Badge, Button,
  TextInput, Select, ScrollArea, Progress, RingProgress,
  Table, ActionIcon, Center,
  NumberInput, ThemeIcon, Divider,
} from '@mantine/core';
import {
  IconSearch, IconMapPin, IconFilter, IconList, IconMap,
  IconHeart, IconArrowUp, IconArrowDown, IconGift, IconTrophy,
  IconCreditCard, IconCircleFilled,
} from '@tabler/icons-react';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useTranslation } from 'react-i18next';
import { notifications } from '@mantine/notifications';
import { DashboardLayout } from '../components/DashboardLayout';
import { ProviderCard } from '../components/ProviderCard';
import { JobCard } from '../components/JobCard';
import { CallModal } from '../components/CallModal';
import { JobFlowModal } from '../components/JobFlowModal';
import { useAuthStore } from '../store/authStore';
import { useJobStore, useCallFlowStore } from '../store/jobStore';
import { storage, STORAGE_KEYS } from '../utils/storage';
import { formatCurrency, formatTimeAgo, calcDistance } from '../utils/formatting';
import { COLORS, ROUTES, CLIENT_TIER_COLORS } from '../utils/constants';
import { useServiceCatalog } from '../hooks/useServiceCatalog';
import { LOYALTY_CONFIG } from '../mock/mockLoyalty';
import type { ProviderProfile, WalletTransaction } from '../types';

// Fix Leaflet default icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// ─── BROWSE SERVICES (MAIN CLIENT PAGE) ───────────────────────────────────────
export function BrowseServices() {
  const { t } = useTranslation();
  const {  } = useAuthStore();
  const { startCall } = useCallFlowStore();
  const { categories } = useServiceCatalog();
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [callOpen, setCallOpen] = useState(false);
  const [bookProviderId, setBookProviderId] = useState<string | null>(null);
  const [providers, setProviders] = useState<ProviderProfile[]>([]);
  const [saved, setSaved] = useState<string[]>([]);
  const userLat = 9.0320;  // Addis Ababa, Ethiopia
  const userLng = 38.7469;

  useEffect(() => {
    const ps = storage.get<ProviderProfile[]>(STORAGE_KEYS.providerProfiles, []);
    setProviders(ps);
    const savedList = storage.get<string[]>(STORAGE_KEYS.savedProviders, []);
    setSaved(savedList);
  }, []);

  const filtered = providers.filter(p => {
    const catMatch = !selectedCategory || p.categoryId === selectedCategory;
    const qMatch = !searchQuery || p.bio?.toLowerCase().includes(searchQuery.toLowerCase());
    return catMatch && qMatch;
  });

  const withDistance = filtered.map(p => ({
    ...p,
    distance: calcDistance(userLat, userLng, p.lat ?? 9.0320, p.lng ?? 38.7469),
  })).sort((a, b) => a.distance - b.distance);

  const toggleSave = (uid: string) => {
    const next = saved.includes(uid) ? saved.filter(s => s !== uid) : [...saved, uid];
    setSaved(next);
    storage.set(STORAGE_KEYS.savedProviders, next);
  };

  const handleCall = (p: ProviderProfile) => {
    startCall(p.userId);
    setCallOpen(true);
  };

  const handleBook = (p: ProviderProfile) => {
    setBookProviderId(p.userId);
  };

  const catOptions = [
    { value: '', label: 'All Categories' },
    ...categories.map(c => ({ value: c.id, label: c.name })),
  ];

  return (
    <DashboardLayout title={t('client.browse_services')}>
      <Stack gap="md">
        {/* Controls */}
        <Group gap="sm" wrap="nowrap">
          <TextInput
            flex={1}
            placeholder={t('client.search_hint')}
            leftSection={<IconSearch size={16} />}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            radius="xl"
          />
          <Select
            data={catOptions}
            value={selectedCategory ?? ''}
            onChange={v => setSelectedCategory(v || null)}
            leftSection={<IconFilter size={16} />}
            placeholder={t('client.filter_category')}
            radius="xl"
            w={180}
            style={{ flexShrink: 0 }}
          />
          <ActionIcon.Group>
            <ActionIcon
              variant={viewMode === 'list' ? 'filled' : 'default'}
              color="navy"
              size="lg"
              radius="xl"
              onClick={() => setViewMode('list')}
            >
              <IconList size={18} />
            </ActionIcon>
            <ActionIcon
              variant={viewMode === 'map' ? 'filled' : 'default'}
              color="teal"
              size="lg"
              radius="xl"
              onClick={() => setViewMode('map')}
            >
              <IconMap size={18} />
            </ActionIcon>
          </ActionIcon.Group>
        </Group>

        {/* Results count */}
        <Group gap="xs">
          <IconCircleFilled size={8} color={COLORS.tealBlue} />
          <Text size="sm" c="dimmed">{withDistance.length} providers near you</Text>
          <Badge size="xs" color="teal" variant="light" style={{ marginLeft: 'auto' }}>
            <IconMapPin size={10} style={{ marginRight: 4 }} />
            New York, NY
          </Badge>
        </Group>

        {viewMode === 'list' ? (
          <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
            {withDistance.map(p => (
              <ProviderCard
                key={p.userId}
                provider={p}
                distance={p.distance}
                isSaved={saved.includes(p.userId)}
                onCall={handleCall}
                onBook={handleBook}
                onToggleSave={toggleSave}
              />
            ))}
          </SimpleGrid>
        ) : (
          <Box style={{ height: 500, borderRadius: 16, overflow: 'hidden', boxShadow: '0 4px 24px rgba(27,42,74,0.12)' }}>
            <MapContainer center={[userLat, userLng]} zoom={13} style={{ height: '100%', width: '100%' }}>
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution="© OpenStreetMap contributors"
              />
              {/* User position */}
              <Circle center={[userLat, userLng]} radius={500} color={COLORS.tealBlue} fillOpacity={0.15} />
              {withDistance.map(p => (
                <Marker key={p.userId} position={[p.lat ?? 40.7128, p.lng ?? -74.006]}>
                  <Popup>
                    <Stack gap={4} p="xs">
                      <Text fw={700} size="sm">{p.bio?.split('.')[0] ?? 'Service Provider'}</Text>
                      <Badge size="xs" color={p.isOnline ? 'teal' : 'gray'}>
                        {p.isOnline ? 'Online' : 'Offline'}
                      </Badge>
                      <Text size="xs">⭐ {p.rating} · ~{p.distance.toFixed(1)} km</Text>
                    </Stack>
                  </Popup>
                </Marker>
                
              ))}
            </MapContainer>
          </Box>
        )}
      </Stack>

      <CallModal
        opened={callOpen}
        onClose={() => setCallOpen(false)}
        onJobCreated={(pid) => { setBookProviderId(pid); setCallOpen(false); }}
      />
      {bookProviderId && (
        <JobFlowModal
          providerId={bookProviderId}
          opened={!!bookProviderId}
          onClose={() => setBookProviderId(null)}
        />
      )}
    </DashboardLayout>
  );
}

// ─── BOOKING HISTORY ──────────────────────────────────────────────────────────
export function BookingHistory() {
  const { t } = useTranslation();
  const { currentUser } = useAuthStore();
  const { jobs } = useJobStore();
  const [filterStatus, setFilterStatus] = useState<string | null>(null);

  const myJobs = jobs.filter(j => j.clientId === currentUser?.id);
  const displayed = filterStatus ? myJobs.filter(j => j.status === filterStatus) : myJobs;

  const statusOptions = [
    { value: '', label: 'All Statuses' },
    { value: 'completed', label: '✅ Completed' },
    { value: 'in_progress', label: '🔨 In Progress' },
    { value: 'pending_agreement', label: '⏳ Pending' },
    { value: 'cancelled', label: '❌ Cancelled' },
    { value: 'disputed', label: '⚖️ Disputed' },
  ];

  return (
    <DashboardLayout title={t('client.my_bookings')}>
      <Stack gap="md">
        <Group justify="space-between">
          <Text size="sm" c="dimmed">{displayed.length} {filterStatus ? 'matching' : 'total'} bookings</Text>
          <Select
            data={statusOptions}
            value={filterStatus ?? ''}
            onChange={v => setFilterStatus(v || null)}
            placeholder="Filter by status"
            w={190}
            radius="xl"
            size="sm"
          />
        </Group>
        {displayed.length === 0 ? (
          <Center py={60}>
            <Stack align="center" gap="sm">
              <ThemeIcon size={56} radius="xl" color="gray" variant="light">
                <IconHistory size={28} />
              </ThemeIcon>
              <Text c="dimmed">No bookings found</Text>
            </Stack>
          </Center>
        ) : (
          displayed.map(job => <JobCard key={job.id} job={job} viewAs="client" />)
        )}
      </Stack>
    </DashboardLayout>
  );
}

// ─── SAVED PROVIDERS ──────────────────────────────────────────────────────────
export function SavedProviders() {
  const { t } = useTranslation();
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [providers, setProviders] = useState<ProviderProfile[]>([]);
  const { startCall } = useCallFlowStore();
  const [callOpen, setCallOpen] = useState(false);
  const [bookProviderId, setBookProviderId] = useState<string | null>(null);

  useEffect(() => {
    const ids = storage.get<string[]>(STORAGE_KEYS.savedProviders, []);
    setSavedIds(ids);
    const ps = storage.get<ProviderProfile[]>(STORAGE_KEYS.providerProfiles, []);
    setProviders(ps.filter(p => ids.includes(p.userId)));
  }, []);

  const toggleSave = (uid: string) => {
    const next = savedIds.filter(s => s !== uid);
    setSavedIds(next);
    storage.set(STORAGE_KEYS.savedProviders, next);
    setProviders(prev => prev.filter(p => p.userId !== uid));
  };

  const handleCall = (p: ProviderProfile) => { startCall(p.userId); setCallOpen(true); };
  const handleBook = (p: ProviderProfile) => { setBookProviderId(p.userId); };

  return (
    <DashboardLayout title={t('client.saved_providers')}>
      <Stack gap="md">
        {providers.length === 0 ? (
          <Center py={60}>
            <Stack align="center" gap="sm">
              <ThemeIcon size={56} radius="xl" color="red" variant="light">
                <IconHeart size={28} />
              </ThemeIcon>
              <Text fw={600}>{t('client.no_saved')}</Text>
              <Text c="dimmed" size="sm">Browse services and tap the heart to save providers.</Text>
            </Stack>
          </Center>
        ) : (
          <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
            {providers.map(p => (
              <ProviderCard
                key={p.userId}
                provider={p}
                distance={2.4}
                isSaved
                onCall={handleCall}
                onBook={handleBook}
                onToggleSave={toggleSave}
              />
            ))}
          </SimpleGrid>
        )}
      </Stack>
      <CallModal opened={callOpen} onClose={() => setCallOpen(false)} onJobCreated={(pid) => { setBookProviderId(pid); setCallOpen(false); }} />
      {bookProviderId && <JobFlowModal providerId={bookProviderId} opened={!!bookProviderId} onClose={() => setBookProviderId(null)} />}
    </DashboardLayout>
  );
}

// ─── CLIENT WALLET ────────────────────────────────────────────────────────────
export function ClientWallet() {
  const { t } = useTranslation();
  const { currentUser } = useAuthStore();
  const [topUpAmount, setTopUpAmount] = useState<number>(50);
  const [isTopping, setIsTopping] = useState(false);
  const txns = storage.get<WalletTransaction[]>(STORAGE_KEYS.walletTransactions, [])
    .filter(tx => tx.userId === currentUser?.id);
  const profiles = storage.get<any[]>(STORAGE_KEYS.clientProfiles, []);
  const myProfile = profiles.find(p => p.userId === currentUser?.id);
  const balance = myProfile?.walletBalance ?? 120;

  const topUp = () => {
    setIsTopping(true);
    setTimeout(() => {
      setIsTopping(false);
      notifications.show({ title: `+${formatCurrency(topUpAmount)} Added!`, message: 'Wallet topped up successfully.', color: 'teal' });
    }, 1500);
  };

  return (
    <DashboardLayout title={t('client.wallet')}>
      <Stack gap="lg">
        {/* Balance Card */}
        <Box
          p="xl"
          style={{
            borderRadius: 20,
            background: `linear-gradient(135deg, ${COLORS.navyBlue} 0%, ${COLORS.navyLight} 60%, ${COLORS.tealBlue} 100%)`,
            boxShadow: `0 8px 32px ${COLORS.navyBlue}40`,
          }}
        >
          <Stack gap="xs">
            <Text size="sm" c="rgba(255,255,255,0.7)" fw={500}>{t('wallet.balance')}</Text>
            <Text style={{ fontSize: 42 }} fw={800} c="white">{formatCurrency(balance)}</Text>
            <Group gap="xs">
              <Badge color="yellow" variant="filled" size="sm">🔒 Escrow Protected</Badge>
              <Badge color="teal" variant="light" size="sm">✅ Instant Top-Up</Badge>
            </Group>
          </Stack>
        </Box>

        {/* Top-Up */}
        <Card radius="lg" withBorder p="lg">
          <Text fw={700} mb="md">{t('wallet.top_up')}</Text>
          <Group gap="sm" mb="md">
            {[20, 50, 100, 200].map(amt => (
              <Button
                key={amt}
                variant={topUpAmount === amt ? 'filled' : 'light'}
                color="teal"
                size="sm"
                onClick={() => setTopUpAmount(amt)}
                radius="xl"
              >
                +${amt}
              </Button>
            ))}
          </Group>
          <Group gap="sm">
            <NumberInput
              flex={1}
              value={topUpAmount}
              onChange={v => setTopUpAmount(Number(v))}
              prefix="$"
              min={5}
              leftSection={<IconCreditCard size={16} />}
            />
            <Button color="teal" onClick={topUp} loading={isTopping} radius="xl">
              {t('wallet.confirm_payment')}
            </Button>
          </Group>
        </Card>

        {/* Transaction History */}
        <Card radius="lg" withBorder p={0} style={{ overflow: 'hidden' }}>
          <Group p="lg" pb="xs" justify="space-between">
            <Text fw={700}>{t('wallet.transaction_history')}</Text>
            <Badge size="sm" color="gray" variant="light">{txns.length} transactions</Badge>
          </Group>
          <Divider />
          <ScrollArea h={360}>
            {txns.length === 0 ? (
              <Center py={40}>
                <Text c="dimmed" size="sm">No transactions yet</Text>
              </Center>
            ) : (
              <Table striped highlightOnHover>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Type</Table.Th>
                    <Table.Th>Amount</Table.Th>
                    <Table.Th>Date</Table.Th>

                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {txns.map(tx => (
                    <Table.Tr key={tx.id}>
                      <Table.Td>
                        <Group gap="xs">
                          {tx.amount > 0 ? <IconArrowDown size={14} color="teal" /> : <IconArrowUp size={14} color="red" />}
                          <Text size="sm" tt="capitalize">{tx.type.replace(/_/g, ' ')}</Text>
                        </Group>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm" fw={600} c={tx.amount > 0 ? 'teal' : 'red'}>
                          {tx.amount > 0 ? '+' : ''}{formatCurrency(tx.amount)}
                        </Text>
                      </Table.Td>
                      <Table.Td><Text size="xs" c="dimmed">{formatTimeAgo(tx.createdAt)}</Text></Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            )}
          </ScrollArea>
        </Card>
      </Stack>
    </DashboardLayout>
  );
}

// ─── CLIENT LOYALTY ───────────────────────────────────────────────────────────
export function ClientLoyalty() {
  const { t } = useTranslation();
  const { currentUser } = useAuthStore();
  const profiles = storage.get<any[]>(STORAGE_KEYS.clientProfiles, []);
  const myProfile = profiles.find(p => p.userId === currentUser?.id);
  const tier = (myProfile?.loyaltyTier ?? 'bronze') as keyof typeof CLIENT_TIER_COLORS;
  const totalBookings = myProfile?.totalBookings ?? 3;
  const tiers = LOYALTY_CONFIG.clientTiers;
  const currentTierConfig = tiers.find(ct => ct.tier === tier) ?? tiers[0];
  const nextTierConfig = tiers.find(ct => ct.minBookings > (currentTierConfig?.minBookings ?? 0));
  const progress = nextTierConfig
    ? Math.min(100, (totalBookings / nextTierConfig.minBookings) * 100)
    : 100;

  const tierColor = (CLIENT_TIER_COLORS as Record<string, string>)[tier] ?? '#CD7F32';
  const tierLabel = { bronze: 'Bronze', silver: 'Silver', gold: 'Gold' }[tier] ?? tier;

  return (
    <DashboardLayout title={t('client.loyalty')}>
      <Stack gap="lg">
        {/* Tier Card */}
        <Box
          p="xl"
          style={{
            borderRadius: 20,
            background: `linear-gradient(135deg, ${tierColor}20 0%, ${tierColor}10 100%)`,
            border: `2px solid ${tierColor}40`,
          }}
        >
          <Group gap="lg" align="center">
            <RingProgress
              size={100}
              thickness={8}
              sections={[{ value: progress, color: tierColor }]}
              label={
                <Center>
                  <IconTrophy size={24} color={tierColor} />
                </Center>
              }
            />
            <Stack gap="xs">
              <Group gap="xs">
                <Badge size="lg" style={{ background: tierColor, color: 'white' }}>{tierLabel}</Badge>
                <Text fw={800} size="xl" c={COLORS.navyBlue}>{t('loyalty.member')}</Text>
              </Group>
              <Text size="sm" c="dimmed">{totalBookings} bookings completed</Text>
              {nextTierConfig && (
                <Text size="xs" c="dimmed">
                  {nextTierConfig.minBookings - totalBookings} more to reach {nextTierConfig.tier.charAt(0).toUpperCase() + nextTierConfig.tier.slice(1)}
                </Text>
              )}
              <Progress value={progress} color={tierColor} radius="xl" size="sm" h={6} w={200} />
            </Stack>
          </Group>
        </Box>

        {/* Benefits */}
        <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
          {tiers.map(ct => {
            const tc = (CLIENT_TIER_COLORS as Record<string, string>)[ct.tier] ?? '#CD7F32';
            const isActive = ct.tier === tier;
            return (
              <Card key={ct.tier} radius="lg" withBorder p="lg"
                style={{ border: isActive ? `2px solid ${tc}` : undefined, opacity: isActive ? 1 : 0.65 }}>
                <Stack gap="xs">
                  <Group justify="space-between">
                    <Badge style={{ background: tc, color: 'white' }} size="sm">{ct.tier.toUpperCase()}</Badge>
                    {isActive && <Badge color="teal" size="xs">Current</Badge>}
                  </Group>
                  <Text size="lg" fw={800} c={tc}>{ct.cashbackRate}% {t('loyalty.cashback')}</Text>
                  <Text size="xs" c="dimmed">From {ct.minBookings} bookings</Text>
                  <Divider />
                  <Stack gap={4}>
                    {ct.benefits.map((perk: string) => (
                      <Group key={perk} gap="xs">
                        <IconGift size={12} color={tc} />
                        <Text size="xs">{perk}</Text>
                      </Group>
                    ))}
                  </Stack>
                </Stack>
              </Card>
            );
          })}
        </SimpleGrid>

        {/* Cashback History */}
        <Card radius="lg" withBorder p="lg">
          <Text fw={700} mb="md">💰 Cashback Earned</Text>
          <Stack gap="xs">
            {[
              { label: 'Completed "Plumbing Fix"', amount: '+$4.50', date: '2 days ago', color: 'teal' },
              { label: 'Completed "Electrical Repair"', amount: '+$7.20', date: '5 days ago', color: 'teal' },
              { label: 'Completed "House Cleaning"', amount: '+$6.00', date: '1 week ago', color: 'teal' },
            ].map((item, i) => (
              <Group key={i} justify="space-between" p="sm" style={{ borderRadius: 10, background: '#F8F9FA' }}>
                <Stack gap={2}>
                  <Text size="sm" fw={500}>{item.label}</Text>
                  <Text size="xs" c="dimmed">{item.date}</Text>
                </Stack>
                <Text fw={700} c={item.color}>{item.amount}</Text>
              </Group>
            ))}
          </Stack>
        </Card>
      </Stack>
    </DashboardLayout>
  );
}
