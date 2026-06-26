import { useEffect, useMemo, useState } from 'react';
import {
  ActionIcon,
  Avatar,
  Badge,
  Box,
  Button,
  Divider,
  Group,
  Modal,
  Paper,
  Stack,
  Switch,
  Text,
  Textarea,
  TextInput,
  ThemeIcon,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  IconBell,
  IconChevronRight,
  IconDeviceDesktop,
  IconFileText,
  IconGlobe,
  IconHome,
  IconInfoCircle,
  IconMail,
  IconMoon,
  IconPackage,
  IconPhone,
  IconPencil,
  IconReceipt,
  IconSettings,
  IconShieldLock,
  IconSun,
  IconTrash,
  IconUser,
} from '@tabler/icons-react';
import { ProviderSidebar } from '../../components/ProviderSidebar';
import { useAuthStore } from '../../store/authStore';
import { storage, STORAGE_KEYS } from '../../utils/storage';
import { COLORS, ROUTES } from '../../utils/constants';
import { listServiceCategories } from '../../services/providerProfileService';
import type { ProviderProfile, User } from '../../types';
import * as authService from '../../services/authService';

const THEME_KEY = 'ot_provider_theme';
const ALERTS_KEY = 'ot_provider_alerts';
const SMS_KEY = 'ot_provider_sms';
const APP_VERSION = 'OneTouch v1.0.0';

type ThemeMode = 'light' | 'dark' | 'system';

const NAV = [
  { labelKey: 'providerSettings.nav_dashboard', icon: <IconHome size={16} />, r: ROUTES.providerDashboard },
  { labelKey: 'providerSettings.nav_jobs', icon: <IconPackage size={16} />, r: ROUTES.providerJobs },
  { labelKey: 'providerSettings.nav_earnings', icon: <IconReceipt size={16} />, r: ROUTES.providerEarnings },
  { labelKey: 'providerSettings.nav_profile', icon: <IconUser size={16} />, r: ROUTES.providerProfile },
  { labelKey: 'providerSettings.nav_settings', icon: <IconSettings size={16} />, r: ROUTES.providerSettings },
];

const themeOptions: ThemeMode[] = ['light', 'dark', 'system'];

