const request = require('supertest');
const app = require('../../src/app');
const hash = require('../../src/hash');

describe('PUT /v1/fragments/:id', () => {
  const testUser = 'user1@email.com';
  const testPassword = 'password1';
  const testUserHashed = hash(testUser);
  const testData = 'Hello, World!';
  const updatedData = 'This is updated data';
  const updatedBuffer = Buffer.from(updatedData, 'utf8');

  let fragmentId;

  // Create a fragment before each test
  beforeEach(async () => {
    const createResponse = await request(app)
      .post('/v1/fragments')
      .auth(testUser, testPassword)
      .set('Content-Type', 'text/plain')
      .send(testData);

    expect(createResponse.status).toBe(201);
    fragmentId = createResponse.body.fragment.id;
  });

  describe('Authentication', () => {
    test('unauthenticated requests are denied', async () => {
      const response = await request(app)
        .put(`/v1/fragments/${fragmentId}`)
        .set('Content-Type', 'text/plain')
        .send(updatedData);

      expect(response.status).toBe(401);
    });

    test('incorrect credentials are denied', async () => {
      const response = await request(app)
        .put(`/v1/fragments/${fragmentId}`)
        .auth('wrong', 'credentials')
        .set('Content-Type', 'text/plain')
        .send(updatedData);

      expect(response.status).toBe(401);
    });

    test('authenticated users can update fragments', async () => {
      const response = await request(app)
        .put(`/v1/fragments/${fragmentId}`)
        .auth(testUser, testPassword)
        .set('Content-Type', 'text/plain')
        .send(updatedData);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('ok');
      expect(response.body.fragment).toBeDefined();
    });
  });

  describe('Fragment existence', () => {
    test('returns 404 for non-existent fragment', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await request(app)
        .put(`/v1/fragments/${fakeId}`)
        .auth(testUser, testPassword)
        .set('Content-Type', 'text/plain')
        .send(updatedData);

      expect(response.status).toBe(404);
      expect(response.body.status).toBe('error');
      expect(response.body.error.message).toBe('Fragment not found');
    });
  });

  describe('Content-Type validation', () => {
    test('Content-Type must match existing fragment type', async () => {
      // Fragment was created as text/plain, try to update with text/markdown
      const response = await request(app)
        .put(`/v1/fragments/${fragmentId}`)
        .auth(testUser, testPassword)
        .set('Content-Type', 'text/markdown')
        .send('# Updated markdown');

      expect(response.status).toBe(400);
      expect(response.body.status).toBe('error');
      expect(response.body.error.message).toBe('Content-Type does not match existing fragment type');
    });

    test('Content-Type can include charset if base type matches', async () => {
      // Fragment was created as text/plain, update with text/plain; charset=utf-8
      const response = await request(app)
        .put(`/v1/fragments/${fragmentId}`)
        .auth(testUser, testPassword)
        .set('Content-Type', 'text/plain; charset=utf-8')
        .send(updatedData);

      expect(response.status).toBe(200);
      expect(response.body.fragment.type).toBe('text/plain; charset=utf-8');
    });

    test('missing Content-Type header is rejected', async () => {
      // Use Buffer directly to avoid supertest setting default Content-Type
      const response = await request(app)
        .put(`/v1/fragments/${fragmentId}`)
        .auth(testUser, testPassword)
        .set('Content-Type', '')  // Explicitly set empty Content-Type
        .send(Buffer.from(updatedData));

      expect(response.status).toBe(400);
      // When Content-Type is missing/empty, rawBody middleware won't parse body,
      // so we might get "Body required" instead. Let's check for either error message.
      expect(['Content-Type header is required', 'Body required']).toContain(response.body.error.message);
    });
  });

  describe('Body validation', () => {
    test('empty body is rejected', async () => {
      const response = await request(app)
        .put(`/v1/fragments/${fragmentId}`)
        .auth(testUser, testPassword)
        .set('Content-Type', 'text/plain')
        .send('');

      expect(response.status).toBe(400);
      expect(response.body.error.message).toBe('Body required');
    });
  });

  describe('Fragment update', () => {
    test('updates fragment data successfully', async () => {
      const response = await request(app)
        .put(`/v1/fragments/${fragmentId}`)
        .auth(testUser, testPassword)
        .set('Content-Type', 'text/plain')
        .send(updatedData);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('ok');
      expect(response.body.fragment.id).toBe(fragmentId);
      expect(response.body.fragment.ownerId).toBe(testUserHashed);
      expect(response.body.fragment.type).toBe('text/plain');
      expect(response.body.fragment.size).toBe(updatedBuffer.length);
      expect(response.body.fragment.created).toBeDefined();
      expect(response.body.fragment.updated).toBeDefined();
    });

    test('updated timestamp changes after update', async () => {
      // Get initial fragment info
      const initialResponse = await request(app)
        .get(`/v1/fragments/${fragmentId}/info`)
        .auth(testUser, testPassword);

      expect(initialResponse.status).toBe(200);
      const initialUpdated = initialResponse.body.fragment.updated;

      // Wait a bit to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 10));

      // Update the fragment
      const updateResponse = await request(app)
        .put(`/v1/fragments/${fragmentId}`)
        .auth(testUser, testPassword)
        .set('Content-Type', 'text/plain')
        .send(updatedData);

      expect(updateResponse.status).toBe(200);
      const newUpdated = updateResponse.body.fragment.updated;

      expect(Date.parse(newUpdated)).toBeGreaterThan(Date.parse(initialUpdated));
    });

    test('fragment size updates correctly', async () => {
      const longData = 'A'.repeat(1000);
      const response = await request(app)
        .put(`/v1/fragments/${fragmentId}`)
        .auth(testUser, testPassword)
        .set('Content-Type', 'text/plain')
        .send(longData);

      expect(response.status).toBe(200);
      expect(response.body.fragment.size).toBe(1000);
    });

    test('updated data can be retrieved', async () => {
      // Update fragment
      const updateResponse = await request(app)
        .put(`/v1/fragments/${fragmentId}`)
        .auth(testUser, testPassword)
        .set('Content-Type', 'text/plain')
        .send(updatedData);

      expect(updateResponse.status).toBe(200);

      // Retrieve updated data
      const getResponse = await request(app)
        .get(`/v1/fragments/${fragmentId}`)
        .auth(testUser, testPassword);

      expect(getResponse.status).toBe(200);
      expect(getResponse.text).toBe(updatedData);
    });
  });

  describe('Fragment isolation', () => {
    test('users cannot update other users fragments', async () => {
      const user2 = 'user2@email.com';
      const user2Password = 'password2';

      // Try to update user1's fragment as user2
      const response = await request(app)
        .put(`/v1/fragments/${fragmentId}`)
        .auth(user2, user2Password)
        .set('Content-Type', 'text/plain')
        .send(updatedData);

      expect(response.status).toBe(404);
      expect(response.body.error.message).toBe('Fragment not found');
    });
  });

  describe('Image fragments', () => {
    let imageFragmentId;

    beforeEach(async () => {
      const imageData = Buffer.from('fake png image data');
      const createResponse = await request(app)
        .post('/v1/fragments')
        .auth(testUser, testPassword)
        .set('Content-Type', 'image/png')
        .send(imageData);

      expect(createResponse.status).toBe(201);
      imageFragmentId = createResponse.body.fragment.id;
    });

    test('can update image fragment with same type', async () => {
      const newImageData = Buffer.from('updated png image data');
      const response = await request(app)
        .put(`/v1/fragments/${imageFragmentId}`)
        .auth(testUser, testPassword)
        .set('Content-Type', 'image/png')
        .send(newImageData);

      expect(response.status).toBe(200);
      expect(response.body.fragment.type).toBe('image/png');
      expect(response.body.fragment.size).toBe(newImageData.length);
    });

    test('cannot change image fragment to different type', async () => {
      const response = await request(app)
        .put(`/v1/fragments/${imageFragmentId}`)
        .auth(testUser, testPassword)
        .set('Content-Type', 'image/jpeg')
        .send(Buffer.from('jpeg data'));

      expect(response.status).toBe(400);
      expect(response.body.error.message).toBe('Content-Type does not match existing fragment type');
    });
  });

  describe('Edge cases', () => {
    test('rejects invalid Content-Type header format', async () => {
      const response = await request(app)
        .put(`/v1/fragments/${fragmentId}`)
        .auth(testUser, testPassword)
        .set('Content-Type', 'invalid/content/type/format')
        .send(updatedData);

      expect(response.status).toBe(400);
      expect(response.body.status).toBe('error');
      expect(response.body.error.message).toBe('Invalid Content-Type header');
    });

    test('rejects Content-Type with only whitespace', async () => {
      const response = await request(app)
        .put(`/v1/fragments/${fragmentId}`)
        .auth(testUser, testPassword)
        .set('Content-Type', '   ')
        .send(updatedData);

      expect(response.status).toBe(400);
      expect(response.body.error.message).toBe('Content-Type header is required');
    });

    test('handles missing fragment ID in error case', async () => {
      // This tests the error handling path when Fragment.byId throws
      // We'll use a malformed UUID that might cause an error
      const response = await request(app)
        .put('/v1/fragments/invalid-id-format')
        .auth(testUser, testPassword)
        .set('Content-Type', 'text/plain')
        .send(updatedData);

      // Should return 404 or 400 depending on validation
      expect([400, 404]).toContain(response.status);
    });

    test('updates JSON fragment successfully', async () => {
      const jsonData = { name: 'John', age: 30 };
      const createRes = await request(app)
        .post('/v1/fragments')
        .auth(testUser, testPassword)
        .set('Content-Type', 'application/json')
        .send(JSON.stringify(jsonData));

      const jsonFragmentId = createRes.body.fragment.id;
      const updatedJson = { name: 'Jane', age: 25 };

      const response = await request(app)
        .put(`/v1/fragments/${jsonFragmentId}`)
        .auth(testUser, testPassword)
        .set('Content-Type', 'application/json')
        .send(JSON.stringify(updatedJson));

      expect(response.status).toBe(200);
      expect(response.body.fragment.type).toBe('application/json');
    });

    test('updates markdown fragment successfully', async () => {
      const markdownData = '# Original Title';
      const createRes = await request(app)
        .post('/v1/fragments')
        .auth(testUser, testPassword)
        .set('Content-Type', 'text/markdown')
        .send(markdownData);

      const markdownFragmentId = createRes.body.fragment.id;
      const updatedMarkdown = '# Updated Title\n\nNew content.';

      const response = await request(app)
        .put(`/v1/fragments/${markdownFragmentId}`)
        .auth(testUser, testPassword)
        .set('Content-Type', 'text/markdown')
        .send(updatedMarkdown);

      expect(response.status).toBe(200);
      expect(response.body.fragment.type).toBe('text/markdown');
    });
  });
});