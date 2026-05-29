import { createConversation, getMessages } from '../memory/store.js';

const sessions = new Map();

export function getSession(chatId) {
  if (!sessions.has(chatId)) {
    sessions.set(chatId, {
      conversationId: null,
      status: 'idle', // 'idle', 'running', 'stopped'
      abortController: null,
      history: [],
      bootstrapped: false,
      systemContext: ''
    });
  }
  return sessions.get(chatId);
}

export function startSession(chatId) {
  const session = getSession(chatId);
  if (!session.conversationId) {
    const conv = createConversation('Telegram Session');
    session.conversationId = conv.id;
  }
  session.status = 'running';
  session.abortController = new AbortController();
  return session;
}

export function stopSession(chatId) {
  const session = getSession(chatId);
  if (session.abortController) {
    session.abortController.abort();
    session.abortController = null;
  }
  session.status = 'stopped';
  return session;
}

export function resetSession(chatId) {
    sessions.set(chatId, {
      conversationId: null,
      status: 'idle',
      abortController: null,
      history: [],
      bootstrapped: false,
      systemContext: ''
    });
}

export function markSessionBootstrapped(chatId, systemContext) {
  const session = getSession(chatId);
  session.bootstrapped = true;
  session.systemContext = systemContext;
}

export function getHistory(chatId) {
  const session = getSession(chatId);
  if (!session.conversationId) return [];
  return getMessages(session.conversationId);
}

let _activeSession = null;

export function setActiveTelegramSession(bot, chatId) {
  _activeSession = { bot, chatId };
}

export function getActiveTelegramSession() {
  return _activeSession;
}

export function clearActiveTelegramSession() {
  _activeSession = null;
}
