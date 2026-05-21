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
  Badge,
} from '@mantine/core';
import { IconAlertCircle, IconRefresh } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { getAvailableOrders, acceptOrder, declineOrder } from '../../api/ordersApi';

export const AvailableOrders = () => {
  const { i18n } = useTranslation();
  const navigate = useNavigate();
  const isAmharic = i18n.language === 'am';

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState({});

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 30000); // Auto-refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const fetchOrders = async () => {
    setError(null);
    try {
      const data = await getAvailableOrders();
      setOrders(data);
    } catch (err) {
      setError(err.detail || (isAmharic ? 'ቅደም ቁጥር ማውጣት ወደ ውጤት አልመጣም' : 'Failed to fetch orders'));
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (orderId) => {
    setActionLoading((prev) => ({ ...prev, [orderId]: true }));
    try {
      await acceptOrder(orderId);
      setOrders((prev) => prev.filter((o) => o.id !== orderId));
      navigate(`/orders/${orderId}`);
    } catch (err) {
      setError(err.detail || (isAmharic ? 'ይህ ቅደም ቁጥር መቀበል ወደ ውጤት አልመጣም' : 'Failed to accept order'));
    } finally {
      setActionLoading((prev) => ({ ...prev, [orderId]: false }));
    }
  };

  const handleDecline = async (orderId) => {
    setActionLoading((prev) => ({ ...prev, [orderId + '-decline']: true }));
    try {
      await declineOrder(orderId);
      setOrders((prev) => prev.filter((o) => o.id !== orderId));
    } catch (err) {
      setError(err.detail || (isAmharic ? 'ይህ ቅደም ቁጥር ማስቀበር ወደ ውጤት አልመጣም' : 'Failed to decline order'));
    } finally {
      setActionLoading((prev) => ({ ...prev, [orderId + '-decline']: false }));
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

  return (
    <Container size="md" py="xl">
      <Stack gap="lg">
        <Group justify="space-between">
          <Text fw={700} size="xl">
            {isAmharic ? 'ዛሚ ቅደም ቁጥር' : 'Available Orders'}
          </Text>
          <Button
            onClick={fetchOrders}
            variant="light"
            leftSection={<IconRefresh size={16} />}
          >
            {isAmharic ? 'ሪስ' : 'Refresh'}
          </Button>
        </Group>

        {error && (
          <Alert icon={<IconAlertCircle size={16} />} color="red">
            {error}
          </Alert>
        )}

        {orders.length === 0 ? (
          <Alert icon={<IconAlertCircle size={16} />}>
            {isAmharic ? 'ቅደም ቁጥር የለም' : 'No orders available nearby'}
          </Alert>
        ) : (
          <Grid>
            {orders.map((order) => (
              <Grid.Col key={order.id} span={{ base: 12, sm: 6, md: 4 }}>
                <div
                  style={{
                    border: '1px solid #e0e0e0',
                    borderRadius: '8px',
                    padding: '16px',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                  }}
                >
                  <Stack gap="sm">
                    <Text fw={600} size="sm" lineClamp={2}>
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

                    <Group gap="xs">
                      <div>
                        <Text size="xs" c="dimmed">
                          {isAmharic ? 'ርቀት' : 'Distance'}
                        </Text>
                        <Text fw={600} size="sm">
                          {order.distance_km?.toFixed(2) || 'N/A'} km
                        </Text>
                      </div>
                      <div>
                        <Text size="xs" c="dimmed">
                          {isAmharic ? 'ኪሳራ' : 'Commission'}
                        </Text>
                        <Text fw={600} size="sm">
                          {order.estimated_commission || 'N/A'} ETB
                        </Text>
                      </div>
                    </Group>

                    {order.expires_at && (
                      <Text size="xs" c="orange">
                        {isAmharic ? 'በ' : 'Expires in'} {Math.max(0, Math.ceil(
                          (new Date(order.expires_at) - new Date()) / 60000
                        ))}{isAmharic ? ' ደቂቃ' : ' min'}
                      </Text>
                    )}
                  </Stack>

                  <Group gap="xs" mt="md">
                    <Button
                      onClick={() => handleAccept(order.id)}
                      loading={actionLoading[order.id]}
                      flex={1}
                      size="sm"
                    >
                      {isAmharic ? 'ተቀበል' : 'Accept'}
                    </Button>
                    <Button
                      onClick={() => handleDecline(order.id)}
                      loading={actionLoading[order.id + '-decline']}
                      variant="light"
                      flex={1}
                      size="sm"
                    >
                      {isAmharic ? 'ማስቀበር' : 'Decline'}
                    </Button>
                  </Group>
                </div>
              </Grid.Col>
            ))}
          </Grid>
        )}
      </Stack>
    </Container>
  );
};
