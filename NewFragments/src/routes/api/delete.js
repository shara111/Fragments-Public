// src/routes/api/delete.js
const { Fragment } = require('../../model/fragment');
const { createSuccessResponse, createErrorResponse } = require('../../response');
const logger = require('../../logger');

/**
 * DELETE /fragments/:id
 * Deletes a fragment (both metadata and data) for the authenticated user
 */
module.exports = async (req, res, next) => {
  try {
    logger.debug('DELETE /fragments/:id: Request received', {
      fragmentIdParam: req.params.id,
      userAgent: req.get('User-Agent'),
      ip: req.ip
    });

    // Get the user's hashed email from the request (set by auth middleware)
    const ownerId = req.user;

    if (!ownerId) {
      logger.warn('DELETE /fragments/:id: No authenticated user', {
        fragmentIdParam: req.params.id,
        hasAuthHeader: !!req.get('Authorization'),
        ip: req.ip,
      });
      return res.status(401).json(createErrorResponse(401, 'Authentication required'));
    }

    const fragmentId = req.params.id;

    if (!fragmentId) {
      logger.warn('DELETE /fragments/:id: No fragment ID provided', {
        ownerId,
        params: req.params,
      });
      return res.status(400).json(createErrorResponse(400, 'Fragment ID required'));
    }

    logger.debug('DELETE /fragments/:id: Looking up fragment', {
      ownerId,
      fragmentId
    });

    // Check if fragment exists first
    const fragment = await Fragment.byId(ownerId, fragmentId);

    if (!fragment) {
      logger.warn('DELETE /fragments/:id: Fragment not found', {
        ownerId,
        fragmentId
      });
      return res.status(404).json(createErrorResponse(404, 'Fragment not found'));
    }

    // Delete the fragment (both metadata and data)
    await Fragment.delete(ownerId, fragmentId);

    logger.info('DELETE /fragments/:id: Fragment deleted successfully', {
      ownerId,
      fragmentId
    });

    // Return success response
    res.status(200).json(createSuccessResponse({
      message: 'Fragment deleted successfully'
    }));

  } catch (err) {
    if (err.message.includes('Fragment not found')) {
      logger.warn('DELETE /fragments/:id: Fragment not found', {
        ownerId: req.user,
        fragmentId: req.params.id,
        error: err.message
      });
      return res.status(404).json(createErrorResponse(404, 'Fragment not found'));
    }

    logger.error('DELETE /fragments/:id: Error deleting fragment', {
      error: err.message,
      stack: err.stack,
      ownerId: req.user,
      fragmentId: req.params.id
    });

    next(err);
  }
};

