import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import './LandingPage.css';

const LandingPage = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user, logout } = useAuth();

  const handleStartInterview = () => {
    if (isAuthenticated) {
      navigate('/interview');
    } else {
      navigate('/login');
    }
  };

  const handleLogout = async () => {
    await logout();
  };

  return (
    <div className="landing-page">
      <header className="landing-header">
        <div className="landing-header-content">
          <h1 className="landing-logo">Coding Interviewer</h1>
          <nav className="landing-nav">
            {isAuthenticated ? (
              <>
                <span className="landing-user">Welcome, {user?.email || user?.username}</span>
                <button onClick={handleLogout} className="landing-button landing-button-secondary">
                  Logout
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => navigate('/login')}
                  className="landing-button landing-button-secondary"
                >
                  Sign In
                </button>
                <button
                  onClick={() => navigate('/register')}
                  className="landing-button landing-button-primary"
                >
                  Sign Up
                </button>
              </>
            )}
          </nav>
        </div>
      </header>

      <main className="landing-main">
        <section className="landing-hero">
          <h2 className="landing-hero-title">
            Master Your Coding Interviews
          </h2>
          <p className="landing-hero-subtitle">
            Practice with AI-powered questions, get instant feedback, and improve your problem-solving skills.
          </p>
          <button
            onClick={handleStartInterview}
            className="landing-button landing-button-cta"
          >
            Start Interview
          </button>
        </section>

        <section className="landing-features">
          <h3 className="landing-features-title">Why Choose Coding Interviewer?</h3>
          <div className="landing-features-grid">
            <div className="landing-feature">
              <div className="landing-feature-icon">💡</div>
              <h4 className="landing-feature-title">AI-Powered Hints</h4>
              <p className="landing-feature-description">
                Get intelligent hints and guidance as you solve problems, just like a real interview.
              </p>
            </div>
            <div className="landing-feature">
              <div className="landing-feature-icon">🎯</div>
              <h4 className="landing-feature-title">Personalized Questions</h4>
              <p className="landing-feature-description">
                AI selects questions based on your skill level and previous performance to optimize your learning.
              </p>
            </div>
            <div className="landing-feature">
              <div className="landing-feature-icon">⚡</div>
              <h4 className="landing-feature-title">Instant Feedback</h4>
              <p className="landing-feature-description">
                Receive immediate test results and feedback on your code submissions.
              </p>
            </div>
            <div className="landing-feature">
              <div className="landing-feature-icon">📊</div>
              <h4 className="landing-feature-title">Multiple Languages</h4>
              <p className="landing-feature-description">
                Practice with JavaScript, Python, or Java - choose the language you're most comfortable with.
              </p>
            </div>
          </div>
        </section>

        <section className="landing-info">
          <h3 className="landing-info-title">How It Works</h3>
          <div className="landing-steps">
            <div className="landing-step">
              <div className="landing-step-number">1</div>
              <p className="landing-step-text">Sign up or log in to get started</p>
            </div>
            <div className="landing-step">
              <div className="landing-step-number">2</div>
              <p className="landing-step-text">Choose your topic and difficulty level</p>
            </div>
            <div className="landing-step">
              <div className="landing-step-number">3</div>
              <p className="landing-step-text">Solve coding problems with AI assistance</p>
            </div>
            <div className="landing-step">
              <div className="landing-step-number">4</div>
              <p className="landing-step-text">Get feedback and improve your skills</p>
            </div>
          </div>
        </section>
      </main>

      <footer className="landing-footer">
        <p>&copy; 2024 Coding Interviewer. Practice makes perfect.</p>
      </footer>
    </div>
  );
};

export default LandingPage;

