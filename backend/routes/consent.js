const express = require('express');
const router = express.Router();
const Consent = require('../models/Consent');
const AuditLog = require('../models/AuditLog');
const auth = require('../middleware/auth');

// Public - Save consent
router.post('/save', async (req, res) => {
  const { consents, country } = req.body;
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  const consentId = 'GT-' + Date.now().toString(36).toUpperCase();

  const consent = new Consent({
    consentId,
    userIp: ip,
    country: country || 'Unknown',
    consents,
    version: 1
  });
  await consent.save();

  const log = new AuditLog({ consentId, action: 'save', ip, country: country || 'Unknown', details: consents });
  await log.save();

  res.json({ consentId, success: true });
});

// Public - Withdraw
router.post('/withdraw', async (req, res) => {
  const { consentId } = req.body;
  const consent = await Consent.findOneAndUpdate(
    { consentId },
    { withdrawn: true, withdrawalTimestamp: Date.now() },
    { new: true }
  );
  if (consent) {
    await AuditLog.create({ consentId, action: 'withdraw', details: { withdrawn: true } });
  }
  res.json({ success: !!consent });
});

// Protected - Get all audits + stats
router.get('/audit', auth, async (req, res) => {
  const logs = await AuditLog.find().sort({ timestamp: -1 }).limit(500);
  const total = await Consent.countDocuments();
  const withdrawn = await Consent.countDocuments({ withdrawn: true });
  const byCountry = await Consent.aggregate([
    { $group: { _id: '$country', count: { $sum: 1 } } }
  ]);
  res.json({ logs, stats: { total, withdrawn, rate: ((total - withdrawn) / total * 100).toFixed(1) || 0 }, byCountry });
});

// Protected - Dashboard stats
router.get('/stats', auth, async (req, res) => {
  const consents = await Consent.find();
  res.json({ consents });
});

// Mock advanced scanner
router.post('/scan', async (req, res) => {
  const { cookies } = req.body; // array of {name}
  const categorized = cookies.map(c => ({
    name: c.name,
    category: ['_ga','_gid'].includes(c.name) ? 'performance' : 
              ['session','auth'].includes(c.name) ? 'essential' : 
              ['_fbp','_gcl'].includes(c.name) ? 'targeting' : 'functional'
  }));
  res.json({ scanned: categorized });
});

module.exports = router;