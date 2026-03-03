# Listing Page UX Improvements - Design Document

## 1. Architecture Overview

This is a frontend-only enhancement to `public/listing.html`. All backend APIs already exist and are functional. The design focuses on UI/UX improvements, component reorganization, and enhanced user interactions.

### 1.1 Design Principles
- **Progressive Enhancement**: Features degrade gracefully if APIs fail
- **Immediate Feedback**: All user actions provide instant visual feedback
- **Consistency**: Maintain existing design language and styling
- **Reusability**: Leverage existing backend functionality from media-test.html

## 2. Tile Reorganization

### 2.1 New Tile Order
```
Current Order:                    New Order:
1. Create New Listing        →    1. Grade Produce (was tile 4)
2. My Listings              →    2. Create New Listing (was tile 1)
3. Listing Details          →    3. My Listings (was tile 2)
4. Quality Grading          →    4. Listing Details (was tile 3)
5. Quality Certificates     →    5. Quality Certificates (unchanged)
```

### 2.2 Tile Number Updates
- Update all `<span class="tile-number">` elements
- Update tile IDs: `tile1` → `tile4`, `tile4` → `tile1`, etc.
- Maintain CSS grid layout (no changes needed)

## 3. Grade Produce Tile (New Tile 1)

### 3.1 Title Change
```html
<!-- Before -->
<h2><span class="tile-number">4</span> Quality Grading</h2>

<!-- After -->
<h2><span class="tile-number">1</span> Grade Produce</h2>
```

### 3.2 Certificate Download Feature

#### 3.2.1 UI Components
```html
<div id="gradingDisplay">
  <h4>Grading Results</h4>
  <div id="gradingDetails">
    <!-- Existing grading info -->
  </div>
  
  <!-- NEW: Download button -->
  <button onclick="downloadCertificate()" class="download-cert-btn">
    📥 Download Certificate
  </button>
</div>
```

#### 3.2.2 Certificate Download Implementation
```javascript
async function downloadCertificate() {
  if (!state.currentCertificate) {
    alert('No certificate available');
    return;
  }
  
  // Generate certificate image using HTML5 Canvas
  const canvas = document.createElement('canvas');
  canvas.width = 800;
  canvas.height = 600;
  const ctx = canvas.getContext('2d');
  
  // Draw certificate background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, 800, 600);
  
  // Draw border
  ctx.strokeStyle = '#667eea';
  ctx.lineWidth = 10;
  ctx.strokeRect(20, 20, 760, 560);
  
  // Draw header
  ctx.fillStyle = '#667eea';
  ctx.font = 'bold 36px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('Quality Certificate', 400, 80);
  
  // Draw certificate details
  ctx.fillStyle = '#333';
  ctx.font = '20px Arial';
  ctx.textAlign = 'left';
  
  const cert = state.currentCertificate;
  const details = [
    `Certificate ID: ${cert.id}`,
    `Crop: ${cert.produceType}`,
    `Grade: ${cert.grade}`,
    `Confidence: ${(cert.confidence * 100).toFixed(1)}%`,
    `Date: ${new Date(cert.timestamp).toLocaleDateString()}`,
    `Geotag: ${cert.geotag || 'Not certified, user uploaded image'}`,
    `Farmer ID: ${state.farmerId}`
  ];
  
  let y = 150;
  details.forEach(detail => {
    ctx.fillText(detail, 60, y);
    y += 40;
  });
  
  // Draw grade badge
  const gradeColor = cert.grade === 'A' ? '#28a745' : 
                     cert.grade === 'B' ? '#17a2b8' : '#ffc107';
  ctx.fillStyle = gradeColor;
  ctx.fillRect(600, 450, 150, 80);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 48px Arial';
  ctx.textAlign = 'center';
  ctx.fillText(cert.grade, 675, 505);
  
  // Convert to blob and download
  canvas.toBlob(blob => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `certificate-${cert.id}.png`;
    a.click();
    URL.revokeObjectURL(url);
  });
}
```

