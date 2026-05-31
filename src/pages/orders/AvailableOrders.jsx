import { useEffect, useState } from 'react';
import {
  Container, Stack, Button, Loader, Alert, Text, Group, Grid, Badge, Box, Paper,
} from '@mantine/core';
import {
  IconAlertCircle, IconRefresh, IconCheck, IconCurrencyDollar, IconPhone,
} from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { getAvailableOrders, acceptOrder, declineOrder } from '../../api/ordersApi';

const N = '#000080';
const T = '#008080';
const COMMISSION_ETB = 50; // mock fixed commission

// ── Mock Commission Payment Screen ───────────────────────────────────────────
function CommissionPaymentScreen({ order, onConfirm, onGoToOrder }) {
  const { t } = useTranslation();
  const [paid, setPaid] = useState(false);
  const [payMethod, setPayMethod] = useState(null);

  const handlePay = (method) => {
    setPayMethod(method);
    setTimeout(() => setPaid(true), 800);
  };

  if (paid) {
    return (
      <Box
        style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '24px 16px',
        }}
      >
        <Box
          style={{
            background: 'var(--ot-bg-card)', borderRadius: 24,
            padding: '40px 32px', maxWidth: 380, width: '100%',
            textAlign: 'center', boxShadow: `0 24px 64px ${N}44`,
          }}
        >
          {/* Green checkmark */}
          <Box
            style={{
              width: 72, height: 72, borderRadius: '50%',
              background: `linear-gradient(135deg, #2ECC71, ${T})`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 20px',
              boxShadow: `0 8px 32px ${T}55`,
            }}
          >
            <IconCheck size={36} color="white" />
          </Box>

          <Text fw={900} size="xl" c={N} mb={8}>
            {t('orders.payment_confirmed')}
          </Text>
          <Text size="sm" c="dimmed" mb={6}>
            {t('orders.payment_method_used', { method: payMethod })}
          </Text>
          <Text size="sm" c="dimmed" mb={28}>
            {t('orders.contact_reveal_soon')}
          </Text>

          <Button
            size="md"
            radius="xl"
            fullWidth
            style={{ background: `linear-gradient(135deg, ${N}, ${T})`, border: 'none' }}
            leftSection={<IconPhone size={16} />}
            onClick={onGoToOrder}
          >
            {t('orders.go_to_active_order')}
          </Button>
        </Box>
      </Box>
    );
  }

  return (
    <Box
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '24px 16px',
      }}
    >
      <Box
        style={{
          background: 'var(--ot-bg-card)', borderRadius: 24,
          padding: '32px 28px', maxWidth: 400, width: '100%',
          boxShadow: `0 24px 64px ${N}44`,
        }}
      >
        {/* Header */}
        <Stack align="center" gap={8} mb={24}>
          <Box
            style={{
              width: 56, height: 56, borderRadius: 16,
              background: `linear-gradient(135deg, ${N}, ${T})`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: `0 8px 24px ${N}44`,
            }}
          >
            <IconCurrencyDollar size={28} color="white" />
          </Box>
          <Text fw={900} size="lg" c={N}>{t('orders.commission_payment_title')}</Text>
          <Text size="xs" c="dimmed" ta="center">{t('orders.commission_payment_sub')}</Text>
        </Stack>

        {/* Order summary */}
        <Paper
          p="md" radius="lg" mb={20}
          style={{ background: `${N}08`, border: `1px solid ${N}18` }}
        >
          <Stack gap={6}>
            <Group justify="space-between">
              <Text size="xs" c="dimmed">{t('orders.order_description')}</Text>
              <Text size="xs" fw={600} c={N} lineClamp={1} style={{ maxWidth: 180 }}>
                {order.description || '—'}
              </Text>
            </Group>
            {order.client_address && (
              <Group justify="space-between">
                <Text size="xs" c="dimmed">{t('orders.client_area')}</Text>
                <Text size="xs" fw={600} c={N}>{order.client_address}</Text>
              </Group>
            )}
            <Group justify="space-between">
              <Text size="xs" c="dimmed">{t('orders.commission_amount')}</Text>
              <Text size="sm" fw={800} c={T}>
                {order.commission_fee ? `${parseFloat(order.commission_fee).toFixed(0)} ETB` : `${COMMISSION_ETB} ETB`}
              </Text>
            </Group>
          </Stack>
        </Paper>

        {/* Payment buttons */}
        <Stack gap={12}>
          <Button
            size="md"
            radius="xl"
            fullWidth
            style={{
              background: 'linear-gradient(135deg, #E6007A, #FF6B35)',
              border: 'none',
              fontWeight: 700,
            }}
            onClick={() => handlePay('Telebirr')}
          >
            {t('orders.pay_telebirr')}
          </Button>
          <Button
            size="md"
            radius="xl"
            fullWidth
            style={{
              background: 'linear-gradient(135deg, #1B4F72, #2E86C1)',
              border: 'none',
              fontWeight: 700,
            }}
            onClick={() => handlePay('CBE Birr')}
          >
            {t('orders.pay_cbe_birr')}
          </Button>
        </Stack>

        <Text size="xs" c="dimmed" ta="center" mt={16}>
          {t('orders.mock_payment_note')}
        </Text>
      </Box>
    </Box>
  );
}

