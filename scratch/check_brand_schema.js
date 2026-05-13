
const connectToDatabase = require('./lib/db');

async function check() {
    const db = await connectToDatabase();
    const products = db.collection('products');
    const brands = db.collection('brands');
    
    console.log("--- Sample Product ---");
    const sampleProduct = await products.findOne({});
    console.log(JSON.stringify(sampleProduct, null, 2));
    
    console.log("--- Sample Brand ---");
    const sampleBrand = await brands.findOne({});
    console.log(JSON.stringify(sampleBrand, null, 2));
    
    process.exit(0);
}

check();
