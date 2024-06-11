// userModel.js
const mongoose = require('mongoose');

const policiesSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
  canViewContent: Boolean,
  canEditContent: Boolean,
  canDeleteContent: Boolean
});

const User = mongoose.model('Policy', policiesSchema);

module.exports = User;
