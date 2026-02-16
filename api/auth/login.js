const connectToDatabase = require('../../lib/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('../../lib/rate-limit');

module.exports = async (req, res) => {
    try {
        await rateLimit(req, 10); // 10 attempts per minute per IP
    } catch (e) {
        return res.status(429).json({ message: 'Too many login attempts, please try again later.' });
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    const { phone, password } = req.body;

    if (!phone || !password) {
        return res.status(400).json({ message: 'Missing required fields' });
    }

    // Sanitize phone (remove non-digits)
    const cleanPhone = phone.replace(/\D/g, '');

    if (!cleanPhone || cleanPhone.length < 9) {
        return res.status(400).json({ message: 'رقم الهاتف غير صالح' });
    }

    try {
        const db = await connectToDatabase();
        const users = db.collection('users');

        // flexible find: support 059... or 59...
        const user = await users.findOne({
            $or: [
                { phone: cleanPhone },
                { phone: '0' + cleanPhone },
                { phone: phone }
            ]
        });

        if (!user) {
            return res.status(400).json({ message: 'رقم الهاتف أو كلمة المرور غير صحيحة' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'رقم الهاتف أو كلمة المرور غير صحيحة' });
        }

        const token = jwt.sign(
            { userId: user._id, name: user.name, phone: user.phone },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        const { password: _, ...userWithoutPassword } = user;

        res.status(200).json({ success: true, token, user: userWithoutPassword });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};
