const mongoose = require('mongoose');

const hfDownloadSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  userName: { type: String },
  count: { type: Number, default: 0 },
  lastDownloadedAt: { type: Date }
}, { _id: false });

const hfDocumentSchema = new mongoose.Schema({
  type: { type: String, enum: ['manual', 'guide'], default: 'manual' },
  topic: { type: String, required: true },
  date: { type: String, required: true },
  contentHtml: { type: String, required: true },
  createdByName: { type: String, required: true },
  createdById: { type: String },
  downloads: { type: [hfDownloadSchema], default: [] },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('HFDocument', hfDocumentSchema);
