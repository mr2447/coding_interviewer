import { useState } from 'react';
import './QuestionSelectionForm.css';

const QuestionSelectionForm = ({ onSubmit, onCancel, isLoading, userName, error }) => {
  const [topic, setTopic] = useState('');
  const [difficulty, setDifficulty] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      topic: topic || null,
      difficulty: difficulty || null,
    });
  };

  const handleLetAIDecide = () => {
    onSubmit({
      topic: null,
      difficulty: null,
    });
  };

  return (
    <div className="question-selection-modal-overlay">
      <div className="question-selection-modal">
        <div className="question-selection-header">
          <h2>Select Question Preferences</h2>
          {onCancel && (
            <button 
              className="question-selection-close"
              onClick={onCancel}
              aria-label="Close"
            >
              ×
            </button>
          )}
        </div>
        
        {error && (
          <div className="question-selection-error">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="question-selection-form">
          <div className="question-selection-field">
            <label htmlFor="topic">Topic (Optional)</label>
            <input
              id="topic"
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g., Arrays, Graphs, Dynamic Programming"
              disabled={isLoading}
            />
            <p className="field-hint">Leave empty to let AI decide</p>
          </div>

          <div className="question-selection-field">
            <label htmlFor="difficulty">Difficulty (Optional)</label>
            <select
              id="difficulty"
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
              disabled={isLoading}
            >
              <option value="">Select difficulty...</option>
              <option value="Easy">Easy</option>
              <option value="Medium">Medium</option>
              <option value="Hard">Hard</option>
            </select>
            <p className="field-hint">Leave empty to let AI decide</p>
          </div>

          <div className="question-selection-actions">
            <button
              type="button"
              onClick={handleLetAIDecide}
              className="btn-ai-decide"
              disabled={isLoading}
            >
              {isLoading ? 'Loading...' : 'Let AI Decide'}
            </button>
            <button
              type="submit"
              className="btn-submit"
              disabled={isLoading}
            >
              {isLoading ? 'Loading...' : 'Get Question'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default QuestionSelectionForm;

