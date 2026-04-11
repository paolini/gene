const crypto = require('crypto')

function generateKey(length = 48) {
  return crypto.randomBytes(length).toString('base64url')
}

function hashKey(key) {
  const secret = process.env.API_KEYS_HASH_SECRET
  if (!secret) throw new Error('API_KEYS_HASH_SECRET not set')
  return crypto.createHmac('sha256', secret).update(key).digest('hex')
}

function verifyKey(key, hash) {
  const secret = process.env.API_KEYS_HASH_SECRET
  if (!secret) throw new Error('API_KEYS_HASH_SECRET not set')
  const candidate = crypto.createHmac('sha256', secret).update(key).digest('hex')
  try {
    return crypto.timingSafeEqual(Buffer.from(candidate, 'hex'), Buffer.from(hash, 'hex'))
  } catch (e) {
    return false
  }
}

module.exports = { generateKey, hashKey, verifyKey }
