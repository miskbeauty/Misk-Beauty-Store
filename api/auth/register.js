const connectToDatabase = require('../../lib/db');
const bcrypt = require('bcryptjs');
const rateLimit = require('../../lib/rate-limit');

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    const { name, phone, password } = req.body;

    if (!name || !phone || !password) {
        return res.status(400).json({ message: 'Missing required fields' });
    }

    try {
        const db = await connectToDatabase();
        const users = db.collection('users');

        const existingUser = await users.findOne({ phone });
        if (existingUser) {
            return res.status(400).json({ message: 'رقم الهاتف مسجل مسبقاً' });
        }

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

        // Return user without password
        const { password: _, ...userWithoutPassword } = newUser;
        userWithoutPassword._id = result.insertedId;

        res.status(201).json({ success: true, user: userWithoutPassword });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};
