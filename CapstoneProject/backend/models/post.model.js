const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Reusable sub-schema for comments
const CommentSchema = new Schema({
  text: { type: String, required: true },
  user: { type: Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

// Main post schema
const PostSchema = new Schema({
  content: { type: String, required: true },

  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  likes: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  comments: [CommentSchema]

}, { timestamps: true });

module.exports = mongoose.model('Post', PostSchema);
