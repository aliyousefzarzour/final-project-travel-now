// =================== CHAT CONTROLLER ===================
const Chat = require('../models/ChatMessage');
const { emitToUser } = require('../services/socketService');

// Get or create chat for current user
exports.getMyChat = async (req, res) => {
    try {
        let chat = await Chat.findOne({ userId: req.user.id }).catch(() => null);
        if (!chat) {
            chat = await Chat.create({ userId: req.user.id, messages: [] });
        }
        // Mark user messages as read
        await Chat.updateOne(
            { _id: chat._id },
            { $set: { userUnread: 0, 'messages.$[m].readAt': new Date() } },
            { arrayFilters: [{ 'm.sender': 'admin', 'm.readAt': null }] }
        ).catch(() => {});
        chat = await Chat.findById(chat._id);
        res.json({ chat });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// User sends a message
exports.userSend = async (req, res) => {
    try {
        const { text } = req.body;
        if (!text?.trim()) return res.status(400).json({ message: 'Message required' });

        let chat = await Chat.findOne({ userId: req.user.id }).catch(() => null);
        if (!chat) chat = await Chat.create({ userId: req.user.id, messages: [] });

        const msg = { sender: 'user', text: text.trim(), createdAt: new Date() };
        chat.messages.push(msg);
        chat.adminUnread += 1;
        chat.lastMessage = text.trim().slice(0, 60);
        chat.lastAt = new Date();
        await chat.save();

        const newMsg = chat.messages[chat.messages.length - 1];

        // Notify admin via Socket.IO — emit to admin room
        const User = require('../models/User');
        const admin = await User.findOne({ role: 'admin' }).catch(() => null);
        if (admin) {
            emitToUser(String(admin._id), 'chat_message', {
                chatId:  chat._id,
                userId:  req.user.id,
                userName: req.user.fullName || req.user.email,
                message: { ...newMsg.toObject(), sender: 'user' }
            });
        }

        res.json({ message: 'Sent', msg: newMsg });
    } catch (err) {
        res.status(500).json({ message: 'Send failed', error: err.message });
    }
};

// Admin gets all chats
exports.getAllChats = async (req, res) => {
    try {
        const chats = await Chat.find()
            .populate('userId', 'fullName email phone')
            .sort('-lastAt')
            .catch(() => []);
        res.json({ chats });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// Admin gets one chat
exports.getChatById = async (req, res) => {
    try {
        const chat = await Chat.findById(req.params.id)
            .populate('userId', 'fullName email phone')
            .catch(() => null);
        if (!chat) return res.status(404).json({ message: 'Chat not found' });

        // Mark admin unread as 0
        await Chat.updateOne({ _id: chat._id }, { $set: { adminUnread: 0 } });
        res.json({ chat });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// Admin sends a reply
exports.adminSend = async (req, res) => {
    try {
        const { text } = req.body;
        if (!text?.trim()) return res.status(400).json({ message: 'Message required' });

        const chat = await Chat.findById(req.params.id).populate('userId', 'fullName email').catch(() => null);
        if (!chat) return res.status(404).json({ message: 'Chat not found' });

        const msg = { sender: 'admin', text: text.trim(), createdAt: new Date() };
        chat.messages.push(msg);
        chat.userUnread += 1;
        chat.lastMessage = text.trim().slice(0, 60);
        chat.lastAt = new Date();
        await chat.save();

        const newMsg = chat.messages[chat.messages.length - 1];

        // Real-time to user
        emitToUser(String(chat.userId._id || chat.userId), 'chat_message', {
            chatId:  chat._id,
            message: { ...newMsg.toObject(), sender: 'admin' }
        });

        res.json({ message: 'Sent', msg: newMsg });
    } catch (err) {
        res.status(500).json({ message: 'Admin send failed', error: err.message });
    }
};

// Admin init chat for a user and send first message
exports.adminInitChat = async (req, res) => {
    try {
        const { text } = req.body;
        const { userId } = req.params;
        if (!text?.trim()) return res.status(400).json({ message: 'Message required' });

        let chat = await Chat.findOne({ userId }).catch(() => null);
        if (!chat) chat = await Chat.create({ userId, messages: [] });

        const msg = { sender: 'admin', text: text.trim(), createdAt: new Date() };
        chat.messages.push(msg);
        chat.userUnread  += 1;
        chat.lastMessage  = text.trim().slice(0, 60);
        chat.lastAt       = new Date();
        await chat.save();

        const newMsg = chat.messages[chat.messages.length - 1];

        // Real-time to user
        emitToUser(String(userId), 'chat_message', {
            chatId:  chat._id,
            message: { ...newMsg.toObject(), sender: 'admin' }
        });

        res.json({ message: 'Sent', chatId: chat._id, msg: newMsg });
    } catch (err) {
        res.status(500).json({ message: 'Failed', error: err.message });
    }
};

// Mark user messages as read (admin opened chat)
exports.adminMarkRead = async (req, res) => {
    try {
        await Chat.updateOne(
            { _id: req.params.id },
            { $set: { adminUnread: 0 } }
        );
        res.json({ ok: true });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
};
