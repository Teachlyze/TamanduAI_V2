import { logger } from '@/shared/utils/logger';
import React, { useState, useEffect } from 'react';
import { X, Save, RefreshCw, Plus, Trash2, Clock, MapPin, Link as LinkIcon, MessageCircle } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import LoadingSpinner from '@/shared/components/ui/LoadingSpinner';
import { toast } from '@/shared/components/ui/use-toast';
import { supabase } from '@/shared/services/supabaseClient';

const ClassSettingsModal = ({ isOpen, onClose, onSuccess, classData }) => {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('invite');
  const [codeHistory, setCodeHistory] = useState([]);
  
  const [settings, setSettings] = useState({
    // Código de Convite
    invite_code: '',
    code_max_uses: null,
    code_expiration: null,
    code_uses_count: 0,
    is_code_active: true,
    
    // Horários
    schedule: [],
    
    // Modalidade
    modality: 'online',
    meeting_link: '',
    location: '',
    
    // Chatbot
    chatbot_enabled: false
  });

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  const [newSchedule, setNewSchedule] = useState({
    day: 'monday',
    start_time: '08:00',
    end_time: '09:00'
  });

  useEffect(() => {
    if (classData && isOpen) {
      loadSettings();
      loadCodeHistory();
    }
  }, [classData, isOpen]);

  const loadSettings = async () => {
    try {
      const { data } = await supabase
        .from('class_settings')
        .select('*')
        .eq('class_id', classData.id)
        .maybeSingle();

      if (data) {
        setSettings({
          invite_code: data.join_code || classData.invite_code,
          code_max_uses: data.join_code_max_uses,
          code_expiration: data.join_code_expiration,
          code_uses_count: data.join_code_uses_count || 0,
          is_code_active: data.is_join_code_active !== false,
          schedule: data.schedule || [],
          modality: data.modality || 'online',
          meeting_link: data.meeting_link || '',
          location: data.address || '',
          chatbot_enabled: data.chatbot_enabled || false
        });
      }
    } catch (error) {
      logger.error('Erro ao carregar configurações:', error)
    }
  };

  const loadCodeHistory = async () => {
    try {
      const { data } = await supabase
        .from('invite_code_history')
        .select('*')
        .eq('class_id', classData.id)
        .order('created_at', { ascending: false });

      setCodeHistory(data || []);
    } catch (error) {
      logger.error('Erro ao carregar histórico:', error)
    }
  };

  const generateNewCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  const handleGenerateNewCode = async () => {
    const newCode = generateNewCode();
    
    // Log duplo para garantir visibilidade
    console.log('🔑 [ClassSettingsModal] Gerando novo código:', newCode);
    logger.debug('[ClassSettingsModal] Gerando novo código:', {
      classId: classData.id,
      className: classData.name,
      oldCode: settings.invite_code,
      newCode: newCode
    });
    
    try {
      setLoading(true);

      // Salvar código antigo no histórico
      if (settings.invite_code) {
        try {
          await supabase.from('invite_code_history').insert([{
            class_id: classData.id,
            code: settings.invite_code,
            uses_count: settings.code_uses_count,
            deactivated_at: new Date().toISOString()
          }]);
        } catch (error) {
          logger.error('Erro ao salvar histórico:', error)
        }
      }

      // Salvar novo código IMEDIATAMENTE no banco
      const { error: classError } = await supabase
        .from('classes')
        .update({
          invite_code: newCode,
          updated_at: new Date().toISOString()
        })
        .eq('id', classData.id);

      if (classError) throw classError;

      // Atualizar também em class_settings
      const { error: settingsError } = await supabase
        .from('class_settings')
        .upsert({
          class_id: classData.id,
          join_code: newCode,
          join_code_uses_count: 0,
          is_join_code_active: true
        }, {
          onConflict: 'class_id'
        });

      if (settingsError) throw settingsError;

      // Log duplo para garantir visibilidade
      console.log('✅ [ClassSettingsModal] Código salvo no banco:', newCode);
      logger.debug('[ClassSettingsModal] ✓ Código salvo com sucesso no banco!', {
        newCode: newCode,
        classId: classData.id
      });

      // Atualizar estado local
      setSettings({ ...settings, invite_code: newCode, code_uses_count: 0 });

      // Recarregar histórico
      await loadCodeHistory();

      // Atualizar lista de turmas no componente pai
      if (onSuccess) {
        onSuccess();
      }

      toast({
        title: '✓ Novo código gerado e ativado!',
        description: `O código ${newCode} já está pronto para uso. O código anterior foi desativado.`
      });
    } catch (error) {
      logger.error('Erro ao gerar novo código:', error);
      toast({
        title: 'Erro ao gerar código',
        description: 'Não foi possível gerar um novo código. Tente novamente.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddSchedule = () => {
    if (newSchedule.start_time >= newSchedule.end_time) {
      toast({
        title: 'Horário inválido',
        description: 'O horário de término deve ser após o horário de início.',
        variant: 'destructive'
      });
      return;
    }

    setSettings({
      ...settings,
      schedule: [...settings.schedule, { ...newSchedule }]
    });

    setNewSchedule({ day: 'monday', start_time: '08:00', end_time: '09:00' });
  };

  const handleRemoveSchedule = (index) => {
    setSettings({
      ...settings,
      schedule: settings.schedule.filter((_, i) => i !== index)
    });
  };

  const handleSave = async () => {
    try {
      setLoading(true);

      // Atualizar classe
      const { error: classError } = await supabase
        .from('classes')
        .update({
          invite_code: settings.invite_code,
          updated_at: new Date().toISOString()
        })
        .eq('id', classData.id);

      if (classError) throw classError;

      // Upsert configurações
      const { error: settingsError } = await supabase
        .from('class_settings')
        .upsert({
          class_id: classData.id,
          join_code: settings.invite_code,
          join_code_max_uses: settings.code_max_uses,
          join_code_expiration: settings.code_expiration,
          join_code_uses_count: settings.code_uses_count,
          is_join_code_active: settings.is_code_active,
          schedule: settings.schedule,
          modality: settings.modality,
          meeting_link: settings.meeting_link,
          address: settings.location,
          chatbot_enabled: settings.chatbot_enabled
        }, {
          onConflict: 'class_id'
        });

      if (settingsError) throw settingsError;

      toast({
        title: 'Configurações salvas!',
        description: 'As configurações foram atualizadas com sucesso.'
      });

      onSuccess();
      onClose();
    } catch (error) {
      logger.error('Erro ao salvar:', error)
      toast({
        title: 'Erro ao salvar',
        description: 'Não foi possível salvar as configurações.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const weekDays = {
    monday: 'Segunda',
    tuesday: 'Terça',
    wednesday: 'Quarta',
    thursday: 'Quinta',
    friday: 'Sexta',
    saturday: 'Sábado',
    sunday: 'Domingo'
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 dark:bg-black/80 backdrop-blur-md p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-slate-200 dark:border-slate-700">
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-cyan-500 p-6 rounded-t-2xl z-10">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white">Configurações Avançadas</h2>
              <p className="text-cyan-100 text-sm">{classData.name}</p>
            </div>
            <button onClick={onClose} className="text-white hover:bg-white/20 p-2 rounded-lg">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-slate-200 dark:border-slate-700 px-6 bg-slate-50 dark:bg-slate-800/50">
          <div className="flex gap-4">
            {[
              { id: 'invite', label: 'Código de Convite' },
              { id: 'schedule', label: 'Horários' },
              { id: 'location', label: 'Local/Link' },
              { id: 'chatbot', label: 'Chatbot' },
              { id: 'danger', label: 'Zona de Perigo' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-3 border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-medium'
                    : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="p-6">
          {/* Tab: Código de Convite */}
          {activeTab === 'invite' && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">
                  Código Atual
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={settings.invite_code}
                    readOnly
                    className="flex-1 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white font-mono text-lg"
                  />
                  <Button onClick={handleGenerateNewCode} variant="outline">
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Gerar Novo
                  </Button>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Usado {settings.code_uses_count} {settings.code_uses_count === 1 ? 'vez' : 'vezes'}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">
                    Máximo de Usos
                  </label>
                  <input
                    type="number"
                    value={settings.code_max_uses || ''}
                    onChange={(e) => setSettings({ ...settings, code_max_uses: e.target.value ? parseInt(e.target.value) : null })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                    placeholder="Ilimitado"
                    min="1"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">
                    Data de Expiração
                  </label>
                  <input
                    type="date"
                    value={settings.code_expiration ? settings.code_expiration.split('T')[0] : ''}
                    onChange={(e) => setSettings({ ...settings, code_expiration: e.target.value ? new Date(e.target.value).toISOString() : null })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={settings.is_code_active}
                  onChange={(e) => setSettings({ ...settings, is_code_active: e.target.checked })}
                  className="w-4 h-4"
                />
                <label className="text-sm text-slate-700 dark:text-slate-200">
                  Código ativo (desmarque para desabilitar temporariamente)
                </label>
              </div>

              {/* Histórico */}
              {codeHistory.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-3 text-slate-900 dark:text-white">Histórico de Códigos</h3>
                  <div className="space-y-2">
                    {codeHistory.slice(0, 5).map((code) => (
                      <div key={code.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700">
                        <span className="font-mono text-slate-900 dark:text-white">{code.code}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-sm text-slate-600 dark:text-slate-400">
                            {code.uses_count} {code.uses_count === 1 ? 'uso' : 'usos'}
                          </span>
                          <Badge variant="outline">Desativado</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tab: Horários */}
          {activeTab === 'schedule' && (
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold mb-3 text-slate-900 dark:text-white">Horários de Aula</h3>
                <div className="space-y-2">
                  {settings.schedule.map((item, index) => (
                    <div key={index} className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700">
                      <Clock className="w-5 h-5 text-slate-400" />
                      <span className="flex-1 text-slate-900 dark:text-white">
                        {weekDays[item.day]}: {item.start_time} - {item.end_time}
                      </span>
                      <button
                        onClick={() => handleRemoveSchedule(index)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-medium mb-3 text-slate-900 dark:text-white">Adicionar Horário</h4>
                <div className="grid grid-cols-3 gap-3 mb-3">
                  <select
                    value={newSchedule.day}
                    onChange={(e) => setNewSchedule({ ...newSchedule, day: e.target.value })}
                    className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                  >
                    {Object.entries(weekDays).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                  <input
                    type="time"
                    value={newSchedule.start_time}
                    onChange={(e) => setNewSchedule({ ...newSchedule, start_time: e.target.value })}
                    className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                  />
                  <input
                    type="time"
                    value={newSchedule.end_time}
                    onChange={(e) => setNewSchedule({ ...newSchedule, end_time: e.target.value })}
                    className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                  />
                </div>
                <Button onClick={handleAddSchedule} size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar
                </Button>
              </div>
            </div>
          )}

          {/* Tab: Local/Link */}
          {activeTab === 'location' && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-3">
                  Modalidade
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      checked={settings.modality === 'online'}
                      onChange={() => setSettings({ ...settings, modality: 'online' })}
                      className="w-4 h-4"
                    />
                    <span className="text-slate-900 dark:text-white">Online</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      checked={settings.modality === 'presential'}
                      onChange={() => setSettings({ ...settings, modality: 'presential' })}
                      className="w-4 h-4"
                    />
                    <span className="text-slate-900 dark:text-white">Presencial</span>
                  </label>
                </div>
              </div>

              {settings.modality === 'online' && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">
                    Link da Reunião
                  </label>
                  <div className="relative">
                    <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      type="url"
                      value={settings.meeting_link}
                      onChange={(e) => setSettings({ ...settings, meeting_link: e.target.value })}
                      className="w-full pl-10 pr-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                      placeholder="https://meet.google.com/..."
                    />
                  </div>
                </div>
              )}

              {settings.modality === 'presential' && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">
                    Local/Endereço
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                    <textarea
                      value={settings.location}
                      onChange={(e) => setSettings({ ...settings, location: e.target.value })}
                      rows={3}
                      className="w-full pl-10 pr-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                      placeholder="Ex: Sala 203, Bloco B, Campus Centro"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tab: Chatbot */}
          {activeTab === 'chatbot' && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <MessageCircle className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                <div className="flex-1">
                  <h3 className="font-semibold text-slate-900 dark:text-white">
                    Assistente Virtual (Chatbot)
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Ative um chatbot para responder dúvidas dos alunos automaticamente
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.chatbot_enabled}
                    onChange={(e) => setSettings({ ...settings, chatbot_enabled: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                </label>
              </div>

              {settings.chatbot_enabled && (
                <div className="p-4 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                  <p className="text-sm text-yellow-800 dark:text-yellow-200">
                    Você poderá treinar e configurar o chatbot posteriormente na página específica de Chatbot.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Tab: Zona de Perigo */}
          {activeTab === 'danger' && (
            <div className="space-y-6">
              <div className="p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg">
                <h3 className="font-semibold text-red-900 dark:text-red-200 mb-2 flex items-center gap-2">
                  <Trash2 className="w-5 h-5" />
                  Zona de Perigo
                </h3>
                <p className="text-sm text-red-700 dark:text-red-300">
                  As ações abaixo são irreversíveis. Tenha certeza antes de prosseguir.
                </p>
              </div>

              <div className="border border-red-200 dark:border-red-800 rounded-lg p-6 space-y-4">
                <div>
                  <h4 className="font-semibold text-slate-900 dark:text-white mb-2">
                    Excluir Turma Definitivamente
                  </h4>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                    Esta ação excluirá permanentemente a turma <strong className="text-slate-900 dark:text-white">{classData.name}</strong>, incluindo:
                  </p>
                  <ul className="text-sm text-slate-600 dark:text-slate-400 space-y-1 mb-4 ml-4 list-disc">
                    <li>Todas as atividades e submissões</li>
                    <li>Todos os materiais compartilhados</li>
                    <li>Histórico de notas e feedback</li>
                    <li>Todas as configurações da turma</li>
                  </ul>
                  <p className="text-sm font-semibold text-red-600 dark:text-red-400 mb-4">
                    Esta ação NÃO pode ser desfeita!
                  </p>
                </div>

                {!showDeleteConfirm ? (
                  <Button
                    onClick={() => setShowDeleteConfirm(true)}
                    variant="outline"
                    className="w-full border-red-300 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Excluir Turma Definitivamente
                  </Button>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">
                        Para confirmar, digite o nome da turma: <strong className="text-red-600 dark:text-red-400">{classData.name}</strong>
                      </label>
                      <input
                        type="text"
                        value={deleteConfirmText}
                        onChange={(e) => setDeleteConfirmText(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                        placeholder={classData.name}
                      />
                    </div>
                    <div className="flex gap-3">
                      <Button
                        onClick={() => {
                          setShowDeleteConfirm(false);
                          setDeleteConfirmText('');
                        }}
                        variant="outline"
                        className="flex-1"
                        disabled={deleting}
                      >
                        Cancelar
                      </Button>
                      <Button
                        onClick={async () => {
                          if (deleteConfirmText !== classData.name) {
                            toast({
                              title: 'Nome incorreto',
                              description: 'Digite o nome exato da turma para confirmar.',
                              variant: 'destructive'
                            });
                            return;
                          }
                          
                          setDeleting(true);
                          try {
                            // Delete related records first (cascade)
                            // 1. Delete class member history
                            await supabase
                              .from('class_member_history')
                              .delete()
                              .eq('class_id', classData.id);
                            
                            // 2. Delete class members
                            await supabase
                              .from('class_members')
                              .delete()
                              .eq('class_id', classData.id);
                            
                            // 3. Delete activity assignments
                            await supabase
                              .from('activity_class_assignments')
                              .delete()
                              .eq('class_id', classData.id);
                            
                            // 4. Delete class settings
                            await supabase
                              .from('class_settings')
                              .delete()
                              .eq('class_id', classData.id);
                            
                            // 5. Delete class materials
                            await supabase
                              .from('class_materials')
                              .delete()
                              .eq('class_id', classData.id);
                            
                            // 6. Delete class
                            const { error } = await supabase
                              .from('classes')
                              .delete()
                              .eq('id', classData.id);
                            
                            if (error) throw error;
                            
                            toast({
                              title: 'Turma excluída',
                              description: 'A turma foi excluída definitivamente.'
                            });
                            
                            onSuccess?.();
                            onClose();
                          } catch (error) {
                            logger.error('Erro ao excluir turma:', error);
                            toast({
                              title: 'Erro ao excluir',
                              description: error?.message || 'Não foi possível excluir a turma.',
                              variant: 'destructive'
                            });
                          } finally {
                            setDeleting(false);
                          }
                        }}
                        disabled={deleteConfirmText !== classData.name || deleting}
                        className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                      >
                        {deleting ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                            Excluindo...
                          </>
                        ) : (
                          <>
                            <Trash2 className="w-4 h-4 mr-2" />
                            Confirmar Exclusão
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 dark:border-slate-800 p-6">
          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose} disabled={loading} className="flex-1">
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={loading} className="flex-1 bg-gradient-to-r from-blue-600 to-cyan-600">
              {loading ? <><LoadingSpinner size="sm" className="mr-2" />Salvando...</> : <><Save className="w-4 h-4 mr-2" />Salvar Configurações</>}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClassSettingsModal;
