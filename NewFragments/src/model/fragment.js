// Use crypto.randomUUID() to create unique IDs, see:
// https://nodejs.org/api/crypto.html#cryptorandomuuidoptions
const { randomUUID } = require('crypto');
// Use https://www.npmjs.com/package/content-type to create/parse Content-Type headers
const contentType = require('content-type');
const logger = require('../logger');

// Functions for working with fragment metadata/data using our DB
const {
  readFragment,
  writeFragment,
  readFragmentData,
  writeFragmentData,
  listFragments,
  deleteFragment,
} = require('./data');

class Fragment {
  constructor({ id, ownerId, created, updated, type, size = 0 }) {
    logger.debug('Fragment: Creating new fragment', {
      id: id || 'auto-generated',
      ownerId,
      type,
      size
    });

    // Validate required fields
    if (!ownerId) {
      logger.error('Fragment: Missing required ownerId');
      throw new Error('ownerId is required');
    }
    if (!type) {
      logger.error('Fragment: Missing required type', { ownerId });
      throw new Error('type is required');
    }

    // Validate type is supported
    if (!Fragment.isSupportedType(type)) {
      logger.error('Fragment: Unsupported type', { ownerId, type });
      throw new Error(`Unsupported type: ${type}`);
    }

    // Validate size
    if (typeof size !== 'number') {
      logger.error('Fragment: Invalid size type', { ownerId, type, size });
      throw new Error('size must be a number');
    }
    if (size < 0) {
      logger.error('Fragment: Negative size', { ownerId, type, size });
      throw new Error('size cannot be negative');
    }

    // Set properties
    this.id = id || randomUUID();
    this.ownerId = ownerId;
    this.type = type;
    this.size = size;

    // Set timestamps
    const now = new Date().toISOString();
    this.created = created || now;
    this.updated = updated || now;

    logger.debug('Fragment: Fragment created successfully', {
      id: this.id,
      ownerId: this.ownerId,
      type: this.type,
      size: this.size
    });
  }

  /**
   * Get all fragments (id or full) for the given user
   * @param {string} ownerId user's hashed email
   * @param {boolean} expand whether to expand ids to full fragments
   * @returns Promise<Array<Fragment>>
   */
  static async byUser(ownerId, expand = false) {
    logger.debug('Fragment.byUser: Retrieving fragments for user', {
      ownerId,
      expand
    });

    const fragments = await listFragments(ownerId, expand);
    
    if (expand) {
      // Convert plain objects back to Fragment instances
      const fragmentInstances = fragments.map(fragment => new Fragment(fragment));
      logger.debug('Fragment.byUser: Returning expanded fragments', {
        ownerId,
        count: fragmentInstances.length
      });
      return fragmentInstances;
    }
    
    logger.debug('Fragment.byUser: Returning fragment IDs', {
      ownerId,
      count: fragments.length
    });
    return fragments;
  }

  /**
   * Gets a fragment for the user by the given id.
   * @param {string} ownerId user's hashed email
   * @param {string} id fragment's id
   * @returns Promise<Fragment>
   */
  static async byId(ownerId, id) {
    logger.debug('Fragment.byId: Looking up fragment', {
      ownerId,
      id
    });

    const fragment = await readFragment(ownerId, id);
    
    if (!fragment) {
      logger.warn('Fragment.byId: Fragment not found', {
        ownerId,
        id
      });
      throw new Error(`Fragment not found: ${id}`);
    }
    
    logger.debug('Fragment.byId: Fragment found, creating instance', {
      ownerId,
      id,
      type: fragment.type,
      size: fragment.size
    });
    
    // Re-create a full Fragment instance
    return new Fragment(fragment);
  }

  /**
   * Delete the user's fragment data and metadata for the given id
   * @param {string} ownerId user's hashed email
   * @param {string} id fragment's id
   * @returns Promise<void>
   */
  static delete(ownerId, id) {
    logger.debug('Fragment.delete: Deleting fragment', {
      ownerId,
      id
    });

    return deleteFragment(ownerId, id).then(() => {
      logger.info('Fragment.delete: Fragment deleted successfully', {
        ownerId,
        id
      });
    }).catch(err => {
      logger.error('Fragment.delete: Error deleting fragment', {
        ownerId,
        id,
        error: err.message
      });
      throw err;
    });
  }

