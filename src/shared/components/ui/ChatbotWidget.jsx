import React, { useEffect, useRef, useState } from 'react';
import { Bot, Send, X, Minimize2, Maximize2 } from 'lucide-react';
import { useAuth } from '@/shared/hooks/useAuth';
import { supabase } from '@/shared/services/supabaseClient';

const ChatbotWidget = ({ context = {} }) => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' }, []); // TODO: Add dependencies
    }
  }, [messages]);

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const greeting = context.classId
        ? 'Olá! Estou aqui para ajudar com suas dúvidas sobre esta turma. Como posso ajudar?'
        : context.activityId
        ? 'Olá! Estou aqui para ajudar com esta atividade. Qual sua dúvida?'
        : 'Olá! Como posso ajudar você hoje?';
      setMessages([{ role: 'assistant', content: greeting, timestamp: new Date() }]);
    }
  }, [isOpen, context]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const userMessage = input.trim();
    setInput('');
    setMessages((m) => [...m, { role: 'user', content: userMessage, timestamp: new Date() }]);
    setLoading(true);

    try {
      // Call OpenAI via edge function
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          message: userMessage,
          context: {
            userId: user?.id,
            classId: context.classId,
            activityId: context.activityId,
          },
        }),
        signal: AbortSignal.timeout(10000), // 10s timeout
      });

      if (!response.ok) {
        // Fallback: resposta simulada se edge function falhar
        console.warn('Edge function falhou, usando fallback');
        const fallbackReply = getFallbackResponse(userMessage, context);
        setMessages((m) => [...m, { role: 'assistant', content: fallbackReply, timestamp: new Date() }]);
        return;
      }

      const data = await response.json();
      setMessages((m) => [...m, { role: 'assistant', content: data.reply || 'Desculpe, não consegui processar sua mensagem.', timestamp: new Date() }]);
    } catch (e) {
      console.error('Erro ao enviar mensagem:', e);
      // Usar fallback ao invés de mensagem genérica de erro
      const fallbackReply = getFallbackResponse(userMessage, context);
      setMessages((m) => [...m, { role: 'assistant', content: fallbackReply, timestamp: new Date() }]);
    } finally {
      setLoading(false);
    }
  };

  const getFallbackResponse = (message, ctx) => {
    const msg = message.toLowerCase();
    
    if (msg.includes('prazo') || msg.includes('entrega') || msg.includes('quando')) {
      return 'Para informações sobre prazos, verifique os detalhes da atividade. Se tiver dúvidas específicas, consulte seu professor.';
    }
    if (msg.includes('nota') || msg.includes('pontuação') || msg.includes('avaliaç')) {
      return 'As notas são atualizadas pelo professor após a correção. Você pode acompanhar seu progresso no painel de desempenho.';
    }
    if (msg.includes('como') || msg.includes('ajuda') || msg.includes('dúvida')) {
      return 'Estou aqui para ajudar! Você pode me perguntar sobre prazos, formato de entrega, ou tirar dúvidas gerais. Para questões específicas do conteúdo, recomendo consultar o material da aula ou seu professor.';
    }
    if (msg.includes('material') || msg.includes('arquivo') || msg.includes('documento')) {
      return 'Os materiais da aula estão disponíveis na página da turma. Verifique a seção de materiais para acessar os arquivos enviados pelo professor.';
    }
    
    return 'Olá! Sou o assistente da TamanduAI. Posso ajudar com informações gerais sobre a plataforma, prazos e entregas. Para dúvidas específicas do conteúdo, recomendo entrar em contato com seu professor. Como posso ajudar?';
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all flex items-center justify-center z-50"
        aria-label="Abrir chatbot"
      >
        <Bot className="w-6 h-6" />
      </button>
    );
  }

  return (
    <div
      className={`fixed bottom-6 right-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl z-50 flex flex-col transition-all ${
        isMinimized ? 'w-80 h-16' : 'w-96 h-[32rem]'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-t-2xl">
        <div className="flex items-center gap-2">
          <Bot className="w-5 h-5" />
          <span className="font-semibold">Assistente IA</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setIsMinimized(!isMinimized)} className="hover:bg-white/20 p-1 rounded transition-colors">
            {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
          </button>
          <button onClick={() => setIsOpen(false)} className="hover:bg-white/20 p-1 rounded transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50 dark:bg-slate-950">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[80%] px-4 py-2 rounded-2xl ${
                    msg.role === 'user'
                      ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white'
                      : 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-white dark:bg-slate-800 px-4 py-2 rounded-2xl border border-slate-200 dark:border-slate-700">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-slate-400 dark:bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 bg-slate-400 dark:bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 bg-slate-400 dark:bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                placeholder="Digite sua mensagem..."
                className="flex-1 px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                disabled={loading}
                autoComplete="off"
              />
              <button
                onClick={sendMessage}
                disabled={loading || !input.trim()}
                className="p-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                aria-label="Enviar mensagem"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ChatbotWidget;
