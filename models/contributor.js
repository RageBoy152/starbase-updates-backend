const mongoose = require('mongoose')
const Schema = mongoose.Schema

const contributorSchema = new Schema({
    dc_id: {
        type: Number,
        required: true
    }
})

const Contributor = mongoose.model('Contributor',contributorSchema)
module.exports = Contributor