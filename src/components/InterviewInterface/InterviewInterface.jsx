import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../Layout/Layout';
import QuestionPanel from '../QuestionPanel/QuestionPanel';
import CodeEditor from '../CodeEditor/CodeEditor';
import ChatBot from '../ChatBot/ChatBot';
import QuestionSelectionForm from '../QuestionSelectionForm/QuestionSelectionForm';
import { submitCode, fetchNextQuestion } from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';
import '../../App.css';

function InterviewInterface() {
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [code, setCode] = useState('');
  const [language, setLanguage] = useState('javascript');
  const [submissionStatus, setSubmissionStatus] = useState(null);
  const [showQuestionForm, setShowQuestionForm] = useState(false);
  const [isLoadingQuestion, setIsLoadingQuestion] = useState(false);
  const [questionError, setQuestionError] = useState(null);
  const chatBotResetKey = useRef(0);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  
  // Get userName from authenticated user
  const userName = user?.username || user?.email || 'demo-user';

  const handleLogout = async () => {
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
    setShowQuestionForm(false); // Hide form while loading

    try {
      const question = await fetchNextQuestion({
        userName,
        topic: preferences?.topic || null,
        difficulty: preferences?.difficulty || null,
      });
      setCurrentQuestion(question);
      
      // Set initial code from template if provided
      if (question.template) {
        setCode(question.template);
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
    setCode(''); // Reset code when language changes
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
    
    try {
      // Call backend API through API Gateway
      const result = await submitCode({
        code: submittedCode,
        language,
        questionId: currentQuestion.id,
        userId: userName,
      });

      if (result.success) {
        setSubmissionStatus('success');
        // Show form after successful submission
        setTimeout(() => {
          setShowQuestionForm(true);
          // Clear success message after a moment
          setTimeout(() => setSubmissionStatus(null), 2000);
        }, 1000);
      } else {
        setSubmissionStatus('error');
        setTimeout(() => setSubmissionStatus(null), 3000);
      }
    } catch (error) {
      console.error('Submission error:', error);
      setSubmissionStatus('error');
      setTimeout(() => setSubmissionStatus(null), 3000);
    }
  };

  // Show "Start Interview" button if no question is loaded yet
  if (!currentQuestion && !showQuestionForm) {
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
          zIndex: 100
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
          height: '100vh',
          flexDirection: 'column',
          gap: '24px',
          marginTop: '-60px'
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
        zIndex: 100
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
      <div style={{ marginTop: '60px' }}>
      {showQuestionForm && (
        <QuestionSelectionForm
          onSubmit={handleQuestionFormSubmit}
          onCancel={currentQuestion ? () => setShowQuestionForm(false) : null}
          isLoading={isLoadingQuestion}
          userName={userName}
          error={questionError}
        />
      )}
      
      {!showQuestionForm && currentQuestion && (
        <Layout
          leftPanel={
            <QuestionPanel 
              question={currentQuestion} 
              onNextQuestion={handleNextQuestion}
              aiReasoning={currentQuestion?.aiReasoning}
            />
          }
          middlePanel={
            <CodeEditor
              code={code}
              onChange={handleCodeChange}
              language={language}
              onLanguageChange={handleLanguageChange}
              onSubmit={handleSubmit}
              submissionStatus={submissionStatus}
            />
          }
          rightPanel={
            <ChatBot 
              codeContent={code}
              questionId={currentQuestion?.id}
              questionPrompt={currentQuestion?.description}
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

