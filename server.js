const express = require('express');
const cors = require('cors');
const { MongoClient } = require('mongodb');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// 設置 CORS，允許從前端訪問
app.use(cors({
  origin: `http://10.168.230.33:3001` //origin: `https://${process.env.PUBLICIP}` // 替換為你的前端 IP
  //origin: 'http://localhost:3001'
}));

let db;

console.log("Attempting to connect to MongoDB...");

MongoClient.connect(process.env.MONGODB_URI)
  .then(client => {
    console.log('Connected to Database');
    //db = client.db('luboil_data_db'); 
    const dbName = process.env.MONGODB_URI.split('/').pop().split('?')[0];
    db = client.db(dbName);
  })
  .catch(error => {
    console.error("Error connecting to MongoDB:", error);
  });

app.use(express.json());

// 新增的 /api/luboil_data 路由
app.get('/api/luboil_data', async (req, res) => {
  console.log("Received request for /api/luboil_data");

  try {
    const luboilData = await db.collection('luboil_data').find({}).toArray();
    console.log("Data fetched from 'luboil_data':", luboilData);
    res.json(luboilData);
  } catch (error) {
    console.error("Error fetching data from 'luboil_data':", error);
    res.status(500).json({ error: "Failed to fetch data from 'luboil_data'" });
  }
});

// 新增的 /api/future_luboil_data 路由
app.get('/api/future_luboil_data', async (req, res) => {
  console.log("Received request for /api/future_luboil_data");

  try {
    const futureluboilData = await db.collection('future_quantity_data').find({}).toArray();
    console.log("Data fetched from 'future_quantity_data':", futureluboilData);
    res.json(futureluboilData);
  } catch (error) {
    console.error("Error fetching data from 'future luboil_data':", error);
    res.status(500).json({ error: "Failed to fetch data from 'future_luboil_data'" });
  }
});

// 新增的 /api/future_luboil_monthly 路由
app.get('/api/future_luboil_monthly', async (req, res) => {
  console.log("Received request for /api/future_luboil_monthly");

  try {
    const futureluboilMonthly = await db.collection('future_quantity_monthly').find({}).toArray();
    console.log("Data fetched from 'future_quantity_monthly':", futureluboilMonthly);
    res.json(futureluboilMonthly);
  } catch (error) {
    console.error("Error fetching data from 'future luboil_monthly':", error);
    res.status(500).json({ error: "Failed to fetch data from 'future_luboil_monthly'" });
  }
});

// 獲取最新的日期
app.get("/api/luboil_data_latest", async (req, res) => {
  console.log("Received request for /api/luboil_data_latest");
  try {
    const latestDoc = await db.collection('luboil_data').findOne(
      {},
      { sort: { timestamp: -1 }, projection: {timestamp: 1 } }
    );
    if (!latestDoc) {
      return res.json({ maxTimestamp: null });
    }
    // ex: "2024-11-30T00:00:00Z"
    res.json({ maxTimestamp: latestDoc.timestamp });
  } catch (error) {
    console.log("Error fetching max timestamp:", error);
    res.status(500).json({ error: "Failed to fetch max timestamp" });
  }
})

// 獲取feature
app.get('/api/feature_data', async (req, res) => {
  console.log("Received request for /api/feature_data");

  try {
    const featureData = await db.collection('feature_data').find({}).toArray();
    console.log("Data fetched from 'feature_data':", featureData);
    res.json(featureData);
  } catch (error) {
    console.error("Error fetching data from 'feature_data':", error);
    res.status(500).json({ error: "Failed to fetch data from 'feature_data'" });
  }
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
