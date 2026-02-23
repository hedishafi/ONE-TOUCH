import { Group, Text } from '@mantine/core';
import { IconStar, IconStarFilled, IconStarHalfFilled } from '@tabler/icons-react';

interface RatingStarsProps {
  rating: number;
  showValue?: boolean;
  size?: number;
}

export function RatingStars({ rating, showValue = true, size = 14 }: RatingStarsProps) {
  const stars = Array.from({ length: 5 }, (_, i) => {
    if (rating >= i + 1) return 'full';
    if (rating >= i + 0.5) return 'half';
    return 'empty';
  });

  return (
    <Group gap={2} align="center">
      {stars.map((type, i) => (
        <span key={i}>
          {type === 'full' ? (
            <IconStarFilled size={size} color="#F5E642" />
          ) : type === 'half' ? (
            <IconStarHalfFilled size={size} color="#F5E642" />
          ) : (
            <IconStar size={size} color="#DEE2E6" />
          )}
        </span>
      ))}
      {showValue && (
        <Text size="xs" c="dimmed" fw={600} ml={2}>
          {rating.toFixed(1)}
        </Text>
      )}
    </Group>
  );
}
