import React, { useState, useEffect, useRef } from 'react';
import { Send, User as UserIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Message {
  id: string;
  text: string;
  sender: string;
  timestamp: string;
}

interface ChatProps {
  messages: Message[];
  onSendMessage: (text: string) => void;
  currentUsername: string;
}

const Chat: React.FC<ChatProps> = ({ messages, onSendMessage, currentUsername }) => {
  const [inputText, setInputText] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputText.trim()) {
      onSendMessage(inputText);
      setInputText('');
    }
  };

  return (
    <div className="flex flex-col h-full bg-zinc-900/50 backdrop-blur-md rounded-2xl border border-white/5 overflow-hidden shadow-xl">
      {/* Header */}
      <div className="px-6 py-4 border-bottom border-white/5 flex items-center justify-between bg-white/5">
        <div className="flex items-center space-x-3">
          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
          <h3 className="text-sm font-mono uppercase tracking-widest text-zinc-400">Live Chat</h3>
        </div>
        <div className="text-[10px] font-mono text-zinc-500 uppercase">
          {messages.length} Messages
        </div>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-hide"
      >
        <AnimatePresence initial={false}>
          {messages.map((msg) => {
            const isMe = msg.sender === currentUsername;
            return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
              >
                <div className={`flex items-center space-x-2 mb-1 ${isMe ? 'flex-row-reverse space-x-reverse' : ''}`}>
                  <span className="text-[10px] font-mono text-zinc-500 uppercase">{msg.sender}</span>
                  <span className="text-[10px] font-mono text-zinc-600 italic">
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div
                  className={`max-w-[80%] px-4 py-2 rounded-2xl text-sm ${
                    isMe
                      ? 'bg-indigo-600 text-white rounded-tr-none'
                      : 'bg-zinc-800 text-zinc-200 rounded-tl-none border border-white/5'
                  }`}
                >
                  {msg.text}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-4 bg-white/5 border-t border-white/5">
        <div className="relative flex items-center">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Type a message..."
            className="w-full bg-zinc-950/50 border border-white/10 rounded-full py-3 pl-6 pr-14 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500/50 transition-all"
          />
          <button
            type="submit"
            className="absolute right-2 p-2 bg-indigo-600 text-white rounded-full hover:bg-indigo-500 transition-colors shadow-lg"
          >
            <Send size={18} />
          </button>
        </div>
      </form>
    </div>
  );
};

export default Chat;
