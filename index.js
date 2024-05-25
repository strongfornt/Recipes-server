const express = require('express');
const { MongoClient, ServerApiVersion } = require('mongodb');
require('dotenv').config();
const app = express();
const cors = require('cors');

const port = process.env.PORT || 5000;

app.use(cors())
app.use(express.json())



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.v2tnkbl.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    const database = client.db("recipeDB");
    const userCollection = database.collection("users")
    const recipesCollection = database.collection("recipes")

    //recipes related api start =========================================================
    app.get('/recipes',async(req,res)=>{
        const filter = req.query;
        let query = {}
        if(filter.category){
            query.category = filter.category;
        }
        if(filter.country){
            query.country = { $regex: filter.country, $options: 'i' };
        }
        if(filter.recipe){
            query.name = { $regex: filter.recipe, $options: 'i' };
        }
        const result = await recipesCollection.find(query).toArray()
        res.send(result);
    })
    //for the home page count ============
    app.get('/recipe',async(req,res)=>{
        const result = await recipesCollection.find().toArray()
        res.send(result);
    })
    //for the home page count end ============

    app.post('/recipes',async(req,res)=>{
        const recipe = req.body;
        const result = await recipesCollection.insertOne(recipe)
        res.send(result)
    })
    //recipes related api end =========================================================

    //user related api start ==============================================================
    app.get('/users',async(req,res)=>{
        const result = await userCollection.find().toArray()
        res.send(result)
    })
    app.post('/users',async(req,res)=>{
        const user = req.body;
        const query = {email:user.email}
        const existingUser = await userCollection.findOne(query);
        if(existingUser){
          return res.send({message:'user already exists',insertedId:null})
        }
        const result = await userCollection.insertOne(user)
        res.send(result)
      })
    //user related api end ==============================================================
    
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get('/',(req,res)=>{
    res.send('recipe is cooking')
})
app.listen(port,()=>{
    console.log(`recipe is sitting on port ${port}`);
})
