import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from './i18n';

function getDocumentLanguageStorageKey(userId) {
  return `hf_doc_langs_${userId || 'guest'}`;
}

export default function ManualLibrary({ user, languageOptions, locale }) {
  const { t } = useTranslation();
  const [manualItems, setManualItems] = useState([]);
  const [guideItems, setGuideItems] = useState([]);
  const [manualCounts, setManualCounts] = useState({});
  const [guideCounts, setGuideCounts] = useState({});
  const [manualMax, setManualMax] = useState(3);
  const [guideMax, setGuideMax] = useState(3);
  const [langByDoc, setLangByDoc] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const availableLangs = useMemo(() => (Array.isArray(languageOptions) && languageOptions.length ? languageOptions : [{ value: 'en-US', label: 'English (United States)' }]), [languageOptions]);

  useEffect(() => {
    if (!user?._id) return;
    try {
      const stored = localStorage.getItem(getDocumentLanguageStorageKey(user._id));
      if (stored) {
        setLangByDoc(JSON.parse(stored));
      }
    } catch {
      // Ignore storage failures.
    }
  }, [user?._id]);

  useEffect(() => {
    if (!locale) return;
    setLangByDoc((prev) => {
      const next = { ...prev };
      for (const doc of [...manualItems, ...guideItems]) {
        if (!next[doc._id]) {
          next[doc._id] = locale;
        }
      }
      return next;
    });
  }, [locale, manualItems, guideItems]);

  useEffect(() => {
    if (!user?._id) return;
    try {
      localStorage.setItem(getDocumentLanguageStorageKey(user._id), JSON.stringify(langByDoc));
    } catch {
      // Ignore storage failures.
    }
  }, [langByDoc, user?._id]);

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const [manualRes, guideRes, manualCountRes, guideCountRes] = await Promise.all([
        fetch('/api/manuals?type=manual'),
        fetch('/api/manuals?type=guide'),
        fetch(`/api/manuals/user-downloads?type=manual&userId=${encodeURIComponent(user._id)}`),
        fetch(`/api/manuals/user-downloads?type=guide&userId=${encodeURIComponent(user._id)}`)
      ]);

      const manuals = await manualRes.json();
      const guides = await guideRes.json();
      const manualCountPayload = await manualCountRes.json();
      const guideCountPayload = await guideCountRes.json();

      const manualDocs = Array.isArray(manuals) ? manuals : [];
      const guideDocs = Array.isArray(guides) ? guides : [];

      setManualItems(manualDocs);
      setGuideItems(guideDocs);
      setManualCounts(manualCountPayload?.counts || {});
      setGuideCounts(guideCountPayload?.counts || {});
      setManualMax(Number(manualCountPayload?.max) || 3);
      setGuideMax(Number(guideCountPayload?.max) || 3);

      setLangByDoc((prev) => {
        const next = { ...prev };
        for (const doc of [...manualDocs, ...guideDocs]) {
          if (!next[doc._id]) next[doc._id] = locale || 'en-US';
        }
        return next;
      });
    } catch {
      setError(t('fetchError'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?._id) fetchData();
  }, [user?._id]);

  const downloadDocument = async (doc) => {
    try {
      const selectedLocale = langByDoc[doc._id] || locale || 'en-US';
      const params = new URLSearchParams({
        userId: user._id,
        userName: user.name || '',
        userRole: user.role || '',
        locale: selectedLocale
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

      if (String(user.role).toLowerCase() !== 'admin') {
        await fetchData();
      }
    } catch (err) {
      window.alert(err.message || t('downloadFailed'));
    }
  };

  if (loading) return <p>{t('loadingManuals')}</p>;

  const renderDocSection = (items, counts, max, title, emptyLabel) => (
    <div style={{ marginBottom: 16 }}>
      <h3 style={{ color: 'var(--theme-text-strong)', marginTop: 0 }}>{title}</h3>
      {items.length === 0 ? (
        <p style={{ color: 'var(--theme-text-muted)' }}>{emptyLabel}</p>
      ) : (
        <div style={{ display: 'grid', gap: 12 }}>
          {items.map((doc) => {
            const used = Number(counts?.[doc._id] || 0);
            const remaining = Math.max(max - used, 0);
            return (
              <div key={doc._id} style={{ border: '1px solid var(--theme-soft-border)', borderRadius: 8, padding: 12, background: 'var(--theme-soft-bg)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ fontWeight: 700, color: 'var(--theme-text-strong)' }}>{doc.topic}</div>
                    <div style={{ fontSize: 13, color: 'var(--theme-text-muted)' }}>{t('date')}: {doc.date}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <label style={{ fontSize: 13 }}>{t('language')}</label>
                    <select
                      value={langByDoc[doc._id] || locale || 'en-US'}
                      onChange={(e) => setLangByDoc((prev) => ({ ...prev, [doc._id]: e.target.value }))}
                      style={{ border: '1px solid var(--theme-soft-border)', borderRadius: 6, padding: '5px 8px' }}
                    >
                      {availableLangs.map((lang) => (
                        <option key={lang.value} value={lang.value}>{lang.label}</option>
                      ))}
                    </select>
                    <button className="primary-btn" onClick={() => downloadDocument(doc)} disabled={String(user.role).toLowerCase() !== 'admin' && remaining <= 0}>
                      {t('downloadPdf')}
                    </button>
                  </div>
                </div>
                {String(user.role).toLowerCase() !== 'admin' && (
                  <div style={{ marginTop: 8, fontSize: 12, color: 'var(--theme-text-muted)' }}>
                    {t('downloadsUsed')}: {used}/{max}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  return (
    <div style={{ marginTop: 14, border: '1px solid var(--theme-soft-border)', borderRadius: 10, padding: 16 }}>
      {error && <p style={{ color: '#c62828' }}>{error}</p>}
      {renderDocSection(manualItems, manualCounts, manualMax, t('hfManualsForDownload'), t('noManualsYet'))}
      {renderDocSection(guideItems, guideCounts, guideMax, t('hfGuidesForDownload'), t('noGuidesYet'))}
    </div>
  );
}
