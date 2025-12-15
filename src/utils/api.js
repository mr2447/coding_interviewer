// Shared API helper for talking to the AWS API Gateway backend
// Exposes: submitCode, generateHint, fetchNextQuestion

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
      // attach Authorization: Bearer <token> from Cognito here
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
 *   userId: string,             // Cognito sub (unique user identifier)
 *   qid: number,
 *   thread_id: string | null,  // From localStorage, null if first hint
 *   user_code: string,          // Current code in Monaco
 *   test_results_summary: object | null,  // From test execution, null if not run
 *   question_desc: string | null  // Full text only if thread_id is null
 * }
 *
 * Expects backend Lambda to return:
 * { hint: string, thread_id: string }
 * Returns an object shaped like a chat message: { role, content, thread_id }.
 */
export const generateHint = async ({
  userId,
  qid,
  threadId,
  userCode,
  testResultsSummary,
  questionDesc,
}) => {
  const payload = {
    userId: userId,
    qid: qid,
    thread_id: threadId || null,
    user_code: userCode,
    test_results_summary: testResultsSummary || null,
    question_desc: questionDesc || null,
  };

  const response = await fetch(buildUrl('/hint'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // Authorization header will be added here when Cognito is wired in
    },
    body: JSON.stringify(payload),
  });

  const data = await handleResponse(response);

  if (!data.hint) {
    throw new Error('Hint generation failed: no hint returned.');
  }

  return {
    role: 'assistant',
    content: data.hint,
    threadId: data.thread_id, // Frontend must save this to localStorage
  };
};

/**
 * Get the next question based on user preferences.
 *
 * POST /question/next
 * 
 * Request body:
 * {
 *   userId: string,            // Cognito sub (unique user identifier)
 *   topic: string | null,      // Optional, null means AI decides
 *   difficulty: string | null  // Optional, null means AI decides
 * }
 *
 * Response:
 * {
 *   qid: number | string,
 *   q_name: string,
 *   difficulty: string,
 *   topic: string,
 *   content: string,           // Full markdown content
 *   template: string,          // Starter code
 *   ai_reasoning?: string      // Optional explanation if AI made the choice
 * }
 */
export const fetchNextQuestion = async ({ userId, topic = null, difficulty = null }) => {
  const payload = {
    userId: userId,
    topic: topic || null,
    difficulty: difficulty || null,
  };

  const response = await fetch(buildUrl('/question/next'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // Authorization header will be added here when Cognito is wired in
    },
    body: JSON.stringify(payload),
  });

  const data = await handleResponse(response);
  
  // Transform the response to match the expected question format
  // If the backend returns different field names, adjust this mapping
  return {
    id: data.qid?.toString() || data.id?.toString(),
    title: data.q_name || data.title,
    difficulty: data.difficulty || 'Easy',
    topic: data.topic,
    description: data.content || data.description,
    template: data.template,
    aiReasoning: data.ai_reasoning,
    // Provide defaults for fields that might not be in the response
    examples: data.examples || [],
    constraints: data.constraints || [],
    hints: data.hints || [],
  };
};


