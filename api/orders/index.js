const connectToDatabase = require('../../lib/db');
const jwt = require('jsonwebtoken');
const { verifyAdmin } = require('../../lib/auth');
const { ObjectId } = require('mongodb');

module.exports = async (req, res) => {
    const db = await connectToDatabase();
    const orders = db.collection('orders');
    const users = db.collection('users');

    if (req.method === 'GET') {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) return res.status(401).json({ message: 'Unauthorized' });

        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            let query = {};
            // If NOT admin, restrict to user's phone
            if (decoded.role !== 'admin') {
                if (!decoded.phone) {
                    return res.status(400).json({ message: 'User token missing phone information' });
                }
                query = { phone: decoded.phone }; // Match by phone, assuming unique enough for this simple system
                // Or better: $or: [{ userId: decoded.userId }, { phone: decoded.phone }]
            }

            // Pagination (optional addition for now, but good practice)
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 20;
            const skip = (page - 1) * limit;

            const total = await orders.countDocuments(query);
            const userOrders = await orders.find(query)
                .sort({ date: -1, createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .toArray();

            return res.status(200).json({
                success: true,
                orders: userOrders,
                pagination: {
                    total,
                    page,
                    pages: Math.ceil(total / limit)
                }
            });
        } catch (e) {
            console.error("Order Fetch Error:", e);
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
