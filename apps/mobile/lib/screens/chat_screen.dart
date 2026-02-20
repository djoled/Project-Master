
import 'package:flutter/material.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:image_picker/image_picker.dart'; // Assumed dependency for camera
// import 'dart:io'; // Needed if we implement actual upload logic

class ChatScreen extends StatefulWidget {
  final String channelId;
  final String channelName;

  const ChatScreen({
    super.key,
    this.channelId = 'global',
    this.channelName = 'General Chat',
  });

  @override
  State<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends State<ChatScreen> {
  final TextEditingController _messageController = TextEditingController();
  final ScrollController _scrollController = ScrollController();
  final FirebaseAuth _auth = FirebaseAuth.instance;
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;

  // UI Colors
  final Color _bgDeepSlate = const Color(0xFF0F172A);
  final Color _bgBubbleMe = const Color(0xFF3B82F6); // Construction Blue
  final Color _bgBubbleOther = const Color(0xFF1E293B); // Lighter Slate
  final Color _textPrimary = Colors.white;
  final Color _textSecondary = const Color(0xFF94A3B8);

  void _sendMessage() async {
    final content = _messageController.text.trim();
    final user = _auth.currentUser;

    if (content.isEmpty || user == null) return;

    _messageController.clear();

    try {
      await _firestore.collection('messages').add({
        'channelId': widget.channelId,
        'senderId': user.uid,
        'senderName': user.displayName ?? user.email?.split('@')[0] ?? 'User',
        'content': content,
        'photoUrl': null, // Logic to handle photo upload would go here
        'timestamp': FieldValue.serverTimestamp(),
      });
    } catch (e) {
      debugPrint('Error sending message: $e');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to send: $e')),
        );
      }
    }
  }

  // Placeholder for camera logic
  Future<void> _pickImage() async {
    // Implementation would involve ImagePicker and FirebaseStorage
    debugPrint('Camera button pressed - Implement upload logic here');
  }

  @override
  Widget build(BuildContext context) {
    final user = _auth.currentUser;

    return Scaffold(
      backgroundColor: _bgDeepSlate,
      appBar: AppBar(
        backgroundColor: const Color(0xFF1E293B), // Slightly lighter header
        elevation: 0,
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              widget.channelName,
              style: const TextStyle(
                color: Colors.white,
                fontWeight: FontWeight.bold,
                fontSize: 18,
              ),
            ),
            if (widget.channelId != 'global')
              const Text(
                'Project Team',
                style: TextStyle(color: Colors.grey, fontSize: 12),
              ),
          ],
        ),
        iconTheme: const IconThemeData(color: Colors.white),
      ),
      body: Column(
        children: [
          // 1. Chat Feed
          Expanded(
            child: StreamBuilder<QuerySnapshot>(
              stream: _firestore
                  .collection('messages')
                  .where('channelId', isEqualTo: widget.channelId)
                  .orderBy('timestamp', descending: true)
                  .snapshots(),
              builder: (context, snapshot) {
                if (snapshot.hasError) {
                  return Center(
                    child: Text(
                      'Error loading chat',
                      style: TextStyle(color: _textSecondary),
                    ),
                  );
                }

                if (!snapshot.hasData) {
                  return const Center(child: CircularProgressIndicator());
                }

                final docs = snapshot.data!.docs;

                return ListView.builder(
                  controller: _scrollController,
                  reverse: true, // Newest messages at bottom
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 20),
                  itemCount: docs.length,
                  itemBuilder: (context, index) {
                    final data = docs[index].data() as Map<String, dynamic>;
                    final senderId = data['senderId'] ?? '';
                    final isMe = user?.uid == senderId;

                    return _MessageBubble(
                      isMe: isMe,
                      senderName: data['senderName'] ?? 'Unknown',
                      content: data['content'] ?? '',
                      photoUrl: data['photoUrl'],
                      timestamp: data['timestamp'],
                      colors: (
                        bgMe: _bgBubbleMe,
                        bgOther: _bgBubbleOther,
                        textPrimary: _textPrimary,
                        textSecondary: _textSecondary
                      ),
                    );
                  },
                );
              },
            ),
          ),

          // 2. Input Area (Kiosk Ready)
          Container(
            padding: const EdgeInsets.fromLTRB(12, 12, 12, 24), // Extra bottom padding
            decoration: const BoxDecoration(
              color: Color(0xFF1E293B), // Match AppBar
              border: Border(top: BorderSide(color: Color(0xFF334155))),
            ),
            child: Row(
              children: [
                // Camera Button
                IconButton(
                  onPressed: _pickImage,
                  icon: const Icon(Icons.camera_alt_outlined),
                  color: Colors.blueAccent,
                  iconSize: 28,
                  padding: const EdgeInsets.all(12), // Large touch target
                ),
                const SizedBox(width: 8),
                // Text Field
                Expanded(
                  child: Container(
                    decoration: BoxDecoration(
                      color: _bgDeepSlate,
                      borderRadius: BorderRadius.circular(24),
                      border: Border.all(color: const Color(0xFF334155)),
                    ),
                    child: TextField(
                      controller: _messageController,
                      style: const TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.w500,
                        fontSize: 16,
                      ),
                      decoration: InputDecoration(
                        hintText: 'Type a message...',
                        hintStyle: TextStyle(color: _textSecondary),
                        border: InputBorder.none,
                        contentPadding: const EdgeInsets.symmetric(
                          horizontal: 20,
                          vertical: 14,
                        ),
                      ),
                      textCapitalization: TextCapitalization.sentences,
                      onSubmitted: (_) => _sendMessage(),
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                // Send Button
                IconButton(
                  onPressed: _sendMessage,
                  icon: const Icon(Icons.send_rounded),
                  color: _bgBubbleMe,
                  iconSize: 28,
                  padding: const EdgeInsets.all(12), // Large touch target
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _MessageBubble extends StatelessWidget {
  final bool isMe;
  final String senderName;
  final String content;
  final String? photoUrl;
  final Timestamp? timestamp;
  final ({
    Color bgMe,
    Color bgOther,
    Color textPrimary,
    Color textSecondary
  }) colors;

  const _MessageBubble({
    required this.isMe,
    required this.senderName,
    required this.content,
    this.photoUrl,
    this.timestamp,
    required this.colors,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Column(
        crossAxisAlignment:
            isMe ? CrossAxisAlignment.end : CrossAxisAlignment.start,
        children: [
          // Sender Name (Only for others)
          if (!isMe)
            Padding(
              padding: const EdgeInsets.only(left: 12, bottom: 4),
              child: Text(
                senderName,
                style: TextStyle(
                  color: colors.textSecondary,
                  fontSize: 11,
                  fontWeight: FontWeight.bold,
                  letterSpacing: 0.5,
                ),
              ),
            ),

          // Bubble
          Container(
            constraints: BoxConstraints(
              maxWidth: MediaQuery.of(context).size.width * 0.75,
            ),
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            decoration: BoxDecoration(
              color: isMe ? colors.bgMe : colors.bgOther,
              borderRadius: BorderRadius.only(
                topLeft: const Radius.circular(20),
                topRight: const Radius.circular(20),
                bottomLeft: isMe ? const Radius.circular(20) : Radius.zero,
                bottomRight: isMe ? Radius.zero : const Radius.circular(20),
              ),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (photoUrl != null)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 8.0),
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(12),
                      child: Image.network(
                        photoUrl!,
                        fit: BoxFit.cover,
                        loadingBuilder: (ctx, child, progress) {
                          if (progress == null) return child;
                          return Container(
                            height: 150,
                            width: 200,
                            color: Colors.black26,
                            child: const Center(
                              child: CircularProgressIndicator(strokeWidth: 2),
                            ),
                          );
                        },
                      ),
                    ),
                  ),
                if (content.isNotEmpty)
                  Text(
                    content,
                    style: TextStyle(
                      color: colors.textPrimary,
                      fontSize: 15,
                      height: 1.4,
                    ),
                  ),
              ],
            ),
          ),
          
          // Timestamp (Optional, purely aesthetic for now)
          if (timestamp != null)
             Padding(
              padding: EdgeInsets.only(
                top: 4, 
                left: isMe ? 0 : 12, 
                right: isMe ? 12 : 0
              ),
              child: Text(
                _formatTime(timestamp!),
                style: TextStyle(
                  color: const Color(0xFF64748B),
                  fontSize: 10,
                ),
              ),
            ),
        ],
      ),
    );
  }

  String _formatTime(Timestamp timestamp) {
    final dt = timestamp.toDate();
    final hour = dt.hour > 12 ? dt.hour - 12 : dt.hour;
    final amPm = dt.hour >= 12 ? 'PM' : 'AM';
    final minute = dt.minute.toString().padLeft(2, '0');
    return '$hour:$minute $amPm';
  }
}