function resolveTheme(mode: ThemeMode) {
  if (mode === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return mode;
}

function applyTheme(mode: ThemeMode) {
  const resolved = resolveTheme(mode);
  document.documentElement.dataset.theme = resolved;
  document.documentElement.style.colorScheme = resolved;
}

function capitalize(text: string) {
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : '';
}

export function ProviderSettings() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { currentUser, providerProfile: authProfile, logout, updateProviderOnlineStatus } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [deleteOpened, { open: openDelete, close: closeDelete }] = useDisclosure(false);
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => storage.get<ThemeMode>(THEME_KEY, 'system'));
  const [newJobAlerts, setNewJobAlerts] = useState(() => storage.get<boolean>(ALERTS_KEY, true));
  const [smsNotifications, setSmsNotifications] = useState(() => storage.get<boolean>(SMS_KEY, false));
  const [profile, setProfile] = useState<ProviderProfile | null>(authProfile);
  const [fullName, setFullName] = useState(authProfile?.fullName ?? '');
  const [bio, setBio] = useState(authProfile?.bio ?? '');
  const [phone, setPhone] = useState(currentUser?.phone ?? '');
  const [online, setOnline] = useState(authProfile?.isOnline ?? false);
  const [serviceNames, setServiceNames] = useState<string[]>([]);
  const [serviceSummary, setServiceSummary] = useState('');

  const initial = useMemo(() => (fullName || currentUser?.email || 'P').charAt(0).toUpperCase(), [currentUser?.email, fullName]);
  const isVerified = currentUser?.verificationStatus === 'verified';
  const isUnderReview = currentUser?.verificationStatus === 'pending';
  const pageTitle = t('providerSettings.title');

  useEffect(() => {
    applyTheme(themeMode);
    storage.set(THEME_KEY, themeMode);
  }, [themeMode]);

  useEffect(() => {
    storage.set(ALERTS_KEY, newJobAlerts);
  }, [newJobAlerts]);

  useEffect(() => {
    storage.set(SMS_KEY, smsNotifications);
  }, [smsNotifications]);

  useEffect(() => {
    if (!currentUser) {
      navigate(ROUTES.login);
      return;
    }

    if (authProfile) {
      setProfile(authProfile);
      setFullName(authProfile.fullName ?? '');
      setBio(authProfile.bio ?? '');
      setOnline(authProfile.isOnline ?? false);
    }
    setPhone(currentUser.phone ?? '');
  }, [authProfile, currentUser, navigate]);

  useEffect(() => {
    const loadServiceLabels = async () => {
      if (!profile) {
        setServiceNames([]);
        setServiceSummary('');
        return;
      }

      try {
        const categories = await listServiceCategories();
        const category = categories.find((item) => String(item.id) === profile.categoryId);
        const labels: string[] = [];
        if (category?.name) labels.push(category.name);
        if (profile.subcategoryId) labels.push(capitalize(profile.subcategoryId.replace(/[-_]/g, ' ')));
        setServiceNames(labels.length ? labels : ['General Service']);
        setServiceSummary(labels.join(' · '));
      } catch {
        setServiceNames(['General Service']);
        setServiceSummary('General Service');
      }
    };

    loadServiceLabels();
  }, [profile]);

  useEffect(() => {
    let isMounted = true;

    const refreshProfile = async () => {
      try {
        const latest = await authService.getProfile();
        if (!isMounted || latest.role !== 'provider') return;

        const providerProfiles = storage.get<ProviderProfile[]>(STORAGE_KEYS.providerProfiles, []);
        const existingProfile = providerProfiles.find((item) => item.userId === currentUser?.id) ?? null;

        if (existingProfile) {
          setProfile(existingProfile);
          setFullName(existingProfile.fullName ?? '');
          setBio(existingProfile.bio ?? '');
          setOnline(existingProfile.isOnline ?? false);
        }

        setPhone(latest.phone_number ?? currentUser?.phone ?? '');
      } catch {
        // Keep local state when profile refresh is unavailable.
      }
    };

    refreshProfile();
    return () => {
      isMounted = false;
    };
  }, [currentUser?.phone, currentUser?.id]);

  const saveProfile = () => {
    const users = storage.get<User[]>(STORAGE_KEYS.users, []);
    const updatedUsers = users.map((user) => (user.id === currentUser?.id ? { ...user, phone } : user));
    storage.set(STORAGE_KEYS.users, updatedUsers);

    const providerProfiles = storage.get<ProviderProfile[]>(STORAGE_KEYS.providerProfiles, []);
    const updatedProfiles = providerProfiles.map((item) =>
      item.userId === currentUser?.id
        ? {
            ...item,
            fullName,
            bio,
            isOnline: online,
          }
        : item,
    );
    storage.set(STORAGE_KEYS.providerProfiles, updatedProfiles);

    const updatedCurrentUser = updatedUsers.find((user) => user.id === currentUser?.id) ?? null;
    if (updatedCurrentUser) {
      storage.set(STORAGE_KEYS.currentUser, updatedCurrentUser);
    }

    setProfile(updatedProfiles.find((item) => item.userId === currentUser?.id) ?? null);
    window.location.reload();
  };

  const handleToggleOnline = (checked: boolean) => {
    setOnline(checked);
    updateProviderOnlineStatus(checked);
  };

  const onlineStyles = online
    ? {
        background: `linear-gradient(135deg, ${COLORS.navyBlue} 0%, ${COLORS.tealBlue} 100%)`,
        border: 'none',
        color: 'white',
      }
    : {
        background: 'var(--ot-bg-card)',
        border: '1px solid var(--ot-border)',
        color: COLORS.navyBlue,
      };

  return (
    <Box style={{ minHeight: '100vh', background: 'var(--ot-bg-page)' }}>
      {/* Sidebar backdrop */}
      {sidebarOpen && (
        <Box
          onClick={() => setSidebarOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.45)',
            zIndex: 399,
          }}
        />
      )}

      {/* Sidebar */}
      <Box
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          bottom: 0,
          width: 260,
          zIndex: 400,
          transform: sidebarOpen ? 'translateX(0)' : 'translateX(-260px)',
          transition: 'transform 0.26s cubic-bezier(0.22,1,0.36,1)',
        }}
      >
        <ProviderSidebar onClose={() => setSidebarOpen(false)} />
      </Box>

      <Box
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 200,
          background: 'var(--ot-bg-card)',
          borderBottom: '1px solid var(--ot-border)',
        }}
      >
        <Box px={20} py={12} style={{ maxWidth: 1100, margin: '0 auto' }}>
          <Group justify="space-between">
            <Group gap={12}>
              <ActionIcon variant="subtle" size="lg" onClick={() => setSidebarOpen(true)}>
                <IconSettings size={22} />
              </ActionIcon>
              <Group gap={8}>
                <Box
                  w={32}
                  h={32}
                  style={{
                    borderRadius: 9,
                    background: COLORS.navyBlue,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text fw={900} size="11px" c="white">
                    {t('brand.short')}
                  </Text>
                </Box>
                <Text fw={800} size="sm" c={COLORS.navyBlue} visibleFrom="sm">
                  {t('brand.name')}
                </Text>
              </Group>
            </Group>
            <Group gap={10}>
              <Avatar radius="xl" size="sm" color="teal" style={{ cursor: 'pointer' }} onClick={() => setSidebarOpen(true)}>
                {initial}
              </Avatar>
            </Group>
          </Group>
        </Box>
      </Box>

      <Box style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 16px 64px' }}>
        <Stack gap={20}>
          <Paper p="xl" radius="xl" style={{ background: 'var(--ot-bg-card)', border: '1px solid var(--ot-border)' }}>
            <Box
              p="xl"
              style={{
                borderRadius: 20,
                background: `linear-gradient(135deg, ${COLORS.navyBlue} 0%, ${COLORS.tealBlue} 100%)`,
                color: 'white',
              }}
            >
              <Group justify="space-between" align="flex-start" gap="md" wrap="wrap">
                <Box>
                  <Text fw={900} size="30px" lh={1.1} c="white">
                    {pageTitle}
                  </Text>
                  <Text size="sm" mt={6} c="rgba(255,255,255,0.9)">
                    {t('providerSettings.subtitle')}
                  </Text>
                  <Group mt="md" gap="xs">
                    <Badge radius="xl" color="dark" variant="white" style={{ color: COLORS.navyBlue }}>
                      {serviceSummary || t('providerSettings.profile.serviceFallback')}
                    </Badge>
                    <Badge radius="xl" color="teal" variant="white" style={{ color: COLORS.tealBlue }}>
                      {t('providerSettings.support.versionLabel')}: {APP_VERSION}
                    </Badge>
                  </Group>
                </Box>
                <Group gap="sm">
                  <ThemeIcon size={64} radius="xl" variant="white" color="dark">
                    <IconSettings size={30} />
                  </ThemeIcon>
                  <Avatar size={64} radius="xl" color="teal">
                    {initial}
                  </Avatar>
                </Group>
              </Group>
            </Box>

            <Stack gap={20} mt="lg">
              <Paper
                p="lg"
                radius="xl"
                style={{ background: 'var(--ot-bg-card)', border: '1px solid var(--ot-border)' }}
              >
                <Box
                  p="lg"
                  style={{
                    borderRadius: 18,
                    background: `linear-gradient(135deg, ${COLORS.navyBlue} 0%, ${COLORS.tealBlue} 100%)`,
                    color: 'white',
                  }}
                >
                  <Group justify="space-between" align="flex-start" gap="md" wrap="wrap">
                    <Box>
                      <Text fw={800} size="md" c="white">
                        {t('providerSettings.profile.title')}
                      </Text>
                      <Text size="sm" c="rgba(255,255,255,0.88)">
                        {t('providerSettings.profile.subtitle')}
                      </Text>
                    </Box>
                    <Badge variant="white" color="teal" style={{ color: COLORS.tealBlue }}>
                      {online ? t('providerSettings.status.online') : t('providerSettings.status.offline')}
                    </Badge>
                  </Group>
                </Box>

                <Stack gap="lg" mt="lg">
                  <Group align="flex-start" gap="lg" wrap="nowrap">
                    <Box style={{ position: 'relative' }}>
                      <Avatar size={96} radius="xl" color="teal">
                        {initial}
                      </Avatar>
                      <ActionIcon
                        variant="filled"
                        color="dark"
                        size="sm"
                        style={{ position: 'absolute', right: -4, bottom: -4, border: '2px solid var(--ot-bg-card)' }}
                      >
                        <IconPencil size={14} />
                      </ActionIcon>
                    </Box>

                    <Stack gap="sm" style={{ flex: 1 }}>
                      <TextInput
                        label={t('providerSettings.profile.fullName')}
                        value={fullName}
                        onChange={(event) => setFullName(event.currentTarget.value)}
                        styles={{ input: { borderRadius: 12 } }}
                      />
                      <TextInput
                        label={t('providerSettings.profile.phone')}
                        value={phone}
                        readOnly
                        rightSection={<Badge variant="light" color="teal">{t('providerSettings.profile.phoneVerified')}</Badge>}
                        styles={{ input: { borderRadius: 12, background: 'var(--ot-bg-card)' } }}
                      />
                      <Textarea
                        label={t('providerSettings.profile.bio')}
                        value={bio}
                        onChange={(event) => setBio(event.currentTarget.value)}
                        minRows={4}
                        autosize
                        styles={{ input: { borderRadius: 12 } }}
                        placeholder={t('providerSettings.profile.bioPlaceholder')}
                      />
                    </Stack>
                  </Group>

                  <Box>
                    <Text fw={700} size="sm" c={COLORS.navyBlue} mb="xs">
                      {t('providerSettings.profile.services')}
                    </Text>
                    <Group gap="xs" wrap="wrap">
                      {serviceNames.map((service) => (
                        <Badge key={service} variant="light" color="teal" radius="xl">
                          {service}
                        </Badge>
                      ))}
                    </Group>
                  </Box>

                  <Group justify="space-between" align="center" wrap="wrap">
                    <Text size="sm" c="var(--ot-text-muted)">
                      {t('providerSettings.profile.serviceSetupHint')}
                    </Text>
                    <Button
                      variant="light"
                      color="teal"
                      radius="xl"
                      onClick={() => navigate(ROUTES.providerProfile)}
                      rightSection={<IconChevronRight size={16} />}
                    >
                      {t('providerSettings.profile.editServices')}
                    </Button>
                  </Group>

                  <Group justify="flex-end">
                    <Button
                      onClick={saveProfile}
                      radius="xl"
                      style={{
                        background: `linear-gradient(135deg, ${COLORS.navyBlue} 0%, ${COLORS.tealBlue} 100%)`,
                        color: 'white',
                        border: 'none',
                      }}
                    >
                      {t('common.save')}
                    </Button>
                  </Group>
                </Stack>
              </Paper>

              <Paper p="lg" radius="xl" style={{ background: 'var(--ot-bg-card)', border: '1px solid var(--ot-border)' }}>
                <Text fw={800} size="md" c={COLORS.navyBlue} mb="md">
                  {t('providerSettings.availability.title')}
                </Text>
                <Group
                  justify="space-between"
                  align="center"
                  p="md"
                  style={onlineStyles}
                >
                  <Box>
                    <Group gap={10} mb={4}>
                      <Box
                        w={12}
                        h={12}
                        style={{
                          borderRadius: '50%',
                          background: online ? COLORS.success : '#9CA3AF',
                          boxShadow: online ? `0 0 0 4px rgba(46,204,113,.35)` : 'none',
                        }}
                      />
                      <Text fw={800} size="md" c={online ? 'white' : COLORS.navyBlue}>
                        {online ? t('providerSettings.status.online') : t('providerSettings.status.offline')}
                      </Text>
                    </Group>
                    <Text size="sm" c={online ? 'rgba(255,255,255,0.8)' : 'var(--ot-text-muted)'}>
                      {online ? t('providerSettings.availability.onlineHint') : t('providerSettings.availability.offlineHint')}
                    </Text>
                  </Box>
                  <Switch
                    checked={online}
                    onChange={(event) => handleToggleOnline(event.currentTarget.checked)}
                    size="xl"
                    color="teal"
                    onLabel="ON"
                    offLabel="OFF"
                    styles={{ track: { cursor: 'pointer' } }}
                    disabled={isUnderReview}
                  />
                </Group>
              </Paper>

              <Paper p="lg" radius="xl" style={{ background: 'var(--ot-bg-card)', border: '1px solid var(--ot-border)' }}>
                <Text fw={800} size="md" c={COLORS.navyBlue} mb="md">
                  {t('providerSettings.preferences.title')}
                </Text>
                <Stack gap={0}>
                  <Group justify="space-between" align="center" py="sm">
                    <Group gap={12}>
                      <ThemeIcon size={38} radius="xl" variant="light" color="teal">
                        <IconGlobe size={18} />
                      </ThemeIcon>
                      <Box>
                        <Text fw={600} size="sm" c={COLORS.navyBlue}>
                          {t('providerSettings.preferences.language')}
                        </Text>
                        <Text size="xs" c="var(--ot-text-muted)">
                          {t('providerSettings.preferences.languageHint')}
                        </Text>
                      </Box>
                    </Group>
                    <Badge size="lg" variant="light" color="teal">{t('common.english')}</Badge>
                  </Group>
                  <Divider />
                  <Group justify="space-between" align="center" py="sm">
                    <Group gap={12}>
                      <ThemeIcon size={38} radius="xl" variant="light" color="teal">
                        {themeMode === 'light' ? <IconSun size={18} /> : themeMode === 'dark' ? <IconMoon size={18} /> : <IconDeviceDesktop size={18} />}
                      </ThemeIcon>
                      <Box>
                        <Text fw={600} size="sm" c={COLORS.navyBlue}>
                          {t('providerSettings.preferences.theme')}
                        </Text>
                        <Text size="xs" c="var(--ot-text-muted)">
                          {t('providerSettings.preferences.themeHint')}
                        </Text>
                      </Box>
                    </Group>
                    <Group gap={8} wrap="wrap">
                      {themeOptions.map((option) => {
                        const active = themeMode === option;
                        return (
                          <Button
                            key={option}
                            size="xs"
                            radius="xl"
                            variant={active ? 'filled' : 'light'}
                            color={active ? 'teal' : 'gray'}
                            onClick={() => setThemeMode(option)}
                            leftSection={
                              option === 'light' ? <IconSun size={14} /> : option === 'dark' ? <IconMoon size={14} /> : <IconDeviceDesktop size={14} />
                            }
                          >
                            {t(`providerSettings.preferences.theme_${option}`)}
                          </Button>
                        );
                      })}
                    </Group>
                  </Group>
                  <Divider />
                  <Group justify="space-between" align="center" py="sm">
                    <Group gap={12}>
                      <ThemeIcon size={38} radius="xl" variant="light" color="teal">
                        <IconBell size={18} />
                      </ThemeIcon>
                      <Box>
                        <Text fw={600} size="sm" c={COLORS.navyBlue}>
                          {t('providerSettings.preferences.newJobAlerts')}
                        </Text>
                        <Text size="xs" c="var(--ot-text-muted)">
                          {t('providerSettings.preferences.newJobAlertsHint')}
                        </Text>
                      </Box>
                    </Group>
                    <Switch checked={newJobAlerts} onChange={(event) => setNewJobAlerts(event.currentTarget.checked)} color="teal" />
                  </Group>
                  <Divider />
                  <Group justify="space-between" align="center" py="sm">
                    <Group gap={12}>
                      <ThemeIcon size={38} radius="xl" variant="light" color="teal">
                        <IconPhone size={18} />
                      </ThemeIcon>
                      <Box>
                        <Text fw={600} size="sm" c={COLORS.navyBlue}>
                          {t('providerSettings.preferences.smsNotifications')}
                        </Text>
                        <Text size="xs" c="var(--ot-text-muted)">
                          {t('providerSettings.preferences.smsNotificationsHint')}
                        </Text>
                      </Box>
                    </Group>
                    <Switch checked={smsNotifications} onChange={(event) => setSmsNotifications(event.currentTarget.checked)} color="teal" />
                  </Group>
                </Stack>
              </Paper>

              <Paper p="lg" radius="xl" style={{ background: 'var(--ot-bg-card)', border: '1px solid var(--ot-border)' }}>
                <Text fw={800} size="md" c={COLORS.navyBlue} mb="md">
                  {t('providerSettings.account.title')}
                </Text>
                <Stack gap={0}>
                  <Box
                    p="sm"
                    onClick={() => navigate('/provider/commission')}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      cursor: 'pointer',
                      borderRadius: 12,
                    }}
                  >
                    <Group gap={12}>
                      <ThemeIcon size={38} radius="xl" variant="light" color="teal">
                        <IconReceipt size={18} />
                      </ThemeIcon>
                      <Text fw={600} size="sm" c={COLORS.navyBlue}>
                        {t('providerSettings.account.commissionHistory')}
                      </Text>
                    </Group>
                    <IconChevronRight size={18} color={COLORS.navyBlue} />
                  </Box>
                  <Divider my="sm" />
                  <Button
                    color="red"
                    variant="light"
                    radius="xl"
                    leftSection={<IconTrash size={16} />}
                    onClick={openDelete}
                    fullWidth
                  >
                    {t('providerSettings.account.deleteAccount')}
                  </Button>
                </Stack>
              </Paper>

              <Paper p="lg" radius="xl" style={{ background: 'var(--ot-bg-card)', border: '1px solid var(--ot-border)' }}>
                <Text fw={800} size="md" c={COLORS.navyBlue} mb="md">
                  {t('providerSettings.support.title')}
                </Text>
                <Stack gap={0}>
                  {[
                    { key: 'helpCenter', icon: <IconInfoCircle size={18} />, route: ROUTES.helpCenter },
                    { key: 'contactSupport', icon: <IconMail size={18} />, route: ROUTES.support },
                    { key: 'terms', icon: <IconFileText size={18} />, route: ROUTES.termsOfService },
                    { key: 'privacy', icon: <IconShieldLock size={18} />, route: ROUTES.privacyPolicy },
                  ].map((item, index, array) => (
                    <Box key={item.key}>
                      <Box
                        p="sm"
                        onClick={() => navigate(item.route)}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          cursor: 'pointer',
                          borderRadius: 12,
                        }}
                      >
                        <Group gap={12}>
                          <ThemeIcon size={38} radius="xl" variant="light" color="teal">
                            {item.icon}
                          </ThemeIcon>
                          <Text fw={600} size="sm" c={COLORS.navyBlue}>
                            {t(`providerSettings.support.${item.key}`)}
                          </Text>
                        </Group>
                        <IconChevronRight size={18} color={COLORS.navyBlue} />
                      </Box>
                      {index < array.length - 1 && <Divider my="sm" />}
                    </Box>
                  ))}
                  <Text size="xs" c="var(--ot-text-muted)" mt="md">
                    {APP_VERSION}
                  </Text>
                </Stack>
              </Paper>
            </Stack>
          </Paper>
        </Stack>
      </Box>

      <Modal opened={deleteOpened} onClose={closeDelete} title={t('providerSettings.deleteDialog.title')} centered radius="xl">
        <Stack gap="md">
          <Text size="sm" c="dimmed">
            {t('providerSettings.deleteDialog.body')}
          </Text>
          <Group justify="flex-end">
            <Button variant="default" onClick={closeDelete}>
              {t('common.cancel')}
            </Button>
            <Button
              color="red"
              onClick={() => {
                closeDelete();
              }}
            >
              {t('providerSettings.deleteDialog.confirm')}
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Box>
  );
}
