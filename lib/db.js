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
        console.log("Attempting new MongoDB connection...");
        const client = await MongoClient.connect(process.env.MONGODB_URI, {
            connectTimeoutMS: 20000, // 20 seconds
            socketTimeoutMS: 45000,  // 45 seconds
            maxPoolSize: 10,
            serverSelectionTimeoutMS: 20000
        });
        
        // Use DB_NAME from env or default to 'misk_beauty'
        const dbName = process.env.DB_NAME || 'misk_beauty';
        const db = client.db(dbName);
        console.log(`Successfully connected to MongoDB branch: ${dbName}`);
        
        cachedDb = db;
        return db;
    } catch (e) {
        console.error("CRITICAL: MongoDB connection failed:", e.message);
        throw e;
    }
}

module.exports = connectToDatabase;
