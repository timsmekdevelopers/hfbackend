import React, { useEffect, useState } from 'react';
import './App.css';
import LoginForm from './LoginForm';
import RegisterForm from './RegisterForm';
import FellowCenterSetupForm from './FellowCenterSetupForm';
import ApprovalStatus from './ApprovalStatus';
import ApprovalPanel from './ApprovalPanel';
import AdminDashboard from './AdminDashboard';
import { applyTheme } from './SettingsPanel';
import AppFooter from './AppFooter';
import OrgNavbar from './OrgNavbar';

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
function LandingChooser({ onChoosePastor, onChooseMember }) {
  return (
    <div style={{ width: '100%', maxWidth: 480, margin: '0 auto', padding: '0 8px' }}>
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
            Register your Church or Commission and request a dedicated Fellow Center for your organization.
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
        Your Fellow Center Setup Request has been received. Our team will review it and get in touch with you
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
                <div style={{ fontSize: '0.78rem', color: '#9ca3af', marginTop: 1 }}>Fellow Center Admin</div>
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
        <div style={{ background: '#fff', borderRadius: 12, padding: '28px 24px', width: '100%', maxWidth: 580, overflowY: 'auto', maxHeight: '85vh' }}>
          <FellowCenterSetupForm
            onBack={() => setScreen('landing')}
            onSubmitted={() => setScreen('pastor-success')}
          />
        </div>
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
      />
    );
  };

  return (
    <div className="App">
      <OrgNavbar org={org} />
      <header className="App-header">
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
            <img src={process.env.PUBLIC_URL + '/smhos-logo.png'} alt="Our Church Fellowship Logo" className="App-logo" />
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
      </header>
      <AppFooter org={org} />
    </div>
  );
}

export default App;
