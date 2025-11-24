import { useState, useEffect, useRef } from 'react';
import Layout from './components/Layout/Layout';
import QuestionPanel from './components/QuestionPanel/QuestionPanel';
import CodeEditor from './components/CodeEditor/CodeEditor';
import ChatBot from './components/ChatBot/ChatBot';
import { mockQuestions } from './data/mockQuestions';
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
  const loadNewQuestion = () => {
    const randomIndex = Math.floor(Math.random() * mockQuestions.length);
    setCurrentQuestion(mockQuestions[randomIndex]);
    setCode(''); // Reset code editor
    chatBotResetKey.current += 1; // Reset chatbot messages
    setSubmissionStatus(null); // Reset submission status
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

    setSubmissionStatus('pending');
    
    try {
      // TODO: Replace with actual API call to backend
      // const response = await fetch('/api/submit', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ code: submittedCode, language, questionId: currentQuestion.id })
      // });
      // const result = await response.json();
      
      // Mock API call - simulate network delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Mock successful submission (replace with actual result from API)
      const mockSuccess = true;
      
      if (mockSuccess) {
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
            key={chatBotResetKey.current}
          />
        }
      />
    </div>
  );
}

export default App;

