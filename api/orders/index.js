const connectToDatabase = require('../db');
const jwt = require('jsonwebtoken');
const { ObjectId } = require('mongodb');

module.exports = async (req, res) => {
    const db = await connectToDatabase();
    const orders = db.collection('orders');
    const users = db.collection('users');

    if (req.method === 'GET') {
        // Admin or User order history
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) return res.status(401).json({ message: 'Unauthorized' });

        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            // If admin, they might want all orders (logic for admin check can be added)
            // For now, return user's orders
            const userOrders = await orders.find({ phone: decoded.phone }).sort({ date: -1 }).toArray();
            return res.status(200).json({ success: true, orders: userOrders });
        } catch (e) {
            return res.status(401).json({ message: 'Invalid token' });
        }
    }

    if (req.method === 'POST') {
        const orderData = req.body;

        try {
            // 1. Save the order
            const result = await orders.insertOne({
                ...orderData,
                createdAt: new Date()
            });

            // 2. Update Loyalty Points if user is logged in
            if (orderData.userId) {
                const amount = parseInt(orderData.total) || 0;
                await users.updateOne(
                    { _id: new ObjectId(orderData.userId) },
                    {
                        $inc: { points: amount, totalSpend: amount, orderCount: 1 },
                        $push: { pointsHistory: { amount, date: new Date().toISOString(), reason: 'Order #' + orderData.id } }
                    }
                );
            }

            res.status(201).json({ success: true, orderId: result.insertedId });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Error processing order' });
        }
    }
};
