const express = require('express');
const router = express.Router();
const roles = require('../roles');

// Get all roles
router.get('/', (req, res) => {
  res.json(Object.values(roles));
});

module.exports = router;
