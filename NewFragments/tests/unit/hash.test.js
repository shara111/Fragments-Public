const hash = require('../../src/hash');

describe('hash()', () => {
  const email = 'user1@example.com';

  test('email addresses should get hashed using sha256 to hex strings', () => {
    const hashedEmail = 'b36a83701f1c3191e19722d6f90274bc1b5501fe69ebf33313e440fe4b0fe210';
    expect(hash(email)).toEqual(hashedEmail);
  });

  test('hashing should always return the same value for a given string', () => {
    const email = 'user1@example.com';
    expect(hash(email)).toEqual(hash(email));
  });

  test('different emails should produce different hashes', () => {
    const email1 = 'user1@example.com';
    const email2 = 'user2@example.com';
    expect(hash(email1)).not.toEqual(hash(email2));
  });

  test('empty string should produce a valid hash', () => {
    const emptyHash = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
    expect(hash('')).toEqual(emptyHash);
  });

  test('hash should be deterministic for same input', () => {
    const email = 'test@example.com';
    const hash1 = hash(email);
    const hash2 = hash(email);
    const hash3 = hash(email);
    
    expect(hash1).toEqual(hash2);
    expect(hash2).toEqual(hash3);
    expect(hash1).toEqual(hash3);
  });

  test('hash should be case sensitive', () => {
    const email1 = 'User@Example.com';
    const email2 = 'user@example.com';
    expect(hash(email1)).not.toEqual(hash(email2));
  });

  test('hash should produce 64 character hex string', () => {
    const email = 'test@example.com';
    const hashed = hash(email);
    expect(hashed).toMatch(/^[0-9a-f]{64}$/);
  });
});
