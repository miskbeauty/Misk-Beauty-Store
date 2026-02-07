const connectToDatabase = require('../db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    const { phone, password } = req.body;

    if (!phone || !password) {
        return res.status(400).json({ message: 'Missing required fields' });
    }

    try {
        const db = await connectToDatabase();
        const users = db.collection('users');

        const user = await users.findOne({ phone });
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
