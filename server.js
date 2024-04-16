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

function emitNewUpdate(update,editedUpdateId,pinnedChangeTxt) {
    io.emit('refresh-feed',update,editedUpdateId,pinnedChangeTxt)
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
    pinStatus = (req.query.pinStatus === 'true')
    pinAction = (req.query.pinAction === 'true')
    prevEdits = (req.query.prevEdits === 'true')


    // pin status is current bool value for pinned
    // pin action is if we are editing the pin status
    
    // prevEdits is if the update has been edited before - 'false means no edited tag'

    edited = prevEdits
    if (!edited && updateId != 'undefined' && !pinAction) {
        // not performing a pin status change, update id has been provided, no previous edits - means action involves editing the update for the first time
        edited = true
    }

    pinned = pinStatus
    if (pinAction && pinStatus) {
        // performing a pin status change and update is already pinned, update pinned to false
        pinned = false
    }   else if (pinAction && !pinStatus) {
        // performing a pin status change and update is not already pinned, update pinned to true
        pinned = true
    }


    replacement = {
        userId: userId,
        userAvatar: userAvatar,
        userName: userName,
        body: message,
        userTimestamp: timestamp,
        vehicle: vehicle,
        location: location,
        pinned: pinned,
        edited: edited
    }
    const update = new Update(replacement)

    

    if (updateId != 'undefined') {
        // finding existing doc by id and replacing
        Update.findOneAndUpdate({ _id: updateId }, replacement, {new:true}).then((result)=>{
            // all good, emit to connected sockets to update their feeds, send ok message to updatee client
            pinnedChangeTxt = ''
            if (!pinAction&&updateId) {pinnedChangeTxt = 'nope'}
            if (pinned&&pinAction) {pinnedChangeTxt = `set pinned status to ${pinned}`}
            emitNewUpdate(result,updateId,pinnedChangeTxt)
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



app.get('/search-updates',async(req,res)=>{
    searchQuery = req.query.q.toString()

    Update.find({ $or: [{body: {$regex: searchQuery,$options: "i"}},{location: {$regex: searchQuery,$options: "i"}},{vehicle: {$regex: searchQuery,$options: "i"}},{userTimestamp: {$regex: searchQuery,$options: "i"}}] }).sort({createdAt:1}).then((result)=>{
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