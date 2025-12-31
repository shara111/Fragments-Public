// src/app.js

import { signIn, signOut, getUser } from './auth';
import { getUserFragments, createFragment, getFragmentData, updateFragment, deleteFragment } from './api';

let currentUser = null;

async function loadUserFragments(user) {
  try {
    const userFragments = await getUserFragments(user);
    const container = document.querySelector('#fragmentsContainer');
    
    if (userFragments && userFragments.fragments && userFragments.fragments.length > 0) {
      container.innerHTML = `
        <div class="fragments-grid">
          ${userFragments.fragments.map(fragment => createFragmentCard(fragment)).join('')}
        </div>
      `;
      
      // Attach event listeners for view, update, delete buttons
      attachFragmentEventListeners(user);
    } else {
      container.innerHTML = '<p>No fragments yet. Create one above!</p>';
    }
  } catch (err) {
    console.error('Failed to load fragments:', err);
    const container = document.querySelector('#fragmentsContainer');
    container.innerHTML = `<p style="color: red;">Error loading fragments: ${err.message}</p>`;
  }
}

function createFragmentCard(fragment) {
  const isImage = fragment.type && fragment.type.startsWith('image/');
  const createdDate = new Date(fragment.created).toLocaleString();
  const updatedDate = new Date(fragment.updated).toLocaleString();
  
  return `
    <div class="fragment-card" data-fragment-id="${fragment.id}" data-fragment-type="${fragment.type}">
      <div class="fragment-header">
        <h4>${fragment.type}</h4>
        <span class="fragment-size">${fragment.size} bytes</span>
      </div>
      <div class="fragment-info">
        <p><strong>ID:</strong> <code>${fragment.id.substring(0, 8)}...</code></p>
        <p><strong>Created:</strong> ${createdDate}</p>
        <p><strong>Updated:</strong> ${updatedDate}</p>
      </div>
      ${isImage ? `<div class="fragment-preview"><img src="${getFragmentImageUrl(fragment.id)}" alt="Fragment preview" style="max-width: 200px; max-height: 150px;" /></div>` : ''}
      <div class="fragment-actions">
        <button class="btn-view" data-action="view" data-fragment-id="${fragment.id}">View</button>
        <button class="btn-convert" data-action="convert" data-fragment-id="${fragment.id}" data-fragment-type="${fragment.type}">Convert</button>
        <button class="btn-update" data-action="update" data-fragment-id="${fragment.id}">Update</button>
        <button class="btn-delete" data-action="delete" data-fragment-id="${fragment.id}">Delete</button>
      </div>
    </div>
  `;
}

function getFragmentImageUrl(fragmentId) {
  const apiUrl = (typeof window !== 'undefined' && window.API_URL) 
    || (typeof process !== 'undefined' && process.env.API_URL)
    || 'http://localhost:8080';
  return `${apiUrl}/v1/fragments/${fragmentId}`;
}

function attachFragmentEventListeners(user) {
  // View button handlers
  document.querySelectorAll('[data-action="view"]').forEach(btn => {
    btn.onclick = async () => {
      const fragmentId = btn.getAttribute('data-fragment-id');
      await showFragmentContent(user, fragmentId);
    };
  });
  
  // Update button handlers
  document.querySelectorAll('[data-action="update"]').forEach(btn => {
    btn.onclick = async () => {
      const fragmentId = btn.getAttribute('data-fragment-id');
      const card = btn.closest('.fragment-card');
      const fragmentType = card.getAttribute('data-fragment-type');
      await showUpdateForm(user, fragmentId, fragmentType);
    };
  });
  
  // Convert button handlers
  document.querySelectorAll('[data-action="convert"]').forEach(btn => {
    btn.onclick = async () => {
      const fragmentId = btn.getAttribute('data-fragment-id');
      const fragmentType = btn.getAttribute('data-fragment-type');
      await showConversionOptions(user, fragmentId, fragmentType);
    };
  });
  
  // Delete button handlers
  document.querySelectorAll('[data-action="delete"]').forEach(btn => {
    btn.onclick = async () => {
      const fragmentId = btn.getAttribute('data-fragment-id');
      await confirmAndDeleteFragment(user, fragmentId);
    };
  });
}

