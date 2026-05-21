import { useEffect, useState } from 'react';
import {
  Container,
  Stack,
  Button,
  Loader,
  Alert,
  Text,
  Group,
  Grid,
} from '@mantine/core';
import { IconAlertCircle } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { getMyOrders } from '../../api/ordersApi';
import { OrderCard } from '../../components/orders/OrderCard';

const STATUS_FILTERS = ['pending', 'matching', 'accepted', 'in_progress', 'completed', 'cancelled', 'expired'];

export const MyOrders = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const isAmharic = i18n.language === 'am';

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedStatus, setSelectedStatus] = useState(null);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getMyOrders();
      setOrders(data);
    } catch (err) {
      setError(err.detail || (isAmharic ? 'ቅደም ቁጥር ማውጣት ወደ ውጤት አልመጣም' : 'Failed to fetch orders'));
    } finally {
      setLoading(false);
    }
  };

  const filteredOrders = selectedStatus
    ? orders.filter((order) => order.status === selectedStatus)
    : orders;

  const statusLabels = {
    pending: isAmharic ? 'ጥብቅ ያልሆነ' : 'Pending',
    matching: isAmharic ? 'ማዛመድ' : 'Matching',
    accepted: isAmharic ? 'ተቀብሏል' : 'Accepted',
    in_progress: isAmharic ? 'በዚህ ላይ ነው' : 'In Progress',
    completed: isAmharic ? 'ተጠናቅቆ' : 'Completed',
    cancelled: isAmharic ? 'ተሰርዞ' : 'Cancelled',
    expired: isAmharic ? 'ጊዜው ያለፈ' : 'Expired',
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

  return (
    <Container size="md" py="xl">
      <Stack gap="lg">
        <Group justify="space-between">
          <Text fw={700} size="xl">
            {isAmharic ? 'ቅደም ቁጥር' : 'My Orders'}
          </Text>
          <Button onClick={() => navigate('/orders/create')} size="sm">
            {isAmharic ? 'አዲስ ቅደም ቁጥር' : 'New Order'}
          </Button>
        </Group>

        {error && (
          <Alert icon={<IconAlertCircle size={16} />} color="red">
            {error}
          </Alert>
        )}

        {/* Status filters */}
        <Group>
          <Button
            variant={selectedStatus === null ? 'filled' : 'light'}
            onClick={() => setSelectedStatus(null)}
            size="sm"
          >
            {isAmharic ? 'ሁሉ' : 'All'}
          </Button>
          {STATUS_FILTERS.map((status) => (
            <Button
              key={status}
              variant={selectedStatus === status ? 'filled' : 'light'}
              onClick={() => setSelectedStatus(status)}
              size="sm"
            >
              {statusLabels[status]}
            </Button>
          ))}
        </Group>

        {/* Empty state */}
        {filteredOrders.length === 0 ? (
          <Alert icon={<IconAlertCircle size={16} />}>
            {isAmharic ? 'ቅደም ቁጥር የለም' : 'No orders found'}
          </Alert>
        ) : (
          <Grid>
            {filteredOrders.map((order) => (
              <Grid.Col key={order.id} span={{ base: 12, sm: 6 }}>
                <OrderCard
                  order={order}
                  onClick={() => navigate(`/orders/${order.id}`)}
                />
              </Grid.Col>
            ))}
          </Grid>
        )}
      </Stack>
    </Container>
  );
};
