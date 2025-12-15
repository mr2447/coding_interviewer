import { useState, useRef, useEffect } from 'react';
import Message from './Message';
import { mockOpenAIResponse } from '../../utils/mockOpenAI';
import { generateHint } from '../../utils/api';
import './ChatBot.css';

const ChatBot = ({ codeContent, questionId, questionPrompt, userId, testResultsSummary }) => {
  const [hints, setHints] = useState([]); // Store only generated hints
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);
  
  // Get thread_id from localStorage (per question)
  const getThreadId = () => {
    if (!questionId) return null;
    const key = `hint_thread_${questionId}`;
    return localStorage.getItem(key);
  };

  // Save thread_id to localStorage (per question)
  const saveThreadId = (threadId) => {
    if (!questionId || !threadId) return;
    const key = `hint_thread_${questionId}`;
    localStorage.setItem(key, threadId);
  };

  // Clear thread_id when question changes
  useEffect(() => {
    // Reset hints when question changes
    setHints([]);
  }, [questionId]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [hints]);

  const handleGenerateHint = async () => {
    if (isLoading) return;

    setIsLoading(true);

    try {
      const threadId = getThreadId();
      const isFirstHint = !threadId;
      
      // Collect all previous hints into a string for fallback mock
      const previousHints = hints.map(hint => hint.content).join('\n\n');

      let response;
      try {
        // Call the real backend hint API with new format
        response = await generateHint({
          userId: userId || 'demo-user',
          qid: parseInt(questionId, 10),
          threadId: threadId,
          userCode: codeContent || '',
          testResultsSummary: testResultsSummary,
          questionDesc: isFirstHint ? questionPrompt : null, // Only send full description on first hint
        });
        
        // Save the returned thread_id to localStorage
        if (response.threadId) {
          saveThreadId(response.threadId);
        }
      } catch (apiError) {
        console.warn(
          'Hint API call failed, falling back to local mock hints:',
          apiError
        );
        // Fall back to local mock hint generator if backend is unavailable
        response = await mockOpenAIResponse(codeContent, previousHints);
      }

      // Add the new hint to the list
      setHints(prev => [...prev, response]);
    } catch (error) {
      console.error('Error generating hint:', error);
      setHints(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, I encountered an error generating a hint. Please try again.'
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="chatbot-container">
      <div className="chatbot-header">
        <h3>AI Hints</h3>
        <div className="chatbot-status">
          <span className="status-indicator"></span>
          Online
        </div>
      </div>
      <div className="chatbot-messages">
        {hints.length === 0 ? (
          <div className="no-hints-message">
            Click "Generate Hint" to get help with your code.
          </div>
        ) : (
          hints.map((hint, idx) => (
            <Message key={idx} message={hint} />
          ))
        )}
        {isLoading && (
          <div className="message message-assistant">
            <div className="message-content">
              <div className="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      <div className="chatbot-input-container">
        <button
          className="chatbot-generate-button"
          onClick={handleGenerateHint}
          disabled={isLoading}
        >
          {isLoading ? 'Generating...' : 'Generate Hint'}
        </button>
      </div>
    </div>
  );
};

export default ChatBot;

