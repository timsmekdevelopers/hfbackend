const mongoose = require('mongoose');

const announcementSchema = new mongoose.Schema({
  text: { type: String, required: true },
  postedBy: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Announcement', announcementSchema);
