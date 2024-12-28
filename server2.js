const express = require('express');
const cors = require('cors');
const { MongoClient } = require('mongodb');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors({
  origin: 'http://54.234.23.98:3001' 
}));

// test deploy
let db;

MongoClient.connect(process.env.MONGODB_URI)
  .then(client => {
    console.log('Connected to Database');
    db = client.db('testdb');

    // 檢查集合是否為空，並插入測試資料
    db.collection('data').countDocuments({}, (err, count) => {
      if (err) {
        console.error("Error counting documents:", err);
      } else if (count === 0) {
        db.collection('data').insertMany([
          { name: "Sample Item 1", value: 123 },
          { name: "Sample Item 2", value: 456 }
        ])
        .then(() => console.log("Inserted initial test data"))
        .catch(error => console.error("Error inserting test data:", error));
      }
    });
  })
  .catch(error => console.error(error));

app.use(express.json());

app.get('/api/data', async (req, res) => {
  const data = await db.collection('data').find({}).toArray();
  res.json(data);
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

