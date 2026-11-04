const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  sender: {
    type: String,
    enum: ['customer', 'bot'],
    required: true
  },
  text: {
    type: String,
    required: true
  },
  source: {
    type: String,
    enum: ['faq', 'gemini', 'fallback'],
    default: 'gemini'
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

const conversationSchema = new mongoose.Schema(
  {
    business: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Business',
      required: true
    },
    sessionId: {
      type: String,
      required: true
    },
    messages: [messageSchema],
    lastUpdated: {
      type: Date,
      default: Date.now
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Conversation', conversationSchema);