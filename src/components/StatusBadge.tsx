import { Badge } from '@mantine/core';
import type { JobStatus } from '../types';
import { JOB_STATUS_CONFIG } from '../utils/constants';

interface StatusBadgeProps {
  status: JobStatus;
  size?: 'xs' | 'sm' | 'md' | 'lg';
}

export function StatusBadge({ status, size = 'sm' }: StatusBadgeProps) {
  const { label, color } = JOB_STATUS_CONFIG[status];
  return (
    <Badge color={color} size={size} variant="filled" radius="sm">
      {label}
    </Badge>
  );
}
