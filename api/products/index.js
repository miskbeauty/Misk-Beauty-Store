const connectToDatabase = require('../db');
const { ObjectId } = require('mongodb');

module.exports = async (req, res) => {
    const db = await connectToDatabase();
    const products = db.collection('products');

    if (req.method === 'GET') {
        try {
            const allProducts = await products.find({}).sort({ priority: -1 }).toArray();
            res.status(200).json({ success: true, products: allProducts });
        } catch (e) {
            res.status(500).json({ message: 'Error fetching products' });
        }
    }

    if (req.method === 'POST') {
        // Admin check logic should be here
        try {
            const product = req.body;
            const result = await products.insertOne(product);
            res.status(201).json({ success: true, productId: result.insertedId });
        } catch (e) {
            res.status(500).json({ message: 'Error creating product' });
        }
    }

    if (req.method === 'PUT') {
        try {
            const { id, ...updateData } = req.body;
            await products.updateOne({ _id: new ObjectId(id) }, { $set: updateData });
            res.status(200).json({ success: true });
        } catch (e) {
            res.status(500).json({ message: 'Error updating product' });
        }
    }

    if (req.method === 'DELETE') {
        try {
            const { id } = req.query;
            await products.deleteOne({ _id: new ObjectId(id) });
            res.status(200).json({ success: true });
        } catch (e) {
            res.status(500).json({ message: 'Error deleting product' });
        }
    }
};
