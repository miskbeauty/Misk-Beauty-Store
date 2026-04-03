const cloudinary = require('cloudinary').v2;
const { verifyAdmin } = require('../../lib/auth');

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

module.exports = async (req, res) => {
    // 1. Method Check
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    // 2. Auth Check
    const adminCheck = await verifyAdmin(req);
    if (!adminCheck.authenticated) {
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

        // Validate Configuration
        if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
            return res.status(500).json({
                success: false,
                message: 'Cloudinary configuration is missing on server (CLOUDINARY_CLOUD_NAME, etc.)'
            });
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
            message: 'Cloudinary Error: ' + error.message,
            stack: error.stack
        });
    }
};
