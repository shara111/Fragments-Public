const { Fragment } = require('../../model/fragment');
const contentType = require('content-type');
const logger = require('../../logger');

/**
 * POST /fragments
 * Creates a new fragment for the authenticated user
 */
module.exports = async (req, res, next) => {
  try {
    logger.debug('POST /fragments: Request received', {
      contentType: req.get('Content-Type'),
      contentLength: req.get('Content-Length'),
      userAgent: req.get('User-Agent')
    });

    // Get the user's hashed email from the request (set by auth middleware)
    const ownerId = req.user;
    
    if (!ownerId) {
      logger.warn('POST /fragments: No authenticated user', {
        hasAuthHeader: !!req.get('Authorization'),
        ip: req.ip
      });
      return res.status(401).json({
        status: 'error',
        error: {
          code: 401,
          message: 'Authentication required'
        }
      });
    }

    logger.debug('POST /fragments: Authenticated user', { ownerId });

    // Check if Content-Type header exists and is not empty
    const contentTypeHeader = req.get('Content-Type');
    
    // Handle missing or empty Content-Type
    if (!contentTypeHeader || typeof contentTypeHeader !== 'string' || contentTypeHeader.trim() === '') {
      logger.warn('POST /fragments: Missing Content-Type header', { 
        ownerId,
        contentTypeHeader: contentTypeHeader || 'undefined'
      });
      
      return res.status(400).json({
        status: 'error',
        error: {
          code: 400,
          message: 'Content-Type header is required'
        }
      });
    }

    // Parse the Content-Type header first to check if it's supported
    let parsedType;
    try {
      parsedType = contentType.parse(contentTypeHeader.trim());
      logger.debug('POST /fragments: Content-Type parsed successfully', {
        ownerId,
        parsedType: parsedType.type,
        hasCharset: !!parsedType.parameters?.charset
      });
    } catch (err) {
      logger.warn('POST /fragments: Invalid Content-Type header', { 
        ownerId,
        contentType: contentTypeHeader,
        error: err.message
      });
      
      return res.status(400).json({
        status: 'error',
        error: {
          code: 400,
          message: 'Invalid Content-Type header'
        }
      });
    }

    // Check if the content type is supported BEFORE checking body
    // This ensures we return 415 for unsupported types even if body parsing fails
    if (!Fragment.isSupportedType(parsedType.type)) {
      logger.warn('POST /fragments: Unsupported content type', { 
        ownerId,
        contentType: parsedType.type
      });
      
      return res.status(415).json({
        status: 'error',
        error: {
          code: 415,
          message: 'Unsupported content type'
        }
      });
    }

    // Check if we have a body (raw body parser will set req.body to Buffer or {})
    if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
      logger.warn('POST /fragments: No body or unsupported content type', { 
        ownerId,
        contentType: req.get('Content-Type'),
        bodyType: typeof req.body,
        isBuffer: Buffer.isBuffer(req.body),
        bodyLength: Buffer.isBuffer(req.body) ? req.body.length : 'N/A'
      });
      
      return res.status(400).json({
        status: 'error',
        error: {
          code: 400,
          message: 'Body required'
        }
      });
    }

    // Handle Hurl's base64, prefix - decode if body starts with "base64,"
    let bodyData = req.body;
    if (Buffer.isBuffer(req.body) && req.body.length > 7) {
      const prefix = req.body.slice(0, 7).toString('utf8');
      if (prefix === 'base64,') {
        logger.debug('POST /fragments: Detected base64, prefix, decoding', { ownerId });
        try {
          const base64Data = req.body.slice(7).toString('utf8');
          bodyData = Buffer.from(base64Data, 'base64');
          logger.debug('POST /fragments: Base64 decoded successfully', { 
            ownerId,
            originalSize: req.body.length,
            decodedSize: bodyData.length
          });
        } catch (err) {
          logger.warn('POST /fragments: Failed to decode base64 data', { 
            ownerId,
            error: err.message
          });
          return res.status(400).json({
            status: 'error',
            error: {
              code: 400,
              message: 'Invalid base64 data'
            }
          });
        }
      }
    }

    logger.debug('POST /fragments: Body validation passed', {
      ownerId,
      bodySize: bodyData.length,
      contentType: req.get('Content-Type')
    });

    // Create the fragment
    logger.debug('POST /fragments: Creating fragment', {
      ownerId,
      type: req.get('Content-Type'),
      size: req.body.length
    });

    const fragment = new Fragment({
      ownerId,
      type: req.get('Content-Type'),
      size: bodyData.length
    });

    logger.debug('POST /fragments: Fragment created', {
      ownerId,
      fragmentId: fragment.id,
      type: fragment.type,
      size: fragment.size
    });

    // Save the fragment metadata
    await fragment.save();
    logger.debug('POST /fragments: Fragment metadata saved', {
      ownerId,
      fragmentId: fragment.id
    });
    
    // Save the fragment data
    await fragment.setData(bodyData);
    logger.debug('POST /fragments: Fragment data saved', {
      ownerId,
      fragmentId: fragment.id,
      dataSize: bodyData.length
    });

    // Build the Location header URL
    const apiUrl = process.env.API_URL;
    let locationUrl;
    
    if (apiUrl) {
      locationUrl = `${apiUrl}/v1/fragments/${fragment.id}`;
      logger.debug('POST /fragments: Using API_URL for Location header', {
        ownerId,
        fragmentId: fragment.id,
        apiUrl
      });
    } else {
      // Use req.headers.host to build URL dynamically
      const protocol = req.secure ? 'https' : 'http';
      const host = req.get('host');
      locationUrl = `${protocol}://${host}/v1/fragments/${fragment.id}`;
      logger.debug('POST /fragments: Using host header for Location header', {
        ownerId,
        fragmentId: fragment.id,
        protocol,
        host
      });
    }

    logger.info('POST /fragments: Fragment created successfully', {
      ownerId,
      fragmentId: fragment.id,
      type: fragment.type,
      size: fragment.size
    });

    // Return the fragment metadata with Location header
    res.setHeader('Location', locationUrl);
    res.status(201).json({
      status: 'ok',
      fragment: {
        id: fragment.id,
        ownerId: fragment.ownerId,
        created: fragment.created,
        updated: fragment.updated,
        type: fragment.type,
        size: fragment.size
      }
    });

  } catch (err) {
    logger.error('POST /fragments: Error creating fragment', { 
      error: err.message,
      stack: err.stack,
      ownerId: req.user
    });
    
    next(err);
  }
};
