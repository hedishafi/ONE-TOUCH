import { Badge } from '@mantine/core';
import { useTranslation } from 'react-i18next';

const STATUS_COLOR = {
  pending: 'yellow',
  matching: 'blue',
  accepted: 'green',
  in_progress: 'orange',
  completed: 'gray',
  cancelled: 'red',
  expired: 'red',
};

const STATUS_KEY = {
  pending: 'orders.status_pending',
  matching: 'orders.status_matching',
  accepted: 'orders.status_accepted',
  in_progress: 'orders.status_in_progress',
  completed: 'orders.status_completed',
  cancelled: 'orders.status_cancelled',
  expired: 'orders.status_expired',
};

export const OrderStatusBadge = ({ status }) => {
  const { t } = useTranslation();
  const color = STATUS_COLOR[status] ?? 'yellow';
  const label = t(STATUS_KEY[status] ?? 'orders.status_pending');
  return <Badge color={color}>{label}</Badge>;
};
