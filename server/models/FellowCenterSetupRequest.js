const mongoose = require('mongoose');

const fellowCenterSetupRequestSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String, required: true },
  address: { type: String, required: true },
  position: { type: String, required: true },
  passportPhoto: { type: String, required: true },
  churchName: { type: String, required: true },
  churchLogo: { type: String },
  churchAddress: { type: String, required: true },
  churchEnquiryPhone: { type: String, required: true },
  requestedSubdomain: { type: String },
  wantsDedicatedDatabase: { type: Boolean, default: false },
  wantsCustomDomain: { type: Boolean, default: false },
  status: {
    type: String,
    default: 'pending',
    enum: ['pending', 'approved', 'rejected']
  },
  reviewedBy: { type: String },
  reviewedAt: { type: Date },
  reviewNote: { type: String },
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' }
}, { timestamps: true });

module.exports = mongoose.model('FellowCenterSetupRequest', fellowCenterSetupRequestSchema);
