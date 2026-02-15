const jwt = require('jsonwebtoken');
const rateLimit = require('../utils/rate-limit');

module.exports = async (req, res) => {
    try {
        await rateLimit(req, 5); // Strickter limit for admin: 5 attempts
    } catch (e) {
        return res.status(429).json({ message: 'Too many login attempts, please try again later.' });
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    const { username, password } = req.body;

    // Use environment variables for production security
    const ADMIN_USER = process.env.ADMIN_USER;
    const ADMIN_PASS = process.env.ADMIN_PASS;
    const JWT_SECRET = process.env.JWT_SECRET;

    if (!JWT_SECRET || !ADMIN_USER || !ADMIN_PASS) {
        return res.status(500).json({ message: 'Server configuration error: Admin credentials or JWT_SECRET missing' });
    }

    if (username === ADMIN_USER && password === ADMIN_PASS) {
        const token = jwt.sign(
            { role: 'admin', user: username },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.status(200).json({
            success: true,
            token,
            session: {
                status: 'active',
                loginTime: Date.now(),
                user: username
            }
        });
    } else {
        res.status(401).json({ success: false, message: 'اسم المستخدم أو كلمة المرور غير صحيحة' });
    }
};
