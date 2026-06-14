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
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
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

  // Email verification (step 0)
  const timerRef = useRef(null);
  const [step, setStep] = useState(0);
  const [verificationCode, setVerificationCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [checkingCode, setCheckingCode] = useState(false);
  const [codeError, setCodeError] = useState('');
  const [resendCooldownSecs, setResendCooldownSecs] = useState(0);
  const [emailSendCount, setEmailSendCount] = useState(0);

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

  const startCooldown = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setResendCooldownSecs(600);
    timerRef.current = setInterval(() => {
      setResendCooldownSecs(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          timerRef.current = null;
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const resetEmailVerification = () => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    setResendCooldownSecs(0);
    setEmail('');
    setCodeSent(false);
    setVerificationCode('');
    setCodeError('');
    setEmailSendCount(0);
  };

  const formatCooldown = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  const handleSendCode = async (emailValue) => {
    const trimmed = (emailValue !== undefined ? emailValue : email).trim();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return;
    setSendingCode(true);
    setCodeError('');
    try {
      const res = await fetch('/api/organizations/setup-request/send-email-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmed })
      });
      const data = await res.json();
      if (!res.ok) {
        setCodeError(data.msg || 'Failed to send code. Please try again.');
      } else {
        setCodeSent(true);
        setEmailSendCount(prev => prev + 1);
        startCooldown();
      }
    } catch {
      setCodeError('Network error. Please check your connection and try again.');
    } finally {
      setSendingCode(false);
    }
  };

  const handleCheckCode = async () => {
    if (!verificationCode.trim()) {
      setCodeError('Please enter the verification code.');
      return;
    }
    setCheckingCode(true);
    setCodeError('');
    try {
      const res = await fetch('/api/organizations/setup-request/verify-email-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), code: verificationCode.trim() })
      });
      const data = await res.json();
      if (!res.ok) {
        setCodeError(data.msg || 'Incorrect code. Please try again.');
      } else {
        setStep(1);
      }
    } catch {
      setCodeError('Network error. Please check your connection and try again.');
    } finally {
      setCheckingCode(false);
    }
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

  // ── Step 0: Email verification ─────────────────────────────────────────────
  if (step === 0) {
    const canResend = emailSendCount < 2 && resendCooldownSecs === 0 && !sendingCode;
    const emailVerifyView = (
      <>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <h2 style={{ margin: 0, color: '#000', fontSize: '2.1rem', fontWeight: 800 }}>
            Request for Our Church Fellowship Setup
          </h2>
          <p style={{ margin: '8px 0 0', color: '#000', fontSize: '1.35rem' }}>
            Enter your email address below. A 6-digit verification code will be sent to verify it before you proceed.
          </p>
        </div>

        <div style={{ marginBottom: 8 }}>
          {!codeSent ? (
            <>
              <Field label="Personal Email Address" required error={fieldErrors.email}>
                <input
                  style={getFieldStyle(Boolean(fieldErrors.email))}
                  type="email"
                  maxLength={80}
                  value={email}
                  onChange={e => {
                    setEmail(e.target.value);
                    setCodeError('');
                    clearFieldError('email');
                  }}
                  onBlur={e => {
                    const val = e.target.value.trim();
                    if (val && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val) && !sendingCode) {
                      handleSendCode(val);
                    }
                  }}
                  placeholder="you@example.com"
                  disabled={sendingCode}
                />
              </Field>
              {sendingCode && (
                <p style={{ color: '#666', fontSize: '1.15rem', marginTop: 4 }}>Sending verification code…</p>
              )}
              {!sendingCode && codeError && (
                <div style={{ marginTop: 8, color: '#dc2626', fontSize: '1.15rem', fontWeight: 600 }}>{codeError}</div>
              )}
            </>
          ) : (
            <p style={{ fontSize: '1.2rem', color: '#000', margin: '0 0 16px', lineHeight: 1.55 }}>
              A verification code has been sent to <strong>{email}</strong>.{' '}
              <button
                type="button"
                onClick={resetEmailVerification}
                style={{ background: 'none', border: 'none', color: '#4169e1', cursor: 'pointer', textDecoration: 'underline', fontSize: 'inherit', padding: 0 }}
              >
                Wrong email? Click here to change.
              </button>
            </p>
          )}

          {codeSent && (
            <div style={{ marginTop: 8 }}>
              <Field label="Enter Verification Code">
                <input
                  style={getFieldStyle(Boolean(codeError))}
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={verificationCode}
                  onChange={e => { setVerificationCode(e.target.value.replace(/[^0-9]/g, '')); setCodeError(''); }}
                  placeholder="6-digit code"
                  autoFocus
                />
              </Field>

              {codeError && (
                <div style={{ marginBottom: 12, color: '#dc2626', fontSize: '1.15rem', fontWeight: 600 }}>{codeError}</div>
              )}

              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 4 }}>
                <button
                  type="button"
                  onClick={handleCheckCode}
                  disabled={checkingCode}
                  style={{ padding: '0.5rem 1.2rem', background: checkingCode ? '#93c5fd' : '#4169e1', color: '#fff', border: 'none', borderRadius: 7, fontSize: '1.35rem', fontWeight: 700, cursor: checkingCode ? 'not-allowed' : 'pointer' }}
                >
                  {checkingCode ? 'Checking…' : 'Check Code'}
                </button>
                {emailSendCount < 2 && (
                  <button
                    type="button"
                    onClick={() => handleSendCode(email)}
                    disabled={!canResend}
                    style={{ padding: '0.5rem 1.2rem', background: 'none', color: canResend ? '#4169e1' : '#9ca3af', border: `1px solid ${canResend ? '#4169e1' : '#d1d5db'}`, borderRadius: 7, fontSize: '1.15rem', cursor: canResend ? 'pointer' : 'not-allowed' }}
                  >
                    {sendingCode ? 'Sending…' : resendCooldownSecs > 0 ? `Resend in ${formatCooldown(resendCooldownSecs)}` : 'Resend Code'}
                  </button>
                )}
              </div>

              {emailSendCount >= 2 && (
                <div style={{ marginTop: 16, padding: '12px 16px', background: '#fef3c7', border: '1px solid #f59e0b', borderRadius: 7 }}>
                  <p style={{ margin: 0, color: '#92400e', fontSize: '1.15rem' }}>
                    We have already sent a verification code to this email address twice. If you have not received either code, please{' '}
                    <button
                      type="button"
                      onClick={resetEmailVerification}
                      style={{ background: 'none', border: 'none', color: '#92400e', fontWeight: 700, cursor: 'pointer', textDecoration: 'underline', padding: 0, fontSize: 'inherit' }}
                    >
                      use a different email address
                    </button>.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        <div style={{ textAlign: 'center', marginTop: 24 }}>
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
    return isMobile ? emailVerifyView : <div className="setup-form-desktop-wrapper">{emailVerifyView}</div>;
  }

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
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                style={getFieldStyle(false, { flex: 1, background: '#f3f4f6', color: '#555' })}
                type="email"
                value={email}
                readOnly
              />
              <span style={{ color: '#16a34a', fontWeight: 700, fontSize: '1.15rem', whiteSpace: 'nowrap' }}>&#10003; Verified</span>
            </div>
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
