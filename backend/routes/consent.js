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

router.post('/scan', async (req, res) => {
  try {
    const { cookies, consents } = req.body; // now expect optional consents object

    const categorized = cookies.map(cookie => {
      const name = cookie.name.toLowerCase();
      let category = 'essential';
      let purpose = 'Unknown purpose';
      let status = 'Always allowed';
      let blocked = false;

      if (name.includes('_ga') || name.includes('_gid') || name.includes('_utm')) {
        category = 'performance';
        purpose = 'Google Analytics / tracking';
        status = 'Requires consent';
        blocked = consents && !consents.performance;
      } else if (name.includes('_fbp') || name.includes('_gcl') || name.includes('ads')) {
        category = 'targeting';
        purpose = 'Advertising / retargeting';
        status = 'Requires consent';
        blocked = consents && !consents.targeting;
      } else if (name.includes('session') || name.includes('auth')) {
        category = 'essential';
        purpose = 'Session management / security';
      } else if (name.includes('lang') || name.includes('theme') || name.includes('pref')) {
        category = 'functional';
        purpose = 'User preferences / functionality';
        status = 'Requires consent';
        blocked = consents && !consents.functional;
      }

      return {
        name: cookie.name,
        category,
        purpose,
        status,
        blocked: blocked ? 'Blocked' : 'Allowed'
      };
    });

    res.json({ scanned: categorized, total: categorized.length });
  } catch (err) {
    res.status(500).json({ error: 'Scan failed' });
  }
});

// GET /api/consent/all – returns all consents (for dashboard)
router.get('/all', async (req, res) => {
  try {
    const consents = await Consent.find()
      .sort({ timestamp: -1 }) // newest first
      .limit(50); // safety limit

    const total = await Consent.countDocuments();
    const analyticsAccepted = await Consent.countDocuments({ "consents.performance": true });

    const rate = total > 0 ? ((analyticsAccepted / total) * 100).toFixed(1) : 0;

    res.json({
      consents: consents.map(c => ({
        consentId: c.consentId,
        timestamp: c.timestamp,
        country: c.country || 'Unknown',
        ip: c.userIp ? c.userIp.substring(0, 7) + '***' : 'hidden', // mask IP
        consents: c.consents,
        withdrawn: c.withdrawn
      })),
      stats: {
        total,
        analyticsAccepted,
        analyticsRate: rate + '%'
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch consents' });
  }
});
module.exports = router;