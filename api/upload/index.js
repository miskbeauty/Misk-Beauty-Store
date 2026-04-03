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

    // 3. Body Check
    try {
        const { file, folder } = req.body;
        if (!file) {
            return res.status(400).json({ message: 'No file provided' });
        }

        // Validate & Re-configure Cloudinary explicitly to ensure env vars are fresh
        const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
        const apiKey = process.env.CLOUDINARY_API_KEY;
        const apiSecret = process.env.CLOUDINARY_API_SECRET;

        if (!cloudName || !apiKey || !apiSecret) {
            return res.status(500).json({
                success: false,
                message: `Cloudinary configuration missing: ${!cloudName ? 'CloudName ' : ''}${!apiKey ? 'ApiKey ' : ''}${!apiSecret ? 'ApiSecret' : ''}`
            });
        }

        cloudinary.config({
            cloud_name: cloudName.trim(),
            api_key: apiKey.trim(),
            api_secret: apiSecret.trim(),
            secure: true
        });

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
