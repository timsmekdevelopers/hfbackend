const mongoose = require('mongoose');

const setupEmailVerificationSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, index: true },
  codeHash: { type: String, required: true },
  verified: { type: Boolean, default: false },
  expiresAt: { type: Date, required: true, index: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

setupEmailVerificationSchema.pre('save', function setUpdatedAt(next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('SetupEmailVerification', setupEmailVerificationSchema);
