require('dotenv').config()
const express = require('express')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const cookie_parser = require('cookie-parser')
const app = express()
const cors = require('cors')
const jwt = require('jsonwebtoken')
const port = process.env.PORT || 5000

const uri = `mongodb+srv://${process.env.DB_USERNAME}:${encodeURIComponent(process.env.DB_PASSWORD)}@cluster0.f31vqfv.mongodb.net/?appName=Cluster0`;


const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
})
app.use(cookie_parser())
const corsOptions = {
    origin: true,
    methods: ['POST', 'GET','PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}

app.use(cors(corsOptions))             //...cors middleware

app.use(express.json())     //...get request body

//logger middleware
const logger = async (req, res, next) => {
    console.log('Req => ', req.cookies)//
    //...do something to log user activity
    next()
}
const verifyToken = async (req, res, next) => {
    const token = req.cookies.token
   // console.log('cookie=> ', req.cookies.token)
    if (!token) {
        return res.send({ error: 'unauthorised access' })
    }

    const result = await jwt.verify(req.cookies?.token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) {
            //console.log("Error=> ",err)
            return res.send({ error: 'forbidden' })

        }//end if
        if (decoded) {
            console.log('Decoded ',decoded)
            if (decoded.email === req.params.email) {
                req.user = req.params.email
                console.log('User', req.user)
            }
            next()
        }
    })
}

async function run() {
    try {

        const database = client.db("assignmentDB");
        const assignments = await database.collection("assignments");

        app.post('/jwt', (req, res) => {
            const user_email = req.body
            console.log('Req-> ', req.body)
            //sign jwt token
            //jwt.sign()
            const token = jwt.sign(user_email, process.env.JWT_SECRET, { expiresIn: '1h' })
            // console.log(token)
            res.status(200).cookie('token', token, {
                maxAge: 1000 * 60 * 60, // would expire after 15 minutes
                httpOnly: true, // The cookie only accessible by the web server
                secure: true, // for localhost only
                sameSite: 'none',
                //signed: true // Indicates if the cookie should be signed
            }).send({ success: true })
        })
        app.get('/assignments/', async (req, res) => {
            const cursor = assignments.find({})
            const result = await cursor.toArray()
            return res.send(result)
        })
        app.get('assignment/:id',async (req, res)=>{
            const query={_id: new ObjectId(req.params.id)}
            const result = assignments.findOne(query)
            //const result = await cursor.toArray()
            return res.send(result)
        })
        app.get('assignments/:userEmail',async (req, res)=>{
            const query={userEmail:req.params.userEmail}
            const cursor = assignments.find(query)
            const result = await cursor.toArray()
            return res.send(result)
        })
        app.post('/create-assignment',async (req, res)=>{
            const result = await assignments.insertOne(req.body)
            console.log(result)
            res.send(result)
        })
        app.patch('/update-assignment/:id',async(req, res)=>{
            console.log(req.params.id)
            const filter = {_id: new ObjectId(req.params.id)}
            const craft = {
                $set:{
                    //change all property values 
                    title             : req.body.title,
                    description          : req.body.description,
                    imageUrl             : req.body.imageUrl,
                    marks               : req.body.marks,
                    difficulty              : req.body.difficulty,
                    dueDate             : req.body.dueDate,
                    status              : req.body.status,
                    user_name           : req.body.user_name,
                    user_email          : req.body.user_email
                }
            }
            const result = await assignments.updateOne(filter,craft,{upsert:true})
            res.send(result)
        })

        app.delete('/delete-assignment/:id', async(req, res)=>{
            const query = { _id: new ObjectId(req.params.id) };
            const result = await assignments.deleteOne(query);
            if (result.deletedCount === 1) {
                //console.log("Successfully deleted one document.");
              } else {
                //console.log("No documents matched the query. Deleted 0 documents.");
              }
            res.send(result)
        })

        app.post('/logout', async (req, res) => {
            console.log(res.cookie)
            res.clearCookie('token', { maxAge: 0 })
            res.send({ success: true })
        })

        // Send a ping to confirm a successful connection
        await client.db("car_doctor").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");

    } catch (e) {
        console.error(e);
    }
    finally {
        //await client.close();
    }

}
run().catch(console.dir);


app.listen(port, () => {
    console.log('backend running')
})