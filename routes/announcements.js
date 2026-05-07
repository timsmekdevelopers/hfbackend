const express = require('express');
const router = express.Router();
const Announcement = require('../models/Announcement');

// GET all announcements (public)
router.get('/', async (req, res) => {
  try {
    const items = await Announcement.find().sort({ createdAt: -1 });
    res.json(items);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

// POST new announcement (admin only by convention - no auth middleware yet)
router.post('/', async (req, res) => {
  try {
    const { text, postedBy } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ msg: 'Announcement text is required' });
    }
    const item = new Announcement({ text: text.trim(), postedBy });
    await item.save();
    res.status(201).json(item);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

// PUT update announcement
router.put('/:id', async (req, res) => {
  try {
    const { text, postedBy } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ msg: 'Announcement text is required' });
    }
    const item = await Announcement.findByIdAndUpdate(
      req.params.id,
      { text: text.trim(), postedBy, updatedAt: new Date() },
      { new: true }
    );
    if (!item) return res.status(404).json({ msg: 'Not found' });
    res.json(item);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

// DELETE announcement
router.delete('/:id', async (req, res) => {
  try {
    const item = await Announcement.findByIdAndDelete(req.params.id);
    if (!item) return res.status(404).json({ msg: 'Not found' });
    res.json({ msg: 'Deleted' });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

module.exports = router;
