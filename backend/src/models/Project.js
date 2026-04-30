const mongoose = require('mongoose');

const memberSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  role: { type: String, enum: ['admin', 'member'], default: 'member' },
  joined_at: { type: Date, default: Date.now },
}, { _id: false });

const projectSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  description: { type: String, default: null },
  created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  members: [memberSchema],
}, { timestamps: { createdAt: 'created_at', updatedAt: false } });

// make sure we can't add the same user twice
projectSchema.index({ 'members.user': 1 });

projectSchema.set('toJSON', { virtuals: true, versionKey: false });

module.exports = mongoose.model('Project', projectSchema);
