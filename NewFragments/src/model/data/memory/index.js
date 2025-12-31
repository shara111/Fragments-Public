const MemoryDB = require('./memory-db');
const logger = require('../../../logger');

// Create two in-memory databases: one for fragment metadata and the other for raw data
const data = new MemoryDB();
const metadata = new MemoryDB();

// Write a fragment's metadata to memory db. Returns a Promise<void>
function writeFragment(fragment) {
  logger.debug('writeFragment: Writing fragment metadata', {
    ownerId: fragment.ownerId,
    id: fragment.id,
    type: fragment.type,
    size: fragment.size
  });

  // Simulate db/network serialization of the value, storing only JSON representation.
  // This is important because it's how things will work later with AWS data stores.
  const serialized = JSON.stringify(fragment);
  
  return metadata.put(fragment.ownerId, fragment.id, serialized).then(() => {
    logger.debug('writeFragment: Fragment metadata written successfully', {
      ownerId: fragment.ownerId,
      id: fragment.id
    });
  }).catch(err => {
    logger.error('writeFragment: Error writing fragment metadata', {
      ownerId: fragment.ownerId,
      id: fragment.id,
      error: err.message
    });
    throw err;
  });
}

// Read a fragment's metadata from memory db. Returns a Promise<Object>
async function readFragment(ownerId, id) {
  logger.debug('readFragment: Reading fragment metadata', {
    ownerId,
    id
  });

  // NOTE: this data will be raw JSON, we need to turn it back into an Object.
  // You'll need to take care of converting this back into a Fragment instance
  // higher up in the callstack.
  const serialized = await metadata.get(ownerId, id);
  
  if (!serialized) {
    logger.debug('readFragment: Fragment not found', {
      ownerId,
      id
    });
    return serialized;
  }

  const fragment = typeof serialized === 'string' ? JSON.parse(serialized) : serialized;
  
  logger.debug('readFragment: Fragment metadata read successfully', {
    ownerId,
    id,
    type: fragment.type,
    size: fragment.size
  });
  
  return fragment;
}

// Write a fragment's data buffer to memory db. Returns a Promise
function writeFragmentData(ownerId, id, buffer) {
  logger.debug('writeFragmentData: Writing fragment data', {
    ownerId,
    id,
    bufferSize: buffer.length
  });

  return data.put(ownerId, id, buffer).then(() => {
    logger.debug('writeFragmentData: Fragment data written successfully', {
      ownerId,
      id,
      bufferSize: buffer.length
    });
  }).catch(err => {
    logger.error('writeFragmentData: Error writing fragment data', {
      ownerId,
      id,
      bufferSize: buffer.length,
      error: err.message
    });
    throw err;
  });
}

// Read a fragment's data from memory db. Returns a Promise
function readFragmentData(ownerId, id) {
  logger.debug('readFragmentData: Reading fragment data', {
    ownerId,
    id
  });

  return data.get(ownerId, id).then(buffer => {
    logger.debug('readFragmentData: Fragment data read', {
      ownerId,
      id,
      dataSize: buffer ? buffer.length : 0
    });
    return buffer;
  }).catch(err => {
    logger.error('readFragmentData: Error reading fragment data', {
      ownerId,
      id,
      error: err.message
    });
    throw err;
  });
}

// Get a list of fragment ids/objects for the given user from memory db. Returns a Promise
async function listFragments(ownerId, expand = false) {
  logger.debug('listFragments: Listing fragments for user', {
    ownerId,
    expand
  });

  const fragments = await metadata.query(ownerId);

  // If we don't get anything back, return empty array
  if (!fragments || fragments.length === 0) {
    logger.debug('listFragments: No fragments found for user', {
      ownerId
    });
    return [];
  }

  logger.debug('listFragments: Found fragments for user', {
    ownerId,
    count: fragments.length,
    expand
  });

  // If we're supposed to give expanded fragments, parse them and return
  if (expand) {
    const expandedFragments = fragments.map((fragment) => 
      typeof fragment === 'string' ? JSON.parse(fragment) : fragment
    );
    logger.debug('listFragments: Returning expanded fragments', {
      ownerId,
      count: expandedFragments.length
    });
    return expandedFragments;
  }

  // Otherwise, parse fragments and map to only send back the ids
  const fragmentIds = fragments.map((fragment) => {
    const parsed = typeof fragment === 'string' ? JSON.parse(fragment) : fragment;
    return parsed.id;
  });

  logger.debug('listFragments: Returning fragment IDs', {
    ownerId,
    count: fragmentIds.length
  });

  return fragmentIds;
}

// Delete a fragment's metadata and data from memory db. Returns a Promise
function deleteFragment(ownerId, id) {
  logger.debug('deleteFragment: Deleting fragment', {
    ownerId,
    id
  });

  return Promise.all([
    // Delete metadata
    metadata.del(ownerId, id),
    // Delete data
    data.del(ownerId, id),
  ]).then(() => {
    logger.info('deleteFragment: Fragment deleted successfully', {
      ownerId,
      id
    });
  }).catch(err => {
    logger.error('deleteFragment: Error deleting fragment', {
      ownerId,
      id,
      error: err.message
    });
    throw err;
  });
}

// Reset both databases (useful for testing)
function reset() {
  data.db = {};
  metadata.db = {};
}

module.exports.listFragments = listFragments;
module.exports.writeFragment = writeFragment;
module.exports.readFragment = readFragment;
module.exports.writeFragmentData = writeFragmentData;
module.exports.readFragmentData = readFragmentData;
module.exports.deleteFragment = deleteFragment;
module.exports.reset = reset;
