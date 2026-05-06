import React, { useMemo, useState } from 'react';
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

function SettingsPanel({ user, onClose, onUserUpdated, languageOptions, locale, setLocale }) {
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
        </div>
      </div>
    </div>
  );
}

export default SettingsPanel;