// ── Main AvailableOrders component ────────────────────────────────────────────
export const AvailableOrders = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState({});

  // Commission payment modal state
  const [paymentOrder, setPaymentOrder] = useState(null); // order being paid for
  const [acceptedOrderId, setAcceptedOrderId] = useState(null);

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchOrders = async () => {
    setError(null);
    try {
      const data = await getAvailableOrders();
      setOrders(data);
    } catch (err) {
      setError(err.detail || t('orders.fetch_failed'));
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (order) => {
    setActionLoading((prev) => ({ ...prev, [order.id]: true }));
    try {
      const result = await acceptOrder(order.id);
      setAcceptedOrderId(result.order_id || order.id);
      // Remove from list
      setOrders((prev) => prev.filter((o) => o.id !== order.id));
      // Show payment modal only when free trials were already exhausted
      // (backend returns free_jobs_remaining AFTER decrement; if it was 0 before,
      //  it stays 0 and commission was charged — show the mock payment screen)
      const trialsAfter = result.free_jobs_remaining ?? 0;
      if (trialsAfter === 0 && result.commission_fee && parseFloat(result.commission_fee) > 0) {
        setPaymentOrder({ ...order, commission_fee: result.commission_fee });
      } else {
        // Free trial used — navigate directly
        navigate(`/orders/${result.order_id || order.id}`);
      }
    } catch (err) {
      setError(err.detail || t('orders.accept_failed'));
    } finally {
      setActionLoading((prev) => ({ ...prev, [order.id]: false }));
    }
  };

  const handleDecline = async (orderId) => {
    setActionLoading((prev) => ({ ...prev, [`${orderId}-decline`]: true }));
    try {
      await declineOrder(orderId);
      setOrders((prev) => prev.filter((o) => o.id !== orderId));
    } catch (err) {
      setError(err.detail || t('orders.decline_failed'));
    } finally {
      setActionLoading((prev) => ({ ...prev, [`${orderId}-decline`]: false }));
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
    <>
      {/* Commission payment overlay — shown after provider accepts */}
      {paymentOrder && (
        <CommissionPaymentScreen
          order={paymentOrder}
          onGoToOrder={() => {
            setPaymentOrder(null);
            navigate(`/orders/${acceptedOrderId}`);
          }}
        />
      )}

      <Container size="md" py="xl">
        <Stack gap="lg">
          <Group justify="space-between">
            <Text fw={700} size="xl">{t('orders.available_title')}</Text>
            <Button onClick={fetchOrders} variant="light" leftSection={<IconRefresh size={16} />}>
              {t('orders.refresh')}
            </Button>
          </Group>

          {error && (
            <Alert icon={<IconAlertCircle size={16} />} color="red">{error}</Alert>
          )}

          {orders.length === 0 ? (
            <Alert icon={<IconAlertCircle size={16} />}>
              {t('orders.no_available')}
            </Alert>
          ) : (
            <Grid>
              {orders.map((order) => (
                <Grid.Col key={order.id} span={{ base: 12, sm: 6, md: 4 }}>
                  <div style={{
                    border: '1px solid #e0e0e0', borderRadius: '8px', padding: '16px',
                    height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                  }}>
                    <Stack gap="sm">
                      <Text fw={600} size="sm" lineClamp={2}>{order.description}</Text>

                      <Group gap="xs">
                        {order.category_name && (
                          <Badge size="sm" variant="light">{order.category_name}</Badge>
                        )}
                        {order.sub_service_name && (
                          <Badge size="sm" variant="light">{order.sub_service_name}</Badge>
                        )}
                      </Group>

                      <Group gap="xs">
                        <div>
                          <Text size="xs" c="dimmed">{t('orders.distance')}</Text>
                          <Text fw={600} size="sm">
                            {order.distance_km?.toFixed(2) || 'N/A'} km
                          </Text>
                        </div>
                        <div>
                          <Text size="xs" c="dimmed">{t('orders.commission')}</Text>
                          <Text fw={600} size="sm">
                            {order.estimated_commission || 'N/A'} ETB
                          </Text>
                        </div>
                      </Group>

                      {order.expires_at && (
                        <Text size="xs" c="orange">
                          {t('orders.expires_in')} {Math.max(0, Math.ceil(
                            (new Date(order.expires_at) - new Date()) / 60000
                          ))} {t('orders.minutes')}
                        </Text>
                      )}
                    </Stack>

                    <Group gap="xs" mt="md">
                      <Button
                        onClick={() => handleAccept(order)}
                        loading={actionLoading[order.id]}
                        flex={1} size="sm"
                      >
                        {t('orders.accept')}
                      </Button>
                      <Button
                        onClick={() => handleDecline(order.id)}
                        loading={actionLoading[`${order.id}-decline`]}
                        variant="light" flex={1} size="sm"
                      >
                        {t('orders.decline')}
                      </Button>
                    </Group>
                  </div>
                </Grid.Col>
              ))}
            </Grid>
          )}
        </Stack>
      </Container>
    </>
  );
};
