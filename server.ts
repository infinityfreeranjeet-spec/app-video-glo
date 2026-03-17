import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { createServer as createViteServer } from 'vite';
import path from 'path';

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  const PORT = 3000;

  // Presence tracking
  const users = new Map<string, { username: string, socketId: string, peerId: string | null, room: string | null }>();

  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('join', ({ username, peerId }) => {
      users.set(socket.id, { username, socketId: socket.id, peerId, room: null });
      io.emit('user-list', Array.from(users.values()));
    });

    socket.on('join-room', (roomName) => {
      const user = users.get(socket.id);
      if (user) {
        user.room = roomName;
        socket.join(roomName);
        // Notify others in the room
        socket.to(roomName).emit('user-joined-room', { 
          socketId: socket.id, 
          peerId: user.peerId, 
          username: user.username 
        });
        // Send current participants to the new user
        const participants = Array.from(users.values()).filter(u => u.room === roomName && u.socketId !== socket.id);
        socket.emit('room-participants', participants);
      }
    });

    socket.on('leave-room', () => {
      const user = users.get(socket.id);
      if (user && user.room) {
        socket.to(user.room).emit('user-left-room', socket.id);
        socket.leave(user.room);
        user.room = null;
      }
    });

    socket.on('send-message', (message) => {
      const user = users.get(socket.id);
      if (user) {
        io.emit('receive-message', {
          id: Math.random().toString(36).substr(2, 9),
          text: message.text,
          sender: user.username,
          timestamp: new Date().toISOString()
        });
      }
    });

    socket.on('call-request', ({ to, from, fromUsername, peerId, roomName }) => {
      io.to(to).emit('incoming-call', { from, fromUsername, peerId, roomName });
    });

    socket.on('call-response', ({ to, accepted }) => {
      io.to(to).emit('call-answered', { accepted, from: socket.id });
    });

    socket.on('disconnect', () => {
      const user = users.get(socket.id);
      if (user) {
        console.log(`${user.username} disconnected`);
        if (user.room) {
          io.to(user.room).emit('user-disconnected', user.peerId);
        }
        users.delete(socket.id);
        io.emit('user-list', Array.from(users.values()));
      }
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
