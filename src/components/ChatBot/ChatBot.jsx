import { useState, useRef, useEffect } from 'react';
import Message from './Message';
import { mockOpenAIResponse } from '../../utils/mockOpenAI';
import './ChatBot.css';

const ChatBot = ({ codeContent }) => {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: "Hello! I'm your coding interview assistant. I can help you with hints, code review, and explanations. Feel free to ask me anything about the problem or your code!"
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage = {
      role: 'user',
      content: inputValue
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      const response = await mockOpenAIResponse(inputValue, codeContent);
      setMessages(prev => [...prev, response]);
    } catch (error) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.'
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="chatbot-container">
      <div className="chatbot-header">
        <h3>AI Assistant</h3>
        <div className="chatbot-status">
          <span className="status-indicator"></span>
          Online
        </div>
      </div>
      <div className="chatbot-messages">
        {messages.map((message, idx) => (
          <Message key={idx} message={message} />
        ))}
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
        <textarea
          className="chatbot-input"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Ask a question about the problem or your code..."
          rows={3}
          disabled={isLoading}
        />
        <button
          className="chatbot-send-button"
          onClick={handleSend}
          disabled={isLoading || !inputValue.trim()}
        >
          Send
        </button>
      </div>
    </div>
  );
};

export default ChatBot;

