import { useEffect, useState } from 'react';
import { Box, Text, Group, Stack, Loader, Badge, Modal } from '@mantine/core';
import {
  IconAlertCircle, IconPlus, IconPackage,
  IconClock, IconCheck, IconX, IconRefresh, IconArrowLeft,
} from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { getMyOrders, cancelOrder } from '../../api/ordersApi';

const N = '#000080';
const T = '#008080';

const STATUS_CONFIG = {
  pending:     { color: '#6B7280', bg: '#F3F4F6', labelKey: 'orders.status_pending',     icon: '⏳' },
  matching:    { color: '#D97706', bg: '#FFFBEB', labelKey: 'orders.status_matching',    icon: '🔍' },
  accepted:    { color: '#2563EB', bg: '#EFF6FF', labelKey: 'orders.status_accepted',    icon: '✅' },
  in_progress: { color: '#7C3AED', bg: '#F5F3FF', labelKey: 'orders.status_in_progress', icon: '🔧' },
  completed:   { color: '#059669', bg: '#ECFDF5', labelKey: 'orders.status_completed',   icon: '🎉' },
  cancelled:   { color: '#DC2626', bg: '#FEF2F2', labelKey: 'orders.status_cancelled',   icon: '❌' },
  expired:     { color: '#DC2626', bg: '#FEF2F2', labelKey: 'orders.status_expired',     icon: '⌛' },
};

const STATUS_FILTERS = ['pending', 'matching', 'accepted', 'in_progress', 'completed', 'cancelled', 'expired'];

