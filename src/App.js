import React, { useEffect, useState, lazy, Suspense } from 'react';
import './App.css';
import { applyTheme } from './themeUtils';
import AppFooter from './AppFooter';
import OrgNavbar from './OrgNavbar';

const LoginForm = lazy(() => import('./LoginForm'));
const RegisterForm = lazy(() => import('./RegisterForm'));
const FellowCenterSetupForm = lazy(() => import('./FellowCenterSetupForm'));
const ApprovalStatus = lazy(() => import('./ApprovalStatus'));
const ApprovalPanel = lazy(() => import('./ApprovalPanel'));
const AdminDashboard = lazy(() => import('./AdminDashboard'));

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

// ─── Landing page: choose path ────────────────────────────────────────────
function LandingChooser({ onChoosePastor, onChooseMember, onOCFFound }) {
  const [code, setCode] = useState('');
  const [status, setStatus] = useState(null); // null | 'loading' | 'success' | 'error'
  const [message, setMessage] = useState('');
  const isDefaultHost = DEFAULT_HOSTS.has(window.location.hostname);

  const handleSearch = async (e) => {
    e.preventDefault();
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) return;
    setStatus('loading');
    setMessage('');
    try {
      const res = await fetch(`/api/organizations/by-ocf-code?code=${encodeURIComponent(trimmed)}`);
      const data = await res.json();
      if (!res.ok) {
        setStatus('error');
        setMessage('No Church found with that OCF Code.');
        return;
      }
      setStatus('success');
      setMessage(`Opening ${data.name}…`);
      onOCFFound(data);
    } catch {
      setStatus('error');
      setMessage('Failed to find organization. Please try again.');
    }
  };

  return (
    <div style={{ width: '100%', maxWidth: 480, margin: '0 auto', padding: '0 8px' }}>
      {/* OCF Code entry — only shown on the default (home) host */}
      {isDefaultHost && (
        <div style={{ marginBottom: 28 }}>
          <form onSubmit={handleSearch}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'stretch' }}>
              <input
                type="text"
                value={code}
                onChange={e => setCode(e.target.value.replace(/[^a-zA-Z0-9]/g, '').slice(0, 5))}
                placeholder="Enter OCF Code (e.g. AB1CD)"
                maxLength={5}
                style={{
                  flex: 1,
                  padding: '12px 14px',
                  borderRadius: 10,
                  border: '2px solid rgba(255,255,255,0.5)',
                  background: 'rgba(255,255,255,0.95)',
                  fontSize: '1rem',
                  fontWeight: 700,
                  letterSpacing: 3,
                  textTransform: 'uppercase',
                  outline: 'none',
                  color: '#1e3a5f'
                }}
                autoComplete="off"
                spellCheck={false}
              />
              <button
                type="submit"
                disabled={status === 'loading' || code.trim().length === 0}
                style={{
                  padding: '12px 20px',
                  borderRadius: 10,
                  border: 'none',
                  background: '#4169e1',
                  color: '#fff',
                  fontWeight: 800,
                  fontSize: '1rem',
                  cursor: code.trim().length === 0 || status === 'loading' ? 'not-allowed' : 'pointer',
                  opacity: code.trim().length === 0 || status === 'loading' ? 0.6 : 1
                }}
              >
                {status === 'loading' ? '…' : 'Go →'}
              </button>
            </div>
          </form>
          {message && (
            <div style={{
              marginTop: 10,
              padding: '8px 14px',
              borderRadius: 8,
              background: status === 'error' ? 'rgba(198,40,40,0.15)' : 'rgba(46,125,50,0.15)',
              color: status === 'error' ? '#ffcdd2' : '#c8e6c9',
              fontWeight: 600,
              fontSize: '0.9rem'
            }}>
              {message}
            </div>
          )}
          <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.5)', fontSize: '0.78rem', marginTop: 10 }}>
            Enter your church's OCF Code to load its page
          </div>
        </div>
      )}

      <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.85)', marginBottom: 28, fontSize: '1rem' }}>
        Welcome. How would you like to proceed?
      </p>
      <div style={{ display: 'grid', gap: 18 }}>
        {/* Senior Pastor card */}
        <button
          onClick={onChoosePastor}
          style={{
            background: '#fff',
            border: '2px solid rgba(255,255,255,0.5)',
            borderRadius: 12,
            padding: '22px 24px',
            cursor: 'pointer',
            textAlign: 'left',
            boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
            transition: 'transform 0.15s, box-shadow 0.15s'
          }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 28px rgba(0,0,0,0.18)'; }}
          onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.12)'; }}
        >
          <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#1e3a5f', marginBottom: 6 }}>
            I am a Senior Pastor / Visioner
          </div>
          <div style={{ fontSize: '0.875rem', color: '#6b7280', lineHeight: 1.5 }}>
            Register your Church or Commission to access Our Church Fellowship for your organization.
          </div>
        </button>

        {/* Member card */}
        <button
          onClick={onChooseMember}
          style={{
            background: '#fff',
            border: '2px solid rgba(255,255,255,0.5)',
            borderRadius: 12,
            padding: '22px 24px',
            cursor: 'pointer',
            textAlign: 'left',
            boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
            transition: 'transform 0.15s, box-shadow 0.15s'
          }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 28px rgba(0,0,0,0.18)'; }}
          onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.12)'; }}
        >
          <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#1e3a5f', marginBottom: 6 }}>
            I am a Member of a Church
          </div>
          <div style={{ fontSize: '0.875rem', color: '#6b7280', lineHeight: 1.5 }}>
            Log in or register as a member, HF Leader, Branch Pastor, or State Pastor.
          </div>
        </button>
      </div>
    </div>
  );
}

