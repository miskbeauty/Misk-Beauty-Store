const connectToDatabase = require('../../lib/db');
const { ObjectId } = require('mongodb');
const { verifyAdmin } = require('../../lib/auth');

module.exports = async (req, res) => {
    const db = await connectToDatabase();
    const pages = db.collection('pages');

    if (req.method === 'GET') {
        try {
            const allPages = await pages.find({}).toArray();
            res.status(200).json({ success: true, pages: allPages });
        } catch (e) {
            res.status(500).json({ message: 'Error fetching pages' });
        }
    }

    if (req.method === 'POST') {
        const adminCheck = await verifyAdmin(req);
        if (!adminCheck.authenticated) {
            return res.status(adminCheck.error === 'Authorization header missing' ? 401 : 403).json({ message: adminCheck.error });
        }
        try {
            const page = req.body;
            if (page.id) page.id = parseInt(page.id);
            const result = await pages.insertOne(page);
            res.status(201).json({ success: true, pageId: result.insertedId });
        } catch (e) {
            res.status(500).json({ message: 'Error creating page' });
        }
    }

    if (req.method === 'PUT') {
        const adminCheck = await verifyAdmin(req);
        if (!adminCheck.authenticated) {
            return res.status(adminCheck.error === 'Authorization header missing' ? 401 : 403).json({ message: adminCheck.error });
        }
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

            await pages.updateOne(filter, { $set: updateData });
            res.status(200).json({ success: true });
        } catch (e) {
            res.status(500).json({ message: 'Error updating page' });
        }
    }

    if (req.method === 'DELETE') {
        const adminCheck = await verifyAdmin(req);
        if (!adminCheck.authenticated) {
            return res.status(adminCheck.error === 'Authorization header missing' ? 401 : 403).json({ message: adminCheck.error });
        }
        try {
            const { id } = req.query;
            if (!id) return res.status(400).json({ message: 'Missing ID' });

            let deleteResult = await pages.deleteOne({ id: parseInt(id) });
            if (deleteResult.deletedCount === 0) {
                deleteResult = await pages.deleteOne({ _id: new ObjectId(id) });
            }

            res.status(200).json({ success: true });
        } catch (e) {
            res.status(500).json({ message: 'Error deleting page' });
        }
    }
};
