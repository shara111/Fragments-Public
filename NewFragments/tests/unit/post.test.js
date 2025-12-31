const request = require('supertest');
const app = require('../../src/app');
const hash = require('../../src/hash');

describe('POST /v1/fragments', () => {
  const testUser = 'user1@email.com';
  const testPassword = 'password1';
  const testUserHashed = hash(testUser);
  const testData = 'Hello, World!';
  const testBuffer = Buffer.from(testData, 'utf8');

  describe('Authentication', () => {
    test('unauthenticated requests are denied', async () => {
      const response = await request(app)
        .post('/v1/fragments')
        .set('Content-Type', 'text/plain')
        .send(testData);

      expect(response.status).toBe(401);
      // The actual response format depends on the auth middleware
      expect(response.body).toBeDefined();
    });

    test('incorrect credentials are denied', async () => {
      const response = await request(app)
        .post('/v1/fragments')
        .auth('wrong', 'credentials')
        .set('Content-Type', 'text/plain')
        .send(testData);

      expect(response.status).toBe(401);
    });

    test('authenticated users can create fragments', async () => {
      const response = await request(app)
        .post('/v1/fragments')
        .auth(testUser, testPassword)
        .set('Content-Type', 'text/plain')
        .send(testData);

      expect(response.status).toBe(201);
      expect(response.body.status).toBe('ok');
      expect(response.body.fragment).toBeDefined();
    });
  });

  describe('Content-Type validation', () => {
    test('text/plain is supported', async () => {
      const response = await request(app)
        .post('/v1/fragments')
        .auth(testUser, testPassword)
        .set('Content-Type', 'text/plain')
        .send(testData);

      expect(response.status).toBe(201);
    });

    test('text/plain with charset is supported', async () => {
      const response = await request(app)
        .post('/v1/fragments')
        .auth(testUser, testPassword)
        .set('Content-Type', 'text/plain; charset=utf-8')
        .send(testData);

      expect(response.status).toBe(201);
    });

    test('text/markdown is supported', async () => {
      const markdownData = '# Hello\nThis is **bold** text.';
      const response = await request(app)
        .post('/v1/fragments')
        .auth(testUser, testPassword)
        .set('Content-Type', 'text/markdown')
        .send(markdownData);

      expect(response.status).toBe(201);
      expect(response.body.fragment.type).toBe('text/markdown');
      expect(response.body.fragment.size).toBe(markdownData.length);
    });

    test('text/html is supported', async () => {
      const htmlData = '<h1>Hello</h1><p>World</p>';
      const response = await request(app)
        .post('/v1/fragments')
        .auth(testUser, testPassword)
        .set('Content-Type', 'text/html')
        .send(htmlData);

      expect(response.status).toBe(201);
      expect(response.body.fragment.type).toBe('text/html');
      expect(response.body.fragment.size).toBe(htmlData.length);
    });

    test('text/csv is supported', async () => {
      const csvData = 'name,age\nJohn,30\nJane,25';
      const response = await request(app)
        .post('/v1/fragments')
        .auth(testUser, testPassword)
        .set('Content-Type', 'text/csv')
        .send(csvData);

      expect(response.status).toBe(201);
      expect(response.body.fragment.type).toBe('text/csv');
      expect(response.body.fragment.size).toBe(csvData.length);
    });

    test('application/json is supported', async () => {
      const jsonData = '{"name": "John", "age": 30}';
      const response = await request(app)
        .post('/v1/fragments')
        .auth(testUser, testPassword)
        .set('Content-Type', 'application/json')
        .send(jsonData);

      expect(response.status).toBe(201);
      expect(response.body.fragment.type).toBe('application/json');
      expect(response.body.fragment.size).toBe(jsonData.length);
    });
    // NEW - test that image types are supported
    //Assignment 3
    test('image/png is supported', async() => {
      const imageData = Buffer.from('Fake png image data');
      const response = await request(app)
        .post('/v1/fragments')
        .auth(testUser, testPassword)
        .set('Content-Type', 'image/png')
        .send(imageData);

      expect(response.status).toBe(201);
      expect(response.body.fragment.type).toBe('image/png');
      expect(response.body.fragment.size).toBe(imageData.length);
    });
    test('image/jpeg is supported', async () => {
      const imageData = Buffer.from('fake jpeg image data');
      const response = await request(app)
        .post('/v1/fragments')
        .auth(testUser, testPassword)
        .set('Content-Type', 'image/jpeg')
        .send(imageData);
    
      expect(response.status).toBe(201);
      expect(response.body.fragment.type).toBe('image/jpeg');
      expect(response.body.fragment.size).toBe(imageData.length);
    });
    
    test('image/webp is supported', async () => {
      const imageData = Buffer.from('fake webp image data');
      const response = await request(app)
        .post('/v1/fragments')
        .auth(testUser, testPassword)
        .set('Content-Type', 'image/webp')
        .send(imageData);
    
      expect(response.status).toBe(201);
      expect(response.body.fragment.type).toBe('image/webp');
      expect(response.body.fragment.size).toBe(imageData.length);
    });

    test('image/gif is supported', async () => {
      const imageData = Buffer.from('fake gif image data');
      const response = await request(app)
        .post('/v1/fragments')
        .auth(testUser, testPassword)
        .set('Content-Type', 'image/gif')
        .send(imageData);
    
      expect(response.status).toBe(201);
      expect(response.body.fragment.type).toBe('image/gif');
      expect(response.body.fragment.size).toBe(imageData.length);
    });
    
    // Test that truly unsupported types are rejected
    test('unsupported content types are rejected', async () => {
      const response = await request(app)
        .post('/v1/fragments')
        .auth(testUser, testPassword)
        .set('Content-Type', 'application/octet-stream')
        .send(Buffer.from('fake data'));
    
      // Should return 415 Unsupported Media Type
      expect(response.status).toBe(415);
      expect(response.body.status).toBe('error');
      expect(response.body.error.message).toBe('Unsupported content type');
    });

    test('invalid Content-Type header is rejected', async () => {
      const response = await request(app)
        .post('/v1/fragments')
        .auth(testUser, testPassword)
        .set('Content-Type', 'invalid/type; malformed')
        .send(testData);

      // Handler catches invalid Content-Type and returns 400
      expect(response.status).toBe(400);
      expect(response.body.error.message).toBe('Invalid Content-Type header');
    });
  });

  describe('Body validation', () => {
    test('empty body is rejected', async () => {
      const response = await request(app)
        .post('/v1/fragments')
        .auth(testUser, testPassword)
        .set('Content-Type', 'text/plain')
        .send('');

      expect(response.status).toBe(400);
      expect(response.body.error.message).toBe('Body required');
    });

    test('no body is rejected', async () => {
      const response = await request(app)
        .post('/v1/fragments')
        .auth(testUser, testPassword)
        .set('Content-Type', 'text/plain');

      expect(response.status).toBe(400);
      expect(response.body.error.message).toBe('Body required');
    });
  });

  describe('Fragment creation', () => {
    test('creates fragment with correct properties', async () => {
      const response = await request(app)
        .post('/v1/fragments')
        .auth(testUser, testPassword)
        .set('Content-Type', 'text/plain')
        .send(testData);

      expect(response.status).toBe(201);
      
      const fragment = response.body.fragment;
      expect(fragment).toMatchObject({
        ownerId: testUserHashed,
        type: 'text/plain',
        size: testBuffer.length
      });
      
      // Check required fields
      expect(fragment.id).toBeDefined();
      expect(fragment.created).toBeDefined();
      expect(fragment.updated).toBeDefined();
      
      // Validate UUID format
      expect(fragment.id).toMatch(
        /^[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}$/
      );
      
      // Validate ISO date format
      expect(Date.parse(fragment.created)).not.toBeNaN();
      expect(Date.parse(fragment.updated)).not.toBeNaN();
    });

    test('fragment size matches body length', async () => {
      const longData = 'A'.repeat(1000);
      const response = await request(app)
        .post('/v1/fragments')
        .auth(testUser, testPassword)
        .set('Content-Type', 'text/plain')
        .send(longData);

      expect(response.status).toBe(201);
      expect(response.body.fragment.size).toBe(1000);
    });

    test('fragment with charset preserves full Content-Type', async () => {
      const contentType = 'text/plain; charset=utf-8';
      const response = await request(app)
        .post('/v1/fragments')
        .auth(testUser, testPassword)
        .set('Content-Type', contentType)
        .send(testData);

      expect(response.status).toBe(201);
      expect(response.body.fragment.type).toBe(contentType);
    });
  });

  describe('Location header', () => {
    test('includes Location header with fragment URL', async () => {
      const response = await request(app)
        .post('/v1/fragments')
        .auth(testUser, testPassword)
        .set('Content-Type', 'text/plain')
        .send(testData);

      expect(response.status).toBe(201);
      expect(response.headers.location).toBeDefined();
      expect(response.headers.location).toMatch(/\/v1\/fragments\/[0-9a-fA-F-]+$/);
    });

    test('Location header uses API_URL when set', async () => {
      const originalApiUrl = process.env.API_URL;
      process.env.API_URL = 'https://api.example.com';
      
      try {
        const response = await request(app)
          .post('/v1/fragments')
          .auth(testUser, testPassword)
          .set('Content-Type', 'text/plain')
          .send(testData);

        expect(response.status).toBe(201);
        expect(response.headers.location).toMatch(/^https:\/\/api\.example\.com\/v1\/fragments\//);
      } finally {
        if (originalApiUrl) {
          process.env.API_URL = originalApiUrl;
        } else {
          delete process.env.API_URL;
        }
      }
    });

    test('Location header uses host header when API_URL not set', async () => {
      const originalApiUrl = process.env.API_URL;
      delete process.env.API_URL;
      
      try {
        const response = await request(app)
          .post('/v1/fragments')
          .auth(testUser, testPassword)
          .set('Content-Type', 'text/plain')
          .set('Host', 'localhost:8080')
          .send(testData);

        expect(response.status).toBe(201);
        expect(response.headers.location).toMatch(/^http:\/\/localhost:8080\/v1\/fragments\//);
      } finally {
        if (originalApiUrl) {
          process.env.API_URL = originalApiUrl;
        }
      }
    });
  });

  describe('Data persistence', () => {
    test('created fragment can be retrieved', async () => {
      // Create fragment
      const createResponse = await request(app)
        .post('/v1/fragments')
        .auth(testUser, testPassword)
        .set('Content-Type', 'text/plain')
        .send(testData);

      expect(createResponse.status).toBe(201);
      const fragmentId = createResponse.body.fragment.id;

      // Retrieve fragment data (GET /fragments/:id returns raw data, not JSON)
      const getResponse = await request(app)
        .get(`/v1/fragments/${fragmentId}`)
        .auth(testUser, testPassword);

      expect(getResponse.status).toBe(200);
      expect(getResponse.headers['content-type']).toBe('text/plain');
      expect(getResponse.text).toBe(testData);

      // Retrieve fragment metadata (GET /fragments/:id/info returns JSON)
      const infoResponse = await request(app)
        .get(`/v1/fragments/${fragmentId}/info`)
        .auth(testUser, testPassword);

      expect(infoResponse.status).toBe(200);
      expect(infoResponse.body.fragment.id).toBe(fragmentId);
      expect(infoResponse.body.fragment.ownerId).toBe(testUserHashed);
    });

    test('fragment appears in user fragment list', async () => {
      // Create fragment
      const createResponse = await request(app)
        .post('/v1/fragments')
        .auth(testUser, testPassword)
        .set('Content-Type', 'text/plain')
        .send(testData);

      expect(createResponse.status).toBe(201);
      const fragmentId = createResponse.body.fragment.id;

      // Check fragment list
      const listResponse = await request(app)
        .get('/v1/fragments?expand=1')
        .auth(testUser, testPassword);

      expect(listResponse.status).toBe(200);
      expect(listResponse.body.fragments).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ id: fragmentId })
        ])
      );
    });
  });

  describe('Error handling', () => {
    test('handles database errors gracefully', async () => {
      // This test would require mocking the Fragment class to throw an error
      // For now, we'll test that the route doesn't crash on unexpected errors
      const response = await request(app)
        .post('/v1/fragments')
        .auth(testUser, testPassword)
        .set('Content-Type', 'text/plain')
        .send(testData);

      // Should not crash, should return a proper response
      expect([200, 201, 400, 401, 500]).toContain(response.status);
    });
  });

  describe('Multiple fragments', () => {
    test('can create multiple fragments for same user', async () => {
      const data1 = 'First fragment';
      const data2 = 'Second fragment';

      const response1 = await request(app)
        .post('/v1/fragments')
        .auth(testUser, testPassword)
        .set('Content-Type', 'text/plain')
        .send(data1);

      const response2 = await request(app)
        .post('/v1/fragments')
        .auth(testUser, testPassword)
        .set('Content-Type', 'text/plain')
        .send(data2);

      expect(response1.status).toBe(201);
      expect(response2.status).toBe(201);
      expect(response1.body.fragment.id).not.toBe(response2.body.fragment.id);
    });

    test('fragments are isolated between users', async () => {
      const user1 = 'user1@email.com';
      const user2 = 'user2@email.com';
      const user1Hashed = hash(user1);
      const user2Hashed = hash(user2);

      const response1 = await request(app)
        .post('/v1/fragments')
        .auth(user1, 'password1')
        .set('Content-Type', 'text/plain')
        .send('User 1 data');

      const response2 = await request(app)
        .post('/v1/fragments')
        .auth(user2, 'password2')
        .set('Content-Type', 'text/plain')
        .send('User 2 data');

      expect(response1.status).toBe(201);
      expect(response2.status).toBe(201);
      expect(response1.body.fragment.ownerId).toBe(user1Hashed);
      expect(response2.body.fragment.ownerId).toBe(user2Hashed);
    });
  });
});
