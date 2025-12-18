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

// ============================================================================
// Sticky Session Functions - Complete session state management
// ============================================================================

const STICKY_SESSION_PREFIX = 'sticky_session_';

/**
 * Save complete sticky session state for a question
 * @param {string} userId - User identifier
 * @param {string} questionId - Question identifier
 * @param {object} sessionState - Complete session state
 */
export const saveStickySession = (userId, questionId, sessionState) => {
  if (!userId || !questionId || !canUseStorage()) return;
  try {
    const key = `${STICKY_SESSION_PREFIX}${userId}_${questionId}`;
    window.localStorage.setItem(key, JSON.stringify(sessionState));
  } catch (err) {
    console.warn('Failed to save sticky session:', err);
  }
};

/**
 * Load complete sticky session state for a question
 * @param {string} userId - User identifier
 * @param {string} questionId - Question identifier
 * @returns {object|null} Session state or null
 */
export const loadStickySession = (userId, questionId) => {
  if (!userId || !questionId || !canUseStorage()) return null;
  try {
    const key = `${STICKY_SESSION_PREFIX}${userId}_${questionId}`;
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    console.warn('Failed to load sticky session:', err);
    return null;
  }
};

/**
 * Clear sticky session for a specific question
 * @param {string} userId - User identifier
 * @param {string} questionId - Question identifier
 */
export const clearStickySession = (userId, questionId) => {
  if (!userId || !questionId || !canUseStorage()) return;
  try {
    const key = `${STICKY_SESSION_PREFIX}${userId}_${questionId}`;
    window.localStorage.removeItem(key);
  } catch (err) {
    console.warn('Failed to clear sticky session:', err);
  }
};

/**
 * Clear all sticky sessions for a user
 * @param {string} userId - User identifier
 */
export const clearAllUserStickySessions = (userId) => {
  if (!userId || !canUseStorage()) return;
  try {
    const keysToRemove = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (key && key.startsWith(`${STICKY_SESSION_PREFIX}${userId}_`)) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => window.localStorage.removeItem(key));
    console.log(`Cleared ${keysToRemove.length} sticky sessions for user ${userId}`);
  } catch (err) {
    console.warn('Failed to clear all user sticky sessions:', err);
  }
};

/**
 * Update specific fields in sticky session (partial update)
 * @param {string} userId - User identifier
 * @param {string} questionId - Question identifier
 * @param {object} partialState - Fields to update
 */
export const updateStickySession = (userId, questionId, partialState) => {
  if (!userId || !questionId || !canUseStorage()) return;
  try {
    const existing = loadStickySession(userId, questionId) || {};
    const updated = { ...existing, ...partialState };
    saveStickySession(userId, questionId, updated);
  } catch (err) {
    console.warn('Failed to update sticky session:', err);
  }
};