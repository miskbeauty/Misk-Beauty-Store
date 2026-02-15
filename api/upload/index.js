const cloudinary = require('cloudinary').v2;
const jwt = require('jsonwebtoken');

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Helper to verify admin token
// We duplicate this small helper here to avoid complex relative imports if utils structure changes
async function verifyAdmin(req) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return false;
    }
    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        return decoded.role === 'admin';
    } catch (err) {
        return false;
    }
}

module.exports = async (req, res) => {
    // 1. Method Check
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    // 2. Auth Check
    const isAdmin = await verifyAdmin(req);
    if (!isAdmin) {
        return res.status(401).json({ message: 'Unauthorized: Admin access required' });
    }

    // 3. Body Check (Expecting JSON with file data for Vercel Serverless simplicity)
    // Note: detailed multipart/form-data parsing in Vercel functions is complex without middleware.
    // For this implementation, we will accept a base64 string from the client, 
    // BUT we will upload it to Cloudinary immediately and return the URL.
    // This solves the database size issue, even if the upload payload is still large.

    try {
        const { file, folder } = req.body;

        if (!file) {
            return res.status(400).json({ message: 'No file provided' });
        }

        // Upload to Cloudinary
        const uploadResponse = await cloudinary.uploader.upload(file, {
            folder: folder || 'misk_products',
            resource_type: 'auto'
        });

        return res.status(200).json({
            success: true,
            url: uploadResponse.secure_url,
            public_id: uploadResponse.public_id
        });

    } catch (error) {
        console.error("Cloudinary Upload Error:", error);
        return res.status(500).json({
            success: false,
            message: 'Image upload failed',
            error: error.message
        });
    }
};
