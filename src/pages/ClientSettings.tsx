import { useEffect, useMemo, useState } from 'react';
import {
  Avatar, Badge, Box, Button, Group, Modal, Paper, Stack, Switch, Text, TextInput, ThemeIcon,
  ActionIcon,
} from '@mantine/core';
import {
  IconChevronRight, IconHeart, IconMenu2, IconMoon,
  IconPencil, IconSettings, IconSun, IconDeviceDesktop, IconTrash,
  IconHelpCircle, IconMail, IconFileText, IconShieldLock,
} from '@tabler/icons-react';
import { useDisclosure } from '@mantine/hooks';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../store/authStore';
import { storage, STORAGE_KEYS } from '../utils/storage';
import { COLORS, ROUTES } from '../utils/constants';
import type { ClientProfile, User } from '../types';
import { ClientSidebar } from '../components/ClientSidebar';

const THEME_KEY = 'ot_client_theme';
const NOTIFICATION_KEY = 'ot_client_settings_notifications';
const APP_VERSION = '0.0.0';

type ThemeMode = 'light' | 'dark' | 'system';

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

export function ClientSettings() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { currentUser, clientProfile } = useAuthStore();

  const [sidebar, setSidebar] = useState(false);
  const [deleteOpened, { open: openDelete, close: closeDelete }] = useDisclosure(false);
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => storage.get<ThemeMode>(THEME_KEY, 'system'));
  const [pushNotifications, setPushNotifications] = useState(() => storage.get<boolean>(`${NOTIFICATION_KEY}.push`, true));
  const [smsNotifications, setSmsNotifications] = useState(() => storage.get<boolean>(`${NOTIFICATION_KEY}.sms`, false));
  const [fullName, setFullName] = useState(clientProfile?.fullName ?? '');
  const [email, setEmail] = useState(currentUser?.email ?? '');
  const [avatarEdited, setAvatarEdited] = useState(false);
 

  const phone = currentUser?.phone ?? '';
  const initial = useMemo(() => (clientProfile?.fullName ?? currentUser?.email ?? 'C').charAt(0).toUpperCase(), [clientProfile?.fullName, currentUser?.email]);
  const verified = currentUser?.verificationStatus === 'verified';
  const totalOrders = clientProfile?.totalBookings ?? 0;
  const memberSince = currentUser?.createdAt ? new Date(currentUser.createdAt).toLocaleDateString() : '--';

  useEffect(() => {
    applyTheme(themeMode);
    storage.set(THEME_KEY, themeMode);
  }, [themeMode]);

  useEffect(() => {
    storage.set(`${NOTIFICATION_KEY}.push`, pushNotifications);
  }, [pushNotifications]);

  useEffect(() => {
    storage.set(`${NOTIFICATION_KEY}.sms`, smsNotifications);
  }, [smsNotifications]);

 

  useEffect(() => {
    if (!currentUser) {
      navigate(ROUTES.login);
      return;
    }
    if (clientProfile?.fullName) setFullName(clientProfile.fullName);
    if (currentUser.email) setEmail(currentUser.email);
  }, [clientProfile?.fullName, currentUser, navigate]);

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => {
      const stored = storage.get<ThemeMode>(THEME_KEY, 'system');
      if (stored === 'system') applyTheme('system');
    };
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);

  const saveProfile = () => {
    const users = storage.get<User[]>(STORAGE_KEYS.users, []);
    const updatedUsers = users.map((user) => (user.id === currentUser?.id ? { ...user, email } : user));
    storage.set(STORAGE_KEYS.users, updatedUsers);

    const profiles = storage.get<ClientProfile[]>(STORAGE_KEYS.clientProfiles, []);
    const updatedProfiles = profiles.map((profile) => (profile.userId === currentUser?.id ? { ...profile, fullName } : profile));
    storage.set(STORAGE_KEYS.clientProfiles, updatedProfiles);

    const updatedCurrentUser = updatedUsers.find((user) => user.id === currentUser?.id) ?? null;
    if (updatedCurrentUser) {
      storage.set(STORAGE_KEYS.currentUser, updatedCurrentUser);
    }
    window.location.reload();
  };

 

  const themeButtons = themeOptions.map((option) => ({
    key: option,
    label: t(`clientSettings.theme_${option}`),
    icon: option === 'light' ? <IconSun size={16} /> : option === 'dark' ? <IconMoon size={16} /> : <IconDeviceDesktop size={16} />,
  }));

  return (
    <Box style={{ minHeight: '100vh', background: 'var(--ot-bg-page)', position: 'relative', overflow: 'hidden' }}>
      {/* Sidebar */}
      <Box style={{ position: 'fixed', top: 0, left: 0, bottom: 0, width: 260, zIndex: 400,
        transform: sidebar ? 'translateX(0)' : 'translateX(-260px)',
        transition: 'transform 0.26s cubic-bezier(0.22,1,0.36,1)' }}>
        <ClientSidebar onClose={() => setSidebar(false)} />
      </Box>

      {/* Header */}
      <Box style={{ position: 'sticky', top: 0, zIndex: 200, background: 'var(--ot-bg-card)', borderBottom: '1px solid var(--ot-border)' }}>
        <Box px={20} py={12} style={{ maxWidth: 960, margin: '0 auto' }}>
          <Group justify="space-between">
            <Group gap={12}>
              <ActionIcon variant="subtle" size="lg" onClick={() => setSidebar(true)}>
                <IconMenu2 size={22} />
              </ActionIcon>
              <Group gap={8}>
                <Box w={32} h={32} style={{ borderRadius: 9, background: COLORS.navyBlue, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Text fw={900} size="11px" c="white">{t('brand.short')}</Text>
                </Box>
                <Text fw={800} size="sm" c={COLORS.navyBlue} visibleFrom="sm">{t('brand.name')}</Text>
              </Group>
            </Group>
            <Group gap={10}>
              <Avatar radius="xl" size="sm" color="teal" style={{ cursor: 'pointer' }} onClick={() => setSidebar(true)}>
                {initial}
              </Avatar>
            </Group>
          </Group>
        </Box>
      </Box>
        <Box
          style={{
            position: 'absolute',
            top: -120,
            right: -120,
            width: 360,
            height: 360,
            borderRadius: '50%',
            background: `radial-gradient(circle, ${COLORS.tealBlue}33 0%, transparent 70%)`,
            pointerEvents: 'none',
          }}
        />
        <Box
          style={{
            position: 'absolute',
            top: 220,
            left: -160,
            width: 420,
            height: 420,
            borderRadius: '50%',
            background: `radial-gradient(circle, ${COLORS.navyBlue}22 0%, transparent 72%)`,
            pointerEvents: 'none',
          }}
        />

      <Box style={{ maxWidth: 1000, margin: '0 auto', padding: '28px 16px 72px', position: 'relative', zIndex: 1 }}>
        <Stack gap="lg">
          <Paper
            p="xl"
            radius="xl"
            style={{
              background: 'var(--ot-bg-card)',
              border: '1px solid var(--ot-border)',
              boxShadow: '0 20px 50px rgba(8, 28, 78, 0.08)',
            }}
          >
            <Box
              p="xl"
              mb="lg"
              style={{
                borderRadius: 20,
                background: `linear-gradient(135deg, ${COLORS.navyBlue} 0%, ${COLORS.tealBlue} 100%)`,
                color: 'white',
              }}
            >
              <Group justify="space-between" align="flex-start" gap="md" wrap="wrap">
                <Box>
                  <Text fw={900} size="30px" lh={1.1} c="white">{t('clientSettings.title')}</Text>
                  <Text size="sm" mt={6} c="rgba(255,255,255,0.9)">{t('clientSettings.subtitle')}</Text>
                  <Group mt="md" gap="xs">
                    <Badge radius="xl" color="dark" variant="white" style={{ color: COLORS.navyBlue }}>
                      {verified ? t('clientSettings.profile.verified') : t('clientSettings.profile.unverified')}
                    </Badge>
                    <Badge radius="xl" color="teal" variant="white" style={{ color: COLORS.tealBlue }}>
                      {t('clientSettings.support.version')} {APP_VERSION}
                    </Badge>
                  </Group>
                </Box>
                <Group gap="sm">
                  <ThemeIcon size={64} radius="xl" variant="white" color="dark">
                    <IconSettings size={30} />
                  </ThemeIcon>
                  <Avatar size={64} radius="xl" color="teal">{initial}</Avatar>
                </Group>
              </Group>
            </Box>

            <Stack gap="md">
              <Paper
                p="lg"
                radius="xl"
                style={{
                  background: 'linear-gradient(180deg, rgba(255,255,255,0.7) 0%, var(--ot-bg-card) 100%)',
                  border: '1px solid var(--ot-border)',
                }}
              >
                <Group justify="space-between" align="flex-start" mb="md">
                  <Box>
                    <Text fw={800} size="md" c={COLORS.navyBlue}>{t('clientSettings.profile.title')}</Text>
                    <Text size="sm" c="var(--ot-text-muted)">{t('clientSettings.profile.subtitle')}</Text>
                  </Box>
                  <Badge variant="light" color={verified ? 'teal' : 'gray'}>
                    {verified ? t('clientSettings.profile.verified') : t('clientSettings.profile.unverified')}
                  </Badge>
                </Group>

                <Group align="flex-start" gap="lg" wrap="nowrap">
                  <Box style={{ position: 'relative' }}>
                    <Avatar size={88} radius="xl" color="teal">
                      {initial}
                    </Avatar>
                    <ActionIcon
                      variant="filled"
                      color="dark"
                      size="sm"
                      style={{ position: 'absolute', right: -4, bottom: -4, border: '2px solid var(--ot-bg-card)' }}
                      onClick={() => setAvatarEdited(true)}
                    >
                      <IconPencil size={14} />
                    </ActionIcon>
                  </Box>
                  <Stack gap="sm" style={{ flex: 1 }}>
                    <Group gap="sm" wrap="wrap">
                      <Badge radius="xl" variant="light" color="teal">
                        {t('clientSettings.profile.totalOrders')}: {totalOrders}
                      </Badge>
                      <Badge radius="xl" variant="light" color="blue">
                        {t('clientSettings.profile.memberSince')}: {memberSince}
                      </Badge>
                    </Group>
                    <TextInput
                      label={t('clientSettings.profile.fullName')}
                      value={fullName}
                      onChange={(event) => setFullName(event.currentTarget.value)}
                      styles={{ input: { borderRadius: 12 } }}
                    />
                    <TextInput
                      label={t('clientSettings.profile.phone')}
                      value={phone}
                      readOnly
                      rightSection={<Badge variant="light" color="teal">{t('clientSettings.profile.phoneVerified')}</Badge>}
                      styles={{ input: { borderRadius: 12, background: 'var(--ot-bg-card)' } }}
                    />
                    <TextInput
                      label={t('clientSettings.profile.email')}
                      value={email}
                      onChange={(event) => setEmail(event.currentTarget.value)}
                      styles={{ input: { borderRadius: 12 } }}
                    />
                  </Stack>
                </Group>
                <Group justify="flex-end" mt="md">
                  <Button
                    onClick={saveProfile}
                    radius="xl"
                    style={{
                      background: `linear-gradient(135deg, ${COLORS.tealBlue} 0%, ${COLORS.navyBlue} 100%)`,
                      color: 'white',
                      border: 'none',
                    }}
                  >
                    {t('common.save')}
                  </Button>
                </Group>
                {avatarEdited && (
                  <Text size="xs" c="var(--ot-text-muted)" mt="sm">
                    {t('clientSettings.profile.avatarHint')}
                  </Text>
                )}
              </Paper>

              <Paper
                p="lg"
                radius="xl"
                style={{
                  background: 'linear-gradient(180deg, rgba(255,255,255,0.72) 0%, var(--ot-bg-card) 100%)',
                  border: '1px solid var(--ot-border)',
                }}
              >
                <Text fw={800} size="md" c={COLORS.navyBlue} mb="md">{t('clientSettings.preferences.title')}</Text>
                <Stack gap={0}>
                  <Group justify="space-between" align="center" py="sm">
                    <Group gap={12}>
                      <ThemeIcon size={38} radius="xl" variant="light" color="teal">
                        <IconHeart size={18} />
                      </ThemeIcon>
                      <Box>
                        <Text fw={600} size="sm" c={COLORS.navyBlue}>
                          {t('clientSettings.preferences.language')}
                        </Text>
                        <Text size="xs" c="var(--ot-text-muted)">
                          {t('clientSettings.preferences.languageHint')}
                        </Text>
                      </Box>
                    </Group>
                    <Badge size="lg" variant="light" color="teal">{t('common.english')}</Badge>
                  </Group>
                  <Box px="sm" py={4}><Box style={{ height: 1, background: 'var(--ot-border)' }} /></Box>
                  <Group justify="space-between" align="center" py="sm">
                    <Group gap={12}>
                      <ThemeIcon size={38} radius="xl" variant="light" color="teal">
                        {themeMode === 'light' ? <IconSun size={18} /> : themeMode === 'dark' ? <IconMoon size={18} /> : <IconDeviceDesktop size={18} />}
                      </ThemeIcon>
                      <Box>
                        <Text fw={600} size="sm" c={COLORS.navyBlue}>
                          {t('clientSettings.preferences.theme')}
                        </Text>
                        <Text size="xs" c="var(--ot-text-muted)">
                          {t('clientSettings.preferences.themeHint')}
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
                            {t(`clientSettings.theme_${option}`)}
                          </Button>
                        );
                      })}
                    </Group>
                  </Group>
                  <Box px="sm" py={4}><Box style={{ height: 1, background: 'var(--ot-border)' }} /></Box>
                  <Group justify="space-between" align="center" py="sm">
                    <Group gap={12}>
                      <ThemeIcon size={38} radius="xl" variant="light" color="teal">
                        <IconSettings size={18} />
                      </ThemeIcon>
                      <Box>
                        <Text fw={600} size="sm" c={COLORS.navyBlue}>
                          {t('clientSettings.preferences.pushNotifications')}
                        </Text>
                        <Text size="xs" c="var(--ot-text-muted)">
                          {t('clientSettings.preferences.pushNotificationsHint')}
                        </Text>
                      </Box>
                    </Group>
                    <Switch checked={pushNotifications} onChange={(event) => setPushNotifications(event.currentTarget.checked)} color="teal" />
                  </Group>
                  <Box px="sm" py={4}><Box style={{ height: 1, background: 'var(--ot-border)' }} /></Box>
                  <Group justify="space-between" align="center" py="sm">
                    <Group gap={12}>
                      <ThemeIcon size={38} radius="xl" variant="light" color="teal">
                        <IconMail size={18} />
                      </ThemeIcon>
                      <Box>
                        <Text fw={600} size="sm" c={COLORS.navyBlue}>
                          {t('clientSettings.preferences.smsNotifications')}
                        </Text>
                        <Text size="xs" c="var(--ot-text-muted)">
                          {t('clientSettings.preferences.smsNotificationsHint')}
                        </Text>
                      </Box>
                    </Group>
                    <Switch checked={smsNotifications} onChange={(event) => setSmsNotifications(event.currentTarget.checked)} color="teal" />
                  </Group>
                </Stack>
              </Paper>

              <Paper
                p="lg"
                radius="xl"
                style={{
                  background: 'linear-gradient(180deg, rgba(255,255,255,0.72) 0%, var(--ot-bg-card) 100%)',
                  border: '1px solid var(--ot-border)',
                }}
              >
                <Text fw={800} size="md" c={COLORS.navyBlue} mb="md">{t('clientSettings.account.title')}</Text>
                <Stack gap="sm">
                  <Button
                    variant="light"
                    color="teal"
                    leftSection={<IconHeart size={16} />}
                    onClick={() => navigate(ROUTES.clientSaved)}
                    justify="space-between"
                    rightSection={<IconChevronRight size={16} />}
                    radius="xl"
                  >
                    {t('clientSettings.account.savedProviders')}
                  </Button>
                  <Button
                    variant="light"
                    color="red"
                    leftSection={<IconTrash size={16} />}
                    onClick={openDelete}
                    justify="space-between"
                    rightSection={<IconChevronRight size={16} />}
                    radius="xl"
                  >
                    {t('clientSettings.account.deleteAccount')}
                  </Button>
                </Stack>
              </Paper>

              <Paper
                p="lg"
                radius="xl"
                style={{
                  background: 'linear-gradient(180deg, rgba(255,255,255,0.72) 0%, var(--ot-bg-card) 100%)',
                  border: '1px solid var(--ot-border)',
                }}
              >
                <Text fw={800} size="md" c={COLORS.navyBlue} mb="md">{t('clientSettings.support.title')}</Text>
                <Stack gap="sm">
                  <Button radius="xl" variant="subtle" color="dark" justify="space-between" rightSection={<IconChevronRight size={16} />} leftSection={<IconHelpCircle size={16} />} onClick={() => navigate(ROUTES.helpCenter)}>
                    {t('clientSettings.support.helpCenter')}
                  </Button>
                  <Button radius="xl" variant="subtle" color="dark" justify="space-between" rightSection={<IconChevronRight size={16} />} leftSection={<IconMail size={16} />} onClick={() => navigate(ROUTES.support)}>
                    {t('clientSettings.support.contactSupport')}
                  </Button>
                  <Button radius="xl" variant="subtle" color="dark" justify="space-between" rightSection={<IconChevronRight size={16} />} leftSection={<IconFileText size={16} />} onClick={() => navigate(ROUTES.termsOfService)}>
                    {t('clientSettings.support.terms')}
                  </Button>
                  <Button radius="xl" variant="subtle" color="dark" justify="space-between" rightSection={<IconChevronRight size={16} />} leftSection={<IconShieldLock size={16} />} onClick={() => navigate(ROUTES.privacyPolicy)}>
                    {t('clientSettings.support.privacy')}
                  </Button>
                </Stack>
                <Text size="xs" c="var(--ot-text-muted)" mt="lg">
                  {t('clientSettings.support.version')} {APP_VERSION}
                </Text>
              </Paper>
            </Stack>
          </Paper>
        </Stack>
      </Box>

      <Modal opened={deleteOpened} onClose={closeDelete} title={t('clientSettings.deleteDialog.title')} centered>
        <Stack gap="md">
          <Text size="sm" c="dimmed">
            {t('clientSettings.deleteDialog.body')}
          </Text>
          <Group justify="flex-end">
            <Button variant="default" onClick={closeDelete}>{t('common.cancel')}</Button>
            <Button
              color="red"
              onClick={() => {
                closeDelete();
              }}
            >
              {t('clientSettings.deleteDialog.confirm')}
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Box>
  );
}
