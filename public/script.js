// public/script.js - Upload with Canvas Display Version (Fixed)
console.log('📤 Upload & Canvas Script Loaded');

// Global variables to prevent duplicates
let isUploading = false;
let uploadListenersAttached = false;
let canvas, ctx, uploadedImageUrl = null;

// File upload handling
document.addEventListener('DOMContentLoaded', function() {
    console.log('📄 DOM Content Loaded');
    
    // Attach listeners only once
    if (!uploadListenersAttached) {
        attachUploadListeners();
        uploadListenersAttached = true;
    }
    
    // Initialize canvas
    initCanvas();
});

function attachUploadListeners() {
    const fileInput = document.getElementById('fileInput');
    const uploadBtn = document.getElementById('uploadBtn');
    
    if (fileInput) {
        // Remove any existing listeners to prevent duplicates
        fileInput.removeEventListener('change', handleFileSelect);
        fileInput.addEventListener('change', handleFileSelect);
        console.log('✅ File input listener attached (single)');
    } else {
        console.error('❌ File input element not found');
    }
    
    if (uploadBtn) {
        // Remove any existing listeners by cloning the button
        const newUploadBtn = uploadBtn.cloneNode(true);
        uploadBtn.parentNode.replaceChild(newUploadBtn, uploadBtn);
        newUploadBtn.addEventListener('click', handleUploadClick);
        console.log('✅ Upload button listener attached (single - recreated)');
    } else {
        console.error('❌ Upload button element not found');
    }
}

function initCanvas() {
    const canvasElement = document.getElementById('imageCanvas');
    if (canvasElement) {
        canvas = canvasElement;
        ctx = canvas.getContext('2d');
        
        // Set initial canvas background
        ctx.fillStyle = '#f8f9fa';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw placeholder text
        ctx.fillStyle = '#6c757d';
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Upload an image to see it here', canvas.width/2, canvas.height/2);
        
        console.log('🖼️ Canvas initialized:', canvas.width, 'x', canvas.height);
    } else {
        console.error('❌ Canvas element not found');
    }
}

function handleFileSelect(event) {
    const file = event.target.files[0];
    if (file) {
        console.log('📸 Selected file:', {
            name: file.name,
            type: file.type,
            size: file.size,
            lastModified: new Date(file.lastModified).toLocaleString()
        });
        
        const fileNameDisplay = document.getElementById('fileNameDisplay');
        if (fileNameDisplay) {
            fileNameDisplay.textContent = `${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`;
        }
    }
}

async function handleUploadClick(event) {
    event.preventDefault();
    event.stopPropagation();
    
    console.log('🖱️ Upload button clicked');
    
    // Check if upload is already in progress
    if (isUploading) {
        console.log('⏳ Upload already in progress, ignoring duplicate click');
        return;
    }
    
    // Start the upload process
    try {
        await handleUpload();
    } catch (error) {
        console.error('❌ Upload process failed:', error);
    }
}

