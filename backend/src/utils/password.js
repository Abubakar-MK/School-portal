// Password hashing using Node's built-in crypto.scrypt.
// Deliberately avoids an external bcrypt dependency (native build issues
// are a common source of failed `npm install` on Windows/shared hosts).
// scrypt is a modern, memory-hard KDF and is a solid production choice.

const crypto = require('crypto');

const KEY_LENGTH = 64;

function hashPassword(plainPassword) {
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto.scryptSync(plainPassword, salt, KEY_LENGTH);
  return `${salt}:${derivedKey.toString('hex')}`;
}

function verifyPassword(plainPassword, storedHash) {
  if (!storedHash || !storedHash.includes(':')) return false;
  const [salt, key] = storedHash.split(':');
  const keyBuffer = Buffer.from(key, 'hex');
  const derivedKey = crypto.scryptSync(plainPassword, salt, KEY_LENGTH);
  // timing-safe comparison
  if (keyBuffer.length !== derivedKey.length) return false;
  return crypto.timingSafeEqual(keyBuffer, derivedKey);
}

module.exports = { hashPassword, verifyPassword };
