import React, { useEffect, useState, useContext } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Modal,
  Share,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
} from 'react-native';
import EmojiSelector from 'react-native-emoji-selector';
import { AuthContext } from '../context/AuthContext';
import apiClient from '../api/client';

const CommunityScreen = () => {
  const [posts, setPosts] = useState([]);
  const [caption, setCaption] = useState('');
  const [currentUserId, setCurrentUserId] = useState(null);
  const [editingPost, setEditingPost] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [commentsModal, setCommentsModal] = useState(false);
  const [activePost, setActivePost] = useState(null);
  const [commentText, setCommentText] = useState('');

const { user } = useContext(AuthContext);


  const loadPosts = async () => {
    try {
      const res = await apiClient.get('/posts');
      setPosts(res.data);
    } catch (err) {
      console.error('Error loading posts:', err);
    }
  };

  useEffect(() => {
    if (user?.id || user?._id) setCurrentUserId(user.id || user._id);
    loadPosts();
  }, [user]);

  const handlePost = async () => {
    if (!caption.trim()) return;
    try {
      if (editingPost) {
        await apiClient.put(`/posts/${editingPost._id}`, { content: caption });
      } else {
        await apiClient.post('/posts', { content: caption });
      }
      setCaption('');
      setEditingPost(null);
      setShowEmojiPicker(false);
      loadPosts();
    } catch (err) {
      console.error('Post error:', err);
    }
  };

  const deletePost = async (id) => {
    try {
      await apiClient.delete(`/posts/${id}`);
      loadPosts();
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  const likePost = async (id) => {
    try {
      await apiClient.post(`/posts/${id}/like`);
      loadPosts();
    } catch (err) {
      console.error('Like error:', err);
    }
  };

  const openComments = (post) => {
    setActivePost(post);
    setCommentsModal(true);
  };

  const addComment = async () => {
    if (!commentText.trim() || !activePost) return;

    try {
      const res = await apiClient.post(`/posts/${activePost._id}/comment`, {
        text: commentText,
      });

      const updatedPost = res.data;

      setActivePost(updatedPost); 
      setPosts((prev) =>
        prev.map((p) => (p._id === updatedPost._id ? updatedPost : p))
      ); 

      setCommentText('');
    } catch (err) {
      console.error('Comment error:', err);
    }
  };


  const sharePost = async (post) => {
    try {
      await Share.share({
        message: `${post.user.username}: ${post.content}`
      });
    } catch (err) {
      console.error('Share error:', err);
    }
  };

  const renderPost = ({ item }) => (
    <View style={styles.post}>
      <Text style={styles.username}>{item.user.username}</Text>
      <Text style={styles.caption}>{item.content}</Text>
      <Text style={styles.timestamp}>{new Date(item.createdAt).toLocaleString()}</Text>

      <View style={styles.actionsRow}>
        <TouchableOpacity onPress={() => likePost(item._id)}>
          <Text style={styles.actionIcon}>❤️ {item.likes.length}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => openComments(item)}>
          <Text style={styles.actionIcon}>💬 {item.comments.length}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => sharePost(item)}>
          <Text style={styles.actionIcon}>🔗</Text>
        </TouchableOpacity>
      </View>

      {item.user._id === currentUserId && (
        <View style={styles.ownerRow}>
          <TouchableOpacity
            onPress={() => {
              setCaption(item.content);
              setEditingPost(item);
            }}>
            <Text style={styles.editBtn}>✏️ Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => deletePost(item._id)}>
            <Text style={styles.deleteBtn}>🗑 Delete</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.container}>
        <Text style={styles.header}>📢 Community</Text>

        <View style={styles.captionRow}>
          <TextInput
            placeholder="Write a caption..."
            value={caption}
            onChangeText={setCaption}
            style={styles.inputFlex}
          />
          <TouchableOpacity onPress={() => setShowEmojiPicker(!showEmojiPicker)}>
            <Text style={styles.emojiButton}>✍️</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handlePost}>
            <Text style={styles.postButton}>{editingPost ? 'Update' : 'Post'}</Text>
          </TouchableOpacity>
        </View>

        {showEmojiPicker && (
          <EmojiSelector
            onEmojiSelected={(emoji) => setCaption((prev) => prev + emoji)}
            showSearchBar={false}
            columns={8}
          />
        )}

        <FlatList
          data={posts}
          keyExtractor={(item) => item._id}
          renderItem={renderPost}
          contentContainerStyle={{ paddingBottom: 100 }}
        />

        {/* COMMENTS MODAL */}

        <Modal visible={commentsModal} animationType="slide">
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
          >
            <SafeAreaView style={styles.modalContainer}>
              <View style={styles.modalHeaderContainer}>
                <Text style={styles.modalHeader}>💬 Comments</Text>
              </View>

              <FlatList
                data={activePost?.comments || []}
                keyExtractor={(item) => item._id}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={{ paddingBottom: 90 }}
                renderItem={({ item }) => (
                  <View style={styles.commentBox}>
                    <Text style={styles.commentUser}>{item.user.username}</Text>
                    <Text>{item.text}</Text>
                  </View>
                )}
              />

              <View style={styles.commentInputRow}>
                <TouchableOpacity onPress={() => setCommentsModal(false)}>
                  <Text style={styles.closeBtn}>Close</Text>
                </TouchableOpacity>

                <TextInput
                  placeholder="Add a comment..."
                  value={commentText}
                  onChangeText={setCommentText}
                  style={styles.commentInput}
                />

                <TouchableOpacity onPress={addComment}>
                  <Text style={styles.postCommentBtn}>Post</Text>
                </TouchableOpacity>
              </View>
            </SafeAreaView>
          </KeyboardAvoidingView>
        </Modal>
      </View>
    </KeyboardAvoidingView>

  );
};

export default CommunityScreen;

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#fff' },

  header: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 12
  },

  captionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12
  },

  inputFlex: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 10,
    borderRadius: 8,
    marginRight: 8
  },

  emojiButton: { fontSize: 24, marginRight: 10 },

  postButton: {
    color: '#007BFF',
    fontSize: 16,
    fontWeight: 'bold'
  },

  post: {
    backgroundColor: '#f4f4f4',
    padding: 12,
    borderRadius: 10,
    marginBottom: 12
  },

  username: { fontWeight: 'bold', fontSize: 16 },
  caption: { marginTop: 4, fontSize: 15 },
  timestamp: { fontSize: 12, color: '#777', marginTop: 4 },

  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8
  },

  actionIcon: { fontSize: 16 },

  ownerRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 6
  },

  editBtn: { color: '#FFA500', marginRight: 16 },
  deleteBtn: { color: '#FF4444' },

  modalContainer: { flex: 1, backgroundColor: 'white' },

  modalHeaderContainer: {
    paddingVertical: 16,
    backgroundColor: '#fff',
    alignItems: 'center'
  },


  modalHeader: {
    fontSize: 22,
    fontWeight: 'bold'
  },

  commentBox: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee'
  },

  commentUser: {
    fontWeight: 'bold',
    marginBottom: 2
  },

  commentInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderTopWidth: 1,
    borderTopColor: '#eee'
  },

  closeBtn: {
    color: 'red',
    fontSize: 16,
    marginRight: 10
  },

  commentInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ccc',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#fff',
  },


  postCommentBtn: {
    color: '#007BFF',
    marginLeft: 10,
    fontWeight: 'bold',
    fontSize: 16
  }
});
