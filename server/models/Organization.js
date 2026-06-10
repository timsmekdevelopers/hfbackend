const mongoose = require('mongoose');

const navLinkSchema = new mongoose.Schema({
  label: { type: String, required: true, maxlength: 80 },
  href: { type: String, required: true, maxlength: 500 }
}, { _id: false });

const organizationSchema = new mongoose.Schema({
  organization_id: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true },
  logo: { type: String },
  address: { type: String },
  enquiryPhone: { type: String },
  adminName: { type: String },
  adminEmail: { type: String },
  adminPhone: { type: String },
  adminPosition: { type: String },
  adminPassportPhoto: { type: String },
  wantsDedicatedDatabase: { type: Boolean, default: false },
  wantsCustomDomain: { type: Boolean, default: false },
  status: { type: String, default: 'active', enum: ['active', 'inactive', 'suspended'] },
  setupRequestId: { type: mongoose.Schema.Types.ObjectId, ref: 'FellowCenterSetupRequest' },
  approvedBy: { type: String },
  approvedAt: { type: Date },
  dedicatedDatabaseUri: { type: String },
  customDomain: { type: String },
  customDomainVerified: { type: Boolean, default: false },
  customDomainVerifyToken: { type: String },
  themeKey: { type: String },
  navbarItems: { type: [navLinkSchema], default: [] },
  footerLinks: { type: [navLinkSchema], default: [] },
  centerCustomName: { type: String, default: 'Our Church Fellowship' },
  migrationStatus: {
    type: String,
    enum: ['idle', 'in_progress', 'completed', 'failed'],
    default: 'idle'
  }
}, { timestamps: true });

module.exports = mongoose.model('Organization', organizationSchema);
