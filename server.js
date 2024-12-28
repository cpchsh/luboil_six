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
    db = client.db('sensor_data_db'); 
  })
  .catch(error => {
    console.error("Error connecting to MongoDB:", error);
  });

app.use(express.json());

// 新增的 /api/temperature_data 路由
app.get('/api/temperature_data', async (req, res) => {
  console.log("Received request for /api/temperature_data");

  try {
    const temperatureData = await db.collection('temperature_data').find({}).toArray();
    console.log("Data fetched from 'temperature_data':", temperatureData);
    res.json(temperatureData);
  } catch (error) {
    console.error("Error fetching data from 'temperature_data':", error);
    res.status(500).json({ error: "Failed to fetch data from 'temperature_data'" });
  }
});

// 新增的 /api/future_temperature_data 路由
app.get('/api/future_temperature_data', async (req, res) => {
  console.log("Received request for /api/future_temperature_data");

  try {
    const futuretemperatureData = await db.collection('future_temperature_data').find({}).toArray();
    console.log("Data fetched from 'future_temperature_data':", futuretemperatureData);
    res.json(futuretemperatureData);
  } catch (error) {
    console.error("Error fetching data from 'temperature_data':", error);
    res.status(500).json({ error: "Failed to fetch data from 'temperature_data'" });
  }
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
