const mongoose = require('mongoose')
const Schema = mongoose.Schema

const updateSchema = new Schema({
    userId: {
        type: String,
        required: true
    },
    userAvatar: {
        type: String,
        required: true
    },
    userName: {
        type: String,
        required: true
    },
    pinned: {
        type: Boolean,
        required: true
    },
    body: {
        type: String,
        required: true
    },
    userTimestamp: {
        type: String,
        required: true
    },
    vehicle: {
        type: String,
        required: true
    },
    location: {
        type: String,
        required: true
    }
}, {timestamps:true})

const Update = mongoose.model('Update',updateSchema)
module.exports = Update