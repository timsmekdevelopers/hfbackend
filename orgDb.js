/**
 * orgDb.js — Per-organization database connection manager.
 *
 * Each organization can configure a dedicated MongoDB URI in their settings.
 * This module maintains a pool of named Mongoose connections — one per org
 * that has a dedicatedDatabaseUri set.  All other orgs (and global data like
 * the Organization and FellowCenterSetupRequest collections) continue to use
 * the default application connection created in db.js.
 *
 * How it works
 * ─────────────
 * 1. A route that is org-scoped calls `getOrgDb(org)`.
 * 2. If `org.dedicatedDatabaseUri` is set, a Mongoose connection to that URI
 *    is created lazily and cached.  Subsequent calls reuse the live connection.
 * 3. If there is no dedicated URI (or the connection fails), the function
 *    returns `null` so the caller gracefully falls back to the main DB.
 * 4. When an Admin updates their URI in settings, `evictOrgConnection(orgId)`
 *    is called to close the old connection so a fresh one is established on
 *    the next request.
 *
 * Usage in a route
 * ─────────────────
 *   const { getOrgDb } = require('../orgDb');
 *
 *   // org is the Organization document (mongoose doc or plain object)
 *   const conn = await getOrgDb(org);
 *   const UserModel = conn
 *     ? conn.model('User', require('../models/User').schema)
 *     : require('../models/User');      // falls back to main DB model
 */

'use strict';

const mongoose = require('mongoose');

// Map of orgId (string) → mongoose.Connection
const pool = new Map();

/**
 * Returns a live Mongoose Connection scoped to the org's dedicated database,
 * or null if the org has no dedicated URI or the connection cannot be
 * established (safe fallback to main DB).
 *
 * @param {object} org  Mongoose document or plain object with _id and
 *                      dedicatedDatabaseUri fields.
 * @returns {Promise<mongoose.Connection|null>}
 */
async function getOrgDb(org) {
  if (!org || !org.dedicatedDatabaseUri) return null;

  const key = String(org._id);

  if (pool.has(key)) {
    const conn = pool.get(key);
    // readyState: 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
    if (conn.readyState === 1 || conn.readyState === 2) return conn;
    // Stale — remove and reconnect below
    pool.delete(key);
  }

  try {
    const conn = await mongoose.createConnection(org.dedicatedDatabaseUri, {
      serverSelectionTimeoutMS: 6000,
      socketTimeoutMS: 30000,
    });

    pool.set(key, conn);
    console.log(`[orgDb] Connected to dedicated DB for org ${org.organization_id || key}`);
    return conn;
  } catch (err) {
    console.error(
      `[orgDb] Could not connect to dedicated DB for org ${org.organization_id || key}: ${err.message}`
    );
    // Return null — caller falls back to main DB so the request still works
    return null;
  }
}

/**
 * Closes and removes a cached connection.
 * Call this whenever an Admin changes their org's dedicatedDatabaseUri so
 * the stale connection is not reused.
 *
 * @param {string|mongoose.Types.ObjectId} orgId
 */
function evictOrgConnection(orgId) {
  const key = String(orgId);
  if (!pool.has(key)) return;

  const conn = pool.get(key);
  conn.close().catch((err) => {
    console.warn(`[orgDb] Error closing evicted connection for org ${key}: ${err.message}`);
  });
  pool.delete(key);
  console.log(`[orgDb] Evicted dedicated DB connection for org ${key}`);
}

/**
 * Returns the number of active dedicated connections (useful for health checks).
 */
function poolSize() {
  return pool.size;
}

module.exports = { getOrgDb, evictOrgConnection, poolSize };
