import React, { useEffect, useState } from 'react';
import { useTranslation } from './i18n';

function ApprovalPanel({ approver, onAction }) {
  const { t } = useTranslation();
  const [pendingUsers, setPendingUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null); // userId being processed

  useEffect(() => {
    fetch('/api/users')
      .then(res => res.json())
      .then(users => {
        // Only show users with approval.status === 'pending'
        setPendingUsers(users.filter(u => u.approval?.status === 'pending' || u.approval == null));
        setLoading(false);
      });
  }, [actionLoading]);

  const handleApprove = async (user) => {
    setActionLoading(user._id);
    await fetch(`/api/users/approve/${user._id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ approverName: approver.name, approverRole: approver.role })
    });
    setActionLoading(null);
    onAction && onAction();
  };

  const handleReject = async (user) => {
    const reason = prompt(t('enterRejectionReason'));
    if (!reason) return;
    setActionLoading(user._id);
    await fetch(`/api/users/reject/${user._id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ approverName: approver.name, approverRole: approver.role, reason })
    });
    setActionLoading(null);
    onAction && onAction();
  };

  if (loading) return <div>{t('loadingPendingApprovals')}</div>;
  if (!pendingUsers.length) return <div>{t('noPendingApplications')}</div>;

  return (
    <div style={{ marginTop: 32 }}>
      <h3>{t('pendingApplications')}</h3>
      {pendingUsers.map(user => (
        <div key={user._id} style={{ border: '1px solid var(--theme-soft-border)', borderRadius: 8, padding: 16, marginBottom: 16, background: 'var(--theme-soft-bg)' }}>
          <b>{t('name')}:</b> {user.name}<br />
          <b>{t('email')}:</b> {user.email}<br />
          <b>{t('role')}:</b> {user.role}<br />
          <b>{t('applied')}:</b> {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : ''}<br />
          <button className="primary-btn" disabled={actionLoading === user._id} onClick={() => handleApprove(user)} style={{ marginRight: 8 }}>{t('approve')}</button>
          <button className="secondary-btn" disabled={actionLoading === user._id} onClick={() => handleReject(user)}>{t('reject')}</button>
        </div>
      ))}
    </div>
  );
}

export default ApprovalPanel;
