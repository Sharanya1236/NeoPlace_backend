const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  slot: { type: mongoose.Schema.Types.ObjectId, ref: 'Slot', required: true },
  status: { type: String, default: 'Confirmed' },
  meetingLink: { type: String, default: 'Pending' } // You can update this later
}, { timestamps: true });

module.exports = mongoose.model('Booking', bookingSchema);