// src/api.js

// fragments microservice API to use
// For Parcel: set API_URL in .env file or environment variable
// For browser: can also be set via window.API_URL or default to localhost
const apiUrl = (typeof window !== 'undefined' && window.API_URL) 
  || (typeof process !== 'undefined' && process.env.API_URL)
  || 'http://localhost:8080';

/**
 * Given an authenticated user, request all fragments for this user from the
 * fragments microservice with expanded metadata. We expect a user to have an
 * `idToken` attached, so we can send that along with the request.
 */
export async function getUserFragments(user) {
  console.log('Requesting user fragments data...');
  try {
    // Use expand=1 to get full fragment metadata
    const fragmentsUrl = new URL('/v1/fragments', apiUrl);
    fragmentsUrl.searchParams.set('expand', '1');
    
    const res = await fetch(fragmentsUrl, {
      // Generate headers with the proper Authorization bearer token to pass.
      // We are using the `authorizationHeaders()` helper method we defined
      // earlier, to automatically attach the user's ID token.
      headers: user.authorizationHeaders(), // No Content-Type for GET requests
    });
    if (!res.ok) {
      throw new Error(`${res.status} ${res.statusText}`);
    }
    const data = await res.json();
    console.log('Successfully got user fragments data', { data });
    return data;
  } catch (err) {
    console.error('Unable to call GET /v1/fragments', { err });
    throw err;
  }
}

/**
 * Create a new fragment for the authenticated user
 * @param {Object} user - Authenticated user object
 * @param {string|Blob|File} content - Fragment content (text, JSON string, or image file)
 * @param {string} contentType - Content-Type header (e.g., 'text/plain', 'text/markdown', 'application/json', 'image/png')
 * @returns {Promise<Object>} Created fragment metadata
 */
export async function createFragment(user, content, contentType = 'text/plain') {
  // For File/Blob objects, use the file's actual type if available, otherwise use provided contentType
  let actualContentType = contentType;
  if (content instanceof File && content.type) {
    // Use file's actual MIME type
    actualContentType = content.type;
    console.log('File type detected:', content.type, 'Using:', actualContentType);
  } else if (content instanceof Blob && content.type) {
    actualContentType = content.type;
  }
  
  console.log('Creating new fragment...', { contentType, actualContentType, isFile: content instanceof File });
  
  try {
    const fragmentsUrl = new URL('/v1/fragments', apiUrl);
    
    // Build headers - always include Authorization, and Content-Type
    const headers = {
      ...user.authorizationHeaders(actualContentType),
      'Content-Type': actualContentType, // Explicitly set to ensure it's correct
    };
    
    // Log headers for debugging
    console.log('Request headers:', headers);
    console.log('Content-Type being sent:', headers['Content-Type']);
    
    // For File/Blob objects, convert to ArrayBuffer to ensure Content-Type is respected
    // When sending File directly, some browsers might override Content-Type
    let body;
    if (content instanceof File || content instanceof Blob) {
      // Convert to ArrayBuffer to have full control over the request
      body = await content.arrayBuffer();
    } else {
      body = content;
    }
    
    const res = await fetch(fragmentsUrl, {
      method: 'POST',
      headers: headers,
      body: body,
    });
    
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`${res.status} ${res.statusText}: ${errorText}`);
    }
    
    const data = await res.json();
    console.log('Successfully created fragment', { data });
    
    // Get the Location header if present
    const location = res.headers.get('Location');
    if (location) {
      console.log('Fragment Location header:', location);
      // Add location to the returned data for UI display
      data.location = location;
    }
    
    return data;
  } catch (err) {
    console.error('Unable to call POST /v1/fragments', { err });
    throw err;
  }
}

/**
 * Get fragment data (actual content) by ID
 * @param {Object} user - Authenticated user object
 * @param {string} fragmentId - Fragment ID
 * @param {string} extension - Optional extension for conversion (e.g., 'html', 'json', 'png')
 * @returns {Promise<Blob>} Fragment data as Blob
 */
export async function getFragmentData(user, fragmentId, extension = null) {
  console.log('Getting fragment data...', { fragmentId, extension });
  try {
    let fragmentUrl = new URL(`/v1/fragments/${fragmentId}`, apiUrl);
    if (extension) {
      fragmentUrl = new URL(`/v1/fragments/${fragmentId}.${extension}`, apiUrl);
    }
    
    const res = await fetch(fragmentUrl, {
      headers: user.authorizationHeaders(), // No Content-Type for GET requests
    });
    
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`${res.status} ${res.statusText}: ${errorText}`);
    }
    
    const blob = await res.blob();
    console.log('Successfully got fragment data', { fragmentId, extension, type: blob.type });
    return blob;
  } catch (err) {
    console.error('Unable to call GET /v1/fragments/:id', { err });
    throw err;
  }
}

/**
 * Update an existing fragment
 * @param {Object} user - Authenticated user object
 * @param {string} fragmentId - Fragment ID to update
 * @param {string|Blob|File} content - New fragment content
 * @param {string} contentType - Content-Type header (must match existing fragment type)
 * @returns {Promise<Object>} Updated fragment metadata
 */
export async function updateFragment(user, fragmentId, content, contentType) {
  console.log('Updating fragment...', { fragmentId, contentType });
  try {
    const fragmentUrl = new URL(`/v1/fragments/${fragmentId}`, apiUrl);
    
    // Build headers - always include Authorization, and Content-Type
    const headers = {
      ...user.authorizationHeaders(contentType),
      'Content-Type': contentType, // Explicitly set to ensure it's correct
    };
    
    // Log headers for debugging
    console.log('Update request headers:', headers);
    console.log('Content-Type being sent:', headers['Content-Type']);
    
    // For File/Blob objects, convert to ArrayBuffer to ensure Content-Type is respected
    // When sending File directly, some browsers might override Content-Type
    let body;
    if (content instanceof File || content instanceof Blob) {
      // Convert to ArrayBuffer to have full control over the request
      body = await content.arrayBuffer();
    } else {
      body = content;
    }
    
    const res = await fetch(fragmentUrl, {
      method: 'PUT',
      headers: headers,
      body: body,
    });
    
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`${res.status} ${res.statusText}: ${errorText}`);
    }
    
    const data = await res.json();
    console.log('Successfully updated fragment', { data });
    return data;
  } catch (err) {
    console.error('Unable to call PUT /v1/fragments/:id', { err });
    throw err;
  }
}

/**
 * Delete a fragment
 * @param {Object} user - Authenticated user object
 * @param {string} fragmentId - Fragment ID to delete
 * @returns {Promise<void>}
 */
export async function deleteFragment(user, fragmentId) {
  console.log('Deleting fragment...', { fragmentId });
  try {
    const fragmentUrl = new URL(`/v1/fragments/${fragmentId}`, apiUrl);
    const res = await fetch(fragmentUrl, {
      method: 'DELETE',
      headers: user.authorizationHeaders(), // No Content-Type for DELETE requests
    });
    
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`${res.status} ${res.statusText}: ${errorText}`);
    }
    
    console.log('Successfully deleted fragment', { fragmentId });
  } catch (err) {
    console.error('Unable to call DELETE /v1/fragments/:id', { err });
    throw err;
  }
}