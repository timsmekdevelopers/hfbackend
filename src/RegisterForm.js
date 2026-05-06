import React, { useEffect, useMemo, useState } from 'react';
import { Country, State, City } from 'country-state-city';
import { useTranslation } from './i18n';

function generateTempPassword() {
  return Math.random().toString(36).slice(-8);
}

function RegisterForm({ onBack, onRegistered, initialRole = '' }) {
  const { t, securityQuestions, roleLabels } = useTranslation();

  const [role, setRole] = useState(initialRole);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [branchAddress, setBranchAddress] = useState('');
  const [stateHqAddress, setStateHqAddress] = useState('');
  const [country, setCountry] = useState(''); // country ISO code
  const [state, setState] = useState(''); // state ISO code
  const [city, setCity] = useState('');
  const [phone, setPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [tempPassword] = useState(generateTempPassword());
  const [securityQuestion, setSecurityQuestion] = useState('');
  const [securityAnswer, setSecurityAnswer] = useState('');
  // Roles for selection (Admin not included)
  const roles = [
    { value: 'Member', label: roleLabels['Member'] || 'Member' },
    { value: 'HF Leader', label: roleLabels['HF Leader'] },
    { value: 'Branch Pastor', label: roleLabels['Branch Pastor'] },
    { value: 'State Pastor', label: roleLabels['State Pastor'] }
  ];
  const countries = useMemo(() => Country.getAllCountries().sort((a, b) => a.name.localeCompare(b.name)), []);
  const selectedCountry = countries.find(c => c.isoCode === country);
  const states = useMemo(() => (country ? State.getStatesOfCountry(country).sort((a, b) => a.name.localeCompare(b.name)) : []), [country]);
  const selectedState = states.find(s => s.isoCode === state);
  const cities = useMemo(() => ((country && state) ? City.getCitiesOfState(country, state).sort((a, b) => a.name.localeCompare(b.name)) : []), [country, state]);
  const dialingCode = selectedCountry ? `+${selectedCountry.phonecode}` : '';


  useEffect(() => {
    setRole(initialRole || '');
  }, [initialRole]);

  const handleCountryChange = e => {
    setCountry(e.target.value);
    setState('');
    setCity('');
  };
  const handleStateChange = e => {
    setState(e.target.value);
    setCity('');
  };


  const handleSubmit = async e => {
    e.preventDefault();
    // Only require security Q/A for HF Leader or pending approval
    if ((role === 'HF Leader') && (!securityQuestion || !securityAnswer)) {
      alert(t('pleaseSelectSecurity'));
      return;
    }
    if (role === 'Branch Pastor' && !branchAddress.trim()) {
      alert(t('pleaseEnterBranchAddress'));
      return;
    }
    if (role === 'State Pastor' && !stateHqAddress.trim()) {
      alert(t('pleaseEnterStateHqAddress'));
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/users/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: fullName,
          email,
          password: tempPassword,
          role,
          country: selectedCountry ? selectedCountry.name : '',
          state: selectedState ? selectedState.name : '',
          city,
          phone: dialingCode + phone,
          address,
          branchAddress: (role === 'Branch Pastor') ? branchAddress.trim() : undefined,
          stateHqAddress: (role === 'State Pastor') ? stateHqAddress.trim() : undefined,
          securityQuestion: (role === 'HF Leader') ? securityQuestion : undefined,
          securityAnswer: (role === 'HF Leader') ? securityAnswer.trim().toLowerCase().replace(/\s+/g, '') : undefined
        })
      });
      const data = await res.json();
      if (res.ok) {
        onRegistered && onRegistered({ email, tempPassword, autoApproved: Boolean(data?.autoApproved) });
      } else {
        alert(data.msg || t('registrationFailed'));
      }
    } catch (err) {
      alert(t('registrationError', { message: err.message }));
    }
    setSubmitting(false);
  };

  return (
    <div className="register-form" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <img src={process.env.PUBLIC_URL + '/smhos-logo.png'} alt={t('appTitle')} style={{ width: 135, margin: '0 auto 18px auto', display: 'block' }} />
      <h2 style={{ textAlign: 'center' }}>{t('registerHeading')}</h2>
      <form className="form" onSubmit={handleSubmit} style={{ width: '100%', maxWidth: 400 }}>
        <div className="form-group">
          <label>{t('registerMeAs')} <span style={{ color: 'var(--theme-primary)', fontWeight: 500 }}>*</span></label>
          <select value={role} onChange={e => setRole(e.target.value)} required>
            <option value="">{t('selectRole')}</option>
            {roles.map(r => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label>{t('fullName')} <span style={{ color: 'var(--theme-primary)', fontWeight: 500 }}>*</span></label>
          <input
            type="text"
            maxLength={40}
            value={fullName}
            onChange={e => setFullName(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label>{t('emailAddress')} <span style={{ color: 'var(--theme-primary)', fontWeight: 500 }}>*</span></label>
          <input
            type="email"
            maxLength={40}
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
          />
        </div>
        {/* ...other fields... */}
        <div className="form-group">
          <label>{t('countryOfResidence')} <span style={{ color: 'var(--theme-primary)', fontWeight: 500 }}>*</span></label>
          <select value={country} onChange={handleCountryChange} required>
            <option value="">{t('selectCountry')}</option>
            {countries.map((c, index) => (
              <option key={c.isoCode} value={c.isoCode}>{c.name}</option>
            ))}
          </select>
        </div>
        {country && (
          <div className="form-group">
            <label>{t('state')} <span style={{ color: 'var(--theme-primary)', fontWeight: 500 }}>*</span></label>
            <select value={state} onChange={handleStateChange} required>
              <option value="">{t('selectState')}</option>
              {states.map((s, index) => (
                <option key={s.isoCode} value={s.isoCode}>{s.name}</option>
              ))}
            </select>
          </div>
        )}
        {country && state && (
          <div className="form-group">
            <label>{t('cityCountyLga')} <span style={{ color: 'var(--theme-primary)', fontWeight: 500 }}>*</span></label>
            <select value={city} onChange={e => setCity(e.target.value)} required>
              <option value="">{t('selectCityCountyLga')}</option>
              {cities.map((cityObj, index) => (
                <option key={cityObj.name} value={cityObj.name}>{cityObj.name}</option>
              ))}
            </select>
          </div>
        )}
        <div className="form-group">
          <label>{t('phoneNo')} <span style={{ color: 'var(--theme-primary)', fontWeight: 500 }}>*</span></label>
          <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
            <span style={{ marginRight: 8, minWidth: 40 }}>{dialingCode}</span>
            <input
              type="tel"
              maxLength={15}
              pattern="[0-9]{1,15}"
              value={phone}
              onChange={e => {
                // Only allow numbers
                const val = e.target.value.replace(/[^0-9]/g, '');
                setPhone(val);
              }}
              required
              style={{ flex: 1 }}
            />
          </div>
        </div>
        <div className="form-group">
          <label>{t('residentialAddress')} <span style={{ color: 'var(--theme-primary)', fontWeight: 500 }}>*</span></label>
          <input
            type="text"
            maxLength={60}
            value={address}
            onChange={e => setAddress(e.target.value)}
            required
          />
        </div>
        {role === 'Branch Pastor' && (
          <div className="form-group">
            <label>{t('addressOfBranch')} <span style={{ color: 'var(--theme-primary)', fontWeight: 500 }}>*</span></label>
            <input
              type="text"
              maxLength={60}
              value={branchAddress}
              onChange={e => setBranchAddress(e.target.value)}
              required
            />
          </div>
        )}
        {role === 'State Pastor' && (
          <div className="form-group">
            <label>{t('addressOfStateHeadquarters')} <span style={{ color: 'var(--theme-primary)', fontWeight: 500 }}>*</span></label>
            <input
              type="text"
              maxLength={60}
              value={stateHqAddress}
              onChange={e => setStateHqAddress(e.target.value)}
              required
            />
          </div>
        )}
        {/* Security Question/Answer fields for HF Leader role only, rendered once here */}
        {role === 'HF Leader' && (
          <>
            <div className="form-group">
              <label>{t('securityQuestion')} <span style={{ color: 'var(--theme-primary)', fontWeight: 500 }}>*</span></label>
              <select value={securityQuestion} onChange={e => setSecurityQuestion(e.target.value)} required>
                <option value="">{t('selectQuestion')}</option>
                {securityQuestions.map((question) => (
                  <option key={question.key} value={question.text}>{question.text}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>{t('securityAnswer')} <span style={{ color: 'var(--theme-primary)', fontWeight: 500 }}>*</span></label>
              <input
                type="text"
                value={securityAnswer}
                onChange={e => setSecurityAnswer(e.target.value)}
                required
              />
              <div style={{ fontSize: 12, color: '#636e72', marginTop: 4 }}>
                {t('securityNote')}
              </div>
            </div>
          </>
        )}
        <button type="submit" className="primary-btn" disabled={submitting}>
          {submitting ? t('registering') : t('registerAsRole', { role: roles.find((item) => item.value === role)?.label || '...' })}
        </button>
      </form>
      <button className="link-btn" onClick={onBack} style={{ marginTop: '1rem' }}>
        {t('backToLogin')}
      </button>
    </div>
  );
}

export default RegisterForm;
