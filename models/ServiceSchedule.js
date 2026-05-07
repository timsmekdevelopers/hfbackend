const mongoose = require('mongoose');

const serviceScheduleSchema = new mongoose.Schema({
  text: { type: String, required: true },
  updatedBy: { type: String },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('ServiceSchedule', serviceScheduleSchema);
