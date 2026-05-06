import React, { useEffect, useState } from 'react';
import { useTranslation } from './i18n';

function formatTickDate(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString();
}

export default function MemberDashboard({ user }) {
  const { t } = useTranslation();
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadSummary = async () => {
      if (!user?._id) return;
      setLoading(true);
      setError('');
      try {
        const res = await fetch(`/api/attendance/member-summary?userId=${encodeURIComponent(user._id)}`);
        const payload = await res.json();
        if (!res.ok) throw new Error(payload?.msg || t('fetchError'));
        setSummary(payload.member || null);
      } catch (err) {
        setError(err.message || t('fetchError'));
      } finally {
        setLoading(false);
      }
    };

    loadSummary();
  }, [t, user?._id]);

  const cards = [
    { label: t('timesAttended'), value: Number(summary?.attendanceCount || 0) },
    { label: t('attendancePercentage'), value: `${Number(summary?.attendancePercentage || 0)}%` },
    {
      label: t('yourHfLeader'),
      value: summary?.leaderName
        ? `${t('yourHfLeader')} ${summary.leaderName} ${t('phoneNumberIs')} ${summary.leaderPhone || '-'}`
        : t('noAssignedHfLeader')
    }
  ];

  return (
    <section style={{ marginTop: 16, border: '1px solid var(--theme-soft-border)', borderRadius: 12, background: '#fff', padding: 16, boxShadow: '0 10px 30px rgba(0,0,0,0.04)' }}>
      <h3 style={{ marginTop: 0, color: 'var(--theme-text-strong)' }}>{t('attendanceSummaryForMember')}</h3>

      {loading && <p style={{ color: 'var(--theme-text-muted)' }}>{t('loadingMemberSummary')}</p>}
      {error && <p style={{ color: '#c62828' }}>{error}</p>}

      {!loading && !error && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, marginBottom: 16 }}>
            {cards.map((card) => (
              <div key={card.label} style={{ border: '1px solid var(--theme-soft-border)', borderRadius: 12, padding: 14, background: 'var(--theme-soft-bg)' }}>
                <div style={{ color: 'var(--theme-text-muted)', fontSize: 12, marginBottom: 6 }}>{card.label}</div>
                <div style={{ color: 'var(--theme-text-strong)', fontWeight: 800, fontSize: card.label === t('yourHfLeader') ? 15 : 24, lineHeight: 1.4 }}>
                  {card.value}
                </div>
              </div>
            ))}
          </div>

          <div style={{ border: '1px solid var(--theme-soft-border)', borderRadius: 12, padding: 14, background: '#fff' }}>
            <div style={{ fontWeight: 700, color: 'var(--theme-text-strong)', marginBottom: 10 }}>{t('attendanceTicks')}</div>
            {!summary?.ticks?.length ? (
              <p style={{ margin: 0, color: 'var(--theme-text-muted)' }}>{t('noAttendanceTicks')}</p>
            ) : (
              <div style={{ display: 'grid', gap: 8 }}>
                {summary.ticks.map((tick, index) => (
                  <div key={`${tick.weekStart || tick.at || index}-${index}`} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 8, background: 'var(--theme-soft-bg)' }}>
                    <span style={{ color: 'var(--theme-primary)', fontWeight: 700 }}>✓</span>
                    <span style={{ color: 'var(--theme-text-strong)' }}>
                      {formatTickDate(tick.weekStart || tick.at)}
                      {tick.creditedByName ? ` • ${tick.creditedByName}` : ''}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </section>
  );
}
