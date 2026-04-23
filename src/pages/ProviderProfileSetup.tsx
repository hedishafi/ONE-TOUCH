import { useMemo, useState } from 'react';
import {
  ActionIcon,
  Alert,
  Avatar,
  Box,
  Button,
  Container,
  FileButton,
  Group,
  MultiSelect,
  NumberInput,
  Paper,
  Select,
  Stack,
  Text,
  TextInput,
  Textarea,
  Title,
  Tooltip,
} from '@mantine/core';
import { IconAlertCircle, IconInfoCircle, IconUpload, IconUserCheck } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { notifications } from '@mantine/notifications';
import { setupProviderProfile } from '../services/providerProfileService';
import { useServiceCatalog } from '../hooks/useServiceCatalog';

export default function ProviderProfileSetup() {
  const MIN_PRICE_RATIO = 0.5;

  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fullName, setFullName] = useState('');
  const [serviceCategoryId, setServiceCategoryId] = useState('');
  const [subServiceIds, setSubServiceIds] = useState<string[]>([]);
  const [priceMax, setPriceMax] = useState<number | ''>('');
  const [bio, setBio] = useState('');
  const [profilePicture, setProfilePicture] = useState<File | null>(null);
  const { categories, loading: catalogLoading, error: catalogError } = useServiceCatalog();

  const previewUrl = useMemo(() => (profilePicture ? URL.createObjectURL(profilePicture) : null), [profilePicture]);
  const calculatedPriceMin = useMemo(
    () => (priceMax === '' ? '' : Math.round(Number(priceMax) * MIN_PRICE_RATIO)),
    [priceMax],
  );

  const selectedCategory = categories.find((category) => category.id === serviceCategoryId);
  const subServiceOptions = selectedCategory?.subcategories?.map((sub) => ({
    value: sub.id,
    label: sub.name,
  })) ?? [];

  const validateForm = () => {
    if (!fullName.trim()) return 'Full name is required.';
    if (!serviceCategoryId) return 'Service category is required.';
    if (!subServiceIds.length) return 'Please select at least one sub service.';
    if (priceMax === '') return 'Maximum price is required.';
    if (Number(priceMax) <= 0) return 'Maximum price must be greater than 0.';
    const min = Number(calculatedPriceMin);
    const max = Number(priceMax);
    if (min > max) return 'Calculated minimum price must be less than or equal to maximum price.';
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

      const categoryName = selectedCategory?.name ?? '';
      const subServiceNames = (selectedCategory?.subcategories ?? [])
        .filter((sub) => subServiceIds.includes(sub.id))
        .map((sub) => sub.name);

      await setupProviderProfile({
        full_name: fullName.trim(),
        service_category: categoryName,
        sub_services: subServiceNames,
        price_min: Number(calculatedPriceMin),
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

          {catalogError && (
            <Alert icon={<IconAlertCircle size={16} />} color="yellow">
              {catalogError}
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

          <Select
            label="Service Category"
            placeholder={catalogLoading ? 'Loading categories...' : 'Select a category'}
            data={categories.map((category) => ({ value: category.id, label: category.name }))}
            value={serviceCategoryId}
            onChange={(value) => {
              setServiceCategoryId(value ?? '');
              setSubServiceIds([]);
            }}
            searchable
            required
          />

          <MultiSelect
            label="Sub Services"
            placeholder={serviceCategoryId ? 'Select sub services' : 'Select a category first'}
            data={subServiceOptions}
            value={subServiceIds}
            onChange={setSubServiceIds}
            searchable
            required
            disabled={!serviceCategoryId}
          />

          <Group grow>
            <Box>
              <Group gap={6} mb={4}>
                <Text size="sm" fw={500}>Minimum Price (ETB)</Text>
                <Tooltip
                  multiline
                  w={280}
                  withArrow
                  label="Minimum price is automatically set to 50% of your maximum price to support a fair and consistent marketplace policy."
                >
                  <ActionIcon variant="subtle" size="sm" aria-label="Minimum price rule information">
                    <IconInfoCircle size={16} />
                  </ActionIcon>
                </Tooltip>
              </Group>
              <NumberInput
                value={calculatedPriceMin}
                min={0}
                readOnly
                disabled
                required
              />
            </Box>
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
