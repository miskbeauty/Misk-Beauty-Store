const connectDB = require('../../api/db');

module.exports = async (req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    try {
        await connectDB();
        res.status(200).json({
            success: true,
            message: "System Healthy",
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error("Health Check Failed:", error);
        res.status(500).json({
            success: false,
            message: "Database Connection Failed",
            error: error.message
        });
    }
};
