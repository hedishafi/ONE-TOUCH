import { Card, Text, Group, Stack, Badge } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import { OrderStatusBadge } from './OrderStatusBadge';

export const OrderCard = ({ order, onClick }) => {
  const { i18n } = useTranslation();
  const isAmharic = i18n.language === 'am';

  const formattedDate = new Date(order.created_at).toLocaleDateString(
    isAmharic ? 'am-ET' : 'en-US'
  );

  return (
    <Card
      shadow="sm"
      padding="lg"
      radius="md"
      withBorder
      onClick={onClick}
      style={{ cursor: 'pointer' }}
    >
      <Stack gap="xs">
        <Group justify="space-between">
          <Text fw={600} size="sm">
            {isAmharic ? 'ቅደም ቁጥር' : 'Order'} #{order.id}
          </Text>
          <OrderStatusBadge status={order.status} />
        </Group>

        <Text size="sm" c="dimmed" lineClamp={2}>
          {order.description}
        </Text>

        <Group gap="xs">
          {order.category_name && (
            <Badge size="sm" variant="light">
              {order.category_name}
            </Badge>
          )}
          {order.sub_service_name && (
            <Badge size="sm" variant="light">
              {order.sub_service_name}
            </Badge>
          )}
        </Group>

        <Text size="xs" c="dimmed">
          {formattedDate}
        </Text>
      </Stack>
    </Card>
  );
};
