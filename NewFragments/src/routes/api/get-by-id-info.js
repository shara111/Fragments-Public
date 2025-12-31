// src/routes/api/get-by-id-info.js
const { Fragment } = require('../../model/fragment');
const { createSuccessResponse, createErrorResponse } = require('../../response');
const logger = require('../../logger');

/**
 * GET /fragments/:id/info
 * Gets the metadata for a specific fragment for the authenticated user
 */
module.exports = async (req, res, next) => {
    try {
      logger.debug('GET /fragments/:id/info: Request received', {
        fragmentId: req.params.id,
        userAgent: req.get('User-Agent'),
        ip: req.ip
      });

      // Get the user's hashed email from the request (set by auth middleware)
      const ownerId = req.user;
      const fragmentId = req.params.id;

      if (!ownerId) {
        logger.warn('GET /fragments/:id/info: No authenticated user', {
            fragmentId,
            hasAuthHeader: !!req.get('Authorization'),
            ip: req.ip
        });
        return res.status(401).json(createErrorResponse(401, 'Authentication required'));
      }
      if (!fragmentId) {
        logger.warn('GET /fragments/:id/info: No fragment ID provided', {
            ownerId,
            params: req.params
        });
        return res.status(400).json(createErrorResponse)(400, 'Fragment ID is required');
      }
      logger.debug('GET /fragments/:id/info: Looking up fragment', {
        ownerId,
        fragmentId
      });

      //Get the fragment
      const fragment = await Fragment.byId(ownerId, fragmentId);

      logger.info('GET /fragments/:id/info: Fragment retrieved successfully', {
        ownerId,
        fragmentId,
        type: fragment.type,
        size: fragment.size
      });


      // Return the fragment metadata
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
    } catch (err){
        if (err.message.includes('Fragment not found')) {
            logger.warn('GET /fragments/:id/info: Fragment not found', {
                ownerId: req.user,
                fragmentId: req.params.id
            });
            return res.status(404).json(createErrorResponse(404, 'Fragment not found'));
        }
        logger.error('GET /fragments/:id/info: Error retrieving fragment metadata', {
            error: err.message,
            stack: err.stack,
            ownerId: req.user,
            fragmentId: req.params.id
        });
        next(err);
    }
};