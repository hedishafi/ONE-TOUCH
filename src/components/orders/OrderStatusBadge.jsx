import { Badge } from '@mantine/core';
import { useTranslation } from 'react-i18next';

const STATUS_CONFIG = {
  pending: { color: 'gray', label_en: 'Pending', label_am: 'ጥብቅ ያልሆነ' },
  matching: { color: 'yellow', label_en: 'Matching', label_am: 'ማዛመድ' },
  accepted: { color: 'blue', label_en: 'Accepted', label_am: 'ተቀብሏል' },
  in_progress: { color: 'orange', label_en: 'In Progress', label_am: 'በዚህ ላይ ነው' },
  completed: { color: 'green', label_en: 'Completed', label_am: 'ተጠናቅቆ' },
  cancelled: { color: 'red', label_en: 'Cancelled', label_am: 'ተሰርዞ' },
  expired: { color: 'red', label_en: 'Expired', label_am: 'ጊዜው ያለፈ' },
};

export const OrderStatusBadge = ({ status }) => {
  const { i18n } = useTranslation();
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  const label = i18n.language === 'am' ? config.label_am : config.label_en;

  return <Badge color={config.color}>{label}</Badge>;
};
