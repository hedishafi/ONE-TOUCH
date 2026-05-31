import { useEffect, useState } from 'react';
import {
  Container, Stack, Loader, Alert, Text, Group, Grid, Paper, Badge,
} from '@mantine/core';
import { IconAlertCircle } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { getProviderOrders } from '../../api/ordersApi';
import { OrderStatusBadge } from '../../components/orders/OrderStatusBadge';

const STATUS_FILTERS = ['accepted', 'in_progress'];

const formatDate = (value, locale) => {
  if (!value) return '';
  return new Date(value).toLocaleDateString(locale, {
    year: 'numeric', month: 'short', day: 'numeric',
  });
};

export const ProviderMyOrders = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const locale = i18n.language === 'am' ? 'am-ET' : 'en-US';

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchOrders = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getProviderOrders();
      const list = Array.isArray(data) ? data : data.results ?? [];
      setOrders(list.filter((order) => STATUS_FILTERS.includes(order.status)));
    } catch (err) {
      setError(err.detail || t('orders.fetch_failed'));
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Container size="md" py="xl">
        <Group justify="center"><Loader /></Group>
      </Container>
    );
  }

  return (
    <Container size="md" py="xl">
      <Stack gap="lg">
        <Paper withBorder radius="lg" p="md">
          <Group justify="space-between" align="center">
            <Stack gap={2}>
              <Text fw={800} size="xl">{t('orders.provider_title')}</Text>
              <Text size="sm" c="dimmed">{t('orders.accepted_refresh')}</Text>
            </Stack>
          </Group>
        </Paper>

        {error && (
          <Alert icon={<IconAlertCircle size={16} />} color="red">{error}</Alert>
        )}

        {orders.length === 0 ? (
          <Alert icon={<IconAlertCircle size={16} />}>
            {t('orders.no_accepted')}
          </Alert>
        ) : (
          <Grid>
            {orders.map((order) => (
              <Grid.Col key={order.id} span={{ base: 12, sm: 6 }}>
                <Paper
                  withBorder radius="lg" p="lg"
                  style={{ cursor: 'pointer' }}
                  onClick={() => navigate(`/orders/${order.id}`)}
                >
                  <Stack gap="sm">
                    <Group justify="space-between" align="flex-start">
                      <Stack gap={2}>
                        <Text fw={700} size="sm">
                          {t('orders.order_prefix')} #{order.id}
                        </Text>
                        <Text size="xs" c="dimmed">
                          {formatDate(order.created_at, locale)}
                        </Text>
                      </Stack>
                      <OrderStatusBadge status={order.status} />
                    </Group>

                    <Group gap="xs">
                      {order.category_name && (
                        <Badge size="sm" variant="light">{order.category_name}</Badge>
                      )}
                      {order.sub_service_name && (
                        <Badge size="sm" variant="light">{order.sub_service_name}</Badge>
                      )}
                    </Group>

                    <Text size="sm" c="dimmed" lineClamp={2}>{order.description}</Text>

                    <Stack gap={4}>
                      <Text size="xs" c="dimmed">{t('orders.client_label')}</Text>
                      <Text size="sm" fw={600}>
                        {order.client_name || t('orders.unknown_client')}
                      </Text>
                      <Text size="sm" c="dimmed">
                        {order.client_phone || t('orders.no_phone')}
                      </Text>
                    </Stack>
                  </Stack>
                </Paper>
              </Grid.Col>
            ))}
          </Grid>
        )}
      </Stack>
    </Container>
  );
};
