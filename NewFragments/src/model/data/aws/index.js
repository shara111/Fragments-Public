const logger = require('../../../logger');
const s3Client = require('./s3Client');
const ddbDocClient = require('./ddbDocClient');
const { PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { PutCommand, GetCommand, QueryCommand, DeleteCommand } = require('@aws-sdk/lib-dynamodb');

// Writes a fragment to DynamoDB. Returns a Promise.
async function writeFragment(fragment) {
  logger.debug('writeFragment: Writing fragment metadata to DynamoDB', {
    ownerId: fragment.ownerId,
    id: fragment.id,
    type: fragment.type,
    size: fragment.size
  });

  // Configure our PUT params, with the name of the table and item (attributes and keys)
  const params = {
    TableName: process.env.AWS_DYNAMODB_TABLE_NAME,
    Item: fragment,
  };

  // Create a PUT command to send to DynamoDB
  const command = new PutCommand(params);

  try {
    await ddbDocClient.send(command);
    logger.debug('writeFragment: Fragment metadata written successfully to DynamoDB', {
      ownerId: fragment.ownerId,
      id: fragment.id
    });
  } catch (err) {
    logger.warn({ err, params, fragment }, 'error writing fragment to DynamoDB');
    throw err;
  }
}

// Reads a fragment from DynamoDB. Returns a Promise<fragment|undefined>
async function readFragment(ownerId, id) {
  logger.debug('readFragment: Reading fragment metadata from DynamoDB', {
    ownerId,
    id
  });

  // Configure our GET params, with the name of the table and key (partition key + sort key)
  const params = {
    TableName: process.env.AWS_DYNAMODB_TABLE_NAME,
    Key: { ownerId, id },
  };

  // Create a GET command to send to DynamoDB
  const command = new GetCommand(params);

  try {
    // Wait for the data to come back from AWS
    const data = await ddbDocClient.send(command);
    
    // We may or may not get back any data (e.g., no item found for the given key).
    // If we get back an item (fragment), we'll return it.  Otherwise we'll return `undefined`.
    if (!data?.Item) {
      logger.debug('readFragment: Fragment not found', {
        ownerId,
        id
      });
      return undefined;
    }

    logger.debug('readFragment: Fragment metadata read successfully from DynamoDB', {
      ownerId,
      id,
      type: data.Item.type,
      size: data.Item.size
    });
    
    return data.Item;
  } catch (err) {
    logger.warn({ err, params }, 'error reading fragment from DynamoDB');
    throw err;
  }
}

// Writes a fragment's data to an S3 Object in a Bucket
// https://github.com/awsdocs/aws-sdk-for-javascript-v3/blob/main/doc_source/s3-example-creating-buckets.md#upload-an-existing-object-to-an-amazon-s3-bucket
async function writeFragmentData(ownerId, id, data) {
  logger.debug('writeFragmentData: Writing fragment data to S3', {
    ownerId,
    id,
    bufferSize: data.length
  });

  // Create the PUT API params from our details
  const params = {
    Bucket: process.env.AWS_S3_BUCKET_NAME,
    // Our key will be a mix of the ownerID and fragment id, written as a path
    Key: `${ownerId}/${id}`,
    Body: data,
  };

  // Create a PUT Object command to send to S3
  const command = new PutObjectCommand(params);

  try {
    // Use our client to send the command
    await s3Client.send(command);
    logger.debug('writeFragmentData: Fragment data written successfully to S3', {
      ownerId,
      id,
      bufferSize: data.length
    });
  } catch (err) {
    // If anything goes wrong, log enough info that we can debug
    const { Bucket, Key } = params;
    logger.error({ err, Bucket, Key }, 'Error uploading fragment data to S3');
    throw new Error('unable to upload fragment data');
  }
}

// Convert a stream of data into a Buffer, by collecting
// chunks of data until finished, then assembling them together.
// We wrap the whole thing in a Promise so it's easier to consume.
const streamToBuffer = (stream) =>
  new Promise((resolve, reject) => {
    // As the data streams in, we'll collect it into an array.
    const chunks = [];

    // Streams have events that we can listen for and run
    // code.  We need to know when new `data` is available,
    // if there's an `error`, and when we're at the `end`
    // of the stream.

    // When there's data, add the chunk to our chunks list
    stream.on('data', (chunk) => chunks.push(chunk));
    // When there's an error, reject the Promise
    stream.on('error', reject);
    // When the stream is done, resolve with a new Buffer of our chunks
    stream.on('end', () => resolve(Buffer.concat(chunks)));
  });

// Reads a fragment's data from S3 and returns (Promise<Buffer>)
// https://github.com/awsdocs/aws-sdk-for-javascript-v3/blob/main/doc_source/s3-example-creating-buckets.md#getting-a-file-from-an-amazon-s3-bucket
async function readFragmentData(ownerId, id) {
  logger.debug('readFragmentData: Reading fragment data from S3', {
    ownerId,
    id
  });

  // Create the GET API params from our details
  const params = {
    Bucket: process.env.AWS_S3_BUCKET_NAME,
    // Our key will be a mix of the ownerID and fragment id, written as a path
    Key: `${ownerId}/${id}`,
  };

  // Create a GET Object command to send to S3
  const command = new GetObjectCommand(params);

  try {
    // Get the object from the Amazon S3 bucket. It is returned as a ReadableStream.
    const data = await s3Client.send(command);
    // Convert the ReadableStream to a Buffer
    const buffer = await streamToBuffer(data.Body);
    logger.debug('readFragmentData: Fragment data read from S3', {
      ownerId,
      id,
      dataSize: buffer ? buffer.length : 0
    });
    return buffer;
  } catch (err) {
    const { Bucket, Key } = params;
    logger.error({ err, Bucket, Key }, 'Error streaming fragment data from S3');
    throw new Error('unable to read fragment data');
  }
}

// Get a list of fragments, either ids-only, or full Objects, for the given user.
// Returns a Promise<Array<Fragment>|Array<string>|undefined>
async function listFragments(ownerId, expand = false) {
  logger.debug('listFragments: Listing fragments for user from DynamoDB', {
    ownerId,
    expand
  });

  // Configure our QUERY params, with the name of the table and the query expression
  const params = {
    TableName: process.env.AWS_DYNAMODB_TABLE_NAME,
    // Specify that we want to get all items where the ownerId is equal to the
    // `:ownerId` that we'll define below in the ExpressionAttributeValues.
    KeyConditionExpression: 'ownerId = :ownerId',
    // Use the `ownerId` value to do the query
    ExpressionAttributeValues: {
      ':ownerId': ownerId,
    },
  };

  // Limit to only `id` if we aren't supposed to expand. Without doing this
  // we'll get back every attribute.  The projection expression defines a list
  // of attributes to return, see:
  // https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Expressions.ProjectionExpressions.html
  if (!expand) {
    params.ProjectionExpression = 'id';
  }

  // Create a QUERY command to send to DynamoDB
  const command = new QueryCommand(params);

  try {
    // Wait for the data to come back from AWS
    const data = await ddbDocClient.send(command);

    // If we don't get anything back, return empty array
    if (!data?.Items || data.Items.length === 0) {
      logger.debug('listFragments: No fragments found for user', {
        ownerId
      });
      return [];
    }

    logger.debug('listFragments: Found fragments for user', {
      ownerId,
      count: data.Items.length,
      expand
    });

    // If we haven't expanded to include all attributes, remap this array from
    // [ {"id":"b9e7a264-630f-436d-a785-27f30233faea"}, {"id":"dad25b07-8cd6-498b-9aaf-46d358ea97fe"} ,... ] to
    // [ "b9e7a264-630f-436d-a785-27f30233faea", "dad25b07-8cd6-498b-9aaf-46d358ea97fe", ... ]
    return !expand ? data.Items.map((item) => item.id) : data.Items;
  } catch (err) {
    logger.error({ err, params }, 'error getting all fragments for user from DynamoDB');
    throw err;
  }
}

// Delete a fragment's metadata and data. Returns a Promise
async function deleteFragment(ownerId, id) {
  logger.debug('deleteFragment: Deleting fragment', {
    ownerId,
    id
  });

  // Create the DELETE API params for S3
  const s3Params = {
    Bucket: process.env.AWS_S3_BUCKET_NAME,
    // Our key will be a mix of the ownerID and fragment id, written as a path
    Key: `${ownerId}/${id}`,
  };

  // Create a DELETE Object command to send to S3
  const s3Command = new DeleteObjectCommand(s3Params);

  // Create the DELETE API params for DynamoDB
  const ddbParams = {
    TableName: process.env.AWS_DYNAMODB_TABLE_NAME,
    Key: { ownerId, id },
  };

  // Create a DELETE command to send to DynamoDB
  const ddbCommand = new DeleteCommand(ddbParams);

  try {
    // Delete both metadata and data in parallel
    await Promise.all([
      // Delete metadata from DynamoDB
      ddbDocClient.send(ddbCommand),
      // Delete data from S3
      s3Client.send(s3Command),
    ]);
    logger.info('deleteFragment: Fragment deleted successfully', {
      ownerId,
      id
    });
  } catch (err) {
    logger.error({ err, ddbParams, s3Params, ownerId, id }, 'Error deleting fragment');
    throw err;
  }
}

// Reset function (no-op for DynamoDB, kept for API compatibility)
function reset() {
  // DynamoDB doesn't have a simple reset operation
  // This is kept for API compatibility with tests
  logger.debug('reset: No-op for DynamoDB backend');
}

module.exports.listFragments = listFragments;
module.exports.writeFragment = writeFragment;
module.exports.readFragment = readFragment;
module.exports.writeFragmentData = writeFragmentData;
module.exports.readFragmentData = readFragmentData;
module.exports.deleteFragment = deleteFragment;
module.exports.reset = reset;

