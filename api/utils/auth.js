const jwt = require('jsonwebtoken');

/**
 * Verify if the request is from an authenticated admin
 */
async function verifyAdmin(req) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return { authenticated: false, error: 'Authorization header missing' };
    }

    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (decoded.role !== 'admin') {
            return { authenticated: false, error: 'Access denied: Admin only' };
        }
        return { authenticated: true, user: decoded };
    } catch (err) {
        return { authenticated: false, error: 'Invalid or expired token' };
    }
}

module.exports = { verifyAdmin };
