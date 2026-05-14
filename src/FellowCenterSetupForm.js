import React, { useMemo, useRef, useState } from 'react';
import { Country } from 'country-state-city';

// ─── Helper: convert File → base64 data URL ──────────────────────────────
function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

// ─── Reusable field wrapper ───────────────────────────────────────────────
function Field({ label, required, children }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <label style={{ display: 'block', fontWeight: 600, fontSize: '0.88rem', color: '#374151', marginBottom: 5 }}>
        {label}
        {required && <span style={{ color: 'var(--theme-primary)', marginLeft: 3 }}>*</span>}
      </label>
      {children}
    </div>
  );
}

const inputStyle = {
  width: '100%',
  padding: '0.5rem 0.75rem',
  border: '1px solid #d1d5db',
  borderRadius: 6,
  fontSize: '0.95rem',
  boxSizing: 'border-box',
  background: '#fff'
};

const sectionStyle = {
  background: '#f9fafb',
  border: '1px solid #e5e7eb',
  borderRadius: 10,
  padding: '20px 22px',
  marginBottom: 22
};

const sectionHeadingStyle = {
  margin: '0 0 16px',
  fontSize: '1rem',
  fontWeight: 700,
  color: 'var(--theme-text-strong)',
  borderBottom: '2px solid var(--theme-soft-border)',
  paddingBottom: 8
};

// ─── Photo upload field ───────────────────────────────────────────────────
function PhotoField({ label, value, onChange, required }) {
  const inputRef = useRef();

  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      alert('Image must be smaller than 2 MB.');
      return;
    }
    try {
      const b64 = await readFileAsBase64(file);
      onChange(b64);
    } catch {
      alert('Could not read the selected file.');
    }
  };

  return (
    <Field label={label} required={required}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {value ? (
          <img
            src={value}
            alt="preview"
            style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 8, border: '1px solid #d1d5db' }}
          />
        ) : (
          <div style={{ width: 64, height: 64, borderRadius: 8, border: '2px dashed #d1d5db', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', fontSize: 22 }}>
            +
          </div>
        )}
        <div>
          <button
            type="button"
            onClick={() => inputRef.current.click()}
            style={{ ...inputStyle, width: 'auto', cursor: 'pointer', background: 'var(--theme-soft-bg)', border: '1px solid var(--theme-soft-border)', fontWeight: 600, fontSize: '0.82rem', padding: '0.4rem 1rem', color: 'var(--theme-text-strong)' }}
          >
            {value ? 'Change photo' : 'Upload photo'}
          </button>
          <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: 4 }}>JPG, PNG. Max 2 MB.</div>
        </div>
      </div>
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFile} style={{ display: 'none' }} />
    </Field>
  );
}

