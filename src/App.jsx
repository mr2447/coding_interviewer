import { useState, useEffect, useRef } from 'react';
import Layout from './components/Layout/Layout';
import QuestionPanel from './components/QuestionPanel/QuestionPanel';
import CodeEditor from './components/CodeEditor/CodeEditor';
import ChatBot from './components/ChatBot/ChatBot';
import { mockQuestions } from './data/mockQuestions';
import { submitCode, fetchQuestion } from './utils/api';
import './App.css';

function App() {
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [code, setCode] = useState('');
  const [language, setLanguage] = useState('javascript');
  const [submissionStatus, setSubmissionStatus] = useState(null);
  const chatBotResetKey = useRef(0);

  // Select a random question on mount
  useEffect(() => {
    loadNewQuestion();
  }, []);

  // Function to load a new random question
  const loadNewQuestion = async () => {
    setCode(''); // Reset code editor
    chatBotResetKey.current += 1; // Reset chatbot messages
    setSubmissionStatus(null); // Reset submission status

    try {
      // Try to fetch a random question from the backend API
      const question = await fetchQuestion({ random: true });
      setCurrentQuestion(question);
    } catch (error) {
      console.error(
        'Failed to fetch question from API, falling back to mock data:',
        error
      );
      // Fallback to local mock questions if the API is unavailable
      const randomIndex = Math.floor(Math.random() * mockQuestions.length);
      setCurrentQuestion(mockQuestions[randomIndex]);
    }
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
        // TODO: Replace with actual user ID from Cognito authentication
        userId: 'demo-user',
      });

      if (result.success) {
        setSubmissionStatus('success');
        // Auto-load new question after successful submission
        setTimeout(() => {
          loadNewQuestion();
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

  return (
    <div className="app">
      <Layout
        leftPanel={
          <QuestionPanel 
            question={currentQuestion} 
            onNextQuestion={loadNewQuestion}
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
    </div>
  );
}

export default App;

