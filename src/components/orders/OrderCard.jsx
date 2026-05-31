import { Card, Text, Group, Stack, Badge, Divider } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import { OrderStatusBadge } from './OrderStatusBadge';

export const OrderCard = ({ order, onClick }) => {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === 'am' ? 'am-ET' : 'en-US';
  const formattedDate = new Date(order.created_at).toLocaleDateString(locale);

  return (
    <Card
      shadow="md" padding="lg" radius="lg" withBorder onClick={onClick}
      style={{ cursor: 'pointer', transition: 'transform 150ms ease, box-shadow 150ms ease' }}
    >
      <Stack gap="sm">
        <Group justify="space-between" align="flex-start">
          <Stack gap={2}>
            <Text fw={700} size="sm">
              {t('orders.order_prefix')} #{order.id}
            </Text>
            <Text size="xs" c="dimmed">{formattedDate}</Text>
          </Stack>
          <OrderStatusBadge status={order.status} />
        </Group>

        <Divider />

        <Stack gap={6}>
          <Group gap="xs">
            {order.category_name && (
              <Badge size="sm" variant="light">{order.category_name}</Badge>
            )}
            {order.sub_service_name && (
              <Badge size="sm" variant="light">{order.sub_service_name}</Badge>
            )}
          </Group>
          <Text size="sm" c="dimmed" lineClamp={3}>{order.description}</Text>
        </Stack>
      </Stack>
    </Card>
  );
};
