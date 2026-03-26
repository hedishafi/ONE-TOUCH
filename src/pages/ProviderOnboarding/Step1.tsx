import React, { useState } from 'react';
import {
  Container,
  Paper,
  Title,
  Text,
  Button,
  Group,
  Stack,
  Radio,
  Alert,
  Center,
} from '@mantine/core';
import {
  IconAlertCircle,
  IconCloudUpload,
} from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { notifications } from '@mantine/notifications';
import * as providerService from '../../services/providerOnboardingService';

export const ProviderOnboardingStep1: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [docType, setDocType] = useState<'national_id' | 'drivers_license' | 'kebele_id'>('national_id');
  const [frontImage, setFrontImage] = useState<File | null>(null);
  const [backImage, setBackImage] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  const validateFile = (selectedFile: File): boolean => {
    if (selectedFile.size > 10 * 1024 * 1024) {
      setError('File size must be less than 10MB');
      return false;
    }

    if (!selectedFile.type.startsWith('image/')) {
      setError('Please upload an image file (JPG, PNG, etc.)');
      return false;
    }

    return true;
  };

  const handleFrontImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && validateFile(selectedFile)) {
      setFrontImage(selectedFile);
      setError(null);
    }
  };

  const handleBackImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && validateFile(selectedFile)) {
      setBackImage(selectedFile);
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!frontImage || !backImage) {
      setError('Please upload both front and back images');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await providerService.uploadDocument({
        document_type: docType,
        front_image: frontImage,
        back_image: backImage,
      });

      notifications.show({
        title: 'Document Uploaded',
        message: 'Your document has been uploaded successfully and OCR validation passed',
        color: 'green',
      });

      // Extract phone from OCR results
      const extractedPhone = response.extracted_data?.phone_number;
      
      // Move to phone choice screen
      navigate('/provider/onboarding/phone-choice', {
        state: {
          sessionId: response.session_id,
          extractedPhone: extractedPhone,
          extractedData: response.extracted_data,
        },
      });
    } catch (err: any) {
      const errorData = err.response?.data;
      let errorMessage = '';
      let errorList: string[] = [];

      // Handle validation errors from OCR
      if (errorData?.error === 'Document validation failed') {
        errorMessage = errorData.user_message || '❌ Document Validation Failed';
        
        // Build detailed error list
        if (errorData.is_expired) {
          errorList.push('Document has expired');
        }
        if (errorData.is_non_ethiopian) {
          errorList.push('Document must be an Ethiopian government-issued ID');
        }
        if (errorData.validation_errors?.length > 0) {
          errorList.push(...errorData.validation_errors);
        }
        if (errorData.validation_warnings?.length > 0) {
          errorList.push(...errorData.validation_warnings);
        }
      } else {
        // Generic error handling
        errorMessage =
          err.response?.data?.detail ||
          err.response?.data?.front_image?.[0] ||
          err.response?.data?.back_image?.[0] ||
          err.response?.data?.error ||
          'Failed to upload documents';
      }

      const fullMessage = errorList.length > 0 
        ? `${errorMessage}\n\n${errorList.map(e => `• ${e}`).join('\n')}`
        : errorMessage;
      
      setError(fullMessage);
      notifications.show({
        title: 'Upload Failed - Validation Error',
        message: errorMessage,
        color: 'red',
        autoClose: false,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container size="md" py="xl">
      <div style={{ marginBottom: '40px' }}>
        <h2>Step 1 of 5: Upload Your Identity Document</h2>
        <p>Please upload a clear photo of your government-issued ID.</p>
      </div>

      <Paper p="xl" radius="md" withBorder>
        <Title order={2} mb="md">
          Upload Your Identity Document
        </Title>
        <Text color="dimmed" mb="xl">
          Please upload a clear photo of your government-issued ID.
          We support National ID, Driver's License, and Kebele ID.
        </Text>

        {error && (
          <Alert icon={<IconAlertCircle size={16} />} color="red" mb="xl" title="Validation Failed">
            <div style={{ whiteSpace: 'pre-wrap' }}>
              {error}
            </div>
          </Alert>
        )}

        <Stack gap="lg">
          {/* Document Type Selection */}
          <div>
            <Text fw={500} mb="md">
              Document Type
            </Text>
            <Radio.Group value={docType} onChange={(value: any) => setDocType(value)}>
              <Stack gap="sm">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input
                    type="radio"
                    name="docType"
                    value="national_id"
                    checked={docType === 'national_id'}
                    onChange={(e) => setDocType(e.target.value as any)}
                    id="national_id"
                  />
                  <label htmlFor="national_id" style={{ cursor: 'pointer' }}>
                    <Text>National ID - Ethiopian National ID Card</Text>
                  </label>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input
                    type="radio"
                    name="docType"
                    value="drivers_license"
                    checked={docType === 'drivers_license'}
                    onChange={(e) => setDocType(e.target.value as any)}
                    id="drivers_license"
                  />
                  <label htmlFor="drivers_license" style={{ cursor: 'pointer' }}>
                    <Text>Driver's License - Driving License</Text>
                  </label>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input
                    type="radio"
                    name="docType"
                    value="kebele_id"
                    checked={docType === 'kebele_id'}
                    onChange={(e) => setDocType(e.target.value as any)}
                    id="kebele_id"
                  />
                  <label htmlFor="kebele_id" style={{ cursor: 'pointer' }}>
                    <Text>Kebele ID - Kebele Identification Certificate</Text>
                  </label>
                </div>
              </Stack>
            </Radio.Group>
          </div>

          {/* File Upload */}
          <div>
            <Text fw={500} mb="md">
              Upload Document Photos (Front & Back)
            </Text>
            <Stack gap="md">
              <div
                style={{
                  border: '2px dashed #ccc',
                  borderRadius: '8px',
                  padding: '30px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  backgroundColor: '#f9f9f9',
                }}
              >
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFrontImageChange}
                  style={{ display: 'none' }}
                  id="front-image-input"
                  disabled={loading}
                />
                <label htmlFor="front-image-input" style={{ cursor: 'pointer' }}>
                  <Center mb="md">
                    <IconCloudUpload size={40} color="#0066cc" />
                  </Center>
                  <Text fw={500}>Upload Front Image</Text>
                  <Text color="dimmed" size="sm">PNG, JPG up to 10MB</Text>
                  {frontImage && (
                    <Text color="green" size="sm" mt="md" fw={500}>
                      ✓ {frontImage.name}
                    </Text>
                  )}
                </label>
              </div>

              <div
                style={{
                  border: '2px dashed #ccc',
                  borderRadius: '8px',
                  padding: '30px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  backgroundColor: '#f9f9f9',
                }}
              >
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleBackImageChange}
                  style={{ display: 'none' }}
                  id="back-image-input"
                  disabled={loading}
                />
                <label htmlFor="back-image-input" style={{ cursor: 'pointer' }}>
                  <Center mb="md">
                    <IconCloudUpload size={40} color="#0066cc" />
                  </Center>
                  <Text fw={500}>Upload Back Image</Text>
                  <Text color="dimmed" size="sm">PNG, JPG up to 10MB</Text>
                  {backImage && (
                    <Text color="green" size="sm" mt="md" fw={500}>
                      ✓ {backImage.name}
                    </Text>
                  )}
                </label>
              </div>
            </Stack>
          </div>

          {/* Upload Button */}
          <Group justify="flex-end" mt="xl">
            <Button
              variant="default"
              onClick={() => navigate('/signup')}
              disabled={loading}
            >
              Back
            </Button>
            <Button
              onClick={handleUpload}
              disabled={!frontImage || !backImage || loading}
              loading={loading}
            >
              {loading ? 'Uploading...' : 'Upload & Continue'}
            </Button>
          </Group>
        </Stack>
      </Paper>
    </Container>
  );
};
