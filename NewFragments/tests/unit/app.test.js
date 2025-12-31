const request = require('supertest');

const app = require('../../src/app');

//Test to cover the 404 handler

describe('404 handler', () => {
    test('unknown routes returns a 404 error', async () => {
        const res  = await request(app)
            .get('/unknownroute')
            .expect(404);
        expect(res.body).toEqual({
            status: 'error',
            error: {
                message: 'not found',
                code: 404,
            },
        });
    });
});