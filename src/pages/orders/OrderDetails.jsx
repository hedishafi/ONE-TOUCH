import { useEffect, useState } from 'react';
import {
  Container, Stack, Button, Loader, Alert, Text, Group,
  Badge, Paper, Timeline, Divider,
} from '@mantine/core';
import { IconAlertCircle } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { useParams, useNavigate } from 'react-router-dom';
import { getOrder, completeOrder, getStatusLog, cancelOrder } from '../../api/ordersApi';
import { OrderStatusBadge } from '../../components/orders/OrderStatusBadge';

export const OrderDetails = () => {
  const { id } = useParams();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  const [order, setOrder] = useState(null);
  const [statusLogs, setStatusLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [completeLoading, setCompleteLoading] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);

  useEffect(() => { fetchOrderDetails(); }, [id]);

  const fetchOrderDetails = async () => {
    setLoading(true);
    setError(null);
    try {
      const [orderData, logsData] = await Promise.all([getOrder(id), getStatusLog(id)]);
      setOrder(orderData);
      setStatusLogs(logsData);
    } catch (err) {
      setError(typeof err === 'string' ? err : err.detail || t('orders.fetch_order_failed'));
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteOrder = async () => {
    setCompleteLoading(true);
    try {
      await completeOrder(id);
      fetchOrderDetails();
    } catch (err) {
      setError(typeof err === 'string' ? err : err.detail || t('common.error'));
    } finally {
      setCompleteLoading(false);
    }
  };

  const handleCancelOrder = async () => {
    setCancelLoading(true);
    try {
      await cancelOrder(id);
      fetchOrderDetails();
    } catch (err) {
      setError(typeof err === 'string' ? err : err.detail || t('orders.cancel_failed'));
    } finally {
      setCancelLoading(false);
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

  const locale = i18n.language === 'am' ? 'am-ET' : 'en-US';
  const formattedDate = new Date(order.created_at).toLocaleDateString(locale, {
    year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

  const statusKey = {
    pending: 'orders.status_pending',
    matching: 'orders.status_matching',
    accepted: 'orders.status_accepted',
    in_progress: 'orders.status_in_progress',
    completed: 'orders.status_completed',
    cancelled: 'orders.status_cancelled',
    expired: 'orders.status_expired',
  };

  return (
    <Container size="md" py="xl">
      <Stack gap="lg">
        {/* Header */}
        <Group justify="space-between">
          <Text fw={700} size="xl">
            {t('orders.order_prefix')} #{order.id}
          </Text>
          <OrderStatusBadge status={order.status} />
        </Group>

        {error && (
          <Alert icon={<IconAlertCircle size={16} />} color="red">{error}</Alert>
        )}

        {/* Order Info */}
        <Paper p="md" withBorder>
          <Stack gap="md">
            <div>
              <Text fw={600} size="sm" c="dimmed">{t('orders.description_label')}</Text>
              <Text>{order.description}</Text>
            </div>

            <Group grow>
              <div>
                <Text fw={600} size="sm" c="dimmed">{t('orders.category_label')}</Text>
                <Badge>{order.category_name || t('orders.unassigned')}</Badge>
              </div>
              <div>
                <Text fw={600} size="sm" c="dimmed">{t('orders.sub_service_label')}</Text>
                <Badge>{order.sub_service_name || t('orders.unassigned')}</Badge>
              </div>
            </Group>

            <div>
              <Text fw={600} size="sm" c="dimmed">{t('orders.created_label')}</Text>
              <Text>{formattedDate}</Text>
            </div>

            {order.input_type === 'voice' && (
              <div>
                <Text fw={600} size="sm" c="dimmed">{t('orders.transcription_label')}</Text>
                <Text size="sm">{order.transcription}</Text>
              </div>
            )}
          </Stack>
        </Paper>

        {/* Assignment info */}
        {order.assignment && (
          <Paper p="md" withBorder>
            <Stack gap="md">
              <Text fw={600}>{t('orders.assignment_info')}</Text>
              <Group>
                <div>
                  <Text fw={600} size="sm" c="dimmed">{t('orders.assignment_id')}</Text>
                  <Text>#{order.assignment.id}</Text>
                </div>
                <div>
                  <Text fw={600} size="sm" c="dimmed">{t('orders.commission_fee')}</Text>
                  <Text>{order.assignment.commission_fee} ETB</Text>
                </div>
              </Group>

              {order.assignment.commission_paid && order.assignment.client_contact_released && (
                <div>
                  <Text fw={600} size="sm" c="dimmed">{t('orders.client_phone')}</Text>
                  <Text>{order.assignment.provider_phone || 'N/A'}</Text>
                </div>
              )}

              {!order.assignment.commission_paid && (
                <Alert icon={<IconAlertCircle size={16} />} color="yellow">
                  {t('orders.commission_not_paid')}
                </Alert>
              )}
            </Stack>
          </Paper>
        )}

        {/* Actions */}
        <Group gap="md">
          {order.status === 'pending' && (
            <Button onClick={handleCancelOrder} loading={cancelLoading} color="red" fullWidth>
              {t('orders.cancel_order')}
            </Button>
          )}
          {order.status === 'in_progress' && (
            <Button onClick={handleCompleteOrder} loading={completeLoading} fullWidth>
              {t('orders.complete_order')}
            </Button>
          )}
        </Group>

        {/* Status Timeline */}
        {statusLogs.length > 0 && (
          <Paper p="md" withBorder>
            <Text fw={600} mb="md">{t('orders.timeline')}</Text>
            <Timeline active={statusLogs.length} bulletSize={24} lineWidth={2}>
              {statusLogs.map((log) => (
                <Timeline.Item key={log.id} bullet={log.id % 2 === 0 ? '✓' : '●'}>
                  <Group justify="space-between" mb="xs">
                    <Text fw={600} size="sm">
                      {t(statusKey[log.new_status] || log.new_status)}
                    </Text>
                    <Text size="xs" c="dimmed">
                      {new Date(log.created_at).toLocaleString(locale)}
                    </Text>
                  </Group>
                  {log.note && <Text size="sm">{log.note}</Text>}
                </Timeline.Item>
              ))}
            </Timeline>
          </Paper>
        )}

        <Button onClick={() => navigate('/orders')} variant="light">
          {t('orders.back_to_orders')}
        </Button>
      </Stack>
    </Container>
  );
};
