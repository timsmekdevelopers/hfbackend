import React, { useState, useEffect } from 'react';

function LoginForm({ autofill, onFirstLogin, onLogin, showReset, onResetDone }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showResetFields, setShowResetFields] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pendingUserId, setPendingUserId] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (autofill) {
      setEmail(autofill.email);
      setPassword(autofill.password);
    }
  }, [autofill]);

  useEffect(() => {
    if (showReset) setShowResetFields(true);
  }, [showReset]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (showResetFields) {
      if (!newPassword || newPassword !== confirmPassword) {
        alert('Passwords do not match.');
        return;
      }
      if (!pendingUserId) {
        alert('Session expired. Please log in again.');
        setShowResetFields(false);
        onResetDone && onResetDone();
        return;
      }
      setSubmitting(true);
      try {
        const res = await fetch(`/api/users/${pendingUserId}/reset-password`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ newPassword })
        });
        const data = await res.json();
        if (!res.ok) {
          alert(data.msg || 'Password reset failed.');
          return;
        }
        setPendingUserId(null);
        setNewPassword('');
        setConfirmPassword('');
        setShowResetFields(false);
        onResetDone && onResetDone();
        onLogin && onLogin(data.user);
      } catch (err) {
        alert('Reset error: ' + err.message);
      } finally {
        setSubmitting(false);
      }
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/users/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (res.ok) {
        if (data.mustResetPassword) {
          setPendingUserId(data.user._id);
          onFirstLogin && onFirstLogin();
        } else {
          onLogin && onLogin(data.user);
        }
      } else {
        alert(data.msg || 'Login failed');
      }
    } catch (err) {
      alert('Login error: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="form" onSubmit={handleSubmit}>
      <h2>{showResetFields ? 'Reset the temporary password to continue' : 'Login'}</h2>
      {!showResetFields && (
        <>
          <div className="form-group">
            <label>Email Address</label>
            <input
              type="email"
              maxLength={40}
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="username"
            />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>
        </>
      )}
      {showResetFields && (
        <>
          <div className="form-group">
            <label>Set New Password</label>
            <input
              type="password"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              required
              autoComplete="new-password"
            />
          </div>
          <div className="form-group">
            <label>Confirm New Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              required
              autoComplete="new-password"
            />
          </div>
        </>
      )}
      <button type="submit" className="primary-btn" disabled={submitting}>
        {showResetFields ? 'Reset and continue' : 'Login'}
      </button>
    </form>
  );
}

export default LoginForm;
