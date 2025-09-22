const express = require('express');
const multer = require('multer');
const path = require('path');
const cors = require('cors');
const fs = require('fs');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from public folder
app.use(express.static(path.join(__dirname, '../public')));

// Create uploads directory if it doesn't exist
const uploadDir = path.join(__dirname, '../public/uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
    console.log(`📁 Created uploads directory: ${uploadDir}`);
}

// Track active uploads to detect duplicates
const uploadSessions = new Map();

// File upload setup
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        // Generate unique filename
        const timestamp = Date.now();
        const random = Math.round(Math.random() * 1E9);
        const extension = path.extname(file.originalname);
        const filename = `${timestamp}-${random}${extension}`;
        cb(null, filename);
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter: (req, file, cb) => {
        // Accept image files and common 3D formats
        const allowedTypes = [
            'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
            'model/gltf', 'model/glb', 'model/obj'
        ];
        
        if (allowedTypes.some(type => file.mimetype === type) || 
            file.originalname.match(/\.(jpg|jpeg|png|gif|webp|gltf|glb|obj)$/i)) {
            cb(null, true);
        } else {
            cb(new Error('Only image files and 3D models are allowed!'), false);
        }
    }
});

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Upload endpoint
app.post('/upload', upload.single('file'), (req, res) => {
    const startTime = Date.now();
    console.log('\n' + '='.repeat(60));
    console.log(`📤 NEW UPLOAD REQUEST - ${new Date().toLocaleString()}`);
    console.log('='.repeat(60));
    
    console.log('📋 Request details:');
    console.log(`   Method: ${req.method}`);
    console.log(`   URL: ${req.url}`);
    console.log(`   IP: ${req.ip || 'unknown'}`);
    console.log(`   User-Agent: ${req.get('User-Agent')?.substring(0, 50)}...`);

    // Check for duplicate uploads
    if (uploadSessions.has(req.ip)) {
        console.log(`⚠️  DUPLICATE UPLOAD DETECTED from ${req.ip}`);
        return res.status(429).json({
            success: false,
            error: 'Upload already in progress. Please wait.'
        });
    }
    
    const sessionId = req.ip + Date.now();
    uploadSessions.set(req.ip, sessionId);
    
    console.log('\n📄 File details:');
    if (req.file) {
        console.log(`   Original Name: ${req.file.originalname}`);
        console.log(`   Filename: ${req.file.filename}`);
        console.log(`   Size: ${(req.file.size / 1024 / 1024).toFixed(2)} MB`);
        console.log(`   MIME Type: ${req.file.mimetype}`);
        console.log(`   Upload Time: ${Date.now() - startTime}ms`);
        
        // Log file path
        const filePath = path.join(uploadDir, req.file.filename);
        console.log(`   Full Path: ${filePath}`);
        
        // Check if file exists
        if (fs.existsSync(filePath)) {
            const stats = fs.statSync(filePath);
            console.log(`   ✅ File saved successfully`);
            console.log(`   Created: ${stats.birthtime.toLocaleString()}`);
        }
    } else {
        console.log('\n⚠️  No file received or file rejected');
    }
    
    if (!req.file) {
        console.log('\n❌ UPLOAD FAILED - No file');
        console.log('='.repeat(60));
        uploadSessions.delete(req.ip);
        return res.status(400).json({ 
            success: false, 
            error: 'No file uploaded or invalid file type' 
        });
    }
    
    const result = {
        success: true, 
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype,
        url: `/uploads/${req.file.filename}`,
        uploadedAt: new Date().toISOString(),
        uploadTime: Date.now() - startTime + 'ms'
    };
    
    console.log('\n✅ UPLOAD COMPLETED SUCCESSFULLY');
    console.log('📤 Response to client:');
    console.log(JSON.stringify(result, null, 2));
    console.log('='.repeat(60) + '\n');
    
    uploadSessions.delete(req.ip);
    res.json(result);
});

// Get list of uploaded files
app.get('/uploads', (req, res) => {
    fs.readdir(uploadDir, (err, files) => {
        if (err) {
            console.error('❌ Error reading uploads directory:', err);
            return res.status(500).json({ 
                success: false, 
                error: 'Failed to read uploads directory' 
            });
        }
        
        const fileList = files.map(file => ({
            name: file,
            url: `/uploads/${file}`,
            size: fs.statSync(path.join(uploadDir, file)).size
        }));
        
        res.json({
            success: true,
            count: fileList.length,
            files: fileList
        });
    });
});

// Serve uploaded files statically (this is already covered by the public static middleware)
// But we can add some additional security if needed
app.get('/uploads/:filename', (req, res) => {
    const filePath = path.join(uploadDir, req.params.filename);
    
    // Security check - prevent directory traversal
    if (filePath.indexOf(uploadDir) !== 0) {
        return res.status(403).json({ error: 'Access denied' });
    }
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'File not found' });
    }
    
    res.sendFile(filePath);
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        uploadsDir: uploadDir 
    });
});

// 404 handler for undefined routes
app.use((req, res, next) => {
    console.log(`❌ 404: ${req.method} ${req.path}`);
    res.status(404).json({ 
        success: false,
        error: `Route ${req.path} not found`,
        available: {
            'GET /': 'Serve main page',
            'POST /upload': 'Upload files',
            'GET /uploads': 'List uploaded files',
            'GET /health': 'Health check'
        }
    });
});

// 405 handler for method not allowed
app.use((req, res, next) => {
    console.log(`❌ 405: Method ${req.method} not allowed for ${req.path}`);
    res.status(405).json({ 
        success: false,
        error: `Method ${req.method} not allowed for ${req.path}`,
        allowedMethods: ['GET', 'POST']
    });
});

// Global error handler
app.use((error, req, res, next) => {
    console.error('❌ Server error:', error);
    
    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                success: false,
                error: 'File too large. Maximum size is 10MB.'
            });
        }
        return res.status(400).json({
            success: false,
            error: `Upload error: ${error.message}`
        });
    }
    
    res.status(500).json({
        success: false,
        error: 'Internal server error'
    });
});

app.listen(PORT, () => {
    console.log(`\n🚀 Virtual Try-On Server Started!`);
    console.log(`📍 Running on: http://localhost:${PORT}`);
    console.log(`📁 Serving static files from: public/`);
    console.log(`📤 Uploads saved to: public/uploads/`);
    console.log(`\n📋 Available Endpoints:`);
    console.log(`   GET    /          - Main page`);
    console.log(`   POST   /upload    - Upload files`);
    console.log(`   GET    /uploads   - List uploaded files`);
    console.log(`   GET    /health    - Server health check`);
    console.log(`\n🧪 Test upload: curl -X POST -F "file=@test.jpg" http://localhost:${PORT}/upload`);
    console.log(`\n`);
});

module.exports = app;