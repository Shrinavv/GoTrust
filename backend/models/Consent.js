const mongoose = require('mongoose');

const consentSchema = new mongoose.Schema({
  consentId: { type: String, unique: true, required: true },
  userIp: String,
  country: String,
  consents: {
    essential: Boolean,
    performance: Boolean,
    functional: Boolean,
    targeting: Boolean
  },
  version: { type: Number, default: 1 },
  timestamp: { type: Date, default: Date.now },
  withdrawn: { type: Boolean, default: false },
  withdrawalTimestamp: Date
});

module.exports = mongoose.model('Consent', consentSchema);