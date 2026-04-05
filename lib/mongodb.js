const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.warn('No MONGODB_URI set in environment; DB disabled.');
}

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function connect() {
  if (cached.conn) {
    console.log('[mongodb] Using cached connection');
    return cached.conn;
  }

  if (!MONGODB_URI) {
    console.warn('[mongodb] Missing MONGODB_URI, skipping connection');
    return null;
  }

  if (!cached.promise) {
    const opts = { bufferCommands: false };
    console.log('[mongodb] Opening connection to', MONGODB_URI);
    cached.promise = mongoose
      .connect(MONGODB_URI, opts)
      .then((mongooseInstance) => {
        console.log('[mongodb] Connection established');
        return mongooseInstance;
      })
      .catch((error) => {
        console.error('[mongodb] Connection failed:', error.message);
        cached.promise = null;
        throw error;
      });
  }
  cached.conn = await cached.promise;
  return cached.conn;
}

module.exports = { connect };