export const MyOrders = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const isAmharic = i18n.language === 'am';

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedStatus, setSelectedStatus] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [cancellingId, setCancellingId] = useState(null);
  const [confirmCancelId, setConfirmCancelId] = useState(null);

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchOrders = async (manual = false) => {
    if (manual) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const data = await getMyOrders();
      setOrders(Array.isArray(data) ? data : data.results ?? []);
    } catch (err) {
      setError(typeof err === 'string' ? err : err.detail || 'Failed to load orders');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleCancel = async () => {
    if (!confirmCancelId) return;
    setCancellingId(confirmCancelId);
    setConfirmCancelId(null);
    try {
      await cancelOrder(confirmCancelId);
      fetchOrders();
    } catch (err) {
      alert(typeof err === 'string' ? err : err.detail || 'Failed to cancel');
    } finally {
      setCancellingId(null);
    }
  };

  const filteredOrders = selectedStatus
    ? orders.filter((o) => o.status === selectedStatus)
    : orders;

  const counts = STATUS_FILTERS.reduce((acc, s) => {
    acc[s] = orders.filter((o) => o.status === s).length;
    return acc;
  }, {});

  if (loading) {
    return (
      <Box style={{ minHeight: '100vh', background: 'var(--ot-bg-page)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Stack align="center" gap={12}>
          <Box style={{ width: 48, height: 48, borderRadius: '50%', background: `linear-gradient(135deg, ${N}, ${T})`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Loader size={24} color="white" />
          </Box>
          <Text size="sm" c="dimmed">{t('common.loading')}</Text>
        </Stack>
      </Box>
    );
  }

  return (
    <Box style={{ minHeight: '100vh', background: 'var(--ot-bg-page)', padding: '24px 16px 64px' }}>
      <Box style={{ maxWidth: 720, margin: '0 auto' }}>

        {/* Back to Dashboard button */}
        <Box
          onClick={() => navigate('/client/dashboard')}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '8px 16px', borderRadius: 20, cursor: 'pointer',
            background: 'var(--ot-bg-card)',
            border: '1px solid var(--ot-border)',
            marginBottom: 16,
          }}
        >
          <IconArrowLeft size={16} color="#000080" />
          <Text size="sm" fw={600} c="#000080">{t('nav.back_dashboard')}</Text>
        </Box>

        {/* Header */}
        <Group justify="space-between" align="center" mb={28}>
          <Box>
            <Text fw={900} size="xl" c={N}>{t('orders.title')}</Text>
            <Text size="sm" c="dimmed">{orders.length} {t('orders.total_orders')}</Text>
          </Box>
          <Group gap={10}>
            <Box
              onClick={() => fetchOrders(true)}
              style={{
                width: 38, height: 38, borderRadius: '50%', cursor: 'pointer',
                background: 'var(--ot-bg-card)', border: '1px solid var(--ot-border)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <IconRefresh size={16} color={refreshing ? T : 'var(--ot-text-muted)'}
                style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
            </Box>
            <Box
              onClick={() => navigate('/orders/create')}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '10px 18px', borderRadius: 20, cursor: 'pointer',
                background: `linear-gradient(135deg, ${N}, ${T})`,
                boxShadow: `0 4px 16px ${N}44`,
              }}
            >
              <IconPlus size={16} color="white" />
              <Text size="sm" fw={700} c="white">{t('orders.new_order')}</Text>
            </Box>
          </Group>
        </Group>

        {/* Error */}
        {error && (
          <Box style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: 12, padding: '12px 16px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
            <IconAlertCircle size={16} color="#EF4444" />
            <Text size="sm" c="#EF4444">{error}</Text>
          </Box>
        )}

        {/* Status filter pills */}
        <Box style={{ overflowX: 'auto', paddingBottom: 8, marginBottom: 20 }}>
          <Group gap={8} wrap="nowrap">
            <Box
              onClick={() => setSelectedStatus(null)}
              style={{
                padding: '6px 16px', borderRadius: 20, cursor: 'pointer', whiteSpace: 'nowrap',
                background: selectedStatus === null ? `linear-gradient(135deg, ${N}, ${T})` : 'var(--ot-bg-card)',
                border: `1px solid ${selectedStatus === null ? 'transparent' : 'var(--ot-border)'}`,
              }}
            >
              <Text size="xs" fw={700} c={selectedStatus === null ? 'white' : 'var(--ot-text-muted)'}>
                {t('orders.filter_all')} ({orders.length})
              </Text>
            </Box>
            {STATUS_FILTERS.map((status) => {
              const cfg = STATUS_CONFIG[status];
              const active = selectedStatus === status;
              return (
                <Box
                  key={status}
                  onClick={() => setSelectedStatus(active ? null : status)}
                  style={{
                    padding: '6px 14px', borderRadius: 20, cursor: 'pointer', whiteSpace: 'nowrap',
                    background: active ? cfg.color : 'var(--ot-bg-card)',
                    border: `1px solid ${active ? cfg.color : 'var(--ot-border)'}`,
                  }}
                >
                  <Text size="xs" fw={700} c={active ? 'white' : cfg.color}>
                    {cfg.icon} {t(cfg.labelKey)}
                    {counts[status] > 0 && ` (${counts[status]})`}
                  </Text>
                </Box>
              );
            })}
          </Group>
        </Box>

        {/* Empty state */}
        {filteredOrders.length === 0 ? (
          <Box style={{ textAlign: 'center', padding: '60px 20px' }}>
            <Text style={{ fontSize: 56, marginBottom: 16 }}>📦</Text>
            <Text fw={700} size="lg" c={N} mb={8}>{t('orders.no_orders')}</Text>
            <Text size="sm" c="dimmed" mb={24}>{t('orders.no_orders_sub')}</Text>
            <Box
              onClick={() => navigate('/orders/create')}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '12px 24px', borderRadius: 20, cursor: 'pointer',
                background: `linear-gradient(135deg, ${N}, ${T})`,
              }}
            >
              <IconPlus size={16} color="white" />
              <Text size="sm" fw={700} c="white">{t('orders.create_first')}</Text>
            </Box>
          </Box>
        ) : (
          <Stack gap={12}>
            {filteredOrders.map((order) => {
              const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
              const date = new Date(order.created_at).toLocaleDateString(
                isAmharic ? 'am-ET' : 'en-US',
                { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }
              );
              return (
                <Box
                  key={order.id}
                  onClick={() => navigate(`/orders/${order.id}`)}
                  style={{
                    background: 'var(--ot-bg-card)',
                    border: '1px solid var(--ot-border)',
                    borderRadius: 20,
                    padding: '16px 20px',
                    cursor: 'pointer',
                    transition: 'transform 0.18s, box-shadow 0.18s',
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = `0 8px 24px ${N}18`;
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.transform = '';
                    e.currentTarget.style.boxShadow = '';
                  }}
                >
                  {/* Status accent bar */}
                  <Box style={{
                    position: 'absolute', top: 0, left: 0, width: 4, height: '100%',
                    background: cfg.color, borderRadius: '4px 0 0 4px',
                  }} />
                  <Group justify="space-between" align="flex-start" pl={8}>
                    <Box style={{ flex: 1, minWidth: 0 }}>
                      <Group gap={8} mb={6}>
                        <Text size="xs" fw={600} c="dimmed">#{order.id}</Text>
                        <Box style={{
                          padding: '2px 10px', borderRadius: 20,
                          background: cfg.bg, border: `1px solid ${cfg.color}33`,
                        }}>
                          <Text size="xs" fw={700} c={cfg.color}>{cfg.icon} {t(cfg.labelKey)}</Text>
                        </Box>
                      </Group>
                      <Text size="sm" fw={600} c={N} lineClamp={2} mb={8}>
                        {order.description || t('common.no_data')}
                      </Text>
                      <Group gap={12}>
                        {order.category_name && (
                          <Box style={{ padding: '2px 10px', borderRadius: 20, background: `${T}15` }}>
                            <Text size="xs" fw={600} c={T}>{order.category_name}</Text>
                          </Box>
                        )}
                        {order.sub_service_name && (
                          <Box style={{ padding: '2px 10px', borderRadius: 20, background: `${N}10` }}>
                            <Text size="xs" fw={600} c={N}>{order.sub_service_name}</Text>
                          </Box>
                        )}
                      </Group>
                    </Box>
                    <Box style={{ textAlign: 'right', flexShrink: 0, marginLeft: 12 }}>
                      <Text size="xs" c="dimmed">{date}</Text>
                      {order.status === 'completed' && (
                        <Box style={{ marginTop: 8, width: 28, height: 28, borderRadius: '50%', background: '#ECFDF5', display: 'flex', alignItems: 'center', justifyContent: 'center', marginLeft: 'auto' }}>
                          <IconCheck size={14} color="#059669" />
                        </Box>
                      )}
                      {(order.status === 'cancelled' || order.status === 'expired') && (
                        <Box style={{ marginTop: 8, width: 28, height: 28, borderRadius: '50%', background: '#FEF2F2', display: 'flex', alignItems: 'center', justifyContent: 'center', marginLeft: 'auto' }}>
                          <IconX size={14} color="#DC2626" />
                        </Box>
                      )}
                      {order.status === 'in_progress' && (
                        <Box style={{ marginTop: 8, width: 28, height: 28, borderRadius: '50%', background: '#F5F3FF', display: 'flex', alignItems: 'center', justifyContent: 'center', marginLeft: 'auto' }}>
                          <IconClock size={14} color="#7C3AED" />
                        </Box>
                      )}
                      {['pending', 'matching', 'accepted'].includes(order.status) && (
                        <Box
                          onClick={(e) => { e.stopPropagation(); setConfirmCancelId(order.id); }}
                          style={{
                            marginTop: 8,
                            padding: '4px 12px',
                            borderRadius: 20,
                            background: '#FEF2F2',
                            border: '1px solid #FCA5A5',
                            cursor: cancellingId === order.id ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Text size="xs" fw={700} c="#DC2626">
                            {cancellingId === order.id
                              ? t('orders.cancelling')
                              : t('common.cancel')}
                          </Text>
                        </Box>
                      )}
                    </Box>
                  </Group>
                </Box>
              );
            })}
          </Stack>
        )}
      </Box>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>

      <Modal
        opened={!!confirmCancelId}
        onClose={() => setConfirmCancelId(null)}
        centered
        radius="xl"
        size="sm"
        withCloseButton={false}
        styles={{ content: { background: 'var(--ot-bg-card)' }, header: { display: 'none' } }}
      >
        <Box p="lg">
          <Stack align="center" gap="md">
            <Box style={{
              width: 56, height: 56, borderRadius: '50%',
              background: '#FEF2F2', border: '2px solid #FCA5A5',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Text style={{ fontSize: 24 }}>⚠️</Text>
            </Box>
            <Text fw={800} size="md" c="#000080" ta="center">
              {t('orders.cancel_order')}
            </Text>
            <Text size="sm" c="dimmed" ta="center">
              {t('orders.cancel_order_confirm')}
            </Text>
            <Group gap={12} w="100%">
              <Box
                onClick={() => setConfirmCancelId(null)}
                style={{
                  flex: 1, padding: '10px', borderRadius: 20,
                  background: 'var(--ot-bg-card)',
                  border: '1px solid var(--ot-border)',
                  cursor: 'pointer', textAlign: 'center',
                }}
              >
                <Text size="sm" fw={700} c="dimmed">{t('common.cancel')}</Text>
              </Box>
              <Box
                onClick={handleCancel}
                style={{
                  flex: 1, padding: '10px', borderRadius: 20,
                  background: '#DC2626',
                  cursor: 'pointer', textAlign: 'center',
                }}
              >
                <Text size="sm" fw={700} c="white">{t('orders.cancel_confirm_yes')}</Text>
              </Box>
            </Group>
          </Stack>
        </Box>
      </Modal>
    </Box>
  );
};
