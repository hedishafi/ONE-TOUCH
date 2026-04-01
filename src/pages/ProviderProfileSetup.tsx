import React, { useMemo, useState } from 'react';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Container,
  FileButton,
  Group,
  NumberInput,
  Paper,
  Stack,
  Text,
  TextInput,
  Textarea,
  Title,
} from '@mantine/core';
import { IconAlertCircle, IconUpload, IconUserCheck } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { notifications } from '@mantine/notifications';
import { setupProviderProfile } from '../services/providerProfileService';

export default function ProviderProfileSetup() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fullName, setFullName] = useState('');
  const [serviceCategory, setServiceCategory] = useState('');
  const [subServicesText, setSubServicesText] = useState('');
  const [priceMin, setPriceMin] = useState<number | ''>('');
  const [priceMax, setPriceMax] = useState<number | ''>('');
  const [bio, setBio] = useState('');
  const [profilePicture, setProfilePicture] = useState<File | null>(null);

  const previewUrl = useMemo(() => (profilePicture ? URL.createObjectURL(profilePicture) : null), [profilePicture]);

  const parseSubServices = (input: string) => {
    return input
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);
  };

  const validateForm = () => {
    if (!fullName.trim()) return 'Full name is required.';
    if (!serviceCategory.trim()) return 'Service category is required.';
    const parsed = parseSubServices(subServicesText);
    if (!parsed.length) return 'At least one sub service is required (comma separated).';
    if (priceMin === '' || priceMax === '') return 'Price range is required.';
    if (Number(priceMin) > Number(priceMax)) return 'price_max must be greater than or equal to price_min.';
    return null;
  };

  const handleSubmit = async () => {
    const formError = validateForm();
    if (formError) {
      setError(formError);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      await setupProviderProfile({
        full_name: fullName.trim(),
        service_category: serviceCategory.trim(),
        sub_services: parseSubServices(subServicesText),
        price_min: Number(priceMin),
        price_max: Number(priceMax),
        bio: bio.trim(),
        profile_picture: profilePicture,
      });

      notifications.show({
        title: 'Profile Saved',
        message: 'Profile setup completed successfully. Proceeding to identity upload.',
        color: 'green',
      });

      navigate('/provider/onboarding/step1');
    } catch (err: any) {
      const detail = err?.response?.data;
      const fallback = 'Failed to save profile setup.';
      const message =
        detail?.detail ||
        detail?.message ||
        detail?.full_name?.[0] ||
        detail?.service_category?.[0] ||
        detail?.sub_services?.[0] ||
        detail?.price_max?.[0] ||
        fallback;
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container size="sm" py="xl">
      <Paper p="xl" radius="md" withBorder>
        <Stack gap="lg">
          <Group gap={12} align="flex-start">
            <Box
              w={44}
              h={44}
              style={{
                borderRadius: 12,
                background: 'rgba(0, 128, 128, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <IconUserCheck size={24} color="#008080" />
            </Box>
            <Stack gap={2}>
              <Title order={3}>Profile Setup</Title>
              <Text size="sm" c="dimmed">Complete your provider profile, then continue to identity upload.</Text>
            </Stack>
          </Group>

          {error && (
            <Alert icon={<IconAlertCircle size={16} />} color="red">
              {error}
            </Alert>
          )}

          <Group align="flex-start" gap="md">
            <Avatar src={previewUrl} size={72} radius="xl">
              {fullName ? fullName[0] : 'P'}
            </Avatar>
            <Stack gap={6}>
              <FileButton accept="image/*" onChange={setProfilePicture}>
                {(props) => (
                  <Button {...props} variant="light" leftSection={<IconUpload size={16} />}>
                    {profilePicture ? 'Change Profile Picture' : 'Upload Profile Picture'}
                  </Button>
                )}
              </FileButton>
              <Text size="xs" c="dimmed">Supported: JPG, PNG, WEBP</Text>
            </Stack>
          </Group>

          <TextInput
            label="Full Name"
            value={fullName}
            onChange={(event) => setFullName(event.currentTarget.value)}
            required
          />

          <TextInput
            label="Service Category"
            placeholder="e.g. Plumbing"
            value={serviceCategory}
            onChange={(event) => setServiceCategory(event.currentTarget.value)}
            required
          />

          <TextInput
            label="Sub Services"
            placeholder="e.g. Pipe Repair, Leak Fix"
            value={subServicesText}
            onChange={(event) => setSubServicesText(event.currentTarget.value)}
            description="Enter multiple values separated by commas"
            required
          />

          <Group grow>
            <NumberInput
              label="Minimum Price (ETB)"
              value={priceMin}
              onChange={(value) => setPriceMin(value === '' ? '' : Number(value))}
              min={0}
              required
            />
            <NumberInput
              label="Maximum Price (ETB)"
              value={priceMax}
              onChange={(value) => setPriceMax(value === '' ? '' : Number(value))}
              min={0}
              required
            />
          </Group>

          <Textarea
            label="Bio"
            value={bio}
            onChange={(event) => setBio(event.currentTarget.value)}
            minRows={3}
            placeholder="Tell clients about your experience"
          />

          <Group justify="flex-end">
            <Button onClick={handleSubmit} loading={loading}>
              Save & Continue to Identity Upload
            </Button>
          </Group>
        </Stack>
      </Paper>
    </Container>
  );
}
