import { useState } from 'react';
import Editor from '@monaco-editor/react';
import './CodeEditor.css';

const CodeEditor = ({ code, onChange, language, onLanguageChange, onSubmit, submissionStatus }) => {
  const [theme, setTheme] = useState('vs-dark');

  const defaultCode = {
    javascript: `function solution(nums, target) {
    // Write your code here
    
}`,
    python: `def solution(nums, target):
    # Write your code here
    pass`,
    java: `class Solution {
    public int[] solution(int[] nums, int target) {
        // Write your code here
        return new int[]{};
    }
}`
  };

  const handleEditorChange = (value) => {
    onChange(value || '');
  };

  const handleSubmit = () => {
    if (submissionStatus === 'pending') {
      return; // Prevent multiple submissions
    }
    if (onSubmit) {
      onSubmit(code);
    } else {
      alert('Submit functionality will be connected to backend');
    }
  };

  const getSubmitButtonText = () => {
    switch (submissionStatus) {
      case 'pending':
        return 'Submitting...';
      case 'success':
        return 'Success!';
      case 'error':
        return 'Error - Retry';
      default:
        return 'Submit';
    }
  };

  const getSubmitButtonClass = () => {
    const baseClass = 'submit-button';
    switch (submissionStatus) {
      case 'pending':
        return `${baseClass} submit-button-pending`;
      case 'success':
        return `${baseClass} submit-button-success`;
      case 'error':
        return `${baseClass} submit-button-error`;
      default:
        return baseClass;
    }
  };

  return (
    <div className="code-editor-container">
      <div className="editor-toolbar">
        <div className="toolbar-left">
          <select 
            value={language} 
            onChange={(e) => onLanguageChange(e.target.value)}
            className="language-selector"
          >
            <option value="javascript">JavaScript</option>
            <option value="python">Python</option>
            <option value="java">Java</option>
          </select>
        </div>
        <div className="toolbar-right">
          <select 
            value={theme} 
            onChange={(e) => setTheme(e.target.value)}
            className="theme-selector"
          >
            <option value="vs-dark">Dark</option>
            <option value="light">Light</option>
          </select>
          <button 
            className={getSubmitButtonClass()}
            onClick={handleSubmit}
            disabled={submissionStatus === 'pending'}
          >
            {getSubmitButtonText()}
          </button>
        </div>
      </div>
      <div className="editor-wrapper">
        <Editor
          height="100%"
          language={language}
          theme={theme}
          value={code || defaultCode[language]}
          onChange={handleEditorChange}
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            lineNumbers: 'on',
            roundedSelection: false,
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: 2,
            wordWrap: 'on'
          }}
        />
      </div>
    </div>
  );
};

export default CodeEditor;

