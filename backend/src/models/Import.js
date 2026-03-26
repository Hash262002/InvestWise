const mongoose = require('mongoose');

const ImportSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  description: { type: String },
  originalFileName: { type: String },
  data: { type: Array, default: [] }, // array of parsed CSV rows as objects
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

ImportSchema.pre('save', function () {
  this.updatedAt = Date.now();
});

module.exports = mongoose.model('Import', ImportSchema);
