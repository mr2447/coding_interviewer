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
            <select
              id="topic"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              disabled={isLoading}
            >
              <option value="">Select topic...</option>
              <option value="sliding-window">sliding-window</option>
              <option value="matrix">matrix</option>
              <option value="bfs">bfs</option>
              <option value="divide-and-conquer">divide-and-conquer</option>
              <option value="sorting">sorting</option>
              <option value="dfs">dfs</option>
              <option value="array">array</option>
              <option value="math">math</option>
              <option value="graph">graph</option>
              <option value="stack">stack</option>
              <option value="hash-table">hash-table</option>
              <option value="topological-sort">topological-sort</option>
              <option value="string">string</option>
              <option value="heap">heap</option>
              <option value="two-pointers">two-pointers</option>
              <option value="dynamic-programming">dynamic-programming</option>
              <option value="intervals">intervals</option>
              <option value="binary-search">binary-search</option>
              <option value="implementation">implementation</option>
            </select>
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
              {isLoading ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div className="loading-spinner-small" style={{
                    width: '16px',
                    height: '16px',
                    border: '2px solid #9ca3af',
                    borderTop: '2px solid #374151',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                  }}></div>
                  Loading...
                </span>
              ) : 'Let AI Decide'}
            </button>
            <button
              type="submit"
              className="btn-submit"
              disabled={isLoading}
            >
              {isLoading ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div className="loading-spinner-small" style={{
                    width: '16px',
                    height: '16px',
                    border: '2px solid rgba(255, 255, 255, 0.5)',
                    borderTop: '2px solid white',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                  }}></div>
                  Loading...
                </span>
              ) : 'Get Question'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default QuestionSelectionForm;

