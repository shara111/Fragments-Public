const request = require('supertest');
const app = require('../../src/app');

describe('DELETE /v1/fragments/:id', () => {
  const testUser = 'user1@email.com';
  const testPassword = 'password1';
  const testData = 'Hello, World!';

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
        .delete(`/v1/fragments/${fragmentId}`);

      expect(response.status).toBe(401);
    });

    test('incorrect credentials are denied', async () => {
      const response = await request(app)
        .delete(`/v1/fragments/${fragmentId}`)
        .auth('wrong', 'credentials');

      expect(response.status).toBe(401);
    });

    test('authenticated users can delete fragments', async () => {
      const response = await request(app)
        .delete(`/v1/fragments/${fragmentId}`)
        .auth(testUser, testPassword);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('ok');
      expect(response.body.message).toBe('Fragment deleted successfully');
    });
  });

  describe('Fragment existence', () => {
    test('returns 404 for non-existent fragment', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';
      const response = await request(app)
        .delete(`/v1/fragments/${nonExistentId}`)
        .auth(testUser, testPassword);

      expect(response.status).toBe(404);
      expect(response.body.error.message).toBe('Fragment not found');
    });
  });

  describe('Fragment deletion', () => {
    test('deletes fragment successfully', async () => {
      const response = await request(app)
        .delete(`/v1/fragments/${fragmentId}`)
        .auth(testUser, testPassword);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('ok');
      expect(response.body.message).toBe('Fragment deleted successfully');
    });

    test('deleted fragment cannot be retrieved', async () => {
      // Delete the fragment
      const deleteResponse = await request(app)
        .delete(`/v1/fragments/${fragmentId}`)
        .auth(testUser, testPassword);

      expect(deleteResponse.status).toBe(200);

      // Try to retrieve the deleted fragment
      const getResponse = await request(app)
        .get(`/v1/fragments/${fragmentId}`)
        .auth(testUser, testPassword);

      expect(getResponse.status).toBe(404);
    });

    test('deleted fragment metadata cannot be retrieved', async () => {
      // Delete the fragment
      const deleteResponse = await request(app)
        .delete(`/v1/fragments/${fragmentId}`)
        .auth(testUser, testPassword);

      expect(deleteResponse.status).toBe(200);

      // Try to get fragment info
      const infoResponse = await request(app)
        .get(`/v1/fragments/${fragmentId}/info`)
        .auth(testUser, testPassword);

      expect(infoResponse.status).toBe(404);
    });

    test('deleted fragment does not appear in list', async () => {
      // Delete the fragment
      const deleteResponse = await request(app)
        .delete(`/v1/fragments/${fragmentId}`)
        .auth(testUser, testPassword);

      expect(deleteResponse.status).toBe(200);

      // Get all fragments
      const listResponse = await request(app)
        .get('/v1/fragments')
        .auth(testUser, testPassword);

      expect(listResponse.status).toBe(200);
      const fragmentIds = listResponse.body.fragments.map(f => f.id);
      expect(fragmentIds).not.toContain(fragmentId);
    });
  });

  describe('Fragment isolation', () => {
    test('users cannot delete other users fragments', async () => {
      const otherUser = 'user2@email.com';
      const otherPassword = 'password2';

      // Create a fragment as another user
      const createResponse = await request(app)
        .post('/v1/fragments')
        .auth(otherUser, otherPassword)
        .set('Content-Type', 'text/plain')
        .send('Other user data');

      expect(createResponse.status).toBe(201);
      const otherFragmentId = createResponse.body.fragment.id;

      // Try to delete it as the first user
      const deleteResponse = await request(app)
        .delete(`/v1/fragments/${otherFragmentId}`)
        .auth(testUser, testPassword);

      expect(deleteResponse.status).toBe(404);
    });
  });

  describe('Multiple fragment types', () => {
    test('can delete text fragment', async () => {
      const createResponse = await request(app)
        .post('/v1/fragments')
        .auth(testUser, testPassword)
        .set('Content-Type', 'text/plain')
        .send('Test text');

      const id = createResponse.body.fragment.id;
      const deleteResponse = await request(app)
        .delete(`/v1/fragments/${id}`)
        .auth(testUser, testPassword);

      expect(deleteResponse.status).toBe(200);
    });

    test('can delete JSON fragment', async () => {
      const jsonData = { key: 'value' };
      const createResponse = await request(app)
        .post('/v1/fragments')
        .auth(testUser, testPassword)
        .set('Content-Type', 'application/json')
        .send(JSON.stringify(jsonData));

      const id = createResponse.body.fragment.id;
      const deleteResponse = await request(app)
        .delete(`/v1/fragments/${id}`)
        .auth(testUser, testPassword);

      expect(deleteResponse.status).toBe(200);
    });

    test('can delete image fragment', async () => {
      // Create a small PNG image (1x1 pixel)
      const pngBuffer = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        'base64'
      );

      const createResponse = await request(app)
        .post('/v1/fragments')
        .auth(testUser, testPassword)
        .set('Content-Type', 'image/png')
        .send(pngBuffer);

      const id = createResponse.body.fragment.id;
      const deleteResponse = await request(app)
        .delete(`/v1/fragments/${id}`)
        .auth(testUser, testPassword);

      expect(deleteResponse.status).toBe(200);
    });
  });

  describe('Edge cases', () => {
    test('handles missing fragment ID gracefully', async () => {
      // This tests the case where fragmentId might be undefined or empty
      // In Express, this shouldn't happen with proper routing, but we test it anyway
      const response = await request(app)
        .delete('/v1/fragments/')
        .auth(testUser, testPassword);

      // Should return 404 (route not found) or 400 (bad request)
      expect([400, 404]).toContain(response.status);
    });

    test('handles error in Fragment.byId gracefully', async () => {
      // Use a malformed UUID that might cause an error
      const response = await request(app)
        .delete('/v1/fragments/invalid-uuid-format')
        .auth(testUser, testPassword);

      // Should return 404 for fragment not found
      expect(response.status).toBe(404);
      expect(response.body.error.message).toBe('Fragment not found');
    });

    test('can delete HTML fragment', async () => {
      const htmlData = '<h1>Test</h1><p>Content</p>';
      const createResponse = await request(app)
        .post('/v1/fragments')
        .auth(testUser, testPassword)
        .set('Content-Type', 'text/html')
        .send(htmlData);

      const id = createResponse.body.fragment.id;
      const deleteResponse = await request(app)
        .delete(`/v1/fragments/${id}`)
        .auth(testUser, testPassword);

      expect(deleteResponse.status).toBe(200);
    });

    test('can delete YAML fragment', async () => {
      const yamlData = 'name: John\nage: 30';
      const createResponse = await request(app)
        .post('/v1/fragments')
        .auth(testUser, testPassword)
        .set('Content-Type', 'application/yaml')
        .send(yamlData);

      const id = createResponse.body.fragment.id;
      const deleteResponse = await request(app)
        .delete(`/v1/fragments/${id}`)
        .auth(testUser, testPassword);

      expect(deleteResponse.status).toBe(200);
    });

    test('can delete CSV fragment', async () => {
      const csvData = 'name,age\nJohn,30';
      const createResponse = await request(app)
        .post('/v1/fragments')
        .auth(testUser, testPassword)
        .set('Content-Type', 'text/csv')
        .send(csvData);

      const id = createResponse.body.fragment.id;
      const deleteResponse = await request(app)
        .delete(`/v1/fragments/${id}`)
        .auth(testUser, testPassword);

      expect(deleteResponse.status).toBe(200);
    });

    test('can delete WebP image fragment', async () => {
      const webpBuffer = Buffer.from(
        'UklGRiQAAABXRUJQVlA4IBgAAAAwAQCdASoBAAEAAwA0JaQAA3AA/vuUAAA=',
        'base64'
      );

      const createResponse = await request(app)
        .post('/v1/fragments')
        .auth(testUser, testPassword)
        .set('Content-Type', 'image/webp')
        .send(webpBuffer);

      const id = createResponse.body.fragment.id;
      const deleteResponse = await request(app)
        .delete(`/v1/fragments/${id}`)
        .auth(testUser, testPassword);

      expect(deleteResponse.status).toBe(200);
    });
  });
});

