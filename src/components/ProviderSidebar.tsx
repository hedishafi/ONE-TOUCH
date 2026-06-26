/**
 * ProviderSidebar — reusable sidebar component for provider pages
 * Can be used by any provider page that needs the standard sidebar layout
 */
import { Box, Text, Group, Stack, Badge, Avatar, Divider } from '@mantine/core';
import { IconHome, IconBriefcase, IconStar, IconSettings, IconLogout } from '@tabler/icons-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { RoleSwitcher } from './RoleSwitcher';
import { COLORS, ROUTES } from '../utils/constants';

const N = COLORS.navyBlue;
const T = COLORS.tealBlue;

const NAV = [
  { labelKey: 'providerSidebar.nav_dashboard', icon: <IconHome size={16}/>, r: ROUTES.providerDashboard },
  { labelKey: 'providerSidebar.nav_jobs', icon: <IconBriefcase size={16}/>, r: '/provider/jobs' },
  { labelKey: 'providerSidebar.nav_rewards', icon: <IconStar size={16}/>, r: '/provider/loyalty' },
  { labelKey: 'providerSidebar.nav_settings', icon: <IconSettings size={16}/>, r: ROUTES.providerSettings },
];

const NAV_LABELS: Record<string, string> = {
  'providerSidebar.nav_dashboard': 'Dashboard',
  'providerSidebar.nav_jobs': 'Jobs',
  'providerSidebar.nav_rewards': 'Rewards',
  'providerSidebar.nav_settings': 'Settings',
};

const NAV_GROUPS = [
  {
    label: 'MAIN',
    items: ['providerSidebar.nav_dashboard', 'providerSidebar.nav_jobs', 'providerSidebar.nav_rewards'],
  },
  {
    label: 'ACCOUNT',
    items: ['providerSidebar.nav_settings'],
  },
] as const;

interface ProviderSidebarProps {
  onClose?: () => void;
}

export function ProviderSidebar({ onClose }: ProviderSidebarProps) {
  const nav = useNavigate();
  const location = useLocation();
  const { currentUser, providerProfile, logout } = useAuthStore();

  const isVerified = currentUser?.verificationStatus === 'verified';
  void isVerified;
  const localizedDate = new Intl.DateTimeFormat('en-ET', { dateStyle: 'medium' }).format(new Date());

  function navigateTo(path: string) {
    nav(path);
    if (onClose) onClose();
  }

  function handleLogout() {
    logout();
    nav(ROUTES.landing);
    if (onClose) onClose();
  }

  return (
    <Box
      style={{
        width: 260,
        height: '100%',
        background: 'var(--ot-bg-card)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Brand */}
      <Box p="lg" style={{ borderBottom: '1px solid var(--ot-border)' }}>
        <Group justify="space-between" align="flex-start">
          <Group gap={8} align="flex-start">
            <Box w={32} h={32} style={{ borderRadius: 9, background: N, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Text fw={900} size="11px" c="white">OT</Text>
            </Box>
            <Box>
              <Text fw={800} size="sm" c="var(--ot-text-primary)">OneTouch</Text>
              <Text size="xs" c="dimmed">Provider Dashboard</Text>
            </Box>
          </Group>
        </Group>
      </Box>

      {/* Profile Card */}
      <Box p="md">
        <Stack gap={10}>
          <Group gap={12} align="flex-start">
            <Avatar radius="xl" size={56} color="teal">
              {providerProfile?.fullName?.charAt(0) ?? currentUser?.email?.charAt(0) ?? 'P'}
            </Avatar>
            <Box style={{ flex: 1, minWidth: 0 }}>
              <Text size="sm" fw={800} lineClamp={1}>{providerProfile?.fullName ?? currentUser?.email ?? 'Provider'}</Text>
              <Group gap={6} mt={4} wrap="nowrap">
                <Box w={8} h={8} style={{ borderRadius: '50%', background: COLORS.success, boxShadow: `0 0 0 3px ${COLORS.success}44` }} />
                <Text size="10px" c={COLORS.success} fw={700}>Active</Text>
              </Group>
              <Badge mt={6} size="xs" variant="light" color="green">ACTIVE</Badge>
              <Text size="10px" c="dimmed" mt={6}>UID: {currentUser?.id.slice(0, 8) ?? '—'}</Text>
              <Text size="10px" c="dimmed">{localizedDate}</Text>
            </Box>
          </Group>
        </Stack>
      </Box>

      <Divider />

      {/* Navigation */}
      <Stack gap={0} p="sm" style={{ flex: 1 }}>
        {NAV_GROUPS.map((group) => (
          <Box key={group.label}>
            <Text size="10px" fw={800} c="dimmed" pt={16} pb={8} px={10} style={{ letterSpacing: '0.08em' }}>
              {group.label}
            </Text>
            <Stack gap={6}>
              {group.items.map((labelKey) => {
                const item = NAV.find((entry) => entry.labelKey === labelKey)!;
                const active = location.pathname === item.r;
                return (
                  <Box
                    key={item.labelKey}
                    p={10}
                    onClick={() => navigateTo(item.r)}
                    style={{
                      borderRadius: 10,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 10,
                      fontWeight: 700,
                      fontSize: 14,
                      color: active ? 'white' : 'var(--ot-text-body)',
                      cursor: 'pointer',
                      background: active ? N : 'transparent',
                      borderLeft: active ? `3px solid ${T}` : '3px solid transparent',
                      transition: 'all 0.2s ease',
                    }}
                    onMouseEnter={(event) => {
                      if (!active) {
                        event.currentTarget.style.background = 'rgba(0,128,128,0.1)';
                        event.currentTarget.style.color = 'var(--ot-text-heading)';
                      }
                    }}
                    onMouseLeave={(event) => {
                      if (!active) {
                        event.currentTarget.style.background = 'transparent';
                        event.currentTarget.style.color = 'var(--ot-text-body)';
                      }
                    }}
                  >
                    <Group gap={10} wrap="nowrap" style={{ minWidth: 0 }}>
                      <Box style={{ color: active ? 'white' : 'var(--ot-text-body)', display: 'flex', alignItems: 'center' }}>
                        {item.icon}
                      </Box>
                      <Text size="sm" fw={700} lineClamp={1}>{NAV_LABELS[item.labelKey] ?? item.labelKey}</Text>
                    </Group>
                  </Box>
                );
              })}
            </Stack>
          </Box>
        ))}
      </Stack>

      {/* Footer */}
      <Box p="md" style={{ borderTop: '1px solid var(--ot-border)' }}>
        <Stack gap={12}>
          <RoleSwitcher />
          <Divider />
          <Box
            p={10}
            onClick={handleLogout}
            style={{
              borderRadius: 10,
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              color: 'var(--ot-text-muted)',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(event) => {
              event.currentTarget.style.color = '#d11a2a';
            }}
            onMouseLeave={(event) => {
              event.currentTarget.style.color = 'var(--ot-text-muted)';
            }}
          >
            <IconLogout size={18} /> Sign out
          </Box>
        </Stack>
      </Box>
    </Box>
  );
}
