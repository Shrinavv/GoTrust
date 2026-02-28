const express = require('express');
const router = express.Router();
const Admin = require('../models/Admin');
const jwt = require('jsonwebtoken');

// Create default admin (run once)
router.post('/setup', async (req, res) => {
  const admin = new Admin({ username: 'admin', password: 'admin123' });
  await admin.save();
  res.json({ msg: 'Admin created' });
});

router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const admin = await Admin.findOne({ username });
  if (!admin || !(await admin.comparePassword(password))) {
    return res.status(400).json({ msg: 'Invalid credentials' });
  }
  const token = jwt.sign({ id: admin._id }, process.env.JWT_SECRET, { expiresIn: '8h' });
  res.json({ token });
});

module.exports = router;