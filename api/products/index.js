const connectToDatabase = require('../db');
const { ObjectId } = require('mongodb');

module.exports = async (req, res) => {
    const db = await connectToDatabase();
    const products = db.collection('products');

    // Prevent caching for all methods
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    if (req.method === 'GET') {
        try {
            const { slug, category, subCategory, id } = req.query;
            let query = {};
            if (slug) {
                query = { slug: slug };
            } else if (id) {
                if (!isNaN(id)) {
                    query = { id: parseInt(id) };
                } else {
                    query = { _id: new ObjectId(id) };
                }
            } else {
                if (category) query.category = category;
                if (subCategory) query.subCategory = subCategory;
            }
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 12; // Default 12 products per page
            const skip = (page - 1) * limit;

            const total = await products.countDocuments(query);
            const allProducts = await products.find(query)
                .sort({ priority: -1 })
                .skip(skip)
                .limit(limit)
                .toArray();

            res.status(200).json({
                success: true,
                products: allProducts,
                pagination: {
                    total,
                    page,
                    limit,
                    pages: Math.ceil(total / limit)
                }
            });
        } catch (e) {
            res.status(500).json({ message: 'Error fetching products' });
        }
    }

    if (req.method === 'POST') {
        try {
            const product = req.body;

            // Enforce SKU and Image (Testsprite requirement)
            // Auto-generate SKU if missing
            if (!product.sku || product.sku.trim() === "") {
                const prefix = product.name ? product.name.substring(0, 3).toUpperCase() : "PROD";
                const random = Math.floor(1000 + Math.random() * 9000);
                product.sku = `${prefix}-${random}`;
            }
            if (!product.images || product.images.length === 0 || !product.images[0]) {
                return res.status(400).json({ message: 'At least one product image is required' });
            }

            // Remove any empty or legacy IDs to let MongoDB generate fresh _id
            delete product._id;
            if (product.id && (isNaN(product.id) || product.id === '')) delete product.id;

            const result = await products.insertOne(product);
            res.status(201).json({ success: true, productId: result.insertedId });
        } catch (e) {
            res.status(500).json({ message: 'Error creating product' });
        }
    }

    if (req.method === 'PUT') {
        try {
            const { id, _id, ...updateData } = req.body;

            let filter = {};
            if (_id) {
                filter = { _id: new ObjectId(_id) };
            } else if (id) {
                // Support both numeric ID and ObjectId passed as 'id'
                if (!isNaN(id)) {
                    filter = { id: parseInt(id) };
                } else {
                    filter = { _id: new ObjectId(id) };
                }
            }

            if (Object.keys(filter).length === 0) {
                return res.status(400).json({ message: 'Invalid ID provided' });
            }

            // Cleanup updateData to prevent saving IDs as values
            delete updateData._id;
            delete updateData.id;

            const result = await products.updateOne(filter, { $set: updateData });
            if (result.matchedCount === 0) {
                return res.status(404).json({ message: 'Product not found' });
            }
            res.status(200).json({ success: true });
        } catch (e) {
            console.error("PUT Error:", e);
            res.status(500).json({ message: 'Error updating product' });
        }
    }

    if (req.method === 'DELETE') {
        try {
            const { id } = req.query;
            if (!id) return res.status(400).json({ message: 'Missing ID' });

            let deleteResult;
            if (!isNaN(id)) {
                deleteResult = await products.deleteOne({ id: parseInt(id) });
            } else {
                deleteResult = await products.deleteOne({ _id: new ObjectId(id) });
            }

            res.status(200).json({ success: true });
        } catch (e) {
            res.status(500).json({ message: 'Error deleting product' });
        }
    }
};
