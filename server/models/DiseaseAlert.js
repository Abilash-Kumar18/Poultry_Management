const mongoose = require('mongoose');

const diseaseAlertSchema = new mongoose.Schema({
  farm_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Farm',
    required: true
  },
  title: {
    type: String,
    required: true
  },
  severity: {
    type: String,
    default: 'low',
    enum: ['low', 'medium', 'high', 'critical']
  },
  description: {
    type: String
  },
  symptoms: {
    type: String
  },
  actions: {
    type: String
  },
  status: {
    type: String,
    default: 'active',
    enum: ['active', 'monitoring', 'resolved']
  },
  affected_animals: {
    type: Number,
    default: 0
  },
  created_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  created_at: {
    type: Date,
    default: Date.now
  },
  resolved_at: {
    type: Date
  }
});

// Configure JSON serialization to map _id to id and remove internal fields
diseaseAlertSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: function (doc, ret) {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
  }
});

module.exports = mongoose.model('DiseaseAlert', diseaseAlertSchema);
