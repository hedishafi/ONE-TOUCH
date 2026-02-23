import { Menu, ActionIcon, Text, Group } from '@mantine/core';
import { IconLanguage } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { storage, STORAGE_KEYS } from '../utils/storage';
import { SUPPORTED_LANGUAGES } from '../utils/constants';

export function LanguageSwitcher() {
  const { i18n } = useTranslation();

  const handleChange = (code: string) => {
    i18n.changeLanguage(code);
    storage.set(STORAGE_KEYS.language, code);
    document.documentElement.dir = code === 'ar' ? 'rtl' : 'ltr';
  };

  const current = SUPPORTED_LANGUAGES.find(l => l.code === i18n.language) ?? SUPPORTED_LANGUAGES[0];

  return (
    <Menu shadow="md" width={160} radius="md">
      <Menu.Target>
        <ActionIcon variant="subtle" color="white" size="lg" aria-label="Language">
          <Group gap={4}>
            <Text size="sm">{current.flag}</Text>
            <IconLanguage size={16} color="white" />
          </Group>
        </ActionIcon>
      </Menu.Target>
      <Menu.Dropdown>
        {SUPPORTED_LANGUAGES.map(lang => (
          <Menu.Item
            key={lang.code}
            onClick={() => handleChange(lang.code)}
            style={{ fontWeight: i18n.language === lang.code ? 700 : 400 }}
          >
            <Group gap="xs">
              <Text>{lang.flag}</Text>
              <Text size="sm">{lang.label}</Text>
            </Group>
          </Menu.Item>
        ))}
      </Menu.Dropdown>
    </Menu>
  );
}
