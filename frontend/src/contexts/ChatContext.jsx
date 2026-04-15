import { createContext, useContext, useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import toast from 'react-hot-toast';

const ChatContext = createContext(null);

export function ChatProvider({ children }) {
  const { user } = useAuth();
  const [socket, setSocket] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [unreadTotal, setUnreadTotal] = useState(0);
  const [unreadByUser, setUnreadByUser] = useState({}); // { userId: count }
  const [messages, setMessages] = useState({});          // { userId: [msg, ...] }
  const [typing, setTyping] = useState({});              // { userId: bool }
  const activeConvRef = useRef(null); // userId da conversa aberta no momento

  useEffect(() => {
    if (!user || !['admin', 'tecnico'].includes(user.role)) return;

    const token = localStorage.getItem('jd_token');
    const s = io('http://localhost:3001', {
      auth: { token },
      transports: ['websocket', 'polling']
    });

    s.on('connect', () => setSocket(s));
    s.on('disconnect', () => setSocket(null));
    s.on('users:online', (users) => setOnlineUsers(users));

    s.on('chat:message', (msg) => {
      const otherId = msg.sender_id === user.id ? msg.receiver_id : msg.sender_id;
      setMessages(prev => ({
        ...prev,
        [otherId]: [...(prev[otherId] || []), msg]
      }));

      // Notificação apenas quando recebo mensagem e não estou nessa conversa
      if (msg.sender_id !== user.id) {
        const isViewingConv = activeConvRef.current === msg.sender_id;

        if (!isViewingConv) {
          // Toast de notificação clicável
          toast(
            <div className="flex items-center gap-2">
              <span className="text-lg">💬</span>
              <div>
                <p className="font-bold text-sm">{msg.sender_name || 'Nova mensagem'}</p>
                <p className="text-xs opacity-80 truncate max-w-40">{msg.message}</p>
              </div>
            </div>,
            {
              duration: 5000,
              style: { cursor: 'pointer' },
              id: `chat-${msg.sender_id}`,
            }
          );

          // Badge por usuário
          setUnreadByUser(prev => ({
            ...prev,
            [msg.sender_id]: (prev[msg.sender_id] || 0) + 1
          }));
          setUnreadTotal(p => p + 1);
        }
      }
    });

    s.on('chat:typing', ({ sender_id, typing: isTyping }) => {
      setTyping(prev => ({ ...prev, [sender_id]: isTyping }));
    });

    setSocket(s);
    return () => s.disconnect();
  }, [user?.id]);

  function loadHistory(withUserId, msgs) {
    setMessages(prev => ({ ...prev, [withUserId]: msgs }));
  }

  function sendMessage(receiver_id, message) {
    if (socket) socket.emit('chat:send', { receiver_id, message });
  }

  function sendTyping(receiver_id, isTyping) {
    if (socket) socket.emit('chat:typing', { receiver_id, typing: isTyping });
  }

  function setActiveConv(userId) {
    activeConvRef.current = userId;
  }

  function clearUnread(fromUserId) {
    setUnreadByUser(prev => {
      const count = prev[fromUserId] || 0;
      setUnreadTotal(p => Math.max(0, p - count));
      return { ...prev, [fromUserId]: 0 };
    });
  }

  function isOnline(userId) {
    return onlineUsers.some(u => String(u.id) === String(userId));
  }

  return (
    <ChatContext.Provider value={{
      socket, onlineUsers, unreadTotal, unreadByUser,
      messages, typing,
      loadHistory, sendMessage, sendTyping,
      clearUnread, setActiveConv, isOnline, setUnreadTotal
    }}>
      {children}
    </ChatContext.Provider>
  );
}

export const useChat = () => useContext(ChatContext);
