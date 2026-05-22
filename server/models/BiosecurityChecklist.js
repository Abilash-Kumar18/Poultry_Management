const mongoose = require('mongoose');

const biosecurityChecklistSchema = new mongoose.Schema({
  farm_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Farm',
    required: true
  },
  protocol_name: {
    type: String,
    required: true
  },
  category: {
    type: String,
    default: 'daily',
    enum: ['daily', 'weekly', 'monthly']
  },
  status: {
    type: String,
    default: 'pending',
    enum: ['pending', 'completed']
  },
  completed_by: {
    type: String
  },
  completed_at: {
    type: Date
  },
  photo_url: {
    type: String
  },
  notes: {
    type: String
  },
  due_date: {
    type: String
  },
  created_at: {
    type: Date,
    default: Date.now
  }
});

// Configure JSON serialization to map _id to id and remove internal fields
biosecurityChecklistSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: function (doc, ret) {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
  }
});

module.exports = mongoose.model('BiosecurityChecklist', biosecurityChecklistSchema);
