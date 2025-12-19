import './TestResults.css';

const TestResults = ({ testResults }) => {
  if (!testResults) {
    return null;
  }

  console.log('TestResults component received:', testResults);
  const { success, passed = 0, total = 0, runtime, tests = [] } = testResults;
  console.log('TestResults - extracted values:', { success, passed, total, testsLength: tests.length, tests });
  const allPassed = success || (passed === total && total > 0);
  const failedTest = tests?.find(test => test.status === 'failed');
  console.log('TestResults - failedTest:', failedTest);

  return (
    <div className="test-results-container">
      <div className="test-results-header">
        <h3>Test Results</h3>
        <div className={`test-status-badge ${allPassed ? 'status-passed' : 'status-failed'}`}>
          {allPassed ? '✓ All Tests Passed' : '✗ Test Failed'}
        </div>
      </div>

      <div className="test-results-summary">
        <div className="summary-item">
          <span className="summary-label">Passed:</span>
          <span className="summary-value">{passed}</span>
        </div>
        {runtime && (
          <div className="summary-item">
            <span className="summary-label">Runtime:</span>
            <span className="summary-value">{(runtime * 1000).toFixed(2)} ms</span>
          </div>
        )}
      </div>

      {failedTest && (
        <div className="failed-test-details">
          <h4>Failed Test Case</h4>
          <div className="test-detail-row">
            <span className="detail-label">Input:</span>
            <code className="detail-value">
              {failedTest.input !== undefined && failedTest.input !== null 
                ? (typeof failedTest.input === 'object' 
                    ? JSON.stringify(failedTest.input, null, 2) 
                    : String(failedTest.input))
                : 'N/A'}
            </code>
          </div>
          <div className="test-detail-row">
            <span className="detail-label">Expected:</span>
            <code className="detail-value detail-expected">{failedTest.expected || 'N/A'}</code>
          </div>
          <div className="test-detail-row">
            <span className="detail-label">Actual:</span>
            <code className="detail-value detail-actual">
              {failedTest.actual !== undefined && failedTest.actual !== null 
                ? String(failedTest.actual) 
                : 'N/A'}
            </code>
          </div>
          {failedTest.error && failedTest.error !== failedTest.actual && (
            <div className="test-detail-row">
              <span className="detail-label">Error:</span>
              <code className="detail-value detail-error">{failedTest.error}</code>
            </div>
          )}
        </div>
      )}

      {allPassed && tests && tests.length > 0 && (
        <div className="passed-tests-info">
          <p>✓ All {total} test case{total !== 1 ? 's' : ''} passed successfully!</p>
        </div>
      )}
    </div>
  );
};

export default TestResults;

