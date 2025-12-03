import { useState, useRef, useEffect } from 'react';
import Message from './Message';
import { mockOpenAIResponse } from '../../utils/mockOpenAI';
import { generateHint } from '../../utils/api';
import './ChatBot.css';

const ChatBot = ({ codeContent, questionId, questionPrompt }) => {
  const [hints, setHints] = useState([]); // Store only generated hints
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);
  // A simple per-session conversation identifier; backend/OpenAI can use this
  // to maintain chat history without sending full previousHints.
  const conversationIdRef = useRef(
    `${Date.now()}-${Math.random().toString(36).slice(2)}`
  );

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
      // Collect all previous hints into a string
      const previousHints = hints.map(hint => hint.content).join('\n\n');

      let response;
      try {
        // Prefer calling the real backend hint API
        response = await generateHint({
          code: codeContent,
          questionId,
          questionPrompt,
          conversationId: conversationIdRef.current,
        });
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

