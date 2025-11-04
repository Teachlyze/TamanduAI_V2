import { logger } from '@/shared/utils/logger';
import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { 
  MessageSquare, Bot, FileText, CheckCircle, AlertCircle,
  Settings, Brain, Zap, TrendingUp, Users, MessageCircle
} from 'lucide-react';
import { Card } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { Progress } from '@/shared/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import LoadingSpinner from '@/shared/components/ui/LoadingSpinner';
import { supabase } from '@/shared/services/supabaseClient';
import { toast } from '@/shared/components/ui/use-toast';

const ChatbotTab = ({ classId, classData }) => {
  const [loading, setLoading] = useState(true);
  const [enabled, setEnabled] = useState(false);
  const [materials, setMaterials] = useState([]);
  const [trainingSources, setTrainingSources] = useState([]);
  const [personality, setPersonality] = useState('friendly');
  const [stats, setStats] = useState({
    totalQuestions: 0,
    answeredQuestions: 0,
    avgResponseTime: '0s',
    satisfactionRate: 0
  });
  
  // Ref para controlar se já inicializamos o estado
  const initializedRef = useRef(false);

  useEffect(() => {
    loadChatbotData();
    
    // Carregar estado do banco (sincronizado com outras páginas)
    const loadChatbotStatus = async () => {
      try {
        const { data, error } = await supabase
          .from('classes')
          .select('settings')
          .eq('id', classId)
          .single();

        if (error) throw error;

        const chatbotEnabled = data?.settings?.chatbot_enabled || false;
        const chatbotPaused = data?.settings?.chatbot_paused || false;
        
        // Se está habilitado mas pausado, mostrar como desabilitado
        setEnabled(chatbotEnabled && !chatbotPaused);
        
        logger.debug('🤖 Estado do chatbot carregado:', { enabled: chatbotEnabled, paused: chatbotPaused });
      } catch (error) {
        logger.error('Erro ao carregar estado do chatbot:', error);
      }
    };

    loadChatbotStatus();
  }, [classId, classData]);

  const loadChatbotData = async () => {
    try {
      setLoading(true);

      // Buscar materiais da turma
      const { data: materialsData } = await supabase
        .from('class_materials')
        .select('id, title, file_type, category')
        .eq('class_id', classId);

      setMaterials(materialsData || []);

      // Buscar fontes de treino existentes
      const { data: sources } = await supabase
        .from('rag_training_sources')
        .select('*')
        .eq('class_id', classId);

      setTrainingSources(sources || []);

      // Simulação de estatísticas (em produção virá de analytics reais)
      setStats({
        totalQuestions: 0,
        answeredQuestions: 0,
        avgResponseTime: '0s',
        satisfactionRate: 0
      });

    } catch (error) {
      logger.error('Erro ao carregar dados do chatbot:', error)
      toast({
        title: 'Erro ao carregar chatbot',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleChatbot = async (newState) => {
    // Atualizar UI imediatamente
    setEnabled(newState);
    
    try {
      // Buscar configuração atual do chatbot
      const { data: currentClass } = await supabase
        .from('classes')
        .select('settings')
        .eq('id', classId)
        .single();

      // Salvar no banco mantendo outras configurações
      const { error } = await supabase
        .from('classes')
        .update({ 
          settings: { 
            ...(currentClass?.settings || {}),
            chatbot_enabled: newState,
            chatbot_paused: !newState  // Se desativar, marcar como pausado
          }
        })
        .eq('id', classId);

      if (error) {
        throw error;
      }

      toast({
        title: newState ? '✅ Chatbot Ativado' : '⏸️ Chatbot Desativado',
        description: newState 
          ? 'O assistente virtual está agora disponível para os alunos.'
          : 'O assistente virtual foi desativado.'
      });

      logger.debug('🤖 Estado do chatbot salvo:', { enabled: newState });

    } catch (error) {
      logger.error('Erro ao salvar configuração:', error);
      setEnabled(!newState);  // Reverter UI
      toast({
        title: 'Erro ao salvar',
        description: 'Não foi possível salvar a configuração. Tente novamente.',
        variant: 'destructive'
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ========== HEADER ========== */}
      <div>
        <h2 className="text-2xl font-bold">Assistente Virtual (Chatbot)</h2>
        <p className="text-slate-600 dark:text-slate-400">
          Configure um assistente com IA para responder dúvidas dos alunos
        </p>
      </div>

      {/* ========== TOGGLE PRINCIPAL ========== */}
      <Card className="p-6 border-2 border-blue-200 dark:border-blue-800">
        <div className="flex items-center gap-4">
          <div className="p-4 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg">
            <Bot className="w-8 h-8 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-lg mb-1">
              Status do Chatbot
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {enabled 
                ? '✅ Assistente virtual ativo e respondendo alunos'
                : '⚠️ Assistente virtual desativado'}
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => handleToggleChatbot(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-14 h-7 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
          </label>
        </div>
      </Card>

      {enabled && (
        <>
          {/* ========== ESTATÍSTICAS DO BOT ========== */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="p-4 border-2 border-blue-200 dark:border-blue-800">
              <div className="flex items-center gap-3">
                <MessageCircle className="w-8 h-8 text-blue-600" />
                <div>
                  <div className="text-2xl font-bold">{stats.totalQuestions}</div>
                  <div className="text-xs text-slate-600 dark:text-slate-400">Perguntas</div>
                </div>
              </div>
            </Card>

            <Card className="p-4 border-2 border-green-200 dark:border-green-800">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-8 h-8 text-green-600" />
                <div>
                  <div className="text-2xl font-bold">{stats.answeredQuestions}</div>
                  <div className="text-xs text-slate-600 dark:text-slate-400">Respondidas</div>
                </div>
              </div>
            </Card>

            <Card className="p-4 border-2 border-purple-200 dark:border-purple-800">
              <div className="flex items-center gap-3">
                <Zap className="w-8 h-8 text-purple-600" />
                <div>
                  <div className="text-2xl font-bold">{stats.avgResponseTime}</div>
                  <div className="text-xs text-slate-600 dark:text-slate-400">Tempo Médio</div>
                </div>
              </div>
            </Card>

            <Card className="p-4 border-2 border-yellow-200 dark:border-yellow-800">
              <div className="flex items-center gap-3">
                <TrendingUp className="w-8 h-8 text-yellow-600" />
                <div>
                  <div className="text-2xl font-bold">{stats.satisfactionRate}%</div>
                  <div className="text-xs text-slate-600 dark:text-slate-400">Satisfação</div>
                </div>
              </div>
            </Card>
          </div>

          {/* ========== CONFIGURAÇÕES ========== */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Personalidade */}
            <Card className="p-6">
              <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                <Brain className="w-5 h-5 text-blue-600" />
                Personalidade do Bot
              </h3>
              
              <Select value={personality} onValueChange={setPersonality}>
                <SelectTrigger>
                  <SelectValue placeholder="Escolha a personalidade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="friendly">😊 Amigável e Casual</SelectItem>
                  <SelectItem value="formal">👔 Formal e Profissional</SelectItem>
                  <SelectItem value="motivational">🚀 Motivador e Energético</SelectItem>
                  <SelectItem value="patient">🧘 Paciente e Didático</SelectItem>
                </SelectContent>
              </Select>

              <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {personality === 'friendly' && '💬 O bot usará linguagem casual e amigável'}
                  {personality === 'formal' && '📝 O bot manterá tom profissional e formal'}
                  {personality === 'motivational' && '✨ O bot será motivador e entusiasta'}
                  {personality === 'patient' && '🎯 O bot explicará com paciência e detalhes'}
                </p>
              </div>
            </Card>

            {/* Modelo de IA */}
            <Card className="p-6">
              <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                <Settings className="w-5 h-5 text-purple-600" />
                Modelo de IA
              </h3>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-950/20 dark:to-blue-950/20 rounded-lg">
                  <div>
                    <div className="font-semibold">Claude 3.5 Sonnet</div>
                    <div className="text-xs text-slate-600 dark:text-slate-400">
                      Modelo avançado da Anthropic
                    </div>
                  </div>
                  <Badge className="bg-green-100 text-green-700">Ativo</Badge>
                </div>

                <div className="text-sm text-slate-600 dark:text-slate-400">
                  ✅ Respostas contextualizadas<br/>
                  ✅ Compreensão avançada de linguagem<br/>
                  ✅ Segurança e moderação automática
                </div>
              </div>
            </Card>
          </div>

          {/* ========== MATERIAIS PARA TREINO ========== */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                Materiais para Treinamento (RAG)
              </h3>
              <Badge variant="secondary">
                {trainingSources.length} fontes ativas
              </Badge>
            </div>

            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
              Selecione materiais da turma para treinar o chatbot. Ele usará esses conteúdos para responder perguntas.
            </p>

            {materials.length === 0 ? (
              <div className="text-center py-8 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                <FileText className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Nenhum material disponível.<br/>
                  Adicione materiais na tab Biblioteca primeiro.
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {materials.slice(0, 5).map((material, index) => (
                  <motion.div
                    key={material.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    <input 
                      type="checkbox" 
                      className="w-4 h-4"
                      defaultChecked={trainingSources.some(s => s.material_id === material.id)}
                    />
                    <FileText className="w-5 h-5 text-blue-600" />
                    <div className="flex-1">
                      <div className="font-medium text-sm">{material.title}</div>
                      <div className="text-xs text-slate-500">{material.category}</div>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {material.file_type?.split('/')[1] || 'arquivo'}
                    </Badge>
                  </motion.div>
                ))}
              </div>
            )}

            <Button className="w-full mt-4" variant="outline">
              <Brain className="w-4 h-4 mr-2" />
              Treinar Chatbot com Materiais Selecionados
            </Button>
          </Card>

          {/* ========== PREVIEW DO BOT ========== */}
          <Card className="p-6 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/20 dark:to-cyan-950/20">
            <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-blue-600" />
              Preview do Chatbot
            </h3>

            <div className="bg-white dark:bg-slate-900 rounded-lg p-4 space-y-3">
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                  <Bot className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-3">
                    <p className="text-sm">
                      Olá! 👋 Sou o assistente virtual da turma <strong>{classData?.name}</strong>. 
                      Como posso ajudar você hoje?
                    </p>
                  </div>
                  <div className="text-xs text-slate-500 mt-1">Agora mesmo</div>
                </div>
              </div>

              <div className="flex gap-3 justify-end">
                <div className="flex-1 max-w-md">
                  <div className="bg-blue-100 dark:bg-blue-900 rounded-lg p-3">
                    <p className="text-sm">
                      Quando é a prova de matemática?
                    </p>
                  </div>
                  <div className="text-xs text-slate-500 mt-1 text-right">Visualização</div>
                </div>
                <div className="w-8 h-8 rounded-full bg-slate-300 dark:bg-slate-700 flex items-center justify-center">
                  <Users className="w-4 h-4" />
                </div>
              </div>
            </div>
          </Card>
        </>
      )}

      {/* ========== ESTADO VAZIO ========== */}
      {!enabled && (
        <Card className="p-12 text-center">
          <div className="inline-flex p-6 rounded-full bg-slate-100 dark:bg-slate-800 mb-4">
            <Bot className="w-16 h-16 text-slate-400" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Chatbot Desativado</h3>
          <p className="text-slate-600 dark:text-slate-400 mb-6 max-w-md mx-auto">
            Ative o assistente virtual para permitir que alunos tirem dúvidas 
            automaticamente 24/7 com respostas contextualizadas baseadas nos materiais da turma.
          </p>
          <div className="flex justify-center gap-4">
            <Button onClick={() => handleToggleChatbot(true)} size="lg">
              <Bot className="w-5 h-5 mr-2" />
              Ativar Chatbot
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
};

export default ChatbotTab;
