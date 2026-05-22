const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    unique: true,
    sparse: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String
  },
  phone: {
    type: String,
    unique: true,
    sparse: true,
    trim: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  role: {
    type: String,
    default: 'manager',
    enum: ['admin', 'manager']
  },
  avatar: {
    type: String
  },
  created_at: {
    type: Date,
    default: Date.now
  }
});

// Configure JSON serialization to map _id to id and remove internal fields
userSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: function (doc, ret) {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
  }
});

module.exports = mongoose.model('User', userSchema);
