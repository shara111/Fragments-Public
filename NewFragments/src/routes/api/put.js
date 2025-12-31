// src/routes/api/put.js
const { Fragment } = require('../../model/fragment');
const contentType = require('content-type');
const { createSuccessResponse, createErrorResponse } = require('../../response');
const logger = require('../../logger');

/**
 * PUT /fragments/:id
 * Updates (replaces) the data for an existing fragment for the authenticated user
 */
module.exports = async (req, res, next) => {
  try {
    logger.debug('PUT /fragments/:id: Request received', {
      fragmentId: req.params.id,
      contentType: req.get('Content-Type'),
      contentLength: req.get('Content-Length'),
      userAgent: req.get('User-Agent'),
      ip: req.ip
    });

    // Get the user's hashed email from the request (set by auth middleware)
    const ownerId = req.user;

    if (!ownerId) {
      logger.warn('PUT /fragments/:id: No authenticated user', {
        fragmentId: req.params.id,
        hasAuthHeader: !!req.get('Authorization'),
        ip: req.ip
      });
      return res.status(401).json(createErrorResponse(401, 'Authentication required'));
    }

    const fragmentId = req.params.id;

    if (!fragmentId) {
      logger.warn('PUT /fragments/:id: No fragment ID provided', {
        ownerId,
        params: req.params
      });
      return res.status(400).json(createErrorResponse(400, 'Fragment ID required'));
    }

    // Check if Content-Type header exists and is not empty
    // This must be checked BEFORE body validation because rawBody middleware
    // won't parse the body if Content-Type is missing/invalid
    const contentTypeHeader = req.get('Content-Type');

    if (!contentTypeHeader || typeof contentTypeHeader !== 'string' || contentTypeHeader.trim() === '') {
      logger.warn('PUT /fragments/:id: Missing Content-Type header', {
        ownerId,
        fragmentId,
        contentTypeHeader: contentTypeHeader || 'undefined',
        bodyType: typeof req.body,
        isBuffer: Buffer.isBuffer(req.body)
      });
      return res.status(400).json(createErrorResponse(400, 'Content-Type header is required'));
    }

    // Parse the Content-Type header
    let parsedType;
    try {
      parsedType = contentType.parse(contentTypeHeader.trim());
      logger.debug('PUT /fragments/:id: Content-Type parsed successfully', {
        ownerId,
        fragmentId,
        parsedType: parsedType.type
      });
    } catch (err) {
      logger.warn('PUT /fragments/:id: Invalid Content-Type header', {
        ownerId,
        fragmentId,
        contentType: contentTypeHeader,
        error: err.message
      });
      return res.status(400).json(createErrorResponse(400, 'Invalid Content-Type header'));
    }

    // Check if we have a body
    // Note: If Content-Type was missing/invalid, rawBody middleware won't parse body,
    // so req.body might be {} instead of Buffer. In that case, we should check Content-Type again.
    if (!Buffer.isBuffer(req.body)) {
      // If body is not a Buffer, it means rawBody middleware didn't parse it
      // This could happen if Content-Type was missing or not supported
      // Check if Content-Type is actually set and valid
      const actualContentType = req.get('Content-Type');
      if (!actualContentType || typeof actualContentType !== 'string' || actualContentType.trim() === '') {
        logger.warn('PUT /fragments/:id: Missing Content-Type header (detected via body check)', {
          ownerId,
          fragmentId,
          contentTypeHeader: actualContentType || 'undefined',
          bodyType: typeof req.body
        });
        return res.status(400).json(createErrorResponse(400, 'Content-Type header is required'));
      }
      // If Content-Type exists but body is not Buffer, body is missing/empty
      logger.warn('PUT /fragments/:id: No body provided', {
        ownerId,
        fragmentId,
        contentType: req.get('Content-Type'),
        bodyType: typeof req.body,
        isBuffer: Buffer.isBuffer(req.body),
        bodyLength: Buffer.isBuffer(req.body) ? req.body.length : 'N/A'
      });
      return res.status(400).json(createErrorResponse(400, 'Body required'));
    }
    
    if (req.body.length === 0) {
      logger.warn('PUT /fragments/:id: Empty body provided', {
        ownerId,
        fragmentId,
        contentType: req.get('Content-Type')
      });
      return res.status(400).json(createErrorResponse(400, 'Body required'));
    }

    logger.debug('PUT /fragments/:id: Looking up fragment', {
      ownerId,
      fragmentId
    });

    // Check if fragment exists
    const fragment = await Fragment.byId(ownerId, fragmentId);

    if (!fragment) {
      logger.warn('PUT /fragments/:id: Fragment not found', {
        ownerId,
        fragmentId
      });
      return res.status(404).json(createErrorResponse(404, 'Fragment not found'));
    }

    // Check if Content-Type matches the existing fragment's type
    // Compare the base mime type (without charset/parameters)
    const existingMimeType = fragment.mimeType;
    const requestMimeType = parsedType.type;

    if (existingMimeType !== requestMimeType) {
      logger.warn('PUT /fragments/:id: Content-Type mismatch', {
        ownerId,
        fragmentId,
        existingType: fragment.type,
        existingMimeType,
        requestMimeType
      });
      return res.status(400).json(createErrorResponse(400, 'Content-Type does not match existing fragment type'));
    }

    logger.debug('PUT /fragments/:id: Updating fragment data', {
      ownerId,
      fragmentId,
      contentType: req.get('Content-Type'),
      newSize: req.body.length,
      existingSize: fragment.size
    });

    // Update the fragment type if Content-Type includes charset/parameters
    if (contentTypeHeader !== fragment.type) {
      fragment.type = contentTypeHeader;
    }

    // Update the fragment data (this will also update the size and updated timestamp)
    await fragment.setData(req.body);

    logger.info('PUT /fragments/:id: Fragment updated successfully', {
      ownerId,
      fragmentId,
      type: fragment.type,
      newSize: fragment.size
    });

    // Return the updated fragment metadata
    res.status(200).json(createSuccessResponse({
      fragment: {
        id: fragment.id,
        ownerId: fragment.ownerId,
        created: fragment.created,
        updated: fragment.updated,
        type: fragment.type,
        size: fragment.size
      }
    }));

  } catch (err) {
    if (err.message.includes('Fragment not found')) {
      logger.warn('PUT /fragments/:id: Fragment not found', {
        ownerId: req.user,
        fragmentId: req.params.id,
        error: err.message
      });
      return res.status(404).json(createErrorResponse(404, 'Fragment not found'));
    }

    logger.error('PUT /fragments/:id: Error updating fragment', {
      error: err.message,
      stack: err.stack,
      ownerId: req.user,
      fragmentId: req.params.id
    });

    next(err);
  }
};