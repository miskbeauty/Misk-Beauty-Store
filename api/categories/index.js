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
            // Clean up and standardize
            delete category._id;
            if (category.id && isNaN(category.id)) delete category.id;

            // Fix: parentId might be numeric or string (ObjectId)
            if (category.parentId && category.parentId !== 'null' && category.parentId !== "") {
                if (!isNaN(category.parentId) && typeof category.parentId !== 'boolean') {
                    category.parentId = parseInt(category.parentId);
                }
            } else {
                category.parentId = null;
            }

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
                if (!isNaN(id)) {
                    filter = { id: parseInt(id) };
                } else {
                    filter = { _id: new ObjectId(id) };
                }
            } else {
                return res.status(400).json({ message: 'Missing ID' });
            }

            // Clean up updateData
            delete updateData._id;
            delete updateData.id;

            // Fix parentId in updateData
            if (updateData.parentId && updateData.parentId !== 'null' && updateData.parentId !== "") {
                if (!isNaN(updateData.parentId) && typeof updateData.parentId !== 'boolean') {
                    updateData.parentId = parseInt(updateData.parentId);
                }
            } else {
                updateData.parentId = null;
            }

            const result = await categories.updateOne(filter, { $set: updateData });
            if (result.matchedCount === 0) {
                return res.status(404).json({ message: 'Category not found' });
            }
            res.status(200).json({ success: true });
        } catch (e) {
            console.error("PUT Error:", e);
            res.status(500).json({ message: 'Error updating category' });
        }
    }

    if (req.method === 'DELETE') {
        try {
            const { id } = req.query;
            if (!id) return res.status(400).json({ message: 'Missing ID' });

            let deleteResult;
            if (!isNaN(id)) {
                deleteResult = await categories.deleteOne({ id: parseInt(id) });
            } else {
                deleteResult = await categories.deleteOne({ _id: new ObjectId(id) });
            }

            res.status(200).json({ success: true });
        } catch (e) {
            res.status(500).json({ message: 'Error deleting category' });
        }
    }
};
