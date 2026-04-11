const crypto = require('crypto')

const ALGO = 'aes-256-gcm'

function getKeyBuffer() {
  const secret = process.env.API_KEYS_ENC_SECRET
  if (!secret) throw new Error('API_KEYS_ENC_SECRET must be set')
  // Expect secret as hex or base64; normalize to Buffer of length 32
  let buf
  try {
    if (/^[0-9a-fA-F]+$/.test(secret) && secret.length === 64) {
      buf = Buffer.from(secret, 'hex')
    } else {
      buf = Buffer.from(secret, 'base64')
    }
  } catch (e) {
    buf = Buffer.from(secret)
  }
  if (buf.length !== 32) throw new Error('API_KEYS_ENC_SECRET must decode to 32 bytes')
  return buf
}

function encryptKey(plain) {
  const iv = crypto.randomBytes(12)
  const key = getKeyBuffer()
  const cipher = crypto.createCipheriv(ALGO, key, iv)
  const encrypted = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  // store as base64: iv|tag|ciphertext
  return Buffer.concat([iv, tag, encrypted]).toString('base64')
}

function decryptKey(payload) {
  const data = Buffer.from(payload, 'base64')
  const iv = data.slice(0, 12)
  const tag = data.slice(12, 28)
  const encrypted = data.slice(28)
  const key = getKeyBuffer()
  const decipher = crypto.createDecipheriv(ALGO, key, iv)
  decipher.setAuthTag(tag)
  const out = Buffer.concat([decipher.update(encrypted), decipher.final()])
  return out.toString('utf8')
}

module.exports = { encryptKey, decryptKey }
