import React, { useState, useEffect, useCallback, useMemo } from 'react';
import ApprovalPanel from './ApprovalPanel';
import HFRichTextEditor from './HFRichTextEditor';
import { useTranslation } from './i18n';
import SettingsPanel from './SettingsPanel';

function getAdminDocumentLanguageStorageKey(userId) {
  return `hf_admin_documents_locale_${userId || 'guest'}`;
}

const TABS = [
  { id: 'approvals', labelKey: 'adminTabApprovals', roles: ['Branch Pastor', 'State Pastor', 'Admin'] },
  { id: 'announcements', labelKey: 'adminTabAnnouncements', roles: ['Branch Pastor', 'State Pastor', 'Admin'] },
  { id: 'schedule', labelKey: 'adminTabSchedule', roles: ['Branch Pastor', 'State Pastor', 'Admin'] },
  { id: 'documents', labelKey: 'adminTabDocuments', roles: ['Branch Pastor', 'State Pastor', 'Admin'] },
  { id: 'attendance', labelKey: 'adminTabAttendance', roles: ['Admin'] },
  { id: 'relocations', labelKey: 'adminTabRelocations', roles: ['Branch Pastor', 'State Pastor', 'Admin'] },
  { id: 'post-manual', labelKey: 'adminTabPostManual', roles: ['Branch Pastor', 'State Pastor', 'Admin'] },
  { id: 'post-guide', labelKey: 'adminTabPostGuide', roles: ['Branch Pastor', 'State Pastor', 'Admin'] },
  { id: 'stats', labelKey: 'adminTabStats', roles: ['Branch Pastor', 'State Pastor', 'Admin'] },
  { id: 'fellow-centers', label: 'Our Church Fellowship', roles: ['Super Admin'] },
  { id: 'admins', label: 'Admins', roles: ['Super Admin'] },
  { id: 'settings', label: 'Settings', roles: ['Branch Pastor', 'State Pastor', 'Admin'] }
];

