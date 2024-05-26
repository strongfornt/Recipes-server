const express = require('express');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();
const jwt = require('jsonwebtoken');
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

//middleWare
const verifyToken =async (req,res,next) => {
   
    if(!req.headers.authorization){
      return res.status(401).send({message:'unauthorized access'})
    }
    const token = req.headers.authorization.split(' ')[1]
    jwt.verify(token,process.env.ACCESS_TOKEN,(err,decoded)=>{
      if(err){
        return res.status(401).send({message:'unauthorized access'})
      }
      req.decoded = decoded;
      next();
    })
    
  }

async function run() {
  try {
    const database = client.db("recipeDB");
    const userCollection = database.collection("users")
    const recipesCollection = database.collection("recipes")

      //jwt related api
      app.post('/jwt',async(req,res)=>{
        const user = req.body;
        const token = jwt.sign(user,process.env.ACCESS_TOKEN,{
          expiresIn:'1h'
        })
        res.send({token})
      })

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
       const options = {
         projection : {
            
            name: 1,
            image: 1,
            purchasedBy: 1,
           'creator.email': 1,
            country: 1
        }
       }
        const result = await recipesCollection.find(query,options).toArray()
        res.send(result);
    })

    // dynamic recipes fetch by category for the suggested section =================================
    app.get('/recipes/:category',async(req,res)=>{
        const category = req.params.category;
        const query = {category:category}
        const options = {
            projection : {
               
               name: 1,
               image: 1,
               category: 1
           }
          }
        const result = await recipesCollection.find(query,options).toArray()
        res.send(result);
    })
    // dynamic recipes fetch by category for the suggested section end=================================
    //for the home page count ============
    app.get('/recipe',async(req,res)=>{
        const result = await recipesCollection.find().toArray()
        res.send(result);
    })
    //for the home page count end ============
    //for the dynamic details recipes start ===================================
    app.get('/recipe/:id',verifyToken,async(req,res)=>{
        
        const id = req.params.id;
        const query = {_id : new ObjectId(id)}
        const result = await recipesCollection.findOne(query)
        res.send(result);
    })
    //for the dynamic details recipes end ===================================

    app.post('/recipes',async(req,res)=>{
        const recipe = req.body;
        const result = await recipesCollection.insertOne(recipe)
        res.send(result)
    })

    //modified purchased array and watchCount from recipesCollection based on the condition start ===========
    app.put('/recipe',async(req,res)=>{
        const recipe = req.body;
        const {buyerMail,id} = recipe || {}
        const query = {_id: new ObjectId(id)}
        //check if the user already has purchased the recipe=====
        const existingRecipe = await recipesCollection.findOne(query);
        if(existingRecipe && existingRecipe.purchasedBy.includes(buyerMail)){
            return res.send({message:'alreadyExist'})
        }
        // Update the recipe with new purchase info==================================
        const updateDoc = {
            $push: {purchasedBy:buyerMail},
            $inc: {watch: 1}
        }
        const result = await recipesCollection.updateOne(query,updateDoc)
        res.send(result)
    })
    //modified purchased array and watchCount from recipesCollection based on the condition end ===========

    //recipes related api end =========================================================

    //user related api start ==============================================================
    app.get('/users',async(req,res)=>{
        const result = await userCollection.find().toArray()
        res.send(result)
    })

    app.put('/users',async(req,res)=>{
        const userInfo = req.body;
        //for the buyer========================================
        const resultBuyer = await userCollection.updateOne(
            {email:userInfo.buyerMail,coin:{ $gte: 10 }},
            {$inc:{coin:-10}}
        )
        //for the creator==================================
        const resultCreator = await userCollection.updateOne(
            {email:userInfo.creatorMail},
            {$inc:{coin:1}}
        )

        res.send({resultBuyer,resultCreator})
        
    })

    //get single user ========================================================
    app.get('/users/:email',async(req,res)=>{
        const email = req.params.email;
        const query ={email : email}
        const result = await userCollection.findOne(query)
        res.send(result);
    })
    //get single user end ========================================================

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
