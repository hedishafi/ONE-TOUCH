/**
 * SearchProviders.tsx
 * Dedicated page for clients to search and view nearby online providers
 */
import { useState } from 'react';
import {
  Box,
  Text,
  Group,
  Button,
  ActionIcon,
  Avatar,
} from '@mantine/core';
import {
  IconMenu2,
  IconX,
  IconLogout,
  IconArrowLeft,
} from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { NearbyProvidersMap } from '../components/NearbyProvidersMap';
import { COLORS, ROUTES } from '../utils/constants';
import { notifications } from '@mantine/notifications';

const N = COLORS.navyBlue;

export function SearchProviders() {
  const nav = useNavigate();
  const { currentUser, clientProfile, logout } = useAuthStore();
  const [sidebar, setSidebar] = useState(false);

  const handleProviderSelect = (provider: any) => {
    notifications.show({
      title: 'Provider Selected',
      message: `You selected ${provider.full_name}. Call them to book a service.`,
      color: 'teal',
    });
  };

  return (
    <Box style={{ minHeight: '100vh', background: 'var(--ot-bg-page)' }}>
      {/* Sidebar backdrop */}
      {sidebar && (
        <Box
          onClick={() => setSidebar(false)}
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
          background: 'var(--ot-bg-card)',
          borderRight: '1px solid var(--ot-border)',
          transform: sidebar ? 'translateX(0)' : 'translateX(-260px)',
          transition: 'transform 0.26s cubic-bezier(0.22,1,0.36,1)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <Box p="lg" style={{ borderBottom: '1px solid var(--ot-border)' }}>
          <Group justify="space-between">
            <Group gap={8}>
              <Box
                w={32}
                h={32}
                style={{
                  borderRadius: 9,
                  background: N,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text fw={900} size="11px" c="white">
                  OT
                </Text>
              </Box>
              <Text fw={800} size="sm" c={N}>
                OneTouch
              </Text>
            </Group>
            <ActionIcon variant="subtle" onClick={() => setSidebar(false)}>
              <IconX size={18} />
            </ActionIcon>
          </Group>
        </Box>
        <Box p="md">
          <Group gap={10}>
            <Avatar radius="xl" size="md" color="teal">
              {clientProfile?.fullName?.charAt(0) ?? 'C'}
            </Avatar>
            <Box>
              <Text size="sm" fw={700}>
                {clientProfile?.fullName ?? 'Client'}
              </Text>
              <Text size="xs" c="var(--ot-text-muted)">
                {currentUser?.phone}
              </Text>
            </Box>
          </Group>
        </Box>
        <Box style={{ flex: 1 }} />
        <Box p="md" style={{ borderTop: '1px solid var(--ot-border)' }}>
          <Box
            p={10}
            onClick={() => {
              logout();
              nav(ROUTES.landing);
            }}
            style={{
              borderRadius: 10,
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              color: 'var(--ot-text-muted)',
              cursor: 'pointer',
            }}
          >
            <IconLogout size={18} /> Sign out
          </Box>
        </Box>
      </Box>

      {/* Header */}
      <Box
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 200,
          background: 'var(--ot-bg-card)',
          borderBottom: '1px solid var(--ot-border)',
        }}
      >
        <Box px={20} py={12} style={{ maxWidth: 960, margin: '0 auto' }}>
          <Group justify="space-between" wrap="nowrap">
            <Group gap={12}>
              <ActionIcon
                variant="subtle"
                size="lg"
                onClick={() => nav(ROUTES.clientDashboard)}
              >
                <IconArrowLeft size={22} />
              </ActionIcon>
              <Group gap={8}>
                <Box
                  w={32}
                  h={32}
                  style={{
                    borderRadius: 9,
                    background: N,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text fw={900} size="11px" c="white">
                    OT
                  </Text>
                </Box>
                <Text fw={800} size="sm" c={N} visibleFrom="sm">
                  Find Nearby Providers
                </Text>
              </Group>
            </Group>
            <Group gap={10}>
              <ActionIcon
                variant="subtle"
                size="lg"
                onClick={() => setSidebar(true)}
              >
                <IconMenu2 size={22} />
              </ActionIcon>
              <Avatar
                radius="xl"
                size="sm"
                color="teal"
                style={{ cursor: 'pointer' }}
                onClick={() => setSidebar(true)}
              >
                {clientProfile?.fullName?.charAt(0) ?? 'C'}
              </Avatar>
            </Group>
          </Group>
        </Box>
      </Box>

      {/* Body */}
      <Box style={{ maxWidth: 960, margin: '0 auto', padding: '24px 16px 64px' }}>
        <NearbyProvidersMap
          onProviderSelect={handleProviderSelect}
          autoSearch={true}
        />

        {/* Back button */}
        <Group justify="center" mt={24}>
          <Button
            variant="light"
            color="gray"
            leftSection={<IconArrowLeft size={16} />}
            onClick={() => nav(ROUTES.clientDashboard)}
          >
            Back to Home
          </Button>
        </Group>
      </Box>
    </Box>
  );
}

export default SearchProviders;
