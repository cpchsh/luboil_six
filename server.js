const express = require('express');
const cors = require('cors');
const { MongoClient } = require('mongodb');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// 設置 CORS，允許從前端訪問
app.use(cors({
  //origin: `https://${process.env.PUBLICIP}` // 替換為你的前端 IP
  origin: 'http://localhost:3001'
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
    res.status(500).json({ error: "Failed to fetch data from 'future luboil_data'" });
  }
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
