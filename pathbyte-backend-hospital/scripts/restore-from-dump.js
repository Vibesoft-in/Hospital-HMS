const fs = require('fs');
const path = require('path');
const { MongoClient, BSON } = require('mongodb');

const dotenv = require('dotenv');
const envPath = path.resolve(__dirname, '..', 'config', 'environments', '.env.development');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

async function restoreDump() {
  const uri = process.argv[2] || process.env.DATABASE_URL;
  if (!uri || uri.includes('<db_password>')) {
    console.error("Please provide your MongoDB Atlas password in config/environments/.env.development or pass the full URI as an argument.");
    console.error("Example: npm run restore-dump -- \"mongodb+srv://<user>:<password>@<cluster>.mongodb.net/hospital_db?retryWrites=true&w=majority\"");
    process.exit(1);
  }

  const dumpDir = path.resolve(__dirname, '..', 'dump', 'hospital_db');
  if (!fs.existsSync(dumpDir)) {
    console.error("Dump directory not found at:", dumpDir);
    process.exit(1);
  }

  console.log("Connecting to MongoDB Atlas...");
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log("Connected successfully to MongoDB!");

    // Extract db name from URI or default to hospital_db
    const urlObj = new URL(uri.replace('mongodb+srv://', 'http://').replace('mongodb://', 'http://'));
    let dbName = urlObj.pathname.replace(/^\//, '').split('?')[0];
    if (!dbName) {
      dbName = 'hospital_db';
    }

    console.log(`Using Database: ${dbName}`);
    const db = client.db(dbName);

    const files = fs.readdirSync(dumpDir).filter(f => f.endsWith('.bson'));
    console.log(`Found ${files.length} collections to restore.`);

    for (const file of files) {
      const colName = file.replace('.bson', '');
      const filePath = path.join(dumpDir, file);
      const fileBuffer = fs.readFileSync(filePath);

      if (fileBuffer.length === 0) {
        console.log(`[SKIPPED] ${colName}: Empty file`);
        continue;
      }

      console.log(`Reading ${colName} (${(fileBuffer.length / 1024 / 1024).toFixed(2)} MB)...`);
      const docs = [];
      let index = 0;

      while (index < fileBuffer.length) {
        index = BSON.deserializeStream(fileBuffer, index, 1, docs, docs.length);
      }

      console.log(`Parsed ${docs.length} documents for ${colName}`);

      const collection = db.collection(colName);
      // Drop existing collection before restoring
      try {
        await collection.drop();
      } catch (err) {
        // Ignore if collection doesn't exist
      }

      // Batch insert in chunks of 500
      const BATCH_SIZE = 500;
      for (let i = 0; i < docs.length; i += BATCH_SIZE) {
        const batch = docs.slice(i, i + BATCH_SIZE);
        await collection.insertMany(batch, { ordered: false });
      }

      console.log(`[RESTORED] ${colName} -> ${docs.length} documents inserted.`);
    }

    console.log("\n==========================================");
    console.log("All collections restored successfully into MongoDB!");
    console.log("==========================================");

  } catch (error) {
    console.error("Restore failed:", error);
    process.exit(1);
  } finally {
    await client.close();
  }
}

restoreDump();
