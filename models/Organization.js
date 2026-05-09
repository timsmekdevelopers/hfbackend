const mongoose = require('mongoose');

const organizationSchema = new mongoose.Schema({
  organization_id: { type: String, required: true, unique: true },

  // Church / Commission identity
  name: { type: String, required: true },
  logo: { type: String },           // base64 data URL or file path
  address: { type: String },
  enquiryPhone: { type: String },   // general enquiry phone

  // Linked Admin user
  adminUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  adminName: { type: String },
  adminEmail: { type: String },
  adminPhone: { type: String },
  adminPosition: { type: String },  // position / title in the church
  adminPassportPhoto: { type: String }, // base64

  // Infrastructure preferences
  wantsDedicatedDatabase: { type: Boolean, default: false },
  dedicatedDatabaseUri: { type: String },        // submitted by Admin via settings
  wantsCustomDomain: { type: Boolean, default: false },
  customDomain: { type: String },

  // Lifecycle
  status: { type: String, enum: ['pending', 'active', 'suspended'], default: 'pending' },
  setupRequestId: { type: mongoose.Schema.Types.ObjectId, ref: 'FellowCenterSetupRequest' },
  approvedBy: { type: String },
  approvedAt: { type: Date },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Organization', organizationSchema);
