import {
  Group, Text, ActionIcon, Menu, Avatar, Badge, Indicator,
  Switch, Burger, Box,
} from '@mantine/core';
import {
  IconBell, IconLogout, IconUser, IconWallet, IconChevronDown,
  IconShieldCheck,
} from '@tabler/icons-react';
import { useDisclosure } from '@mantine/hooks';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../store/authStore';
import { useNotificationStore } from '../store/jobStore';
import { ROUTES, COLORS } from '../utils/constants';
import { formatCurrency } from '../utils/formatting';
import { LanguageSwitcher } from './LanguageSwitcher';
import { NotificationCenter } from './NotificationCenter';
import { useEffect } from 'react';

export function AppHeader({ onBurgerClick, mobileMenuOpened }: { onBurgerClick?: () => void; mobileMenuOpened?: boolean }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { currentUser, clientProfile, providerProfile, logout, updateProviderOnlineStatus } = useAuthStore();
  const { unreadCount, fetchNotifications } = useNotificationStore();
  const [notifOpen, { open: openNotif, close: closeNotif }] = useDisclosure(false);

  useEffect(() => {
    if (currentUser) fetchNotifications(currentUser.id);
  }, [currentUser]);

  const displayName =
    clientProfile?.fullName ?? providerProfile?.fullName ?? currentUser?.email ?? 'User';
  const walletBalance =
    clientProfile?.walletBalance ?? providerProfile?.walletBalance ?? 0;
  const avatarSrc =
    clientProfile?.selfieUrl ?? providerProfile?.selfieUrl;

  const handleLogout = () => {
    logout();
    navigate(ROUTES.landing);
  };

  const isProvider = currentUser?.role === 'provider';
  const isOnline = providerProfile?.isOnline ?? false;

  return (
    <Box
      style={{
        background: 'var(--ot-header-bg)',
        padding: '0 24px',
        height: 64,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)',
        borderBottom: '1px solid var(--ot-header-border)',
      }}
    >
      {/* Left: Logo + Burger */}
      <Group gap="md">
        {onBurgerClick && (
          <Burger
            opened={mobileMenuOpened}
            onClick={onBurgerClick}
            color={COLORS.navyBlue}
            size="sm"
          />
        )}
        <Group gap="xs" style={{ cursor: 'pointer' }} onClick={() => navigate(ROUTES.landing)}>
          <Box
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: `linear-gradient(135deg, ${COLORS.lemonYellow} 0%, #FFD700 100%)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: `0 2px 8px rgba(245, 230, 66, 0.25)`,
            }}
          >
            <IconShieldCheck size={20} color={COLORS.navyBlue} stroke={2.5} />
          </Box>
          <Text fw={800} size="lg" c={COLORS.navyBlue} style={{ letterSpacing: '-0.5px' }}>
            ONE TOUCH
          </Text>
        </Group>
      </Group>

      {/* Right: Actions */}
      <Group gap="sm">
        {/* Provider online/offline toggle */}
        {isProvider && (
          <Group gap="xs">
            <Switch
              checked={isOnline}
              onChange={(e) => updateProviderOnlineStatus(e.currentTarget.checked)}
              color="teal"
              size="sm"
              label={
                <Text size="xs" c={isOnline ? COLORS.tealBlue : 'dimmed'} fw={600}>
                  {isOnline ? t('provider.online') : t('provider.offline')}
                </Text>
              }
            />
          </Group>
        )}

        {/* Wallet balance chip */}
        {currentUser?.role !== 'admin' && (
          <Badge
            color="lemon"
            variant="filled"
            size="lg"
            style={{ cursor: 'pointer', color: COLORS.navyBlue, fontWeight: 600 }}
            onClick={() =>
              navigate(isProvider ? ROUTES.providerWallet : ROUTES.clientWallet)
            }
          >
            {formatCurrency(walletBalance)}
          </Badge>
        )}

        {/* Language Switcher */}
        <LanguageSwitcher />

        {/* Notifications */}
        <Indicator
          label={unreadCount > 0 ? unreadCount : undefined}
          size={16}
          disabled={unreadCount === 0}
          color="red"
        >
          <ActionIcon
            variant="subtle"
            color={COLORS.navyBlue}
            size="lg"
            onClick={openNotif}
            aria-label="Notifications"
          >
            <IconBell size={20} />
          </ActionIcon>
        </Indicator>

        {/* User Menu */}
        <Menu shadow="lg" width={220} radius="md">
          <Menu.Target>
            <Group gap="xs" style={{ cursor: 'pointer' }}>
              <Avatar src={avatarSrc} radius="xl" size="sm" color="teal">
                {displayName[0]}
              </Avatar>
              <Text size="sm" c={COLORS.navyBlue} fw={500} visibleFrom="sm">
                {displayName.split(' ')[0]}
              </Text>
              <IconChevronDown size={14} color={COLORS.navyBlue} />
            </Group>
          </Menu.Target>
          <Menu.Dropdown>
            <Menu.Label>{displayName}</Menu.Label>
            <Menu.Label c="dimmed" fz="xs">{currentUser?.email}</Menu.Label>
            <Menu.Divider />
            {currentUser?.role === 'client' && (
              <Menu.Item leftSection={<IconUser size={14} />} onClick={() => navigate(ROUTES.clientSettings)}>
                {t('client.settings')}
              </Menu.Item>
            )}
            {currentUser?.role === 'provider' && (
              <>
                <Menu.Item leftSection={<IconUser size={14} />} onClick={() => navigate(ROUTES.providerProfile)}>
                  {t('provider.profile')}
                </Menu.Item>
                <Menu.Item leftSection={<IconWallet size={14} />} onClick={() => navigate(ROUTES.providerWallet)}>
                  {t('provider.wallet')}
                </Menu.Item>
              </>
            )}
            <Menu.Divider />
            <Menu.Item
              leftSection={<IconLogout size={14} />}
              color="red"
              onClick={handleLogout}
            >
              {t('nav.logout')}
            </Menu.Item>
          </Menu.Dropdown>
        </Menu>
      </Group>

      {/* Notification Drawer */}
      <NotificationCenter opened={notifOpen} onClose={closeNotif} />
    </Box>
  );
}
