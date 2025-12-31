// tests/unit/get.test.js

const request = require('supertest');

const app = require('../../src/app');

describe('GET /v1/fragments', () => {
  // If the request is missing the Authorization header, it should be forbidden
  test('unauthenticated requests are denied', () => request(app).get('/v1/fragments').expect(401));

  // If the wrong username/password pair are used (no such user), it should be forbidden
  test('incorrect credentials are denied', () =>
    request(app).get('/v1/fragments').auth('invalid@email.com', 'incorrect_password').expect(401));

  // Using a valid username/password pair should give a success result with a .fragments array
  test('authenticated users get a fragments array', async () => {
    const res = await request(app).get('/v1/fragments').auth('user1@email.com', 'password1');
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(Array.isArray(res.body.fragments)).toBe(true);
  });

  // Test expand parameter functionality
  test('GET /fragments without expand parameter returns basic fragment info', async () => {
    const res = await request(app).get('/v1/fragments').auth('user1@email.com', 'password1');
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(Array.isArray(res.body.fragments)).toBe(true);
    
    // Without expand, fragments should have basic properties
    if (res.body.fragments.length > 0) {
      const fragment = res.body.fragments[0];
      expect(fragment).toHaveProperty('id');
      expect(fragment).toHaveProperty('ownerId');
      expect(fragment).toHaveProperty('created');
      expect(fragment).toHaveProperty('updated');
      expect(fragment).toHaveProperty('type');
      expect(fragment).toHaveProperty('size');
    }
  });

  test('GET /fragments with expand=1 returns expanded fragment metadata', async () => {
    const res = await request(app).get('/v1/fragments?expand=1').auth('user1@email.com', 'password1');
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(Array.isArray(res.body.fragments)).toBe(true);
    
    // With expand=1, fragments should have expanded metadata
    if (res.body.fragments.length > 0) {
      const fragment = res.body.fragments[0];
      expect(fragment).toHaveProperty('id');
      expect(fragment).toHaveProperty('ownerId');
      expect(fragment).toHaveProperty('created');
      expect(fragment).toHaveProperty('updated');
      expect(fragment).toHaveProperty('type');
      expect(fragment).toHaveProperty('size');
    }
  });

  test('GET /fragments with expand=true also works', async () => {
    const res = await request(app).get('/v1/fragments?expand=true').auth('user1@email.com', 'password1');
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(Array.isArray(res.body.fragments)).toBe(true);
  });

  test('GET /fragments with expand=false returns basic fragment info', async () => {
    const res = await request(app).get('/v1/fragments?expand=false').auth('user1@email.com', 'password1');
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(Array.isArray(res.body.fragments)).toBe(true);
  });

  // TODO: we'll need to add tests to check the contents of the fragments array later
});