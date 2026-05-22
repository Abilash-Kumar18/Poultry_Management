const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema({
  phone: {
    type: String,
    required: true,
    trim: true
  },
  code: {
    type: String,
    required: true
  },
  created_at: {
    type: Date,
    default: Date.now,
    expires: 300 // Auto-deletes after 300 seconds (5 minutes)
  }
});

module.exports = mongoose.model('OTP', otpSchema);
