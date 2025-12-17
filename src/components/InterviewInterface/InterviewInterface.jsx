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
} from '../../utils/storage';
import {useEffect} from 'react';

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
        input: failedTest.input || 'N/A',
        expected: failedTest.expected || 'N/A',
        actual: failedTest.actual || failedTest.error || 'N/A',
      } : null,
    };
  };

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
        const testResults = message.testResults || JSON.parse(message.Results || '{}');
        const summary = transformTestResults(testResults);
        setTestResultsSummary(summary);
        setTestResults(testResults); // Store full test results for display

        // Update submission status based on results
        if (testResults.success || (testResults.passed === testResults.total && testResults.total > 0)) {
          setSubmissionStatus('success');
          // Show form after successful submission
          setTimeout(() => {
            setShowQuestionForm(true);
            setTimeout(() => setSubmissionStatus(null), 2000);
          }, 1000);
        } else {
          setSubmissionStatus('error');
          setTimeout(() => setSubmissionStatus(null), 3000);
        }
      } else if (message.success !== undefined) {
        // Handle simple success/failure message
        if (message.success) {
          setSubmissionStatus('success');
          setTimeout(() => {
            setShowQuestionForm(true);
            setTimeout(() => setSubmissionStatus(null), 2000);
          }, 1000);
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
    await logout();
    navigate('/');
  };

  // Function to load a new question based on user preferences
  const loadNewQuestion = async (preferences = null) => {
    setIsLoadingQuestion(true);
    setQuestionError(null);
    setCode(''); // Reset code editor
    chatBotResetKey.current += 1; // Reset chatbot messages
    setSubmissionStatus(null); // Reset submission status
    setTestResultsSummary(null); // Reset test results summary
    setTestResults(null); // Reset full test results
    setShowQuestionForm(false); // Hide form while loading

    try {
      const question = await fetchNextQuestion({
        userId: userId, // Use Cognito sub as userId
        topic: preferences?.topic || null,
        difficulty: preferences?.difficulty || null,
      });
      setCurrentQuestion(question);
      
      // Store all templates in state
      if (question.template && typeof question.template === 'object') {
        setTemplates({
          python: question.template.python || '',
          cpp: question.template.cpp || '',
        });
        // Set initial code based on current language
        setCode(question.template[language] || '');
      } else {
        // Fallback: if template is not an object, reset templates
        setTemplates({ python: '', cpp: '' });
        setCode('');
      }
    } catch (error) {
      console.error('Failed to fetch question from API:', error);
      setQuestionError(error.message || 'Failed to fetch question. Please try again.');
      setShowQuestionForm(true); // Show form again on error
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
    setLanguage(newLanguage);
    // Switch to the template for the new language (no API call!)
    setCode(templates[newLanguage] || '');
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
          setTimeout(() => {
            setShowQuestionForm(true);
            setTimeout(() => setSubmissionStatus(null), 2000);
          }, 1000);
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

