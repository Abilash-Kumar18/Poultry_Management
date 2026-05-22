const mongoose = require('mongoose');

const visitorSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  contact: {
    type: String,
    required: true
  },
  company: {
    type: String
  },
  purpose: {
    type: String,
    required: true
  },
  farm_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Farm',
    required: true
  },
  visit_date: {
    type: String,
    required: true
  },
  vehicle_number: {
    type: String
  },
  status: {
    type: String,
    default: 'pending',
    enum: ['pending', 'approved', 'rejected', 'completed']
  },
  health_declaration: {
    type: mongoose.Schema.Types.Mixed
  },
  created_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  created_at: {
    type: Date,
    default: Date.now
  }
});

// Configure JSON serialization to map _id to id and remove internal fields
visitorSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: function (doc, ret) {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
  }
});

module.exports = mongoose.model('Visitor', visitorSchema);
