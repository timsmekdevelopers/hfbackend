const express = require('express');
const router = express.Router();
const User = require('../models/User');
const RelocationApplication = require('../models/RelocationApplication');

function approvedFilter() {
  return { $or: [{ approved: true }, { 'approval.status': 'approved' }] };
}

function buildCenterKey(payload = {}) {
  return [payload.country, payload.state, payload.branch || '', payload.city || '']
    .map((item) => String(item || '').trim())
    .join('|')
    .toLowerCase();
}

function canReview(reviewer, application) {
  const role = String(reviewer?.role || '');
  if (role === 'Admin') return true;

  const sameCountry = String(application?.toCenter?.country || '') === String(reviewer.country || '');
  const sameState = String(application?.toCenter?.state || '') === String(reviewer.state || '');
  if (!sameCountry || !sameState) return false;

  if (role === 'State Pastor') return true;
  if (role === 'Branch Pastor') {
    if (reviewer.branch) {
      return String(application?.toCenter?.branch || '') === String(reviewer.branch || '');
    }
    return String(application?.toCenter?.city || '') === String(reviewer.city || '');
  }

  return false;
}

router.get('/centers', async (req, res) => {
  try {
    const { country, state, city } = req.query;
    if (!country || !state || !city) {
      return res.status(400).json({ msg: 'country, state and city are required' });
    }

    const centers = await User.find({
      ...approvedFilter(),
      role: 'HF Leader',
      country,
      state,
      city
    }).select('name country state branch city address');

    res.json({
      centers: centers.map((leader) => ({
        leaderId: leader._id,
        leaderName: leader.name,
        country: leader.country,
        state: leader.state,
        branch: leader.branch,
        city: leader.city,
        address: leader.address,
        centerKey: buildCenterKey(leader)
      }))
    });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

router.post('/apply', async (req, res) => {
  try {
    const { applicantId, newResidence, targetLeaderId } = req.body;
    if (!applicantId || !newResidence?.country || !newResidence?.state || !newResidence?.city || !targetLeaderId) {
      return res.status(400).json({ msg: 'applicantId, newResidence and targetLeaderId are required' });
    }

    const applicant = await User.findById(applicantId);
    if (!applicant) return res.status(404).json({ msg: 'Applicant not found' });

    const targetLeader = await User.findById(targetLeaderId);
    if (!targetLeader || targetLeader.role !== 'HF Leader') {
      return res.status(404).json({ msg: 'Target HF center leader not found' });
    }

    const pendingExisting = await RelocationApplication.findOne({ applicantId: applicant._id, status: 'pending' });
    if (pendingExisting) {
      return res.status(409).json({ msg: 'You already have a pending relocation application.' });
    }

    const application = new RelocationApplication({
      applicantId: applicant._id,
      applicantName: applicant.name,
      applicantEmail: applicant.email,
      fromCenter: {
        country: applicant.country,
        state: applicant.state,
        branch: applicant.branch,
        city: applicant.city,
        centerKey: buildCenterKey(applicant)
      },
      toCenter: {
        leaderId: targetLeader._id,
        leaderName: targetLeader.name,
        country: targetLeader.country,
        state: targetLeader.state,
        branch: targetLeader.branch,
        city: targetLeader.city,
        address: targetLeader.address,
        centerKey: buildCenterKey(targetLeader)
      },
      newResidence: {
        country: newResidence.country,
        state: newResidence.state,
        city: newResidence.city,
        address: newResidence.address || ''
      },
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date()
    });

    await application.save();

    applicant.notifications.push({
      message: 'Your relocation request has been submitted and is pending review.',
      createdAt: new Date(),
      read: false
    });
    await applicant.save();

    res.status(201).json({ msg: 'Relocation application submitted', application });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

router.get('/pending', async (req, res) => {
  try {
    const { reviewerId } = req.query;
    if (!reviewerId) return res.status(400).json({ msg: 'reviewerId is required' });

    const reviewer = await User.findById(reviewerId).select('name role country state branch city');
    if (!reviewer) return res.status(404).json({ msg: 'Reviewer not found' });

    if (!['Admin', 'State Pastor', 'Branch Pastor'].includes(String(reviewer.role || ''))) {
      return res.status(403).json({ msg: 'Not authorized' });
    }

    const pending = await RelocationApplication.find({ status: 'pending' }).sort({ createdAt: -1 });
    const filtered = pending.filter((item) => canReview(reviewer, item));

    res.json({ applications: filtered });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

router.post('/:id/review', async (req, res) => {
  try {
    const { reviewerId, action, note } = req.body;
    if (!reviewerId || !['approved', 'rejected'].includes(String(action || ''))) {
      return res.status(400).json({ msg: 'reviewerId and valid action are required' });
    }

    const reviewer = await User.findById(reviewerId).select('name role country state branch city');
    if (!reviewer) return res.status(404).json({ msg: 'Reviewer not found' });

    const application = await RelocationApplication.findById(req.params.id);
    if (!application) return res.status(404).json({ msg: 'Application not found' });
    if (application.status !== 'pending') return res.status(400).json({ msg: 'Application is no longer pending' });

    if (!canReview(reviewer, application)) {
      return res.status(403).json({ msg: 'You are not authorized to review this application' });
    }

    application.status = action;
    application.review = {
      reviewedById: reviewer._id,
      reviewedByName: reviewer.name,
      reviewedByRole: reviewer.role,
      note: note || '',
      reviewedAt: new Date()
    };
    application.updatedAt = new Date();
    await application.save();

    const applicant = await User.findById(application.applicantId);
    if (applicant) {
      if (action === 'approved') {
        applicant.country = application.toCenter.country;
        applicant.state = application.toCenter.state;
        applicant.branch = application.toCenter.branch;
        applicant.city = application.toCenter.city;
        applicant.address = application.newResidence?.address || applicant.address;

        applicant.notifications.push({
          message: `Your relocation request has been approved by ${reviewer.name} (${reviewer.role}).`,
          createdAt: new Date(),
          read: false
        });

        const newCenterLeader = await User.findById(application.toCenter.leaderId);
        if (newCenterLeader) {
          newCenterLeader.notifications.push({
            message: `${applicant.name} has been relocated to your HF center and can now be marked for attendance.`,
            createdAt: new Date(),
            read: false
          });
          await newCenterLeader.save();
        }
      } else {
        applicant.notifications.push({
          message: `Your relocation request has been rejected by ${reviewer.name} (${reviewer.role}).`,
          createdAt: new Date(),
          read: false
        });
      }

      await applicant.save();
    }

    res.json({ msg: `Application ${action}`, application });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

module.exports = router;
