import { Button, Group, Text, Popover, Stack, Box, useMantineTheme } from '@mantine/core';
import { IconLanguage, IconCheck } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { storage, STORAGE_KEYS } from '../utils/storage';
import { SUPPORTED_LANGUAGES } from '../utils/constants';

export function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const [opened, setOpened] = useState(false);
  const theme = useMantineTheme();

  const handleChange = (code: string) => {
    i18n.changeLanguage(code);
    storage.set(STORAGE_KEYS.language, code);
    document.documentElement.dir = code === 'ar' ? 'rtl' : 'ltr';
    setOpened(false);
  };

  const current = SUPPORTED_LANGUAGES.find(l => l.code === i18n.language) ?? SUPPORTED_LANGUAGES[0];

  return (
    <Popover position="bottom-end" withArrow shadow="md" radius="md" opened={opened} onChange={setOpened}>
      <Popover.Target>
        <Button
          variant="subtle"
          color="dark"
          size="sm"
          leftSection={<IconLanguage size={16} />}
          rightSection={<Text size="xs" c="dimmed">▼</Text>}
          onClick={() => setOpened(!opened)}
          style={{
            transition: 'all 0.2s ease',
            backgroundColor: opened ? 'rgba(0, 128, 128, 0.08)' : 'transparent',
            color: '#495057',
          }}
        >
          {current.label}
        </Button>
      </Popover.Target>
      <Popover.Dropdown p="sm">
        <Stack gap="xs" maw={240}>
          <Text size="xs" fw={600} c="dimmed" tt="uppercase" style={{ letterSpacing: '0.5px' }}>
            Select Language
          </Text>
          {SUPPORTED_LANGUAGES.map(lang => (
            <Box
              key={lang.code}
              p="xs"
              style={{
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                backgroundColor: i18n.language === lang.code ? 'rgba(0, 128, 128, 0.1)' : 'transparent',
                border: i18n.language === lang.code ? '1px solid #008080' : '1px solid transparent',
              }}
              onClick={() => handleChange(lang.code)}
              onMouseEnter={(e) => {
                if (i18n.language !== lang.code) {
                  (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(0, 128, 128, 0.05)';
                }
              }}
              onMouseLeave={(e) => {
                if (i18n.language !== lang.code) {
                  (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
                }
              }}
            >
              <Group justify="space-between" gap="xs">
                <Group gap="xs">
                  <Text size="sm">{lang.flag}</Text>
                  <div>
                    <Text size="sm" fw={500} c={i18n.language === lang.code ? '#008080' : 'black'}>
                      {lang.label}
                    </Text>
                    <Text size="xs" c="dimmed">
                      {lang.nativeLabel}
                    </Text>
                  </div>
                </Group>
                {i18n.language === lang.code && (
                  <IconCheck size={16} color="#008080" style={{ minWidth: '16px' }} />
                )}
              </Group>
            </Box>
          ))}
        </Stack>
      </Popover.Dropdown>
    </Popover>
  );
}
