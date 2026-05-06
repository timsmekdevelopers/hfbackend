import React, { useEffect, useState } from 'react';

export default function RelocationRequestForm({ user }) {
  const [newResidence, setNewResidence] = useState({ country: '', state: '', city: '', address: '' });
  const [centers, setCenters] = useState([]);
  const [targetLeaderId, setTargetLeaderId] = useState('');
  const [loadingCenters, setLoadingCenters] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const loadCenters = async () => {
      if (!newResidence.country || !newResidence.state || !newResidence.city) {
        setCenters([]);
        setTargetLeaderId('');
        return;
      }

      setLoadingCenters(true);
      setMessage('');
      try {
        const params = new URLSearchParams(newResidence);
        const res = await fetch(`/api/relocations/centers?${params.toString()}`);
        const payload = await res.json();
        if (!res.ok) throw new Error(payload?.msg || 'Failed to load HF centers');
        const rows = Array.isArray(payload.centers) ? payload.centers : [];
        setCenters(rows);
        setTargetLeaderId(rows[0]?.leaderId ? String(rows[0].leaderId) : '');
      } catch (err) {
        setMessage(err.message || 'Failed to load HF centers');
        setCenters([]);
      } finally {
        setLoadingCenters(false);
      }
    };

    loadCenters();
  }, [newResidence]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage('');
    try {
      const res = await fetch('/api/relocations/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          applicantId: user._id,
          newResidence,
          targetLeaderId
        })
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload?.msg || 'Failed to submit relocation request');
      setMessage('Relocation application submitted successfully.');
    } catch (err) {
      setMessage(err.message || 'Failed to submit relocation request');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section style={{ marginTop: 16, border: '1px solid var(--theme-soft-border)', borderRadius: 10, background: '#fff', padding: 16 }}>
      <h3 style={{ marginTop: 0, color: 'var(--theme-text-strong)' }}>Relocation Application</h3>
      <p style={{ marginTop: 0, color: 'var(--theme-text-muted)', fontSize: 13 }}>
        Select your new residence and choose the nearest HF center. Your request will appear for Branch/State Pastor and Admin review.
      </p>

      {message && <p style={{ color: message.toLowerCase().includes('failed') || message.toLowerCase().includes('error') ? '#c62828' : '#2e7d32' }}>{message}</p>}

      <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 10 }}>
        <input
          value={newResidence.country}
          onChange={(e) => setNewResidence((prev) => ({ ...prev, country: e.target.value }))}
          placeholder="New country"
          required
          style={{ padding: 8 }}
        />
        <input
          value={newResidence.state}
          onChange={(e) => setNewResidence((prev) => ({ ...prev, state: e.target.value }))}
          placeholder="New state"
          required
          style={{ padding: 8 }}
        />
        <input
          value={newResidence.city}
          onChange={(e) => setNewResidence((prev) => ({ ...prev, city: e.target.value }))}
          placeholder="New city"
          required
          style={{ padding: 8 }}
        />
        <input
          value={newResidence.address}
          onChange={(e) => setNewResidence((prev) => ({ ...prev, address: e.target.value }))}
          placeholder="New residential address"
          style={{ padding: 8 }}
        />

        <label>
          <span style={{ display: 'block', marginBottom: 6, fontSize: 13 }}>Nearest HF center</span>
          <select value={targetLeaderId} onChange={(e) => setTargetLeaderId(e.target.value)} required style={{ width: '100%', padding: 8 }}>
            {loadingCenters && <option value="">Loading centers...</option>}
            {!loadingCenters && centers.length === 0 && <option value="">No HF centers found for this location</option>}
            {!loadingCenters && centers.map((center) => (
              <option key={center.leaderId} value={center.leaderId}>
                {center.leaderName} - {center.city}, {center.state}
              </option>
            ))}
          </select>
        </label>

        <button className="primary-btn" type="submit" disabled={submitting || !targetLeaderId}>
          {submitting ? 'Submitting...' : 'Submit Relocation Application'}
        </button>
      </form>
    </section>
  );
}
