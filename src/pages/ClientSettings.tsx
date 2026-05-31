import { Box, Group, Paper, Stack, Text } from '@mantine/core';
import { IconSettings } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { DashboardLayout } from '../components/DashboardLayout';
import { COLORS } from '../utils/constants';

export function ClientSettings() {
  const { t } = useTranslation();

  return (
    <DashboardLayout title={t('settings.title')}>
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
              <Text fw={800} size="lg" c={COLORS.navyBlue}>{t('settings.title')}</Text>
              <Text size="sm" c="dimmed">{t('settings.subtitle')}</Text>
            </Box>
          </Group>
          <Text size="sm" c="dimmed">
            {t('settings.empty')}
          </Text>
        </Stack>
      </Paper>
    </DashboardLayout>
  );
}
