import React, { useEffect, useMemo, useRef, useState } from 'react';
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
function Field({ label, required, children, error }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <label style={{ display: 'block', fontWeight: 600, fontSize: '1.32rem', color: '#000', marginBottom: 5 }}>
        {label}
        {required && <span style={{ color: '#000', marginLeft: 3 }}>*</span>}
      </label>
      {children}
      {error && <div style={{ marginTop: 6, color: '#dc2626', fontSize: '1rem', fontWeight: 600, background: 'none', textAlign: 'left' }}>{error}</div>}
    </div>
  );
}

const inputStyle = {
  width: '100%',
  padding: '0.5rem 0.75rem',
  border: '1px solid #d1d5db',
  borderRadius: 6,
  fontSize: '1.425rem',
  boxSizing: 'border-box',
  background: 'transparent',
  color: '#000'
};

const getFieldStyle = (hasError, extraStyle = {}) => ({
  ...inputStyle,
  borderColor: hasError ? '#dc2626' : '#d1d5db',
  boxShadow: hasError ? '0 0 0 1px rgba(220, 38, 38, 0.15)' : 'none',
  transition: 'border-color 0.2s, box-shadow 0.2s',
  ...extraStyle
});

const sectionStyle = {
  background: 'transparent',
  border: 'none',
  borderRadius: 0,
  padding: '0 0 22px',
  marginBottom: 22
};

const sectionHeadingStyle = {
  margin: '0 0 16px',
  fontSize: '1.5rem',
  fontWeight: 700,
  color: '#000',
  borderBottom: '2px solid var(--theme-soft-border)',
  paddingBottom: 8
};

// ─── Photo upload field ───────────────────────────────────────────────────
function PhotoField({ label, value, onChange, required, error }) {
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
    <Field label={label} required={required} error={error}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button
          type="button"
          onClick={() => inputRef.current.click()}
          style={{
            width: 64,
            height: 64,
            padding: 0,
            borderRadius: 8,
            border: `2px dashed ${error ? '#dc2626' : '#d1d5db'}`,
            background: 'transparent',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            overflow: 'hidden',
            flexShrink: 0
          }}
          aria-label={value ? 'Change uploaded logo' : 'Upload logo'}
        >
          {value ? (
            <img
              src={value}
              alt="preview"
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
          ) : (
            <span style={{ color: '#9ca3af', fontSize: 22, lineHeight: 1 }}>+</span>
          )}
        </button>
        <div>
          <button
            type="button"
            onClick={() => inputRef.current.click()}
            style={{ ...inputStyle, width: 'auto', cursor: 'pointer', background: 'var(--theme-soft-bg)', border: `1px solid ${error ? '#dc2626' : 'var(--theme-soft-border)'}`, fontWeight: 600, fontSize: '1.23rem', padding: '0.4rem 1rem', color: '#000' }}
          >
            {value ? 'Change photo' : 'Upload photo'}
          </button>
          <div style={{ fontSize: '1.125rem', color: '#000', marginTop: 4 }}>JPG, PNG. Max 2 MB.</div>
        </div>
      </div>
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFile} style={{ display: 'none' }} />
    </Field>
  );
}