async function showFragmentContent(user, fragmentId) {
  try {
    const blob = await getFragmentData(user, fragmentId);
    const fragmentCard = document.querySelector(`[data-fragment-id="${fragmentId}"]`);
    
    // Create modal for viewing content
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
      <div class="modal-content">
        <span class="close-modal">&times;</span>
        <h3>Fragment Content</h3>
        <div id="fragmentContentDisplay"></div>
      </div>
    `;
    
    const contentDisplay = modal.querySelector('#fragmentContentDisplay');
    
    // Handle different content types
    if (blob.type.startsWith('image/')) {
      const imageUrl = URL.createObjectURL(blob);
      contentDisplay.innerHTML = `<img src="${imageUrl}" alt="Fragment" style="max-width: 100%;" />`;
    } else if (blob.type === 'application/json') {
      const text = await blob.text();
      try {
        const json = JSON.parse(text);
        contentDisplay.innerHTML = `<pre>${JSON.stringify(json, null, 2)}</pre>`;
      } catch {
        contentDisplay.innerHTML = `<pre>${text}</pre>`;
      }
    } else {
      const text = await blob.text();
      contentDisplay.innerHTML = `<pre>${escapeHtml(text)}</pre>`;
    }
    
    // Close modal handlers
    modal.querySelector('.close-modal').onclick = () => {
      document.body.removeChild(modal);
      // Clean up object URL if it's an image
      if (blob.type.startsWith('image/')) {
        const img = contentDisplay.querySelector('img');
        if (img && img.src.startsWith('blob:')) {
          URL.revokeObjectURL(img.src);
        }
      }
    };
    
    modal.onclick = (e) => {
      if (e.target === modal) {
        document.body.removeChild(modal);
        if (blob.type.startsWith('image/')) {
          const img = contentDisplay.querySelector('img');
          if (img && img.src.startsWith('blob:')) {
            URL.revokeObjectURL(img.src);
          }
        }
      }
    };
    
    document.body.appendChild(modal);
  } catch (err) {
    alert(`Failed to load fragment content: ${err.message}`);
  }
}

async function showUpdateForm(user, fragmentId, fragmentType) {
  try {
    // Get current fragment data
    const blob = await getFragmentData(user, fragmentId);
    
    // Create modal for updating
    const modal = document.createElement('div');
    modal.className = 'modal';
    
    let contentInput;
    if (fragmentType.startsWith('image/')) {
      // For images, show file input
      contentInput = `
        <div>
          <label for="updateFile">Select new image:</label>
          <input type="file" id="updateFile" accept="image/*" />
        </div>
      `;
    } else {
      // For text, show textarea
      const text = await blob.text();
      contentInput = `
        <div>
          <label for="updateContent">Content:</label>
          <textarea id="updateContent" rows="10" cols="60">${escapeHtml(text)}</textarea>
        </div>
      `;
    }
    
    modal.innerHTML = `
      <div class="modal-content">
        <span class="close-modal">&times;</span>
        <h3>Update Fragment</h3>
        <form id="updateFragmentForm">
          <input type="hidden" id="updateFragmentId" value="${fragmentId}" />
          <input type="hidden" id="updateFragmentType" value="${fragmentType}" />
          ${contentInput}
          <div style="margin-top: 15px;">
            <button type="submit">Update Fragment</button>
            <button type="button" class="cancel-btn">Cancel</button>
          </div>
        </form>
        <div id="updateStatus" style="margin-top: 10px;"></div>
      </div>
    `;
    
    const form = modal.querySelector('#updateFragmentForm');
    const statusDiv = modal.querySelector('#updateStatus');
    
    form.onsubmit = async (e) => {
      e.preventDefault();
      statusDiv.innerHTML = '<p>Updating fragment...</p>';
      
      try {
        let content, contentType;
        
        if (fragmentType.startsWith('image/')) {
          const fileInput = modal.querySelector('#updateFile');
          if (!fileInput.files || !fileInput.files[0]) {
            statusDiv.innerHTML = '<p style="color: red;">Please select an image file</p>';
            return;
          }
          content = fileInput.files[0];
          contentType = fileInput.files[0].type;
          
          // Ensure content type matches
          if (contentType !== fragmentType) {
            statusDiv.innerHTML = `<p style="color: red;">Content-Type must match existing fragment type (${fragmentType})</p>`;
            return;
          }
        } else {
          const textarea = modal.querySelector('#updateContent');
          content = textarea.value.trim();
          contentType = fragmentType;
          
          if (!content) {
            statusDiv.innerHTML = '<p style="color: red;">Please enter content</p>';
            return;
          }
          
          // Validate JSON if needed
          if (contentType === 'application/json') {
            try {
              JSON.parse(content);
            } catch {
              statusDiv.innerHTML = '<p style="color: red;">Invalid JSON</p>';
              return;
            }
          }
        }
        
        await updateFragment(user, fragmentId, content, contentType);
        statusDiv.innerHTML = '<p style="color: green;">Fragment updated successfully!</p>';
        
        // Refresh fragments list
        setTimeout(async () => {
          document.body.removeChild(modal);
          await loadUserFragments(user);
        }, 1000);
      } catch (err) {
        statusDiv.innerHTML = `<p style="color: red;">Failed to update: ${err.message}</p>`;
      }
    };
    
    // Close handlers
    modal.querySelector('.close-modal').onclick = () => {
      document.body.removeChild(modal);
    };
    
    modal.querySelector('.cancel-btn').onclick = () => {
      document.body.removeChild(modal);
    };
    
    modal.onclick = (e) => {
      if (e.target === modal) {
        document.body.removeChild(modal);
      }
    };
    
    document.body.appendChild(modal);
  } catch (err) {
    alert(`Failed to load fragment for update: ${err.message}`);
  }
}

async function showConversionOptions(user, fragmentId, fragmentType) {
  // Map MIME types to file extensions
  const mimeToExtension = {
    'text/plain': 'txt',
    'text/markdown': 'md',
    'text/html': 'html',
    'text/csv': 'csv',
    'application/json': 'json',
    'application/yaml': 'yaml',
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/webp': 'webp',
    'image/gif': 'gif',
  };
  
  // Get base MIME type (without charset)
  const baseType = fragmentType.split(';')[0].trim();
  
  // Define available conversion types based on source type
  const textTypes = [
    { mime: 'text/plain', label: 'Plain Text (.txt)' },
    { mime: 'text/markdown', label: 'Markdown (.md)' },
    { mime: 'text/html', label: 'HTML (.html)' },
    { mime: 'text/csv', label: 'CSV (.csv)' },
    { mime: 'application/json', label: 'JSON (.json)' },
    { mime: 'application/yaml', label: 'YAML (.yaml)' },
  ];
  
  const imageTypes = [
    { mime: 'image/png', label: 'PNG (.png)' },
    { mime: 'image/jpeg', label: 'JPEG (.jpg)' },
    { mime: 'image/webp', label: 'WebP (.webp)' },
    { mime: 'image/gif', label: 'GIF (.gif)' },
  ];
  
  // Determine available conversions
  let availableTypes = [];
  if (textTypes.some(t => t.mime === baseType)) {
    availableTypes = textTypes.filter(t => t.mime !== baseType);
  } else if (imageTypes.some(t => t.mime === baseType)) {
    availableTypes = imageTypes.filter(t => t.mime !== baseType);
  }
  
  if (availableTypes.length === 0) {
    alert('No conversion options available for this fragment type.');
    return;
  }
  
  // Create modal for conversion
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.innerHTML = `
    <div class="modal-content">
      <span class="close-modal">&times;</span>
      <h3>Convert Fragment</h3>
      <p>Current type: <strong>${baseType}</strong></p>
      <p>Select target format:</p>
      <select id="conversionTarget" style="width: 100%; padding: 8px; margin: 10px 0;">
        ${availableTypes.map(type => 
          `<option value="${type.mime}">${type.label}</option>`
        ).join('')}
      </select>
      <div style="margin-top: 15px;">
        <button type="button" id="convertBtn">Convert & View</button>
        <button type="button" class="cancel-btn">Cancel</button>
      </div>
      <div id="conversionStatus" style="margin-top: 10px;"></div>
    </div>
  `;
  
  const convertBtn = modal.querySelector('#convertBtn');
  const statusDiv = modal.querySelector('#conversionStatus');
  
  convertBtn.onclick = async () => {
    const targetType = modal.querySelector('#conversionTarget').value;
    const extension = mimeToExtension[targetType];
    
    if (!extension) {
      statusDiv.innerHTML = '<p style="color: red;">Invalid target type</p>';
      return;
    }
    
    statusDiv.innerHTML = '<p>Converting fragment...</p>';
    
    try {
      const blob = await getFragmentData(user, fragmentId, extension);
      statusDiv.innerHTML = '<p style="color: green;">Conversion successful!</p>';
      
      // Show converted content
      setTimeout(() => {
        document.body.removeChild(modal);
        showConvertedContent(user, fragmentId, extension, blob, baseType, targetType);
      }, 500);
    } catch (err) {
      statusDiv.innerHTML = `<p style="color: red;">Conversion failed: ${err.message}</p>`;
    }
  };
  
  // Close handlers
  modal.querySelector('.close-modal').onclick = () => {
    document.body.removeChild(modal);
  };
  
  modal.querySelector('.cancel-btn').onclick = () => {
    document.body.removeChild(modal);
  };
  
  modal.onclick = (e) => {
    if (e.target === modal) {
      document.body.removeChild(modal);
    }
  };
  
  document.body.appendChild(modal);
}

async function showConvertedContent(user, fragmentId, extension, blob, sourceType, targetType) {
  // Create modal for viewing converted content
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.innerHTML = `
    <div class="modal-content">
      <span class="close-modal">&times;</span>
      <h3>Converted Fragment</h3>
      <p><strong>From:</strong> ${sourceType} → <strong>To:</strong> ${targetType}</p>
      <div id="convertedContentDisplay"></div>
    </div>
  `;
  
  const contentDisplay = modal.querySelector('#convertedContentDisplay');
  
  // Handle different content types
  if (blob.type.startsWith('image/')) {
    const imageUrl = URL.createObjectURL(blob);
    contentDisplay.innerHTML = `<img src="${imageUrl}" alt="Converted fragment" style="max-width: 100%;" />`;
  } else if (blob.type === 'application/json') {
    const text = await blob.text();
    try {
      const json = JSON.parse(text);
      contentDisplay.innerHTML = `<pre>${JSON.stringify(json, null, 2)}</pre>`;
    } catch {
      contentDisplay.innerHTML = `<pre>${text}</pre>`;
    }
  } else {
    const text = await blob.text();
    contentDisplay.innerHTML = `<pre>${escapeHtml(text)}</pre>`;
  }
  
  // Close modal handlers
  modal.querySelector('.close-modal').onclick = () => {
    document.body.removeChild(modal);
    // Clean up object URL if it's an image
    if (blob.type.startsWith('image/')) {
      const img = contentDisplay.querySelector('img');
      if (img && img.src.startsWith('blob:')) {
        URL.revokeObjectURL(img.src);
      }
    }
  };
  
  modal.onclick = (e) => {
    if (e.target === modal) {
      document.body.removeChild(modal);
      if (blob.type.startsWith('image/')) {
        const img = contentDisplay.querySelector('img');
        if (img && img.src.startsWith('blob:')) {
          URL.revokeObjectURL(img.src);
        }
      }
    }
  };
  
  document.body.appendChild(modal);
}

async function confirmAndDeleteFragment(user, fragmentId) {
  if (!confirm('Are you sure you want to delete this fragment? This action cannot be undone.')) {
    return;
  }
  
  try {
    await deleteFragment(user, fragmentId);
    alert('Fragment deleted successfully!');
    await loadUserFragments(user);
  } catch (err) {
    alert(`Failed to delete fragment: ${err.message}`);
  }
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

async function init() {
  // Get our UI elements
  const userSection = document.querySelector('#user');
  const loginBtn = document.querySelector('#login');
  const logoutBtn = document.querySelector('#logout');
  
  // Wire up event handlers
  loginBtn.onclick = () => {
    signIn();
  };
  
  logoutBtn.onclick = async () => {
    // Sign out via Cognito
    await signOut();
  };
  
  // See if we're signed in
  const user = await getUser();
  if (!user) {
    return;
  }
  
  currentUser = user;
  
  // Update the UI to welcome the user
  userSection.hidden = false;
  loginBtn.hidden = true;
  logoutBtn.hidden = false;
  
  // Show the user's username
  userSection.querySelector('.username').innerText = user.username;
  
  // Load user fragments
  await loadUserFragments(user);
  
  // Set up the create fragment form
  const createForm = document.querySelector('#createFragmentForm');
  const statusDiv = document.querySelector('#createStatus');
  
  createForm.onsubmit = async (e) => {
    e.preventDefault();
    const textArea = document.querySelector('#fragmentText');
    const fileInput = document.querySelector('#fragmentFile');
    const typeSelect = document.querySelector('#fragmentType');
    const contentType = typeSelect.value;
    
    // Check if it's an image type and file is provided
    const isImage = contentType.startsWith('image/');
    let content;
    let actualContentType = contentType;
    
    if (isImage) {
      if (!fileInput.files || !fileInput.files[0]) {
        statusDiv.innerHTML = '<p style="color: red;">Please select an image file</p>';
        return;
      }
      const file = fileInput.files[0];
      content = file;
      
      // Use the file's actual MIME type if available and valid
      if (file.type && file.type.startsWith('image/')) {
        // Validate the file type is supported
        const supportedImageTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
        if (supportedImageTypes.includes(file.type)) {
          actualContentType = file.type;
        } else {
          // File type not supported, use selected type
          actualContentType = contentType;
          console.warn('File type', file.type, 'not supported, using selected type', contentType);
        }
      } else {
        // File doesn't have a type or it's not an image, use the selected type
        actualContentType = contentType;
        console.warn('File has no type or invalid type, using selected type', contentType);
      }
      
      // Ensure we're using a supported image type
      const supportedImageTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
      if (!supportedImageTypes.includes(actualContentType)) {
        statusDiv.innerHTML = '<p style="color: red;">Unsupported image type. Please use PNG, JPEG, WebP, or GIF.</p>';
        return;
      }
    } else {
      content = textArea.value.trim();
      if (!content) {
        statusDiv.innerHTML = '<p style="color: red;">Please enter content for your fragment</p>';
        return;
      }
      
      // Validate JSON if content type is application/json
      if (contentType === 'application/json') {
        try {
          JSON.parse(content);
        } catch (err) {
          statusDiv.innerHTML = '<p style="color: red;">Invalid JSON. Please check your JSON syntax.</p>';
          return;
        }
      }
    }
    
    statusDiv.innerHTML = '<p>Creating fragment...</p>';
    
    try {
      const result = await createFragment(user, content, actualContentType);
      
      // Clear the form
      if (isImage) {
        fileInput.value = '';
      } else {
        textArea.value = '';
      }
      
      // Build success message
      let successMsg = '<p style="color: green;"><strong>Fragment created successfully!</strong></p>';
      if (result && result.fragment && result.fragment.id) {
        successMsg += `<p style="font-size: 0.9em; color: #666;">Fragment ID: ${result.fragment.id}</p>`;
        if (result.location) {
          successMsg += `<p style="font-size: 0.9em; color: #0066cc;"><strong>Location:</strong> <code>${result.location}</code></p>`;
        }
      }
      statusDiv.innerHTML = successMsg;
      
      // Refresh the fragments list
      await loadUserFragments(user);
      
      // Clear success message after 5 seconds
      setTimeout(() => {
        statusDiv.innerHTML = '';
      }, 5000);
    } catch (err) {
      console.error('Failed to create fragment:', err);
      statusDiv.innerHTML = `<p style="color: red;">Failed to create fragment: ${err.message}</p>`;
    }
  };
  
  // Show/hide file input based on fragment type
  const typeSelect = document.querySelector('#fragmentType');
  const textArea = document.querySelector('#fragmentText');
  const fileInput = document.querySelector('#fragmentFile');
  const fileInputContainer = document.querySelector('#fileInputContainer');
  
  typeSelect.onchange = () => {
    const isImage = typeSelect.value.startsWith('image/');
    if (isImage) {
      textArea.style.display = 'none';
      fileInputContainer.style.display = 'block';
    } else {
      textArea.style.display = 'block';
      fileInputContainer.style.display = 'none';
    }
  };
}

// Wait for the DOM to be ready, then start the app
addEventListener('DOMContentLoaded', init);
