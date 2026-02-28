const mongoose = require('mongoose');

const auditSchema = new mongoose.Schema({
  consentId: String,
  action: { type: String, enum: ['save', 'withdraw', 'scan'] },
  ip: String,
  country: String,
  details: Object,
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('AuditLog', auditSchema);