// ─── Setup request success screen ─────────────────────────────────────────
function SetupRequestSuccess({ onBack }) {
  return (
    <div style={{ width: '100%', maxWidth: 480, margin: '0 auto', textAlign: 'center', padding: '0 16px' }}>
      <div style={{ fontSize: 52, marginBottom: 16 }}>✅</div>
      <h2 style={{ color: '#fff', margin: '0 0 12px', fontSize: '1.4rem' }}>Request Submitted!</h2>
      <p style={{ color: 'rgba(255,255,255,0.85)', lineHeight: 1.6, marginBottom: 28 }}>
        Your Our Church Fellowship Setup Request has been received. Our team will review it and get in touch with you
        at the email address you provided. This may take a few business days.
      </p>
      <button
        onClick={onBack}
        className="primary-btn"
        style={{ background: '#fff', color: 'var(--theme-primary)', border: 'none', fontWeight: 700 }}
      >
        Back to Home
      </button>
    </div>
  );
}

// Hosts that are the "home" deployment — not a custom org domain.
// When the app runs on any other hostname, it looks up the org by domain.
const DEFAULT_HOSTS = new Set([
  'localhost',
  '127.0.0.1',
  'hffrontend.vercel.app'
]);

function App() {
  // 'landing' | 'login' | 'register' | 'pastor-setup' | 'pastor-success'
  const [screen, setScreen] = useState('landing');
  const [dialog, setDialog] = useState({ open: false, email: '', tempPassword: '' });
  const [loginAutofill, setLoginAutofill] = useState(null);
  const [showReset, setShowReset] = useState(false);
  const [user, setUser] = useState(null);
  const [org, setOrg] = useState(null); // organization linked to Admin user

  // Fetch org when an Admin logs in or org is updated
  const fetchOrg = async (email) => {
    try {
      const res = await fetch(`/api/organizations/mine?email=${encodeURIComponent(email)}`);
      if (res.ok) {
        const data = await res.json();
        setOrg(data);
        // Apply the org's saved color theme
        applyTheme(data.themeKey || 'default');
      }
    } catch { /* no org yet */ }
  };

  // Re-apply org theme whenever org changes (e.g. Admin updates it in settings)
  useEffect(() => {
    if (org?.themeKey) applyTheme(org.themeKey);
  }, [org]);

  // On mount: if the app is opened via a custom org domain (not the default Vercel
  // host), fetch that org's branding so every visitor — including unauthenticated
  // members — sees the correct logo, name, and color theme before logging in.
  // This runs once and does NOT interfere with Admin login (which also calls
  // fetchOrg on success, overwriting with the same or an updated org object).
  useEffect(() => {
    const hostname = window.location.hostname;
    if (DEFAULT_HOSTS.has(hostname)) return; // on the default host — nothing to do

    fetch(`/api/organizations/by-domain?hostname=${encodeURIComponent(hostname)}`)
      .then(r => (r.ok ? r.json() : null))
      .then(data => {
        if (data) {
          setOrg(data);
          applyTheme(data.themeKey || 'default');
        }
      })
      .catch(() => { /* custom domain lookup failed — use default branding */ });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleLoginSuccess = (userObj) => {
    setUser(userObj);
    setLoginAutofill(null);
    setShowReset(false);
    setScreen('landing');
    if (userObj.role === 'Admin') fetchOrg(userObj.email);
  };

  const handleLogout = () => {
    setUser(null);
    setOrg(null);
    setLoginAutofill(null);
    setShowReset(false);
    setScreen('landing');
    applyTheme('default');
  };

  const renderContent = () => {
    // ── Logged in ──
    if (user) {
      const isAdminRole = ['Branch Pastor', 'State Pastor', 'Admin', 'Super Admin'].includes(user.role);
      return (
        <div style={{ background: '#fff', color: '#222', padding: 24, borderRadius: 8, maxWidth: isAdminRole ? 1100 : 400, width: '100%' }}>
          {/* Org branding header — shown only for Admins with a linked org */}
          {org && user.role === 'Admin' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20, padding: '14px 18px', background: 'var(--theme-soft-bg)', border: '1px solid var(--theme-soft-border)', borderRadius: 10 }}>
              {org.logo && (
                <img
                  src={org.logo}
                  alt={org.name}
                  style={{ width: 56, height: 56, objectFit: 'contain', borderRadius: 8, border: '1px solid var(--theme-soft-border)', background: '#fff', padding: 4, flexShrink: 0 }}
                />
              )}
              <div>
                <div style={{ fontWeight: 800, fontSize: '1.15rem', color: 'var(--theme-text-strong)' }}>{org.name}</div>
                {org.address && <div style={{ fontSize: '0.82rem', color: '#6b7280', marginTop: 2 }}>{org.address}</div>}
                <div style={{ fontSize: '0.78rem', color: '#9ca3af', marginTop: 1 }}>Our Church Fellowship Admin</div>
                {org.organization_id && (
                  <div style={{ marginTop: 6, display: 'inline-block', background: 'var(--theme-primary)', color: '#fff', borderRadius: 6, padding: '2px 10px', fontSize: '0.82rem', fontWeight: 700, letterSpacing: 2 }}>
                    OCF Code: {org.organization_id}
                  </div>
                )}
              </div>
            </div>
          )}

          <h2 style={{ marginTop: org ? 0 : undefined }}>
            {user.role === 'Super Admin' ? 'Super Admin Dashboard' : 'Member Dashboard'}
          </h2>
          <ApprovalStatus userId={user._id} />
          <div style={{ marginTop: 16 }}>
            <b>Name:</b> {user.name}<br />
            <b>Email:</b> {user.email}<br />
            <b>Role:</b> {user.role}
            {user.organization_id && !org && user.role !== 'HF Leader' && (
              <div style={{ marginTop: 10 }}>
                <span style={{ display: 'inline-block', background: 'var(--theme-primary)', color: '#fff', borderRadius: 6, padding: '3px 12px', fontSize: '0.82rem', fontWeight: 700, letterSpacing: 2 }}>
                  OCF Code: {user.organization_id.toUpperCase()}
                </span>
              </div>
            )}
          </div>
          {/* Show approval panel only when the approver role has been approved */}
          {['Branch Pastor', 'State Pastor', 'Admin'].includes(user.role) && user.approval?.status === 'approved' && (
            <ApprovalPanel approver={user} onAction={() => {}} />
          )}
          {/* Admin & Super Admin dashboard */}
          {isAdminRole && (user.role === 'Super Admin' || user.approval?.status === 'approved') && (
            <AdminDashboard user={user} org={org} onOrgUpdated={(updatedOrg) => setOrg(updatedOrg)} />
          )}
          <button className="link-btn" style={{ marginTop: 16 }} onClick={handleLogout}>Logout</button>
        </div>
      );
    }

    // ── Senior Pastor — Fellow Center Setup form ──
    if (screen === 'pastor-setup') {
      return (
        <FellowCenterSetupForm
          onBack={() => setScreen('landing')}
          onSubmitted={() => setScreen('pastor-success')}
        />
      );
    }

    // ── Setup request success ──
    if (screen === 'pastor-success') {
      return <SetupRequestSuccess onBack={() => setScreen('landing')} />;
    }

    // ── Member register ──
    if (screen === 'register') {
      return (
        <RegisterForm
          onBack={() => setScreen('login')}
          onRegistered={({ email, tempPassword }) => {
            setDialog({ open: true, email, tempPassword });
            setScreen('login');
          }}
        />
      );
    }

    // ── Member login ──
    if (screen === 'login') {
      return (
        <>
          <LoginForm
            autofill={loginAutofill}
            onFirstLogin={() => setShowReset(true)}
            onLogin={handleLoginSuccess}
            showReset={showReset}
            onResetDone={() => setShowReset(false)}
          />
          <div style={{ marginTop: '1.5rem' }}>
            <span>Don't have an account?{' '}
              <button className="link-btn" onClick={() => setScreen('register')}>
                Register
              </button>
            </span>
          </div>
          <div style={{ marginTop: '0.75rem' }}>
            <button className="link-btn" onClick={() => setScreen('landing')} style={{ color: 'rgba(255,255,255,0.75)' }}>
              ← Back
            </button>
          </div>
        </>
      );
    }

    // ── Default: landing chooser ──
    return (
      <LandingChooser
        onChoosePastor={() => setScreen('pastor-setup')}
        onChooseMember={() => setScreen('login')}
        onOCFFound={(data) => {
          setOrg(data);
          applyTheme(data.themeKey || 'default');
        }}
      />
    );
  };

  return (
    <div className="App">
      <OrgNavbar org={org} />
      <header className="App-header">
        <Suspense fallback={<div style={{ color: '#fff', opacity: 0.8 }}>Loading...</div>}>
        {/* When accessed via a custom org domain, replace the default logo/title
            with the organization's own branding. On the default host this section
            is hidden and the generic logo below shows instead. */}
        {org && !DEFAULT_HOSTS.has(window.location.hostname) ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 8, gap: 8 }}>
            {org.logo && (
              <img
                src={org.logo}
                alt={org.name}
                style={{ width: 72, height: 72, objectFit: 'contain', borderRadius: 12, background: 'rgba(255,255,255,0.15)', padding: 6 }}
              />
            )}
            <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800 }}>{org.name}</h1>
            {org.address && (
              <p style={{ margin: 0, fontSize: '0.82rem', opacity: 0.75 }}>{org.address}</p>
            )}
          </div>
        ) : (
          <>
            <img src={process.env.PUBLIC_URL + '/OCF-logo.png'} alt="Our Church Fellowship Logo" className="App-logo" />
            <h1>Our Church Fellowship</h1>
          </>
        )}

        {renderContent()}

        <Dialog open={dialog.open} onClose={() => setDialog({ ...dialog, open: false })}>
          <h3>Registration Submitted</h3>
          <p style={{ color: '#1b5e20' }}>Your registration has been submitted and is pending approval.</p>
          <p style={{ color: '#6b7280' }}>You can login with the following temporary credentials:</p>
          <div style={{ background: '#f7f7f7', padding: 12, borderRadius: 6, margin: '12px 0' }}>
            <div><b>Username (Email):</b> {dialog.email}</div>
            <div><b>Temporary Password:</b> {dialog.tempPassword}</div>
          </div>
          <button
            className="primary-btn"
            onClick={() => {
              setDialog({ ...dialog, open: false });
              setLoginAutofill({ email: dialog.email, password: dialog.tempPassword });
              setTimeout(() => alert('Username and temporary password have been autofilled. Please login.'), 100);
            }}
            style={{ marginTop: 12 }}
          >
            Login
          </button>
        </Dialog>
        </Suspense>
      </header>
      <AppFooter org={org} />
    </div>
  );
}

export default App;
