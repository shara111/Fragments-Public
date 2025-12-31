// src/tests/unit/get-by-id-info.test.js
const request = require('supertest');
const app = require('../../src/app');
const hash = require('../../src/hash');

describe('GET /v1/fragments/:id/info', () => {
  const testUser = 'user1@email.com';
  const testPassword = 'password1';
  const testUserHashed = hash(testUser);
  const testData = 'Hello, World!';

  //Authentication tests
  test('Unauthenticated requests are denied', () =>
    request(app).get('/v1/fragments/some-id/info').expect(401));

  test('Incorrect credentials are denied', () =>
    request(app)
      .get('/v1/fragments/some-id/info')
      .auth('invalid@email.com', 'incorrect_password')
      .expect(401));

  //Success case - get fragment data
  test('Authenticated user can get fragment data', async () => {
    //First create the fragment
    const createRes = await request(app)
      .post('/v1/fragments')
      .auth(testUser, testPassword)
      .set('Content-Type', 'text/plain')
      .send(testData);
    expect(createRes.status).toBe(201);
    const fragmentId = createRes.body.fragment.id;

    //Then we get its metadata
    const res = await request(app)
      .get(`/v1/fragments/${fragmentId}/info`)
      .auth(testUser, testPassword);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.fragment).toBeDefined();
    expect(res.body.fragment.id).toBe(fragmentId);
    expect(res.body.fragment.ownerId).toBe(testUserHashed);
    expect(res.body.fragment.type).toBe('text/plain');
    expect(res.body.fragment.size).toBe(Buffer.from(testData, 'utf8').length);
  });
    //404 case - fragment not found
    test('returns 404 for non-existent fragment', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';
      const res = await request(app)
        .get(`/v1/fragments/${nonExistentId}/info`)
        .auth(testUser, testPassword);

      expect(res.statusCode).toBe(404);
      expect(res.body.status).toBe('error');
      expect(res.body.error.message).toBe('Fragment not found');
    });
    // User isolation - can't access another user's fragment
    test('users cannot access fragments belonging to other users', async () => {
      // Create fragment as user2
      const createRes = await request(app)
        .post('/v1/fragments')
        .auth('user2@email.com', 'password2')
        .set('Content-Type', 'text/plain')
        .send('User 2 data');

      expect(createRes.status).toBe(201);
      const user2FragmentId = createRes.body.fragment.id;

      // Try to access it as user1 (should fail)
      const res = await request(app)
        .get(`/v1/fragments/${user2FragmentId}/info`)
        .auth(testUser, testPassword);

      expect(res.statusCode).toBe(404);
      expect(res.body.error.message).toBe('Fragment not found');
    });
  });