  /**
   * Saves the current fragment (metadata) to the database
   * @returns Promise<void>
   */
  async save() {
    logger.debug('Fragment.save: Saving fragment metadata', {
      id: this.id,
      ownerId: this.ownerId,
      type: this.type,
      size: this.size
    });

    // Update the updated timestamp
    this.updated = new Date().toISOString();
    
    // Save to database
    await writeFragment(this);
    
    logger.debug('Fragment.save: Fragment metadata saved successfully', {
      id: this.id,
      ownerId: this.ownerId,
      updated: this.updated
    });
  }

  /**
   * Gets the fragment's data from the database
   * @returns Promise<Buffer>
   */
  getData() {
    logger.debug('Fragment.getData: Retrieving fragment data', {
      id: this.id,
      ownerId: this.ownerId
    });

    return readFragmentData(this.ownerId, this.id).then(data => {
      logger.debug('Fragment.getData: Fragment data retrieved', {
        id: this.id,
        ownerId: this.ownerId,
        dataSize: data ? data.length : 0
      });
      return data;
    }).catch(err => {
      logger.error('Fragment.getData: Error retrieving fragment data', {
        id: this.id,
        ownerId: this.ownerId,
        error: err.message
      });
      throw err;
    });
  }

  /**
   * Set's the fragment's data in the database
   * @param {Buffer} data
   * @returns Promise<void>
   */
  async setData(data) {
    logger.debug('Fragment.setData: Setting fragment data', {
      id: this.id,
      ownerId: this.ownerId,
      dataSize: data ? data.length : 0
    });

    if (!Buffer.isBuffer(data)) {
      logger.error('Fragment.setData: Data must be a Buffer', {
        id: this.id,
        ownerId: this.ownerId,
        dataType: typeof data
      });
      throw new Error('data must be a Buffer');
    }
    
    // Update size and timestamp
    this.size = data.length;
    this.updated = new Date().toISOString();
    
    logger.debug('Fragment.setData: Updated fragment metadata', {
      id: this.id,
      ownerId: this.ownerId,
      newSize: this.size,
      updated: this.updated
    });
    
    // Save data and update metadata
    await writeFragmentData(this.ownerId, this.id, data);
    await this.save();
    
    logger.debug('Fragment.setData: Fragment data saved successfully', {
      id: this.id,
      ownerId: this.ownerId,
      size: this.size
    });
  }

  /**
   * Returns the mime type (e.g., without encoding) for the fragment's type:
   * "text/html; charset=utf-8" -> "text/html"
   * @returns {string} fragment's mime type (without encoding)
   */
  get mimeType() {
    const { type } = contentType.parse(this.type);
    return type;
  }

  /**
   * Returns true if this fragment is a text/* mime type
   * @returns {boolean} true if fragment's type is text/*
   */
  get isText() {
    return this.mimeType.startsWith('text/');
  }

  /**
   * Returns the formats into which this fragment type can be converted
   * @returns {Array<string>} list of supported mime types
   */
  get formats() {
    // For now, only return the same type (no conversions supported yet)
    return [this.mimeType];
  }

  /**
   * Returns true if we know how to work with this content type
   * @param {string} value a Content-Type value (e.g., 'text/plain' or 'text/plain: charset=utf-8')
   * @returns {boolean} true if we support this Content-Type (i.e., type/subtype)
   */
  static isSupportedType(value) {
    try {
      const { type } = contentType.parse(value);
      
      // For Assignment 2: support all text/* types and application/json
      const supportedTypes = [
        'text/plain',
        'text/markdown',
        'text/html',
        'text/csv',
        'application/json',
        'application/yaml',
        'image/png',
        'image/jpeg',
        'image/webp',
        'image/gif',
      ];
      
      return supportedTypes.includes(type);
    } catch {
      return false;
    }
  }
}

module.exports.Fragment = Fragment;
