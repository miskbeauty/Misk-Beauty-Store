const jwt = require('jsonwebtoken');

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    const { username, password } = req.body;

    // Use environment variables for production security
    // Defaulting to the existing admin/admin123 for seamless transition if env not set
    const ADMIN_USER = process.env.ADMIN_USER || 'admin';
    const ADMIN_PASS = process.env.ADMIN_PASS || 'admin123';
    const JWT_SECRET = process.env.JWT_SECRET;

    if (!JWT_SECRET) {
        return res.status(500).json({ message: 'Server configuration error: JWT_SECRET missing' });
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
