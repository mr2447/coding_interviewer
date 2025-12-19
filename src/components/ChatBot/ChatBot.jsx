import { useState, useRef, useEffect } from 'react';
import Message from './Message';
import { mockOpenAIResponse } from '../../utils/mockOpenAI';
import { generateHint } from '../../utils/api';
import { loadStickySession, updateStickySession } from '../../utils/storage';
import './ChatBot.css';

const ChatBot = ({ codeContent, questionId, questionPrompt, userId, testResultsSummary }) => {
  const [hints, setHints] = useState([]); // Store only generated hints
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);
  
  // Load saved hints and threadId from sticky session on mount or question change
  useEffect(() => {
    if (!questionId || !userId) {
      setHints([]);
      return;
    }

    const session = loadStickySession(userId, questionId);
    if (session) {
      // Restore hints if they exist
      if (session.hints && Array.isArray(session.hints)) {
        setHints(session.hints);
      }
      // Note: threadId is stored in session, we'll use it when generating hints
    } else {
      // New question - start fresh
      setHints([]);
    }
  }, [questionId, userId]);

  // Save hints to sticky session whenever they change
  useEffect(() => {
    if (!questionId || !userId) return;
    
    // Only save if we have hints (don't save empty array on initial load)
    if (hints.length > 0) {
      updateStickySession(userId, questionId, { hints });
    }
  }, [hints, questionId, userId]);

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
      // Get threadId from sticky session (user-specific, per question)
      const session = loadStickySession(userId, questionId);
      const threadId = session?.threadId || null;
      const isFirstHint = !threadId;
      
      // Collect all previous hints into a string for fallback mock
      const previousHints = hints.map(hint => hint.content).join('\n\n');

      let response;
      try {
        // Call the real backend hint API with threadId
        response = await generateHint({
          userId: userId || 'demo-user',
          qid: parseInt(questionId, 10),
          threadId: threadId, // Send existing threadId or null for first hint
          userCode: codeContent || '',
          testResultsSummary: testResultsSummary,
          questionDesc: isFirstHint ? questionPrompt : null, // Only send full description on first hint
        });
        
        // Save the returned threadId to sticky session
        if (response.threadId) {
          updateStickySession(userId, questionId, { threadId: response.threadId });
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
      const newHints = [...hints, response];
      setHints(newHints);
      
      // Update sticky session with new hints
      updateStickySession(userId, questionId, { hints: newHints });
    } catch (error) {
      console.error('Error generating hint:', error);
      const errorHint = {
        role: 'assistant',
        content: 'Sorry, I encountered an error generating a hint. Please try again.'
      };
      const newHints = [...hints, errorHint];
      setHints(newHints);
      updateStickySession(userId, questionId, { hints: newHints });
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
            Click "Ask for Help" to get help with your code.
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
          {isLoading ? 'Asking...' : 'Ask for Help'}
        </button>
      </div>
    </div>
  );
};

export default ChatBot;

