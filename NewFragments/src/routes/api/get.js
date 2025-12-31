// src/routes/api/get.js

/**
 * Get a list of fragments for the current user
 */
const { Fragment } = require('../../model/fragment');
const { createSuccessResponse, createErrorResponse } = require('../../response');
const logger = require('../../logger');

module.exports = async (req, res) => {
  try {
    logger.debug('GET /fragments: Request received', {
      userAgent: req.get('User-Agent'),
      ip: req.ip
    });

    // Get the user's hashed email from the request (set by auth middleware)
    const ownerId = req.user;
    
    if (!ownerId) {
      logger.warn('GET /fragments: No authenticated user', {
        hasAuthHeader: !!req.get('Authorization'),
        ip: req.ip
      });
      return res.status(401).json(createErrorResponse(401, 'Authentication required'));
    }

    logger.debug('GET /fragments: Authenticated user', { ownerId });

    // Check for expand query parameter
    const expand = req.query.expand === '1' || req.query.expand === 'true';
    
    logger.debug('GET /fragments: Expand parameter', { 
      ownerId, 
      expand,
      queryParams: req.query 
    });

    // Get fragments for the user (with or without expansion based on query param)
    const fragments = await Fragment.byUser(ownerId, expand);

    logger.info('GET /fragments: Fragments retrieved successfully', {
      ownerId,
      count: fragments.length
    });
    
    res.status(200).json(createSuccessResponse({ fragments }));
  } catch (error) {
    logger.error('GET /fragments: Error retrieving fragments', { 
      error: error.message,
      stack: error.stack,
      ownerId: req.user
    });
    
    res.status(500).json(createErrorResponse(500, 'Unable to retrieve fragments'));
  }
};