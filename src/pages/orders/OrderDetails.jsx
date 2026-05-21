import { useEffect, useState } from 'react';
import {
  Container,
  Stack,
  Button,
  Loader,
  Alert,
  Text,
  Group,
  Badge,
  Paper,
  Timeline,
  Divider,
} from '@mantine/core';
import { IconAlertCircle } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { useParams, useNavigate } from 'react-router-dom';
import { getOrder, completeOrder, getStatusLog, cancelOrder } from '../../api/ordersApi';
import { OrderStatusBadge } from '../../components/orders/OrderStatusBadge';

export const OrderDetails = () => {
  const { id } = useParams();
  const { i18n } = useTranslation();
  const navigate = useNavigate();
  const isAmharic = i18n.language === 'am';

  const [order, setOrder] = useState(null);
  const [statusLogs, setStatusLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [completeLoading, setCompleteLoading] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);

  useEffect(() => {
    fetchOrderDetails();
  }, [id]);

  const fetchOrderDetails = async () => {
    setLoading(true);
    setError(null);
    try {
      const [orderData, logsData] = await Promise.all([
        getOrder(id),
        getStatusLog(id),
      ]);
      setOrder(orderData);
      setStatusLogs(logsData);
    } catch (err) {
      setError(typeof err === 'string' ? err : err.detail || (isAmharic ? 'ቅደም ቁጥር ማውጣት ወደ ውጤት አልመጣም' : 'Failed to fetch order'));
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
      setError(typeof err === 'string' ? err : err.detail || (isAmharic ? 'ስህተት' : 'Error'));
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
      setError(typeof err === 'string' ? err : err.detail || (isAmharic ? 'ትዕዛዝ ሰርዝ ወደ ውጤት አልመጣም' : 'Failed to cancel order'));
    } finally {
      setCancelLoading(false);
    }
  };

  if (loading) {
    return (
      <Container size="md" py="xl">
        <Group justify="center">
          <Loader />
        </Group>
      </Container>
    );
  }

  if (!order) {
    return (
      <Container size="md" py="xl">
        <Alert icon={<IconAlertCircle size={16} />} color="red">
          {isAmharic ? 'ቅደም ቁጥር አልተገኘም' : 'Order not found'}
        </Alert>
      </Container>
    );
  }

  const formattedDate = new Date(order.created_at).toLocaleDateString(
    isAmharic ? 'am-ET' : 'en-US',
    { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }
  );

  const statusLabels = {
    pending: isAmharic ? 'ጥብቅ ያልሆነ' : 'Pending',
    matching: isAmharic ? 'ማዛመድ' : 'Matching',
    accepted: isAmharic ? 'ተቀብሏል' : 'Accepted',
    in_progress: isAmharic ? 'በዚህ ላይ ነው' : 'In Progress',
    completed: isAmharic ? 'ተጠናቅቆ' : 'Completed',
    cancelled: isAmharic ? 'ተሰርዞ' : 'Cancelled',
    expired: isAmharic ? 'ጊዜው ያለፈ' : 'Expired',
  };

  return (
    <Container size="md" py="xl">
      <Stack gap="lg">
        {/* Header */}
        <Group justify="space-between">
          <Text fw={700} size="xl">
            {isAmharic ? 'ቅደም ቁጥር' : 'Order'} #{order.id}
          </Text>
          <OrderStatusBadge status={order.status} />
        </Group>

        {error && (
          <Alert icon={<IconAlertCircle size={16} />} color="red">
            {error}
          </Alert>
        )}

        {/* Order Info */}
        <Paper p="md" withBorder>
          <Stack gap="md">
            <div>
              <Text fw={600} size="sm" c="dimmed">
                {isAmharic ? 'ዋና መግለጫ' : 'Description'}
              </Text>
              <Text>{order.description}</Text>
            </div>

            <Group grow>
              <div>
                <Text fw={600} size="sm" c="dimmed">
                  {isAmharic ? 'ምድብ' : 'Category'}
                </Text>
                <Badge>{order.category_name || (isAmharic ? 'አልተወሰነም' : 'Unassigned')}</Badge>
              </div>
              <div>
                <Text fw={600} size="sm" c="dimmed">
                  {isAmharic ? 'ንዑስ አገልግሎት' : 'Sub Service'}
                </Text>
                <Badge>{order.sub_service_name || (isAmharic ? 'አልተወሰነም' : 'Unassigned')}</Badge>
              </div>
            </Group>

            <div>
              <Text fw={600} size="sm" c="dimmed">
                {isAmharic ? 'የተፈጠረ' : 'Created'}
              </Text>
              <Text>{formattedDate}</Text>
            </div>

            {order.input_type === 'voice' && (
              <div>
                <Text fw={600} size="sm" c="dimmed">
                  {isAmharic ? 'ስህተተኛ ጽሑፍ' : 'Transcription'}
                </Text>
                <Text size="sm">{order.transcription}</Text>
              </div>
            )}
          </Stack>
        </Paper>

        {/* Assignment info if accepted */}
        {order.assignment && (
          <Paper p="md" withBorder>
            <Stack gap="md">
              <Text fw={600}>{isAmharic ? 'አስተካካቂ አገልግሎት' : 'Service Provider'}</Text>
              <Group>
                <div>
                  <Text fw={600} size="sm" c="dimmed">
                    {isAmharic ? 'አገልግሎት አሰጣጥ' : 'Assignment ID'}
                  </Text>
                  <Text>#{order.assignment.id}</Text>
                </div>
                <div>
                  <Text fw={600} size="sm" c="dimmed">
                    {isAmharic ? 'ኪሳራ' : 'Commission Fee'}
                  </Text>
                  <Text>{order.assignment.commission_fee} ETB</Text>
                </div>
              </Group>

              {order.assignment.commission_paid && order.assignment.client_contact_released && (
                <div>
                  <Text fw={600} size="sm" c="dimmed">
                    {isAmharic ? 'ስልክ ቁጥር' : 'Provider Contact'}
                  </Text>
                  <Text>{order.assignment.provider_phone || 'N/A'}</Text>
                </div>
              )}

              {!order.assignment.commission_paid && (
                <Alert icon={<IconAlertCircle size={16} />} color="yellow">
                  {isAmharic ? 'ኪሳራ ይክፈሉ' : 'Commission not paid yet'}
                </Alert>
              )}
            </Stack>
          </Paper>
        )}

        {/* Actions */}
        <Group gap="md">
          {order.status === 'pending' && (
            <Button 
              onClick={handleCancelOrder} 
              loading={cancelLoading} 
              color="red"
              fullWidth
            >
              {isAmharic ? 'ትዕዛዝ ሰርዝ' : 'Cancel Order'}
            </Button>
          )}
          {order.status === 'in_progress' && (
            <Button onClick={handleCompleteOrder} loading={completeLoading} fullWidth>
              {isAmharic ? 'የሚጠናቀቅ' : 'Mark as Complete'}
            </Button>
          )}
        </Group>

        {/* Status Log Timeline */}
        {statusLogs.length > 0 && (
          <Paper p="md" withBorder>
            <Text fw={600} mb="md">
              {isAmharic ? 'ግዜ መዝገብ' : 'Status Timeline'}
            </Text>
            <Timeline active={statusLogs.length} bulletSize={24} lineWidth={2}>
              {statusLogs.map((log) => (
                <Timeline.Item key={log.id} bullet={log.id % 2 === 0 ? '✓' : '●'}>
                  <Group justify="space-between" mb="xs">
                    <Text fw={600} size="sm">
                      {statusLabels[log.new_status] || log.new_status}
                    </Text>
                    <Text size="xs" c="dimmed">
                      {new Date(log.created_at).toLocaleString(
                        isAmharic ? 'am-ET' : 'en-US'
                      )}
                    </Text>
                  </Group>
                  {log.note && <Text size="sm">{log.note}</Text>}
                </Timeline.Item>
              ))}
            </Timeline>
          </Paper>
        )}

        {/* Back button */}
        <Button onClick={() => navigate('/orders')} variant="light">
          {isAmharic ? 'ወደ ተመለስ' : 'Back to Orders'}
        </Button>
      </Stack>
    </Container>
  );
};
