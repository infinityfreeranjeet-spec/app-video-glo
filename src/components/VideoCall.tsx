import React, { useEffect, useRef, useState } from 'react';
import Peer from 'peerjs';
import { Camera, CameraOff, Mic, MicOff, PhoneOff, Zap, ZapOff, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Socket } from 'socket.io-client';

interface VideoCallProps {
  myPeerId: string;
  socket: Socket | null;
  roomName: string | null;
  onHangUp: () => void;
}

interface RemoteStream {
  peerId: string;
  username: string;
  stream: MediaStream;
}

const VideoCall: React.FC<VideoCallProps> = ({ myPeerId, socket, roomName, onHangUp }) => {
  const [peer, setPeer] = useState<Peer | null>(null);
  const [myStream, setMyStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<RemoteStream[]>([]);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isBlackLight, setIsBlackLight] = useState(true);

  const myVideoRef = useRef<HTMLVideoElement>(null);
  const peersRef = useRef<{ [key: string]: any }>({});

  useEffect(() => {
    const newPeer = new Peer(myPeerId);
    setPeer(newPeer);

    navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then((stream) => {
      setMyStream(stream);
      if (myVideoRef.current) {
        myVideoRef.current.srcObject = stream;
      }

      newPeer.on('call', (call) => {
        call.answer(stream);
        call.on('stream', (remoteStream) => {
          addRemoteStream(call.peer, remoteStream);
        });
      });

      if (socket && roomName) {
        socket.emit('join-room', roomName);

        socket.on('room-participants', (participants: any[]) => {
          participants.forEach(p => {
            if (p.peerId) {
              const call = newPeer.call(p.peerId, stream);
              call.on('stream', (remoteStream) => {
                addRemoteStream(p.peerId, remoteStream, p.username);
              });
              peersRef.current[p.peerId] = call;
            }
          });
        });

        socket.on('user-joined-room', ({ peerId, username }) => {
          // When someone joins, they will call us, but we can also call them if needed
          // PeerJS handles duplicate calls usually, but let's wait for them to call us
          // or we call them. To be safe, let's just wait for incoming calls.
          console.log('User joined room:', username);
        });

        socket.on('user-left-room', (socketId) => {
          // We need to find the peerId associated with this socketId
          // Since we don't have a direct map here, we can just rely on PeerJS 'close' event
          // but for better UX, let's track peerIds in the room
        });

        socket.on('user-disconnected', (peerId) => {
          setRemoteStreams(prev => prev.filter(s => s.peerId !== peerId));
        });
      }
    });

    return () => {
      newPeer.destroy();
      myStream?.getTracks().forEach(track => track.stop());
      if (socket) socket.emit('leave-room');
    };
  }, [myPeerId, roomName]);

  const addRemoteStream = (peerId: string, stream: MediaStream, username?: string) => {
    setRemoteStreams(prev => {
      if (prev.find(s => s.peerId === peerId)) return prev;
      return [...prev, { peerId, stream, username: username || 'Guest' }];
    });
  };

  const toggleMute = () => {
    if (myStream) {
      myStream.getAudioTracks()[0].enabled = !myStream.getAudioTracks()[0].enabled;
      setIsMuted(!myStream.getAudioTracks()[0].enabled);
    }
  };

  const toggleVideo = () => {
    if (myStream) {
      myStream.getVideoTracks()[0].enabled = !myStream.getVideoTracks()[0].enabled;
      setIsVideoOff(!myStream.getVideoTracks()[0].enabled);
    }
  };

  return (
    <div className="relative w-full h-full bg-zinc-950 rounded-2xl overflow-hidden flex items-center justify-center border border-white/5 shadow-2xl">
      {/* Grid of Remote Videos */}
      <div className={`grid w-full h-full gap-2 p-2 ${
        remoteStreams.length <= 1 ? 'grid-cols-1' : 
        remoteStreams.length <= 4 ? 'grid-cols-2' : 'grid-cols-3'
      }`}>
        {remoteStreams.map((rs) => (
          <div key={rs.peerId} className="relative bg-zinc-900 rounded-xl overflow-hidden border border-white/10">
            <video
              autoPlay
              playsInline
              ref={el => { if (el) el.srcObject = rs.stream; }}
              className="w-full h-full object-cover"
            />
            <div className="absolute bottom-2 left-2 bg-black/60 px-2 py-1 rounded text-[10px] font-mono text-white uppercase">
              {rs.username}
            </div>
          </div>
        ))}
        
        {remoteStreams.length === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-500 space-y-4">
            <div className="w-20 h-20 rounded-full bg-zinc-900 animate-pulse flex items-center justify-center">
              <Users className="w-8 h-8 opacity-20" />
            </div>
            <p className="text-sm font-mono tracking-widest uppercase animate-pulse">Waiting for others...</p>
          </div>
        )}
      </div>

      {/* Black Light Overlay */}
      <AnimatePresence>
        {isBlackLight && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 pointer-events-none bg-indigo-950/40 mix-blend-multiply backdrop-blur-[1px] z-10"
            style={{
              boxShadow: 'inset 0 0 150px rgba(0,0,0,0.8)',
              background: 'radial-gradient(circle, transparent 30%, rgba(10, 10, 30, 0.8) 100%)'
            }}
          />
        )}
      </AnimatePresence>

      {/* Local Video (PIP) */}
      <motion.div
        drag
        dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
        className="absolute bottom-24 right-6 w-32 h-44 bg-zinc-900 rounded-xl overflow-hidden border-2 border-white/10 shadow-xl cursor-move z-20"
      >
        <video
          ref={myVideoRef}
          autoPlay
          muted
          playsInline
          className="w-full h-full object-cover"
        />
        {isVideoOff && (
          <div className="absolute inset-0 bg-zinc-900 flex items-center justify-center">
            <CameraOff className="text-zinc-600" />
          </div>
        )}
      </motion.div>

      {/* Controls */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center space-x-4 z-30">
        <button
          onClick={toggleMute}
          className={`p-4 rounded-full transition-all duration-300 ${isMuted ? 'bg-red-500 text-white' : 'bg-white/10 text-white hover:bg-white/20 backdrop-blur-md border border-white/10'}`}
        >
          {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
        </button>
        <button
          onClick={toggleVideo}
          className={`p-4 rounded-full transition-all duration-300 ${isVideoOff ? 'bg-red-500 text-white' : 'bg-white/10 text-white hover:bg-white/20 backdrop-blur-md border border-white/10'}`}
        >
          {isVideoOff ? <CameraOff size={20} /> : <Camera size={20} />}
        </button>
        <button
          onClick={() => setIsBlackLight(!isBlackLight)}
          className={`p-4 rounded-full transition-all duration-300 ${isBlackLight ? 'bg-indigo-500 text-white shadow-[0_0_15px_rgba(99,102,241,0.5)]' : 'bg-white/10 text-white hover:bg-white/20 backdrop-blur-md border border-white/10'}`}
        >
          {isBlackLight ? <Zap size={20} /> : <ZapOff size={20} />}
        </button>
        <button
          onClick={onHangUp}
          className="p-4 rounded-full bg-red-600 text-white hover:bg-red-700 transition-all duration-300 shadow-lg"
        >
          <PhoneOff size={20} />
        </button>
      </div>
    </div>
  );
};

export default VideoCall;
