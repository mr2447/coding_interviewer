import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import './Auth.css';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showVerification, setShowVerification] = useState(false);
  const [unverifiedEmail, setUnverifiedEmail] = useState('');
  const { login, verifyEmail, resendVerificationCode } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    if (!email || !password) {
      setError('Please enter both email and password');
      setIsLoading(false);
      return;
    }

    const result = await login(email, password);

    if (result.success) {
      navigate('/interview');
    } else {
      // If user needs verification, show verification form
      if (result.needsVerification) {
        setUnverifiedEmail(email);
        setShowVerification(true);
        setError('Please verify your email before signing in. Enter the verification code sent to your email.');
      } else {
        setError(result.error);
      }
    }

    setIsLoading(false);
  };

  const handleVerifySubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!verificationCode || verificationCode.length !== 6) {
      setError('Please enter a valid 6-digit verification code');
      return;
    }

    setIsLoading(true);

    const result = await verifyEmail(unverifiedEmail, verificationCode);

    if (result.success) {
      // After verification, try to log in again
      const loginResult = await login(unverifiedEmail, password);
      if (loginResult.success) {
        navigate('/interview');
      } else {
        setError(loginResult.error);
        setShowVerification(false);
      }
    } else {
      setError(result.error);
    }

    setIsLoading(false);
  };

  const handleResendCode = async () => {
    setIsLoading(true);
    setError('');

    const result = await resendVerificationCode(unverifiedEmail);

    if (result.success) {
      setError('');
      alert('Verification code has been resent to your email.');
    } else {
      setError(result.error);
    }

    setIsLoading(false);
  };

  if (showVerification) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <h2>Verify Your Email</h2>
          <p className="auth-subtitle">Enter the 6-digit code sent to {unverifiedEmail}</p>

          {error && <div className="auth-error">{error}</div>}

          <form onSubmit={handleVerifySubmit} className="auth-form">
            <div className="auth-field">
              <label htmlFor="verificationCode">Verification Code</label>
              <input
                id="verificationCode"
                type="text"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="Enter 6-digit code"
                disabled={isLoading}
                required
                maxLength={6}
                pattern="[0-9]{6}"
                inputMode="numeric"
              />
            </div>

            <button
              type="submit"
              className="auth-button auth-button-primary"
              disabled={isLoading}
            >
              {isLoading ? 'Verifying...' : 'Verify Email'}
            </button>
          </form>

          <p className="auth-link" style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center' }}>
            <button 
              type="button"
              onClick={handleResendCode}
              disabled={isLoading}
              style={{ background: 'none', border: 'none', color: '#3b82f6', cursor: isLoading ? 'not-allowed' : 'pointer', fontWeight: '500', textDecoration: 'underline', padding: 0, opacity: isLoading ? 0.6 : 1 }}
            >
              Resend verification code
            </button>
            <button 
              type="button"
              onClick={() => {
                setShowVerification(false);
                setVerificationCode('');
                setError('');
              }}
              style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', fontWeight: '400', textDecoration: 'underline', padding: 0, fontSize: '14px' }}
            >
              Back to sign in
            </button>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>Sign In</h2>
        <p className="auth-subtitle">Welcome back! Please sign in to continue.</p>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="auth-field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              disabled={isLoading}
              required
            />
          </div>

          <div className="auth-field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              disabled={isLoading}
              required
            />
          </div>

          <button
            type="submit"
            className="auth-button auth-button-primary"
            disabled={isLoading}
          >
            {isLoading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p className="auth-link">
          Don't have an account? <Link to="/register">Sign up</Link>
        </p>
      </div>
    </div>
  );
};

export default Login;

