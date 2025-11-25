const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  totalQuestionsSolved: {
    type: Number,
    default: 0
  },
  
  // --- ADD THIS BLOCK ---
  solvedProblems: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Problem'
  }]
  // --- END OF ADDITION ---

}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);