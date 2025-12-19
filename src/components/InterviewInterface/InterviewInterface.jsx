import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../Layout/Layout';
import QuestionPanel from '../QuestionPanel/QuestionPanel';
import CodeEditor from '../CodeEditor/CodeEditor';
import ChatBot from '../ChatBot/ChatBot';
import TestResults from '../TestResults/TestResults';
import QuestionSelectionForm from '../QuestionSelectionForm/QuestionSelectionForm';
import { submitCode, fetchNextQuestion } from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';
import { getWebSocketClient } from '../../utils/websocket';
import '../../App.css';
import {
  saveQuestionState,
  loadQuestionState,
  saveStickySession,
  loadStickySession,
  clearStickySession,
  clearAllUserStickySessions,
  updateStickySession,
} from '../../utils/storage';
import {useEffect} from 'react';

// Utility function to parse escape sequences from database strings
// Converts literal \n strings to actual newlines for Monaco editor
const parseEscapeSequences = (str) => {
  if (!str || typeof str !== 'string') return str;
  try {
    // Use JSON.parse to properly handle escape sequences like \n, \t, etc.
    return JSON.parse('"' + str.replace(/"/g, '\\"') + '"');
  } catch (e) {
    // Fallback: manually replace common escape sequences
    return str
      .replace(/\\n/g, '\n')
      .replace(/\\t/g, '\t')
      .replace(/\\r/g, '\r')
      .replace(/\\\\/g, '\\');
  }
};

function InterviewInterface() {
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [code, setCode] = useState('');
  const [language, setLanguage] = useState('python');
  const [templates, setTemplates] = useState({ python: '', cpp: '' });
  const [submissionStatus, setSubmissionStatus] = useState(null);
  const [showQuestionForm, setShowQuestionForm] = useState(false);
  const [isLoadingQuestion, setIsLoadingQuestion] = useState(false);
  const [questionError, setQuestionError] = useState(null);
  const [testResultsSummary, setTestResultsSummary] = useState(null);
  const [testResults, setTestResults] = useState(null);
  const chatBotResetKey = useRef(0);
  const wsClientRef = useRef(null);
  const pendingSubmissionRef = useRef(null); // Track pending submission to match with WebSocket results
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  
  // Get userName and userId from authenticated user
  // userId is the Cognito sub (unique identifier), userName is for display/API
  const userName = user?.username || user?.email || 'demo-user';
  const userId = user?.userId || user?.username || user?.email || 'demo-user';
  
  // Transform testResults from submitCode response to test_results_summary format
  const transformTestResults = (testResults) => {
    if (!testResults || !testResults.tests) {
      return null;
    }
    
    const failedTest = testResults.tests.find(test => test.status === 'failed');
    const allPassed = testResults.passed === testResults.total;
    
    if (allPassed) {
      return {
        status: 'Passed',
        first_failed_test: null,
      };
    }
    
    // If we have a failed test, extract details
    // Note: The current API may not provide input/expected/actual in the exact format,
    // so we'll use what's available (error message) and structure it appropriately
    return {
      status: 'Failed',
      first_failed_test: failedTest ? {
        input: (failedTest.input && typeof failedTest.input === 'object') 
          ? JSON.stringify(failedTest.input, null, 2) 
          : (failedTest.input || 'N/A'),
        expected: failedTest.expected || 'N/A',
        actual: failedTest.actual || failedTest.error || 'N/A',
      } : null,
    };
  };

  // Transform new test results format (from WebSocket) to component-expected format
  const transformWebSocketTestResults = (testResults) => {
    if (!testResults) {
      return null;
    }

    // Check if it's already in the expected format (has tests array)
    if (testResults.tests && Array.isArray(testResults.tests)) {
      // Ensure passed and total are defined
      return {
        ...testResults,
        passed: testResults.passed ?? (testResults.tests.filter(t => t.status === 'passed').length),
        total: testResults.total ?? testResults.tests.length,
      };
    }

    // Transform from new format: { success, failed_case, output, expected_output }
    const success = testResults.success === true;
    const failedCase = testResults.failed_case || 0;
    
    console.log('transformWebSocketTestResults - input:', {
      success,
      failedCase,
      hasOutput: testResults.output !== undefined,
      hasExpectedOutput: testResults.expected_output !== undefined,
      output: testResults.output,
      expected_output: testResults.expected_output
    });
    
    // If we have output and expected_output, create a test structure
    if (testResults.output !== undefined || testResults.expected_output !== undefined) {
      const tests = [];
      
      // Create a failed test entry if there's a failure
      // Also create if we have output/expected_output even if failedCase is 0 (edge case)
      if (!success) {
        // Ensure output is always a string (handle null, undefined, empty string)
        // Empty string is valid output, so we preserve it
        const outputStr = testResults.output !== undefined && testResults.output !== null 
          ? String(testResults.output) 
          : (testResults.actual !== undefined && testResults.actual !== null 
              ? String(testResults.actual) 
              : 'N/A');
        
        // Handle nested input structure: input.input contains the actual input data
        let inputValue = 'N/A';
        if (testResults.input) {
          try {
            if (typeof testResults.input === 'object' && testResults.input !== null) {
              // If input is an object with nested 'input' key, extract it
              if (testResults.input.input !== undefined && testResults.input.input !== null) {
                // Format the input object nicely (e.g., {nums: [1,2,3], target: 5})
                inputValue = JSON.stringify(testResults.input.input, null, 2);
              } else {
                // If it's already the input data, stringify it
                inputValue = JSON.stringify(testResults.input, null, 2);
              }
            } else {
              // If input is already a string, use it directly
              inputValue = String(testResults.input);
            }
          } catch (e) {
            console.error('Error processing input:', e, testResults.input);
            inputValue = String(testResults.input);
          }
        }
        
        const testEntry = {
          status: 'failed',
          input: inputValue,
          expected: testResults.expected_output || testResults.expected || 'N/A',
          actual: outputStr,
          error: testResults.error || null,
        };
        
        console.log('transformWebSocketTestResults - created test entry:', testEntry);
        tests.push(testEntry);
      }
      
      // Calculate passed tests: failed_case - 1 (since failed_case is 1-indexed)
      // If failed_case is 1, then 0 tests passed (1-1=0)
      // If failed_case is 2, then 1 test passed (2-1=1)
      const passed = failedCase > 0 ? Math.max(0, failedCase - 1) : 0;
      // Total is the failed_case (since that's the test number that failed)
      const total = success ? 1 : Math.max(1, failedCase || 1);
      
      const result = {
        success,
        passed: Number(passed),
        total: Number(total),
        tests,
        runtime: testResults.runtime || null,
      };
      
      console.log('transformWebSocketTestResults - output:', result);
      return result;
    }

    // Fallback: return minimal structure
    return {
      success,
      passed: success ? 1 : 0,
      total: 1,
      tests: [],
    };
  };

  // Restore sticky session on mount if question exists (handles page refresh)
  useEffect(() => {
    if (!userId) return;
    
    // Try to restore last active question from sticky session
    const lastQuestionId = window.localStorage.getItem(`last_question_${userId}`);
    if (lastQuestionId && !currentQuestion) {
      // Optionally restore the last question, but for now we'll just clear the marker
      // and let user start fresh or select new question
      window.localStorage.removeItem(`last_question_${userId}`);
    }
  }, [userId, currentQuestion]);

  // Auto-save code to sticky session (debounced)
  useEffect(() => {
    if (!currentQuestion?.id || !userId || !code) return;
    
    const timeoutId = setTimeout(() => {
      const session = loadStickySession(userId, currentQuestion.id) || {};
      updateStickySession(userId, currentQuestion.id, {
        code: {
          ...(session.code || {}),
          [language]: code
        }
      });
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [code, language, currentQuestion?.id, userId]);

  // Auto-save language preference
  useEffect(() => {
    if (!currentQuestion?.id || !userId) return;
    updateStickySession(userId, currentQuestion.id, { language });
  }, [language, currentQuestion?.id, userId]);

  // Auto-save test results
  useEffect(() => {
    if (!currentQuestion?.id || !userId) return;
    if (testResults) {
      const passStatus = testResults.success || 
                        (testResults.passed === testResults.total && testResults.total > 0) 
                        ? 'passed' : 'failed';
      
      updateStickySession(userId, currentQuestion.id, {
        testResults,
        testResultsSummary,
        passStatus
      });
    }
  }, [testResults, testResultsSummary, currentQuestion?.id, userId]);

  // Initialize WebSocket connection when component mounts
  useEffect(() => {
    const wsClient = getWebSocketClient();
    wsClientRef.current = wsClient;

    // Connect to WebSocket using userId (Cognito sub) for reliable identification
    if (userId) {
      wsClient.connect(userId).catch((error) => {
        console.error('Failed to connect WebSocket:', error);
        // Don't block UI if WebSocket fails - user can still submit code
      });
    }

    // Listen for result messages
    const unsubscribeResult = wsClient.on('result', (message) => {
      console.log('Received result via WebSocket:', message);
      
      // Handle test results
      if (message.testResults || message.Results) {
        let rawTestResults = message.testResults || JSON.parse(message.Results || '{}');
        console.log('Raw testResults from WebSocket:', rawTestResults);
        
        // Transform to component-expected format
        const transformedResults = transformWebSocketTestResults(rawTestResults);
        console.log('Transformed results:', transformedResults);
        
        // Ensure all test entries have string inputs (defensive check)
        if (transformedResults && transformedResults.tests) {
          transformedResults.tests = transformedResults.tests.map(test => {
            if (test.input && typeof test.input === 'object') {
              test.input = JSON.stringify(test.input, null, 2);
            }
            return test;
          });
        }
        
        const summary = transformTestResults(transformedResults);
        console.log('Test results summary:', summary);
        
        setTestResultsSummary(summary);
        setTestResults(transformedResults); // Store transformed test results for display

        // Update submission status based on results
        const isSuccess = transformedResults?.success || 
                         (transformedResults?.passed === transformedResults?.total && transformedResults?.total > 0);
        
        if (isSuccess) {
          setSubmissionStatus('success');
          // Clear success status after 2 seconds for visual feedback
          setTimeout(() => setSubmissionStatus(null), 2000);
        } else {
          setSubmissionStatus('error');
          setTimeout(() => setSubmissionStatus(null), 3000);
        }
      } else if (message.success !== undefined) {
        // Handle simple success/failure message
        if (message.success) {
          setSubmissionStatus('success');
          // Clear success status after 2 seconds for visual feedback
          setTimeout(() => setSubmissionStatus(null), 2000);
        } else {
          setSubmissionStatus('error');
          setTimeout(() => setSubmissionStatus(null), 3000);
        }
      }
      
      // Clear pending submission
      pendingSubmissionRef.current = null;
    });

    // Cleanup on unmount
    return () => {
      unsubscribeResult();
      wsClient.disconnect();
    };
    }, [userId]);

  const handleLogout = async () => {
    // Disconnect WebSocket before logout
    if (wsClientRef.current) {
      wsClientRef.current.disconnect();
    }
    
    // Clear all sticky sessions on logout
    if (userId) {
      clearAllUserStickySessions(userId);
      window.localStorage.removeItem(`last_question_${userId}`);
    }
    
    await logout();
    navigate('/');
  };

  // Function to load a new question based on user preferences
  const loadNewQuestion = async (preferences = null) => {
    // Clear current question's sticky session before loading new one
    if (currentQuestion?.id && userId) {
      clearStickySession(userId, currentQuestion.id);
    }
    
    setIsLoadingQuestion(true);
    setQuestionError(null);
    chatBotResetKey.current += 1; // Reset chatbot (will load fresh state)
    setSubmissionStatus(null);
    setTestResultsSummary(null);
    setTestResults(null);
    setShowQuestionForm(false);

    try {
      const question = await fetchNextQuestion({
        userId: userId, // Use Cognito sub as userId
        topic: preferences?.topic || null,
        difficulty: preferences?.difficulty || null,
      });
      
      setCurrentQuestion(question);
      
      // Store templates (parse escape sequences from database)
      let pythonTemplate = '';
      let cppTemplate = '';
      
      if (question.template && typeof question.template === 'object') {
        pythonTemplate = parseEscapeSequences(question.template.python || '');
        cppTemplate = parseEscapeSequences(question.template.cpp || '');
        
        // Debug logging to identify the issue
        console.log('Question templates received:', {
          questionId: question.id,
          questionTitle: question.title,
          rawTemplate: question.template,
          pythonLength: pythonTemplate.length,
          cppLength: cppTemplate.length,
          pythonPreview: pythonTemplate.substring(0, 100),
          cppPreview: cppTemplate.substring(0, 100),
          areEqual: pythonTemplate === cppTemplate
        });
        
        setTemplates({
          python: pythonTemplate,
          cpp: cppTemplate,
        });
      } else {
        setTemplates({ python: '', cpp: '' });
      }
      
      // Try to load sticky session for this question
      const session = loadStickySession(userId, question.id);
      
      if (session) {
        // Restore from sticky session
        const sessionLanguage = session.language || 'python';
        // Use the parsed templates we just created, not the raw question.template
        const parsedTemplates = {
          python: pythonTemplate,
          cpp: cppTemplate
        };
        
        // Don't parse code from localStorage - JSON.parse already handled it
        // Use the parsed templates state instead of raw question.template
        setCode(session.code?.[sessionLanguage] || 
                parsedTemplates[sessionLanguage] || 
                parsedTemplates['python'] || 
                '');
        setLanguage(sessionLanguage);
        setTestResults(session.testResults || null);
        setTestResultsSummary(session.testResultsSummary || null);
        // Hints and threadId will be restored by ChatBot component
      } else {
        // New question - start fresh with parsed template
        // Use the parsed templates we just created
        const initialLanguage = 'python';
        setCode(pythonTemplate || '');
        setLanguage(initialLanguage);
        setTestResults(null);
        setTestResultsSummary(null);
      }
      
      // Mark this as the last active question
      window.localStorage.setItem(`last_question_${userId}`, question.id);
    } catch (error) {
      console.error('Failed to fetch question from API:', error);
      setQuestionError(error.message || 'Failed to fetch question. Please try again.');
      setShowQuestionForm(true);
    } finally {
      setIsLoadingQuestion(false);
    }
  };

  const handleQuestionFormSubmit = (preferences) => {
    loadNewQuestion(preferences);
  };

  const handleStartInterview = () => {
    setShowQuestionForm(true);
  };

  const handleNextQuestion = () => {
    setShowQuestionForm(true);
  };

  const handleCodeChange = (newCode) => {
    setCode(newCode);
  };

  const handleLanguageChange = (newLanguage) => {
    // Save current language's code before switching
    if (currentQuestion?.id && userId && code) {
      const session = loadStickySession(userId, currentQuestion.id) || {};
      updateStickySession(userId, currentQuestion.id, {
        code: {
          ...(session.code || {}),
          [language]: code
        }
      });
    }
    
    setLanguage(newLanguage);
    
    // Load saved code for new language, or fall back to template
    if (currentQuestion?.id && userId) {
      const session = loadStickySession(userId, currentQuestion.id);
      const savedCode = session?.code?.[newLanguage];
      if (savedCode) {
        setCode(savedCode);
      } else if (templates[newLanguage]) {
        // Debug logging
        console.log('Loading template for language:', {
          language: newLanguage,
          templateLength: templates[newLanguage].length,
          templatePreview: templates[newLanguage].substring(0, 100),
          availableTemplates: Object.keys(templates),
          pythonTemplate: templates.python?.substring(0, 50),
          cppTemplate: templates.cpp?.substring(0, 50)
        });
        setCode(templates[newLanguage]);
      } else {
        setCode('');
      }
    } else {
      // Debug logging
      console.log('Loading template for language (no session):', {
        language: newLanguage,
        templateLength: templates[newLanguage]?.length || 0,
        templatePreview: templates[newLanguage]?.substring(0, 100) || 'N/A',
        availableTemplates: Object.keys(templates)
      });
      setCode(templates[newLanguage] || '');
    }
  };

  const handleSubmit = async (submittedCode) => {
    if (!submittedCode || !submittedCode.trim()) {
      alert('Please write some code before submitting');
      return;
    }

    if (!currentQuestion) {
      alert('Question is not loaded yet. Please try again.');
      return;
    }

    setSubmissionStatus('pending');
    
    // Store submission info for matching with WebSocket results
    pendingSubmissionRef.current = {
      questionId: currentQuestion.id,
      timestamp: Date.now(),
    };
    
    try {
      // Call backend API through API Gateway
      // This now returns immediately; results come via WebSocket
      const result = await submitCode({
        code: submittedCode,
        language,
        questionId: currentQuestion.id,
        userId: userId, // Use userId (Cognito sub) for consistency
      });

      // If the API returns results immediately (fallback), handle them
      // Otherwise, wait for WebSocket message
      if (result.testResults) {
        const summary = transformTestResults(result.testResults);
        setTestResultsSummary(summary);
        setTestResults(result.testResults); // Store full test results for display

        if (result.success) {
          setSubmissionStatus('success');
          // Clear success status after 2 seconds for visual feedback
          setTimeout(() => setSubmissionStatus(null), 2000);
        } else {
          setSubmissionStatus('error');
          setTimeout(() => setSubmissionStatus(null), 3000);
        }
        pendingSubmissionRef.current = null;
      } else {
        // Results will come via WebSocket - submission status will be updated there
        // Keep status as 'pending' until WebSocket message arrives
      }
    } catch (error) {
      console.error('Submission error:', error);
      setSubmissionStatus('error');
      setTestResultsSummary(null);
      setTestResults(null);
      pendingSubmissionRef.current = null;
      setTimeout(() => setSubmissionStatus(null), 3000);
    }
  };

  // Show "Start Interview" button if no question is loaded yet and not loading
  if (!currentQuestion && !showQuestionForm && !isLoadingQuestion) {
    return (
      <div className="app">
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          backgroundColor: '#ffffff',
          borderBottom: '1px solid #e5e7eb',
          padding: '12px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          zIndex: 100,
          height: '60px',
          boxSizing: 'border-box'
        }}>
          <h3 style={{ margin: 0, color: '#111827', fontSize: '18px' }}>Coding Interviewer</h3>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <span style={{ fontSize: '14px', color: '#6b7280' }}>
              {user?.email || user?.username}
            </span>
            <button
              onClick={() => navigate('/')}
              style={{
                padding: '6px 16px',
                fontSize: '14px',
                backgroundColor: 'transparent',
                color: '#6b7280',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              Home
            </button>
            <button
              onClick={handleLogout}
              style={{
                padding: '6px 16px',
                fontSize: '14px',
                backgroundColor: '#ef4444',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              Logout
            </button>
          </div>
        </div>
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: 'calc(100vh - 60px)',
          flexDirection: 'column',
          gap: '24px',
          marginTop: '60px'
        }}>
          <h2 style={{ fontSize: '24px', color: '#111827' }}>Ready to start?</h2>
          <button
            onClick={handleStartInterview}
            style={{
              padding: '12px 32px',
              fontSize: '16px',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: '500'
            }}
          >
            Start Interview
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        backgroundColor: '#ffffff',
        borderBottom: '1px solid #e5e7eb',
        padding: '12px 24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        zIndex: 100,
        height: '60px',
        boxSizing: 'border-box'
      }}>
        <h3 style={{ margin: 0, color: '#111827', fontSize: '18px' }}>Coding Interviewer</h3>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <span style={{ fontSize: '14px', color: '#6b7280' }}>
            {user?.email || user?.username}
          </span>
          <button
            onClick={() => navigate('/')}
            style={{
              padding: '6px 16px',
              fontSize: '14px',
              backgroundColor: 'transparent',
              color: '#6b7280',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            Home
          </button>
          <button
            onClick={handleLogout}
            style={{
              padding: '6px 16px',
              fontSize: '14px',
              backgroundColor: '#ef4444',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            Logout
          </button>
        </div>
      </div>
      <div style={{ marginTop: '60px', height: 'calc(100vh - 60px)' }}>
      {showQuestionForm && (
        <QuestionSelectionForm
          onSubmit={handleQuestionFormSubmit}
          onCancel={currentQuestion ? () => setShowQuestionForm(false) : null}
          isLoading={isLoadingQuestion}
          userName={userName}
          error={questionError}
        />
      )}
      
      {/* Loading overlay when fetching question */}
      {!showQuestionForm && isLoadingQuestion && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          backdropFilter: 'blur(4px)'
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            padding: '32px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '16px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
          }}>
            <div className="loading-spinner" style={{
              width: '48px',
              height: '48px',
              border: '4px solid #f3f4f6',
              borderTop: '4px solid #3b82f6',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }}></div>
            <p style={{ margin: 0, fontSize: '16px', color: '#374151', fontWeight: '500' }}>
              Fetching question...
            </p>
          </div>
        </div>
      )}
      
      {!showQuestionForm && currentQuestion && !isLoadingQuestion && (
        <Layout
          leftPanel={
            <QuestionPanel 
              question={currentQuestion} 
              onNextQuestion={handleNextQuestion}
              aiReasoning={currentQuestion?.aiReasoning}
            />
          }
          middlePanel={
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              <div style={{ flex: 1, minHeight: 0 }}>
                <CodeEditor
                  code={code}
                  onChange={handleCodeChange}
                  language={language}
                  onLanguageChange={handleLanguageChange}
                  onSubmit={handleSubmit}
                  submissionStatus={submissionStatus}
                />
              </div>
              <TestResults testResults={testResults} />
            </div>
          }
          rightPanel={
            <ChatBot 
              codeContent={code}
              questionId={currentQuestion?.id}
              questionPrompt={currentQuestion?.description}
              userId={userId}
              testResultsSummary={testResultsSummary}
              key={chatBotResetKey.current}
            />
          }
        />
      )}
      </div>
    </div>
  );
}

export default InterviewInterface;

