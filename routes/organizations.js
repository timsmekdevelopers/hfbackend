const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const FellowCenterSetupRequest = require('../models/FellowCenterSetupRequest');
const Organization = require('../models/Organization');
const { evictOrgConnection } = require('../orgDb');
const { validateUri, migrateOrgDb } = require('../orgMigration');

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
// Admin — update non-DB-switching settings (theme, logo, customDomain).
// NOTE: dedicatedDatabaseUri is intentionally NOT updated here directly.
//       Changing the database URI requires a full migration via POST /migrate-db
//       to ensure no data is lost.  Sending dedicatedDatabaseUri in this body
//       is silently ignored if an existing URI is already active.
router.put('/:id/settings', async (req, res) => {
  try {
    const { dedicatedDatabaseUri, customDomain, themeKey, logo } = req.body;
    const org = await Organization.findById(req.params.id);
    if (!org) return res.status(404).json({ msg: 'Organization not found.' });

    // Safely handle dedicatedDatabaseUri:
    // • No existing URI → first-time activation → safe to set directly (nothing to migrate).
    // • URI hasn't changed → no-op.
    // • URI changed AND there was an existing one → reject; must use /migrate-db instead.
    if (dedicatedDatabaseUri !== undefined) {
      const incoming = dedicatedDatabaseUri.trim();
      const current = org.dedicatedDatabaseUri || '';
      if (incoming && current && incoming !== current) {
        return res.status(409).json({
          msg: 'Your organization already has an active database. ' +
               'To switch clusters safely, use the "Migrate Database" option ' +
               'which will copy your data before switching.',
          requiresMigration: true
        });
      }
      if (!current && incoming) {
        // First-time setup — set directly
        org.dedicatedDatabaseUri = incoming;
      }
    }

    if (customDomain !== undefined) org.customDomain = customDomain.toLowerCase().trim();
    if (themeKey !== undefined) org.themeKey = themeKey;
    if (logo !== undefined) org.logo = logo;
    await org.save();

    res.json({ msg: 'Organization settings updated.', organization: org });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

// ─── POST /api/organizations/:id/validate-db ─────────────────────────────
// Admin — quickly test whether a new MongoDB URI is reachable.
// Runs a connect + disconnect with a short timeout. No reads or writes.
// Use this before starting a full migration so the Admin knows the URI is valid.
router.post('/:id/validate-db', async (req, res) => {
  try {
    const org = await Organization.findById(req.params.id);
    if (!org) return res.status(404).json({ msg: 'Organization not found.' });

    const { newUri } = req.body;
    if (!newUri || typeof newUri !== 'string' || !newUri.trim()) {
      return res.status(400).json({ msg: 'newUri is required.' });
    }

    const result = await validateUri(newUri.trim());
    if (result.ok) {
      res.json({ ok: true, msg: 'Connection successful. The new database is reachable.' });
    } else {
      res.status(400).json({ ok: false, msg: `Cannot reach database: ${result.error}` });
    }
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

// ─── POST /api/organizations/:id/migrate-db ──────────────────────────────
// Admin — migrate all data from the current dedicated cluster to a new one.
//
// SAFETY CONTRACT:
//  • The old cluster's URI is never changed until EVERY collection is copied
//    and its document count verified on the new cluster.
//  • If the migration fails at any step, the org's dedicatedDatabaseUri is
//    left unchanged — the org stays online on its existing cluster.
//  • A second migration cannot start while one is already in_progress.
router.post('/:id/migrate-db', async (req, res) => {
  try {
    const org = await Organization.findById(req.params.id);
    if (!org) return res.status(404).json({ msg: 'Organization not found.' });

    const { newUri } = req.body;
    if (!newUri || typeof newUri !== 'string' || !newUri.trim()) {
      return res.status(400).json({ msg: 'newUri is required.' });
    }

    const incoming = newUri.trim();

    // Prevent duplicate runs
    if (org.migrationStatus === 'in_progress') {
      return res.status(409).json({
        msg: 'A migration is already in progress for this organization. ' +
             'Please wait for it to complete before starting another.',
        migrationStatus: 'in_progress'
      });
    }

    // Nothing to do if same URI
    if (incoming === (org.dedicatedDatabaseUri || '')) {
      return res.status(400).json({ msg: 'The new URI is the same as the current one.' });
    }

    // Run the migration synchronously.
    // For church-management data volumes this is safe within a normal HTTP timeout.
    // The client should use a long fetch timeout (or show a progress indicator).
    const result = await migrateOrgDb(org, incoming);

    if (result.ok) {
      // Re-fetch to get the updated document after migration saved it
      const updated = await Organization.findById(req.params.id);
      res.json({
        ok: true,
        msg: `Migration complete. ${result.docsCopied} documents across ` +
             `${result.collections.length} collections copied and verified.`,
        collections: result.collections,
        docsCopied: result.docsCopied,
        organization: updated
      });
    } else {
      res.status(500).json({
        ok: false,
        msg: result.error,
        migrationStatus: 'failed'
      });
    }
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

module.exports = router;
