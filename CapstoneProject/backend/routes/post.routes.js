const express = require('express');
const router = express.Router();
const { ensureAuthenticated } = require('../middleware/auth.middleware');
const postController = require('../controllers/post.controller');

// --- Posts ---
router.post('/', ensureAuthenticated, postController.createPost);
router.get('/', ensureAuthenticated, postController.getAllPosts);
router.post('/:id/like', ensureAuthenticated, postController.toggleLike);
router.post('/:id/comment', ensureAuthenticated, postController.addComment);
router.put('/:id', ensureAuthenticated, postController.editPost);
router.delete('/:id', ensureAuthenticated, postController.deletePost);

// --- Comments ---
router.put('/:postId/comment/:commentId', ensureAuthenticated, postController.editComment);
router.delete('/:postId/comment/:commentId', ensureAuthenticated, postController.deleteComment);

module.exports = router;