async function handleUpload() {
    console.log('🎯 handleUpload() called');
    
    // Final validation
    const fileInput = document.getElementById('fileInput');
    const file = fileInput ? fileInput.files[0] : null;
    
    if (!file) {
        console.log('❌ No file selected');
        alert('Please select a file first!');
        return;
    }
    
    // Double-check upload state
    if (isUploading) {
        console.log('⏳ Upload already in progress - aborting');
        return;
    }
    
    console.log('✅ Starting upload process for:', file.name);
    
    // Get DOM elements BEFORE setting the flag
    const uploadBtn = document.getElementById('uploadBtn');
    const status = document.getElementById('status');
    const canvasInfo = document.getElementById('canvasInfo');
    const originalText = uploadBtn ? uploadBtn.textContent : 'Upload & Display';
    
    // Show loading state BEFORE setting the flag
    if (uploadBtn) {
        uploadBtn.textContent = 'Uploading...';
        uploadBtn.disabled = true;
    }
    
    if (status) {
        status.textContent = 'Uploading file...';
        status.className = 'status loading';
    }
    
    if (canvasInfo) {
        canvasInfo.textContent = 'Uploading and preparing image...';
    }
    
    // NOW set the uploading flag AFTER UI is updated
    isUploading = true;
    console.log('🔒 isUploading set to TRUE');
    
    let uploadResult = null;
    
    try {
        console.log('🚀 Initiating upload for:', file.name);
        uploadResult = await uploadPhoto(file);
        
        console.log('✅ Upload completed successfully');
        
        if (uploadResult && uploadResult.success) {
            console.log('🎉 UPLOAD SUCCESSFUL!', {
                originalName: uploadResult.originalName,
                filename: uploadResult.filename,
                size: uploadResult.size,
                mimetype: uploadResult.mimetype,
                url: uploadResult.url,
                timestamp: new Date().toLocaleString()
            });
            
            // Update UI
            if (status) {
                status.innerHTML = `
                    <strong>✅ Uploaded successfully!</strong><br>
                    <small>File: ${uploadResult.originalName}<br>
                    Size: ${(uploadResult.size / 1024 / 1024).toFixed(2)} MB<br>
                    Saved as: ${uploadResult.filename}</small>
                `;
                status.className = 'status success';
            }
            
            // Clear file input
            if (fileInput) {
                fileInput.value = '';
            }
            const fileNameDisplay = document.getElementById('fileNameDisplay');
            if (fileNameDisplay) {
                fileNameDisplay.textContent = '';
            }
            
            // Store the uploaded image URL
            uploadedImageUrl = uploadResult.url;
            
            // Display image in canvas
            await displayImageInCanvas(uploadResult.url);
            
            alert(`File "${uploadResult.originalName}" uploaded and displayed successfully!`);
        } else {
            throw new Error('Upload completed but no success response');
        }
        
    } catch (error) {
        console.error('❌ UPLOAD FAILED:', error.message);
        
        if (status) {
            status.textContent = `❌ Upload failed: ${error.message}`;
            status.className = 'status error';
        }
        
        if (canvasInfo) {
            canvasInfo.textContent = 'Upload failed - please try again';
        }
        
        alert(`Upload failed: ${error.message}`);
        
    } finally {
        // Always reset the upload state
        console.log('🔓 isUploading set to FALSE');
        isUploading = false;
        
        // Reset button
        if (uploadBtn) {
            uploadBtn.textContent = originalText;
            uploadBtn.disabled = false;
        }
        
        // Log final state
        console.log('✅ Upload process completed. isUploading:', isUploading);
    }
}

// Function to display uploaded image in canvas
async function displayImageInCanvas(imageUrl) {
    console.log('🖼️ Displaying image in canvas:', imageUrl);
    
    if (!canvas || !ctx) {
        console.error('❌ Canvas not initialized');
        return;
    }
    
    try {
        // Create image object
        const image = new Image();
        image.crossOrigin = 'anonymous'; // For CORS if needed
        
        // Wait for image to load
        await new Promise((resolve, reject) => {
            image.onload = () => {
                console.log('✅ Image loaded for canvas:', {
                    naturalWidth: image.naturalWidth,
                    naturalHeight: image.naturalHeight,
                    url: imageUrl
                });
                resolve(image);
            };
            
            image.onerror = (error) => {
                console.error('❌ Failed to load image for canvas:', error);
                reject(new Error('Failed to load image for canvas display'));
            };
            
            // Use full URL for the image
            const fullUrl = imageUrl.startsWith('http') ? imageUrl : `http://localhost:3000${imageUrl}`;
            console.log('📡 Loading image from:', fullUrl);
            image.src = fullUrl;
        });
        
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Calculate how to fit the image in the canvas while maintaining aspect ratio
        const canvasRatio = canvas.width / canvas.height;
        const imageRatio = image.naturalWidth / image.naturalHeight;
        
        let drawWidth, drawHeight, offsetX = 0, offsetY = 0;
        
        if (imageRatio > canvasRatio) {
            // Image is wider than canvas - fit to height
            drawHeight = canvas.height;
            drawWidth = canvas.height * imageRatio;
            offsetX = (canvas.width - drawWidth) / 2;
        } else {
            // Image is taller than canvas - fit to width
            drawWidth = canvas.width;
            drawHeight = canvas.width / imageRatio;
            offsetY = (canvas.height - drawHeight) / 2;
        }
        
        // Fill canvas with light background
        ctx.fillStyle = '#f8f9fa';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw the image
        ctx.drawImage(image, offsetX, offsetY, drawWidth, drawHeight);
        
        // Add a subtle border
        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 2;
        ctx.strokeRect(0, 0, canvas.width, canvas.height);
        
        // Update canvas info
        const canvasInfo = document.getElementById('canvasInfo');
        if (canvasInfo) {
            canvasInfo.innerHTML = `
                <strong>✅ Image displayed!</strong><br>
                <small>Original: ${image.naturalWidth}×${image.naturalHeight} | 
                Canvas: ${canvas.width}×${canvas.height} | 
                <a href="${imageUrl}" target="_blank">View Original</a></small>
            `;
        }
        
        console.log('🎨 Image successfully displayed in canvas');
        
    } catch (error) {
        console.error('❌ Failed to display image in canvas:', error);
        
        // Show error on canvas
        ctx.fillStyle = '#f8d7da';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#721c24';
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Failed to load image', canvas.width/2, canvas.height/2 - 20);
        ctx.fillText('Check console for details', canvas.width/2, canvas.height/2 + 20);
        
        const canvasInfo = document.getElementById('canvasInfo');
        if (canvasInfo) {
            canvasInfo.textContent = `❌ Failed to display image: ${error.message}`;
        }
    }
}

