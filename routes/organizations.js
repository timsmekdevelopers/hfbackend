const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const FellowCenterSetupRequest = require('../models/FellowCenterSetupRequest');
const Organization = require('../models/Organization');
const { evictOrgConnection } = require('../orgDb');

// ─── POST /api/organizations/setup-request ─────────────────────────────────
// Public. Anyone can submit a Fellow Center Setup Request (Senior Pastor flow).
router.post('/setup-request', async (req, res) => {
  try {
    const {
      name, email, phone, address, position, passportPhoto,
      churchName, churchLogo, churchAddress, churchEnquiryPhone,
      wantsDedicatedDatabase, wantsCustomDomain
    } = req.body;

    if (!name || !email || !phone || !address || !position ||
        !churchName || !churchAddress || !churchEnquiryPhone) {
      return res.status(400).json({ msg: 'Please fill in all required fields.' });
    }

    // Reject if a pending/approved request already exists for this email
    const existing = await FellowCenterSetupRequest.findOne({
      email,
      status: { $in: ['pending', 'approved'] }
    });
    if (existing) {
      return res.status(409).json({ msg: 'A setup request with that email already exists.' });
    }

    const request = new FellowCenterSetupRequest({
      name, email, phone, address, position, passportPhoto,
      churchName, churchLogo, churchAddress, churchEnquiryPhone,
      wantsDedicatedDatabase: Boolean(wantsDedicatedDatabase),
      wantsCustomDomain: Boolean(wantsCustomDomain)
    });
    await request.save();

    res.status(201).json({ msg: 'Setup request submitted successfully.', request });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

// ─── GET /api/organizations/setup-requests ────────────────────────────────
// Super Admin only — list all setup requests.
router.get('/setup-requests', async (req, res) => {
  try {
    const requests = await FellowCenterSetupRequest.find().sort({ createdAt: -1 });
    res.json(requests);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

// ─── POST /api/organizations/setup-requests/:id/approve ──────────────────
// Super Admin only — approve a setup request and create an Organization.
router.post('/setup-requests/:id/approve', async (req, res) => {
  try {
    const { reviewedBy, reviewNote } = req.body;
    const request = await FellowCenterSetupRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ msg: 'Request not found.' });
    if (request.status !== 'pending') {
      return res.status(400).json({ msg: 'Request has already been reviewed.' });
    }

    const organization_id = crypto.randomUUID();
    const org = new Organization({
      organization_id,
      name: request.churchName,
      logo: request.churchLogo,
      address: request.churchAddress,
      enquiryPhone: request.churchEnquiryPhone,
      adminName: request.name,
      adminEmail: request.email,
      adminPhone: request.phone,
      adminPosition: request.position,
      adminPassportPhoto: request.passportPhoto,
      wantsDedicatedDatabase: request.wantsDedicatedDatabase,
      wantsCustomDomain: request.wantsCustomDomain,
      status: 'active',
      setupRequestId: request._id,
      approvedBy: reviewedBy || 'Super Admin',
      approvedAt: new Date()
    });
    await org.save();

    request.status = 'approved';
    request.reviewedBy = reviewedBy || 'Super Admin';
    request.reviewedAt = new Date();
    request.reviewNote = reviewNote || '';
    request.organizationId = org._id;
    await request.save();

    res.json({ msg: 'Setup request approved. Organization created.', organization: org, request });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

// ─── POST /api/organizations/setup-requests/:id/reject ───────────────────
// Super Admin only — reject a setup request.
router.post('/setup-requests/:id/reject', async (req, res) => {
  try {
    const { reviewedBy, reviewNote } = req.body;
    const request = await FellowCenterSetupRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ msg: 'Request not found.' });
    if (request.status !== 'pending') {
      return res.status(400).json({ msg: 'Request has already been reviewed.' });
    }

    request.status = 'rejected';
    request.reviewedBy = reviewedBy || 'Super Admin';
    request.reviewedAt = new Date();
    request.reviewNote = reviewNote || '';
    await request.save();

    res.json({ msg: 'Setup request rejected.', request });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

// ─── GET /api/organizations ───────────────────────────────────────────────
// Super Admin only — list all organizations.
router.get('/', async (req, res) => {
  try {
    const orgs = await Organization.find().sort({ createdAt: -1 });
    res.json(orgs);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

// ─── GET /api/organizations/by-domain ───────────────────────────────────
// Public — look up an active org by its custom domain hostname.
// Used by the frontend to apply org branding when accessed via a custom domain.
router.get('/by-domain', async (req, res) => {
  try {
    const { hostname } = req.query;
    if (!hostname) return res.status(400).json({ msg: 'hostname query param required.' });

    // Only return branding-safe fields — never expose secrets like dedicatedDatabaseUri
    const org = await Organization.findOne(
      { customDomain: hostname.toLowerCase().trim(), status: 'active' },
      'name logo address enquiryPhone themeKey organization_id'
    );

    if (!org) return res.status(404).json({ msg: 'No active organization found for this domain.' });
    res.json(org);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

// ─── GET /api/organizations/mine ─────────────────────────────────────────
// Admin — fetch their own organization by email.
router.get('/mine', async (req, res) => {
  try {
    const { email } = req.query;
    if (!email) return res.status(400).json({ msg: 'email query param required.' });
    const org = await Organization.findOne({ adminEmail: email });
    if (!org) return res.status(404).json({ msg: 'No organization found.' });
    res.json(org);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

// ─── PUT /api/organizations/:id/settings ─────────────────────────────────
// Admin — update infrastructure settings for their organization.
router.put('/:id/settings', async (req, res) => {
  try {
    const { dedicatedDatabaseUri, customDomain, themeKey, logo } = req.body;
    const org = await Organization.findById(req.params.id);
    if (!org) return res.status(404).json({ msg: 'Organization not found.' });

    const uriChanged = dedicatedDatabaseUri !== undefined &&
      dedicatedDatabaseUri.trim() !== (org.dedicatedDatabaseUri || '');

    if (dedicatedDatabaseUri !== undefined) org.dedicatedDatabaseUri = dedicatedDatabaseUri.trim();
    if (customDomain !== undefined) org.customDomain = customDomain.toLowerCase().trim();
    if (themeKey !== undefined) org.themeKey = themeKey;
    if (logo !== undefined) org.logo = logo;
    await org.save();

    // If the Admin changed their DB URI, drop the stale cached connection so
    // the next request establishes a fresh one to the new cluster.
    if (uriChanged) evictOrgConnection(org._id);

    res.json({ msg: 'Organization settings updated.', organization: org });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

module.exports = router;
