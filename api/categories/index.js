const connectToDatabase = require('../db');
const { ObjectId } = require('mongodb');

module.exports = async (req, res) => {
    const db = await connectToDatabase();
    const categories = db.collection('categories');

    // Prevent caching for all methods
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

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

            // Check for duplicate name
            const existing = await categories.findOne({ name: category.name });
            if (existing) {
                return res.status(409).json({ message: 'Category name already exists' });
            }

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
            let currentId;

            if (_id) {
                currentId = new ObjectId(_id);
                filter = { _id: currentId };
            } else if (id) {
                if (!isNaN(id)) {
                    currentId = parseInt(id);
                    filter = { id: currentId };
                } else {
                    currentId = new ObjectId(id);
                    filter = { _id: currentId };
                }
            } else {
                return res.status(400).json({ message: 'Missing ID' });
            }

            // Check for duplicate name (excluding self)
            if (updateData.name) {
                const existing = await categories.findOne({
                    name: updateData.name,
                    _id: { $ne: currentId instanceof ObjectId ? currentId : undefined },
                    id: { $ne: typeof currentId === 'number' ? currentId : undefined }
                });
                if (existing) {
                    return res.status(409).json({ message: 'Another category already has this name' });
                }
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

            const targetId = !isNaN(id) ? parseInt(id) : new ObjectId(id);

            // 1. Check for child categories
            const children = await categories.findOne({ parentId: targetId });
            if (children) {
                return res.status(400).json({ message: 'Cannot delete category with sub-categories' });
            }

            // 2. Check for assigned products
            const products = db.collection('products');
            const categoryObj = await categories.findOne(!isNaN(id) ? { id: targetId } : { _id: targetId });
            if (categoryObj) {
                const assignedProducts = await products.findOne({ category: categoryObj.name });
                if (assignedProducts) {
                    return res.status(400).json({ message: 'Cannot delete category assigned to products' });
                }
            }

            let deleteResult;
            if (!isNaN(id)) {
                deleteResult = await categories.deleteOne({ id: targetId });
            } else {
                deleteResult = await categories.deleteOne({ _id: targetId });
            }

            res.status(200).json({ success: true });
        } catch (e) {
            console.error("DELETE Error:", e);
            res.status(500).json({ message: 'Error deleting category' });
        }
    }
};
