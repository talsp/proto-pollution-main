// userModel.js
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  nickname: String,
  firstName: String,
  lastName: String,
  email: String,
  password: String,
  isAdmin: { type: Boolean }
});

const User = mongoose.model('User', userSchema);

module.exports = User;
