const connectToDatabase = require('../db');
const jwt = require('jsonwebtoken');
const { ObjectId } = require('mongodb');

module.exports = async (req, res) => {
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
};
