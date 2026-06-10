const mongoose = require('mongoose');

// Cache of Mongoose connections keyed by org._id string
const orgConnections = new Map();

/**
 * Get or create a Mongoose connection for an org's dedicated database.
 * @param {string} orgId - The org's MongoDB _id (string)
 * @param {string} uri   - The org's dedicatedDatabaseUri
 * @returns {Promise<mongoose.Connection>}
 */
async function getOrgConnection(orgId, uri) {
  const key = String(orgId);
  let conn = orgConnections.get(key);
  if (conn && conn.readyState === 1) return conn;

  // Close stale connection if present
  if (conn) {
    try { await conn.close(); } catch {}
    orgConnections.delete(key);
  }

  conn = mongoose.createConnection(uri);
  await conn.asPromise();
  orgConnections.set(key, conn);
  return conn;
}

/**
 * Evict and close the cached connection for an org.
 * Forces a fresh connection on the next getOrgConnection call.
 * @param {string|object} orgId
 */
async function evictOrgConnection(orgId) {
  const key = String(orgId);
  const conn = orgConnections.get(key);
  if (conn) {
    try { await conn.close(); } catch {}
    orgConnections.delete(key);
  }
}

module.exports = { getOrgConnection, evictOrgConnection };
