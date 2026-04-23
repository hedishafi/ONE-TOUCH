import { Box, Group, Paper, Stack, Text } from '@mantine/core';
import { IconSettings } from '@tabler/icons-react';
import { DashboardLayout } from '../components/DashboardLayout';
import { COLORS } from '../utils/constants';

export function ClientSettings() {
  return (
    <DashboardLayout title="Settings">
      <Paper p="xl" radius="lg" withBorder style={{ background: 'var(--ot-bg-card)' }}>
        <Stack gap="md">
          <Group gap="sm">
            <Box
              w={44}
              h={44}
              style={{
                borderRadius: 12,
                background: `${COLORS.navyBlue}12`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <IconSettings size={20} color={COLORS.navyBlue} />
            </Box>
            <Box>
              <Text fw={800} size="lg" c={COLORS.navyBlue}>Settings</Text>
              <Text size="sm" c="dimmed">Manage your profile, security, and preferences.</Text>
            </Box>
          </Group>
          <Text size="sm" c="dimmed">
            Settings options will appear here.
          </Text>
        </Stack>
      </Paper>
    </DashboardLayout>
  );
}
