const connectToDatabase = require('./lib/db');

async function checkData() {
    try {
        const db = await connectToDatabase();
        const categories = await db.collection('categories').find({}).toArray();
        const products = await db.collection('products').find({}).toArray();

        console.log('--- Categories ---');
        categories.forEach(c => {
            console.log(`ID: ${c._id || c.id}, Name: ${c.name}, ParentId: ${c.parentId}, ShowInHeader: ${c.showInHeader}`);
        });

        console.log('\n--- Products ---');
        products.forEach(p => {
            console.log(`ID: ${p._id || p.id}, Name: ${p.name}, Category: ${p.category}, SubCategory: ${p.subCategory}`);
        });

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

checkData();
