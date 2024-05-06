const express = require("express");
const cors = require("cors");
const app = express();
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const port = process.env.PORT || 5000;
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.kjhm1xo.mongodb.net/?retryWrites=true&w=majority`;
// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});
async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    client.connect();
    const donorCollection = client.db("donateDb").collection("users");

    app.get("/users", async (req, res) => {
      // console.log(req.query);
      const { group, thana } = req.query;
      const currentDate = new Date();
      // load data based on pagination
      const page = parseInt(req.query.page) || 0;
      const limit = parseInt(req.query.limit) || 8;
      const skip = page * limit;

      const matchStage = {};

      // Add blood group filter to the query
      if (group) {
        matchStage.group = group;
      }

      // Add thana filter to the query
      if (thana) {
        matchStage.thana = thana;
      }
      
      const result = await donorCollection
        .aggregate([
          // Add a new field 'dateDifference' with the difference between current date and stored date

          {
            $addFields: {
              lastDate: { $toDate: "$lastDate" },
            },
          },
          {
            $addFields: {
              dateDiff: {
                $divide: [
                  { $subtract: [currentDate, "$lastDate"] },
                  1000 * 60 * 60 * 24, // Convert milliseconds to days
                ],
              },
            },
          },
          // Sort based on the difference in ascending order
          { $sort: { dateDiff: -1 } },

          { $match: matchStage },
          // Skip and limit for pagination
          { $skip: skip },
          { $limit: limit },
          
        ])
        .toArray();
      res.send(result);
    });
    // app.get('/users',async(req,res)=>{
    //   // console.log(req.query);
    //   // load data based on pagination
    //   const page = parseInt(req.query.page) || 0;
    //   const limit = parseInt(req.query.limit) || 8;
    //   const skip = page* limit;
    //   const result = await donorCollection.find().skip(skip).limit(limit).toArray();
    //   res.send(result);
    // })
    //for user profile
    app.get("/singleUsers/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const result = await donorCollection.findOne(query);
      
      res.send(result);
    });
    //count all data and send for pagination
    app.get("/totalUsers", async (req, res) => {
      const result = await donorCollection.estimatedDocumentCount();
      res.send({ totalUsers: result });
    });
    app.get("/users/:id", async (req, res) => {
      const id = req.params.id;
    const query = { _id: new ObjectId(id) };

    const currentDate = new Date();

    const result = await donorCollection.aggregate([
        // Match the document by _id
        { $match: query },

        // Add a new field 'lastDate' as a Date object
        {
            $addFields: {
                lastDate: { $toDate: "$lastDate" }
            }
        },

        // Calculate the date difference in days
        {
            $addFields: {
                dateDiff: {
                    $divide: [
                        { $subtract: [currentDate, "$lastDate"] },
                        1000 * 60 * 60 * 24 // Convert milliseconds to days
                    ]
                }
            }
        }
    ]).toArray();
      res.send(result);
    });
    //post operation for user
    app.post("/users", async (req, res) => {
      const user = req.body;
      const query = { email: user.email };
      const existingUser = await donorCollection.findOne(query);
      console.log("existing user", existingUser);
      if (existingUser) {
        return res.send({ message: "user already exist" });
      }
      const result = await donorCollection.insertOne(user);
      res.send(result);
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Donate Red Running");
});
app.listen(port, () => {
  console.log(`Donate Red running on port ${port}`);
});
