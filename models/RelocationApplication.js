const mongoose = require('mongoose');

const relocationApplicationSchema = new mongoose.Schema({
  applicantId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  applicantName: { type: String, required: true },
  applicantEmail: { type: String, required: true },
  fromCenter: {
    country: String,
    state: String,
    branch: String,
    city: String,
    centerKey: String
  },
  toCenter: {
    leaderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    leaderName: { type: String, required: true },
    country: String,
    state: String,
    branch: String,
    city: String,
    address: String,
    centerKey: String
  },
  newResidence: {
    country: { type: String, required: true },
    state: { type: String, required: true },
    city: { type: String, required: true },
    address: { type: String, default: '' }
  },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  review: {
    reviewedById: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reviewedByName: String,
    reviewedByRole: String,
    note: String,
    reviewedAt: Date
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('RelocationApplication', relocationApplicationSchema);
