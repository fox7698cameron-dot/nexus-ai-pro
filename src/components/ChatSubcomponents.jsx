import React from 'react';

// MessageDisplay: Component to display individual messages
const MessageDisplay = ({ message, user }) => (
  <div className={`message ${user ? 'user-message' : 'bot-message'}`}>
    {message}
  </div>
);

// MessageInput: Component for inputting messages with suggestion chips
const MessageInput = ({ onSend, suggestions }) => {
  const [input, setInput] = React.useState('');

  const handleSend = () => {
    onSend(input);
    setInput('');
  };

  return (
    <div>
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Type your message..."
      />
      <button onClick={handleSend}>Send</button>
      <div className="suggestions">
        {suggestions.map((suggestion, index) => (
          <span key={index} onClick={() => setInput(suggestion)}>
            {suggestion}
          </span>
        ))}
      </div>
    </div>
  );
};

// ConversationHistory: Component to display the conversation history
const ConversationHistory = ({ messages }) => (
  <div className="conversation-history">
    {messages.map((msg, index) => (
      <MessageDisplay key={index} message={msg.text} user={msg.user} />
    ))}
  </div>
);

// TypingIndicator: Component to show when someone is typing
const TypingIndicator = ({ isTyping }) => (
  isTyping ? <div className="typing-indicator">Someone is typing...</div> : null
);

// SentimentAnalysisDisplay: Component to display sentiment analysis
const SentimentAnalysisDisplay = ({ sentiment }) => (
  <div className="sentiment-analysis">
        Sentiment: {sentiment}
  </div>
);

// ErrorBoundary: Error boundary component to catch errors
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by ErrorBoundary: ', error);
  }

  render() {
    if (this.state.hasError) {
      return <h1>Something went wrong.</h1>;
    }
    return this.props.children;
  }
}

// Exporting all components
export {
  MessageDisplay,
  MessageInput,
  ConversationHistory,
  TypingIndicator,
  SentimentAnalysisDisplay,
  ErrorBoundary
};