### 3.3 Geotag Integration

#### 3.3.1 Capture Geotag During Grading
```javascript
// Modify gradeProduceProduce() function
async function gradeProduceProduce() {
  // ... existing code ...
  
  // Enhanced location capture
  const location = await new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve({ lat: null, lng: null, error: 'Geolocation not supported' });
      return;
    }
    
    navigator.geolocation.getCurrentPosition(
      (position) => resolve({
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        accuracy: position.coords.accuracy
      }),
      (error) => resolve({ 
        lat: null, 
        lng: null, 
        error: error.message 
      })
    );
  });
  
  // Add to form data
  if (location.lat && location.lng) {
    formData.append('geotag', JSON.stringify({
      lat: location.lat,
      lng: location.lng,
      accuracy: location.accuracy
    }));
  }
  
  // ... rest of function ...
}
```

#### 3.3.2 Display Geotag in Results
```javascript
// Update gradingDetails display
document.getElementById('gradingDetails').innerHTML = `
  <div style="display: grid; gap: 10px;">
    <p><strong>Crop:</strong> ${data.analysis.detectedCrop || 'Unknown'}</p>
    <p><strong>Grade:</strong> <span class="grade-badge ${gradeClass}">${data.gradingResult.grade}</span></p>
    <p><strong>Confidence:</strong> ${(data.gradingResult.confidence * 100).toFixed(1)}%</p>
    <p><strong>Certificate ID:</strong> ${data.certificate.id}</p>
    <p><strong>Timestamp:</strong> ${new Date(data.certificate.timestamp).toLocaleString()}</p>
    <p><strong>Geotag:</strong> ${
      data.certificate.geotag 
        ? `${data.certificate.geotag.lat.toFixed(6)}, ${data.certificate.geotag.lng.toFixed(6)}`
        : '<em>Not certified, user uploaded image</em>'
    }</p>
  </div>
  <button onclick="downloadCertificate()" style="margin-top: 15px;">
    📥 Download Certificate
  </button>
  <button onclick="addCertificateToListing('${data.certificate.id}')" style="margin-top: 10px;">
    📋 Add Certificate to Selected Listing
  </button>
`;
```

## 4. Create New Listing Tile (New Tile 2)

### 4.1 Certificate Attachment Checkbox

#### 4.1.1 UI Component
```html
<div class="form-group">
  <label>
    <input type="checkbox" id="attachCertificate" onchange="toggleCertificateAttachment()">
    Attach quality certificate to this listing
  </label>
  <p class="info-text" id="certificateInfo">
    No certificate available. Grade your produce first.
  </p>
</div>
```

#### 4.1.2 Certificate Attachment Logic
```javascript
function toggleCertificateAttachment() {
  const checkbox = document.getElementById('attachCertificate');
  const info = document.getElementById('certificateInfo');
  
  if (!state.currentCertificate) {
    checkbox.checked = false;
    info.textContent = 'No certificate available. Grade your produce first.';
    info.style.color = '#dc3545';
    return;
  }
  
  if (checkbox.checked) {
    info.textContent = `Certificate ${state.currentCertificate.id} will be attached`;
    info.style.color = '#28a745';
  } else {
    info.textContent = 'Certificate will not be attached';
    info.style.color = '#666';
  }
}

// Update createListing() to include certificate
async function createListing() {
  // ... existing code ...
  
  const attachCert = document.getElementById('attachCertificate').checked;
  
  if (attachCert && state.currentCertificate) {
    // Generate certificate image as blob
    const certBlob = await generateCertificateBlob(state.currentCertificate);
    formData.append('media', certBlob, `certificate-${state.currentCertificate.id}.png`);
  }
  
  // ... rest of function ...
}

async function generateCertificateBlob(certificate) {
  // Reuse certificate generation logic from downloadCertificate()
  // Return blob instead of downloading
  const canvas = createCertificateCanvas(certificate);
  return new Promise(resolve => {
    canvas.toBlob(blob => resolve(blob));
  });
}
```

