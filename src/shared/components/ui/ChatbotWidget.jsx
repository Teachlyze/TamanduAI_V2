import { logger } from '@/shared/utils/logger';
import React, { useEffect, useRef, useState } from 'react';
import { Bot, Send, X, Minimize2, Maximize2, ChevronDown } from 'lucide-react';
import { useAuth } from '@/shared/hooks/useAuth';
import { supabase } from '@/shared/services/supabaseClient';

const ChatbotWidget = ({ context = {}, onClose, availableActivities = [], onActivityChange }) => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(true);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  const [feedbackGiven, setFeedbackGiven] = useState(new Set());
  const [showActivitySelector, setShowActivitySelector] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' }, []); // TODO: Add dependencies
    }
  }, [messages]);

  // Criar ou recuperar conversa ao abrir
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      initializeConversation();
    }
  }, [isOpen, context]);

  const initializeConversation = async () => {
    // Mensagem de boas-vindas contextual
    const greeting = context.activityId && context.activityTitle
      ? `Olá! 👋 Estou aqui para te ajudar com a atividade "${context.activityTitle}".\n\nLembre-se: vou te GUIAR até a resposta, não dar a resposta pronta! Vamos aprender juntos? 💡\n\nQual é sua dúvida?`
      : context.classId
      ? 'Olá! Estou aqui para ajudar com suas dúvidas sobre esta turma. Como posso ajudar?'
      : 'Olá! Como posso ajudar você hoje?';
    
    setMessages([{ role: 'assistant', content: greeting, timestamp: new Date() }]);

    // Criar conversa no banco se houver contexto
    if (context.classId && user?.id) {
      try {
        const { data: conversation, error } = await supabase
          .from('chatbot_conversations')
          .insert({
            class_id: context.classId,
            activity_id: context.activityId || null,
            user_id: user.id,
            started_at: new Date().toISOString()
          })
          .select()
          .single();
        
        if (!error && conversation) {
          setConversationId(conversation.id);
        }
      } catch (e) {
        logger.error('Erro ao criar conversa:', e);
      }
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const userMessage = input.trim();
    setInput('');
    setMessages((m) => [...m, { role: 'user', content: userMessage, timestamp: new Date() }]);
    setLoading(true);

    try {
      // Get user session for auth
      const { data: { session } } = await supabase.auth.getSession();
      const userId = user?.id || session?.user?.id;
      
      // Validação dos campos obrigatórios
      if (!context.classId || !userId || !userMessage) {
        logger.error('Campos obrigatórios faltando:', { 
          classId: context.classId, 
          userId, 
          message: userMessage 
        });
        const fallbackReply = 'Desculpe, não consegui enviar sua mensagem. Tente novamente.';
        setMessages((m) => [...m, { role: 'assistant', content: fallbackReply, timestamp: new Date() }]);
        return;
      }
      
      const requestBody = {
        message: userMessage,
        class_id: context.classId,
        activity_id: context.activityId || null,
        user_id: userId,
        conversation_id: conversationId,
        conversation_history: messages
          .filter(m => m.role !== 'assistant' || m.content !== messages[0]?.content)
          .slice(-6)
          .map(m => ({
            role: m.role,
            content: m.content
          }))
      };
      
      logger.debug('Enviando mensagem para chatbot:', requestBody);
      
      // Call OpenAI via edge function
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chatbot-query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify(requestBody),
        signal: AbortSignal.timeout(15000), // 15s timeout
      });

      if (!response.ok) {
        // Fallback: resposta simulada se edge function falhar
        logger.warn('Edge function falhou, usando fallback')
        const fallbackReply = getFallbackResponse(userMessage, context);
        setMessages((m) => [...m, { role: 'assistant', content: fallbackReply, timestamp: new Date() }]);
        return;
      }

      const data = await response.json();
      const assistantMessage = data.response || data.reply || 'Desculpe, não consegui processar sua mensagem.';
      const messageData = { 
        role: 'assistant', 
        content: assistantMessage, 
        timestamp: new Date(),
        sources: data.sources || [],
        out_of_scope: data.out_of_scope || false
      };
      setMessages((m) => [...m, messageData]);
    } catch (e) {
      logger.error('Erro ao enviar mensagem:', e)
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

  // Enviar feedback para o banco
  const handleFeedback = async (messageIndex, wasHelpful) => {
    try {
      // Buscar o ID real da mensagem no banco (as mensagens devem ter sido salvas pela edge function)
      // Por enquanto, apenas marcar visualmente e simular salvamento
      setFeedbackGiven(prev => new Set([...prev, messageIndex]));
      
      logger.debug(`Feedback ${wasHelpful ? 'positivo' : 'negativo'} para mensagem ${messageIndex}`);
      
      // TODO: Quando tiver ID real das mensagens, fazer:
      // await supabase.from('chatbot_messages').update({ was_helpful: wasHelpful }).eq('id', messageId);
      // await supabase.rpc('update_feedback_metrics', { p_message_id: messageId, p_was_helpful: wasHelpful });
    } catch (error) {
      logger.error('Erro ao enviar feedback:', error);
    }
  };

  const handleClose = async () => {
    // Finalizar conversa no banco
    if (conversationId && messages.length > 1) {
      try {
        await supabase
          .from('chatbot_conversations')
          .update({
            ended_at: new Date().toISOString(),
            message_count: messages.length - 1
          })
          .eq('id', conversationId);
      } catch (e) {
        logger.error('Erro ao finalizar conversa:', e);
      }
    }
    
    if (onClose) {
      onClose();
    } else {
      setIsOpen(false);
    }
  };

  if (!isOpen) {
    return null; // Não mostrar botão flutuante se gerenciado externamente
  }

  // Verificar se precisa selecionar atividade
  const needsActivity = !context.activityId && context.requireActivity;

  if (needsActivity) {
    return (
      <div className="fixed bottom-6 right-6 w-96 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl z-50 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Bot className="w-5 h-5 text-purple-600" />
            <span className="font-semibold text-slate-900 dark:text-white">Assistente IA</span>
          </div>
          <button onClick={handleClose} className="hover:bg-slate-100 dark:hover:bg-slate-800 p-1 rounded transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
          <p className="text-sm text-amber-800 dark:text-amber-200 mb-2">
            ⚠️ <strong>Selecione uma atividade primeiro</strong>
          </p>
          <p className="text-xs text-amber-700 dark:text-amber-300">
            Para usar o assistente, você precisa estar trabalhando em uma atividade específica. 
            Selecione uma atividade da lista para começar!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`fixed bottom-6 right-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl z-50 flex flex-col transition-all ${
        isMinimized ? 'w-80 h-16' : 'w-96 h-[32rem]'
      }`}
    >
      {/* Header */}
      <div className="border-b border-border bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-t-2xl">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-2">
            <Bot className="w-5 h-5" />
            <span className="font-semibold">Assistente IA</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setIsMinimized(!isMinimized)} className="hover:bg-white/20 p-1 rounded transition-colors">
              {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
            </button>
            <button onClick={handleClose} className="hover:bg-white/20 p-1 rounded transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
        
        {/* Seletor de Atividade */}
        {availableActivities.length > 0 && !isMinimized && (
          <div className="px-4 pb-3 relative">
            <button
              onClick={() => setShowActivitySelector(!showActivitySelector)}
              className="w-full flex items-center justify-between bg-white/10 hover:bg-white/20 rounded-lg px-3 py-2 text-sm transition-colors"
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <span className="text-xs opacity-75">Atividade:</span>
                <span className="font-medium truncate">
                  {context.activityTitle || 'Selecione uma atividade'}
                </span>
              </div>
              <ChevronDown className={`w-4 h-4 transition-transform ${showActivitySelector ? 'rotate-180' : ''}`} />
            </button>
            
            {/* Dropdown de Atividades */}
            {showActivitySelector && (
              <div className="absolute top-full left-4 right-4 mt-1 bg-white dark:bg-slate-800 rounded-lg shadow-2xl border border-slate-200 dark:border-slate-700 max-h-64 overflow-y-auto z-50">
                {availableActivities.map((activity) => (
                  <button
                    key={activity.id}
                    onClick={() => {
                      onActivityChange?.(activity);
                      setShowActivitySelector(false);
                      // Reiniciar conversa com nova atividade
                      setMessages([]);
                      setConversationId(null);
                    }}
                    className={`w-full text-left px-4 py-3 hover:bg-purple-50 dark:hover:bg-purple-950/30 transition-colors border-b border-slate-100 dark:border-slate-700 last:border-0 ${
                      activity.id === context.activityId ? 'bg-purple-50 dark:bg-purple-950/50' : ''
                    }`}
                  >
                    <div className="font-medium text-slate-900 dark:text-white text-sm">
                      {activity.title}
                    </div>
                    {activity.description && (
                      <div className="text-xs text-slate-500 dark:text-slate-400 truncate mt-1">
                        {activity.description}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
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
                  {msg.sources && msg.sources.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                      <p className="text-xs text-slate-500 dark:text-slate-400">📚 Fontes: {msg.sources.join(', ')}</p>
                    </div>
                  )}
                  {msg.out_of_scope && (
                    <div className="mt-2 pt-2 border-t border-amber-200 dark:border-amber-800">
                      <p className="text-xs text-amber-600 dark:text-amber-400">⚠️ Pergunta fora do escopo da atividade</p>
                    </div>
                  )}
                  
                  {/* Botões de Feedback - Apenas para mensagens do assistente (exceto a primeira) */}
                  {msg.role === 'assistant' && i > 0 && !feedbackGiven.has(i) && (
                    <div className="flex gap-2 mt-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                      <button
                        onClick={() => handleFeedback(i, true)}
                        className="text-xs px-2 py-1 rounded-md hover:bg-green-100 dark:hover:bg-green-950/30 text-slate-600 dark:text-slate-400 hover:text-green-700 dark:hover:text-green-300 transition-colors"
                        title="Esta resposta foi útil"
                      >
                        👍 Útil
                      </button>
                      <button
                        onClick={() => handleFeedback(i, false)}
                        className="text-xs px-2 py-1 rounded-md hover:bg-red-100 dark:hover:bg-red-950/30 text-slate-600 dark:text-slate-400 hover:text-red-700 dark:hover:text-red-300 transition-colors"
                        title="Esta resposta não ajudou"
                      >
                        👎 Não ajudou
                      </button>
                    </div>
                  )}
                  
                  {/* Feedback dado */}
                  {msg.role === 'assistant' && feedbackGiven.has(i) && (
                    <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                      <p className="text-xs text-green-600 dark:text-green-400">✅ Obrigado pelo feedback!</p>
                    </div>
                  )}
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
