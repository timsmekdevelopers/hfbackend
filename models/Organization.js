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

  // Branding / appearance chosen by Admin
  themeKey: { type: String, default: 'default' }, // matches THEMES key on frontend

  // Infrastructure preferences
  wantsDedicatedDatabase: { type: Boolean, default: false },
  dedicatedDatabaseUri: { type: String },        // ACTIVE — in use right now

  // Migration pipeline
  // When an Admin wants to switch clusters, the new URI is held here while
  // data is being copied.  Only promoted to dedicatedDatabaseUri on success.
  pendingDatabaseUri: { type: String },
  migrationStatus: {
    type: String,
    enum: ['idle', 'in_progress', 'succeeded', 'failed'],
    default: 'idle'
  },
  migrationStartedAt: { type: Date },
  migrationFinishedAt: { type: Date },
  migrationError: { type: String },              // last failure message (if any)
  migrationCollectionsCopied: { type: Number },  // for progress reporting

  wantsCustomDomain: { type: Boolean, default: false },
  customDomain: { type: String },
  customDomainVerified: { type: Boolean, default: false },    // true after TXT + CNAME/A check pass
  customDomainVerifyToken: { type: String },                  // token Admin must put in TXT record

  // Lifecycle
  status: { type: String, enum: ['pending', 'active', 'suspended'], default: 'pending' },
  setupRequestId: { type: mongoose.Schema.Types.ObjectId, ref: 'FellowCenterSetupRequest' },
  approvedBy: { type: String },
  approvedAt: { type: Date },

  // Customizable navigation bar items shown on the org's Fellow Center
  navbarItems: [{
    label: { type: String, required: true },
    href: { type: String, required: true }
  }],

  // Customizable footer links shown on the org's Fellow Center
  footerLinks: [{
    label: { type: String, required: true },
    href: { type: String, required: true }
  }],

  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Organization', organizationSchema);
