// Shared API helper for talking to the AWS API Gateway backend
// Exposes: submitCode, generateHint, fetchNextQuestion
import { getIdToken } from './auth';

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
    // If we can't parse JSON, try to get text response
    const text = await response.text().catch(() => 'No response body');
    throw new Error(`Failed to parse JSON response: ${e.message}. Response body: ${text}`);
  }

  if (!response.ok) {
    const message =
      data?.error?.message ||
      data?.message ||
      data?.error ||
      `Request failed with status ${response.status}`;
    const error = new Error(message);
    error.response = response;
    error.data = data;
    error.status = response.status;
    // Log full error details for debugging
    console.error('API Error:', {
      status: response.status,
      statusText: response.statusText,
      url: response.url,
      errorData: data,
    });
    throw error;
  }

  return data;
};

// Build headers with optional Authorization from Cognito ID token
const buildAuthHeaders = async (baseHeaders = {}) => {
  try {
    const idToken = await getIdToken();
    if (idToken) {
      return {
        ...baseHeaders,
        Authorization: `Bearer ${idToken}`,
      };
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('Could not get ID token for request, sending without Authorization', err);
  }
  return baseHeaders;
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

  const headers = await buildAuthHeaders({
    'Content-Type': 'application/json',
  });

  const response = await fetch(buildUrl('/submit'), {
    method: 'POST',
    headers,
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

  const headers = await buildAuthHeaders({
    'Content-Type': 'application/json',
  });

  const response = await fetch(buildUrl('/hint'), {
    method: 'POST',
    headers,
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
 * GET /questions?userId={userId}&topic={topic}&difficulty={difficulty}
 * 
 * Query parameters:
 * - userId: string (required) - Cognito sub (unique user identifier)
 * - topic: string | null (optional) - Topic filter, null means AI decides
 * - difficulty: string | null (optional) - Difficulty filter, null means AI decides
 *
 * Response:
 * {
 *   id: string,
 *   title: string,
 *   difficulty: string,
 *   topic: string,
 *   description: string,       // Full question description
 *   template: {                 // Starter code templates for each language
 *     python: string,
 *     cpp: string
 *   },
 *   examples: array,
 *   constraints: array,
 *   hints: array,
 *   ai_reasoning?: string      // Optional explanation if AI made the choice
 * }
 */
export const fetchNextQuestion = async ({ userId, topic = null, difficulty = null }) => {
  // Build query string
  const params = new URLSearchParams({
    userId: userId,
  });
  
  // Only append topic/difficulty if they have truthy values (not null, not empty string)
  if (topic && topic.trim()) {
    params.append('topic', topic.trim());
  }
  
  if (difficulty && difficulty.trim()) {
    params.append('difficulty', difficulty.trim());
  }

  const headers = await buildAuthHeaders({
    'Content-Type': 'application/json',
  });

  const url = `${buildUrl('/questions')}?${params.toString()}`;
  console.log('Fetching question from:', url);
  console.log('Request params:', { userId, topic, difficulty });

  const response = await fetch(url, {
    method: 'GET',
    headers,
  });

  console.log('Response received, status:', response.status);
  
  // Get raw response text first to see what we're actually receiving
  let responseText;
  try {
    responseText = await response.clone().text();
    console.log('=== RAW API RESPONSE ===');
    console.log('Response status:', response.status);
    console.log('Response statusText:', response.statusText);
    console.log('Raw response text length:', responseText?.length);
    console.log('Raw response text (first 500 chars):', responseText?.substring(0, 500));
    
    // Try to parse it manually to see the structure
    try {
      const parsedResponse = JSON.parse(responseText);
      console.log('Parsed response keys:', Object.keys(parsedResponse));
      console.log('Template in parsed response:', parsedResponse.template);
      if (parsedResponse.template) {
        console.log('Template keys:', Object.keys(parsedResponse.template));
        console.log('Python template exists:', !!parsedResponse.template.python);
        console.log('C++ template exists:', !!parsedResponse.template.cpp);
        if (parsedResponse.template.python) {
          console.log('Python template (first 200 chars):', parsedResponse.template.python.substring(0, 200));
          console.log('Python template length:', parsedResponse.template.python.length);
        }
        if (parsedResponse.template.cpp) {
          console.log('C++ template (first 200 chars):', parsedResponse.template.cpp.substring(0, 200));
          console.log('C++ template length:', parsedResponse.template.cpp.length);
        }
        console.log('Are templates equal in raw response?', parsedResponse.template.python === parsedResponse.template.cpp);
        console.log('Template comparison details:', {
          pythonLength: parsedResponse.template.python?.length,
          cppLength: parsedResponse.template.cpp?.length,
          areEqual: parsedResponse.template.python === parsedResponse.template.cpp,
          pythonStartsWith: parsedResponse.template.python?.substring(0, 50),
          cppStartsWith: parsedResponse.template.cpp?.substring(0, 50)
        });
      } else {
        console.log('WARNING: No template object in response!');
      }
    } catch (e) {
      console.error('Failed to parse response as JSON:', e);
      console.error('Response text that failed to parse:', responseText);
    }
    console.log('========================');
  } catch (e) {
    console.error('Error reading response text:', e);
  }
  
  const data = await handleResponse(response);
  
  // Debug logging to check template data from API
  console.log('=== PARSED API RESPONSE DEBUG ===');
  console.log('Full parsed data:', JSON.stringify(data, null, 2));
  console.log('Template object:', data.template);
  console.log('Template type:', typeof data.template);
  console.log('Is template an object?', typeof data.template === 'object' && data.template !== null);
  console.log('Template keys:', data.template ? Object.keys(data.template) : 'N/A');
  console.log('Python template exists:', !!data.template?.python);
  console.log('C++ template exists:', !!data.template?.cpp);
  if (data.template?.python) {
    console.log('Python template (first 200 chars):', data.template.python.substring(0, 200));
    console.log('Python template length:', data.template.python.length);
  }
  if (data.template?.cpp) {
    console.log('C++ template (first 200 chars):', data.template.cpp.substring(0, 200));
    console.log('C++ template length:', data.template.cpp.length);
  }
  console.log('Are templates equal?', data.template?.python === data.template?.cpp);
  console.log('Are templates same reference?', data.template?.python === data.template?.cpp);
  console.log('==================================');
  
  // Normalize examples to ensure input/output are always strings
  const normalizeExamples = (examples) => {
    if (!Array.isArray(examples)) return [];
    return examples.map(example => {
      const normalized = { ...example };
      // Ensure input is a string
      if (normalized.input && typeof normalized.input !== 'string') {
        normalized.input = typeof normalized.input === 'object'
          ? JSON.stringify(normalized.input, null, 2)
          : String(normalized.input);
      }
      // Ensure output is a string
      if (normalized.output && typeof normalized.output !== 'string') {
        normalized.output = typeof normalized.output === 'object'
          ? JSON.stringify(normalized.output, null, 2)
          : String(normalized.output);
      }
      return normalized;
    });
  };
  
  // Transform the response to match the expected question format
  return {
    id: data.id?.toString(),
    title: data.title,
    difficulty: data.difficulty || 'Easy',
    topic: data.topic,
    description: data.description,
    template: data.template || { python: '', cpp: '' },
    aiReasoning: data.ai_reasoning,
    examples: normalizeExamples(data.examples),
    constraints: data.constraints || [],
    hints: data.hints || [],
  };
};


