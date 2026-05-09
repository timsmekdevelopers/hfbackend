const mongoose = require('mongoose');

const fellowCenterSetupRequestSchema = new mongoose.Schema({
  // Registrant personal details
  name: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String, required: true },
  address: { type: String, required: true },
  position: { type: String, required: true },     // position in Church/Commission
  passportPhoto: { type: String },                // base64 data URL

  // Church / Commission details
  churchName: { type: String, required: true },
  churchLogo: { type: String },                   // base64 data URL
  churchAddress: { type: String, required: true },
  churchEnquiryPhone: { type: String, required: true },

  // Infrastructure preferences
  wantsDedicatedDatabase: { type: Boolean, default: false },
  wantsCustomDomain: { type: Boolean, default: false },

  // Lifecycle
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  reviewedBy: { type: String },
  reviewedAt: { type: Date },
  reviewNote: { type: String },

  // Link to Organization once approved
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },

  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('FellowCenterSetupRequest', fellowCenterSetupRequestSchema);
