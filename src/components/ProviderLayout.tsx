/**
 * ProviderLayout — shared layout for provider sub-pages
 */
import { useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Box, Text, Group, Stack, Avatar, Badge, Divider,
  ActionIcon, NavLink,
} from '@mantine/core';
import {
  IconLayoutDashboard, IconUser, IconTrendingUp, IconSettings,
  IconMenu2, IconX, IconLogout, IconStar, IconLifebuoy,
} from '@tabler/icons-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../store/authStore';
import { COLORS, ROUTES } from '../utils/constants';
import { RoleSwitcher } from './RoleSwitcher';
import { DarkModeToggle } from './DarkModeToggle';
import { LanguageSwitcher } from './LanguageSwitcher';

const N = COLORS.navyBlue;
const T = COLORS.tealBlue;

interface ProviderLayoutProps {
  children: React.ReactNode;
  title: string;
}

export function ProviderLayout({ children, title }: ProviderLayoutProps) {
  const [sidebar, setSidebar] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const { currentUser, providerProfile, logout } = useAuthStore();

  const displayName = providerProfile?.fullName ?? currentUser?.email ?? 'Provider';
  const initials = displayName
    .split(' ')
    .map((n: string) => n[0] ?? '')
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const NAV = [
    { labelKey: 'providerLayout.dashboard', icon: <IconLayoutDashboard size={18} />, path: ROUTES.providerDashboard },
    { labelKey: 'providerLayout.profile',   icon: <IconUser            size={18} />, path: ROUTES.providerProfile },
    { labelKey: 'providerLayout.earnings',  icon: <IconTrendingUp      size={18} />, path: ROUTES.providerEarnings },
    { labelKey: 'providerLayout.reviews',   icon: <IconStar            size={18} />, path: ROUTES.providerReviews },
    { labelKey: 'providerLayout.settings',  icon: <IconSettings        size={18} />, path: ROUTES.providerSettings },
    { labelKey: 'providerLayout.help_support', icon: <IconLifebuoy     size={18} />, path: ROUTES.providerHelp },
  ];

  function go(path: string) { setSidebar(false); navigate(path); }
  function handleLogout() { logout(); navigate(ROUTES.landing); }

  return (
    <Box style={{ minHeight: '100vh', background: 'var(--ot-bg-page)' }}>

      {/* ── Portal: backdrop + sidebar ── */}
      {createPortal(
        <>
          {sidebar && (
            <div
              onClick={() => setSidebar(false)}
              style={{
                position: 'fixed', inset: 0,
                background: 'rgba(0,0,0,0.45)', zIndex: 1000, cursor: 'pointer',
              }}
            />
          )}
          <div style={{
            position: 'fixed', top: 0, left: 0, bottom: 0, width: 260,
            zIndex: 1100,
            background: 'var(--ot-bg-card)',
            borderRight: '1px solid var(--ot-border)',
            display: 'flex', flexDirection: 'column',
            transform: sidebar ? 'translateX(0)' : 'translateX(-260px)',
            transition: 'transform 0.26s cubic-bezier(0.22,1,0.36,1)',
            boxShadow: sidebar ? '4px 0 24px rgba(0,0,0,0.18)' : 'none',
            overflowY: 'auto',
          }}>
            {/* Brand */}
            <Box p="lg" style={{ borderBottom: '1px solid var(--ot-border)' }}>
              <Group justify="space-between">
                <Group gap={8}>
                  <Box
                    w={32} h={32}
                    style={{ borderRadius: 9, background: N, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <Text fw={900} size="11px" c="white">OT</Text>
                  </Box>
                  <Text fw={800} size="sm" c={N}>OneTouch</Text>
                </Group>
                <ActionIcon variant="subtle" onClick={() => setSidebar(false)}>
                  <IconX size={18} />
                </ActionIcon>
              </Group>
            </Box>

            {/* User info */}
            <Box p="md">
              <Group gap={10}>
                <Avatar radius="xl" size="md" color="blue">{initials}</Avatar>
                <Box>
                  <Text size="sm" fw={700} lineClamp={1}>{displayName}</Text>
                  <Badge size="xs" variant="light" color="teal">
                    {t('providerLayout.service_provider')}
                  </Badge>
                </Box>
              </Group>
            </Box>

            <Divider />

            {/* Nav items */}
            <Stack gap={2} p="sm" style={{ flex: 1 }}>
              {NAV.map(item => {
                const isActive =
                  location.pathname === item.path ||
                  location.pathname.startsWith(item.path + '/');
                return (
                  <NavLink
                    key={item.path}
                    label={t(item.labelKey)}
                    leftSection={
                      <Box style={{ color: isActive ? T : '#ADB5BD' }}>{item.icon}</Box>
                    }
                    active={isActive}
                    onClick={() => go(item.path)}
                    styles={{
                      root: {
                        borderRadius: 10,
                        borderLeft: `3px solid ${isActive ? T : 'transparent'}`,
                        paddingLeft: 13,
                        fontWeight: isActive ? 700 : 500,
                        fontSize: 14,
                        color: isActive ? N : '#6C757D',
                        backgroundColor: isActive ? `${T}13` : 'transparent',
                      },
                      label: { fontSize: 14 },
                    }}
                  />
                );
              })}
            </Stack>

            {/* Bottom: language switcher + role switcher + logout */}
            <Box p="md" style={{ borderTop: '1px solid var(--ot-border)' }}>
              <Box mb={8}>
                <LanguageSwitcher />
              </Box>
              <RoleSwitcher />
              <Box
                p={10}
                onClick={handleLogout}
                style={{
                  borderRadius: 10, display: 'flex', alignItems: 'center',
                  gap: 10, color: 'var(--ot-text-muted)', cursor: 'pointer', marginTop: 8,
                }}
              >
                <IconLogout size={18} /> {t('providerLayout.sign_out')}
              </Box>
            </Box>
          </div>
        </>,
        document.body
      )}

      {/* ── Header ── */}
      <Box style={{
        position: 'sticky', top: 0, zIndex: 400,
        background: 'var(--ot-bg-card)', borderBottom: '1px solid var(--ot-border)',
      }}>
        <Box px={20} py={12}>
          <Group justify="space-between">
            <Group gap={12}>
              <ActionIcon variant="subtle" size="lg" onClick={() => setSidebar(v => !v)}>
                <IconMenu2 size={22} />
              </ActionIcon>
              <Group gap={8}>
                <Box
                  w={32} h={32}
                  style={{ borderRadius: 9, background: N, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <Text fw={900} size="11px" c="white">OT</Text>
                </Box>
                <Text fw={800} size="sm" c={N}>{title}</Text>
              </Group>
            </Group>
            <Group gap={10}>
              <LanguageSwitcher />
              <DarkModeToggle size="sm" />
              <Avatar
                radius="xl" size="sm" color="blue"
                style={{ cursor: 'pointer' }}
                onClick={() => setSidebar(v => !v)}
              >
                {initials}
              </Avatar>
            </Group>
          </Group>
        </Box>
      </Box>

      {/* ── Content ── */}
      <Box style={{ maxWidth: 960, margin: '0 auto', padding: '24px 20px 64px' }}>
        {children}
      </Box>
    </Box>
  );
}
