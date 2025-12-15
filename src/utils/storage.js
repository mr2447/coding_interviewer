// src/utils/storage.js

const INTERVIEW_PREFIX = 'interview_state_';
const CHATBOT_PREFIX = 'chatbot_hints_';

// Safely access localStorage (in case of SSR or browser issues)
const canUseStorage = () =>
  typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

export const saveQuestionState = (questionId, partialState) => {
  if (!questionId || !canUseStorage()) return;
  try {
    const key = `${INTERVIEW_PREFIX}${questionId}`;
    const existingRaw = window.localStorage.getItem(key);
    const existing = existingRaw ? JSON.parse(existingRaw) : {};
    const next = { ...existing, ...partialState };
    window.localStorage.setItem(key, JSON.stringify(next));
  } catch (err) {
    console.warn('Failed to save question state:', err);
  }
};

export const loadQuestionState = (questionId) => {
  if (!questionId || !canUseStorage()) return null;
  try {
    const key = `${INTERVIEW_PREFIX}${questionId}`;
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    console.warn('Failed to load question state:', err);
    return null;
  }
};

export const clearQuestionState = (questionId) => {
  if (!questionId || !canUseStorage()) return;
  try {
    const key = `${INTERVIEW_PREFIX}${questionId}`;
    window.localStorage.removeItem(key);
  } catch (err) {
    console.warn('Failed to clear question state:', err);
  }
};

export const saveChatbotHints = (questionId, hints) => {
  if (!questionId || !canUseStorage()) return;
  try {
    const key = `${CHATBOT_PREFIX}${questionId}`;
    window.localStorage.setItem(key, JSON.stringify(hints || []));
  } catch (err) {
    console.warn('Failed to save chatbot hints:', err);
  }
};

export const loadChatbotHints = (questionId) => {
  if (!questionId || !canUseStorage()) return [];
  try {
    const key = `${CHATBOT_PREFIX}${questionId}`;
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.warn('Failed to load chatbot hints:', err);
    return [];
  }
};

export const clearChatbotHints = (questionId) => {
  if (!questionId || !canUseStorage()) return;
  try {
    const key = `${CHATBOT_PREFIX}${questionId}`;
    window.localStorage.removeItem(key);
  } catch (err) {
    console.warn('Failed to clear chatbot hints:', err);
  }
};