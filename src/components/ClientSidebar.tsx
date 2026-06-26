/**
 * ClientSidebar — reusable sidebar component for client pages
 * Can be used by any client page that needs the standard sidebar layout
 */
import { Box, Text, Group, Stack, Badge, Avatar, Divider } from '@mantine/core';
import { IconHome, IconPlus, IconPackage, IconSettings, IconLogout } from '@tabler/icons-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { RoleSwitcher } from './RoleSwitcher';
import { COLORS, ROUTES } from '../utils/constants';

const N = COLORS.navyBlue;
const T = COLORS.tealBlue;

const NAV = [
  { labelKey: 'clientSidebar.nav_home',      icon: <IconHome     size={16}/>, r: ROUTES.clientDashboard },
  { labelKey: 'clientSidebar.nav_new_order', icon: <IconPlus     size={16}/>, r: '/orders/create' },
  { labelKey: 'clientSidebar.nav_my_orders', icon: <IconPackage  size={16}/>, r: '/orders' },
  { labelKey: 'clientSidebar.nav_settings',  icon: <IconSettings size={16}/>, r: ROUTES.clientSettings },
];

const NAV_LABELS: Record<string, string> = {
  'clientSidebar.nav_home': 'Home',
  'clientSidebar.nav_new_order': 'New Order',
  'clientSidebar.nav_my_orders': 'My Orders',
  'clientSidebar.nav_settings': 'Settings',
};

const NAV_GROUPS = [
  {
    label: 'MAIN',
    items: ['clientSidebar.nav_home', 'clientSidebar.nav_new_order', 'clientSidebar.nav_my_orders'],
  },
  {
    label: 'ACCOUNT',
    items: ['clientSidebar.nav_settings'],
  },
] as const;

interface ClientSidebarProps {
  onClose?: () => void;
}

export function ClientSidebar({ onClose }: ClientSidebarProps) {
  const nav = useNavigate();
  const location = useLocation();
  const { currentUser, clientProfile, logout } = useAuthStore();

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
              <Text size="xs" c="dimmed">Client Dashboard</Text>
            </Box>
          </Group>
        </Group>
      </Box>

      {/* Profile Card */}
      <Box p="md">
        <Stack gap={10}>
          <Group gap={12} align="flex-start">
            <Avatar radius="xl" size={56} color="teal">
              {clientProfile?.fullName?.charAt(0) ?? currentUser?.email?.charAt(0) ?? 'C'}
            </Avatar>
            <Box style={{ flex: 1, minWidth: 0 }}>
              <Text size="sm" fw={800} lineClamp={1}>{clientProfile?.fullName ?? currentUser?.email ?? 'Client'}</Text>
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
