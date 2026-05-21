import { useEffect, useState } from 'react';
import {
  Container,
  Stack,
  Button,
  Loader,
  Alert,
  Text,
  Group,
  Paper,
  Badge,
  Divider,
} from '@mantine/core';
import { IconAlertCircle, IconMapPin } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { useParams, useNavigate } from 'react-router-dom';
import { getOrder, completeOrder, startOrder } from '../../api/ordersApi';

export const ActiveOrder = () => {
  const { id } = useParams();
  const { i18n } = useTranslation();
  const navigate = useNavigate();
  const isAmharic = i18n.language === 'am';

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [completeLoading, setCompleteLoading] = useState(false);
  const [inProgressLoading, setInProgressLoading] = useState(false);

  useEffect(() => {
    fetchOrder();
    const interval = setInterval(fetchOrder, 10000); // Refresh every 10s
    return () => clearInterval(interval);
  }, [id]);

  const fetchOrder = async () => {
    try {
      const data = await getOrder(id);
      setOrder(data);
    } catch (err) {
      setError(err.detail || (isAmharic ? 'ቅደም ቁጥር ማውጣት ወደ ውጤት አልመጣም' : 'Failed to fetch order'));
    } finally {
      setLoading(false);
    }
  };

  const handleMarkInProgress = async () => {
    setInProgressLoading(true);
    try {
      await startOrder(id);
      fetchOrder();
    } catch (err) {
      setError(isAmharic ? 'ወደ ሂደት ማምጣት አልተቻለም' : 'Failed to mark as in progress');
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
      setError(err.detail || (isAmharic ? 'ስህተት' : 'Error'));
    } finally {
      setCompleteLoading(false);
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

  const statusLabels = {
    pending: isAmharic ? 'ጥብቅ ያልሆነ' : 'Pending',
    matching: isAmharic ? 'ማዛመድ' : 'Matching',
    accepted: isAmharic ? 'ተቀብሏል' : 'Accepted',
    in_progress: isAmharic ? 'በዚህ ላይ ነው' : 'In Progress',
    completed: isAmharic ? 'ተጠናቅቆ' : 'Completed',
  };

  return (
    <Container size="md" py="xl">
      <Stack gap="lg">
        {/* Header */}
        <Group justify="space-between">
          <Text fw={700} size="xl">
            {isAmharic ? 'ስራ ላይ ቅደም ቁጥር' : 'Active Order'} #{order.id}
          </Text>
          <Badge size="lg" color="blue">
            {statusLabels[order.status]}
          </Badge>
        </Group>

        {error && (
          <Alert icon={<IconAlertCircle size={16} />} color="red">
            {error}
          </Alert>
        )}

        {/* Order Details */}
        <Paper p="md" withBorder>
          <Stack gap="md">
            <div>
              <Text fw={600} size="sm" c="dimmed">
                {isAmharic ? 'ጥያቄ' : 'Request'}
              </Text>
              <Text>{order.description}</Text>
            </div>

            <Group grow>
              <div>
                <Text fw={600} size="sm" c="dimmed">
                  {isAmharic ? 'ምድብ' : 'Category'}
                </Text>
                <Badge>{order.category_name || 'N/A'}</Badge>
              </div>
              <div>
                <Text fw={600} size="sm" c="dimmed">
                  {isAmharic ? 'ንዑስ አገልግሎት' : 'Sub Service'}
                </Text>
                <Badge>{order.sub_service_name || 'N/A'}</Badge>
              </div>
            </Group>

            <Divider />

            {/* Location */}
            <div>
              <Group mb="xs">
                <IconMapPin size={16} />
                <Text fw={600}>{isAmharic ? 'ሥፍራ' : 'Location'}</Text>
              </Group>
              <Text size="sm">{order.client_address || 'No address provided'}</Text>
              <Text size="xs" c="dimmed">
                {order.client_latitude?.toFixed(4)}, {order.client_longitude?.toFixed(4)}
              </Text>
            </div>
          </Stack>
        </Paper>

        {/* Commission & Payment */}
        {order.assignment && (
          <Paper p="md" withBorder>
            <Stack gap="md">
              <Text fw={600}>{isAmharic ? 'ኪሳራ' : 'Commission'}</Text>

              <Group grow>
                <div>
                  <Text fw={600} size="sm" c="dimmed">
                    {isAmharic ? 'ሙሉ ገንዘብ' : 'Commission Fee'}
                  </Text>
                  <Text size="lg" fw={700}>
                    {order.assignment.commission_fee} ETB
                  </Text>
                </div>
                <div>
                  <Text fw={600} size="sm" c="dimmed">
                    {isAmharic ? 'ሁኔታ' : 'Status'}
                  </Text>
                  <Badge
                    color={order.assignment.commission_paid ? 'green' : 'red'}
                  >
                    {order.assignment.commission_paid
                      ? (isAmharic ? 'ከፍሏል' : 'Paid')
                      : (isAmharic ? 'ያልከፈለ' : 'Unpaid')}
                  </Badge>
                </div>
              </Group>

              {!order.assignment.commission_paid && (
                <Alert icon={<IconAlertCircle size={16} />} color="yellow">
                  {isAmharic
                    ? 'ኪሳራ ከፍሎ ሕዝበ ስልክ ቁጥር ይገኛሉ'
                    : 'Pay commission to see client contact details'}
                </Alert>
              )}
            </Stack>
          </Paper>
        )}

        {/* Client Contact (only if commission paid) */}
        {order.assignment?.commission_paid && order.assignment?.client_contact_released && (
          <Paper p="md" withBorder bg="blue.0">
            <Stack gap="md">
              <Text fw={600}>{isAmharic ? 'ደንበኛ ዝግጅት' : 'Client Information'}</Text>

              <Group>
                <div>
                  <Text fw={600} size="sm" c="dimmed">
                    {isAmharic ? 'ስም' : 'Name'}
                  </Text>
                  <Text>{order.client_name || 'N/A'}</Text>
                </div>
                <div>
                  <Text fw={600} size="sm" c="dimmed">
                    {isAmharic ? 'ስልክ' : 'Phone'}
                  </Text>
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
              {isAmharic ? 'ስሩ ይጀምሩ' : 'Mark as In Progress'}
            </Button>
          )}

          {order.status === 'in_progress' && (
            <Button onClick={handleComplete} loading={completeLoading} fullWidth size="md">
              {isAmharic ? 'ስራ ያበቃ' : 'Complete Order'}
            </Button>
          )}

          <Button onClick={() => navigate('/orders')} variant="light" fullWidth>
            {isAmharic ? 'ተመለስ' : 'Back'}
          </Button>
        </Group>
      </Stack>
    </Container>
  );
};
