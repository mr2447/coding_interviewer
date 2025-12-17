import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import './Auth.css';

const Register = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [showVerification, setShowVerification] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');
  const [isResendingCode, setIsResendingCode] = useState(false);
  const { register, verifyEmail, resendVerificationCode } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    if (!email || !password || !confirmPassword) {
      setError('Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    setIsLoading(true);

    const result = await register(email, password);

    if (result.success) {
      setRegisteredEmail(email);
      setShowVerification(true);
      setSuccessMessage('Registration successful! Please check your email for the verification code.');
      setError('');
    } else {
      setError(result.error);
    }

    setIsLoading(false);
  };

  const handleVerifySubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    if (!verificationCode) {
      setError('Please enter the verification code');
      return;
    }

    if (verificationCode.length !== 6) {
      setError('Verification code must be 6 digits');
      return;
    }

    setIsLoading(true);

    const result = await verifyEmail(registeredEmail, verificationCode);

    if (result.success) {
      setSuccessMessage('Email verified successfully! Redirecting to login...');
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } else {
      setError(result.error);
    }

    setIsLoading(false);
  };

  const handleResendCode = async () => {
    setIsResendingCode(true);
    setError('');
    setSuccessMessage('');

    const result = await resendVerificationCode(registeredEmail);

    if (result.success) {
      setSuccessMessage('Verification code has been resent to your email.');
    } else {
      setError(result.error);
    }

    setIsResendingCode(false);
  };

  if (showVerification) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <h2>Verify Your Email</h2>
          <p className="auth-subtitle">Enter the 6-digit code sent to {registeredEmail}</p>

          {error && <div className="auth-error">{error}</div>}
          {successMessage && <div className="auth-success">{successMessage}</div>}

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
              disabled={isResendingCode}
              style={{ background: 'none', border: 'none', color: '#3b82f6', cursor: isResendingCode ? 'not-allowed' : 'pointer', fontWeight: '500', textDecoration: 'underline', padding: 0, opacity: isResendingCode ? 0.6 : 1 }}
            >
              {isResendingCode ? 'Sending...' : "Didn't receive a code? Resend"}
            </button>
            <button 
              type="button"
              onClick={() => setShowVerification(false)}
              style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', fontWeight: '400', textDecoration: 'underline', padding: 0, fontSize: '14px' }}
            >
              Go back to registration
            </button>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>Create Account</h2>
        <p className="auth-subtitle">Sign up to start practicing coding interviews</p>

        {error && <div className="auth-error">{error}</div>}
        {successMessage && <div className="auth-success">{successMessage}</div>}

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
              placeholder="Enter your password (min 8 characters)"
              disabled={isLoading}
              required
              minLength={8}
            />
          </div>

          <div className="auth-field">
            <label htmlFor="confirmPassword">Confirm Password</label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm your password"
              disabled={isLoading}
              required
            />
          </div>

          <button
            type="submit"
            className="auth-button auth-button-primary"
            disabled={isLoading}
          >
            {isLoading ? 'Creating account...' : 'Sign Up'}
          </button>
        </form>

        <p className="auth-link">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
};

export default Register;

