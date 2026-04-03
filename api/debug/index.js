const connectToDatabase = require('../../lib/db');
const cloudinary = require('cloudinary').v2;
const { verifyAdmin } = require('../../lib/auth');

module.exports = async (req, res) => {
    // 1. Auth Check (Only admins can run diagnostics)
    const adminCheck = await verifyAdmin(req);
    if (!adminCheck.authenticated) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const report = {
        timestamp: new Date().toISOString(),
        mongodb: { status: 'testing', message: '' },
        cloudinary: { status: 'testing', message: '' },
        env: {
            MONGODB_URI: process.env.MONGODB_URI ? 'Defined' : 'Missing',
            CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME ? 'Defined' : 'Missing',
            CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY ? 'Defined' : 'Missing',
            CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET ? 'Defined' : 'Missing',
            JWT_SECRET: process.env.JWT_SECRET ? 'Defined' : 'Missing'
        }
    };

    // 2. Test MongoDB
    try {
        const start = Date.now();
        const db = await connectToDatabase();
        const collections = await db.listCollections().toArray();
        const duration = Date.now() - start;
        report.mongodb = {
            status: 'Success',
            message: `Connected successfully in ${duration}ms. Found ${collections.length} collections.`,
            dbName: db.databaseName
        };
    } catch (err) {
        report.mongodb = {
            status: 'Failed',
            message: err.message,
            code: err.code,
            name: err.name
        };
    }

    // 3. Test Cloudinary
    try {
        const cloudName = (process.env.CLOUDINARY_CLOUD_NAME || '').trim();
        const apiKey = (process.env.CLOUDINARY_API_KEY || '').trim();
        const apiSecret = (process.env.CLOUDINARY_API_SECRET || '').trim();

        cloudinary.config({
            cloud_name: cloudName,
            api_key: apiKey,
            api_secret: apiSecret,
            secure: true
        });

        const start = Date.now();
        const result = await cloudinary.api.ping();
        const duration = Date.now() - start;
        
        report.cloudinary = {
            status: 'Success',
            message: `Cloudinary API Ping successful in ${duration}ms.`,
            result: result.status
        };
    } catch (err) {
        console.error("Cloudinary Debug Error:", err);
        report.cloudinary = {
            status: 'Failed',
            message: err.message || (err.error && err.error.message) || JSON.stringify(err),
            http_code: err.http_code,
            raw: err
        };
    }

    res.status(200).json(report);
};
