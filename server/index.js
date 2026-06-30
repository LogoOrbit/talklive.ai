const path = require('path');
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, '..', 'public')));

// Matchmaking state
const waitingQueue = []; // socket ids waiting for a partner
const partners = new Map(); // socketId -> partnerSocketId
const onlineCount = () => io.engine.clientsCount;

function broadcastOnlineCount() {
  io.emit('online-count', onlineCount());
}

function clearFromQueue(socketId) {
  const idx = waitingQueue.indexOf(socketId);
  if (idx !== -1) waitingQueue.splice(idx, 1);
}

function disconnectPartner(socketId) {
  const partnerId = partners.get(socketId);
  if (!partnerId) return null;
  partners.delete(socketId);
  partners.delete(partnerId);
  const partnerSocket = io.sockets.sockets.get(partnerId);
  if (partnerSocket) {
    partnerSocket.emit('partner-left');
  }
  return partnerId;
}

function tryMatch(socketId) {
  // Remove any stale partner link first
  disconnectPartner(socketId);
  clearFromQueue(socketId);

  if (waitingQueue.length > 0) {
    const partnerId = waitingQueue.shift();
    const partnerSocket = io.sockets.sockets.get(partnerId);

    // partner may have disconnected already
    if (!partnerSocket) {
      return tryMatch(socketId);
    }

    partners.set(socketId, partnerId);
    partners.set(partnerId, socketId);

    // The longer-waiting peer (partnerId) initiates the WebRTC offer
    partnerSocket.emit('matched', { initiator: true });
    io.sockets.sockets.get(socketId)?.emit('matched', { initiator: false });
  } else {
    waitingQueue.push(socketId);
    io.sockets.sockets.get(socketId)?.emit('waiting');
  }
}

io.on('connection', (socket) => {
  broadcastOnlineCount();

  socket.on('find-partner', () => {
    tryMatch(socket.id);
  });

  socket.on('skip', () => {
    disconnectPartner(socket.id);
    tryMatch(socket.id);
  });

  socket.on('leave', () => {
    disconnectPartner(socket.id);
    clearFromQueue(socket.id);
  });

  // WebRTC signaling relay — only forwarded to the current partner
  socket.on('signal', (data) => {
    const partnerId = partners.get(socket.id);
    if (partnerId) {
      io.to(partnerId).emit('signal', data);
    }
  });

  socket.on('mic-state', (muted) => {
    const partnerId = partners.get(socket.id);
    if (partnerId) {
      io.to(partnerId).emit('partner-mic-state', muted);
    }
  });

  socket.on('disconnect', () => {
    disconnectPartner(socket.id);
    clearFromQueue(socket.id);
    broadcastOnlineCount();
  });
});

server.listen(PORT, () => {
  console.log(`TalkLive server running on port ${PORT}`);
});
