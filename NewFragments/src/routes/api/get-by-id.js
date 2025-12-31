const { Fragment } = require('../../model/fragment');
const { createErrorResponse } = require('../../response');
const logger = require('../../logger');
const MarkdownIt = require('markdown-it');
const sharp = require('sharp');
const yaml = require('js-yaml');

//Initialize markdown-it
const md = new MarkdownIt();

/**
 * Maps file extensions to MIME types
 */
const extensionToMimeType = {
  '.txt': 'text/plain',
  '.md': 'text/markdown',
  '.html': 'text/html',
  '.json': 'application/json',
  '.csv': 'text/csv',
  '.yaml': 'application/yaml',
  '.yml': 'application/yaml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.avif': 'image/avif',
};
/**
 * Checks if a conversion from sourceType to targetType is supported
 * Supports:
 * - All text-to-text conversions (text/plain, text/markdown, text/html, text/csv, application/json, application/yaml)
 * - All image-to-image conversions (image/png, image/jpeg, image/webp, image/gif)
 * - Same type (no conversion needed)
 */
function isConversionSupported(sourceType, targetType) {
  // Same type is always supported
  if (sourceType === targetType) {
    return true;
  }

  // Define type categories
  const textTypes = [
    'text/plain',
    'text/markdown',
    'text/html',
    'text/csv',
    'application/json',
    'application/yaml',
  ];

  const imageTypes = [
    'image/png',
    'image/jpeg',
    'image/webp',
    'image/gif',
  ];

  const sourceIsText = textTypes.includes(sourceType);
  const sourceIsImage = imageTypes.includes(sourceType);
  const targetIsText = textTypes.includes(targetType);
  const targetIsImage = imageTypes.includes(targetType);

  // Text-to-text conversions are supported
  if (sourceIsText && targetIsText) {
    return true;
  }

  // Image-to-image conversions are supported (using sharp)
  if (sourceIsImage && targetIsImage) {
    return true;
  }

  // Cross-type conversions (text to image or image to text) are not supported
  return false;
}

/**
 * Convert fragment data from sourceType to targetType
 * Supports text-to-text and image-to-image conversions
 * @param {Buffer} data - The source data
 * @param {string} sourceType - The source MIME type
 * @param {string} targetType - The target MIME type
 * @returns {Promise<Buffer>} - The converted data
 */
async function convertFragmentData(data, sourceType, targetType) {
  // Same type - no conversion needed
  if (sourceType === targetType) {
    return data;
  }

  // Define type categories
  const textTypes = [
    'text/plain',
    'text/markdown',
    'text/html',
    'text/csv',
    'application/json',
    'application/yaml',
  ];

  const imageTypes = [
    'image/png',
    'image/jpeg',
    'image/webp',
    'image/gif',
  ];

  const sourceIsText = textTypes.includes(sourceType);
  const sourceIsImage = imageTypes.includes(sourceType);
  const targetIsText = textTypes.includes(targetType);
  const targetIsImage = imageTypes.includes(targetType);

  // Handle text-to-text conversions
  if (sourceIsText && targetIsText) {
    return convertTextToText(data, sourceType, targetType);
  }

  // Handle image-to-image conversions using sharp
  if (sourceIsImage && targetIsImage) {
    return convertImageToImage(data, sourceType, targetType);
  }

  // Unsupported conversion
  throw new Error(`Conversion from ${sourceType} to ${targetType} is not supported`);
}

/**
 * Convert text data from one text format to another
 */
