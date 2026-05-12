const connectToDatabase = require('../lib/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { ObjectId } = require('mongodb');
const rateLimit = require('../lib/rate-limit');

module.exports = async (req, res) => {
    // Determine the action based on the URL path
    const url = req.url.split('?')[0];
    const action = url.split('/').pop();

    try {
        if (action === 'login') {
            return await handleLogin(req, res);
        } else if (action === 'register') {
            return await handleRegister(req, res);
        } else if (action === 'me') {
            return await handleMe(req, res);
        } else if (action === 'admin-login') {
            return await handleAdminLogin(req, res);
        } else {
            return res.status(404).json({ message: 'Auth action not found' });
        }
    } catch (error) {
        console.error('Auth Error:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

async function handleLogin(req, res) {
    try {
        await rateLimit(req, 10);
    } catch (e) {
        return res.status(429).json({ message: 'Too many login attempts, please try again later.' });
    }

    if (req.method !== 'POST') return res.status(405).json({ message: 'Method Not Allowed' });

    const { phone, password } = req.body;
    if (!phone || !password) return res.status(400).json({ message: 'Missing required fields' });

    const cleanPhone = phone.replace(/\D/g, '');
    if (!cleanPhone || cleanPhone.length < 9) return res.status(400).json({ message: 'رقم الهاتف غير صالح' });

    const db = await connectToDatabase();
    const users = db.collection('users');

    const user = await users.findOne({
        $or: [
            { phone: cleanPhone },
            { phone: '0' + cleanPhone },
            { phone: phone }
        ]
    });

    if (!user) return res.status(400).json({ message: 'رقم الهاتف أو كلمة المرور غير صحيحة' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: 'رقم الهاتف أو كلمة المرور غير صحيحة' });

    const token = jwt.sign(
        { userId: user._id, name: user.name, phone: user.phone },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
    );

    const { password: _, ...userWithoutPassword } = user;
    res.status(200).json({ success: true, token, user: userWithoutPassword });
}

async function handleRegister(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ message: 'Method Not Allowed' });

    const { name, phone, password } = req.body;
    if (!name || !phone || !password) return res.status(400).json({ message: 'Missing required fields' });

    const db = await connectToDatabase();
    const users = db.collection('users');

    const existingUser = await users.findOne({ phone });
    if (existingUser) return res.status(400).json({ message: 'رقم الهاتف مسجل مسبقاً' });

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = {
        name,
        phone,
        password: hashedPassword,
        points: 0,
        pointsHistory: [],
        totalSpend: 0,
        orderCount: 0,
        joinedDate: new Date().toISOString().split('T')[0]
    };

    const result = await users.insertOne(newUser);
    const { password: _, ...userWithoutPassword } = newUser;
    userWithoutPassword._id = result.insertedId;

    res.status(201).json({ success: true, user: userWithoutPassword });
}

async function handleMe(req, res) {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'Unauthorized' });

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const db = await connectToDatabase();
        const users = db.collection('users');

        const user = await users.findOne({ _id: new ObjectId(decoded.userId) });
        if (!user) return res.status(404).json({ message: 'User not found' });

        const { password: _, ...userWithoutPassword } = user;
        res.status(200).json({ success: true, user: userWithoutPassword });
    } catch (error) {
        res.status(401).json({ message: 'Invalid token' });
    }
}

async function handleAdminLogin(req, res) {
    try {
        await rateLimit(req, 5);
    } catch (e) {
        return res.status(429).json({ message: 'Too many login attempts, please try again later.' });
    }

    if (req.method !== 'POST') return res.status(405).json({ message: 'Method Not Allowed' });

    const { username, password } = req.body;
    const ADMIN_USER = process.env.ADMIN_USER;
    const ADMIN_PASS = process.env.ADMIN_PASS;
    const JWT_SECRET = process.env.JWT_SECRET;

    if (!JWT_SECRET || !ADMIN_USER || !ADMIN_PASS) {
        return res.status(500).json({ message: 'Server configuration error' });
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
            session: { status: 'active', loginTime: Date.now(), user: username }
        });
    } else {
        res.status(401).json({ success: false, message: 'اسم المستخدم أو كلمة المرور غير صحيحة' });
    }
}