### 4.2 Image Reordering Preview

#### 4.2.1 Enhanced Preview Grid
```html
<div id="createMediaPreview" class="media-preview-reorder hidden">
  <!-- Dynamically populated with draggable items -->
</div>
```

#### 4.2.2 CSS for Draggable Items
```css
.media-preview-reorder {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 15px;
  padding: 15px;
  background: #f8f9fa;
  border-radius: 8px;
}

.preview-item-draggable {
  position: relative;
  border: 3px solid #e0e0e0;
  border-radius: 8px;
  cursor: move;
  transition: all 0.3s;
}

.preview-item-draggable.dragging {
  opacity: 0.5;
  transform: scale(0.95);
}

.preview-item-draggable.primary {
  border-color: #28a745;
  box-shadow: 0 0 10px rgba(40, 167, 69, 0.3);
}

.preview-item-draggable .primary-badge {
  position: absolute;
  top: 5px;
  right: 5px;
  background: #28a745;
  color: white;
  padding: 3px 8px;
  border-radius: 5px;
  font-size: 10px;
  font-weight: 600;
}

.preview-item-draggable img {
  width: 100%;
  height: 120px;
  object-fit: cover;
  border-radius: 5px;
}

.preview-actions {
  display: flex;
  gap: 5px;
  padding: 5px;
  justify-content: center;
  background: white;
}

.preview-actions button {
  padding: 5px 10px;
  font-size: 12px;
  width: auto;
  margin: 0;
}
```

#### 4.2.3 Drag-and-Drop Implementation
```javascript
let draggedIndex = null;
let previewFiles = [];

function previewCreateFiles() {
  const fileInput = document.getElementById('createMediaFiles');
  const preview = document.getElementById('createMediaPreview');
  const files = Array.from(fileInput.files);
  
  if (files.length === 0) {
    preview.classList.add('hidden');
    previewFiles = [];
    return;
  }
  
  previewFiles = files;
  renderPreviewGrid();
}

function renderPreviewGrid() {
  const preview = document.getElementById('createMediaPreview');
  preview.classList.remove('hidden');
  preview.innerHTML = '';
  
  previewFiles.forEach((file, index) => {
    const item = document.createElement('div');
    item.className = 'preview-item-draggable';
    item.draggable = true;
    item.dataset.index = index;
    
    if (index === 0) {
      item.classList.add('primary');
      item.innerHTML = '<div class="primary-badge">PRIMARY</div>';
    }
    
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = document.createElement('img');
        img.src = e.target.result;
        item.appendChild(img);
        
        const actions = document.createElement('div');
        actions.className = 'preview-actions';
        actions.innerHTML = `
          ${index > 0 ? `<button onclick="movePreviewItem(${index}, -1)">⬅️</button>` : ''}
          ${index !== 0 ? `<button onclick="setPrimaryPreview(${index})">⭐</button>` : ''}
          ${index < previewFiles.length - 1 ? `<button onclick="movePreviewItem(${index}, 1)">➡️</button>` : ''}
        `;
        item.appendChild(actions);
      };
      reader.readAsDataURL(file);
    }
    
    // Drag events
    item.addEventListener('dragstart', handleDragStart);
    item.addEventListener('dragover', handleDragOver);
    item.addEventListener('drop', handleDrop);
    item.addEventListener('dragend', handleDragEnd);
    
    preview.appendChild(item);
  });
}

function handleDragStart(e) {
  draggedIndex = parseInt(e.target.dataset.index);
  e.target.classList.add('dragging');
}

function handleDragOver(e) {
  e.preventDefault();
}

function handleDrop(e) {
  e.preventDefault();
  const dropIndex = parseInt(e.target.closest('.preview-item-draggable').dataset.index);
  
  if (draggedIndex !== null && draggedIndex !== dropIndex) {
    // Swap files
    const temp = previewFiles[draggedIndex];
    previewFiles[draggedIndex] = previewFiles[dropIndex];
    previewFiles[dropIndex] = temp;
    
    renderPreviewGrid();
  }
}

function handleDragEnd(e) {
  e.target.classList.remove('dragging');
  draggedIndex = null;
}

function movePreviewItem(index, direction) {
  const newIndex = index + direction;
  if (newIndex < 0 || newIndex >= previewFiles.length) return;
  
  const temp = previewFiles[index];
  previewFiles[index] = previewFiles[newIndex];
  previewFiles[newIndex] = temp;
  
  renderPreviewGrid();
}

function setPrimaryPreview(index) {
  const temp = previewFiles[index];
  previewFiles.splice(index, 1);
  previewFiles.unshift(temp);
  
  renderPreviewGrid();
}

// Update createListing() to use reordered files
async function createListing() {
  // ... existing code ...
  
  // Use previewFiles instead of fileInput.files
  if (previewFiles.length > 0) {
    for (let i = 0; i < previewFiles.length; i++) {
      formData.append('media', previewFiles[i]);
    }
  }
  
  // ... rest of function ...
}
```

