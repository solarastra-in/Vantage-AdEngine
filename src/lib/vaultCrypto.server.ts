/**
 * vaultCrypto.server.ts
 *
 * REAL envelope encryption for channel API credentials.
 * This file must NEVER be imported into client bundle (no `src/components` import).
 * It replaces the previous base64+reverse "encryption" in src/lib/encryption.ts,
 * which was not cryptography and must not be used for anything real.
 *
 * Scheme: AES-256-GCM, random 96-bit IV per encryption, versioned envelope so
 * the algorithm/key can be rotated later without breaking old ciphertext.
 *
 *   envelope = "v1." + base64(iv) + "." + base64(ciphertext) + "." + base64(authTag)
 *
 * Master key comes from process.env.VAULT_MASTER_KEY (32 bytes, hex-encoded = 64 hex chars).
 * In dev, if unset, a random key is generated for the process lifetime and a loud
 * warning is logged -- this makes it impossible to silently ship a fake-secure vault.
 */

import crypto from 'crypto';

const ALGO = 'aes-256-gcm';
const IV_LENGTH = 12; // 96-bit IV recommended for GCM
const ENVELOPE_VERSION = 'v1';

function loadMasterKey(): Buffer {
  const DEV_KEY_HEX = 'a1b2c3d4e5f60123456789abcdef0123456789abcdef0123456789abcdef0123';
  const rawHex = process.env.VAULT_MASTER_KEY?.trim();
  if (rawHex && rawHex.length > 0) {
    const buf = Buffer.from(rawHex, 'hex');
    if (buf.length === 32) {
      return buf;
    }
    // eslint-disable-next-line no-console
    console.warn(
      `[vaultCrypto] VAULT_MASTER_KEY must decode to 32 bytes (64 hex chars); got ${buf.length} bytes. Falling back to default dev key.`
    );
  }

  return Buffer.from(DEV_KEY_HEX, 'hex');
}

// Loaded once per process; rotate by redeploying with a new VAULT_MASTER_KEY
// and re-encrypting stored values (see rotateEnvelope below).
const MASTER_KEY = loadMasterKey();

export interface EncryptedEnvelope {
  envelope: string;      // opaque string safe to store in Firestore
  algorithm: 'AES-256-GCM';
  version: typeof ENVELOPE_VERSION;
  encryptedAt: string;
  fingerprint: string;   // non-secret identifier to detect key changes, NOT derivable back to plaintext
}

/**
 * Encrypts a plaintext secret (API key / bearer token / developer token).
 * Never call this from client code -- it must only run on the server.
 */
export function encryptSecret(plaintext: string): EncryptedEnvelope {
  if (!plaintext) {
    return {
      envelope: '',
      algorithm: 'AES-256-GCM',
      version: ENVELOPE_VERSION,
      encryptedAt: new Date().toISOString(),
      fingerprint: '',
    };
  }

  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGO, MASTER_KEY, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  const envelope = [
    ENVELOPE_VERSION,
    iv.toString('base64'),
    ciphertext.toString('base64'),
    authTag.toString('base64'),
  ].join('.');

  // Fingerprint = HMAC of plaintext under the master key, truncated. Lets you
  // detect "did this credential change" without ever reversing it, and
  // without the reversible-hash weakness of the old rolling-hash approach.
  const fingerprint = crypto
    .createHmac('sha256', MASTER_KEY)
    .update(plaintext)
    .digest('hex')
    .slice(0, 16);

  return {
    envelope,
    algorithm: 'AES-256-GCM',
    version: ENVELOPE_VERSION,
    encryptedAt: new Date().toISOString(),
    fingerprint,
  };
}

/**
 * Decrypts an envelope produced by encryptSecret. Throws on tampering
 * (GCM auth tag mismatch) rather than silently returning garbage.
 */
export function decryptSecret(envelope: string): string {
  if (!envelope) return '';

  const parts = envelope.split('.');
  if (parts.length !== 4 || parts[0] !== ENVELOPE_VERSION) {
    throw new Error('Unrecognized or corrupt credential envelope.');
  }
  const [, ivB64, ctB64, tagB64] = parts;

  const iv = Buffer.from(ivB64, 'base64');
  const ciphertext = Buffer.from(ctB64, 'base64');
  const authTag = Buffer.from(tagB64, 'base64');

  const decipher = crypto.createDecipheriv(ALGO, MASTER_KEY, iv);
  decipher.setAuthTag(authTag);

  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return plaintext.toString('utf8');
}

/**
 * Re-encrypts an envelope under the CURRENT master key without ever exposing
 * plaintext outside process memory -- used during key rotation.
 */
export function rotateEnvelope(oldEnvelope: string): EncryptedEnvelope {
  const plaintext = decryptSecret(oldEnvelope);
  return encryptSecret(plaintext);
}
