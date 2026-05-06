import React, { useEffect, useMemo, useState } from 'react';

export default function HFLeaderAttendance({ user }) {
  const [members, setMembers] = useState([]);
  const [selectedIds, setSelectedIds] = useState({});
  const [totals, setTotals] = useState({
    totalAttendance: '',
    maleAdults: '',
    femaleAdults: '',
    children: ''
  });
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const load = async () => {
      if (!user?._id) return;
      setLoading(true);
      setMessage('');
      try {
        const res = await fetch(`/api/attendance/members?leaderId=${encodeURIComponent(user._id)}`);
        const payload = await res.json();
        if (!res.ok) throw new Error(payload?.msg || 'Failed to load members');
        setMembers(Array.isArray(payload.members) ? payload.members : []);
      } catch (err) {
        setMessage(err.message || 'Failed to load members');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [user?._id]);

  const presentCount = useMemo(
    () => Object.values(selectedIds).filter(Boolean).length,
    [selectedIds]
  );

  const toggleMember = (id) => {
    setSelectedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage('');
    try {
      const presentMemberIds = Object.entries(selectedIds)
        .filter(([, value]) => Boolean(value))
        .map(([id]) => id);

      const res = await fetch('/api/attendance/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leaderId: user._id,
          totals: {
            totalAttendance: Number(totals.totalAttendance) || 0,
            maleAdults: Number(totals.maleAdults) || 0,
            femaleAdults: Number(totals.femaleAdults) || 0,
            children: Number(totals.children) || 0
          },
          presentMemberIds
        })
      });

      const payload = await res.json();
      if (!res.ok) throw new Error(payload?.msg || 'Failed to submit attendance');
      setMessage('Attendance submitted successfully.');
      setSelectedIds({});
      setTotals({ totalAttendance: '', maleAdults: '', femaleAdults: '', children: '' });
      setMembers((prev) => prev.map((item) => (
        presentMemberIds.includes(String(item._id))
          ? { ...item, attendanceCredits: Number(item.attendanceCredits || 0) + 1 }
          : item
      )));
    } catch (err) {
      setMessage(err.message || 'Failed to submit attendance');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section style={{ marginTop: 16, border: '1px solid var(--theme-soft-border)', borderRadius: 10, background: '#fff', padding: 16 }}>
      <h3 style={{ marginTop: 0, color: 'var(--theme-text-strong)' }}>Attendance Form</h3>
      <p style={{ marginTop: 0, color: 'var(--theme-text-muted)', fontSize: 13 }}>
        Tick members present for this week. Member credits appear as superscript and are preserved even after relocation.
      </p>

      {message && <p style={{ color: message.toLowerCase().includes('failed') || message.toLowerCase().includes('error') ? '#c62828' : '#2e7d32' }}>{message}</p>}

      <form onSubmit={handleSubmit}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 10, marginBottom: 12 }}>
          <label>
            <span style={{ display: 'block', fontSize: 13, marginBottom: 4 }}>Total Attendance</span>
            <input type="number" min="0" value={totals.totalAttendance} onChange={(e) => setTotals((prev) => ({ ...prev, totalAttendance: e.target.value }))} style={{ width: '100%', padding: 8 }} />
          </label>
          <label>
            <span style={{ display: 'block', fontSize: 13, marginBottom: 4 }}>Male Adults</span>
            <input type="number" min="0" value={totals.maleAdults} onChange={(e) => setTotals((prev) => ({ ...prev, maleAdults: e.target.value }))} style={{ width: '100%', padding: 8 }} />
          </label>
          <label>
            <span style={{ display: 'block', fontSize: 13, marginBottom: 4 }}>Female Adults</span>
            <input type="number" min="0" value={totals.femaleAdults} onChange={(e) => setTotals((prev) => ({ ...prev, femaleAdults: e.target.value }))} style={{ width: '100%', padding: 8 }} />
          </label>
          <label>
            <span style={{ display: 'block', fontSize: 13, marginBottom: 4 }}>Children</span>
            <input type="number" min="0" value={totals.children} onChange={(e) => setTotals((prev) => ({ ...prev, children: e.target.value }))} style={{ width: '100%', padding: 8 }} />
          </label>
        </div>

        <div style={{ border: '1px solid var(--theme-soft-border)', borderRadius: 8, padding: 10, marginBottom: 10, background: 'var(--theme-soft-bg)' }}>
          <div style={{ marginBottom: 8, fontWeight: 700 }}>Members (Present: {presentCount})</div>
          {loading ? (
            <p style={{ margin: 0 }}>Loading members...</p>
          ) : members.length === 0 ? (
            <p style={{ margin: 0, color: '#666' }}>No members found in your HF center yet.</p>
          ) : (
            <div style={{ display: 'grid', gap: 6 }}>
              {members.map((member) => (
                <label key={member._id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input type="checkbox" checked={Boolean(selectedIds[member._id])} onChange={() => toggleMember(member._id)} />
                  <span>
                    {member.name}
                    <sup style={{ marginLeft: 4, color: 'var(--theme-text-strong)', fontWeight: 700 }}>{Number(member.attendanceCredits || 0)}</sup>
                  </span>
                </label>
              ))}
            </div>
          )}
        </div>

        <button className="primary-btn" type="submit" disabled={submitting}>
          {submitting ? 'Submitting...' : 'Submit Attendance'}
        </button>
      </form>
    </section>
  );
}
