import React, { useEffect, useMemo, useState } from 'react';
import { Country, State, City } from 'country-state-city';
import { useTranslation } from './i18n';

const THEME_STORAGE_KEY = 'hf_theme';

function hexToRgb(hex) {
  const normalized = String(hex || '').replace('#', '');
  const safe = normalized.length === 3
    ? normalized.split('').map((char) => char + char).join('')
    : normalized;

  const int = Number.parseInt(safe, 16);
  return {
    r: (int >> 16) & 255,
    g: (int >> 8) & 255,
    b: int & 255
  };
}

function rgba(hex, alpha) {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export const THEMES = [
  { key: 'default',   label: 'Default Blue', primary: '#4169e1', dark: '#27408b', sidebar: '#2c3e6b' },
  { key: 'purple',    label: 'Purple',       primary: '#7b2d8b', dark: '#561e61', sidebar: '#3b1045' },
  { key: 'orange',    label: 'Orange',       primary: '#e67e22', dark: '#b95c0a', sidebar: '#7d3a0a' },
  { key: 'darkpink',  label: 'Dark Pink',    primary: '#c2185b', dark: '#880e4f', sidebar: '#6a0636' },
  { key: 'green',     label: 'Green',        primary: '#2e7d32', dark: '#1b5e20', sidebar: '#1a3d1b' },
  { key: 'blue',      label: 'Blue',         primary: '#1565c0', dark: '#0d47a1', sidebar: '#0a2d6e' },
  { key: 'darkblue',  label: 'Dark Blue',    primary: '#0d1b4b', dark: '#07102b', sidebar: '#060d20' },
  { key: 'black',     label: 'Black',        primary: '#111111', dark: '#000000', sidebar: '#1a1a1a' },
  { key: 'gold',      label: 'Gold',         primary: '#b8860b', dark: '#7d5c08', sidebar: '#4b3705' },
  { key: 'gray',      label: 'Gray',         primary: '#607d8b', dark: '#455a64', sidebar: '#2e3d45' }
];

export function applyTheme(key) {
  const theme = THEMES.find(t => t.key === key) || THEMES[0];
  document.documentElement.style.setProperty('--theme-primary', theme.primary);
  document.documentElement.style.setProperty('--theme-primary-dark', theme.dark);
  document.documentElement.style.setProperty('--theme-sidebar-bg', theme.sidebar);
  document.documentElement.style.setProperty('--theme-soft-bg', rgba(theme.primary, 0.08));
  document.documentElement.style.setProperty('--theme-soft-border', rgba(theme.primary, 0.24));
  document.documentElement.style.setProperty('--theme-text-strong', theme.dark);
  document.documentElement.style.setProperty('--theme-text-muted', rgba(theme.dark, 0.75));
  document.documentElement.style.setProperty('--theme-surface', '#ffffff');
  try { localStorage.setItem(THEME_STORAGE_KEY, key); } catch (_) {}
}

function SettingsPanel({ user, onClose, onUserUpdated, languageOptions, locale, setLocale, org: orgProp, onOrgUpdated, inline }) {
  const { t } = useTranslation();

  // Profile state
  const [name, setName] = useState(user.name || '');
  const [phone, setPhone] = useState(user.phone || '');
  const [address, setAddress] = useState(user.address || '');
  const [country, setCountry] = useState('');
  const [stateCode, setStateCode] = useState('');
  const [city, setCity] = useState(user.city || '');
  const [branchAddress, setBranchAddress] = useState(user.branchAddress || '');
  const [stateHqAddress, setStateHqAddress] = useState(user.stateHqAddress || '');
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');

  // Theme state
  const [activeTheme, setActiveTheme] = useState(() => {
    try { return localStorage.getItem(THEME_STORAGE_KEY) || 'default'; } catch (_) { return 'default'; }
  });

  const countries = useMemo(() => Country.getAllCountries().sort((a, b) => a.name.localeCompare(b.name)), []);
  const selectedCountry = countries.find(c => c.isoCode === country);
  const states = useMemo(() => (country ? State.getStatesOfCountry(country).sort((a, b) => a.name.localeCompare(b.name)) : []), [country]);
  const selectedState = states.find(s => s.isoCode === stateCode);
  const cities = useMemo(() => ((country && stateCode) ? City.getCitiesOfState(country, stateCode).sort((a, b) => a.name.localeCompare(b.name)) : []), [country, stateCode]);

  const handleCountryChange = e => { setCountry(e.target.value); setStateCode(''); setCity(''); };
  const handleStateChange = e => { setStateCode(e.target.value); setCity(''); };

  const persistPreferences = async (updates) => {
    try {
      const res = await fetch(`/api/users/${user._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      const data = await res.json();
      if (res.ok) {
        onUserUpdated && onUserUpdated(data.user);
      }
    } catch {
      // Keep optimistic UI changes even if persistence fails.
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSaveMsg('');
    try {
      const body = {
        name: name.trim(),
        phone: phone.trim(),
        address: address.trim(),
        city: city.trim()
      };
      if (selectedCountry) body.country = selectedCountry.name;
      if (selectedState) body.state = selectedState.name;
      if (user.role === 'Branch Pastor') body.branchAddress = branchAddress.trim();
      if (user.role === 'State Pastor') body.stateHqAddress = stateHqAddress.trim();

      const res = await fetch(`/api/users/${user._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (res.ok) {
        setSaveMsg(t('profileUpdated'));
        onUserUpdated && onUserUpdated(data.user);
      } else {
        setSaveMsg(data.msg || t('profileUpdateFailed'));
      }
    } catch (err) {
      setSaveMsg(t('profileUpdateFailed'));
    }
    setSaving(false);
  };

  const handleThemeChange = (key) => {
    setActiveTheme(key);
    applyTheme(key);
    persistPreferences({ themePreference: key });
  };

  const handleLocaleChange = (nextLocale) => {
    setLocale(nextLocale);
    persistPreferences({ localePreference: nextLocale });
  };

  const inputStyle = {
    width: '100%',
    padding: '0.45rem 0.7rem',
    border: '1px solid #ccc',
    borderRadius: 5,
    fontSize: '0.95rem',
    marginBottom: 4,
    boxSizing: 'border-box'
  };

  const labelStyle = { fontWeight: 600, fontSize: '0.85rem', marginBottom: 3, display: 'block', color: '#444' };

  // When rendered inline (as a tab), skip the fixed overlay wrapper
  if (inline) {
    return (
      <div style={{ padding: '4px 0' }}>
        {/* ── Color Theme (personal) ── */}
        <section style={{ marginBottom: 28 }}>
          <h3 style={{ margin: '0 0 12px', fontSize: '1rem', color: '#222' }}>{t('colorTheme')}</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            {THEMES.map(theme => (
              <button
                key={theme.key}
                title={theme.label}
                onClick={() => handleThemeChange(theme.key)}
                style={{
                  width: 32, height: 32, borderRadius: '50%',
                  background: theme.primary,
                  border: activeTheme === theme.key ? '3px solid #333' : '2px solid #ccc',
                  cursor: 'pointer',
                  outline: activeTheme === theme.key ? '2px solid #fff' : 'none',
                  outlineOffset: '-4px',
                  boxShadow: activeTheme === theme.key ? '0 0 0 2px #555' : 'none'
                }}
                aria-label={theme.label}
                aria-pressed={activeTheme === theme.key}
              />
            ))}
          </div>
        </section>

        {/* ── Profile form ── */}
        <section style={{ marginBottom: 28 }}>
          <h3 style={{ margin: '0 0 12px', fontSize: '1rem', color: '#222' }}>{t('editProfile')}</h3>
          <form onSubmit={handleSaveProfile}>
            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>{t('name')}</label>
              <input style={inputStyle} value={name} onChange={e => setName(e.target.value)} maxLength={80} />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>{t('phone')}</label>
              <input style={inputStyle} value={phone} onChange={e => setPhone(e.target.value)} maxLength={40} />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>{t('address')}</label>
              <input style={inputStyle} value={address} onChange={e => setAddress(e.target.value)} maxLength={160} />
            </div>
            {saveMsg && <div style={{ marginBottom: 10, color: saveMsg === t('profileUpdated') ? '#2e7d32' : '#c62828', fontSize: '0.9rem' }}>{saveMsg}</div>}
            <button type="submit" className="primary-btn" disabled={saving} style={{ width: '100%' }}>
              {saving ? '…' : t('saveChanges')}
            </button>
          </form>
        </section>

        {/* ── Organization Settings (Admin only) ── */}
        {user.role === 'Admin' && <OrgSettingsSection user={user} labelStyle={labelStyle} inputStyle={inputStyle} onOrgUpdated={onOrgUpdated} externalOrg={orgProp} />}
      </div>
    );
  }

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end', zIndex: 2000 }}>
      <div style={{ background: '#fff', width: 420, maxWidth: '100vw', height: '100vh', overflowY: 'auto', boxShadow: '-4px 0 24px rgba(0,0,0,0.18)', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid #e0e0e0', background: 'var(--theme-primary)', color: '#fff' }}>
          <span style={{ fontWeight: 700, fontSize: '1.1rem' }}>⚙ {t('settingsTitle')}</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#fff', fontSize: 22, cursor: 'pointer', lineHeight: 1 }} aria-label="Close settings">&times;</button>
        </div>

        <div style={{ padding: '20px 24px', flex: 1 }}>
          {/* ── Color Theme ── */}
          <section style={{ marginBottom: 28 }}>
            <h3 style={{ margin: '0 0 12px', fontSize: '1rem', color: '#222' }}>{t('colorTheme')}</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              {THEMES.map(theme => (
                <button
                  key={theme.key}
                  title={theme.label}
                  onClick={() => handleThemeChange(theme.key)}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: '50%',
                    background: theme.primary,
                    border: activeTheme === theme.key ? '3px solid #333' : '2px solid #ccc',
                    cursor: 'pointer',
                    outline: activeTheme === theme.key ? '2px solid #fff' : 'none',
                    outlineOffset: '-4px',
                    boxShadow: activeTheme === theme.key ? '0 0 0 2px #555' : 'none',
                    transition: 'border 0.15s'
                  }}
                  aria-label={theme.label}
                  aria-pressed={activeTheme === theme.key}
                />
              ))}
            </div>
            <div style={{ marginTop: 8, fontSize: '0.85rem', color: '#555' }}>
              {THEMES.find(t => t.key === activeTheme)?.label}
            </div>
          </section>

          {/* ── Language ── */}
          <section style={{ marginBottom: 28 }}>
            <h3 style={{ margin: '0 0 10px', fontSize: '1rem', color: '#222' }}>{t('languageSettings')}</h3>
            <select
              value={locale}
              onChange={e => handleLocaleChange(e.target.value)}
              style={{ ...inputStyle, marginBottom: 0 }}
            >
              {languageOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </section>

          {/* ── Profile ── */}
          <section>
            <h3 style={{ margin: '0 0 14px', fontSize: '1rem', color: '#222' }}>{t('editProfile')}</h3>
            <form onSubmit={handleSaveProfile}>
              <div style={{ marginBottom: 12 }}>
                <label style={labelStyle}>{t('fullName')}</label>
                <input style={inputStyle} value={name} onChange={e => setName(e.target.value)} />
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={labelStyle}>{t('phoneNo')}</label>
                <input style={inputStyle} value={phone} onChange={e => setPhone(e.target.value)} />
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={labelStyle}>{t('residentialAddress')}</label>
                <input style={inputStyle} value={address} onChange={e => setAddress(e.target.value)} />
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={labelStyle}>{t('country')}</label>
                <select style={inputStyle} value={country} onChange={handleCountryChange}>
                  <option value="">{user.country || t('selectCountry')}</option>
                  {countries.map(c => <option key={c.isoCode} value={c.isoCode}>{c.name}</option>)}
                </select>
              </div>
              {states.length > 0 && (
                <div style={{ marginBottom: 12 }}>
                  <label style={labelStyle}>{t('state')}</label>
                  <select style={inputStyle} value={stateCode} onChange={handleStateChange}>
                    <option value="">{user.state || t('selectState')}</option>
                    {states.map(s => <option key={s.isoCode} value={s.isoCode}>{s.name}</option>)}
                  </select>
                </div>
              )}
              {cities.length > 0 && (
                <div style={{ marginBottom: 12 }}>
                  <label style={labelStyle}>{t('cityCountyLga')}</label>
                  <select style={inputStyle} value={city} onChange={e => setCity(e.target.value)}>
                    <option value="">{user.city || t('selectCityCountyLga')}</option>
                    {cities.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                  </select>
                </div>
              )}
              {user.role === 'Branch Pastor' && (
                <div style={{ marginBottom: 12 }}>
                  <label style={labelStyle}>{t('addressOfBranch')}</label>
                  <input style={inputStyle} value={branchAddress} onChange={e => setBranchAddress(e.target.value)} />
                </div>
              )}
              {user.role === 'State Pastor' && (
                <div style={{ marginBottom: 12 }}>
                  <label style={labelStyle}>{t('addressOfStateHeadquarters')}</label>
                  <input style={inputStyle} value={stateHqAddress} onChange={e => setStateHqAddress(e.target.value)} />
                </div>
              )}
              {saveMsg && (
                <div style={{ marginBottom: 10, color: saveMsg === t('profileUpdated') ? '#2e7d32' : '#c62828', fontSize: '0.9rem' }}>{saveMsg}</div>
              )}
              <button type="submit" className="primary-btn" disabled={saving} style={{ width: '100%' }}>
                {saving ? '…' : t('saveChanges')}
              </button>
            </form>
          </section>

          {/* ── Organization Settings (Admin only) ── */}
          {user.role === 'Admin' && <OrgSettingsSection user={user} labelStyle={labelStyle} inputStyle={inputStyle} onOrgUpdated={onOrgUpdated} externalOrg={orgProp} />}
        </div>
      </div>
    </div>
  );
}

// ─── Organization settings sub-section ────────────────────────────────────
function OrgSettingsSection({ user, labelStyle, inputStyle, onOrgUpdated, externalOrg }) {
  const [org, setOrgLocal] = useState(externalOrg || null);
  const [loading, setLoading] = useState(!externalOrg);
  const [domain, setDomain] = useState(externalOrg?.customDomain || '');
  const [logo, setLogo] = useState(externalOrg?.logo || '');
  const [orgThemeKey, setOrgThemeKey] = useState(externalOrg?.themeKey || 'default');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const logoInputRef = React.useRef();

  // Navbar & footer link management
  const [navbarItems, setNavbarItems] = useState(externalOrg?.navbarItems || []);
  const [footerLinks, setFooterLinks] = useState(externalOrg?.footerLinks || []);
  const [newNavLabel, setNewNavLabel] = useState('');
  const [newNavHref, setNewNavHref] = useState('');
  const [newFooterLabel, setNewFooterLabel] = useState('');
  const [newFooterHref, setNewFooterHref] = useState('');

  // ── Migration state ──
  // 'idle' | 'need-new-uri' | 'validating' | 'validated' | 'migrating' | 'done' | 'error'
  const [migrateStep, setMigrateStep] = useState('idle');
  const [newDbUri, setNewDbUri] = useState('');
  const [migrateMsg, setMigrateMsg] = useState('');
  const [firstTimeUri, setFirstTimeUri] = useState(externalOrg?.dedicatedDatabaseUri || '');

  // ── Domain verification state ──
  // 'idle' | 'starting' | 'token-ready' | 'checking' | 'verified' | 'error' | 'changing'
  const [domainVerifyStep, setDomainVerifyStep] = useState(
    externalOrg?.customDomainVerified ? 'verified' : 'idle'
  );
  const [domainToken, setDomainToken] = useState('');
  const [domainVerifyMsg, setDomainVerifyMsg] = useState('');

  // Sync if parent org updates
  useEffect(() => {
    if (externalOrg) {
      setOrgLocal(externalOrg);
      setDomain(externalOrg.customDomain || '');
      setLogo(externalOrg.logo || '');
      setOrgThemeKey(externalOrg.themeKey || 'default');
      setFirstTimeUri(externalOrg.dedicatedDatabaseUri || '');
      setDomainVerifyStep(externalOrg.customDomainVerified ? 'verified' : 'idle');
      setDomainToken('');
      setDomainVerifyMsg('');
      setNavbarItems(externalOrg.navbarItems || []);
      setFooterLinks(externalOrg.footerLinks || []);
    }
  }, [externalOrg]);

  useEffect(() => {
    if (externalOrg) return;
    const load = async () => {
      try {
        const res = await fetch(`/api/organizations/mine?email=${encodeURIComponent(user.email)}`);
        if (res.ok) {
          const data = await res.json();
          setOrgLocal(data);
          setDomain(data.customDomain || '');
          setLogo(data.logo || '');
          setOrgThemeKey(data.themeKey || 'default');
          setFirstTimeUri(data.dedicatedDatabaseUri || '');
        }
      } catch { /* no org yet */ }
      setLoading(false);
    };
    load();
  }, [user.email, externalOrg]);

  const handleLogoFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { alert('Logo must be smaller than 2 MB.'); return; }
    const reader = new FileReader();
    reader.onload = () => setLogo(reader.result);
    reader.readAsDataURL(file);
  };

  const handleThemePreview = (key) => {
    setOrgThemeKey(key);
    applyTheme(key);
  };

  // ── Domain verification handlers ──
  const handleStartVerify = async () => {
    setDomainVerifyStep('starting');
    setDomainVerifyMsg('');
    try {
      const res = await fetch(`/api/organizations/${org._id}/verify-domain`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start' })
      });
      const data = await res.json();
      if (res.ok) {
        setDomainToken(data.token);
        setDomainVerifyStep('token-ready');
      } else {
        setDomainVerifyMsg(data.msg || 'Could not generate token.');
        setDomainVerifyStep('error');
      }
    } catch {
      setDomainVerifyMsg('Network error. Please try again.');
      setDomainVerifyStep('error');
    }
  };

  const handleCheckDns = async () => {
    setDomainVerifyStep('checking');
    setDomainVerifyMsg('Checking DNS records…');
    try {
      const res = await fetch(`/api/organizations/${org._id}/verify-domain`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'check' })
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setOrgLocal(data.organization);
        onOrgUpdated && onOrgUpdated(data.organization);
        setDomainVerifyStep('verified');
        setDomainVerifyMsg(data.msg);
      } else {
        setDomainVerifyStep('error');
        setDomainVerifyMsg(data.msg || 'Verification failed. Check your DNS records and try again.');
      }
    } catch {
      setDomainVerifyStep('error');
      setDomainVerifyMsg('Network error. Please try again.');
    }
  };

  // ── Validate new URI (quick connect test, no data touched) ──
  const handleValidateUri = async () => {
    if (!newDbUri.trim()) return;
    setMigrateStep('validating');
    setMigrateMsg('Testing connection to the new database…');
    try {
      const res = await fetch(`/api/organizations/${org._id}/validate-db`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newUri: newDbUri.trim() })
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setMigrateStep('validated');
        setMigrateMsg('Connection verified. Ready to migrate your data.');
      } else {
        setMigrateStep('error');
        setMigrateMsg(data.msg || 'Could not reach the new database. Check your URI and try again.');
      }
    } catch {
      setMigrateStep('error');
      setMigrateMsg('Network error while testing connection.');
    }
  };

  // ── Run the full migration ──
  const handleMigrate = async () => {
    setMigrateStep('migrating');
    setMigrateMsg('Migration in progress… copying your data to the new cluster. Do not close this window.');
    try {
      const res = await fetch(`/api/organizations/${org._id}/migrate-db`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newUri: newDbUri.trim() })
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setOrgLocal(data.organization);
        onOrgUpdated && onOrgUpdated(data.organization);
        setFirstTimeUri(data.organization.dedicatedDatabaseUri || '');
        setMigrateStep('done');
        setMigrateMsg(data.msg);
        setNewDbUri('');
      } else {
        setMigrateStep('error');
        setMigrateMsg(data.msg || 'Migration failed. Your data is safe on the original cluster.');
      }
    } catch {
      setMigrateStep('error');
      setMigrateMsg('Network error during migration. Your data is safe on the original cluster.');
    }
  };

  // ── First-time URI activation (no existing URI — just save directly) ──
  const handleFirstTimeUri = async () => {
    if (!firstTimeUri.trim()) return;
    setSaving(true);
    setMsg('');
    try {
      const res = await fetch(`/api/organizations/${org._id}/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dedicatedDatabaseUri: firstTimeUri.trim() })
      });
      const data = await res.json();
      if (res.ok) {
        setOrgLocal(data.organization);
        onOrgUpdated && onOrgUpdated(data.organization);
        setMsg('Database URI saved.');
      } else {
        setMsg(data.msg || 'Save failed.');
      }
    } catch {
      setMsg('Network error.');
    }
    setSaving(false);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!org) return;
    setSaving(true);
    setMsg('');
    try {
      const res = await fetch(`/api/organizations/${org._id}/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customDomain: domain, themeKey: orgThemeKey, logo, navbarItems, footerLinks })
      });
      const data = await res.json();
      if (res.ok) {
        setOrgLocal(data.organization);
        setMsg('Organization settings saved.');
        onOrgUpdated && onOrgUpdated(data.organization);
      } else {
        setMsg(data.msg || 'Save failed.');
      }
    } catch {
      setMsg('Network error.');
    }
    setSaving(false);
  };

  const sectionHeadStyle = { margin: '0 0 14px', fontSize: '1rem', color: '#222', fontWeight: 700 };
  const infoRow = { display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: '0.875rem' };
  const hasActiveUri = Boolean(org?.dedicatedDatabaseUri);

  const migStatusColor = {
    idle: '#6b7280', need_new_uri: '#6b7280',
    validating: '#92400e', validated: '#1d4ed8',
    migrating: '#7c3aed', done: '#15803d', error: '#b91c1c'
  };

  if (loading) return null;

  return (
    <section style={{ marginTop: 28, paddingTop: 20, borderTop: '1px solid #e0e0e0' }}>
      <h3 style={sectionHeadStyle}>Organization Settings</h3>

      {!org ? (
        <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>
          No organization linked to your account yet. Your Fellow Center Setup Request may still be under review.
        </p>
      ) : (
        <form onSubmit={handleSave}>
          {/* ── Read-only info ── */}
          <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8, padding: '12px 16px', marginBottom: 18, fontSize: '0.85rem' }}>
            <div style={infoRow}><span style={{ color: '#6b7280' }}>Church / Commission</span><strong>{org.name}</strong></div>
            <div style={infoRow}><span style={{ color: '#6b7280' }}>Organization ID</span><code style={{ fontSize: '0.78rem', background: '#e5e7eb', padding: '1px 5px', borderRadius: 3 }}>{org.organization_id}</code></div>
            <div style={infoRow}><span style={{ color: '#6b7280' }}>Status</span>
              <span style={{ color: org.status === 'active' ? '#15803d' : org.status === 'suspended' ? '#b91c1c' : '#92400e', fontWeight: 600, textTransform: 'capitalize' }}>
                {org.status}
              </span>
            </div>
            {org.wantsDedicatedDatabase && <div style={infoRow}><span style={{ color: '#6b7280' }}>Dedicated DB</span><span style={{ color: '#15803d' }}>Requested</span></div>}
            {org.wantsCustomDomain && <div style={infoRow}><span style={{ color: '#6b7280' }}>Custom domain</span><span style={{ color: '#15803d' }}>Requested</span></div>}
          </div>

          {/* ── Logo ── */}
          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>Organization Logo</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              {logo ? (
                <img src={logo} alt="logo" style={{ width: 64, height: 64, objectFit: 'contain', borderRadius: 8, border: '1px solid #e5e7eb', background: '#f9fafb', padding: 4 }} />
              ) : (
                <div style={{ width: 64, height: 64, borderRadius: 8, border: '2px dashed #d1d5db', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', fontSize: 24 }}>+</div>
              )}
              <div>
                <button type="button" onClick={() => logoInputRef.current.click()}
                  style={{ padding: '6px 14px', background: 'var(--theme-soft-bg)', border: '1px solid var(--theme-soft-border)', borderRadius: 5, cursor: 'pointer', fontWeight: 600, fontSize: '0.82rem', color: 'var(--theme-text-strong)' }}>
                  {logo ? 'Change logo' : 'Upload logo'}
                </button>
                {logo && (
                  <button type="button" onClick={() => setLogo('')}
                    style={{ marginLeft: 8, padding: '6px 10px', background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 5, cursor: 'pointer', fontSize: '0.82rem', color: '#b91c1c' }}>
                    Remove
                  </button>
                )}
                <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: 4 }}>JPG or PNG, max 2 MB.</div>
              </div>
            </div>
            <input ref={logoInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleLogoFile} style={{ display: 'none' }} />
          </div>

          {/* ── Color Theme ── */}
          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>Organization Color Theme</label>
            <div style={{ fontSize: '0.8rem', color: '#6b7280', marginBottom: 8 }}>
              This color theme will be applied for all users of your Fellow Center.
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              {THEMES.map(theme => (
                <button
                  key={theme.key}
                  type="button"
                  title={theme.label}
                  onClick={() => handleThemePreview(theme.key)}
                  style={{
                    width: 36, height: 36, borderRadius: '50%',
                    background: theme.primary,
                    border: orgThemeKey === theme.key ? '3px solid #333' : '2px solid #ccc',
                    cursor: 'pointer',
                    outline: orgThemeKey === theme.key ? '2px solid #fff' : 'none',
                    outlineOffset: '-4px',
                    boxShadow: orgThemeKey === theme.key ? '0 0 0 2px #555' : 'none',
                    transition: 'border 0.15s'
                  }}
                  aria-label={theme.label}
                  aria-pressed={orgThemeKey === theme.key}
                />
              ))}
            </div>
            <div style={{ marginTop: 6, fontSize: '0.82rem', color: '#555' }}>
              {THEMES.find(t => t.key === orgThemeKey)?.label}
            </div>
          </div>

          {/* ── Dedicated DB ── */}
          {org.wantsDedicatedDatabase && (
            <div style={{ marginBottom: 20, background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8, padding: '14px 16px' }}>
              <label style={labelStyle}>Dedicated Database</label>

              {/* Current URI status */}
              {hasActiveUri ? (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <div>
                    <div style={{ fontSize: '0.8rem', color: '#15803d', fontWeight: 600 }}>✔ Active dedicated database</div>
                    <code style={{ fontSize: '0.72rem', color: '#6b7280', wordBreak: 'break-all' }}>
                      {org.dedicatedDatabaseUri.replace(/:\/\/[^@]+@/, '://***@')}
                    </code>
                  </div>
                  {migrateStep === 'idle' && (
                    <button type="button"
                      onClick={() => { setMigrateStep('need-new-uri'); setMigrateMsg(''); }}
                      style={{ padding: '6px 12px', background: '#fff', border: '1px solid #d1d5db', borderRadius: 5, cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, marginLeft: 12, flexShrink: 0 }}>
                      Switch cluster
                    </button>
                  )}
                </div>
              ) : (
                <div>
                  <input style={{ ...inputStyle, marginBottom: 6 }} type="password" value={firstTimeUri}
                    onChange={e => setFirstTimeUri(e.target.value)}
                    placeholder="mongodb+srv://user:pass@cluster.mongodb.net/dbname" maxLength={400} />
                  <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: 8 }}>
                    First-time setup — paste your MongoDB Atlas connection string. Keep this private.
                  </div>
                  <button type="button" className="primary-btn" disabled={saving || !firstTimeUri.trim()} onClick={handleFirstTimeUri}>
                    {saving ? 'Saving…' : 'Activate Database'}
                  </button>
                </div>
              )}

              {/* Migration flow */}
              {hasActiveUri && migrateStep !== 'idle' && (
                <div style={{ marginTop: 10 }}>
                  {(migrateStep === 'need-new-uri' || migrateStep === 'error') && (
                    <>
                      <div style={{ fontSize: '0.8rem', color: '#374151', marginBottom: 6, fontWeight: 600 }}>
                        Enter the new MongoDB Atlas URI:
                      </div>
                      <input style={{ ...inputStyle, marginBottom: 6 }} type="password" value={newDbUri}
                        onChange={e => { setNewDbUri(e.target.value); if (migrateStep === 'error') setMigrateStep('need-new-uri'); }}
                        placeholder="mongodb+srv://user:pass@newcluster.mongodb.net/dbname" maxLength={400} />
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button type="button" className="primary-btn" disabled={!newDbUri.trim()} onClick={handleValidateUri}>
                          Test Connection
                        </button>
                        <button type="button" onClick={() => { setMigrateStep('idle'); setNewDbUri(''); setMigrateMsg(''); }}
                          style={{ padding: '7px 14px', background: '#fff', border: '1px solid #d1d5db', borderRadius: 5, cursor: 'pointer', fontSize: '0.875rem' }}>
                          Cancel
                        </button>
                      </div>
                    </>
                  )}

                  {migrateStep === 'validating' && (
                    <div style={{ fontSize: '0.85rem', color: '#92400e' }}>⏳ {migrateMsg}</div>
                  )}

                  {migrateStep === 'validated' && (
                    <>
                      <div style={{ marginBottom: 10, padding: '10px 12px', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 6, fontSize: '0.82rem', color: '#15803d' }}>
                        ✔ {migrateMsg}
                      </div>
                      <div style={{ marginBottom: 10, padding: '10px 12px', background: '#fefce8', border: '1px solid #fde047', borderRadius: 6, fontSize: '0.82rem', color: '#854d0e' }}>
                        <strong>Important:</strong> All your data (members, attendance, announcements, etc.) will be
                        copied from the current cluster to the new one. Your organization will stay online on the
                        existing cluster until the copy is fully verified. Do not close this window during migration.
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button type="button" className="primary-btn" onClick={handleMigrate}>
                          Migrate &amp; Switch
                        </button>
                        <button type="button" onClick={() => { setMigrateStep('need-new-uri'); setMigrateMsg(''); }}
                          style={{ padding: '7px 14px', background: '#fff', border: '1px solid #d1d5db', borderRadius: 5, cursor: 'pointer', fontSize: '0.875rem' }}>
                          Use different URI
                        </button>
                      </div>
                    </>
                  )}

                  {migrateStep === 'migrating' && (
                    <div style={{ padding: '10px 12px', background: '#faf5ff', border: '1px solid #d8b4fe', borderRadius: 6, fontSize: '0.85rem', color: '#7c3aed' }}>
                      ⏳ {migrateMsg}
                    </div>
                  )}

                  {migrateStep === 'done' && (
                    <div style={{ padding: '10px 12px', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 6, fontSize: '0.82rem', color: '#15803d' }}>
                      ✔ {migrateMsg}
                    </div>
                  )}

                  {migrateStep === 'error' && migrateMsg && (
                    <div style={{ marginTop: 8, padding: '10px 12px', background: '#fff1f2', border: '1px solid #fca5a5', borderRadius: 6, fontSize: '0.82rem', color: '#b91c1c' }}>
                      ✘ {migrateMsg}
                    </div>
                  )}
                </div>
              )}

              {/* Last migration status from server (shown even after page refresh) */}
              {migrateStep === 'idle' && org.migrationStatus && org.migrationStatus !== 'idle' && (
                <div style={{ marginTop: 8, fontSize: '0.78rem', color: migStatusColor[org.migrationStatus] || '#6b7280' }}>
                  Last migration: <strong>{org.migrationStatus}</strong>
                  {org.migrationFinishedAt ? ` — ${new Date(org.migrationFinishedAt).toLocaleString()}` : ''}
                  {org.migrationError ? `. Error: ${org.migrationError}` : ''}
                  {org.migrationStatus === 'in_progress' && ' (contact Super Admin if stuck)'}
                </div>
              )}
            </div>
          )}

          {/* ── Custom Domain ── */}
          {org.wantsCustomDomain && (
            <div style={{ marginBottom: 20, background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8, padding: '14px 16px' }}>
              <label style={labelStyle}>Custom Domain</label>

              {/* Domain input — locked while verified unless Admin clicks Change */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                <input
                  style={{ ...inputStyle, flex: 1, margin: 0, background: (org.customDomainVerified && domainVerifyStep !== 'changing') ? '#f3f4f6' : undefined }}
                  type="text"
                  value={domain}
                  onChange={e => {
                    setDomain(e.target.value);
                    setDomainVerifyStep('idle');
                    setDomainToken('');
                    setDomainVerifyMsg('');
                  }}
                  disabled={org.customDomainVerified && domainVerifyStep !== 'changing'}
                  placeholder="e.g. mychurch.org or app.mychurch.org"
                  maxLength={120}
                />
                {org.customDomainVerified && domainVerifyStep !== 'changing' && (
                  <button type="button"
                    onClick={() => setDomainVerifyStep('changing')}
                    style={{ padding: '6px 12px', background: '#fff', border: '1px solid #d1d5db', borderRadius: 5, cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, whiteSpace: 'nowrap' }}>
                    Change
                  </button>
                )}
              </div>

              {/* ─ Verified badge ─ */}
              {org.customDomainVerified && domainVerifyStep !== 'changing' && (
                <div style={{ padding: '10px 12px', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 6, fontSize: '0.82rem', color: '#15803d' }}>
                  ✔ Domain verified — your members can visit <strong>{org.customDomain}</strong>
                </div>
              )}

              {/* ─ Not verified: domain is saved and matches the input ─ */}
              {!org.customDomainVerified && org.customDomain && domain === org.customDomain && (
                <div style={{ marginTop: 4 }}>
                  <div style={{ padding: '8px 12px', background: '#fefce8', border: '1px solid #fde047', borderRadius: 6, fontSize: '0.82rem', color: '#854d0e', marginBottom: 10 }}>
                    Domain not yet verified. Complete the steps below to prove ownership and route DNS.
                  </div>

                  {/* Step idle / error — show DNS instructions + Generate Token button */}
                  {(domainVerifyStep === 'idle' || domainVerifyStep === 'error' || domainVerifyStep === 'starting') && (
                    <>
                      {domainVerifyStep === 'error' && domainVerifyMsg && (
                        <div style={{ padding: '8px 12px', background: '#fff1f2', border: '1px solid #fca5a5', borderRadius: 6, fontSize: '0.82rem', color: '#b91c1c', marginBottom: 10 }}>
                          ✘ {domainVerifyMsg}
                        </div>
                      )}
                      <div style={{ fontSize: '0.8rem', color: '#374151', marginBottom: 6 }}>
                        <strong>Step 1 — Point DNS:</strong> Add one of these records at your domain registrar:
                      </div>
                      <div style={{ background: '#f1f5f9', borderRadius: 6, padding: '10px 14px', marginBottom: 10, fontSize: '0.78rem', fontFamily: 'monospace', lineHeight: 1.7 }}>
                        <div style={{ color: '#64748b', marginBottom: 4 }}>For subdomains (e.g. app.mychurch.org):</div>
                        <div style={{ marginLeft: 8 }}>Type: <strong>CNAME</strong> &nbsp;|&nbsp; Host: <code>{org.customDomain}</code> &nbsp;|&nbsp; Value: <code>cname.vercel-dns.com</code></div>
                        <div style={{ color: '#64748b', margin: '6px 0 4px' }}>For apex domains (e.g. mychurch.org):</div>
                        <div style={{ marginLeft: 8 }}>Type: <strong>A</strong> &nbsp;|&nbsp; Host: <code>@</code> &nbsp;|&nbsp; Value: <code>76.76.21.21</code></div>
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#374151', marginBottom: 8 }}>
                        <strong>Step 2 — Prove ownership:</strong> Click below to get a unique verification token, then add it as a TXT record.
                      </div>
                      <button type="button"
                        onClick={handleStartVerify}
                        disabled={domainVerifyStep === 'starting'}
                        style={{ padding: '7px 16px', background: 'var(--theme-soft-bg)', border: '1px solid var(--theme-soft-border)', borderRadius: 5, cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, color: 'var(--theme-text-strong)' }}>
                        {domainVerifyStep === 'starting' ? 'Generating…' : 'Generate Verification Token'}
                      </button>
                    </>
                  )}

                  {/* Token ready — show TXT record to add */}
                  {(domainVerifyStep === 'token-ready' || domainVerifyStep === 'checking') && (
                    <>
                      <div style={{ fontSize: '0.8rem', color: '#374151', marginBottom: 6 }}>
                        Add this <strong>TXT record</strong> at your domain registrar, then click Check:
                      </div>
                      <div style={{ background: '#f1f5f9', borderRadius: 6, padding: '10px 14px', marginBottom: 10, fontSize: '0.78rem', fontFamily: 'monospace', lineHeight: 1.9, wordBreak: 'break-all' }}>
                        <div>Type: <strong>TXT</strong></div>
                        <div>Host/Name: <code>_hf-verify.{org.customDomain}</code></div>
                        <div>Value: <code>{domainToken}</code></div>
                        <div>TTL: <code>300</code></div>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: 10 }}>
                        DNS records can take a few minutes to propagate. Once both the DNS routing record (CNAME/A) and this TXT record are added, click the button below.
                      </div>
                      {domainVerifyStep === 'checking' ? (
                        <div style={{ fontSize: '0.85rem', color: '#7c3aed' }}>⏳ Checking DNS records…</div>
                      ) : (
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button type="button" className="primary-btn" onClick={handleCheckDns}>
                            Check DNS &amp; Verify
                          </button>
                          <button type="button"
                            onClick={() => { setDomainVerifyStep('idle'); setDomainToken(''); setDomainVerifyMsg(''); }}
                            style={{ padding: '7px 14px', background: '#fff', border: '1px solid #d1d5db', borderRadius: 5, cursor: 'pointer', fontSize: '0.875rem' }}>
                            Back
                          </button>
                        </div>
                      )}
                    </>
                  )}

                  {/* Inline verified confirmation (just after successful check, before page reload) */}
                  {domainVerifyStep === 'verified' && (
                    <div style={{ padding: '10px 12px', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 6, fontSize: '0.82rem', color: '#15803d' }}>
                      ✔ {domainVerifyMsg}
                    </div>
                  )}
                </div>
              )}

              {/* ─ Domain typed but not yet saved ─ */}
              {(!org.customDomain && domain) && (
                <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: 4 }}>
                  Save your settings to begin domain verification.
                </div>
              )}
              {org.customDomain && domain !== org.customDomain && (
                <div style={{ fontSize: '0.75rem', color: '#92400e', marginTop: 4 }}>
                  Save your settings to update the domain, then complete verification.
                </div>
              )}
            </div>
          )}

          {msg && (
            <div style={{ marginBottom: 10, color: msg.includes('saved') ? '#15803d' : '#b91c1c', fontSize: '0.875rem' }}>{msg}</div>
          )}

          {/* ── Navbar Items ── */}
          <div style={{ marginBottom: 20, background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8, padding: '14px 16px' }}>
            <label style={labelStyle}>Navigation Bar Links</label>
            <div style={{ fontSize: '0.78rem', color: '#6b7280', marginBottom: 10 }}>
              These links appear in your organization's navigation bar.
            </div>
            {navbarItems.length > 0 && (
              <div style={{ marginBottom: 10 }}>
                {navbarItems.map((item, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 6, padding: '6px 10px' }}>
                    <span style={{ flex: 1, fontSize: '0.85rem', fontWeight: 600, color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.label}</span>
                    <span style={{ flex: 2, fontSize: '0.78rem', color: '#6b7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.href}</span>
                    <button type="button" onClick={() => setNavbarItems(items => items.filter((_, j) => j !== i))}
                      style={{ background: '#fee2e2', border: 'none', borderRadius: 4, color: '#b91c1c', cursor: 'pointer', padding: '3px 8px', fontSize: '0.78rem', flexShrink: 0 }}>
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <input
                style={{ ...inputStyle, flex: '1 1 100px', minWidth: 80, margin: 0 }}
                type="text"
                placeholder="Label (e.g. Home)"
                value={newNavLabel}
                onChange={e => setNewNavLabel(e.target.value)}
                maxLength={80}
              />
              <input
                style={{ ...inputStyle, flex: '2 1 160px', minWidth: 120, margin: 0 }}
                type="text"
                placeholder="URL (e.g. https://...)"
                value={newNavHref}
                onChange={e => setNewNavHref(e.target.value)}
                maxLength={500}
              />
              <button type="button"
                disabled={!newNavLabel.trim() || !newNavHref.trim()}
                onClick={() => {
                  if (!newNavLabel.trim() || !newNavHref.trim()) return;
                  setNavbarItems(items => [...items, { label: newNavLabel.trim(), href: newNavHref.trim() }]);
                  setNewNavLabel('');
                  setNewNavHref('');
                }}
                style={{ padding: '6px 14px', background: 'var(--theme-soft-bg)', border: '1px solid var(--theme-soft-border)', borderRadius: 5, cursor: 'pointer', fontWeight: 600, fontSize: '0.82rem', color: 'var(--theme-text-strong)', flexShrink: 0 }}>
                + Add
              </button>
            </div>
          </div>

          {/* ── Footer Links ── */}
          <div style={{ marginBottom: 20, background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8, padding: '14px 16px' }}>
            <label style={labelStyle}>Footer Links</label>
            <div style={{ fontSize: '0.78rem', color: '#6b7280', marginBottom: 10 }}>
              These links appear in your organization's footer alongside the copyright notice.
            </div>
            {footerLinks.length > 0 && (
              <div style={{ marginBottom: 10 }}>
                {footerLinks.map((item, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 6, padding: '6px 10px' }}>
                    <span style={{ flex: 1, fontSize: '0.85rem', fontWeight: 600, color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.label}</span>
                    <span style={{ flex: 2, fontSize: '0.78rem', color: '#6b7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.href}</span>
                    <button type="button" onClick={() => setFooterLinks(items => items.filter((_, j) => j !== i))}
                      style={{ background: '#fee2e2', border: 'none', borderRadius: 4, color: '#b91c1c', cursor: 'pointer', padding: '3px 8px', fontSize: '0.78rem', flexShrink: 0 }}>
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <input
                style={{ ...inputStyle, flex: '1 1 100px', minWidth: 80, margin: 0 }}
                type="text"
                placeholder="Label (e.g. Privacy Policy)"
                value={newFooterLabel}
                onChange={e => setNewFooterLabel(e.target.value)}
                maxLength={80}
              />
              <input
                style={{ ...inputStyle, flex: '2 1 160px', minWidth: 120, margin: 0 }}
                type="text"
                placeholder="URL (e.g. https://...)"
                value={newFooterHref}
                onChange={e => setNewFooterHref(e.target.value)}
                maxLength={500}
              />
              <button type="button"
                disabled={!newFooterLabel.trim() || !newFooterHref.trim()}
                onClick={() => {
                  if (!newFooterLabel.trim() || !newFooterHref.trim()) return;
                  setFooterLinks(items => [...items, { label: newFooterLabel.trim(), href: newFooterHref.trim() }]);
                  setNewFooterLabel('');
                  setNewFooterHref('');
                }}
                style={{ padding: '6px 14px', background: 'var(--theme-soft-bg)', border: '1px solid var(--theme-soft-border)', borderRadius: 5, cursor: 'pointer', fontWeight: 600, fontSize: '0.82rem', color: 'var(--theme-text-strong)', flexShrink: 0 }}>
                + Add
              </button>
            </div>
          </div>

          <button type="submit" className="primary-btn" disabled={saving} style={{ width: '100%' }}>
            {saving ? 'Saving…' : 'Save Organization Settings'}
          </button>
        </form>
      )}
    </section>
  );
}

export default SettingsPanel;
