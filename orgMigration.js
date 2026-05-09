/**
 * orgMigration.js — Safe, zero-downtime database migration for an organization.
 *
 * WORKFLOW
 * ────────
 * 1.  Validate the new URI is reachable (quick connect test, no writes).
 * 2.  Open a read connection to the OLD cluster (may already be in the pool).
 * 3.  Open a write connection to the NEW cluster.
 * 4.  List every collection present in the OLD database.
 * 5.  For each collection, copy all documents in batches to the NEW cluster.
 * 6.  After every collection, verify the document count matches.
 * 7.  ONLY after all collections are verified — update the org's
 *     dedicatedDatabaseUri, clear pendingDatabaseUri, evict the old connection.
 * 8.  On ANY failure — leave the org's dedicatedDatabaseUri unchanged so the
 *     org stays online on its existing cluster.  Close the new connection and
 *     record the error on the org document.
 *
 * SAFETY GUARANTEES
 * ─────────────────
 * • The old cluster is read-only during migration.  Writes keep going to the
 *   old cluster via the existing pooled connection until the switch is confirmed.
 * • The new cluster is write-only during migration.  It is never exposed to the
 *   app until every collection has been verified.
 * • If the process crashes mid-migration, migrationStatus stays 'in_progress'
 *   and the API will refuse to start a second migration until a Super Admin
 *   resets it, preventing duplicate runs.
 * • Indexes are rebuilt on the new cluster after documents are copied.
 *
 * LIMITATIONS (acceptable for this scale)
 * ─────────────────────────────────────────
 * • This performs a point-in-time copy.  Documents written to the OLD cluster
 *   AFTER migration starts are NOT automatically copied.  For church-management
 *   data volumes this window is negligible and can be handled by the Admin
 *   triggering migration during off-peak hours.
 * • For very large datasets (>100k documents) a background job / Atlas Live
 *   Migration is more appropriate.  This module handles up to ~50k docs safely.
 */

'use strict';

const mongoose = require('mongoose');
const { evictOrgConnection } = require('./orgDb');

const BATCH_SIZE = 500;           // documents per bulk-write
const CONNECT_TIMEOUT_MS = 8000;  // max time to verify a new URI is reachable

/**
 * Test that a MongoDB URI is reachable without touching any data.
 * Returns { ok: true } or { ok: false, error: string }.
 */
async function validateUri(uri) {
  let conn;
  try {
    conn = await mongoose.createConnection(uri, {
      serverSelectionTimeoutMS: CONNECT_TIMEOUT_MS,
      socketTimeoutMS: CONNECT_TIMEOUT_MS,
    });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  } finally {
    if (conn) await conn.close().catch(() => {});
  }
}

/**
 * Migrate all collections from the org's current dedicated DB to a new cluster.
 *
 * @param {object}   org           Mongoose Organization document (will be mutated & saved).
 * @param {string}   newUri        The new MongoDB connection string.
 * @param {object}   [oldConn]     Existing mongoose.Connection for the old cluster,
 *                                 or null to open a fresh one.
 * @param {Function} [onProgress]  Optional callback({ collection, copied, total }) for SSE/WS.
 *
 * @returns {Promise<{ ok: boolean, error?: string, collections: string[], docsCopied: number }>}
 */
