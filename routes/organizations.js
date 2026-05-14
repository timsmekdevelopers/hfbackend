const express = require('express');
const crypto = require('crypto');
const dns = require('dns/promises');
const https = require('https');
const router = express.Router();
const FellowCenterSetupRequest = require('../models/FellowCenterSetupRequest');
const Organization = require('../models/Organization');
const { evictOrgConnection } = require('../orgDb');
const { validateUri, migrateOrgDb } = require('../orgMigration');

// ─── Domain verification helpers ─────────────────────────────────────────────

// Check whether the domain's DNS routes to Vercel (CNAME or A record).
// Subdomains use CNAME → cname.vercel-dns.com.
// Apex domains (e.g. mychurch.org) use A → 76.76.21.21.
const VERCEL_CNAME_SUFFIX = 'vercel-dns.com';
const VERCEL_IPS = ['76.76.21.21', '76.76.21.22'];

async function checkDnsRouting(domain) {
  // Try CNAME first (works for subdomains like app.mychurch.org)
  try {
    const cnames = await dns.resolveCname(domain);
    if (cnames.some(c => c.includes(VERCEL_CNAME_SUFFIX))) {
      return { ok: true, detail: `CNAME → ${cnames[0]}` };
    }
    return { ok: false, detail: `CNAME found (${cnames[0]}) but does not point to Vercel. Expected a value containing "${VERCEL_CNAME_SUFFIX}".` };
  } catch {
    // No CNAME — apex domain; check A record
    try {
      const addrs = await dns.resolve4(domain);
      if (addrs.some(a => VERCEL_IPS.includes(a))) {
        return { ok: true, detail: `A record → ${addrs[0]}` };
      }
      return { ok: false, detail: `A record found (${addrs[0]}) but does not match Vercel IPs. Point your A record to 76.76.21.21.` };
    } catch {
      return { ok: false, detail: `No CNAME or A record found for "${domain}". Add a CNAME record pointing to cname.vercel-dns.com (for subdomains) or an A record of 76.76.21.21 (for apex domains).` };
    }
  }
}

// Register the domain in the Vercel project via the Vercel REST API.
// Requires VERCEL_TOKEN and VERCEL_PROJECT_ID env vars.
// If those aren't set the call is skipped and the Admin must add the domain
// in the Vercel dashboard manually.
function vercelAddDomain(domain) {
  return new Promise((resolve) => {
    const token = process.env.VERCEL_TOKEN;
    const projectId = process.env.VERCEL_PROJECT_ID;
    if (!token || !projectId) {
      return resolve({ skipped: true, msg: 'VERCEL_TOKEN or VERCEL_PROJECT_ID not configured — add the domain manually in your Vercel project settings.' });
    }
    const body = JSON.stringify({ name: domain });
    const req = https.request({
      hostname: 'api.vercel.com',
      path: `/v10/projects/${encodeURIComponent(projectId)}/domains`,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, body: data }); }
      });
    });
    req.on('error', (err) => resolve({ error: err.message }));
    req.write(body);
    req.end();
  });
}

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
    const { dedicatedDatabaseUri, customDomain, themeKey, logo, navbarItems, footerLinks } = req.body;
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

    if (customDomain !== undefined) {
      const newDomain = customDomain.toLowerCase().trim();
      // Reset domain verification whenever the domain value changes
      if (newDomain !== (org.customDomain || '')) {
        org.customDomainVerified = false;
        org.customDomainVerifyToken = undefined;
      }
      org.customDomain = newDomain;
    }
    if (themeKey !== undefined) org.themeKey = themeKey;
    if (logo !== undefined) org.logo = logo;
    if (Array.isArray(navbarItems)) {
      org.navbarItems = navbarItems.map(item => ({
        label: String(item.label || '').trim().slice(0, 80),
        href: String(item.href || '').trim().slice(0, 500)
      })).filter(item => item.label && item.href);
    }
    if (Array.isArray(footerLinks)) {
      org.footerLinks = footerLinks.map(item => ({
        label: String(item.label || '').trim().slice(0, 80),
        href: String(item.href || '').trim().slice(0, 500)
      })).filter(item => item.label && item.href);
    }
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

