import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { MantineProvider } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';
import '@mantine/dates/styles.css';
import '@mantine/charts/styles.css';
import 'leaflet/dist/leaflet.css';
import './i18n';
import './index.css';
import App from './App.tsx';
import { oneTouchTheme } from './theme';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MantineProvider
      theme={oneTouchTheme}
      defaultColorScheme="light"
    >
      <Notifications position="top-right" zIndex={1000} />
      <App />
    </MantineProvider>
  </StrictMode>
);
