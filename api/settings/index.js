export const revalidate = 0;
const connectToDatabase = require('../db');

module.exports = async (req, res) => {
    const db = await connectToDatabase();
    const settings = db.collection('settings');

    // Prevent caching for all methods
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    if (req.method === 'GET') {
        try {
            // We only expect one settings document
            const storeSettings = await settings.findOne({});
            res.status(200).json({ success: true, settings: storeSettings });
        } catch (e) {
            res.status(500).json({ message: 'Error fetching settings' });
        }
    }

    if (req.method === 'POST' || req.method === 'PUT') {
        try {
            const newSettings = req.body;
            // Upsert: replace the single settings document or create if it doesn't exist
            // Remove _id from body if it exists to avoid immutable field error
            const { _id, ...updateData } = newSettings;

            await settings.updateOne({}, { $set: updateData }, { upsert: true });
            res.status(200).json({ success: true });
        } catch (e) {
            res.status(500).json({ message: 'Error saving settings' });
        }
    }
};
