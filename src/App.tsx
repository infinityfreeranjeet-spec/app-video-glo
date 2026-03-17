import React, { useState, useEffect, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { motion, AnimatePresence } from 'motion/react';
import { User, Video, MessageSquare, Gamepad2, LogOut, Users } from 'lucide-react';
import Chat from './components/Chat';
import VideoCall from './components/VideoCall';
import PinballGame from './components/PinballGame';
import SnakeGame from './components/SnakeGame';
import { Phone, X, Check, Shuffle } from 'lucide-react';

interface ChatMessage {
  id: string;
  text: string;
  sender: string;
  timestamp: string;
}

interface OnlineUser {
  username: string;
  socketId: string;
  peerId: string | null;
}

interface IncomingCall {
  from: string;
  fromUsername: string;
  peerId: string;
  roomName: string;
}

export default function App() {
  const [username, setUsername] = useState<string | null>(localStorage.getItem('glow_username'));
  const [tempUsername, setTempUsername] = useState('');
  const [socket, setSocket] = useState<Socket | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [activeCall, setActiveCall] = useState<string | null>(null);
  const [roomName, setRoomName] = useState<string | null>(null);
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);
  const [isCalling, setIsCalling] = useState(false);
  const [showGame, setShowGame] = useState(false);
  const [currentGame, setCurrentGame] = useState<'pinball' | 'snake'>('pinball');
  const [myPeerId] = useState(() => Math.random().toString(36).substr(2, 9));

  useEffect(() => {
    if (username) {
      const newSocket = io();
      setSocket(newSocket);

      newSocket.emit('join', { username, peerId: myPeerId });

      newSocket.on('receive-message', (msg: ChatMessage) => {
        setMessages((prev) => [...prev, msg]);
      });

      newSocket.on('user-list', (users: OnlineUser[]) => {
        setOnlineUsers(users.filter(u => u.username !== username));
      });

      newSocket.on('incoming-call', (data: IncomingCall) => {
        setIncomingCall(data);
      });

      newSocket.on('call-answered', ({ accepted }) => {
        setIsCalling(false);
        if (accepted) {
          // The peerId is already set when we initiated the call
        } else {
          setActiveCall(null);
          alert('Call rejected');
        }
      });

      return () => {
        newSocket.close();
      };
    }
  }, [username, myPeerId]);

  const initiateCall = (user: OnlineUser) => {
    if (socket) {
      const generatedRoom = `room_${Math.min(socket.id.length, user.socketId.length)}_${Date.now()}`;
      setRoomName(generatedRoom);
      setIsCalling(true);
      socket.emit('call-request', {
        to: user.socketId,
        from: socket.id,
        fromUsername: username,
        peerId: myPeerId,
        roomName: generatedRoom
      });
    }
  };

  const acceptCall = () => {
    if (socket && incomingCall) {
      setRoomName(incomingCall.roomName || 'global');
      socket.emit('call-response', { to: incomingCall.from, accepted: true });
      setIncomingCall(null);
    }
  };

  const rejectCall = () => {
    if (socket && incomingCall) {
      socket.emit('call-response', { to: incomingCall.from, accepted: false });
      setIncomingCall(null);
    }
  };

  const randomMatch = () => {
    if (onlineUsers.length > 0) {
      const randomUser = onlineUsers[Math.floor(Math.random() * onlineUsers.length)];
      initiateCall(randomUser);
    } else {
      alert('No one else is online right now!');
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (tempUsername.trim()) {
      localStorage.setItem('glow_username', tempUsername);
      setUsername(tempUsername);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('glow_username');
    setUsername(null);
    setSocket(null);
  };

  const sendMessage = useCallback((text: string) => {
    if (socket) {
      socket.emit('send-message', { text });
    }
  }, [socket]);

  if (!username) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-6 font-sans">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md bg-zinc-900 p-8 rounded-3xl border border-white/5 shadow-2xl"
        >
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-[0_0_30px_rgba(79,70,229,0.3)] mb-4">
              <Video className="text-white w-8 h-8" />
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">GlowBall</h1>
            <p className="text-zinc-500 text-sm mt-1">Connect, Chat, and Play</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-2 ml-1">Username</label>
              <input
                type="text"
                value={tempUsername}
                onChange={(e) => setTempUsername(e.target.value)}
                placeholder="Enter your name..."
                className="w-full bg-zinc-950 border border-white/10 rounded-2xl py-4 px-6 text-white placeholder-zinc-700 focus:outline-none focus:border-indigo-500/50 transition-all"
                required
              />
            </div>
            <button
              type="submit"
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-4 rounded-2xl transition-all shadow-lg active:scale-[0.98]"
            >
              Get Started
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white font-sans flex flex-col overflow-hidden">
      {/* Header */}
      <header className="h-16 border-b border-white/5 flex items-center justify-between px-6 bg-zinc-900/50 backdrop-blur-xl z-50">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
            <Video size={16} />
          </div>
          <span className="font-bold tracking-tight">GlowBall</span>
        </div>

        <div className="flex items-center space-x-4">
          <button
            onClick={() => setRoomName('global')}
            className="flex items-center space-x-2 bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-400 px-4 py-1.5 rounded-full border border-emerald-500/30 transition-all text-xs font-mono uppercase tracking-widest"
          >
            <Users size={14} />
            <span>Global Room</span>
          </button>
          <button
            onClick={randomMatch}
            className="flex items-center space-x-2 bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-400 px-4 py-1.5 rounded-full border border-indigo-500/30 transition-all text-xs font-mono uppercase tracking-widest"
          >
            <Shuffle size={14} />
            <span>Random Match</span>
          </button>
          <div className="flex items-center space-x-2 bg-white/5 px-3 py-1.5 rounded-full border border-white/10">
            <div className="w-2 h-2 bg-emerald-500 rounded-full" />
            <span className="text-xs font-mono text-zinc-400 uppercase">{username}</span>
          </div>
          <button
            onClick={handleLogout}
            className="p-2 text-zinc-500 hover:text-white transition-colors"
          >
            <LogOut size={18} />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col md:flex-row p-4 gap-4 overflow-hidden">
        {/* Left Column: Call & Game */}
        <div className="flex-1 flex flex-col gap-4 min-h-0">
          {/* Top: Game Overlay Toggle & Game */}
          <div className="relative flex-1 min-h-0">
            <div className="absolute top-4 right-4 z-40 flex flex-col space-y-2">
              <button
                onClick={() => setShowGame(!showGame)}
                className={`p-3 rounded-full backdrop-blur-md border transition-all ${
                  showGame
                    ? 'bg-indigo-600 border-indigo-400 text-white shadow-[0_0_15px_rgba(99,102,241,0.5)]'
                    : 'bg-black/40 border-white/10 text-zinc-400 hover:text-white'
                }`}
              >
                <Gamepad2 size={20} />
              </button>
              
              {showGame && (
                <div className="flex flex-col space-y-2 bg-black/60 backdrop-blur-md p-2 rounded-2xl border border-white/10">
                  <button
                    onClick={() => setCurrentGame('pinball')}
                    className={`p-2 rounded-xl transition-all ${currentGame === 'pinball' ? 'bg-indigo-600 text-white' : 'text-zinc-500 hover:text-white'}`}
                  >
                    <Gamepad2 size={16} />
                  </button>
                  <button
                    onClick={() => setCurrentGame('snake')}
                    className={`p-2 rounded-xl transition-all ${currentGame === 'snake' ? 'bg-indigo-600 text-white' : 'text-zinc-500 hover:text-white'}`}
                  >
                    <Shuffle size={16} />
                  </button>
                </div>
              )}
            </div>

            <div className="w-full h-full relative rounded-2xl overflow-hidden border border-white/5 bg-zinc-900 shadow-2xl">
              <VideoCall
                myPeerId={myPeerId}
                socket={socket}
                roomName={roomName}
                onHangUp={() => { setRoomName(null); setActiveCall(null); }}
              />

              <AnimatePresence>
                {showGame && (
                  <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="absolute inset-0 z-30 p-4 pointer-events-none"
                  >
                    <div className="w-full h-full pointer-events-auto">
                      {currentGame === 'pinball' ? (
                        <PinballGame isActive={showGame} />
                      ) : (
                        <SnakeGame isActive={showGame} />
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Calling Overlay */}
              <AnimatePresence>
                {isCalling && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 z-50 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center"
                  >
                    <div className="w-24 h-24 bg-indigo-600 rounded-full flex items-center justify-center animate-pulse shadow-[0_0_50px_rgba(79,70,229,0.5)] mb-6">
                      <Phone className="text-white w-10 h-10 animate-bounce" />
                    </div>
                    <h2 className="text-xl font-bold mb-2">Calling...</h2>
                    <button
                      onClick={() => { setIsCalling(false); setActiveCall(null); }}
                      className="mt-8 px-8 py-3 bg-red-600 hover:bg-red-700 rounded-full text-white font-semibold transition-all"
                    >
                      Cancel
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Incoming Call Modal */}
              <AnimatePresence>
                {incomingCall && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 50 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 50 }}
                    className="absolute bottom-8 left-1/2 -translate-x-1/2 z-[60] w-[90%] max-w-sm bg-zinc-900 border border-indigo-500/30 rounded-3xl p-6 shadow-[0_20px_50px_rgba(0,0,0,0.5)]"
                  >
                    <div className="flex items-center space-x-4 mb-6">
                      <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center">
                        <Phone className="text-white" />
                      </div>
                      <div>
                        <h3 className="font-bold text-lg">{incomingCall.fromUsername}</h3>
                        <p className="text-xs text-zinc-500 uppercase tracking-widest font-mono">Incoming Video Call</p>
                      </div>
                    </div>
                    <div className="flex space-x-3">
                      <button
                        onClick={acceptCall}
                        className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-3 rounded-2xl flex items-center justify-center space-x-2 transition-all"
                      >
                        <Check size={20} />
                        <span className="font-semibold">Accept</span>
                      </button>
                      <button
                        onClick={rejectCall}
                        className="flex-1 bg-red-600 hover:bg-red-500 text-white py-3 rounded-2xl flex items-center justify-center space-x-2 transition-all"
                      >
                        <X size={20} />
                        <span className="font-semibold">Decline</span>
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Right Column: Users & Chat */}
        <div className="w-full md:w-96 flex flex-col gap-4 min-h-0">
          {/* Online Users */}
          <div className="bg-zinc-900/50 backdrop-blur-md rounded-2xl border border-white/5 p-4">
            <div className="flex items-center space-x-2 mb-4">
              <Users size={14} className="text-zinc-500" />
              <h3 className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">Online Now</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {onlineUsers.length === 0 ? (
                <p className="text-xs text-zinc-600 italic">No one else is online yet...</p>
              ) : (
                onlineUsers.map((u) => (
                  <button
                    key={u.socketId}
                    onClick={() => initiateCall(u)}
                    className="flex items-center space-x-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full px-3 py-1.5 transition-all group"
                  >
                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full group-hover:animate-ping" />
                    <span className="text-xs text-zinc-300">{u.username}</span>
                    <Video size={12} className="text-zinc-500 group-hover:text-indigo-400" />
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Chat */}
          <div className="flex-1 min-h-0">
            <Chat
              messages={messages}
              onSendMessage={sendMessage}
              currentUsername={username}
            />
          </div>
        </div>
      </main>

      {/* Mobile Navigation (Optional) */}
      <nav className="md:hidden h-16 bg-zinc-900 border-t border-white/5 flex items-center justify-around px-4">
        <button className="p-2 text-indigo-500"><Video size={24} /></button>
        <button className="p-2 text-zinc-500"><MessageSquare size={24} /></button>
        <button className="p-2 text-zinc-500"><Gamepad2 size={24} /></button>
      </nav>
    </div>
  );
}
