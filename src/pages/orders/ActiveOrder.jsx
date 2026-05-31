import { useEffect, useState } from 'react';
import {
  Container, Stack, Button, Loader, Alert, Text, Group,
  Paper, Badge, Divider,
} from '@mantine/core';
import { IconAlertCircle, IconMapPin } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { useParams, useNavigate } from 'react-router-dom';
import { getOrder, completeOrder, startOrder } from '../../api/ordersApi';

export const ActiveOrder = () => {
  const { id } = useParams();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [completeLoading, setCompleteLoading] = useState(false);
  const [inProgressLoading, setInProgressLoading] = useState(false);

  useEffect(() => {
    fetchOrder();
    const interval = setInterval(fetchOrder, 10000);
    return () => clearInterval(interval);
  }, [id]);

  const fetchOrder = async () => {
    try {
      const data = await getOrder(id);
      setOrder(data);
    } catch (err) {
      setError(err.detail || t('orders.fetch_order_failed'));
    } finally {
      setLoading(false);
    }
  };

  const handleMarkInProgress = async () => {
    setInProgressLoading(true);
    try {
      await startOrder(id);
      fetchOrder();
    } catch {
      setError(t('orders.in_progress_failed'));
    } finally {
      setInProgressLoading(false);
    }
  };

  const handleComplete = async () => {
    setCompleteLoading(true);
    try {
      await completeOrder(id);
      navigate('/orders');
    } catch (err) {
      setError(err.detail || t('common.error'));
    } finally {
      setCompleteLoading(false);
    }
  };

  if (loading) {
    return (
      <Container size="md" py="xl">
        <Group justify="center"><Loader /></Group>
      </Container>
    );
  }

  if (!order) {
    return (
      <Container size="md" py="xl">
        <Alert icon={<IconAlertCircle size={16} />} color="red">
          {t('orders.not_found')}
        </Alert>
      </Container>
    );
  }

  const statusKey = {
    pending: 'orders.status_pending',
    matching: 'orders.status_matching',
    accepted: 'orders.status_accepted',
    in_progress: 'orders.status_in_progress',
    completed: 'orders.status_completed',
  };

  return (
    <Container size="md" py="xl">
      <Stack gap="lg">
        {/* Header */}
        <Group justify="space-between">
          <Text fw={700} size="xl">
            {t('orders.active_order_prefix')} #{order.id}
          </Text>
          <Badge size="lg" color="blue">
            {t(statusKey[order.status] || order.status)}
          </Badge>
        </Group>

        {error && (
          <Alert icon={<IconAlertCircle size={16} />} color="red">{error}</Alert>
        )}

        {/* Order Details */}
        <Paper p="md" withBorder>
          <Stack gap="md">
            <div>
              <Text fw={600} size="sm" c="dimmed">{t('orders.request_label')}</Text>
              <Text>{order.description}</Text>
            </div>

            <Group grow>
              <div>
                <Text fw={600} size="sm" c="dimmed">{t('orders.category_label')}</Text>
                <Badge>{order.category_name || 'N/A'}</Badge>
              </div>
              <div>
                <Text fw={600} size="sm" c="dimmed">{t('orders.sub_service_label')}</Text>
                <Badge>{order.sub_service_name || 'N/A'}</Badge>
              </div>
            </Group>

            <Divider />

            <div>
              <Group mb="xs">
                <IconMapPin size={16} />
                <Text fw={600}>{t('orders.location_label')}</Text>
              </Group>
              <Text size="sm">{order.client_address || 'N/A'}</Text>
              <Text size="xs" c="dimmed">
                {order.client_latitude?.toFixed(4)}, {order.client_longitude?.toFixed(4)}
              </Text>
            </div>
          </Stack>
        </Paper>

        {/* Commission */}
        {order.assignment && (
          <Paper p="md" withBorder>
            <Stack gap="md">
              <Text fw={600}>{t('orders.commission_label')}</Text>
              <Group grow>
                <div>
                  <Text fw={600} size="sm" c="dimmed">{t('orders.commission_fee')}</Text>
                  <Text size="lg" fw={700}>{order.assignment.commission_fee} ETB</Text>
                </div>
                <div>
                  <Text fw={600} size="sm" c="dimmed">{t('orders.commission_status')}</Text>
                  <Badge color={order.assignment.commission_paid ? 'green' : 'red'}>
                    {order.assignment.commission_paid ? t('orders.paid') : t('orders.unpaid')}
                  </Badge>
                </div>
              </Group>

              {!order.assignment.commission_paid && (
                <Alert icon={<IconAlertCircle size={16} />} color="yellow">
                  {t('orders.pay_to_see_contact')}
                </Alert>
              )}
            </Stack>
          </Paper>
        )}

        {/* Client Contact */}
        {order.assignment?.commission_paid && order.assignment?.client_contact_released && (
          <Paper p="md" withBorder bg="blue.0">
            <Stack gap="md">
              <Text fw={600}>{t('orders.client_info')}</Text>
              <Group>
                <div>
                  <Text fw={600} size="sm" c="dimmed">{t('orders.client_name')}</Text>
                  <Text>{order.client_name || 'N/A'}</Text>
                </div>
                <div>
                  <Text fw={600} size="sm" c="dimmed">{t('orders.client_phone_label')}</Text>
                  <Text>{order.client_phone || 'N/A'}</Text>
                </div>
              </Group>
            </Stack>
          </Paper>
        )}

        {/* Actions */}
        <Group gap="md">
          {order.status === 'accepted' && (
            <Button onClick={handleMarkInProgress} loading={inProgressLoading} fullWidth size="md">
              {t('orders.mark_in_progress')}
            </Button>
          )}
          {order.status === 'in_progress' && (
            <Button onClick={handleComplete} loading={completeLoading} fullWidth size="md">
              {t('orders.complete_order_btn')}
            </Button>
          )}
          <Button onClick={() => navigate('/orders')} variant="light" fullWidth>
            {t('common.back')}
          </Button>
        </Group>
      </Stack>
    </Container>
  );
};
