const { MongoClient } = require('mongodb');

let cachedDb = null;

async function connectToDatabase() {
    if (cachedDb) {
        return cachedDb;
    }

    if (!process.env.MONGODB_URI) {
        console.error("MONGODB_URI is not defined in environment variables");
        throw new Error("Missing MONGODB_URI");
    }

    try {
        const client = await MongoClient.connect(process.env.MONGODB_URI);
        // Use DB_NAME from env or default to 'misk_beauty'
        const dbName = process.env.DB_NAME || 'misk_beauty';
        const db = client.db(dbName);
        console.log(`Connected to MongoDB database: ${dbName}`);
        cachedDb = db;
        return db;
    } catch (e) {
        console.error("MongoDB connection error:", e);
        throw e;
    }
}

module.exports = connectToDatabase;
