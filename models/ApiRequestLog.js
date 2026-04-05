const mongoose = require('mongoose');

const ApiRequestLogSchema = new mongoose.Schema({
  requestId: { type: String, required: true, index: true },
  method: { type: String, required: true },
  path: { type: String, required: true, index: true },
  routeType: { type: String, default: 'api', index: true },
  statusCode: { type: Number, required: true, min: 100, max: 599 },
  durationMs: { type: Number, required: true, min: 0 },
  userId: { type: String, default: null },
  userEmail: { type: String, default: null, index: true },
  userRole: { type: String, default: null },
  ipAddress: { type: String, default: null },
  userAgent: { type: String, default: null },
  referer: { type: String, default: null },
  requestCategory: { type: String, default: null, index: true },
  requestName: { type: String, default: null },
  graphqlOperationType: { type: String, default: null },
  authAction: { type: String, default: null },
  outcome: { type: String, enum: ['success', 'error'], required: true },
  errorMessage: { type: String, default: null }
}, { timestamps: true });

ApiRequestLogSchema.index({ createdAt: -1 });
ApiRequestLogSchema.index({ routeType: 1, createdAt: -1 });

module.exports = mongoose.models.ApiRequestLog || mongoose.model('ApiRequestLog', ApiRequestLogSchema);