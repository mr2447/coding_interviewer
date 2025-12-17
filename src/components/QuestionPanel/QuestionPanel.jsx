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
            title="Get a new question"
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
          {question.examples.map((example, idx) => {
            // Safely convert input and output to strings to prevent React error #31
            const formatExampleValue = (value) => {
              if (typeof value === 'string') return value;
              if (typeof value === 'object' && value !== null) {
                // If it's an object like {nums: [...], target: 9}, format it nicely
                try {
                  return JSON.stringify(value, null, 2);
                } catch {
                  return String(value);
                }
              }
              return String(value || '');
            };

            const inputStr = formatExampleValue(example.input);
            const outputStr = formatExampleValue(example.output);

            return (
              <div key={idx} className="example">
                <div className="example-number">Example {idx + 1}:</div>
                <div className="example-content">
                  <div className="example-input">
                    <strong>Input:</strong> {inputStr}
                  </div>
                  <div className="example-output">
                    <strong>Output:</strong> {outputStr}
                  </div>
                  {example.explanation && (
                    <div className="example-explanation">
                      <strong>Explanation:</strong> {example.explanation}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
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

