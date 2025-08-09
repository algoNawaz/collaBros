require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const boardRoutes = require('./routes/board');
const authMiddleware = require('./middleware/auth');

const app = express();
const server = http.createServer(app);
const io = new socketIo.Server(server, {
    cors: {
        origin: 'http://localhost:5173', // Replace with your frontend URL in production
        methods: ['GET', 'POST'],
    },
});

const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('MongoDB connected'))
    .catch(err => console.error('MongoDB connection error:', err));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/boards', authMiddleware, boardRoutes); // Protect board routes

// Socket.IO
io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    // Join a room (board ID)
    socket.on('joinBoard', (boardId) => {
        socket.join(boardId);
        console.log(`${socket.id} joined board: ${boardId}`);
    });

    // Handle drawing
    socket.on('drawing', (data) => {
        console.log('Server received a drawing event:', data); // <-- ADD THIS LINE
        io.to(data.boardId).emit('drawing', data);
    });

    // Handle sticky note creation/update
    socket.on('stickyNote', (data) => {
        io.to(data.boardId).emit('stickyNote', data);
    });

    // Handle cursor movement
    socket.on('cursorMove', (data) => {
        io.to(data.boardId).emit('cursorMove', {
            userId: socket.id,
            x: data.x,
            y: data.y,
            username: data.username // Send username for cursor label
        });
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });
});

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});