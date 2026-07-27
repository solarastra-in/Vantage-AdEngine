import {
  encryptSecret,
  decryptSecret,
  rotateEnvelope,
} from '../lib/vaultCrypto.server';

describe('vaultCrypto: AES-256-GCM authenticated encryption', () => {
  const plaintext = 'sk_live_meta_9938210192830192';

  test('encrypt and decrypt roundtrip matches original plaintext exactly', () => {
    const envelope = encryptSecret(plaintext);
    const decrypted = decryptSecret(envelope.envelope);
    expect(decrypted).toBe(plaintext);
  });

  test('envelope structure includes algorithm, version, and fingerprint metadata', () => {
    const env = encryptSecret(plaintext);
    expect(env.algorithm).toBe('AES-256-GCM');
    expect(env.version).toBe('v1');
    expect(env.envelope).toMatch(/^v1\..*\..*\..*/);
    expect(env.fingerprint).toHaveLength(16);
  });

  test('tampering with the envelope causes decryptSecret to throw an authentication failure', () => {
    const env = encryptSecret(plaintext);
    const parts = env.envelope.split('.');
    // Tamper with ciphertext part
    const tamperedCt = parts[2].slice(0, -2) + 'AA';
    const tamperedEnvelope = [parts[0], parts[1], tamperedCt, parts[3]].join('.');
    expect(() => decryptSecret(tamperedEnvelope)).toThrow();
  });

  test('tampering with the auth tag causes decryptSecret to throw an authentication failure', () => {
    const env = encryptSecret(plaintext);
    const parts = env.envelope.split('.');
    // Tamper with tag part
    const tamperedTag = parts[3].slice(0, -2) + '00';
    const tamperedEnvelope = [parts[0], parts[1], parts[2], tamperedTag].join('.');
    expect(() => decryptSecret(tamperedEnvelope)).toThrow();
  });

  test('two encryptions of the same secret produce different IVs and different envelopes (nonce uniqueness)', () => {
    const e1 = encryptSecret(plaintext);
    const e2 = encryptSecret(plaintext);
    expect(e1.envelope).not.toBe(e2.envelope);
    expect(e1.fingerprint).toBe(e2.fingerprint); // Fingerprint is deterministic HMAC
  });

  test('rotateEnvelope re-encrypts old envelope to a new envelope', () => {
    const eOld = encryptSecret(plaintext);
    const eNew = rotateEnvelope(eOld.envelope);

    expect(decryptSecret(eNew.envelope)).toBe(plaintext);
    expect(eNew.fingerprint).toBe(eOld.fingerprint);
  });
});
