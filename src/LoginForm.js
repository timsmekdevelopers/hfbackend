import React, { useState, useEffect } from 'react';

function LoginForm({ autofill, onFirstLogin, onLogin, showReset, onResetDone }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showResetFields, setShowResetFields] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

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
      // Simulate password reset (call backend in real app)
      alert('Password reset successful!');
      setShowResetFields(false);
      onResetDone && onResetDone();
      onLogin && onLogin();
      return;
    }
    try {
      const res = await fetch('/api/users/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (res.ok) {
        // Simulate first login detection (in real app, check backend flag)
        if (password.length === 8) { // temp password is 8 chars
          onFirstLogin && onFirstLogin();
        } else {
          onLogin && onLogin(data.user);
        }
      } else {
        alert(data.msg || 'Login failed');
      }
    } catch (err) {
      alert('Login error: ' + err.message);
    }
  };

  return (
    <form className="form" onSubmit={handleSubmit}>
      <h2>Login</h2>
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
      <button type="submit" className="primary-btn">{showResetFields ? 'Reset Password' : 'Login'}</button>
    </form>
  );
}

export default LoginForm;
