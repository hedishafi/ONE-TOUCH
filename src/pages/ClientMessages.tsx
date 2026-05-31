import { Box, Group, Paper, Stack, Text } from '@mantine/core';
import { IconMessage } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { DashboardLayout } from '../components/DashboardLayout';
import { COLORS } from '../utils/constants';

export function ClientMessages() {
  const { t } = useTranslation();

  return (
    <DashboardLayout title={t('messages.title')}>
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
              <Text fw={800} size="lg" c={COLORS.navyBlue}>{t('messages.title')}</Text>
              <Text size="sm" c="dimmed">{t('messages.subtitle')}</Text>
            </Box>
          </Group>
          <Text size="sm" c="dimmed">
            {t('messages.empty')}
          </Text>
        </Stack>
      </Paper>
    </DashboardLayout>
  );
}
