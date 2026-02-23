import { Drawer, Stack, Text, Group, Badge, ActionIcon, Box, Button, ThemeIcon, ScrollArea } from '@mantine/core';
import {
  IconBell, IconPhone, IconBriefcase, IconWallet,
  IconStar, IconAlertTriangle, IconCheck,
} from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { useNotificationStore } from '../store/jobStore';
import { useAuthStore } from '../store/authStore';
import { formatTimeAgo } from '../utils/formatting';
import { COLORS } from '../utils/constants';
import type { NotificationType } from '../types';

const notifIcon = (type: NotificationType) => {
  const map: Record<NotificationType, { icon: React.ReactNode; color: string }> = {
    incoming_call: { icon: <IconPhone size={14} />, color: 'teal' },
    job_update: { icon: <IconBriefcase size={14} />, color: 'blue' },
    payment: { icon: <IconWallet size={14} />, color: 'green' },
    review: { icon: <IconStar size={14} />, color: 'yellow' },
    loyalty: { icon: <IconStar size={14} />, color: 'orange' },
    system: { icon: <IconAlertTriangle size={14} />, color: 'red' },
  };
  return map[type] ?? { icon: <IconBell size={14} />, color: 'gray' };
};

interface Props {
  opened: boolean;
  onClose: () => void;
}

export function NotificationCenter({ opened, onClose }: Props) {
  const { t } = useTranslation();
  const { notifications, unreadCount, markAllRead } = useNotificationStore();
  const { currentUser } = useAuthStore();

  const handleMarkAll = () => {
    if (currentUser) markAllRead(currentUser.id);
  };

  return (
    <Drawer
      opened={opened}
      onClose={onClose}
      title={
        <Group justify="space-between" w="100%">
          <Group gap="xs">
            <IconBell size={18} color={COLORS.navyBlue} />
            <Text fw={700} size="md">{t('help.title') === 'Help Center' ? 'Notifications' : 'Notifications'}</Text>
            {unreadCount > 0 && (
              <Badge color="red" size="sm" circle>{unreadCount}</Badge>
            )}
          </Group>
          {unreadCount > 0 && (
            <Button size="xs" variant="subtle" onClick={handleMarkAll}>
              Mark all read
            </Button>
          )}
        </Group>
      }
      padding="lg"
      position="right"
      size="sm"
    >
      <ScrollArea h="calc(100vh - 100px)">
        <Stack gap="xs">
          {notifications.length === 0 ? (
            <Box ta="center" py="xl">
              <ThemeIcon size="xl" variant="light" color="gray" radius="xl" mx="auto" mb="md">
                <IconBell size={24} />
              </ThemeIcon>
              <Text c="dimmed" size="sm">No notifications yet</Text>
            </Box>
          ) : (
            notifications.map(notif => {
              const { icon, color } = notifIcon(notif.type);
              return (
                <Box
                  key={notif.id}
                  p="md"
                  style={{
                    borderRadius: 10,
                    background: notif.isRead ? '#F8F9FA' : '#EEF4FF',
                    border: `1px solid ${notif.isRead ? '#E9ECEF' : '#C5D1E8'}`,
                    cursor: 'pointer',
                  }}
                >
                  <Group gap="sm" align="flex-start">
                    <ThemeIcon size="sm" color={color} variant="light" radius="xl" mt={2}>
                      {icon}
                    </ThemeIcon>
                    <Box flex={1}>
                      <Group justify="space-between" mb={2}>
                        <Text size="sm" fw={notif.isRead ? 400 : 700}>
                          {notif.title}
                        </Text>
                        {!notif.isRead && (
                          <Box w={8} h={8} style={{ borderRadius: '50%', background: COLORS.tealBlue }} />
                        )}
                      </Group>
                      <Text size="xs" c="dimmed" lineClamp={2}>{notif.message}</Text>
                      <Text size="xs" c="dimmed" mt={4}>{formatTimeAgo(notif.createdAt)}</Text>
                    </Box>
                  </Group>
                </Box>
              );
            })
          )}
        </Stack>
      </ScrollArea>
    </Drawer>
  );
}
