import React, { useEffect, useState } from 'react';
import { useTranslation } from './i18n';

function ApprovalStatus({ userId }) {
  const { t } = useTranslation();
  const [approval, setApproval] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    fetch(`/api/users/${userId}`)
      .then(res => res.json())
      .then(user => {
        setApproval(user.approval);
        setLoading(false);
      });
  }, [userId]);

  if (loading) return null;
  if (!approval || approval.status === 'pending') return <div style={{fontStyle:'italic'}}>{t('approvalPending')}</div>;
  if (approval.status === 'approved') {
    return (
      <div style={{fontStyle:'italic', color: 'green'}}>
        {t('approvedByOn', {
          approvedBy: approval.approvedBy,
          approvedByRole: approval.approvedByRole,
          approvedAt: approval.approvedAt ? new Date(approval.approvedAt).toLocaleDateString() : ''
        })}
      </div>
    );
  }
  if (approval.status === 'rejected') {
    return (
      <div style={{fontStyle:'italic', color: 'red'}}>
        {t('applicationRejected', {
          requestedRole: approval.requestedRole || '',
          appliedAt: approval.appliedAt ? new Date(approval.appliedAt).toLocaleDateString() : '',
          approvedAt: approval.approvedAt ? new Date(approval.approvedAt).toLocaleDateString() : ''
        })}<br />
        {t('meetBranchPastor')}
      </div>
    );
  }
  return null;
}

export default ApprovalStatus;
