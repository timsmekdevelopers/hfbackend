const mongoose = require('mongoose');
const roles = require('../roles');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String },
  // Which Fellow Center organization this user belongs to.
  // Null for global/unaffiliated users (Super Admin, standalone members).
  // Set during registration when the user arrives via a custom domain or
  // selects their organization during sign-up.
  organization_id: { type: String, default: null, index: true },
  state: { type: String },
  branch: { type: String },
  country: { type: String },
  city: { type: String },
  phone: { type: String },
  address: { type: String },
  branchAddress: { type: String },
  stateHqAddress: { type: String },
  currentHfLeaderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  currentHfLeaderName: { type: String },
  currentHfLeaderPhone: { type: String },
  themePreference: { type: String, default: 'default' },
  localePreference: { type: String, default: 'en-US' },
  securityQuestion: { type: String },
  securityAnswer: { type: String },
  mustResetPassword: { type: Boolean, default: false },
  emailVerificationRequired: { type: Boolean, default: false },
  emailVerified: { type: Boolean, default: false },
  emailVerificationToken: { type: String },
  emailVerificationTokenExpiresAt: { type: Date },
  emailVerifiedAt: { type: Date },
  attendanceCredits: { type: Number, default: 0 },
  attendanceHistory: [
    {
      weekStart: { type: Date },
      creditedById: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      creditedByName: { type: String },
      centerKey: { type: String },
      at: { type: Date, default: Date.now }
    }
  ],
  approved: { type: Boolean, default: false },
  approval: {
    approvedBy: { type: String }, // name of approver
    approvedByRole: { type: String },
    approvedAt: { type: Date },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    chain: [
      {
        by: String, // name
        role: String,
        at: Date,
        status: String // approved/rejected
      }
    ]
  },
  notifications: [{ message: String, read: { type: Boolean, default: false }, createdAt: { type: Date, default: Date.now } }],
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', userSchema);