function convertTextToText(data, sourceType, targetType) {
  const text = data.toString('utf8');

  // Markdown to HTML
  if (sourceType === 'text/markdown' && targetType === 'text/html') {
    const html = md.render(text);
    return Buffer.from(html, 'utf8');
  }

  // HTML to Markdown (simple conversion - just return as plain text)
  if (sourceType === 'text/html' && targetType === 'text/markdown') {
    // Simple HTML to markdown - strip tags and return as markdown
    // This is a basic implementation
    const plainText = text.replace(/<[^>]*>/g, '');
    return Buffer.from(plainText, 'utf8');
  }

  // JSON to YAML
  if (sourceType === 'application/json' && targetType === 'application/yaml') {
    try {
      const json = JSON.parse(text);
      // Simple JSON to YAML conversion
      const yaml = convertJsonToYaml(json);
      return Buffer.from(yaml, 'utf8');
    } catch (err) {
      throw new Error(`Invalid JSON: ${err.message}`);
    }
  }

  // YAML to JSON
  if (sourceType === 'application/yaml' && targetType === 'application/json') {
    try {
      // Parse YAML to JSON
      const json = yaml.load(text);
      return Buffer.from(JSON.stringify(json, null, 2), 'utf8');
    } catch {
      // Fallback: treat as plain text and wrap in JSON
      return Buffer.from(JSON.stringify({ content: text }, null, 2), 'utf8');
    }
  }

  // CSV to JSON
  if (sourceType === 'text/csv' && targetType === 'application/json') {
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length === 0) {
      return Buffer.from('[]', 'utf8');
    }
    const headers = lines[0].split(',').map(h => h.trim());
    const rows = lines.slice(1).map(line => {
      const values = line.split(',').map(v => v.trim());
      const obj = {};
      headers.forEach((header, i) => {
        obj[header] = values[i] || '';
      });
      return obj;
    });
    return Buffer.from(JSON.stringify(rows, null, 2), 'utf8');
  }

  // JSON to CSV
  if (sourceType === 'application/json' && targetType === 'text/csv') {
    try {
      const json = JSON.parse(text);
      const array = Array.isArray(json) ? json : [json];
      if (array.length === 0) {
        return Buffer.from('', 'utf8');
      }
      const headers = Object.keys(array[0]);
      const csvLines = [headers.join(',')];
      array.forEach(obj => {
        const values = headers.map(header => String(obj[header] || ''));
        csvLines.push(values.join(','));
      });
      return Buffer.from(csvLines.join('\n'), 'utf8');
    } catch (err) {
      throw new Error(`Invalid JSON: ${err.message}`);
    }
  }

  // For other text conversions, return as plain text
  // This handles: text/plain <-> text/html, text/markdown, etc.
  return Buffer.from(text, 'utf8');
}

/**
 * Simple JSON to YAML converter (basic implementation)
 */
function convertJsonToYaml(obj, indent = 0) {
  const indentStr = '  '.repeat(indent);
  let yaml = '';

  if (Array.isArray(obj)) {
    obj.forEach(item => {
      if (typeof item === 'object' && item !== null) {
        yaml += `${indentStr}- `;
        const keys = Object.keys(item);
        keys.forEach((key, i) => {
          const value = item[key];
          if (i === 0) {
            yaml += `${key}: ${formatYamlValue(value, indent + 1)}\n`;
          } else {
            yaml += `${indentStr}  ${key}: ${formatYamlValue(value, indent + 1)}\n`;
          }
        });
      } else {
        yaml += `${indentStr}- ${formatYamlValue(item, indent)}\n`;
      }
    });
  } else if (typeof obj === 'object' && obj !== null) {
    Object.keys(obj).forEach(key => {
      const value = obj[key];
      yaml += `${indentStr}${key}: ${formatYamlValue(value, indent)}\n`;
    });
  } else {
    yaml += `${indentStr}${formatYamlValue(obj, indent)}\n`;
  }

  return yaml;
}

function formatYamlValue(value, indent) {
  if (value === null) {
    return 'null';
  }
  if (typeof value === 'string') {
    // Escape special characters if needed
    if (value.includes('\n') || value.includes(':') || value.includes('#')) {
      return `"${value.replace(/"/g, '\\"')}"`;
    }
    return value;
  }
  if (typeof value === 'object') {
    return '\n' + convertJsonToYaml(value, indent + 1);
  }
  return String(value);
}

/**
 * Convert image data from one image format to another using sharp
 */
async function convertImageToImage(data, sourceType, targetType) {
  try {
    let sharpInstance = sharp(data);

    // Determine output format based on target type
    let outputFormat;
    switch (targetType) {
      case 'image/png':
        outputFormat = 'png';
        break;
      case 'image/jpeg':
        outputFormat = 'jpeg';
        break;
      case 'image/webp':
        outputFormat = 'webp';
        break;
      case 'image/gif':
        outputFormat = 'gif';
        break;
      default:
        throw new Error(`Unsupported target image format: ${targetType}`);
    }

    // Convert the image
    const convertedBuffer = await sharpInstance.toFormat(outputFormat).toBuffer();
    return convertedBuffer;
  } catch (err) {
    logger.error('convertImageToImage: Conversion failed', {
      sourceType,
      targetType,
      error: err.message
    });
    throw new Error(`Image conversion failed: ${err.message}`);
  }
}
/***
 * Parses the fragment ID and extension from the URL parameter
 * Returns {id, extension} where extension is null if not present
 */
