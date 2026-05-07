const express = require('express');
const router = express.Router();
const ServiceSchedule = require('../models/ServiceSchedule');

// GET all schedule items (public)
router.get('/', async (req, res) => {
  try {
    const items = await ServiceSchedule.find().sort({ _id: 1 });
    res.json(items);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

// POST new schedule item
router.post('/', async (req, res) => {
  try {
    const { text, updatedBy } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ msg: 'Schedule text is required' });
    }
    const item = new ServiceSchedule({ text: text.trim(), updatedBy, updatedAt: new Date() });
    await item.save();
    res.status(201).json(item);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

// PUT update schedule item
router.put('/:id', async (req, res) => {
  try {
    const { text, updatedBy } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ msg: 'Schedule text is required' });
    }
    const item = await ServiceSchedule.findByIdAndUpdate(
      req.params.id,
      { text: text.trim(), updatedBy, updatedAt: new Date() },
      { new: true }
    );
    if (!item) return res.status(404).json({ msg: 'Not found' });
    res.json(item);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

// DELETE schedule item
router.delete('/:id', async (req, res) => {
  try {
    const item = await ServiceSchedule.findByIdAndDelete(req.params.id);
    if (!item) return res.status(404).json({ msg: 'Not found' });
    res.json({ msg: 'Deleted' });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

module.exports = router;