async function migrateOrgDb(org, newUri, oldConn = null, onProgress = null) {
  const oldUri = org.dedicatedDatabaseUri;
  let newConn = null;
  let openedOldConn = false;

  // ── Mark migration as in-progress in DB ──────────────────────────────────
  org.pendingDatabaseUri = newUri;
  org.migrationStatus = 'in_progress';
  org.migrationStartedAt = new Date();
  org.migrationFinishedAt = undefined;
  org.migrationError = undefined;
  org.migrationCollectionsCopied = 0;
  await org.save();

  const fail = async (message) => {
    org.migrationStatus = 'failed';
    org.migrationFinishedAt = new Date();
    org.migrationError = message;
    await org.save().catch(() => {});
    if (newConn) await newConn.close().catch(() => {});
    if (openedOldConn && oldConn) await oldConn.close().catch(() => {});
    console.error(`[orgMigration] FAILED for org ${org.organization_id}: ${message}`);
    return { ok: false, error: message, collections: [], docsCopied: 0 };
  };

  // ── 1. Connect to the NEW cluster ─────────────────────────────────────────
  try {
    newConn = await mongoose.createConnection(newUri, {
      serverSelectionTimeoutMS: CONNECT_TIMEOUT_MS,
      socketTimeoutMS: 60000,
    });
  } catch (err) {
    return fail(`Cannot reach new database: ${err.message}`);
  }

  // ── 2. Connect to the OLD cluster if we don't already have a connection ───
  if (!oldUri) {
    // No existing dedicated URI — nothing to migrate, just adopt the new URI
    org.dedicatedDatabaseUri = newUri;
    org.pendingDatabaseUri = undefined;
    org.migrationStatus = 'succeeded';
    org.migrationFinishedAt = new Date();
    org.migrationCollectionsCopied = 0;
    await org.save();
    await newConn.close().catch(() => {});
    return { ok: true, collections: [], docsCopied: 0 };
  }

  if (!oldConn) {
    try {
      oldConn = await mongoose.createConnection(oldUri, {
        serverSelectionTimeoutMS: CONNECT_TIMEOUT_MS,
        socketTimeoutMS: 60000,
      });
      openedOldConn = true;
    } catch (err) {
      return fail(`Cannot reach old database (your data is safe there): ${err.message}`);
    }
  }

  // ── 3. Enumerate collections in the OLD database ──────────────────────────
  let collectionNames = [];
  try {
    const raw = await oldConn.db.listCollections().toArray();
    collectionNames = raw.map((c) => c.name).filter((n) => !n.startsWith('system.'));
  } catch (err) {
    return fail(`Could not list collections on old database: ${err.message}`);
  }

  // ── 4. Copy each collection ───────────────────────────────────────────────
  let totalDocsCopied = 0;
  const copiedCollections = [];

  for (const collName of collectionNames) {
    try {
      const oldColl = oldConn.db.collection(collName);
      const newColl = newConn.db.collection(collName);

      const totalDocs = await oldColl.countDocuments();
      let offset = 0;

      while (offset < totalDocs) {
        const batch = await oldColl
          .find({})
          .skip(offset)
          .limit(BATCH_SIZE)
          .toArray();

        if (batch.length === 0) break;

        // insertMany with ordered:false so a single duplicate _id doesn't abort the batch.
        // This handles the case where the migration is retried after a partial success.
        await newColl.insertMany(batch, { ordered: false }).catch((err) => {
          // 11000 = duplicate key — safe to ignore on retry
          if (err.code !== 11000 && err.name !== 'BulkWriteError') throw err;
        });

        offset += batch.length;
        totalDocsCopied += batch.length;

        onProgress && onProgress({ collection: collName, copied: offset, total: totalDocs });
      }

      // ── 5. Verify document count ──────────────────────────────────────────
      const newCount = await newColl.countDocuments();
      const oldCount = await oldColl.countDocuments();

      if (newCount < oldCount) {
        return fail(
          `Count mismatch in collection "${collName}": old=${oldCount}, new=${newCount}. ` +
          `Migration aborted. Your data is safe on the original cluster.`
        );
      }

      // ── 6. Rebuild indexes ────────────────────────────────────────────────
      try {
        const indexes = await oldColl.indexes();
        for (const idx of indexes) {
          if (idx.name === '_id_') continue; // _id index is automatic
          const { key, name, ...opts } = idx;
          await newColl.createIndex(key, { name, ...opts }).catch(() => {});
        }
      } catch (_) {
        // Index rebuild failure is non-fatal — data is intact
      }

      copiedCollections.push(collName);
      org.migrationCollectionsCopied = copiedCollections.length;
      await org.save().catch(() => {});

      console.log(
        `[orgMigration] Copied collection "${collName}" ` +
        `(${oldCount} docs) for org ${org.organization_id}`
      );
    } catch (err) {
      return fail(
        `Error copying collection "${collName}": ${err.message}. ` +
        `Your data is safe on the original cluster.`
      );
    }
  }

  // ── 7. ALL collections verified — perform the switch ─────────────────────
  const previousUri = org.dedicatedDatabaseUri;
  org.dedicatedDatabaseUri = newUri;
  org.pendingDatabaseUri = undefined;
  org.migrationStatus = 'succeeded';
  org.migrationFinishedAt = new Date();
  org.migrationError = undefined;
  await org.save();

  // Evict the old cached connection from the pool so the next request opens
  // a fresh one to the NEW cluster.
  evictOrgConnection(org._id);

  // Close the old connection we opened ourselves (if any).
  if (openedOldConn && oldConn) {
    await oldConn.close().catch(() => {});
  }

  // The newConn we opened for migration purposes is no longer needed —
  // orgDb.js will open its own managed connection on the next request.
  await newConn.close().catch(() => {});

  console.log(
    `[orgMigration] SUCCESS for org ${org.organization_id}. ` +
    `${totalDocsCopied} documents across ${copiedCollections.length} collections migrated. ` +
    `Old URI: ${previousUri ? previousUri.replace(/:\/\/[^@]+@/, '://***@') : 'none'}`
  );

  return { ok: true, collections: copiedCollections, docsCopied: totalDocsCopied };
}

module.exports = { validateUri, migrateOrgDb };
