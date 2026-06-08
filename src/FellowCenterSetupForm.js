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

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Failed to read compressed image'));
    reader.readAsDataURL(blob);
  });
}

function loadImageElement(file) {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Failed to load image'));
    };
    image.src = objectUrl;
  });
}

function canvasToBlob(canvas, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Canvas conversion failed'));
          return;
        }
        resolve(blob);
      },
      'image/jpeg',
      quality
    );
  });
}

async function compressImageToTarget(file, targetBytes) {
  const image = await loadImageElement(file);
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas context unavailable');

  let width = image.naturalWidth || image.width;
  let height = image.naturalHeight || image.height;
  let quality = 0.9;
  let bestBlob = null;

  for (let attempt = 0; attempt < 12; attempt += 1) {
    canvas.width = Math.max(1, Math.round(width));
    canvas.height = Math.max(1, Math.round(height));
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);

    const blob = await canvasToBlob(canvas, quality);
    bestBlob = blob;

    if (blob.size <= targetBytes) {
      return blobToDataUrl(blob);
    }

    if (quality > 0.45) {
      quality -= 0.12;
    } else {
      width *= 0.86;
      height *= 0.86;
      quality = 0.9;
    }
  }

  return bestBlob ? blobToDataUrl(bestBlob) : readFileAsBase64(file);
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
function PhotoField({ label, value, onChange, required, error, targetKb }) {
  const inputRef = useRef();

  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type || !file.type.startsWith('image/')) {
      return;
    }

    try {
      const b64 = await compressImageToTarget(file, targetKb * 1024);
      onChange(b64);
    } catch {
      const b64 = await readFileAsBase64(file);
      onChange(b64);
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
          <div style={{ fontSize: '1.125rem', color: '#000', marginTop: 4 }}>Compressed automatically before upload.</div>
        </div>
      </div>
      <input ref={inputRef} type="file" accept="image/*" onChange={handleFile} style={{ display: 'none' }} />
    </Field>
  );
}