// ─── Main component ───────────────────────────────────────────────────────
export default function FellowCenterSetupForm({ onBack, onSubmitted }) {
  // Personal info
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [position, setPosition] = useState('');
  const [passportPhoto, setPassportPhoto] = useState('');
  const [countryCode, setCountryCode] = useState('');

  // Church / Commission info
  const [churchName, setChurchName] = useState('');
  const [churchLogo, setChurchLogo] = useState('');
  const [churchAddress, setChurchAddress] = useState('');
  const [churchEnquiryPhone, setChurchEnquiryPhone] = useState('');

  // Preferences
  const [wantsDedicatedDatabase, setWantsDedicatedDatabase] = useState(false);
  const [wantsCustomDomain, setWantsCustomDomain] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const countries = useMemo(
    () => Country.getAllCountries().sort((a, b) => a.name.localeCompare(b.name)),
    []
  );
  const selectedCountry = countries.find(c => c.isoCode === countryCode);
  const dialingCode = selectedCountry ? `+${selectedCountry.phonecode}` : '';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const res = await fetch('/api/organizations/setup-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          phone: (dialingCode + phone).trim(),
          address: address.trim(),
          position: position.trim(),
          passportPhoto,
          churchName: churchName.trim(),
          churchLogo,
          churchAddress: churchAddress.trim(),
          churchEnquiryPhone: churchEnquiryPhone.trim(),
          wantsDedicatedDatabase,
          wantsCustomDomain
        })
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.msg || 'Submission failed. Please try again.');
      } else {
        onSubmitted && onSubmitted();
      }
    } catch (err) {
      setError('Network error. Please check your connection and try again.');
    }
    setSubmitting(false);
  };

  return (
    <div style={{ width: '100%', maxWidth: 560, margin: '0 auto', padding: '0 8px 40px' }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <img
          src={process.env.PUBLIC_URL + '/smhos-logo.png'}
          alt="SMHOS Logo"
          style={{ width: 80, margin: '0 auto 12px', display: 'block' }}
        />
        <h2 style={{ margin: 0, color: 'var(--theme-text-strong)', fontSize: '1.4rem', fontWeight: 800 }}>
          Request for Fellow Center Setup
        </h2>
        <p style={{ margin: '8px 0 0', color: '#6b7280', fontSize: '0.9rem' }}>
          Register your Church or Commission to get your own Fellow Center on the Home Fellowship App.
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        {/* ── Personal Information ── */}
        <section style={sectionStyle}>
          <h3 style={sectionHeadingStyle}>Your Personal Information</h3>

          <Field label="Full Name" required>
            <input style={inputStyle} type="text" maxLength={80} value={name} onChange={e => setName(e.target.value)} required placeholder="e.g. John Adeyemi" />
          </Field>

          <Field label="Personal Email Address" required>
            <input style={inputStyle} type="email" maxLength={80} value={email} onChange={e => setEmail(e.target.value)} required placeholder="you@example.com" />
          </Field>

          <Field label="Country" required>
            <select style={inputStyle} value={countryCode} onChange={e => setCountryCode(e.target.value)} required>
              <option value="">Select country…</option>
              {countries.map(c => (
                <option key={c.isoCode} value={c.isoCode}>{c.name}</option>
              ))}
            </select>
          </Field>

          <Field label="Personal Phone Number" required>
            <div style={{ display: 'flex', gap: 8 }}>
              {dialingCode && (
                <span style={{ padding: '0.5rem 0.6rem', background: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: 6, fontSize: '0.95rem', whiteSpace: 'nowrap' }}>
                  {dialingCode}
                </span>
              )}
              <input
                style={{ ...inputStyle, flex: 1 }}
                type="tel"
                maxLength={15}
                pattern="[0-9]{1,15}"
                value={phone}
                onChange={e => setPhone(e.target.value.replace(/[^0-9]/g, ''))}
                required
                placeholder="8012345678"
              />
            </div>
          </Field>

          <Field label="Residential Address" required>
            <input style={inputStyle} type="text" maxLength={120} value={address} onChange={e => setAddress(e.target.value)} required placeholder="House No., Street, City" />
          </Field>

          <Field label="Your Position / Title in the Church or Commission" required>
            <input style={inputStyle} type="text" maxLength={80} value={position} onChange={e => setPosition(e.target.value)} required placeholder="e.g. Senior Pastor, Visioner, General Overseer" />
          </Field>

          <PhotoField
            label="Passport Photo (Head-shot)"
            required
            value={passportPhoto}
            onChange={setPassportPhoto}
          />
        </section>

        {/* ── Church / Commission Information ── */}
        <section style={sectionStyle}>
          <h3 style={sectionHeadingStyle}>Church / Commission Information</h3>

          <Field label="Name of Church or Commission" required>
            <input style={inputStyle} type="text" maxLength={120} value={churchName} onChange={e => setChurchName(e.target.value)} required placeholder="e.g. Grace Gospel Church" />
          </Field>

          <PhotoField
            label="Church / Commission Logo"
            value={churchLogo}
            onChange={setChurchLogo}
          />

          <Field label="Church / Commission Address" required>
            <input style={inputStyle} type="text" maxLength={160} value={churchAddress} onChange={e => setChurchAddress(e.target.value)} required placeholder="Full address of the church or commission headquarters" />
          </Field>

          <Field label="General Enquiry Phone Number" required>
            <input style={inputStyle} type="tel" maxLength={20} value={churchEnquiryPhone} onChange={e => setChurchEnquiryPhone(e.target.value)} required placeholder="+234 800 0000 000" />
          </Field>
        </section>

        {/* ── Infrastructure Preferences ── */}
        <section style={sectionStyle}>
          <h3 style={sectionHeadingStyle}>Infrastructure Preferences</h3>
          <p style={{ margin: '0 0 14px', fontSize: '0.85rem', color: '#6b7280' }}>
            These are optional. You can always update these from your Admin settings after your center is approved.
          </p>

          <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer', marginBottom: 14 }}>
            <input
              type="checkbox"
              checked={wantsDedicatedDatabase}
              onChange={e => setWantsDedicatedDatabase(e.target.checked)}
              style={{ marginTop: 3, accentColor: 'var(--theme-primary)' }}
            />
            <span>
              <strong style={{ display: 'block', fontSize: '0.9rem', color: '#111827' }}>Request a dedicated database</strong>
              <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                Your organization's data will be stored in a dedicated MongoDB Atlas database.
                You will provide the URI from your Admin backend settings.
              </span>
            </span>
          </label>

          <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={wantsCustomDomain}
              onChange={e => setWantsCustomDomain(e.target.checked)}
              style={{ marginTop: 3, accentColor: 'var(--theme-primary)' }}
            />
            <span>
              <strong style={{ display: 'block', fontSize: '0.9rem', color: '#111827' }}>Request a custom domain name</strong>
              <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                Your Fellow Center will be accessible from your own domain (e.g. mychurch.fellowcenter.org).
                You can configure this from your Admin backend settings.
              </span>
            </span>
          </label>
        </section>

        {error && (
          <div style={{ marginBottom: 16, padding: '10px 14px', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 6, color: '#b91c1c', fontSize: '0.9rem' }}>
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          style={{
            width: '100%',
            padding: '0.75rem',
            background: submitting ? '#93c5fd' : 'var(--theme-primary)',
            color: '#fff',
            border: 'none',
            borderRadius: 7,
            fontSize: '1rem',
            fontWeight: 700,
            cursor: submitting ? 'not-allowed' : 'pointer',
            transition: 'background 0.2s'
          }}
        >
          {submitting ? 'Submitting…' : 'Submit Fellow Center Request'}
        </button>
      </form>

      <div style={{ textAlign: 'center', marginTop: 16 }}>
        <button
          type="button"
          onClick={onBack}
          style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', textDecoration: 'underline', fontSize: '0.9rem' }}
        >
          ← Back
        </button>
      </div>
    </div>
  );
}
