const mongoose = require('mongoose');

const chatHistorySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', // This links the chat to a specific user
    required: true
  },
  role: {
    type: String,
    enum: ['user', 'assistant'], // Messages can only be from the user or the AI
    required: true
  },
  message: {
    type: String,
    required: true
  }
}, { timestamps: true });

const ChatHistory = mongoose.model('ChatHistory', chatHistorySchema);

module.exports = ChatHistory;