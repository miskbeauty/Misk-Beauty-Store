const connectToDatabase = require('../../lib/db');
const { ObjectId } = require('mongodb');
const { verifyAdmin } = require('../../lib/auth');

module.exports = async (req, res) => {
    const db = await connectToDatabase();
    const brands = db.collection('brands');

    // Prevent caching
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    if (req.method === 'GET') {
        try {
            const allBrands = await brands.find({}).sort({ priority: -1, name: 1 }).toArray();
            res.status(200).json({ success: true, brands: allBrands });
        } catch (e) {
            res.status(500).json({ message: 'Error fetching brands' });
        }
    }

    if (req.method === 'POST') {
        const adminCheck = await verifyAdmin(req);
        if (!adminCheck.authenticated) {
            return res.status(403).json({ message: adminCheck.error });
        }
        try {
            const brand = req.body;
            delete brand._id;
            const result = await brands.insertOne(brand);
            res.status(201).json({ success: true, brandId: result.insertedId });
        } catch (e) {
            res.status(500).json({ message: 'Error creating brand' });
        }
    }

    if (req.method === 'PUT') {
        const adminCheck = await verifyAdmin(req);
        if (!adminCheck.authenticated) {
            return res.status(403).json({ message: adminCheck.error });
        }
        try {
            const { _id, ...updateData } = req.body;
            if (!_id) return res.status(400).json({ message: 'Missing brand ID' });

            const result = await brands.updateOne(
                { _id: new ObjectId(_id) },
                { $set: updateData }
            );
            res.status(200).json({ success: true });
        } catch (e) {
            res.status(500).json({ message: 'Error updating brand' });
        }
    }

    if (req.method === 'DELETE') {
        const adminCheck = await verifyAdmin(req);
        if (!adminCheck.authenticated) {
            return res.status(403).json({ message: adminCheck.error });
        }
        try {
            const { id } = req.query;
            if (!id) return res.status(400).json({ message: 'Missing ID' });

            await brands.deleteOne({ _id: new ObjectId(id) });
            res.status(200).json({ success: true });
        } catch (e) {
            res.status(500).json({ message: 'Error deleting brand' });
        }
    }
};
