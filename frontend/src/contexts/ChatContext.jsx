import { createContext, useContext, useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import toast from 'react-hot-toast';

const ChatContext = createContext(null);

// Som de notificacao gerado via Web Audio API (sem arquivo externo)
function playNotificationSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const o1 = ctx.createOscillator();
    const o2 = ctx.createOscillator();
    const gain = ctx.createGain();
    o1.connect(gain); o2.connect(gain); gain.connect(ctx.destination);
    o1.frequency.setValueAtTime(880, ctx.currentTime);
    o1.frequency.setValueAtTime(1100, ctx.currentTime + 0.1);
    o2.frequency.setValueAtTime(660, ctx.currentTime);
    o2.frequency.setValueAtTime(880, ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    o1.start(ctx.currentTime); o1.stop(ctx.currentTime + 0.4);
    o2.start(ctx.currentTime); o2.stop(ctx.currentTime + 0.4);
  } catch {}
}

export function ChatProvider({ children }) {
  const { user } = useAuth();
  const [socket, setSocket] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [unreadTotal, setUnreadTotal] = useState(0);
  const [unreadByUser, setUnreadByUser] = useState({});
  const [messages, setMessages] = useState({});
  const [typing, setTyping] = useState({});
  const activeConvRef = useRef(null);
  const swRef = useRef(null);

  // Registra Service Worker para notificações em background
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/notify-sw.js').then(reg => {
        swRef.current = reg;
      }).catch(() => {});
      Notification.requestPermission().catch(() => {});
    }
  }, []);

  function sendNotification(title, body, tag = 'jd-notify') {
    if (swRef.current?.active) {
      swRef.current.active.postMessage({ type: 'NOTIFY', title, body, tag });
    } else if (Notification.permission === 'granted') {
      new Notification(title, { body, icon: '/logo192.png', vibrate: [200, 100, 200] });
    }
  }

  useEffect(() => {
    if (!user) return;

    const token = localStorage.getItem('jd_token');
    const s = io(window.location.origin, {
      auth: { token },
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
      pingInterval: 10000,
      pingTimeout: 5000
    });

    s.on('connect', () => { setSocket(s); });
    s.on('disconnect', () => { setSocket(null); });
    s.on('reconnect', () => { setSocket(s); });

    // Keepalive: envia ping a cada 20s para manter online
    const keepalive = setInterval(() => { if (s.connected) s.emit('ping'); }, 20000);
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
          playNotificationSound();
          sendNotification('💬 ' + (msg.sender_name || 'Nova mensagem'), msg.message, 'chat-' + msg.sender_id);
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

    s.on('chat:read', ({ by_user_id }) => {
      setMessages(prev => {
        const updated = {};
        for (const [uid, msgs] of Object.entries(prev)) {
          updated[uid] = msgs.map(m =>
            m.receiver_id === by_user_id && !m.read_at
              ? { ...m, read_at: new Date().toISOString() }
              : m
          );
        }
        return updated;
      });
    });

    s.on('chat:typing', ({ sender_id, typing: isTyping }) => {
      setTyping(prev => ({ ...prev, [sender_id]: isTyping }));
    });

    setSocket(s);
    return () => { clearInterval(keepalive); s.disconnect(); };
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
      clearUnread, setActiveConv, isOnline, setUnreadTotal, sendNotification
    }}>
      {children}
    </ChatContext.Provider>
  );
}

export const useChat = () => useContext(ChatContext);
