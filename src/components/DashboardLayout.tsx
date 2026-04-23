/**
 * DashboardLayout — minimal sidebar (desktop) + bottom tab bar (mobile)
 *
 * Desktop : 220 px left sidebar using proper AppShell.Section structure
 * Mobile  : Burger-toggled overlay sidebar + fixed bottom tab bar (up to 5 tabs)
 */
import {
  AppShell, Box, Text, Group, Stack, ScrollArea,
  Avatar, ActionIcon, UnstyledButton, NavLink,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { useNavigate, useLocation } from 'react-router-dom';
import { IconLogout } from '@tabler/icons-react';
import { AppHeader } from './AppHeader';
import { AIHelpCenter } from './AIHelpCenter';
import { COLORS, ROUTES } from '../utils/constants';
import { useAuthStore } from '../store/authStore';
import type { NavItem } from '../types/nav';
import { getRoleNavItems } from './roleNav';

interface DashboardLayoutProps {
  children: React.ReactNode;
  navItems?: NavItem[];
  title?: string;
}

// ─── Bottom tab bar button (mobile only) ─────────────────────────────────────
function BottomNavBtn({
  item,
  active,
  onClick,
}: {
  item: NavItem;
  active: boolean;
  onClick: () => void;
}) {
  const T = COLORS.tealBlue;

  return (
    <UnstyledButton
      onClick={onClick}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 3,
        padding: '6px 4px',
        flex: 1,
        cursor: 'pointer',
        position: 'relative',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      {/* active indicator bar */}
      {active && (
        <Box
          style={{
            position: 'absolute',
            top: 0,
            width: 24,
            height: 3,
            borderRadius: 2,
            background: T,
          }}
        />
      )}
      <Box style={{ color: active ? T : '#ADB5BD', display: 'flex' }}>
        {item.icon}
      </Box>
      <Text
        style={{
          fontSize: 10,
          fontWeight: active ? 700 : 500,
          color: active ? T : '#ADB5BD',
          lineHeight: 1.2,
          textAlign: 'center',
          whiteSpace: 'nowrap',
        }}
      >
        {item.label}
      </Text>
    </UnstyledButton>
  );
}

// ─── Layout ───────────────────────────────────────────────────────────────────
export function DashboardLayout({ children, navItems }: DashboardLayoutProps) {
  const [opened, { toggle, close }] = useDisclosure(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser, clientProfile, providerProfile, logout } = useAuthStore();

  const displayName =
    clientProfile?.fullName ??
    providerProfile?.fullName ??
    currentUser?.email ??
    'User';
  const initials = displayName
    .split(' ')
    .map((n) => n[0] ?? '')
    .join('')
    .slice(0, 2)
    .toUpperCase();
  const role = currentUser?.role ?? 'client';
  const resolvedNavItems = navItems ?? getRoleNavItems(role);

  function go(path: string) {
    navigate(path);
    close();
  }

  function handleLogout() {
    logout();
    navigate(ROUTES.landing);
  }

  const N = COLORS.navyBlue;
  const T = COLORS.tealBlue;

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{
        width: 220,
        breakpoint: 'sm',
        collapsed: { mobile: !opened },
      }}
      padding={{ base: 'sm', md: 'md' }}
      style={{ background: 'var(--ot-bg-page)' }}
    >
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <AppShell.Header
        style={{
          background: 'var(--ot-header-bg)',
          borderBottom: '1px solid var(--ot-border)',
        }}
      >
        <AppHeader onBurgerClick={toggle} mobileMenuOpened={opened} />
      </AppShell.Header>

      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <AppShell.Navbar
        style={{
          background: 'var(--ot-bg-card)',
          borderRight: '1px solid var(--ot-border)',
        }}
      >
        {/* Brand strip */}
        <AppShell.Section
          style={{ borderBottom: '1px solid var(--ot-border)', padding: '12px 16px' }}
        >
          <Group gap={8} wrap="nowrap">
            <Box
              style={{
                width: 30,
                height: 30,
                borderRadius: 8,
                background: `linear-gradient(135deg, ${COLORS.lemonYellow}, #FFD700)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Text fw={900} size="11px" c={N}>OT</Text>
            </Box>
            <Text fw={800} size="sm" c={N} style={{ letterSpacing: '-0.3px' }}>
              ONE TOUCH
            </Text>
          </Group>
        </AppShell.Section>

        {/* Nav links — scrollable */}
        <AppShell.Section grow component={ScrollArea} p={8}>
          <Stack gap={2}>
            {resolvedNavItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <NavLink
                  key={item.path}
                  label={item.label}
                  leftSection={
                    <Box style={{ color: isActive ? T : '#ADB5BD' }}>
                      {item.icon}
                    </Box>
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
                      '&:hover': {
                        backgroundColor: `${T}09`,
                        color: N,
                      },
                    },
                    label: { fontSize: 14 },
                  }}
                />
              );
            })}
          </Stack>
        </AppShell.Section>

        {/* User card + logout — pinned to bottom */}
        <AppShell.Section
          style={{ borderTop: '1px solid var(--ot-border)', padding: 10 }}
        >
          <Group gap={10} wrap="nowrap">
            <Avatar size={34} radius="xl" color="teal" style={{ flexShrink: 0 }}>
              {initials}
            </Avatar>
            <Box style={{ flex: 1, minWidth: 0 }}>
              <Text
                size="sm"
                fw={700}
                c={N}
                style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
              >
                {displayName.split(' ')[0]}
              </Text>
              <Text size="10px" c="dimmed">
                {role === 'provider' ? 'Service Provider' : 'Client'}
              </Text>
            </Box>
            <ActionIcon
              variant="subtle"
              color="red"
              size="sm"
              radius="xl"
              onClick={handleLogout}
              title="Log out"
            >
              <IconLogout size={15} />
            </ActionIcon>
          </Group>
        </AppShell.Section>
      </AppShell.Navbar>

      {/* ── Main content ────────────────────────────────────────────────── */}
      <AppShell.Main
        style={{
          background: 'var(--ot-bg-page)',
          /* extra bottom padding so content clears the mobile tab bar */
          paddingBottom: 'calc(env(safe-area-inset-bottom) + 76px)',
        }}
      >
        <Box style={{ animation: 'dlFadeIn 0.22s ease' }}>
          <style>{`
            @keyframes dlFadeIn {
              from { opacity:0; transform:translateY(6px); }
              to   { opacity:1; transform:translateY(0); }
            }
          `}</style>
          {children}
        </Box>
        <AIHelpCenter />
      </AppShell.Main>

      {/* ── Mobile bottom tab bar (hidden on ≥ sm) ──────────────────────── */}
      <Box
        hiddenFrom="sm"
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          height: 60,
          background: 'var(--ot-bg-card)',
          borderTop: `1px solid var(--ot-border)`,
          display: 'flex',
          alignItems: 'center',
          zIndex: 200,
          boxShadow: '0 -2px 12px rgba(0,0,0,0.08)',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        {resolvedNavItems.slice(0, 5).map((item) => (
          <BottomNavBtn
            key={item.path + '_btm'}
            item={item}
            active={location.pathname === item.path}
            onClick={() => navigate(item.path)}
          />
        ))}
      </Box>
    </AppShell>
  );
}