## 5. My Listings Tile (New Tile 3)

### 5.1 Auto-Load on Page Load

#### 5.1.1 Remove Load Button
```html
<!-- REMOVE THIS -->
<button id="loadListingsBtn" onclick="loadMyListings()" disabled>Load My Listings</button>

<!-- KEEP THIS -->
<div id="myListingsContainer"></div>
<div id="loadListingsResult" class="result"></div>
```

#### 5.1.2 Auto-Load Implementation
```javascript
// Update DOMContentLoaded event
document.addEventListener('DOMContentLoaded', () => {
  console.log('[Listing] Page loaded, checking login status...');
  loadFarmerId();
  
  // Auto-load listings if logged in
  if (state.isLoggedIn) {
    loadMyListings();
  }
  
  // Check login status periodically
  setInterval(() => {
    const wasLoggedIn = state.isLoggedIn;
    checkLoginStatus();
    
    // If just logged in, load listings
    if (!wasLoggedIn && state.isLoggedIn) {
      loadMyListings();
    }
  }, 5000);
  
  // ... rest of initialization ...
});

// Update createListing() to auto-refresh
async function createListing() {
  // ... existing code ...
  
  // After successful creation
  showResult('createResult', message, false);
  
  // Clear form
  // ... existing clear code ...
  
  // Auto-refresh listings (no timeout needed)
  await loadMyListings();
}
```

## 6. Listing Details Tile (New Tile 4)

### 6.1 Title Change
```html
<!-- Before -->
<h2><span class="tile-number">3</span> Listing Details & Media</h2>

<!-- After -->
<h2><span class="tile-number">4</span> Listing Details</h2>
```

### 6.2 Media Management in View Mode

The current implementation already has media management in view mode. No changes needed - just verify it works correctly.

#### 6.2.1 Existing Features (Verify)
- ✅ Media grid displayed in view mode
- ✅ Upload additional media
- ✅ Reorder media (left/right arrows)
- ✅ Set primary media
- ✅ Delete media

## 7. Data Purge Endpoint Verification