function parseFragmentId(idParam) {
  // check if ID has an extension (eg., "abc-123.html")
  const lastDot = idParam.lastIndexOf('.');

  //if not dot, or dot is at the start/end, no extension
  if (lastDot === -1 || lastDot === 0 || lastDot === idParam.length - 1) {
    return { id: idParam, extension: null };
  }

  // Extract extension (without the dot)
  const extension = idParam.substring(lastDot + 1);
  const id = idParam.substring(0, lastDot);
  return { id, extension };
}

/**
 * GET /fragments/:id
 * Gets an authenticated user's fragment data (raw binary data) with the given id.
 * If an extension is provided (e.g., .html), attempts to convert the fragment.
 */
module.exports = async (req, res, next) => {
  try {
    logger.debug('GET /fragments/:id: Request received', {
      fragmentIdParam: req.params.id,
      userAgent: req.get('User-Agent'),
      ip: req.ip
    });

    // Get the user's hashed email from the request (set by auth middleware)
    const ownerId = req.user;

    if (!ownerId) {
      logger.warn('GET /fragments/:id: No authenticated user', {
        fragmentIdParam: req.params.id,
        hasAuthHeader: !!req.get('Authorization'),
        ip: req.ip,
      });
      return res.status(401).json(createErrorResponse(401, 'Authentication required'));
    }

    // Parse ID and extension from the URL parameter
    const {id: fragmentId, extension} = parseFragmentId(req.params.id);

    if (!fragmentId) {
      logger.warn('GET /fragments/:id: No fragment ID provided', {
        ownerId,
        params: req.params,
      });
      return res.status(400).json(createErrorResponse(400, 'Fragment ID required'));
    }

    logger.debug('GET /fragments/:id: Looking up fragment', {
      ownerId,
      fragmentId,
      extension
    });

    // Get the fragment metadata
    const fragment = await Fragment.byId(ownerId, fragmentId);

    // Get the fragment's actual data
    const data = await fragment.getData();

    //Determine target content type
    let targetType = fragment.type; //Default to original type

    if (extension) {
      // Map extension to MIME type
      const targetMimeType = extensionToMimeType[`.${extension.toLowerCase()}`];
      
      if (!targetMimeType) {
        logger.warn('GET /fragments/:id: Unknown extension', {
          ownerId,
          fragmentId,
          extension,
          fragmentType: fragment.mimeType
        });
        return res.status(415).json(createErrorResponse(415, `Unknown or unsupported type: ${extension}`));
      }

      //Check if conversion is supported
      if (!isConversionSupported(fragment.mimeType, targetMimeType)) {
        logger.warn('GET /fragments/:id: Unsupported conversion', {
          ownerId,
          fragmentId,
          sourceType: fragment.mimeType,
          targetType: targetMimeType,
        });
        return res.status(415).json(createErrorResponse(415, `Cannot convert ${fragment.mimeType} to ${targetMimeType}`));
      }

      targetType = targetMimeType;
    }
    // Convert data if needed
    let responseData = data;
    if (extension && fragment.mimeType !== targetType) {
      logger.debug('GET /fragments/:id: Converting fragment data', {
        ownerId,
        fragmentId,
        sourceType: fragment.mimeType,
        targetType
      });

      try {
        responseData = await convertFragmentData(data, fragment.mimeType, targetType);
      } catch (err) {
        logger.error('GET /fragment/:id: Conversion failed', {
          ownerId,
          fragmentId,
          error: err.message
        });
        return res.status(415).json(createErrorResponse(415, err.message));
      }
    }
    logger.info('GET /fragments/:id: Fragment retrieved successfully', {
      ownerId,
      fragmentId,
      originalType: fragment.type,
      targetType,
      size: responseData.length
    });

     // Set the Content-Type header to the target type
     res.setHeader('Content-Type', targetType);
    
     // Return the raw fragment data (Express will handle the Buffer)
     res.status(200).send(responseData);
 
   } catch (err) {
     if (err.message.includes('Fragment not found')) {
       logger.warn('GET /fragments/:id: Fragment not found', { 
         ownerId: req.user,
         fragmentId: req.params.id
       });
       
       return res.status(404).json(createErrorResponse(404, 'Fragment not found'));
     }
 
     logger.error('GET /fragments/:id: Error retrieving fragment data', { 
       error: err.message,
       stack: err.stack,
       ownerId: req.user,
       fragmentId: req.params.id
     });
     
     next(err);
   }
 };