async function uploadPhoto(file) {
    console.log('📤 uploadPhoto() called for:', file.name);
    
    const formData = new FormData();
    formData.append('file', file);
    
    try {
        console.log('📡 Making HTTP request to server...');
        
        const response = await fetch('http://localhost:3000/upload', {
            method: 'POST',
            body: formData
        });
        
        console.log('📡 Server response status:', response.status);
        
        if (!response.ok) {
            let errorData = { error: `HTTP ${response.status}: ${response.statusText}` };
            try {
                errorData = await response.json();
                console.log('📡 Error response body:', errorData);
            } catch (parseError) {
                console.log('📡 Could not parse error response as JSON');
                const textResponse = await response.text();
                console.log('📡 Raw error response:', textResponse);
            }
            
            throw new Error(errorData.error || 'Upload failed');
        }
        
        const result = await response.json();
        console.log('📦 Upload result received:', result);
        
        if (!result.success) {
            throw new Error(result.error || 'Upload failed');
        }
        
        return result;
        
    } catch (error) {
        console.error('💥 Upload error details:', {
            message: error.message,
            name: error.name,
            stack: error.stack?.substring(0, 200)
        });
        throw error;
    }
}

// Debug functions for testing
window.testUpload = async () => {
    console.log('🧪 Testing upload endpoint...');
    try {
        const response = await fetch('http://localhost:3000/upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ test: 'data' })
        });
        const data = await response.text();
        console.log('🧪 Test response:', response.status, data);
    } catch (error) {
        console.error('🧪 Test failed:', error);
    }
};

window.listUploads = async () => {
    console.log('📁 Fetching uploaded files...');
    try {
        const response = await fetch('http://localhost:3000/uploads');
        const data = await response.json();
        console.log('📁 Uploads list:', data);
        alert(`${data.count || 0} files uploaded`);
    } catch (error) {
        console.error('❌ Failed to fetch uploads:', error);
    }
};

window.checkServer = async () => {
    console.log('🏥 Checking server health...');
    try {
        const response = await fetch('http://localhost:3000/health');
        const data = await response.json();
        console.log('🏥 Server health:', data);
        alert(`Server is ${data.status} at ${data.timestamp}`);
    } catch (error) {
        console.error('❌ Server check failed:', error);
        alert('Server not responding');
    }
};

// Debug function to check upload state
window.debugUploadState = () => {
    console.log('🔍 Upload Debug State:', {
        isUploading,
        uploadListenersAttached,
        uploadedImageUrl,
        canvas: canvas ? `${canvas.width}x${canvas.height}` : 'not initialized',
        timestamp: new Date().toISOString()
    });
};

// Additional canvas debug functions
window.clearCanvas = () => {
    if (canvas && ctx) {
        ctx.fillStyle = '#f8f9fa';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#6c757d';
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Canvas cleared', canvas.width/2, canvas.height/2);
        
        const canvasInfo = document.getElementById('canvasInfo');
        if (canvasInfo) {
            canvasInfo.textContent = 'Canvas cleared - upload a new image';
        }
        
        uploadedImageUrl = null;
        console.log('🧹 Canvas cleared');
    }
};

window.reloadCanvas = async () => {
    if (uploadedImageUrl) {
        console.log('🔄 Reloading image in canvas:', uploadedImageUrl);
        await displayImageInCanvas(uploadedImageUrl);
    } else {
        console.log('ℹ️ No image to reload');
        alert('No image loaded yet. Please upload an image first.');
    }
};

// Export for HTML onclick handlers
window.handleUpload = handleUpload;