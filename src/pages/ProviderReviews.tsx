import { Box, Text, Group, Stack, Card, Badge, Avatar, Paper, SimpleGrid, Progress, Divider } from '@mantine/core';
import { IconStar, IconStarFilled, IconStarHalfFilled } from '@tabler/icons-react';
import { ProviderLayout } from '../components/ProviderLayout';
import { useAuthStore } from '../store/authStore';
import { storage, STORAGE_KEYS } from '../utils/storage';
import { COLORS } from '../utils/constants';
import type { ProviderProfile } from '../types';

const N = COLORS.navyBlue;
const T = COLORS.tealBlue;

const MOCK_REVIEWS = [
  { id: '1', clientName: 'Abebe T.', rating: 5, comment: 'Excellent work! Very professional and punctual. Would definitely hire again.', date: '2 days ago', service: 'Home Cleaning' },
  { id: '2', clientName: 'Sara M.', rating: 4, comment: 'Good job overall. Arrived on time and completed the work efficiently.', date: '1 week ago', service: 'Plumbing' },
  { id: '3', clientName: 'Dawit K.', rating: 5, comment: 'Outstanding service. Very thorough and left everything spotless.', date: '2 weeks ago', service: 'Home Cleaning' },
  { id: '4', clientName: 'Tigist A.', rating: 3, comment: 'Decent work but took longer than expected. Communication could be better.', date: '3 weeks ago', service: 'Electrical' },
  { id: '5', clientName: 'Yared T.', rating: 5, comment: 'Highly recommend! Fixed the issue quickly and explained everything clearly.', date: '1 month ago', service: 'Plumbing' },
];

function StarRow({ rating }: { rating: number }) {
  return (
    <Group gap={2}>
      {[1,2,3,4,5].map(i => (
        <Box key={i} style={{ color: i <= rating ? COLORS.warning : '#DEE2E6' }}>
          {i <= rating ? <IconStarFilled size={14}/> : <IconStar size={14}/>}
        </Box>
      ))}
    </Group>
  );
}

export function ProviderReviews() {
  const { currentUser } = useAuthStore();
  const profiles = storage.get<ProviderProfile[]>(STORAGE_KEYS.providerProfiles, []);
  const myProfile = profiles.find(p => p.userId === currentUser?.id);
  const avgRating = myProfile?.rating ?? 4.6;

  const ratingCounts = [5,4,3,2,1].map(star => ({
    star,
    count: MOCK_REVIEWS.filter(r => r.rating === star).length,
    pct: Math.round((MOCK_REVIEWS.filter(r => r.rating === star).length / MOCK_REVIEWS.length) * 100),
  }));

  return (
    <ProviderLayout title="Reviews">
      <Stack gap="lg">

        {/* Summary card */}
        <Card radius="lg" withBorder p="xl">
          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="xl">
            {/* Average */}
            <Stack align="center" justify="center" gap="xs">
              <Text style={{ fontSize: 64, fontWeight: 900, lineHeight: 1, color: N }}>{avgRating.toFixed(1)}</Text>
              <Group gap={4}>
                {[1,2,3,4,5].map(i => (
                  <Box key={i} style={{ color: i <= Math.round(avgRating) ? COLORS.warning : '#DEE2E6' }}>
                    <IconStarFilled size={20}/>
                  </Box>
                ))}
              </Group>
              <Text size="sm" c="dimmed">{MOCK_REVIEWS.length} reviews</Text>
            </Stack>

            {/* Breakdown */}
            <Stack gap={8} justify="center">
              {ratingCounts.map(({ star, count, pct }) => (
                <Group key={star} gap={8} wrap="nowrap">
                  <Text size="xs" fw={600} w={8}>{star}</Text>
                  <IconStarFilled size={12} color={COLORS.warning}/>
                  <Progress value={pct} color="yellow" size="sm" style={{ flex: 1 }} radius="xl"/>
                  <Text size="xs" c="dimmed" w={20}>{count}</Text>
                </Group>
              ))}
            </Stack>
          </SimpleGrid>
        </Card>

        {/* Review list */}
        <Text fw={700} size="md" c={N}>Customer Feedback</Text>
        <Stack gap="md">
          {MOCK_REVIEWS.map(review => (
            <Paper key={review.id} p="lg" radius="xl" withBorder style={{ background: 'var(--ot-bg-card)' }}>
              <Group justify="space-between" mb="sm" wrap="nowrap">
                <Group gap={10}>
                  <Avatar radius="xl" size="md" color="teal">{review.clientName.charAt(0)}</Avatar>
                  <Box>
                    <Text fw={700} size="sm" c={N}>{review.clientName}</Text>
                    <Group gap={6}>
                      <StarRow rating={review.rating}/>
                      <Text size="xs" c="dimmed">· {review.date}</Text>
                    </Group>
                  </Box>
                </Group>
                <Badge size="sm" color="teal" variant="light">{review.service}</Badge>
              </Group>
              <Divider mb="sm"/>
              <Text size="sm" c="dimmed" style={{ lineHeight: 1.7 }}>{review.comment}</Text>
            </Paper>
          ))}
        </Stack>
      </Stack>
    </ProviderLayout>
  );
}
