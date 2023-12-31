const mongoose = require('mongoose');
const {RepositorySchema} = require("./Repository");

const UserSchema = new mongoose.Schema({
    user: {
        email: String,
        password: String
    },
    repositories: [{
        _id: String,
        name: String
    }]
})

exports.User = mongoose.model('User', UserSchema);