
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../services/supabase';

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
}

interface ChatProps {
  onBack: () => void;
  studentId: string | null;
  studentName?: string;
}

const QUICK_INCENTIVES = [
  "Bora esmagar hoje! 🔥",
  "Não para agora, o resultado vem! 💪",
  "Orgulho da sua constância! 🚀",
  "Bebeu água hoje? 💧",
  "Treino pago é treino feito! ✅",
  "Foco na dieta, você consegue! 🥗"
];

const Chat: React.FC<ChatProps> = ({ onBack, studentId, studentName }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<'trainer' | 'student' | null>(null);
  const [partnerId, setPartnerId] = useState<string | null>(null);
  const [partnerName, setPartnerName] = useState<string | undefined>(studentName);
  const scrollRef = useRef<HTMLDivElement>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      
      const myId = session.user.id;
      setCurrentUserId(myId);

      const { data: myProfile } = await supabase.from('profiles').select('role, trainer_id').eq('id', myId).single();
      const role = myProfile?.role as 'trainer' | 'student';
      setUserRole(role);

      let pId = studentId;
      let pName = studentName;

      // Lógica robusta para definir com quem estamos falando
      if (role === 'student') {
        pId = myProfile.trainer_id;
        if (pId) {
          const { data: trainerProfile } = await supabase.from('profiles').select('full_name').eq('id', pId).maybeSingle();
          pName = trainerProfile?.full_name || 'Meu Treinador';
        }
      }

      setPartnerId(pId);
      setPartnerName(pName);

      if (pId && myId) {
        const { data, error } = await supabase
          .from('messages')
          .select('*')
          .or(`and(sender_id.eq.${myId},receiver_id.eq.${pId}),and(sender_id.eq.${pId},receiver_id.eq.${myId})`)
          .order('created_at', { ascending: true });

        if (!error) setMessages(data || []);
      }
    } catch (err) {
      console.error("Erro ao carregar chat:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Inscrição Realtime
    const channel = supabase
      .channel('chat_room')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          const msg = payload.new as Message;
          setMessages(prev => {
            const isRelevant = 
              (msg.sender_id === currentUserId && msg.receiver_id === partnerId) ||
              (msg.sender_id === partnerId && msg.receiver_id === currentUserId);
            
            if (isRelevant && !prev.find(m => m.id === msg.id)) {
              return [...prev, msg];
            }
            return prev;
          });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [partnerId, currentUserId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async (content: string) => {
    const trimmed = content.trim();
    if (!trimmed || sending || !partnerId || !currentUserId) return;

    setSending(true);
    try {
      const { error } = await supabase.from('messages').insert({
        sender_id: currentUserId,
        receiver_id: partnerId,
        content: trimmed
      });
      if (error) throw error;
      setNewMessage('');
    } catch (err) {
      console.error("Erro ao enviar:", err);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-background-light dark:bg-background-dark font-sans">
      <header className="px-6 py-5 flex items-center justify-between bg-white/70 dark:bg-background-dark/70 backdrop-blur-xl border-b border-gray-100 dark:border-gray-800 sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="size-10 rounded-full bg-white dark:bg-surface-dark shadow-sm flex items-center justify-center hover:scale-105 active:scale-95 transition-all">
            <span className="material-symbols-outlined text-gray-400">chevron_left</span>
          </button>
          <div>
            <h2 className="text-base font-black tracking-tight leading-none">{partnerName || 'Conversa'}</h2>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="size-1.5 rounded-full bg-primary animate-pulse"></span>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Chat Online</span>
            </div>
          </div>
        </div>
      </header>

      <div 
        ref={scrollRef} 
        className="flex-1 overflow-y-auto p-6 space-y-4 no-scrollbar"
      >
        {loading ? (
          <div className="h-full flex items-center justify-center">
            <div className="size-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : !partnerId ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-8 opacity-40">
            <span className="material-symbols-outlined text-5xl mb-4">person_off</span>
            <p className="font-bold text-sm">Treinador não vinculado.<br/>Fale com o administrador.</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center opacity-30">
            <span className="material-symbols-outlined text-5xl mb-2 text-primary">chat_bubble</span>
            <p className="text-sm font-medium">Nenhuma mensagem ainda.</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.sender_id === currentUserId;
            return (
              <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-1`}>
                <div className="max-w-[85%]">
                  <div className={`
                    px-4 py-3 rounded-2xl shadow-sm text-sm
                    ${isMe 
                      ? 'bg-primary text-[#0a1a15] rounded-tr-none font-bold' 
                      : 'bg-white dark:bg-surface-dark text-gray-700 dark:text-gray-200 rounded-tl-none border border-gray-100 dark:border-gray-800'
                    }
                  `}>
                    {msg.content}
                  </div>
                  <p className={`text-[8px] mt-1 font-black text-gray-400 uppercase tracking-tighter ${isMe ? 'text-right' : 'text-left'}`}>
                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="p-4 bg-white/80 dark:bg-background-dark/80 backdrop-blur-2xl border-t border-gray-100 dark:border-gray-800 space-y-4">
        {userRole === 'trainer' && (
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
            {QUICK_INCENTIVES.map((phrase, idx) => (
              <button 
                key={idx}
                onClick={() => sendMessage(phrase)}
                className="whitespace-nowrap px-4 py-2 rounded-full bg-primary/10 text-primary border border-primary/20 text-[10px] font-black uppercase tracking-wider transition-all active:scale-95"
              >
                {phrase}
              </button>
            ))}
          </div>
        )}

        <form onSubmit={(e) => { e.preventDefault(); sendMessage(newMessage); }} className="flex items-center gap-3 bg-gray-100 dark:bg-surface-dark/50 rounded-[30px] p-2 pl-5">
          <input 
            className="flex-1 bg-transparent border-0 text-sm py-3 focus:ring-0 placeholder:text-gray-400"
            placeholder="Digite sua mensagem..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
          />
          <button 
            type="submit" 
            disabled={!newMessage.trim() || sending || !partnerId}
            className="size-11 rounded-full bg-primary text-[#0a1a15] flex items-center justify-center shadow-lg disabled:opacity-50 transition-all active:scale-90"
          >
            {sending ? (
              <div className="size-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <span className="material-symbols-outlined font-black text-[20px]">send</span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Chat;
