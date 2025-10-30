import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Save, Rocket, Bot } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Card } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { DashboardHeader } from '@/shared/design';
import LoadingSpinner from '@/shared/components/ui/LoadingSpinner';
import { supabase } from '@/shared/services/supabaseClient';
import { ClassService } from '@/shared/services/classService';

const ChatbotConfigPage = () => {
  const { classId } = useParams();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [training, setTraining] = useState(false);
  const [trainingProgress, setTrainingProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState(1);
  const [classData, setClassData] = useState(null);
  const [activities, setActivities] = useState([]);
  
  const [config, setConfig] = useState({
    name: '',
    avatar: '🤖',
    personality: 'motivational',
    useEmojis: true,
    useExamples: true,
    encourage: true,
    selectedActivities: [],
    selectedMaterials: [],
    canExplain: true,
    canGiveExamples: true,
    canAnswerDoubt: true,
    canGiveHints: false,
    canShowAnswers: false,
    availability: '24/7',
    messagesLimit: 10,
    language: 'pt-BR'
  });

  useEffect(() => {
    loadData();
  }, [classId]);

  const loadData = async () => {
    try {
      setLoading(true);

      const classInfo = await ClassService.getClassById(classId);
      setClassData(classInfo);

      // Set default name
      setConfig(prev => ({
        ...prev,
        name: `Assistente de ${classInfo.subject || classInfo.name}`
      }));

      // Load activities
      const { data: acts } = await supabase
        .from('activity_class_assignments')
        .select('activity:activities(*)')
        .eq('class_id', classId);

      setActivities(acts?.map(a => a.activity).filter(Boolean) || []);

    } catch (error) {
      console.error('Erro:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleActivity = (activityId) => {
    setConfig(prev => ({
      ...prev,
      selectedActivities: prev.selectedActivities.includes(activityId)
        ? prev.selectedActivities.filter(id => id !== activityId)
        : [...prev.selectedActivities, activityId]
    }));
  };

  const handleActivate = async () => {
    setTraining(true);
    setTrainingProgress(0);

    // Simulate training progress
    const interval = setInterval(() => {
      setTrainingProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            alert('Chatbot ativado com sucesso!');
            navigate(`/teacher/chatbot/${classId}/analytics`);
          }, 500);
          return 100;
        }
        return prev + 10;
      });
    }, 300);
  };

  const avatars = ['🤖', '🎓', '📚', '💡', '🧠', '⭐', '🎯', '🚀'];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (training) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="p-8 max-w-md w-full bg-white dark:bg-slate-900">
          <div className="text-center">
            <Bot className="w-16 h-16 mx-auto mb-4 text-blue-600 dark:text-blue-400 animate-pulse" />
            <h2 className="text-2xl font-bold mb-2">🔄 Treinando Assistente IA...</h2>
            <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-4 mb-4">
              <div
                className="bg-gradient-to-r from-blue-600 to-cyan-600 h-4 rounded-full transition-all duration-300"
                style={{ width: `${trainingProgress}%` }}
              />
            </div>
            <div className="text-sm text-slate-600 dark:text-slate-400 space-y-1">
              <div className={trainingProgress >= 25 ? 'text-green-600' : ''}>
                {trainingProgress >= 25 ? '✅' : '🔄'} Processando atividades selecionadas
              </div>
              <div className={trainingProgress >= 50 ? 'text-green-600' : ''}>
                {trainingProgress >= 50 ? '✅' : '🔄'} Indexando conteúdos
              </div>
              <div className={trainingProgress >= 75 ? 'text-green-600' : ''}>
                {trainingProgress >= 75 ? '✅' : '🔄'} Gerando base de conhecimento
              </div>
              <div className={trainingProgress >= 100 ? 'text-green-600' : ''}>
                {trainingProgress >= 100 ? '✅' : '⏳'} Otimizando respostas
              </div>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-4">
              Tempo estimado: 2-3 minutos
            </p>
            <p className="text-xs text-slate-500 mt-2">
              ℹ️ Você pode sair desta página. Notificaremos quando estiver pronto!
            </p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-6">
      <Button
        variant="ghost"
        onClick={() => navigate('/teacher/chatbot')}
        className="mb-4"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Voltar
      </Button>

      <DashboardHeader
        title={`Configurar Chatbot - ${classData?.name}`}
        subtitle={`Passo ${currentStep} de 3`}
        role="teacher"
      />

      {/* Progress Steps */}
      <div className="flex items-center justify-center gap-4 mb-8">
        {[1, 2, 3].map(step => (
          <div key={step} className="flex items-center">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
              currentStep >= step
                ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white'
                : 'bg-slate-200 dark:bg-slate-700 text-slate-600'
            }`}>
              {step}
            </div>
            {step < 3 && <div className="w-12 h-1 bg-slate-200 dark:bg-slate-700 mx-2" />}
          </div>
        ))}
      </div>

      <div className="max-w-4xl mx-auto">
        {/* STEP 1: Personalização */}
        {currentStep === 1 && (
          <Card className="p-8 bg-white dark:bg-slate-900">
            <h2 className="text-2xl font-bold mb-6">🎨 Personalize seu Assistente</h2>
            
            <div className="space-y-6">
              <div>
                <Label>Nome do Bot</Label>
                <Input
                  value={config.name}
                  onChange={(e) => setConfig(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Ex: Assistente de Matemática"
                />
              </div>

              <div>
                <Label>Avatar/Ícone</Label>
                <div className="flex gap-2 mt-2">
                  {avatars.map(emoji => (
                    <button
                      key={emoji}
                      onClick={() => setConfig(prev => ({ ...prev, avatar: emoji }))}
                      className={`text-4xl p-3 rounded-lg border-2 transition-all ${
                        config.avatar === emoji
                          ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/30 scale-110'
                          : 'border-slate-200 dark:border-slate-700 hover:scale-105'
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <Label>Personalidade</Label>
                <div className="space-y-2 mt-2">
                  {[
                    { value: 'formal', label: 'Formal e Acadêmico' },
                    { value: 'friendly', label: 'Amigável e Casual' },
                    { value: 'motivational', label: 'Encorajador e Motivacional' }
                  ].map(option => (
                    <label key={option.value} className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="personality"
                        checked={config.personality === option.value}
                        onChange={() => setConfig(prev => ({ ...prev, personality: option.value }))}
                      />
                      <span>{option.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <Label>Tom de Voz</Label>
                <div className="space-y-2 mt-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={config.useEmojis}
                      onChange={(e) => setConfig(prev => ({ ...prev, useEmojis: e.target.checked }))}
                    />
                    <span>Usar emojis</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={config.useExamples}
                      onChange={(e) => setConfig(prev => ({ ...prev, useExamples: e.target.checked }))}
                    />
                    <span>Responder com exemplos práticos</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={config.encourage}
                      onChange={(e) => setConfig(prev => ({ ...prev, encourage: e.target.checked }))}
                    />
                    <span>Incentivar o aluno</span>
                  </label>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* STEP 2: Seleção de Conteúdo */}
        {currentStep === 2 && (
          <Card className="p-8 bg-white dark:bg-slate-900">
            <h2 className="text-2xl font-bold mb-6">📝 Selecione as Atividades</h2>
            
            <div className="space-y-4 mb-6">
              {activities.map(activity => (
                <label
                  key={activity.id}
                  className={`block p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    config.selectedActivities.includes(activity.id)
                      ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/30'
                      : 'border-slate-200 dark:border-slate-700 hover:border-blue-300'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={config.selectedActivities.includes(activity.id)}
                      onChange={() => toggleActivity(activity.id)}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <div className="font-semibold">{activity.title}</div>
                      <div className="text-sm text-slate-600 dark:text-slate-400">
                        📅 Prazo: {activity.due_date ? new Date(activity.due_date).toLocaleDateString('pt-BR') : 'Sem prazo'}
                      </div>
                    </div>
                  </div>
                </label>
              ))}
            </div>

            <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
              <p className="text-sm text-amber-800 dark:text-amber-200">
                Selecionadas: {config.selectedActivities.length}/{activities.length} atividades
                <br />
                ⚠️ Versão FREE: Até 10 atividades | 💎 PRO: Atividades ilimitadas
              </p>
            </div>
          </Card>
        )}

        {/* STEP 3: Configurações de Uso */}
        {currentStep === 3 && (
          <Card className="p-8 bg-white dark:bg-slate-900">
            <h2 className="text-2xl font-bold mb-6">⚙️ Como o Chatbot pode ajudar</h2>
            
            <div className="space-y-6">
              <div>
                <Label>O chatbot poderá:</Label>
                <div className="space-y-2 mt-2">
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={config.canExplain} onChange={(e) => setConfig(prev => ({ ...prev, canExplain: e.target.checked }))} />
                    <span>Explicar conceitos das atividades</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={config.canGiveExamples} onChange={(e) => setConfig(prev => ({ ...prev, canGiveExamples: e.target.checked }))} />
                    <span>Dar exemplos similares</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={config.canAnswerDoubt} onChange={(e) => setConfig(prev => ({ ...prev, canAnswerDoubt: e.target.checked }))} />
                    <span>Tirar dúvidas sobre o conteúdo</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={config.canGiveHints} onChange={(e) => setConfig(prev => ({ ...prev, canGiveHints: e.target.checked }))} />
                    <span>Dar dicas sobre as questões</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={config.canShowAnswers} onChange={(e) => setConfig(prev => ({ ...prev, canShowAnswers: e.target.checked }))} />
                    <span>Mostrar respostas corretas</span>
                  </label>
                </div>
              </div>

              <div className="p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-sm text-red-800 dark:text-red-200">
                  ⚠️ O chatbot NÃO vai:
                  <br />• Fazer as atividades pelo aluno
                  <br />• Dar respostas diretas
                  <br />• Substituir o professor
                </p>
              </div>

              <div>
                <Label>Limite de mensagens por aluno</Label>
                <Input
                  type="number"
                  value={config.messagesLimit}
                  onChange={(e) => setConfig(prev => ({ ...prev, messagesLimit: parseInt(e.target.value) }))}
                  min="1"
                  max="50"
                />
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                  FREE: 10 mensagens/dia | 💎 PRO: Mensagens ilimitadas
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Navigation Buttons */}
        <div className="flex justify-between mt-6">
          <Button
            variant="outline"
            onClick={() => setCurrentStep(prev => Math.max(1, prev - 1))}
            disabled={currentStep === 1}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
          
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => {}}>
              <Save className="w-4 h-4 mr-2" />
              Salvar Rascunho
            </Button>
            
            {currentStep < 3 ? (
              <Button
                onClick={() => setCurrentStep(prev => prev + 1)}
                className="bg-gradient-to-r from-blue-600 to-cyan-600"
              >
                Próximo
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button
                onClick={handleActivate}
                className="bg-gradient-to-r from-blue-600 to-cyan-600"
              >
                <Rocket className="w-4 h-4 mr-2" />
                Ativar Chatbot
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatbotConfigPage;
