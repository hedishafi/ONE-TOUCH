import { Box, Group, Paper, Stack, Text } from '@mantine/core';
import { IconMessage } from '@tabler/icons-react';
import { DashboardLayout } from '../components/DashboardLayout';
import { COLORS } from '../utils/constants';

export function ClientMessages() {
  return (
    <DashboardLayout title="Messages">
      <Paper p="xl" radius="lg" withBorder style={{ background: 'var(--ot-bg-card)' }}>
        <Stack gap="md">
          <Group gap="sm">
            <Box
              w={44}
              h={44}
              style={{
                borderRadius: 12,
                background: `${COLORS.tealBlue}1A`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <IconMessage size={20} color={COLORS.tealBlue} />
            </Box>
            <Box>
              <Text fw={800} size="lg" c={COLORS.navyBlue}>Messages</Text>
              <Text size="sm" c="dimmed">All service conversations will show up here.</Text>
            </Box>
          </Group>
          <Text size="sm" c="dimmed">
            You do not have any messages yet.
          </Text>
        </Stack>
      </Paper>
    </DashboardLayout>
  );
}