export default function AdminDashboard({ user, languageOptions, locale, org, onOrgUpdated }) {
  const { t } = useTranslation();
  const [tab, setTab] = useState('approvals');
  const visibleTabs = useMemo(() => TABS.filter((item) => item.roles.includes(user?.role)), [user?.role]);

  useEffect(() => {
    if (!visibleTabs.some((item) => item.id === tab)) {
      setTab(visibleTabs[0]?.id || 'approvals');
    }
  }, [tab, visibleTabs]);

  return (
    <div style={{ width: '100%', border: '1px solid var(--theme-soft-border)', borderRadius: 10, overflow: 'hidden', marginTop: 16 }}>
      <div style={{ background: 'transparent', padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <h2 style={{ margin: 0, color: 'var(--theme-text-strong)', fontSize: '1.1rem', fontWeight: 600 }}>
          {user?.role === 'Super Admin' ? 'Super Admin Dashboard' : 'Admin Dashboard'}
        </h2>
        {user?.role !== 'Super Admin' && (user?.organization_id || org?.organization_id) && (
          <span style={{ background: 'var(--theme-primary)', color: '#fff', borderRadius: 6, padding: '3px 12px', fontSize: '0.82rem', fontWeight: 700, letterSpacing: 2 }}>
            OCF Code: {(org?.organization_id || user?.organization_id || '').toUpperCase()}
          </span>
        )}
      </div>

      {user?.role !== 'Super Admin' && (
        <div style={{ padding: '0 20px 16px 20px', background: 'var(--theme-surface)' }}>
          <JurisdictionStatsCards user={user} t={t} />
        </div>
      )}

      <div style={{ display: 'flex', minHeight: 420 }}>
        <nav style={{ width: 220, flexShrink: 0, background: 'var(--theme-sidebar-bg)', display: 'flex', flexDirection: 'column', paddingTop: 8 }}>
          {visibleTabs.map(({ id, labelKey, label }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`admin-nav-tab${tab === id ? ' active' : ''}`}
            >
              {labelKey ? t(labelKey) : label}
            </button>
          ))}
        </nav>

        <div style={{ flex: 1, padding: 24, background: 'var(--theme-surface)', overflowX: 'auto' }}>
          {tab === 'approvals' && <ApprovalPanel approver={user} onAction={() => {}} />}
          {tab === 'announcements' && <AnnouncementsManager user={user} t={t} />}
          {tab === 'schedule' && <ScheduleManager user={user} t={t} />}
          {tab === 'documents' && <DocumentsCenter user={user} t={t} languageOptions={languageOptions} locale={locale} />}
          {tab === 'attendance' && <AttendanceOverview user={user} t={t} />}
          {tab === 'relocations' && <RelocationApplications user={user} t={t} />}
          {tab === 'post-manual' && <DocumentComposer user={user} t={t} type="manual" />}
          {tab === 'post-guide' && <DocumentComposer user={user} t={t} type="guide" />}
          {tab === 'stats' && <DocumentStats t={t} />}
          {tab === 'fellow-centers' && <FellowCentersPanel user={user} />}
          {tab === 'admins' && <AdminsPanel user={user} />}
          {tab === 'settings' && (
            <SettingsPanel
              user={user}
              onClose={() => setTab('approvals')}
              onUserUpdated={() => {}}
              languageOptions={languageOptions}
              locale={locale}
              setLocale={() => {}}
              org={org}
              onOrgUpdated={onOrgUpdated}
              inline
            />
          )}
        </div>
      </div>
    </div>
  );
}

function JurisdictionStatsCards({ user, t }) {
  const [stats, setStats] = useState(null);
  const [scope, setScope] = useState('global');
  const [error, setError] = useState('');

  useEffect(() => {
    const loadStats = async () => {
      if (!user?._id) return;
      setError('');
      try {
        const res = await fetch(`/api/users/dashboard-stats?userId=${encodeURIComponent(user._id)}`);
        const payload = await res.json();
        if (!res.ok) {
          throw new Error(payload?.msg || t('fetchError'));
        }
        setStats(payload?.stats || null);
        setScope(payload?.scope || 'global');
      } catch (err) {
        setError(err.message || t('fetchError'));
      }
    };

    loadStats();
  }, [t, user?._id]);

  const cards = [
    { key: 'totalHfCenters', label: t('totalHfCenters') },
    { key: 'totalBranches', label: t('totalBranches') },
    { key: 'totalHfMembers', label: t('totalHfMembers') },
    { key: 'totalHfAttendanceForWeek', label: t('totalHfAttendanceForWeek') },
    { key: 'totalCountries', label: t('totalCountriesChurchIsIn') }
  ];

  const scopeLabel = scope === 'global'
    ? t('scopeGlobal')
    : (scope === 'state' ? t('scopeState') : t('scopeBranch'));

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
        <h3 style={{ margin: 0, color: 'var(--theme-text-strong)' }}>{t('importantStats')}</h3>
        <small style={{ color: 'var(--theme-text-muted)' }}>{scopeLabel}</small>
      </div>

      {error && <p style={{ color: '#c62828', marginTop: 0 }}>{error}</p>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 10 }}>
        {cards.map((card) => (
          <div key={card.key} style={{ border: '1px solid var(--theme-soft-border)', borderRadius: 10, padding: 12, background: 'var(--theme-soft-bg)' }}>
            <div style={{ color: 'var(--theme-text-muted)', fontSize: 12, marginBottom: 4 }}>{card.label}</div>
            <div style={{ color: 'var(--theme-text-strong)', fontWeight: 800, fontSize: 22 }}>
              {stats ? Number(stats[card.key] || 0) : 0}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function DocumentsCenter({ user, t, languageOptions, locale }) {
  const [latestManual, setLatestManual] = useState(null);
  const [latestGuide, setLatestGuide] = useState(null);
  const [selectedLocale, setSelectedLocale] = useState(locale || 'en-US');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const availableLangs = Array.isArray(languageOptions) && languageOptions.length
    ? languageOptions
    : [{ value: 'en-US', label: 'English (United States)' }];

  useEffect(() => {
    const loadDocs = async () => {
      setLoading(true);
      setError('');
      try {
        const [manualRes, guideRes] = await Promise.all([
          fetch('/api/manuals?type=manual'),
          fetch('/api/manuals?type=guide')
        ]);
        const manuals = await manualRes.json();
        const guides = await guideRes.json();
        setLatestManual(Array.isArray(manuals) && manuals.length ? manuals[0] : null);
        setLatestGuide(Array.isArray(guides) && guides.length ? guides[0] : null);
      } catch {
        setError(t('fetchError'));
      } finally {
        setLoading(false);
      }
    };

    loadDocs();
  }, [t]);

  useEffect(() => {
    try {
      const storedLocale = localStorage.getItem(getAdminDocumentLanguageStorageKey(user?._id));
      setSelectedLocale(storedLocale || locale || 'en-US');
    } catch {
      setSelectedLocale(locale || 'en-US');
    }
  }, [locale, user?._id]);

  useEffect(() => {
    if (!locale) return;
    setSelectedLocale((prev) => locale);
  }, [locale]);

  useEffect(() => {
    if (!user?._id) return;
    try {
      localStorage.setItem(getAdminDocumentLanguageStorageKey(user._id), selectedLocale || 'en-US');
    } catch {
      // Ignore storage failures.
    }
  }, [selectedLocale, user?._id]);

  const downloadDoc = async (doc) => {
    try {
      const params = new URLSearchParams({
        userId: user._id,
        userName: user.name || '',
        userRole: user.role || '',
        locale: selectedLocale || 'en-US'
      });

      const res = await fetch(`/api/manuals/${doc._id}/download?${params.toString()}`);
      if (!res.ok) {
        const payload = await res.json();
        throw new Error(payload?.msg || t('downloadFailed'));
      }

      const blob = await res.blob();
      const fileName = `${String(doc.type || 'document')}_${String(doc.topic || 'hf-document').replace(/[^a-zA-Z0-9-_]+/g, '_')}.pdf`;
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      window.alert(err.message || t('downloadFailed'));
    }
  };

  const renderLatest = (doc, title, emptyLabel) => (
    <div style={{ border: '1px solid var(--theme-soft-border)', borderRadius: 8, padding: 12, background: 'var(--theme-soft-bg)', marginBottom: 12 }}>
      <h4 style={{ margin: '0 0 8px 0' }}>{title}</h4>
      {!doc ? (
        <p style={{ color: 'var(--theme-text-muted)', margin: 0 }}>{emptyLabel}</p>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
          <div>
                    <div style={{ fontWeight: 700, color: 'var(--theme-text-strong)' }}>{doc.topic}</div>
            <div style={{ color: 'var(--theme-text-muted)', fontSize: 12 }}>{t('date')}: {doc.date}</div>
          </div>
          <button className="primary-btn" onClick={() => downloadDoc(doc)}>{t('downloadPdf')}</button>
        </div>
      )}
    </div>
  );

  return (
    <div>
      <h3 style={{ color: 'var(--theme-primary)', marginTop: 0 }}>{t('adminTabDocuments')}</h3>
      {error && <p style={{ color: '#c62828' }}>{error}</p>}

      <div style={{ marginBottom: 14, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <label style={{ fontSize: 13 }}>{t('language')}</label>
        <select
          value={selectedLocale}
          onChange={(e) => setSelectedLocale(e.target.value)}
          style={{ border: '1px solid var(--theme-soft-border)', borderRadius: 6, padding: '5px 8px' }}
        >
          {availableLangs.map((lang) => (
            <option key={lang.value} value={lang.value}>{lang.label}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <p>{t('loadingDocuments')}</p>
      ) : (
        <>
          {renderLatest(latestManual, t('latestManualPosted'), t('noManualsYet'))}
          {renderLatest(latestGuide, t('latestGuidePosted'), t('noGuidesYet'))}
        </>
      )}
    </div>
  );
}

function DocumentComposer({ user, t, type }) {
  const [topic, setTopic] = useState('');
  const [docDate, setDocDate] = useState('');
  const [contentHtml, setContentHtml] = useState('');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchItems = useCallback(async () => {
    try {
      const res = await fetch(`/api/manuals?type=${type}`);
      const data = await res.json();
      setItems(Array.isArray(data) ? data : []);
    } catch {
      setError(t('fetchError'));
    }
  }, [t, type]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!topic.trim() || !docDate.trim() || !contentHtml.trim()) {
      setError(t('manualRequiredFields'));
      return;
    }

    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/manuals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          topic: topic.trim(),
          date: docDate,
          contentHtml,
          createdByName: user.name || user.email,
          createdById: user._id
        })
      });

      if (!res.ok) {
        const payload = await res.json();
        throw new Error(payload?.msg || t('saveFailed'));
      }

      setTopic('');
      setDocDate('');
      setContentHtml('');
      await fetchItems();
    } catch (err) {
      setError(err.message || t('saveFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm(t('confirmDelete'))) return;
    try {
      const res = await fetch(`/api/manuals/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const payload = await res.json();
        throw new Error(payload?.msg || t('deleteFailed'));
      }
      await fetchItems();
    } catch (err) {
      setError(err.message || t('deleteFailed'));
    }
  };

  return (
    <div>
      <h3 style={{ color: 'var(--theme-primary)', marginTop: 0 }}>
        {type === 'guide' ? t('adminTabPostGuide') : t('adminTabPostManual')}
      </h3>
      {error && <p style={{ color: '#c62828' }}>{error}</p>}

      <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 10, marginBottom: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 220px', gap: 10 }}>
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder={t('manualTopicPlaceholder')}
            style={{ padding: '8px 10px', border: '1px solid var(--theme-soft-border)', borderRadius: 6 }}
          />
          <input
            type="date"
            value={docDate}
            onChange={(e) => setDocDate(e.target.value)}
            style={{ padding: '8px 10px', border: '1px solid var(--theme-soft-border)', borderRadius: 6 }}
          />
        </div>

        <HFRichTextEditor value={contentHtml} onChange={setContentHtml} minHeight={260} />

        <div>
          <button className="primary-btn" disabled={loading}>
            {loading ? t('savingDoc') : t('publishDoc')}
          </button>
        </div>
      </form>

      <h4 style={{ marginBottom: 10 }}>{t('publishedDocuments')}</h4>
      {items.length === 0 ? (
        <p style={{ color: 'var(--theme-text-muted)' }}>{t('noDocumentsPublished')}</p>
      ) : (
        <div style={{ display: 'grid', gap: 8 }}>
          {items.map((item) => (
            <div key={item._id} style={{ border: '1px solid var(--theme-soft-border)', borderRadius: 8, padding: 10, background: 'var(--theme-soft-bg)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontWeight: 700 }}>{item.topic}</div>
                  <div style={{ color: 'var(--theme-text-muted)', fontSize: 12 }}>{t('date')}: {item.date}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <small style={{ color: 'var(--theme-text-strong)' }}>{t('downloadCount')}: {item.totalDownloads || 0}</small>
                  <button className="link-btn" style={{ color: '#c62828' }} onClick={() => handleDelete(item._id)}>
                    {t('delete')}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function DocumentStats({ t }) {
  const [manualStats, setManualStats] = useState([]);
  const [guideStats, setGuideStats] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadStats = async () => {
      try {
        const [manualRes, guideRes] = await Promise.all([
          fetch('/api/manuals/stats?type=manual'),
          fetch('/api/manuals/stats?type=guide')
        ]);
        const manual = await manualRes.json();
        const guide = await guideRes.json();
        setManualStats(Array.isArray(manual) ? manual : []);
        setGuideStats(Array.isArray(guide) ? guide : []);
      } catch {
        setError(t('fetchError'));
      }
    };
    loadStats();
  }, [t]);

  const renderTable = (rows, title) => (
    <div style={{ marginBottom: 22 }}>
      <h4 style={{ marginBottom: 8 }}>{title}</h4>
      {rows.length === 0 ? (
        <p style={{ color: 'var(--theme-text-muted)' }}>{t('noStatsYet')}</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--theme-soft-bg)' }}>
              <th style={{ textAlign: 'left', padding: 8, border: '1px solid var(--theme-soft-border)' }}>{t('topic')}</th>
              <th style={{ textAlign: 'left', padding: 8, border: '1px solid var(--theme-soft-border)' }}>{t('date')}</th>
              <th style={{ textAlign: 'left', padding: 8, border: '1px solid var(--theme-soft-border)' }}>{t('downloadCount')}</th>
              <th style={{ textAlign: 'left', padding: 8, border: '1px solid var(--theme-soft-border)' }}>{t('uniqueUsers')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row._id}>
                <td style={{ padding: 8, border: '1px solid var(--theme-soft-border)' }}>{row.topic}</td>
                <td style={{ padding: 8, border: '1px solid var(--theme-soft-border)' }}>{row.date}</td>
                <td style={{ padding: 8, border: '1px solid var(--theme-soft-border)' }}>{row.totalDownloads}</td>
                <td style={{ padding: 8, border: '1px solid var(--theme-soft-border)' }}>{row.uniqueDownloaders}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );

  return (
    <div>
      <h3 style={{ color: 'var(--theme-primary)', marginTop: 0 }}>{t('adminTabStats')}</h3>
      {error && <p style={{ color: '#c62828' }}>{error}</p>}
      {renderTable(manualStats, t('adminTabPostManual'))}
      {renderTable(guideStats, t('adminTabPostGuide'))}
    </div>
  );
}

function AttendanceOverview({ user, t }) {
  const [summary, setSummary] = useState({ totalAttendance: 0, maleAdults: 0, femaleAdults: 0, children: 0 });
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      if (!user?._id) return;
      setError('');
      try {
        const res = await fetch(`/api/attendance/summary?userId=${encodeURIComponent(user._id)}`);
        const payload = await res.json();
        if (!res.ok) throw new Error(payload?.msg || t('fetchError'));
        setSummary(payload?.summary || { totalAttendance: 0, maleAdults: 0, femaleAdults: 0, children: 0 });
      } catch (err) {
        setError(err.message || t('fetchError'));
      }
    };

    load();
  }, [t, user?._id]);

  const cards = [
    { label: t('totalAttendance'), value: summary.totalAttendance },
    { label: t('maleAdults'), value: summary.maleAdults },
    { label: t('femaleAdults'), value: summary.femaleAdults },
    { label: t('children'), value: summary.children }
  ];

  return (
    <div>
      <h3 style={{ color: 'var(--theme-primary)', marginTop: 0 }}>{t('adminTabAttendance')}</h3>
      {error && <p style={{ color: '#c62828' }}>{error}</p>}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10 }}>
        {cards.map((item) => (
          <div key={item.label} style={{ border: '1px solid var(--theme-soft-border)', borderRadius: 10, padding: 12, background: 'var(--theme-soft-bg)' }}>
            <div style={{ color: 'var(--theme-text-muted)', fontSize: 12, marginBottom: 4 }}>{item.label}</div>
            <div style={{ color: 'var(--theme-text-strong)', fontWeight: 800, fontSize: 24 }}>{Number(item.value || 0)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function RelocationApplications({ user, t }) {
  const [items, setItems] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [reviewingId, setReviewingId] = useState('');

  const loadItems = useCallback(async () => {
    if (!user?._id) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/relocations/pending?reviewerId=${encodeURIComponent(user._id)}`);
      const payload = await res.json();
      if (!res.ok) throw new Error(payload?.msg || t('fetchError'));
      setItems(Array.isArray(payload?.applications) ? payload.applications : []);
    } catch (err) {
      setError(err.message || t('fetchError'));
    } finally {
      setLoading(false);
    }
  }, [t, user?._id]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const review = async (id, action) => {
    setReviewingId(id);
    setError('');
    try {
      const res = await fetch(`/api/relocations/${id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviewerId: user._id, action })
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload?.msg || t('saveFailed'));
      await loadItems();
    } catch (err) {
      setError(err.message || t('saveFailed'));
    } finally {
      setReviewingId('');
    }
  };

  return (
    <div>
      <h3 style={{ color: 'var(--theme-primary)', marginTop: 0 }}>{t('adminTabRelocations')}</h3>
      {error && <p style={{ color: '#c62828' }}>{error}</p>}
      {loading ? (
        <p>{t('loadingDocuments')}</p>
      ) : items.length === 0 ? (
        <p style={{ color: 'var(--theme-text-muted)' }}>{t('noPendingRelocations')}</p>
      ) : (
        <div style={{ display: 'grid', gap: 10 }}>
          {items.map((item) => (
            <div key={item._id} style={{ border: '1px solid var(--theme-soft-border)', borderRadius: 8, padding: 12, background: 'var(--theme-soft-bg)' }}>
              <div style={{ fontWeight: 700, color: 'var(--theme-text-strong)' }}>{item.applicantName}</div>
              <div style={{ fontSize: 13, color: 'var(--theme-text-muted)' }}>
                From: {item?.fromCenter?.city || '-'}, {item?.fromCenter?.state || '-'}
              </div>
              <div style={{ fontSize: 13, color: 'var(--theme-text-muted)' }}>
                To: {item?.toCenter?.leaderName || '-'} ({item?.toCenter?.city || '-'}, {item?.toCenter?.state || '-'})
              </div>
              <div style={{ marginTop: 8, display: 'flex', gap: 10 }}>
                <button className="primary-btn" onClick={() => review(item._id, 'approved')} disabled={reviewingId === item._id}>Approve</button>
                <button className="link-btn" style={{ color: '#c62828' }} onClick={() => review(item._id, 'rejected')} disabled={reviewingId === item._id}>Reject</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AnnouncementsManager({ user, t }) {
  const [items, setItems] = useState([]);
  const [newText, setNewText] = useState('');
  const [editId, setEditId] = useState(null);
  const [editText, setEditText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchItems = useCallback(async () => {
    try {
      const res = await fetch('/api/announcements');
      const data = await res.json();
      setItems(Array.isArray(data) ? data : []);
    } catch {
      setError(t('fetchError'));
    }
  }, [t]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newText.trim()) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/announcements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: newText.trim(), postedBy: user.name || user.email })
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.msg); }
      setNewText('');
      await fetchItems();
    } catch (err) {
      setError(err.message || t('saveFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (id) => {
    if (!editText.trim()) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/announcements/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: editText.trim(), postedBy: user.name || user.email })
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.msg); }
      setEditId(null);
      setEditText('');
      await fetchItems();
    } catch (err) {
      setError(err.message || t('saveFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm(t('confirmDelete'))) return;
    setLoading(true);
    setError('');
    try {
      await fetch(`/api/announcements/${id}`, { method: 'DELETE' });
      await fetchItems();
    } catch {
      setError(t('deleteFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h3 style={{ color: 'var(--theme-primary)', marginTop: 0 }}>{t('adminTabAnnouncements')}</h3>
      {error && <p style={{ color: 'red' }}>{error}</p>}

      <form onSubmit={handleAdd} style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
        <input
          type="text"
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
          placeholder={t('newAnnouncementPlaceholder')}
          style={{ flex: 1, padding: '7px 10px', borderRadius: 6, border: '1px solid var(--theme-soft-border)', fontSize: 14 }}
          disabled={loading}
        />
        <button type="submit" className="primary-btn" disabled={loading || !newText.trim()}>
          {t('addAnnouncement')}
        </button>
      </form>

      {items.length === 0 ? (
        <p style={{ color: 'var(--theme-text-muted)' }}>{t('noAnnouncements')}</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {items.map((item) => (
            <li key={item._id} style={{ borderBottom: '1px solid var(--theme-soft-border)', padding: '10px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
              {editId === item._id ? (
                <>
                  <input
                    type="text"
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    style={{ flex: 1, padding: '6px 10px', borderRadius: 6, border: '1px solid var(--theme-primary)', fontSize: 14 }}
                    disabled={loading}
                    autoFocus
                  />
                  <button className="primary-btn" onClick={() => handleUpdate(item._id)} disabled={loading || !editText.trim()}>{t('save')}</button>
                  <button className="link-btn" onClick={() => { setEditId(null); setEditText(''); }}>{t('cancel')}</button>
                </>
              ) : (
                <>
                  <span style={{ flex: 1, fontSize: 14 }}>{item.text}</span>
                  <small style={{ color: 'var(--theme-text-muted)', marginRight: 8 }}>{item.postedBy ? `- ${item.postedBy}` : ''}</small>
                  <button className="link-btn" onClick={() => { setEditId(item._id); setEditText(item.text); }}>{t('edit')}</button>
                  <button className="link-btn" style={{ color: '#c00' }} onClick={() => handleDelete(item._id)} disabled={loading}>{t('delete')}</button>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ScheduleManager({ user, t }) {
  const [items, setItems] = useState([]);
  const [newText, setNewText] = useState('');
  const [editId, setEditId] = useState(null);
  const [editText, setEditText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchItems = useCallback(async () => {
    try {
      const res = await fetch('/api/schedule');
      const data = await res.json();
      setItems(Array.isArray(data) ? data : []);
    } catch {
      setError(t('fetchError'));
    }
  }, [t]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newText.trim()) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: newText.trim(), updatedBy: user.name || user.email })
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.msg); }
      setNewText('');
      await fetchItems();
    } catch (err) {
      setError(err.message || t('saveFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (id) => {
    if (!editText.trim()) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/schedule/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: editText.trim(), updatedBy: user.name || user.email })
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.msg); }
      setEditId(null);
      setEditText('');
      await fetchItems();
    } catch (err) {
      setError(err.message || t('saveFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm(t('confirmDelete'))) return;
    setLoading(true);
    setError('');
    try {
      await fetch(`/api/schedule/${id}`, { method: 'DELETE' });
      await fetchItems();
    } catch {
      setError(t('deleteFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h3 style={{ color: 'var(--theme-primary)', marginTop: 0 }}>{t('adminTabSchedule')}</h3>
      {error && <p style={{ color: 'red' }}>{error}</p>}

      <form onSubmit={handleAdd} style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
        <input
          type="text"
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
          placeholder={t('newSchedulePlaceholder')}
          style={{ flex: 1, padding: '7px 10px', borderRadius: 6, border: '1px solid var(--theme-soft-border)', fontSize: 14 }}
          disabled={loading}
        />
        <button type="submit" className="primary-btn" disabled={loading || !newText.trim()}>
          {t('addSchedule')}
        </button>
      </form>

      {items.length === 0 ? (
        <p style={{ color: 'var(--theme-text-muted)' }}>{t('noSchedule')}</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {items.map((item) => (
            <li key={item._id} style={{ borderBottom: '1px solid var(--theme-soft-border)', padding: '10px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
              {editId === item._id ? (
                <>
                  <input
                    type="text"
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    style={{ flex: 1, padding: '6px 10px', borderRadius: 6, border: '1px solid var(--theme-primary)', fontSize: 14 }}
                    disabled={loading}
                    autoFocus
                  />
                  <button className="primary-btn" onClick={() => handleUpdate(item._id)} disabled={loading || !editText.trim()}>{t('save')}</button>
                  <button className="link-btn" onClick={() => { setEditId(null); setEditText(''); }}>{t('cancel')}</button>
                </>
              ) : (
                <>
                  <span style={{ flex: 1, fontSize: 14 }}>{item.text}</span>
                  <small style={{ color: 'var(--theme-text-muted)', marginRight: 8 }}>{item.updatedBy ? `- ${item.updatedBy}` : ''}</small>
                  <button className="link-btn" onClick={() => { setEditId(item._id); setEditText(item.text); }}>{t('edit')}</button>
                  <button className="link-btn" style={{ color: '#c00' }} onClick={() => handleDelete(item._id)} disabled={loading}>{t('delete')}</button>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ─── Super Admin: Fellow Center Requests & Organizations ──────────────────
function FellowCentersPanel() {
  const [requests, setRequests] = useState([]);
  const [orgs, setOrgs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [subTab, setSubTab] = useState('requests');
  const [reviewNote, setReviewNote] = useState('');
  const [actionId, setActionId] = useState(null);
  const [msg, setMsg] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [rRes, oRes] = await Promise.all([
        fetch('/api/organizations/setup-requests'),
        fetch('/api/organizations')
      ]);
      if (rRes.ok) setRequests(await rRes.json());
      if (oRes.ok) setOrgs(await oRes.json());
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleAction = async (id, action) => {
    setMsg('');
    try {
      const res = await fetch(`/api/organizations/setup-requests/${id}/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviewedBy: 'Super Admin', reviewNote })
      });
      const data = await res.json();
      setMsg(data.msg || (res.ok ? 'Done.' : 'Error.'));
      if (res.ok) { setActionId(null); setReviewNote(''); load(); }
    } catch { setMsg('Network error.'); }
  };

  const cardStyle = { border: '1px solid var(--theme-soft-border)', borderRadius: 10, padding: '14px 18px', marginBottom: 14, background: 'var(--theme-surface)' };
  const badgeStyle = (status) => ({
    display: 'inline-block', padding: '2px 10px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 700,
    background: status === 'approved' || status === 'active' ? '#dcfce7' : status === 'rejected' || status === 'suspended' ? '#fee2e2' : '#fef9c3',
    color: status === 'approved' || status === 'active' ? '#15803d' : status === 'rejected' || status === 'suspended' ? '#b91c1c' : '#854d0e'
  });

  return (
    <div>
      <h3 style={{ margin: '0 0 16px', color: 'var(--theme-text-strong)' }}>Our Church Fellowship</h3>
      {msg && <div style={{ marginBottom: 12, padding: '8px 12px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 6, color: '#15803d', fontSize: '0.875rem' }}>{msg}</div>}

      <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
        {['requests', 'organizations'].map(st => (
          <button key={st} onClick={() => setSubTab(st)}
            style={{ padding: '6px 16px', borderRadius: 20, border: '1px solid var(--theme-soft-border)', background: subTab === st ? 'var(--theme-primary)' : 'transparent', color: subTab === st ? '#fff' : 'var(--theme-text-strong)', cursor: 'pointer', fontWeight: subTab === st ? 700 : 400, fontSize: '0.875rem' }}>
            {st === 'requests' ? `Setup Requests (${requests.filter(r => r.status === 'pending').length} pending)` : `Organizations (${orgs.length})`}
          </button>
        ))}
      </div>

      {loading && <p style={{ color: 'var(--theme-text-muted)' }}>Loading…</p>}

      {!loading && subTab === 'requests' && (
        requests.length === 0
          ? <p style={{ color: 'var(--theme-text-muted)' }}>No setup requests yet.</p>
          : requests.map(req => (
            <div key={req._id} style={cardStyle}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--theme-text-strong)' }}>{req.churchName}</div>
                  <div style={{ fontSize: '0.82rem', color: '#6b7280', marginTop: 2 }}>
                    {req.name} · {req.position} · {req.email}
                  </div>
                  <div style={{ fontSize: '0.82rem', color: '#6b7280' }}>{req.churchAddress} · {req.churchEnquiryPhone}</div>
                  <div style={{ fontSize: '0.78rem', color: '#9ca3af', marginTop: 4 }}>
                    Submitted {new Date(req.createdAt).toLocaleDateString()}
                    {req.wantsDedicatedDatabase && ' · Wants dedicated DB'}
                    {req.wantsCustomDomain && ' · Wants custom domain'}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={badgeStyle(req.status)}>{req.status}</span>
                  {req.passportPhoto && (
                    <img src={req.passportPhoto} alt="passport" style={{ width: 44, height: 44, objectFit: 'cover', borderRadius: 6, border: '1px solid #e5e7eb' }} />
                  )}
                  {req.churchLogo && (
                    <img src={req.churchLogo} alt="logo" style={{ width: 44, height: 44, objectFit: 'contain', borderRadius: 6, border: '1px solid #e5e7eb', background: '#f9fafb' }} />
                  )}
                </div>
              </div>

              {req.status === 'pending' && (
                <div style={{ marginTop: 12 }}>
                  {actionId === req._id ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <input
                        type="text"
                        placeholder="Review note (optional)"
                        value={reviewNote}
                        onChange={e => setReviewNote(e.target.value)}
                        style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: '0.875rem' }}
                      />
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={() => handleAction(req._id, 'approve')} className="primary-btn" style={{ flex: 1, fontSize: '0.85rem', padding: '6px 0' }}>Approve &amp; Create Org</button>
                        <button onClick={() => handleAction(req._id, 'reject')} style={{ flex: 1, fontSize: '0.85rem', padding: '6px 0', background: '#fee2e2', color: '#b91c1c', border: '1px solid #fca5a5', borderRadius: 5, cursor: 'pointer', fontWeight: 600 }}>Reject</button>
                        <button onClick={() => { setActionId(null); setReviewNote(''); }} style={{ padding: '6px 12px', background: 'transparent', border: '1px solid #d1d5db', borderRadius: 5, cursor: 'pointer', fontSize: '0.85rem' }}>Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => setActionId(req._id)} style={{ padding: '5px 14px', background: 'var(--theme-soft-bg)', border: '1px solid var(--theme-soft-border)', borderRadius: 5, cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, color: 'var(--theme-text-strong)' }}>
                      Review
                    </button>
                  )}
                </div>
              )}

              {req.status !== 'pending' && req.reviewNote && (
                <div style={{ marginTop: 8, fontSize: '0.8rem', color: '#6b7280', fontStyle: 'italic' }}>Note: {req.reviewNote}</div>
              )}
            </div>
          ))
      )}

      {!loading && subTab === 'organizations' && (
        orgs.length === 0
          ? <p style={{ color: 'var(--theme-text-muted)' }}>No organizations yet.</p>
          : orgs.map(org => (
            <div key={org._id} style={cardStyle}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                  {org.logo && <img src={org.logo} alt="logo" style={{ width: 52, height: 52, objectFit: 'contain', borderRadius: 8, border: '1px solid #e5e7eb', flexShrink: 0 }} />}
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--theme-text-strong)' }}>{org.name}</div>
                    <div style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: 2 }}>{org.address}</div>
                    <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>Admin: {org.adminName} · {org.adminEmail}</div>
                    <code style={{ fontSize: '0.72rem', color: '#9ca3af', background: '#f3f4f6', padding: '1px 5px', borderRadius: 3, display: 'inline-block', marginTop: 4 }}>{org.organization_id}</code>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={badgeStyle(org.status)}>{org.status}</span>
                  {org.wantsDedicatedDatabase && <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: 4 }}>Dedicated DB: {org.dedicatedDatabaseUri ? '✓ set' : '— awaiting URI'}</div>}
                  {org.wantsCustomDomain && <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Domain: {org.customDomain || '— awaiting'}</div>}
                </div>
              </div>
            </div>
          ))
      )}
    </div>
  );
}

