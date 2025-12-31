const request = require('supertest');
const app = require('../../src/app');

describe('GET /v1/fragments/:id', () => {
  const testUser = 'user1@email.com';
  const testPassword = 'password1';
  const testData = 'Hello, World!';

  // Authentication tests
  test('unauthenticated requests are denied', () =>
    request(app).get('/v1/fragments/some-id').expect(401));

  test('incorrect credentials are denied', () =>
    request(app)
      .get('/v1/fragments/some-id')
      .auth('invalid@email.com', 'incorrect_password')
      .expect(401));

  // Success case - get fragment data without extension
  test('authenticated users can get fragment data', async () => {
    // First create a fragment
    const createRes = await request(app)
      .post('/v1/fragments')
      .auth(testUser, testPassword)
      .set('Content-Type', 'text/plain')
      .send(testData);

    expect(createRes.status).toBe(201);
    const fragmentId = createRes.body.fragment.id;

    // Then get its data
    const res = await request(app).get(`/v1/fragments/${fragmentId}`).auth(testUser, testPassword);

    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toBe('text/plain');
    expect(res.text).toBe(testData);
  });

  // Content-Type header verification
  test('returns correct Content-Type header for original type', async () => {
    const createRes = await request(app)
      .post('/v1/fragments')
      .auth(testUser, testPassword)
      .set('Content-Type', 'text/plain; charset=utf-8')
      .send(testData);

    const fragmentId = createRes.body.fragment.id;

    const res = await request(app).get(`/v1/fragments/${fragmentId}`).auth(testUser, testPassword);

    expect(res.statusCode).toBe(200);
    // Should preserve the full Content-Type including charset
    expect(res.headers['content-type']).toBe('text/plain; charset=utf-8');
  });

  // 404 case - fragment not found
  test('returns 404 for non-existent fragment', async () => {
    const nonExistentId = '00000000-0000-0000-0000-000000000000';
    const res = await request(app)
      .get(`/v1/fragments/${nonExistentId}`)
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
      .get(`/v1/fragments/${user2FragmentId}`)
      .auth(testUser, testPassword);

    expect(res.statusCode).toBe(404);
    expect(res.body.error.message).toBe('Fragment not found');
  });

  // Extension conversion tests
  test('returns 415 for unknown extension', async () => {
    const createRes = await request(app)
      .post('/v1/fragments')
      .auth(testUser, testPassword)
      .set('Content-Type', 'text/plain')
      .send(testData);

    const fragmentId = createRes.body.fragment.id;
    const res = await request(app)
      .get(`/v1/fragments/${fragmentId}.unknown`)
      .auth(testUser, testPassword);

    expect(res.statusCode).toBe(415);
    expect(res.body.status).toBe('error');
    expect(res.body.error.message).toContain('Unknown or unsupported type');
  });

  // Markdown to HTML conversion (Assignment 2 requirement)
  test('converts markdown fragment to HTML with .html extension', async () => {
    const markdownContent = '# Hello World\n\nThis is **bold** text.';
    
    // Create a markdown fragment
    const createRes = await request(app)
      .post('/v1/fragments')
      .auth(testUser, testPassword)
      .set('Content-Type', 'text/markdown')
      .send(markdownContent);

    expect(createRes.status).toBe(201);
    const fragmentId = createRes.body.fragment.id;

    // Get it as HTML using .html extension
    const res = await request(app)
      .get(`/v1/fragments/${fragmentId}.html`)
      .auth(testUser, testPassword);

    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toBe('text/html');
    expect(res.text).toContain('<h1>Hello World</h1>');
    expect(res.text).toContain('<strong>bold</strong>');
  });

  test('returns original markdown when requesting without extension', async () => {
    const markdownContent = '# Hello World\n\nThis is **bold** text.';
    
    const createRes = await request(app)
      .post('/v1/fragments')
      .auth(testUser, testPassword)
      .set('Content-Type', 'text/markdown')
      .send(markdownContent);

    const fragmentId = createRes.body.fragment.id;

    // Get it without extension - should return original markdown
    const res = await request(app)
      .get(`/v1/fragments/${fragmentId}`)
      .auth(testUser, testPassword);

    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toBe('text/markdown');
    expect(res.text).toBe(markdownContent);
  });

  // JSON to YAML conversion
  test('converts JSON fragment to YAML with .yaml extension', async () => {
    const jsonContent = JSON.stringify({ name: 'John', age: 30, city: 'New York' });
    
    const createRes = await request(app)
      .post('/v1/fragments')
      .auth(testUser, testPassword)
      .set('Content-Type', 'application/json')
      .send(jsonContent);

    expect(createRes.status).toBe(201);
    const fragmentId = createRes.body.fragment.id;

    const res = await request(app)
      .get(`/v1/fragments/${fragmentId}.yaml`)
      .auth(testUser, testPassword);

    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toBe('application/yaml');
    expect(res.text).toContain('name: John');
    expect(res.text).toContain('age: 30');
    expect(res.text).toContain('city: New York');
  });

  // YAML to JSON conversion
  test('converts YAML fragment to JSON with .json extension', async () => {
    const yamlContent = 'name: John\nage: 30\ncity: New York';
    
    const createRes = await request(app)
      .post('/v1/fragments')
      .auth(testUser, testPassword)
      .set('Content-Type', 'application/yaml')
      .send(yamlContent);

    expect(createRes.status).toBe(201);
    const fragmentId = createRes.body.fragment.id;

    const res = await request(app)
      .get(`/v1/fragments/${fragmentId}.json`)
      .auth(testUser, testPassword);

    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toBe('application/json');
    const jsonData = JSON.parse(res.text);
    expect(jsonData.name).toBe('John');
    expect(jsonData.age).toBe(30);
    expect(jsonData.city).toBe('New York');
  });

  // JSON to CSV conversion
  test('converts JSON array fragment to CSV with .csv extension', async () => {
    const jsonContent = JSON.stringify([
      { name: 'John', age: 30 },
      { name: 'Jane', age: 25 }
    ]);
    
    const createRes = await request(app)
      .post('/v1/fragments')
      .auth(testUser, testPassword)
      .set('Content-Type', 'application/json')
      .send(jsonContent);

    expect(createRes.status).toBe(201);
    const fragmentId = createRes.body.fragment.id;

    const res = await request(app)
      .get(`/v1/fragments/${fragmentId}.csv`)
      .auth(testUser, testPassword);

    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toBe('text/csv');
    expect(res.text).toContain('name,age');
    expect(res.text).toContain('John,30');
    expect(res.text).toContain('Jane,25');
  });

  // CSV to JSON conversion
  test('converts CSV fragment to JSON with .json extension', async () => {
    const csvContent = 'name,age\nJohn,30\nJane,25';
    
    const createRes = await request(app)
      .post('/v1/fragments')
      .auth(testUser, testPassword)
      .set('Content-Type', 'text/csv')
      .send(csvContent);

    expect(createRes.status).toBe(201);
    const fragmentId = createRes.body.fragment.id;

    const res = await request(app)
      .get(`/v1/fragments/${fragmentId}.json`)
      .auth(testUser, testPassword);

    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toBe('application/json');
    const jsonData = JSON.parse(res.text);
    expect(Array.isArray(jsonData)).toBe(true);
    expect(jsonData.length).toBe(2);
    expect(jsonData[0].name).toBe('John');
    expect(jsonData[0].age).toBe('30');
  });

  // HTML to Markdown conversion
  test('converts HTML fragment to Markdown with .md extension', async () => {
    const htmlContent = '<h1>Hello World</h1><p>This is <strong>bold</strong> text.</p>';
    
    const createRes = await request(app)
      .post('/v1/fragments')
      .auth(testUser, testPassword)
      .set('Content-Type', 'text/html')
      .send(htmlContent);

    expect(createRes.status).toBe(201);
    const fragmentId = createRes.body.fragment.id;

    const res = await request(app)
      .get(`/v1/fragments/${fragmentId}.md`)
      .auth(testUser, testPassword);

    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toBe('text/markdown');
    // HTML tags should be stripped
    expect(res.text).not.toContain('<h1>');
    expect(res.text).not.toContain('<p>');
  });

  // Text to HTML conversion
  test('converts plain text fragment to HTML with .html extension', async () => {
    const textContent = 'Hello World';
    
    const createRes = await request(app)
      .post('/v1/fragments')
      .auth(testUser, testPassword)
      .set('Content-Type', 'text/plain')
      .send(textContent);

    expect(createRes.status).toBe(201);
    const fragmentId = createRes.body.fragment.id;

    const res = await request(app)
      .get(`/v1/fragments/${fragmentId}.html`)
      .auth(testUser, testPassword);

    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toBe('text/html');
    expect(res.text).toBe(textContent);
  });

  // CSV with only headers to JSON conversion
  test('converts CSV fragment with only headers to empty JSON array', async () => {
    const csvContent = 'name,age';
    
    const createRes = await request(app)
      .post('/v1/fragments')
      .auth(testUser, testPassword)
      .set('Content-Type', 'text/csv')
      .send(csvContent);

    expect(createRes.status).toBe(201);
    const fragmentId = createRes.body.fragment.id;

    const res = await request(app)
      .get(`/v1/fragments/${fragmentId}.json`)
      .auth(testUser, testPassword);

    expect(res.statusCode).toBe(200);
    const jsonData = JSON.parse(res.text);
    expect(Array.isArray(jsonData)).toBe(true);
    expect(jsonData.length).toBe(0);
  });

  // Unsupported conversion - text to image
  test('returns 415 for text to image conversion', async () => {
    const createRes = await request(app)
      .post('/v1/fragments')
      .auth(testUser, testPassword)
      .set('Content-Type', 'text/plain')
      .send('Hello World');

    expect(createRes.status).toBe(201);
    const fragmentId = createRes.body.fragment.id;

    const res = await request(app)
      .get(`/v1/fragments/${fragmentId}.png`)
      .auth(testUser, testPassword);

    expect(res.statusCode).toBe(415);
    expect(res.body.status).toBe('error');
    expect(res.body.error.message).toContain('Cannot convert');
  });

  // Unsupported conversion - image to text
  test('returns 415 for image to text conversion', async () => {
    // Create a minimal valid PNG image (1x1 pixel)
    const pngBuffer = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64'
    );
    
    const createRes = await request(app)
      .post('/v1/fragments')
      .auth(testUser, testPassword)
      .set('Content-Type', 'image/png')
      .send(pngBuffer);

    expect(createRes.status).toBe(201);
    const fragmentId = createRes.body.fragment.id;

    const res = await request(app)
      .get(`/v1/fragments/${fragmentId}.txt`)
      .auth(testUser, testPassword);

    expect(res.statusCode).toBe(415);
    expect(res.body.status).toBe('error');
    expect(res.body.error.message).toContain('Cannot convert');
  });

  // Image conversion - PNG to JPEG
  test('converts PNG fragment to JPEG with .jpg extension', async () => {
    // Create a minimal valid PNG image (1x1 pixel)
    const pngBuffer = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64'
    );
    
    const createRes = await request(app)
      .post('/v1/fragments')
      .auth(testUser, testPassword)
      .set('Content-Type', 'image/png')
      .send(pngBuffer);

    expect(createRes.status).toBe(201);
    const fragmentId = createRes.body.fragment.id;

    const res = await request(app)
      .get(`/v1/fragments/${fragmentId}.jpg`)
      .auth(testUser, testPassword);

    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toBe('image/jpeg');
    // Verify it's a valid JPEG (starts with JPEG magic bytes)
    expect(Buffer.from(res.body).toString('hex', 0, 2)).toBe('ffd8');
  });

  // Image conversion - PNG to WebP (more reliable than JPEG)
  test('converts PNG fragment to WebP with .webp extension', async () => {
    // Create a minimal valid PNG image (1x1 pixel)
    const pngBuffer = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64'
    );
    
    const createRes = await request(app)
      .post('/v1/fragments')
      .auth(testUser, testPassword)
      .set('Content-Type', 'image/png')
      .send(pngBuffer);

    expect(createRes.status).toBe(201);
    const fragmentId = createRes.body.fragment.id;

    const res = await request(app)
      .get(`/v1/fragments/${fragmentId}.webp`)
      .auth(testUser, testPassword);

    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toBe('image/webp');
    // Verify it's a valid WebP (starts with WebP magic bytes: RIFF)
    expect(Buffer.from(res.body).toString('ascii', 0, 4)).toBe('RIFF');
  });

  // Image conversion - WebP to GIF
  test('converts WebP fragment to GIF with .gif extension', async () => {
    // Create a minimal valid WebP image
    const webpBuffer = Buffer.from(
      'UklGRiQAAABXRUJQVlA4IBgAAAAwAQCdASoBAAEAAwA0JaQAA3AA/vuUAAA=',
      'base64'
    );
    
    const createRes = await request(app)
      .post('/v1/fragments')
      .auth(testUser, testPassword)
      .set('Content-Type', 'image/webp')
      .send(webpBuffer);

    expect(createRes.status).toBe(201);
    const fragmentId = createRes.body.fragment.id;

    const res = await request(app)
      .get(`/v1/fragments/${fragmentId}.gif`)
      .auth(testUser, testPassword);

    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toBe('image/gif');
    // Verify it's a valid GIF (starts with GIF magic bytes)
    expect(Buffer.from(res.body).toString('ascii', 0, 3)).toBe('GIF');
  });

  // Same type conversion (no conversion needed)
  test('returns original data when requesting same type with extension', async () => {
    const jsonContent = JSON.stringify({ name: 'John', age: 30 });
    
    const createRes = await request(app)
      .post('/v1/fragments')
      .auth(testUser, testPassword)
      .set('Content-Type', 'application/json')
      .send(jsonContent);

    expect(createRes.status).toBe(201);
    const fragmentId = createRes.body.fragment.id;

    const res = await request(app)
      .get(`/v1/fragments/${fragmentId}.json`)
      .auth(testUser, testPassword);

    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toBe('application/json');
    expect(JSON.parse(res.text)).toEqual({ name: 'John', age: 30 });
  });

  // Invalid JSON in JSON to YAML conversion should handle gracefully
  test('handles invalid JSON gracefully in conversion', async () => {
    const invalidJson = '{ name: John }'; // Missing quotes
    
    const createRes = await request(app)
      .post('/v1/fragments')
      .auth(testUser, testPassword)
      .set('Content-Type', 'application/json')
      .send(invalidJson);

    expect(createRes.status).toBe(201);
    const fragmentId = createRes.body.fragment.id;

    // Try to convert to YAML - should fail gracefully
    const res = await request(app)
      .get(`/v1/fragments/${fragmentId}.yaml`)
      .auth(testUser, testPassword);

    // Should return 415 error for invalid conversion
    expect(res.statusCode).toBe(415);
    expect(res.body.status).toBe('error');
  });

  // Test .yml extension (alternative to .yaml)
  test('converts JSON fragment to YAML with .yml extension', async () => {
    const jsonContent = JSON.stringify({ name: 'John', age: 30 });
    
    const createRes = await request(app)
      .post('/v1/fragments')
      .auth(testUser, testPassword)
      .set('Content-Type', 'application/json')
      .send(jsonContent);

    expect(createRes.status).toBe(201);
    const fragmentId = createRes.body.fragment.id;

    const res = await request(app)
      .get(`/v1/fragments/${fragmentId}.yml`)
      .auth(testUser, testPassword);

    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toBe('application/yaml');
    expect(res.text).toContain('name: John');
  });

  // Test .jpeg extension (alternative to .jpg)
  test('converts PNG fragment to JPEG with .jpeg extension', async () => {
    const pngBuffer = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64'
    );
    
    const createRes = await request(app)
      .post('/v1/fragments')
      .auth(testUser, testPassword)
      .set('Content-Type', 'image/png')
      .send(pngBuffer);

    expect(createRes.status).toBe(201);
    const fragmentId = createRes.body.fragment.id;

    const res = await request(app)
      .get(`/v1/fragments/${fragmentId}.jpeg`)
      .auth(testUser, testPassword);

    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toBe('image/jpeg');
    expect(Buffer.from(res.body).toString('hex', 0, 2)).toBe('ffd8');
  });
});
