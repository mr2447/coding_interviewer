import { useState } from 'react';
import './QuestionPanel.css';

const QuestionPanel = ({ question, onNextQuestion, aiReasoning }) => {
  const [showHints, setShowHints] = useState(false);

  if (!question) {
    return (
      <div className="question-panel">
        <div className="question-loading">Loading question...</div>
      </div>
    );
  }

  const getDifficultyColor = (difficulty) => {
    switch (difficulty.toLowerCase()) {
      case 'easy':
        return '#00b8a3';
      case 'medium':
        return '#ffc01e';
      case 'hard':
        return '#ff375f';
      default:
        return '#6b7280';
    }
  };

  return (
    <div className="question-panel">
      {aiReasoning && (
        <div className="ai-reasoning-banner">
          <strong>AI Suggestion:</strong> {aiReasoning}
        </div>
      )}
      <div className="question-header">
        <div className="question-title-wrapper">
          <h2 className="question-title">{question.title}</h2>
          <span 
            className="question-difficulty"
            style={{ color: getDifficultyColor(question.difficulty) }}
          >
            {question.difficulty}
          </span>
        </div>
        {onNextQuestion && (
          <button 
            className="next-question-button"
            onClick={onNextQuestion}
            title="Get a new random question"
          >
            Next Question
          </button>
        )}
      </div>

      <div className="question-content">
        <div className="question-description">
          {question.description.split('\n').map((line, idx) => (
            <p key={idx}>{line}</p>
          ))}
        </div>

        <div className="question-examples">
          <h3>Examples:</h3>
          {question.examples.map((example, idx) => (
            <div key={idx} className="example">
              <div className="example-number">Example {idx + 1}:</div>
              <div className="example-content">
                <div className="example-input">
                  <strong>Input:</strong> {example.input}
                </div>
                <div className="example-output">
                  <strong>Output:</strong> {example.output}
                </div>
                {example.explanation && (
                  <div className="example-explanation">
                    <strong>Explanation:</strong> {example.explanation}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="question-constraints">
          <h3>Constraints:</h3>
          <ul>
            {question.constraints.map((constraint, idx) => (
              <li key={idx}>{constraint}</li>
            ))}
          </ul>
        </div>

        <div className="question-hints">
          <button 
            className="hints-toggle"
            onClick={() => setShowHints(!showHints)}
          >
            {showHints ? 'Hide Hints' : 'Show Hints'}
          </button>
          {showHints && (
            <ul className="hints-list">
              {question.hints.map((hint, idx) => (
                <li key={idx}>{hint}</li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default QuestionPanel;