// ─── Super Admin: Admins list ─────────────────────────────────────────────
function AdminsPanel() {
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/users');
        if (res.ok) {
          const data = await res.json();
          setAdmins(Array.isArray(data) ? data.filter(u => u.role === 'Admin') : []);
        }
      } catch { /* ignore */ }
      setLoading(false);
    };
    load();
  }, []);

  const cardStyle = { border: '1px solid var(--theme-soft-border)', borderRadius: 10, padding: '14px 18px', marginBottom: 12, background: 'var(--theme-surface)', display: 'flex', gap: 14, alignItems: 'flex-start' };

  return (
    <div>
      <h3 style={{ margin: '0 0 16px', color: 'var(--theme-text-strong)' }}>Admins</h3>
      {loading && <p style={{ color: 'var(--theme-text-muted)' }}>Loading…</p>}
      {!loading && admins.length === 0 && <p style={{ color: 'var(--theme-text-muted)' }}>No Admin accounts found.</p>}
      {admins.map(admin => (
        <div key={admin._id} style={cardStyle}>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, color: 'var(--theme-text-strong)' }}>{admin.name}</div>
            <div style={{ fontSize: '0.82rem', color: '#6b7280' }}>{admin.email} · {admin.phone || '—'}</div>
            <div style={{ fontSize: '0.78rem', color: '#9ca3af', marginTop: 3 }}>
              Joined {admin.createdAt ? new Date(admin.createdAt).toLocaleDateString() : '—'}
              {' · '}Approval: {admin.approval?.status || 'pending'}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
