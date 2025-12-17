const Post = require('../models/post.model');

// Create a new post
exports.createPost = async (req, res) => {
  try {
    const { content } = req.body;
    const post = new Post({ content, user: req.user._id });
    await post.save();
    const populated = await Post.findById(post._id).populate('user', 'username');
    res.status(201).json(populated);
  } catch (err) {
    console.error('Error creating post:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// Get all posts
exports.getAllPosts = async (req, res) => {
  try {
    const posts = await Post.find()
      .populate('user', 'username')
      .populate('comments.user', 'username')
      .sort({ createdAt: -1 });
    res.json(posts);
  } catch (err) {
    console.error('Error fetching posts:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// Toggle like
exports.toggleLike = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found' });

    const userId = req.user._id.toString();
    const index = post.likes.map(String).indexOf(userId);

    if (index === -1) post.likes.push(req.user._id);
    else post.likes.splice(index, 1);


    await post.save();
    res.json({ message: 'Like toggled' });
  } catch (error) {
    console.error('Error toggling like:', error);
    res.status(500).json({ error: 'Failed to toggle like' });
  }
};

// Add comment
exports.addComment = async (req, res) => {
  try {
    const { text } = req.body;
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found' });

    const comment = {
      text,
      user: req.user._id,
    };

    post.comments.push(comment);
    await post.save();
    const updated = await Post.findById(post._id)
      .populate('user', 'username')
      .populate('comments.user', 'username');
    res.json(updated);
  } catch (err) {
    console.error('Error adding comment:', err);
    res.status(500).json({ error: 'Failed to add comment' });
  }
};

// Delete post
exports.deletePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found' });
    if (post.user.toString() !== req.user._id.toString()) return res.status(403).json({ error: 'Unauthorized' });

    await post.deleteOne();
    res.json({ message: 'Post deleted' });
  } catch (err) {
    console.error('Error deleting post:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// Edit post
exports.editPost = async (req, res) => {
  try {
    const { content } = req.body;
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found' });
    if (post.user.toString() !== req.user._id.toString()) return res.status(403).json({ error: 'Unauthorized' });

    post.content = content;
    await post.save();
    const updated = await Post.findById(post._id).populate('user', 'username');
    res.json(updated);
  } catch (err) {
    console.error('Error editing post:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// Delete comment
exports.deleteComment = async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId);
    if (!post) return res.status(404).json({ error: 'Post not found' });

    const comment = post.comments.id(req.params.commentId);
    if (!comment) return res.status(404).json({ error: 'Comment not found' });

    if (comment.user.toString() !== req.user._id.toString()) return res.status(403).json({ error: 'Unauthorized' });

    comment.remove();
    await post.save();
    res.json({ message: 'Comment deleted' });
  } catch (err) {
    console.error('Error deleting comment:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// Edit comment
exports.editComment = async (req, res) => {
  try {
    const { text } = req.body;
    const post = await Post.findById(req.params.postId);
    if (!post) return res.status(404).json({ error: 'Post not found' });

    const comment = post.comments.id(req.params.commentId);
    if (!comment) return res.status(404).json({ error: 'Comment not found' });

    if (comment.user.toString() !== req.user._id.toString()) return res.status(403).json({ error: 'Unauthorized' });

    comment.text = text;
    await post.save();
    res.json({ message: 'Comment updated' });
  } catch (err) {
    console.error('Error editing comment:', err);
    res.status(500).json({ error: 'Server error' });
  }
};