### 7.1 Test Script
```javascript
// Add to data-purge.html or create separate test
async function verifyEndpoints() {
  const results = {
    deleteMedia: null,
    deleteListings: null,
    cleanAllData: null
  };
  
  // Test 1: Delete Media
  try {
    const response = await fetch(`${API_BASE}/dev/delete-media`, {
      method: 'POST'
    });
    results.deleteMedia = {
      status: response.status,
      ok: response.ok,
      data: await response.json()
    };
  } catch (error) {
    results.deleteMedia = { error: error.message };
  }
  
  // Test 2: Delete Listings
  try {
    const response = await fetch(`${API_BASE}/dev/delete-listings`, {
      method: 'POST'
    });
    results.deleteListings = {
      status: response.status,
      ok: response.ok,
      data: await response.json()
    };
  } catch (error) {
    results.deleteListings = { error: error.message };
  }
  
  // Test 3: Clean All Data
  try {
    const response = await fetch(`${API_BASE}/dev/clean-all-data`, {
      method: 'POST'
    });
    results.cleanAllData = {
      status: response.status,
      ok: response.ok,
      data: await response.json()
    };
  } catch (error) {
    results.cleanAllData = { error: error.message };
  }
  
  console.log('Endpoint Verification Results:', results);
  return results;
}
```

## 8. State Management Updates

### 8.1 Enhanced State Object
```javascript
let state = {
  farmerId: null,
  loggedInUserName: null,
  isLoggedIn: false,
  selectedListingId: null,
  myListings: [],
  originalListing: null,
  mediaList: [],
  certificates: [],
  currentCertificate: null,  // Already exists
  previewFiles: [],          // NEW: For image reordering
  certificateAttached: false // NEW: Track certificate attachment
};
```

## 9. Error Handling

### 9.1 Geolocation Permission Denied
```javascript
// Show user-friendly message
if (location.error) {
  showResult('gradingResult', 
    `⚠️ Geolocation unavailable: ${location.error}. Certificate will be marked as "user uploaded".`,
    false
  );
}
```

### 9.2 Certificate Generation Failure
```javascript
try {
  const certBlob = await generateCertificateBlob(state.currentCertificate);
  formData.append('media', certBlob, `certificate-${state.currentCertificate.id}.png`);
} catch (error) {
  console.error('Certificate generation failed:', error);
  showResult('createResult', 
    '⚠️ Listing created but certificate attachment failed',
    false
  );
}
```

## 10. Testing Checklist

### 10.1 Manual Testing
- [ ] Tiles appear in correct order (1-5)
- [ ] Grade Produce tile is first
- [ ] Certificate downloads as PNG
- [ ] Geotag appears in certificate
- [ ] Certificate checkbox works
- [ ] Certificate attaches to listing
- [ ] Listings auto-load on page load
- [ ] Listings refresh after creation
- [ ] Image preview shows all files
- [ ] Drag-and-drop reordering works
- [ ] Arrow button reordering works
- [ ] Primary image selection works
- [ ] First image is primary by default
- [ ] Media management works in view mode
- [ ] Data purge endpoints respond correctly

### 10.2 Browser Testing
- [ ] Chrome
- [ ] Firefox
- [ ] Safari
- [ ] Edge

### 10.3 Responsive Testing
- [ ] Desktop (1920x1080)
- [ ] Tablet (768x1024)
- [ ] Mobile (375x667)

## 11. Performance Considerations

### 11.1 Image Preview Optimization
- Limit preview to first 10 images
- Use thumbnail generation for large images
- Lazy load preview images

### 11.2 Auto-Load Throttling
- Only auto-load once on page load
- Debounce login status checks
- Cache listings for 30 seconds

## 12. Accessibility

### 12.1 Keyboard Navigation
- Drag-and-drop items also accessible via keyboard
- Tab order follows visual order
- Focus indicators on all interactive elements

### 12.2 Screen Reader Support
- ARIA labels for drag-and-drop
- Status announcements for auto-load
- Alt text for certificate images

## 13. Implementation Priority

### Phase 1 (High Priority)
1. Tile reordering
2. Auto-load listings
3. Certificate download

### Phase 2 (Medium Priority)
4. Certificate attachment checkbox
5. Image reordering preview
6. Geotag display

### Phase 3 (Low Priority)
7. Data purge verification
8. Performance optimizations
9. Accessibility enhancements
