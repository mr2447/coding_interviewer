// Shared API helper for talking to the AWS API Gateway backend
// Exposes: submitCode, generateHint, fetchQuestion

const API_BASE_URL = import.meta.env.VITE_API_GATEWAY_URL;

if (!API_BASE_URL) {
  // This will show up in the browser console if the env var isn't set
  // but won't break the build.
  // eslint-disable-next-line no-console
  console.warn(
    'VITE_API_GATEWAY_URL is not set. Backend API calls will fail until this is configured.'
  );
}

const buildUrl = (path) => {
  if (!API_BASE_URL) {
    throw new Error('API base URL is not configured (VITE_API_GATEWAY_URL).');
  }
  return `${API_BASE_URL}${path}`;
};

const handleResponse = async (response) => {
  let data;
  try {
    data = await response.json();
  } catch (e) {
    throw new Error(`Failed to parse JSON response: ${e.message}`);
  }

  if (!response.ok) {
    const message =
      data?.error?.message ||
      data?.message ||
      `Request failed with status ${response.status}`;
    const error = new Error(message);
    error.response = response;
    error.data = data;
    throw error;
  }

  return data;
};

/**
 * Submit code for evaluation.
 * Expects backend Lambda to return:
 * { success: boolean, testResults?: {...}, error?: {...} }
 */
export const submitCode = async ({ code, questionId, language, userId }) => {
  const payload = {
    code,
    questionId,
    language,
    timestamp: new Date().toISOString(),
    userId,
  };

  const response = await fetch(buildUrl('/submit'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // In the future, attach Authorization: Bearer <token> from Cognito here
    },
    body: JSON.stringify(payload),
  });

  return handleResponse(response);
};

/**
 * Generate an AI hint for the current question and code.
 *
 * Request body (to backend Lambda):
 * {
 *   code: string,
 *   questionId: number | string,
 *   questionPrompt: string,
 *   conversationId: string, // used by backend/OpenAI to maintain chat state
 *   // userId should be derived from Cognito JWT on backend, not sent here
 * }
 *
 * Expects backend Lambda to return:
 * { success: boolean, hint?: string, error?: {...} }
 * Returns an object shaped like a chat message: { role, content }.
 */
export const generateHint = async ({
  code,
  questionId,
  questionPrompt,
  conversationId,
}) => {
  const payload = {
    code,
    questionId,
    questionPrompt,
    conversationId,
  };

  const response = await fetch(buildUrl('/hints'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // Authorization header will be added here when Cognito is wired in
    },
    body: JSON.stringify(payload),
  });

  const data = await handleResponse(response);

  if (!data.success || !data.hint) {
    const message =
      data?.error?.message || 'Hint generation failed without a hint message.';
    throw new Error(message);
  }

  return {
    role: 'assistant',
    content: data.hint,
  };
};

/**
 * Fetch coding questions from the backend.
 *
 * Supported patterns:
 *   GET /questions?random=true
 *   GET /questions?random=true&topicId=arrays&difficulty=easy
 *
 * User identity should come from Cognito (JWT), not from query params.
 */
export const fetchQuestion = async ({
  random = true,
  topicId,
  difficulty,
} = {}) => {
  const params = new URLSearchParams();
  if (random) params.set('random', 'true');
  if (topicId) params.set('topicId', topicId);
  if (difficulty) params.set('difficulty', difficulty);

  const query = params.toString();
  const url = query ? `${buildUrl('/questions')}?${query}` : buildUrl('/questions');

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  return handleResponse(response);
};


