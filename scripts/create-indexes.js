const { MongoClient } = require('mongodb');
require('dotenv').config();

const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);

async function run() {
    try {
        await client.connect();
        const db = client.db('test'); // Default database name, adjust if needed

        console.log("Connected to MongoDB");

        // Products Indexes
        const products = db.collection('products');
        await products.createIndex({ slug: 1 }, { unique: true, sparse: true });
        await products.createIndex({ category: 1 });
        await products.createIndex({ priority: -1 });
        await products.createIndex({ name: "text" }); // Text search

        console.log("Products indexes created");

        // Users Indexes
        const users = db.collection('users');
        await users.createIndex({ phone: 1 }, { unique: true });

        console.log("Users indexes created");

        // Orders Indexes
        const orders = db.collection('orders');
        await orders.createIndex({ phone: 1 });
        await orders.createIndex({ userId: 1 });

        console.log("Orders indexes created");

    } finally {
        await client.close();
    }
}

run().catch(console.dir);
