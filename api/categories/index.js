const connectToDatabase = require('../db');
const { ObjectId } = require('mongodb');

module.exports = async (req, res) => {
    const db = await connectToDatabase();
    const categories = db.collection('categories');

    if (req.method === 'GET') {
        try {
            const allCategories = await categories.find({}).sort({ priority: -1 }).toArray();
            res.status(200).json({ success: true, categories: allCategories });
        } catch (e) {
            res.status(500).json({ message: 'Error fetching categories' });
        }
    }

    if (req.method === 'POST') {
        try {
            const category = req.body;
            // Ensure ID is numeric if it's coming from dashboard as numeric
            if (category.id) category.id = parseInt(category.id);
            if (category.parentId) category.parentId = parseInt(category.parentId);

            const result = await categories.insertOne(category);
            res.status(201).json({ success: true, categoryId: result.insertedId });
        } catch (e) {
            res.status(500).json({ message: 'Error creating category' });
        }
    }

    if (req.method === 'PUT') {
        try {
            const { id, _id, ...updateData } = req.body;
            let filter = {};
            if (_id) {
                filter = { _id: new ObjectId(_id) };
            } else if (id) {
                filter = { id: parseInt(id) };
            } else {
                return res.status(400).json({ message: 'Missing ID' });
            }

            await categories.updateOne(filter, { $set: updateData });
            res.status(200).json({ success: true });
        } catch (e) {
            res.status(500).json({ message: 'Error updating category' });
        }
    }

    if (req.method === 'DELETE') {
        try {
            const { id } = req.query;
            if (!id) return res.status(400).json({ message: 'Missing ID' });

            // Try numeric ID first (from dashboard) then Mongo sub ID
            let deleteResult = await categories.deleteOne({ id: parseInt(id) });
            if (deleteResult.deletedCount === 0) {
                deleteResult = await categories.deleteOne({ _id: new ObjectId(id) });
            }

            res.status(200).json({ success: true });
        } catch (e) {
            res.status(500).json({ message: 'Error deleting category' });
        }
    }
};
