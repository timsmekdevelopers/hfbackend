const mongoose = require('mongoose');

/**
 * Test whether a MongoDB URI is reachable.
 * Opens a connection with a short timeout, then closes it.
 * @param {string} uri
 * @returns {Promise<{ok: boolean, error?: string}>}
 */
async function validateUri(uri) {
  let conn;
  try {
    conn = mongoose.createConnection(uri, { serverSelectionTimeoutMS: 5000 });
    await conn.asPromise();
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  } finally {
    if (conn) {
      try { await conn.close(); } catch {}
    }
  }
}

/**
 * Migrate all collections from org's current dedicated database to a new one.
 * The org's URI is only switched after every collection is copied and verified.
 * If any step fails the org is left on its existing URI.
 *
 * @param {object} org   - Mongoose Organization document
 * @param {string} newUri
 * @returns {Promise<{ok: boolean, docsCopied?: number, collections?: string[], error?: string}>}
 */
async function migrateOrgDb(org, newUri) {
  const Organization = require('./models/Organization');
  const { evictOrgConnection } = require('./orgDb');

  let sourceConn;
  let targetConn;

  try {
    org.migrationStatus = 'in_progress';
    await org.save();

    const sourceUri = org.dedicatedDatabaseUri;

    // First-time activation — no data to migrate, just set the URI
    if (!sourceUri) {
      org.dedicatedDatabaseUri = newUri;
      org.migrationStatus = 'idle';
      await org.save();
      return { ok: true, docsCopied: 0, collections: [] };
    }

    sourceConn = mongoose.createConnection(sourceUri, { serverSelectionTimeoutMS: 10000 });
    await sourceConn.asPromise();

    targetConn = mongoose.createConnection(newUri, { serverSelectionTimeoutMS: 10000 });
    await targetConn.asPromise();

    const sourceDb = sourceConn.db;
    const targetDb = targetConn.db;

    const collectionInfos = await sourceDb.listCollections().toArray();
    const collectionNames = collectionInfos.map(c => c.name);

    let totalDocsCopied = 0;
    const migratedCollections = [];

    for (const name of collectionNames) {
      const sourceColl = sourceDb.collection(name);
      const targetColl = targetDb.collection(name);
      const docs = await sourceColl.find({}).toArray();

      if (docs.length > 0) {
        await targetColl.deleteMany({});
        await targetColl.insertMany(docs);

        const targetCount = await targetColl.countDocuments();
        if (targetCount !== docs.length) {
          throw new Error(
            `Count mismatch for "${name}": expected ${docs.length}, got ${targetCount}`
          );
        }
      }

      totalDocsCopied += docs.length;
      migratedCollections.push(name);
    }

    // Switch URI only after all collections verified
    org.dedicatedDatabaseUri = newUri;
    org.migrationStatus = 'idle';
    await org.save();

    await evictOrgConnection(org._id);

    return { ok: true, docsCopied: totalDocsCopied, collections: migratedCollections };
  } catch (err) {
    org.migrationStatus = 'failed';
    try { await org.save(); } catch {}
    return { ok: false, error: err.message };
  } finally {
    if (sourceConn) { try { await sourceConn.close(); } catch {} }
    if (targetConn) { try { await targetConn.close(); } catch {} }
  }
}

module.exports = { validateUri, migrateOrgDb };
