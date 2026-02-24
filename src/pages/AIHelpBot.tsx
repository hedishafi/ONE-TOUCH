import {
  Box, Container, Stack, Group, Text, TextInput, Button, Paper, Avatar, ScrollArea,
  Badge,
} from '@mantine/core';
import { IconSend, IconArrowLeft, IconRobot } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { COLORS, ROUTES } from '../utils/constants';

const ANIMATIONS = `
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(20px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes slideUp {
  from { opacity: 0; transform: translateY(16px); }
  to   { opacity: 1; transform: translateY(0); }
}
.fade-in { animation: fadeIn 0.6s ease both; }
.msg-item { animation: slideUp 0.3s ease both; }
`;

interface Message {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  timestamp: Date;
}

export function AIHelpBot() {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      sender: 'bot',
      text: 'Hello! 👋 Welcome to ONE TOUCH AI Assistant. How can I help you today?',
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      sender: 'user',
      text: inputValue,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    // Simulate bot response
    setTimeout(() => {
      const botResponse: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'bot',
        text: `I understand you're asking about: "${inputValue}". Let me help you with that. Feel free to ask me anything about our services, booking process, payments, or how to register as a provider!`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, botResponse]);
      setIsLoading(false);
    }, 800);
  };

  return (
    <>
      <style>{ANIMATIONS}</style>
      <Box style={{ minHeight: '100vh', background: '#FFFFFF' }}>
        {/* Header */}
        <Box
          px={{ base: 'md', sm: 'lg', md: 'xl' }}
          py="md"
          style={{
            background: `linear-gradient(135deg, ${COLORS.navyBlue} 0%, ${COLORS.tealBlue} 100%)`,
            color: 'white',
            boxShadow: '0 4px 20px rgba(0,0,137,0.15)',
          }}
        >
          <Container size="lg">
            <Group justify="space-between" align="center">
              <Group gap="md">
                <Button
                  variant="subtle"
                  size="sm"
                  onClick={() => navigate(ROUTES.landing)}
                  style={{ color: 'white', padding: '8px 12px' }}
                >
                  <IconArrowLeft size={20} stroke={2.5} />
                </Button>
                <Stack gap={0}>
                  <Group gap="xs" align="center">
                    <IconRobot size={24} stroke={2} />
                    <Text fw={800} size="lg">
                      ONE TOUCH AI Assistant
                    </Text>
                  </Group>
                  <Text size="xs" c="rgba(255,255,255,0.7)">
                    Available 24/7
                  </Text>
                </Stack>
              </Group>
              <Badge size="lg" style={{ background: 'rgba(255,255,255,0.2)', color: 'white' }}>
                Always Online
              </Badge>
            </Group>
          </Container>
        </Box>

        {/* Chat Container */}
        <Container size="sm" py={40} px={{ base: 'md', sm: 'lg' }}>
          <Paper
            p="xl"
            radius={20}
            className="fade-in"
            style={{
              background: 'white',
              border: `1px solid #E9ECEF`,
              boxShadow: '0 4px 24px rgba(0,0,137,0.08)',
              display: 'flex',
              flexDirection: 'column',
              height: '70vh',
              maxHeight: '600px',
            }}
          >
            {/* Messages Area */}
            <ScrollArea style={{ flex: 1, marginBottom: '20px' }} scrollbarSize={6}>
              <Stack gap="md" p="md">
                {messages.map((msg, i) => (
                  <Group
                    key={msg.id}
                    justify={msg.sender === 'user' ? 'flex-end' : 'flex-start'}
                    align="flex-end"
                    gap="sm"
                    className="msg-item"
                    style={{ animationDelay: `${i * 0.1}s` }}
                  >
                    {msg.sender === 'bot' && (
                      <Avatar
                        size={32}
                        radius="xl"
                        style={{
                          background: `linear-gradient(135deg, ${COLORS.tealBlue} 0%, ${COLORS.navyBlue} 100%)`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'white',
                        }}
                      >
                        <IconRobot size={16} />
                      </Avatar>
                    )}
                    <Paper
                      p="md"
                      radius={16}
                      style={{
                        background: msg.sender === 'user' ? COLORS.tealBlue : '#F5F6F7',
                        color: msg.sender === 'user' ? 'white' : COLORS.navyBlue,
                        maxWidth: '70%',
                        wordWrap: 'break-word',
                      }}
                    >
                      <Text size="sm" lh={1.6}>
                        {msg.text}
                      </Text>
                      <Text
                        size="xs"
                        style={{
                          color: msg.sender === 'user' ? 'rgba(255,255,255,0.6)' : '#999',
                          marginTop: '6px',
                        }}
                      >
                        {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                    </Paper>
                  </Group>
                ))}
                {isLoading && (
                  <Group justify="flex-start" align="flex-end" gap="sm">
                    <Avatar
                      size={32}
                      radius="xl"
                      style={{
                        background: `linear-gradient(135deg, ${COLORS.tealBlue} 0%, ${COLORS.navyBlue} 100%)`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                      }}
                    >
                      <IconRobot size={16} />
                    </Avatar>
                    <Paper p="md" radius={16} style={{ background: '#F5F6F7' }}>
                      <Group gap="xs">
                        <Box style={{ width: 8, height: 8, borderRadius: '50%', background: COLORS.tealBlue, animation: 'pulse 1.4s infinite' }} />
                        <Box style={{ width: 8, height: 8, borderRadius: '50%', background: COLORS.tealBlue, animation: 'pulse 1.4s infinite 0.2s' }} />
                        <Box style={{ width: 8, height: 8, borderRadius: '50%', background: COLORS.tealBlue, animation: 'pulse 1.4s infinite 0.4s' }} />
                      </Group>
                    </Paper>
                  </Group>
                )}
              </Stack>
            </ScrollArea>

            {/* Input Area */}
            <Group gap="sm" wrap="nowrap">
              <TextInput
                placeholder="Ask me anything..."
                style={{ flex: 1 }}
                value={inputValue}
                onChange={(e) => setInputValue(e.currentTarget.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSendMessage();
                }}
                styles={{
                  input: {
                    borderRadius: '20px',
                    borderColor: '#E9ECEF',
                    paddingRight: '16px',
                  },
                }}
              />
              <Button
                size="md"
                style={{
                  background: COLORS.tealBlue,
                  color: 'white',
                  borderRadius: '50%',
                  width: '44px',
                  height: '44px',
                  padding: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.18s',
                  cursor: inputValue.trim() ? 'pointer' : 'not-allowed',
                  opacity: inputValue.trim() ? 1 : 0.6,
                }}
                onClick={handleSendMessage}
                disabled={!inputValue.trim() || isLoading}
              >
                <IconSend size={18} stroke={2} />
              </Button>
            </Group>
          </Paper>

          {/* Quick Actions */}
          <Stack gap="md" mt="xl" align="center">
            <Text size="sm" c="dimmed" ta="center">
              Frequently asked questions
            </Text>
            <Group gap="sm" wrap="wrap" justify="center">
              {[
                'How do I register?',
                'What are service fees?',
                'How does booking work?',
                'Provider benefits?',
              ].map((q) => (
                <Paper
                  key={q}
                  p="sm"
                  px="md"
                  radius={20}
                  style={{
                    background: '#F5F6F7',
                    cursor: 'pointer',
                    transition: 'all 0.18s',
                    border: `1px solid #E9ECEF`,
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.background = COLORS.tealBlue + '10';
                    (e.currentTarget as HTMLElement).style.borderColor = COLORS.tealBlue;
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.background = '#F5F6F7';
                    (e.currentTarget as HTMLElement).style.borderColor = '#E9ECEF';
                  }}
                  onClick={() => setInputValue(q)}
                >
                  <Text size="xs" fw={500} c={COLORS.navyBlue}>
                    {q}
                  </Text>
                </Paper>
              ))}
            </Group>
          </Stack>
        </Container>
      </Box>
    </>
  );
}