// ─── Main component ───────────────────────────────────────────────────────
export default function FellowCenterSetupForm({ onBack, onSubmitted }) {
  const normalizeEmail = (value) => String(value || '').trim().toLowerCase();
  const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(value));

  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Personal info
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [emailVerificationCode, setEmailVerificationCode] = useState('');
  const [verifiedEmail, setVerifiedEmail] = useState('');
  const [emailVerificationStatus, setEmailVerificationStatus] = useState('');
  const [emailVerificationMessage, setEmailVerificationMessage] = useState('');
  const [requestingEmailCode, setRequestingEmailCode] = useState(false);
  const [verifyingEmailCode, setVerifyingEmailCode] = useState(false);
  const [autoRequestedEmail, setAutoRequestedEmail] = useState('');
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
  const normalizedEmail = normalizeEmail(email);
  const hasEmailInput = normalizedEmail.length > 0;
  const isEmailVerified = normalizedEmail.length > 0 && normalizedEmail === verifiedEmail && emailVerificationStatus === 'verified';

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

  const handleEmailChange = (value) => {
    const nextNormalized = normalizeEmail(value);
    const currentNormalized = normalizeEmail(email);

    setEmail(value);
    clearFieldError('email');
    clearFieldError('emailVerification');
    setSubmitError('');

    if (nextNormalized !== currentNormalized) {
      setVerifiedEmail('');
      setEmailVerificationStatus('');
      setEmailVerificationMessage('');
      setEmailVerificationCode('');
      setAutoRequestedEmail('');
    }
  };

  const requestEmailVerificationCode = async ({ isAuto = false } = {}) => {
    if (!hasEmailInput) {
      setFieldErrors(prev => ({ ...prev, email: getRequiredMessage('Personal Email Address') }));
      return;
    }

    if (!isValidEmail(email)) {
      setFieldErrors(prev => ({ ...prev, email: 'Please enter a valid email address.' }));
      return;
    }

    setRequestingEmailCode(true);
    setEmailVerificationMessage('');
    setSubmitError('');
    clearFieldError('email');
    clearFieldError('emailVerification');

    try {
      const response = await fetch('/api/organizations/setup-request/email-verification/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: normalizedEmail })
      });
      const message = await readSubmitErrorMessage(response);

      if (!response.ok) {
        setEmailVerificationMessage(message || 'Failed to send verification code. Please try again.');
        setEmailVerificationStatus('error');
        if (!isAuto) {
          setAutoRequestedEmail('');
        }
        return;
      }

      setEmailVerificationStatus('sent');
      setEmailVerificationMessage(message || 'Verification code sent. Check your email inbox.');
      setAutoRequestedEmail(normalizedEmail);
    } catch {
      setEmailVerificationStatus('error');
      setEmailVerificationMessage('Unable to send verification code right now. Please try again.');
      if (!isAuto) {
        setAutoRequestedEmail('');
      }
    } finally {
      setRequestingEmailCode(false);
    }
  };

  useEffect(() => {
    if (!hasEmailInput || !isValidEmail(email) || isEmailVerified || requestingEmailCode) {
      return;
    }
    if (autoRequestedEmail === normalizedEmail) {
      return;
    }

    const timer = window.setTimeout(() => {
      requestEmailVerificationCode({ isAuto: true });
    }, 500);

    return () => window.clearTimeout(timer);
  }, [
    autoRequestedEmail,
    email,
    hasEmailInput,
    isEmailVerified,
    normalizedEmail,
    requestingEmailCode
  ]);

  const verifyEmailCode = async () => {
    if (!hasEmailInput || !emailVerificationCode.trim()) {
      setFieldErrors(prev => ({ ...prev, emailVerification: 'Verification code is required, please.' }));
      return;
    }

    setVerifyingEmailCode(true);
    setSubmitError('');
    clearFieldError('emailVerification');

    try {
      const response = await fetch('/api/organizations/setup-request/email-verification/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: normalizedEmail,
          code: emailVerificationCode.trim()
        })
      });
      const message = await readSubmitErrorMessage(response);

      if (!response.ok) {
        setEmailVerificationStatus('error');
        setEmailVerificationMessage(message || 'Verification failed. Please check the code and try again.');
        return;
      }

      setVerifiedEmail(normalizedEmail);
      setEmailVerificationStatus('verified');
      setEmailVerificationMessage(message || 'Email verified successfully.');
      setEmailVerificationCode('');
    } catch {
      setEmailVerificationStatus('error');
      setEmailVerificationMessage('Unable to verify code right now. Please try again.');
    } finally {
      setVerifyingEmailCode(false);
    }
  };

  const validateForm = () => {
    const nextErrors = requiredFieldDefinitions.reduce((accumulator, field) => {
      if (!String(field.value || '').trim()) {
        accumulator[field.key] = getRequiredMessage(field.label);
      }
      return accumulator;
    }, {});

    if (!isEmailVerified) {
      nextErrors.emailVerification = 'Please verify your email before submitting this request.';
    }

    setFieldErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const readSubmitErrorMessage = async (response) => {
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      try {
        const data = await response.json();
        return data?.msg || '';
      } catch {
        return '';
      }
    }

    try {
      const text = await response.text();
      return text.trim();
    } catch {
      return '';
    }
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

      const message = await readSubmitErrorMessage(res);
      if (!res.ok) {
        if (message) {
          const messageMatch = message.match(/^(.+?) is required, please\.$/);
          if (messageMatch) {
            const fieldLabel = messageMatch[1];
            const matchedField = requiredFieldDefinitions.find(field => field.label === fieldLabel);
            if (matchedField) {
              setFieldErrors(prev => ({ ...prev, [matchedField.key]: message }));
              return;
            }
          }
          if (message.toLowerCase().includes('verify your email')) {
            setFieldErrors(prev => ({ ...prev, emailVerification: message }));
            return;
          }
          setSubmitError(message);
        } else {
          setSubmitError(`Submission failed with status ${res.status}. Please try again.`);
        }
      } else {
        onSubmitted && onSubmitted();
      }
    } catch (err) {
      setSubmitError(
        err?.name === 'TypeError'
          ? 'Network error. Please check your connection and try again.'
          : (err?.message || 'Submission failed. Please try again.')
      );
    } finally {
      setSubmitting(false);
    }
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
            <div style={{ position: 'relative' }}>
              <input
                className={isTypingActive('email', email) ? 'field-typing-active' : ''}
                style={getFieldStyle(Boolean(fieldErrors.email), {
                  borderColor: isEmailVerified ? '#16a34a' : undefined,
                  boxShadow: isEmailVerified ? '0 0 0 1px rgba(22, 163, 74, 0.15)' : undefined,
                  paddingRight: 36
                })}
                type="email"
                maxLength={80}
                value={email}
                onChange={e => handleEmailChange(e.target.value)}
                onFocus={() => setActiveTypingField('email')}
                onBlur={() => setActiveTypingField('')}
                required
                placeholder="you@example.com"
              />
              {isEmailVerified && (
                <span
                  aria-label="Email verified"
                  style={{
                    position: 'absolute',
                    right: 10,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#16a34a',
                    fontSize: '1.2rem',
                    fontWeight: 700
                  }}
                >
                  ✓
                </span>
              )}
            </div>

            {hasEmailInput && (
              <div style={{ marginTop: 10, padding: 10, border: '1px solid #d1d5db', borderRadius: 8, background: '#f8fafc' }}>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                  <button
                    type="button"
                    onClick={() => requestEmailVerificationCode({ isAuto: false })}
                    disabled={requestingEmailCode || !isValidEmail(email)}
                    style={{
                      ...inputStyle,
                      width: 'auto',
                      padding: '0.4rem 0.85rem',
                      background: '#e2e8f0',
                      border: '1px solid #cbd5e1',
                      fontSize: '1.1rem',
                      fontWeight: 600,
                      cursor: requestingEmailCode || !isValidEmail(email) ? 'not-allowed' : 'pointer',
                      opacity: requestingEmailCode || !isValidEmail(email) ? 0.7 : 1
                    }}
                  >
                    {requestingEmailCode ? 'Sending…' : 'Resend code'}
                  </button>
                </div>

                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                  <input
                    style={getFieldStyle(Boolean(fieldErrors.emailVerification), {
                      maxWidth: 240,
                      fontSize: '1.1rem'
                    })}
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={emailVerificationCode}
                    onChange={e => {
                      clearFieldError('emailVerification');
                      setEmailVerificationCode(e.target.value.replace(/[^0-9]/g, ''));
                    }}
                    placeholder="Enter verification code"
                  />
                  <button
                    type="button"
                    onClick={verifyEmailCode}
                    disabled={verifyingEmailCode || !emailVerificationCode.trim()}
                    style={{
                      ...inputStyle,
                      width: 'auto',
                      padding: '0.4rem 0.85rem',
                      background: '#4169e1',
                      border: '1px solid #3657ba',
                      color: '#fff',
                      fontSize: '1.1rem',
                      fontWeight: 600,
                      cursor: verifyingEmailCode || !emailVerificationCode.trim() ? 'not-allowed' : 'pointer',
                      opacity: verifyingEmailCode || !emailVerificationCode.trim() ? 0.7 : 1
                    }}
                  >
                    {verifyingEmailCode ? 'Checking…' : 'Check code'}
                  </button>
                </div>

                {!!emailVerificationMessage && (
                  <div
                    style={{
                      marginTop: 8,
                      fontSize: '1rem',
                      color: emailVerificationStatus === 'verified' ? '#166534' : (emailVerificationStatus === 'error' ? '#dc2626' : '#1f2937'),
                      fontWeight: 600
                    }}
                  >
                    {emailVerificationMessage}
                  </div>
                )}

                {fieldErrors.emailVerification && (
                  <div style={{ marginTop: 6, color: '#dc2626', fontSize: '1rem', fontWeight: 600, textAlign: 'left' }}>
                    {fieldErrors.emailVerification}
                  </div>
                )}
              </div>
            )}
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
            targetKb={100}
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
            targetKb={30}
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
