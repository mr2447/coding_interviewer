import './Message.css';

const Message = ({ message }) => {
  const isUser = message.role === 'user';
  
  return (
    <div className={`message ${isUser ? 'message-user' : 'message-assistant'}`}>
      <div className="message-content">
        {message.content}
      </div>
    </div>
  );
};

export default Message;

