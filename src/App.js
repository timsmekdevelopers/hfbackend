import React, { useState } from 'react';
import './App.css';
import LoginForm from './LoginForm';
import RegisterForm from './RegisterForm';
import ApprovalStatus from './ApprovalStatus';
import ApprovalPanel from './ApprovalPanel';

function Dialog({ open, onClose, children }) {
  if (!open) return null;
  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ background: '#fff', color: '#222', borderRadius: 8, padding: 32, minWidth: 320, boxShadow: '0 2px 12px rgba(0,0,0,0.15)' }}>
        {children}
        <div style={{ marginTop: 24, textAlign: 'right' }}>
          <button className="primary-btn" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}


function App() {
  const [showRegister, setShowRegister] = useState(false);
  const [dialog, setDialog] = useState({ open: false, email: '', tempPassword: '' });
  const [loginAutofill, setLoginAutofill] = useState(null); // { email, password }
  const [showReset, setShowReset] = useState(false);
  const [user, setUser] = useState(null); // user object after login

  return (
    <div className="App">
      <header className="App-header">
        <img src={process.env.PUBLIC_URL + '/smhos-logo.png'} alt="SMHOS Logo" className="App-logo" />
        <h1>Home Fellowship App</h1>
        {user ? (
          <div style={{ background: '#fff', color: '#222', padding: 24, borderRadius: 8, maxWidth: 400 }}>
            <h2>Member Dashboard</h2>
            <ApprovalStatus userId={user._id} />
            <div style={{ marginTop: 16 }}>
              <b>Name:</b> {user.name}<br />
              <b>Email:</b> {user.email}<br />
              <b>Role:</b> {user.role}
            </div>
            {/* Show approval panel for approvers only */}
            {['Branch Pastor', 'State Pastor', 'Admin'].includes(user.role) && (
              <ApprovalPanel approver={user} onAction={() => {}} />
            )}
            <button className="link-btn" style={{ marginTop: 16 }} onClick={() => setUser(null)}>Logout</button>
          </div>
        ) : !showRegister ? (
          <>
            <LoginForm
              autofill={loginAutofill}
              onFirstLogin={() => setShowReset(true)}
              onLogin={userObj => setUser(userObj)}
              showReset={showReset}
              onResetDone={() => setShowReset(false)}
            />
            <div style={{ marginTop: '1.5rem' }}>
              <span>Don't have an account?{' '}
                <button className="link-btn" onClick={() => setShowRegister(true)}>
                  Register
                </button>
              </span>
            </div>
          </>
        ) : (
          <RegisterForm
            onBack={() => setShowRegister(false)}
            onRegistered={({ email, tempPassword }) => setDialog({ open: true, email, tempPassword })}
          />
        )}
        <Dialog open={dialog.open} onClose={() => setDialog({ ...dialog, open: false })}>
          <h3>Registration Submitted</h3>
          <p>Your registration has been submitted and is pending approval.</p>
          <p>You can login with the following temporary credentials:</p>
          <div style={{ background: '#f7f7f7', padding: 12, borderRadius: 6, margin: '12px 0' }}>
            <div><b>Username (Email):</b> {dialog.email}</div>
            <div><b>Temporary Password:</b> {dialog.tempPassword}</div>
          </div>
          <button
            className="primary-btn"
            onClick={() => {
              setDialog({ ...dialog, open: false });
              setShowRegister(false);
              setLoginAutofill({ email: dialog.email, password: dialog.tempPassword });
              setTimeout(() => alert('Username and temporary password have been autofilled. Please login.'), 100);
            }}
            style={{ marginTop: 12 }}
          >
            Login
          </button>
        </Dialog>
      </header>
    </div>
  );
}

export default App;
