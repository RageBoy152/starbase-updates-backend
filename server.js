const dotenv = require('dotenv').config()
const express = require('express')
const cors = require('cors')
const mongoose = require('mongoose')
const Update = require('./models/update')
const Contributors = require('./models/contributor')

const { createServer } = require("http")
const { Server } = require("socket.io")


const app = express()
const httpServer = createServer(app)

const io = new Server(httpServer, { cors: {
    origin: ['http://localhost:8080','https://starbase-updates-frontend.onrender.com',undefined]
} })




//  CORS SETUP
const whitelist = ['http://localhost:8080','https://starbase-updates-frontend.onrender.com', undefined];

const corsOptions = {
    origin: function (origin, callback) {
        if (whitelist.indexOf(origin) !== -1) {
            callback(null, true)
        } else {
            callback(new Error(`Not allowed by CORS. SRC: ${origin}`))
        }
    }
}
app.use(cors(corsOptions))

// app.use(cors({origin:'*'}))




//  CONNECT TO DB
const dbURI = `mongodb+srv://${process.env.DB_USERNAME}:${process.env.DB_PWD}@starbase-updates.ic9vjva.mongodb.net/starbase-updates-db?retryWrites=true&w=majority&appName=starbase-updates`
mongoose.connect(dbURI)
    .then((res)=>{
        console.log("CONNECTED TO DB")
        httpServer.listen(3000)
    })
    .catch((err)=>{
        console.log("ERROR CONNECTING TO DB")
        console.log(err)
    })






io.on('connection',(socket)=>{
    console.log(socket.id)
})

function emitNewUpdate(update,editedUpdateId) {
    io.emit('refresh-feed',update,editedUpdateId)
}




app.get('/add-update',async(req,res)=>{
    userId = req.query.userId
    timestamp = req.query.timestamp
    location = req.query.location
    vehicle = req.query.vehicle
    message = req.query.message
    userAvatar = req.query.userAvatar
    userName = req.query.userName
    updateId = req.query.updateId
    pinned = req.query.pinned

    // console.log(userId)

    console.log(timestamp,location,vehicle,message,updateId)


    replacement = {
        userId: userId,
        userAvatar: userAvatar,
        userName: userName,
        body: message,
        userTimestamp: timestamp,
        vehicle: vehicle,
        location: location,
        pinned: pinned
    }
    const update = new Update(replacement)

    

    if (updateId != 'undefined') {
        // finding existing doc by id and replacing
        Update.findOneAndReplace({ _id: updateId }, replacement, {new:true}).then((result)=>{
            // all good, emit to connected sockets to update their feeds, send ok message to updatee client
            emitNewUpdate(result,updateId)
            res.send(result)
        }).catch((err)=>{
            res.json({"err":err})
            console.log(err)
        })
    }   else {
        // adding new doc
        update.save().then((result)=>{
            // all good, emit to connected sockets to update their feeds, send ok message to updatee client
            emitNewUpdate(result)
            res.send(result)
        }).catch((err)=>{
            res.json({"err":err})
            console.log(err)
        })
    }
})



app.get('/delete-update',async(req,res)=>{
    updateId = req.query.updateId
    

    Update.deleteOne( { _id: updateId } ).then((result)=>{
        // all good, emit to connected sockets to update their feeds, send ok message to updatee client
        io.emit('deleted-from-feed',updateId)
        res.send(result)
    }).catch((err)=>{
        res.json({"err":err})
        console.log(err)
    })
})



app.get('/get-updates',async(req,res)=>{
    Update.find().sort({createdAt:1}).then((result)=>{
        res.send(result)
    }).catch((err)=>{
        console.log(err)
    })
})



app.get('/check-dc-user',async(req,res)=>{
    userId = req.query.userId

    // Contributors.findOne({dc_id: userId}).then((result)=>{
    //     console.log(result)
    //     if (!result) {res.send({"dc_id":0})}
    //     else {res.send(result)}
    // }).catch((err)=>{
    //     console.log(err)
    // })

    uploaders = ["693191740961718420", "523327414026371082", "310599109310676994"]
    if (uploaders.indexOf(userId) !== -1) {
        res.send({"dc_id":userId})
    }   else {
        res.send({"dc_id":0})
    }
})


app.get('/test',(req,res)=>{
    res.setHeader("Access-Control-Allow-Origin","*")
    res.setHeader("Access-Control-Allow-Credentials","true")

    res.send("testing 123")
})