// ─── Main component ───────────────────────────────────────────────────────
export default function FellowCenterSetupForm({ onBack, onSubmitted }) {
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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

  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [activeTypingField, setActiveTypingField] = useState('');

  const isTypingActive = (fieldName, value) => (
    activeTypingField === fieldName && typeof value === 'string' && value.trim().length > 0
  );

  const countries = useMemo(
    () => Country.getAllCountries().sort((a, b) => a.name.localeCompare(b.name)),
    []
  );
  const selectedCountry = countries.find(c => c.isoCode === countryCode);
  const dialingCode = selectedCountry ? `+${selectedCountry.phonecode}` : '';

  const getRequiredMessage = (fieldLabel) => `${fieldLabel} is required, please.`;

  const requiredFieldDefinitions = [
    { key: 'name', label: 'Full Name', value: name },
    { key: 'email', label: 'Personal Email Address', value: email },
    { key: 'countryCode', label: 'Country', value: countryCode },
    { key: 'phone', label: 'Personal Phone Number', value: phone },
    { key: 'address', label: 'Residential Address', value: address },
    { key: 'position', label: 'Your Position / Title in the Church or Commission', value: position },
    { key: 'passportPhoto', label: 'Passport Photo (Head-shot)', value: passportPhoto },
    { key: 'churchName', label: 'Name of Church or Commission', value: churchName },
    { key: 'churchAddress', label: 'Church / Commission Address', value: churchAddress },
    { key: 'churchEnquiryPhone', label: 'General Enquiry Phone Number', value: churchEnquiryPhone }
  ];

  const clearFieldError = (key) => {
    setFieldErrors(prev => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const setSingleFieldValue = (setter, key) => (value) => {
    setter(value);
    clearFieldError(key);
    setSubmitError('');
  };

  const validateForm = () => {
    const nextErrors = requiredFieldDefinitions.reduce((accumulator, field) => {
      if (!String(field.value || '').trim()) {
        accumulator[field.key] = getRequiredMessage(field.label);
      }
      return accumulator;
    }, {});

    setFieldErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError('');
    if (!validateForm()) {
      return;
    }
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
          churchEnquiryPhone: churchEnquiryPhone.trim()
        })
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.msg) {
          const messageMatch = data.msg.match(/^(.+?) is required, please\.$/);
          if (messageMatch) {
            const fieldLabel = messageMatch[1];
            const matchedField = requiredFieldDefinitions.find(field => field.label === fieldLabel);
            if (matchedField) {
              setFieldErrors(prev => ({ ...prev, [matchedField.key]: data.msg }));
              return;
            }
          }
          setSubmitError(data.msg);
        }
      } else {
        onSubmitted && onSubmitted();
      }
    } catch (err) {
      setSubmitError('Network error. Please check your connection and try again.');
    }
    setSubmitting(false);
  };

  const formContent = (
    <>
    <form className="form" noValidate onSubmit={handleSubmit} style={{ maxWidth: 'none', border: 'none', background: 'transparent', padding: 0, boxShadow: 'none', color: '#000' }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <h2 style={{ margin: 0, color: '#000', fontSize: '2.1rem', fontWeight: 800 }}>
          Request for Our Church Fellowship Setup
        </h2>
        <p style={{ margin: '8px 0 0', color: '#000', fontSize: '1.35rem' }}>
          Register your Church / Ministry to get your own Our Church Fellowship app set up for you. The App is a full Ministry suite designed to advance God's Kingdom. The OCF Code helps you connect to first-timers.
        </p>
      </div>
        {/* ── Personal Information ── */}
        <section style={sectionStyle}>
          <h3 style={sectionHeadingStyle}>Your Personal Information</h3>

          <Field label="Full Name" required error={fieldErrors.name}>
            <input
              className={isTypingActive('name', name) ? 'field-typing-active' : ''}
              style={getFieldStyle(Boolean(fieldErrors.name))}
              type="text"
              maxLength={80}
              value={name}
              onChange={e => setSingleFieldValue(setName, 'name')(e.target.value)}
              onFocus={() => setActiveTypingField('name')}
              onBlur={() => setActiveTypingField('')}
              required
              placeholder="e.g. John Adeyemi"
            />
          </Field>

          <Field label="Personal Email Address" required error={fieldErrors.email}>
            <input
              className={isTypingActive('email', email) ? 'field-typing-active' : ''}
              style={getFieldStyle(Boolean(fieldErrors.email))}
              type="email"
              maxLength={80}
              value={email}
              onChange={e => setSingleFieldValue(setEmail, 'email')(e.target.value)}
              onFocus={() => setActiveTypingField('email')}
              onBlur={() => setActiveTypingField('')}
              required
              placeholder="you@example.com"
            />
          </Field>

          <Field label="Country" required error={fieldErrors.countryCode}>
            <select style={getFieldStyle(Boolean(fieldErrors.countryCode))} value={countryCode} onChange={e => setSingleFieldValue(setCountryCode, 'countryCode')(e.target.value)} required>
              <option value="">Select country…</option>
              {countries.map(c => (
                <option key={c.isoCode} value={c.isoCode}>{c.name}</option>
              ))}
            </select>
          </Field>

          <Field label="Personal Phone Number" required error={fieldErrors.phone}>
            <div style={{ display: 'flex', gap: 8 }}>
              {dialingCode && (
                <span style={{ padding: '0.5rem 0.6rem', background: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: 6, fontSize: '1.425rem', whiteSpace: 'nowrap', color: '#000' }}>
                  {dialingCode}
                </span>
              )}
              <input
                className={isTypingActive('phone', phone) ? 'field-typing-active' : ''}
                style={getFieldStyle(Boolean(fieldErrors.phone), { flex: 1 })}
                type="tel"
                maxLength={15}
                pattern="[0-9]{1,15}"
                value={phone}
                onChange={e => setSingleFieldValue(setPhone, 'phone')(e.target.value.replace(/[^0-9]/g, ''))}
                onFocus={() => setActiveTypingField('phone')}
                onBlur={() => setActiveTypingField('')}
                required
                placeholder="8012345678"
              />
            </div>
          </Field>

          <Field label="Residential Address" required error={fieldErrors.address}>
            <input
              className={isTypingActive('address', address) ? 'field-typing-active' : ''}
              style={getFieldStyle(Boolean(fieldErrors.address))}
              type="text"
              maxLength={120}
              value={address}
              onChange={e => setSingleFieldValue(setAddress, 'address')(e.target.value)}
              onFocus={() => setActiveTypingField('address')}
              onBlur={() => setActiveTypingField('')}
              required
              placeholder="House No., Street, City"
            />
          </Field>

          <Field label="Your Position / Title in the Church or Commission" required error={fieldErrors.position}>
            <input
              className={isTypingActive('position', position) ? 'field-typing-active' : ''}
              style={getFieldStyle(Boolean(fieldErrors.position))}
              type="text"
              maxLength={80}
              value={position}
              onChange={e => setSingleFieldValue(setPosition, 'position')(e.target.value)}
              onFocus={() => setActiveTypingField('position')}
              onBlur={() => setActiveTypingField('')}
              required
              placeholder="e.g. Senior Pastor, Visioner, General Overseer"
            />
          </Field>

          <PhotoField
            label="Passport Photo (Head-shot)"
            required
            value={passportPhoto}
            onChange={file => setSingleFieldValue(setPassportPhoto, 'passportPhoto')(file)}
            error={fieldErrors.passportPhoto}
          />
        </section>

        {/* ── Church / Commission Information ── */}
        <section style={sectionStyle}>
          <h3 style={sectionHeadingStyle}>Church / Commission Information</h3>

          <Field label="Name of Church or Commission" required error={fieldErrors.churchName}>
            <input
              className={isTypingActive('churchName', churchName) ? 'field-typing-active' : ''}
              style={getFieldStyle(Boolean(fieldErrors.churchName))}
              type="text"
              maxLength={120}
              value={churchName}
              onChange={e => setSingleFieldValue(setChurchName, 'churchName')(e.target.value)}
              onFocus={() => setActiveTypingField('churchName')}
              onBlur={() => setActiveTypingField('')}
              required
              placeholder="e.g. Grace Gospel Church"
            />
          </Field>

          <PhotoField
            label="Church / Commission Logo"
            value={churchLogo}
            onChange={file => setSingleFieldValue(setChurchLogo, 'churchLogo')(file)}
          />

          <Field label="Church / Commission Address" required error={fieldErrors.churchAddress}>
            <input
              className={isTypingActive('churchAddress', churchAddress) ? 'field-typing-active' : ''}
              style={getFieldStyle(Boolean(fieldErrors.churchAddress))}
              type="text"
              maxLength={160}
              value={churchAddress}
              onChange={e => setSingleFieldValue(setChurchAddress, 'churchAddress')(e.target.value)}
              onFocus={() => setActiveTypingField('churchAddress')}
              onBlur={() => setActiveTypingField('')}
              required
              placeholder="Full address of the church or commission headquarters"
            />
          </Field>

          <Field label="General Enquiry Phone Number" required error={fieldErrors.churchEnquiryPhone}>
            <input
              className={isTypingActive('churchEnquiryPhone', churchEnquiryPhone) ? 'field-typing-active' : ''}
              style={getFieldStyle(Boolean(fieldErrors.churchEnquiryPhone))}
              type="tel"
              maxLength={20}
              value={churchEnquiryPhone}
              onChange={e => setSingleFieldValue(setChurchEnquiryPhone, 'churchEnquiryPhone')(e.target.value)}
              onFocus={() => setActiveTypingField('churchEnquiryPhone')}
              onBlur={() => setActiveTypingField('')}
              required
              placeholder="+234 800 0000 000"
            />
          </Field>
        </section>

        {submitError && (
          <div style={{ marginBottom: 16, padding: '0', background: 'none', border: 'none', borderRadius: 0, color: '#dc2626', fontSize: '1.35rem' }}>
            {submitError}
          </div>
        )}

        <p style={{ margin: '0 0 14px', color: '#000', fontSize: '1.15rem', lineHeight: 1.45, textAlign: 'left' }}>
          Churches/Ministries get 100% customized interface with the brandings for the commission. There is a support for a dedicated database. You can plug your own database and domain so the app runs directly on your own domain and database. This setup is fast and 100% free for churches and ministries that specialize in soul winning and establishment, teaching of the Word of God, promoting the Kingdom of God (Matthew 28:18-20). By submitting this form, you agree to the OCF Terms of Service and Privacy Policy.
        </p>

        <button
          className={`floating-submit-btn processing-btn ${submitting ? 'is-processing' : ''}`}
          type="submit"
          aria-busy={submitting}
          disabled={submitting}
          style={{
            width: 'fit-content',
            margin: '4px auto 0',
            display: 'block',
            padding: '0.5rem 1rem',
             background: submitting ? '#93c5fd' : '#4169e1',
            color: '#000',
            border: 'none',
            borderRadius: 7,
            fontSize: '1.5rem',
            fontWeight: 700,
            cursor: submitting ? 'not-allowed' : 'pointer',
            transition: 'background 0.2s',
            animation: submitting ? 'none' : 'submitButtonFloat 2.2s ease-in-out infinite'
          }}
        >
          {submitting ? 'Submitting…' : 'Submit Our Church Fellowship Request'}
        </button>
    </form>

    <div style={{ textAlign: 'center', marginTop: 16 }}>
      <button
        type="button"
        onClick={onBack}
        style={{ background: 'none', border: 'none', color: '#000', cursor: 'pointer', textDecoration: 'underline', fontSize: '1.35rem' }}
      >
        ← Back
      </button>
    </div>
    </>
  );

  return isMobile ? formContent : <div className="setup-form-desktop-wrapper">{formContent}</div>;
}
