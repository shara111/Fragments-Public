// src/routes/api/index.js

/**
 * The main entry-point for the v1 version of the fragments API.
 */
const express = require('express');
const contentType = require('content-type');
const { Fragment } = require('../../model/fragment');

// Create a router on which to mount our API endpoints
const router = express.Router();

// Support sending various Content-Types on the body up to 5M in size
const rawBody = () =>
  express.raw({
    inflate: true,
    limit: '5mb',
    type: (req) => {
      // See if we can parse this content type. If we can, `req.body` will be
      // a Buffer (e.g., `Buffer.isBuffer(req.body) === true`). If not, `req.body`
      // will be equal to an empty Object `{}` and `Buffer.isBuffer(req.body) === false`
      try {
        // Get Content-Type header from request
        const contentTypeHeader = req.get('Content-Type');
        if (!contentTypeHeader) {
          return false;
        }
        // Parse the Content-Type header string
        const { type } = contentType.parse(contentTypeHeader);
        return Fragment.isSupportedType(type);
      } catch {
        // If Content-Type is missing or invalid, don't parse as raw
        // Let the handler deal with the error
        return false;
      }
    },
  });

// Define our routes
// Note: More specific routes should come before more general ones
// PUT and DELETE should come before GET to avoid conflicts
router.get('/fragments', require('./get'));
router.get('/fragments/:id/info', require('./get-by-id-info'));
router.post('/fragments', rawBody(), require('./post'));
router.put('/fragments/:id', rawBody(), require('./put'));
router.delete('/fragments/:id', require('./delete'));
router.get('/fragments/:id', require('./get-by-id'));

module.exports = router;