// ─── POST /api/organizations/:id/verify-domain ───────────────────────────
// Admin — two-step domain ownership + DNS routing verification.
//
// Body: { action: 'start' }
//   Generates a unique TXT verification token, saves it on the org, and returns
//   the exact DNS records the Admin must add at their registrar.
//
// Body: { action: 'check' }
//   1. Looks up the TXT record _hf-verify.<domain> and checks for the token.
//   2. Checks that the domain's CNAME (or A record for apex domains) points to Vercel.
//   3. If both pass: calls Vercel API to register the domain in the project
//      (requires VERCEL_TOKEN + VERCEL_PROJECT_ID env vars; skipped if absent).
//   4. Marks org.customDomainVerified = true only after DNS is confirmed.
router.post('/:id/verify-domain', async (req, res) => {
  try {
    const org = await Organization.findById(req.params.id);
    if (!org) return res.status(404).json({ msg: 'Organization not found.' });

    const domain = org.customDomain;
    if (!domain) {
      return res.status(400).json({ msg: 'No custom domain set on this organization. Save a domain first.' });
    }

    const { action } = req.body;

    // ── action: start ────────────────────────────────────────────────────────
    if (action === 'start') {
      // Token is deterministic: the org's unique ID makes it globally unique
      // without needing to store a random secret.
      const token = `hf-verify-${org.organization_id}`;
      org.customDomainVerifyToken = token;
      org.customDomainVerified = false;
      await org.save();

      return res.json({
        token,
        domain,
        txtRecord: `_hf-verify.${domain}`,
        cname: 'cname.vercel-dns.com',
        apexA: '76.76.21.21'
      });
    }

    // ── action: check ────────────────────────────────────────────────────────
    if (action === 'check') {
      const expectedToken = org.customDomainVerifyToken;
      if (!expectedToken) {
        return res.status(400).json({ msg: 'No verification token found. Click "Generate Verification Token" first.' });
      }

      // Step 1: TXT ownership check
      let txtFound = false;
      try {
        const records = await dns.resolveTxt(`_hf-verify.${domain}`);
        // records is string[][] — flatten and check for exact token match
        txtFound = records.flat().some(r => r === expectedToken || r.includes(expectedToken));
      } catch {
        // Record not yet propagated or doesn't exist — fall through
      }

      if (!txtFound) {
        return res.status(400).json({
          ok: false,
          step: 'txt',
          msg: `TXT record not found yet for _hf-verify.${domain}. ` +
               `Make sure the value is exactly "${expectedToken}". ` +
               `DNS propagation can take a few minutes — try again shortly.`
        });
      }

      // Step 2: Routing check (CNAME or A record → Vercel)
      const routing = await checkDnsRouting(domain);
      if (!routing.ok) {
        return res.status(400).json({ ok: false, step: 'cname', msg: routing.detail });
      }

      // Step 3: Register with Vercel (best-effort; does not block verification)
      const vercelResult = await vercelAddDomain(domain);
      const vercelOk = vercelResult.skipped ||
                       vercelResult.status === 200 ||
                       vercelResult.status === 409; // 409 = already added to project

      // Mark verified — DNS ownership + routing are confirmed
      org.customDomainVerified = true;
      await org.save();

      const baseMsg = `Domain verified. DNS routing confirmed (${routing.detail}).`;
      const vercelNote = vercelResult.skipped
        ? ' Add the domain in your Vercel project settings to complete setup.'
        : vercelOk
          ? ` Domain registered with Vercel — your members can now visit ${domain}.`
          : ` Vercel registration encountered an issue; add "${domain}" manually in your Vercel project settings.`;

      return res.json({
        ok: true,
        domain,
        dnsDetail: routing.detail,
        vercelOk,
        msg: baseMsg + vercelNote,
        organization: org
      });
    }

    return res.status(400).json({ msg: 'Invalid action. Use "start" or "check".' });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

module.exports = router;
