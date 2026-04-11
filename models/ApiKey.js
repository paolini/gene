const mongoose = require('mongoose')

const ApiKeySchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    // Store the encrypted key value (ciphertext). Never expose in responses.
    encryptedKey: { type: String, required: true, select: false },
    provider: { type: String, required: true, enum: ['openai'] },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
    scopes: { type: [String], default: [] },
    revoked: { type: Boolean, default: false },
    lastUsedAt: { type: Date },
    metadata: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true }
)

// Partial index to quickly find active (non-revoked) keys by provider
ApiKeySchema.index({ provider: 1, revoked: 1 })

// Instance method to return a safe JSON representation (don't expose full key)
ApiKeySchema.methods.toSafeObject = function () {
  const obj = this.toObject({ getters: true })
  if (obj.encryptedKey) obj.encryptedKey = obj.encryptedKey.slice(0, 8) + '...'
  return obj
}

// Hide sensitive fields when converting to JSON
ApiKeySchema.set('toJSON', {
  transform(doc, ret) {
    delete ret.encryptedKey
    return ret
  },
})

module.exports = mongoose.models.ApiKey || mongoose.model('ApiKey', ApiKeySchema)
