import { useState, useRef, useEffect } from 'react';
import Message from './Message';
import { mockOpenAIResponse } from '../../utils/mockOpenAI';
import './ChatBot.css';

const ChatBot = ({ codeContent }) => {
  const [hints, setHints] = useState([]); // Store only generated hints
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

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
      
      // Call the mock API with code and previous hints
      const response = await mockOpenAIResponse(codeContent, previousHints);
      
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

