const mongoose = require('mongoose');

const attendanceReportSchema = new mongoose.Schema({
  leaderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  leaderName: { type: String, required: true },
  centerKey: { type: String, required: true },
  country: { type: String },
  state: { type: String },
  branch: { type: String },
  city: { type: String },
  weekStart: { type: Date, required: true },
  totals: {
    totalAttendance: { type: Number, default: 0 },
    maleAdults: { type: Number, default: 0 },
    femaleAdults: { type: Number, default: 0 },
    children: { type: Number, default: 0 }
  },
  presentMemberIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

attendanceReportSchema.index({ leaderId: 1, weekStart: 1 }, { unique: true });

module.exports = mongoose.model('AttendanceReport', attendanceReportSchema);
