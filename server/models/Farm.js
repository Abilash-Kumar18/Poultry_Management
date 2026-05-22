const mongoose = require('mongoose');

const farmSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    required: true,
    enum: ['pig', 'poultry', 'mixed']
  },
  location: {
    type: String,
    required: true
  },
  capacity: {
    type: Number,
    required: true
  },
  health_status: {
    type: String,
    default: 'healthy',
    enum: ['healthy', 'warning', 'critical']
  },
  biosecurity_score: {
    type: Number,
    default: 100
  },
  owner_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  description: {
    type: String
  },
  created_at: {
    type: Date,
    default: Date.now
  }
});

// Configure JSON serialization to map _id to id and remove internal fields
farmSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: function (doc, ret) {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
  }
});

module.exports = mongoose.model('Farm', farmSchema);
