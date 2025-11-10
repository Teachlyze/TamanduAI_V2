import { logger } from '@/shared/utils/logger';
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User,
  Settings,
  Shield,
  Camera,
  Save,
  X,
  Mail,
  Phone,
  Bell,
  Moon,
  Sun,
  Globe,
  Clock,
  Trash2,
  AlertTriangle,
  Key
} from 'lucide-react';
import { Card } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import LoadingSpinner from '@/shared/components/ui/LoadingSpinner';
import { useAuth } from '@/shared/hooks/useAuth';
import { toast } from '@/shared/components/ui/use-toast';
import { supabase } from '@/shared/services/supabaseClient';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '@/shared/contexts/ThemeContext';

const StudentProfilePage = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('personal');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  // Função de máscara de telefone
  const phoneMask = (value) => {
    if (!value) return '';
    value = String(value).replace(/\D/g, '');
    if (value.length <= 10) {
      value = value.replace(/(\d{2})(\d)/, '($1) $2');
      value = value.replace(/(\d{4})(\d)/, '$1-$2');
    } else {
      value = value.replace(/(\d{2})(\d)/, '($1) $2');
      value = value.replace(/(\d{5})(\d)/, '$1-$2');
    }
    return value;
  };

  const [profileData, setProfileData] = useState({
    full_name: '',
    email: '',
    phone: '',
    avatar_url: ''
  });

  const [preferences, setPreferences] = useState({
    notifications: {
      email: {
        newActivities: true,
        gradeUpdates: true,
        upcomingEvents: true,
        weeklyReport: true
      },
      push: {
        newActivities: true,
        todayEvents: false,
        messages: true
      }
    },
    interface: {
      theme: 'light',
      language: 'pt-BR'
    }
  });

  useEffect(() => {
    if (user?.id) {
      loadProfile();
    }
  }, [user]);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setProfileData({
          full_name: data.full_name || '',
          email: data.email || user.email || '',
          phone: phoneMask(data.phone || ''),
          avatar_url: data.avatar_url || ''
        });

        if (data.preferences) {
          setPreferences(prev => ({ ...prev, ...data.preferences }));
        }
      }
    } catch (error) {
      logger.error('Erro ao carregar perfil:', error);
      toast({
        title: 'Erro ao carregar perfil',
        description: 'Não foi possível carregar seus dados.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    try {
      setSaving(true);
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          full_name: profileData.full_name,
          phone: profileData.phone.replace(/\D/g, ''),
          email: profileData.email,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      toast({
        title: 'Perfil atualizado',
        description: 'Suas informações foram salvas com sucesso.'
      });
    } catch (error) {
      logger.error('Erro ao salvar:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível salvar as alterações.',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    toggleTheme();
    
    setPreferences(prev => ({
      ...prev,
      interface: { ...prev.interface, theme: newTheme }
    }));
  };

  const tabs = [
    { id: 'personal', label: 'Dados Pessoais', icon: User },
    { id: 'preferences', label: 'Preferências', icon: Settings },
    { id: 'security', label: 'Segurança', icon: Shield }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" text="Carregando..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-slate-900 dark:text-white">Configurações</h1>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar Tabs */}
          <div className="lg:col-span-1">
            <div className="space-y-2">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-lg'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="font-medium">{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Conteúdo */}
          <div className="lg:col-span-3">
            {activeTab === 'personal' && (
              <Card className="p-6 bg-white dark:bg-slate-900">
                <h2 className="text-2xl font-bold mb-6 text-slate-900 dark:text-white">Dados Pessoais</h2>

                <div className="space-y-6">
                  <div>
                    <Label htmlFor="fullName">Nome Completo *</Label>
                    <Input
                      id="fullName"
                      value={profileData.full_name}
                      onChange={(e) => setProfileData({ ...profileData, full_name: e.target.value })}
                      placeholder="Seu nome completo"
                      className="mt-2"
                    />
                  </div>

                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={profileData.email}
                      disabled
                      className="mt-2 bg-slate-100 dark:bg-slate-800"
                    />
                    <p className="text-xs text-slate-500 mt-1">O email não pode ser alterado</p>
                  </div>

                  <div>
                    <Label htmlFor="phone">Telefone</Label>
                    <Input
                      id="phone"
                      value={profileData.phone}
                      onChange={(e) => setProfileData({ ...profileData, phone: phoneMask(e.target.value) })}
                      placeholder="(11) 99999-9999"
                      className="mt-2"
                    />
                  </div>

                  <Button onClick={handleSaveProfile} disabled={saving} className="w-full">
                    {saving ? (
                      <>
                        <span className="animate-spin mr-2">⏳</span>
                        Salvando...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        Salvar Alterações
                      </>
                    )}
                  </Button>
                </div>
              </Card>
            )}

            {activeTab === 'preferences' && (
              <Card className="p-6 bg-white dark:bg-slate-900">
                <h2 className="text-2xl font-bold mb-6 text-slate-900 dark:text-white">Preferências</h2>

                {/* Dark Mode */}
                <div className="mb-8">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    {theme === 'dark' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
                    Tema
                  </h3>
                  <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                    <div>
                      <p className="font-medium">Modo {theme === 'dark' ? 'Escuro' : 'Claro'}</p>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        Atualmente usando tema {theme === 'dark' ? 'escuro' : 'claro'}
                      </p>
                    </div>
                    <Button onClick={handleToggleTheme} variant="outline">
                      {theme === 'dark' ? (
                        <>
                          <Sun className="w-4 h-4 mr-2" />
                          Modo Claro
                        </>
                      ) : (
                        <>
                          <Moon className="w-4 h-4 mr-2" />
                          Modo Escuro
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                {/* Notificações */}
                <div>
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Bell className="w-5 h-5" />
                    Notificações
                  </h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                      <div>
                        <p className="font-medium">Novas Atividades</p>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                          Receba notificações quando houver novas atividades
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={preferences.notifications.email.newActivities}
                        onChange={(e) => setPreferences({
                          ...preferences,
                          notifications: {
                            ...preferences.notifications,
                            email: { ...preferences.notifications.email, newActivities: e.target.checked }
                          }
                        })}
                        className="w-5 h-5"
                      />
                    </div>

                    <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                      <div>
                        <p className="font-medium">Notas Atualizadas</p>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                          Receba notificações quando suas notas forem atualizadas
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={preferences.notifications.email.gradeUpdates}
                        onChange={(e) => setPreferences({
                          ...preferences,
                          notifications: {
                            ...preferences.notifications,
                            email: { ...preferences.notifications.email, gradeUpdates: e.target.checked }
                          }
                        })}
                        className="w-5 h-5"
                      />
                    </div>
                  </div>
                </div>
              </Card>
            )}

            {activeTab === 'security' && (
              <Card className="p-6 bg-white dark:bg-slate-900">
                <h2 className="text-2xl font-bold mb-6 text-slate-900 dark:text-white">Segurança</h2>
                
                {/* Alterar Senha */}
                <div className="mb-8">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Key className="w-5 h-5" />
                    Alterar Senha
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                    Para alterar sua senha, você receberá um email com instruções.
                  </p>
                  <Button
                    variant="outline"
                    onClick={async () => {
                      const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
                        redirectTo: `${window.location.origin}/reset-password`,
                      });
                      if (error) {
                        toast({
                          title: 'Erro',
                          description: 'Não foi possível enviar o email de redefinição.',
                          variant: 'destructive'
                        });
                      } else {
                        toast({
                          title: 'Email Enviado',
                          description: 'Verifique sua caixa de entrada para redefinir sua senha.',
                        });
                      }
                    }}
                  >
                    Enviar Email de Redefinição
                  </Button>
                </div>

                {/* Zona de Perigo */}
                <div className="border-t border-slate-200 dark:border-slate-800 pt-8">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-red-600">
                    <AlertTriangle className="w-5 h-5" />
                    Zona de Perigo
                  </h3>
                  <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-lg p-4">
                    <h4 className="font-semibold text-red-900 dark:text-red-300 mb-2">Deletar Conta</h4>
                    <p className="text-sm text-red-800 dark:text-red-400 mb-4">
                      Esta ação é <strong>irreversível</strong>. Todos os seus dados, histórico e submissões serão permanentemente deletados.
                    </p>
                    <Button
                      variant="destructive"
                      onClick={() => setShowDeleteModal(true)}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Deletar Minha Conta
                    </Button>
                  </div>
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Modal de Confirmação de Deletar Conta */}
      <AnimatePresence>
        {showDeleteModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 z-[100]"
              onClick={() => !deleting && setShowDeleteModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -20 }}
              transition={{ type: "spring", duration: 0.3 }}
              className="fixed inset-0 z-[101] flex items-center justify-center p-4"
            >
              <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl p-6 border border-red-200 dark:border-red-800 w-full max-w-lg">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                    <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-red-600">Deletar Conta Permanentemente</h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400">Esta ação não pode ser desfeita</p>
                  </div>
                </div>
                
                <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-4">
                  <p className="text-sm text-red-900 dark:text-red-300 font-semibold mb-2">
                    ⚠️ O que será deletado:
                  </p>
                  <ul className="text-sm text-red-800 dark:text-red-400 space-y-1 ml-4 list-disc">
                    <li>Todos os seus dados pessoais</li>
                    <li>Suas submissões e notas</li>
                    <li>Participação em turmas</li>
                    <li>Todo o histórico acadêmico</li>
                    <li>Acesso permanente à plataforma</li>
                  </ul>
                </div>

                <p className="text-sm text-slate-700 dark:text-slate-300 mb-4">
                  Para confirmar, digite <strong className="font-mono bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">CONFIRMAR EXCLUSÃO</strong> abaixo:
                </p>

                <input
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="Digite: CONFIRMAR EXCLUSÃO"
                  disabled={deleting}
                  className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg mb-6 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent disabled:opacity-50"
                />
                
                <div className="flex gap-3">
                  <Button
                    onClick={() => {
                      setShowDeleteModal(false);
                      setDeleteConfirmText('');
                    }}
                    disabled={deleting}
                    variant="outline"
                    className="flex-1"
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={async () => {
                      if (deleteConfirmText !== 'CONFIRMAR EXCLUSÃO') {
                        toast({
                          title: 'Texto Incorreto',
                          description: 'Por favor, digite exatamente "CONFIRMAR EXCLUSÃO".',
                          variant: 'destructive'
                        });
                        return;
                      }

                      setDeleting(true);
                      try {
                        const { error: profileError } = await supabase
                          .from('profiles')
                          .delete()
                          .eq('id', user.id);

                        if (profileError) throw profileError;

                        const { error: authError } = await supabase.auth.admin.deleteUser(user.id);
                        
                        if (authError) {
                          await signOut();
                          toast({
                            title: 'Conta Desativada',
                            description: 'Sua conta foi desativada. Entre em contato com o suporte para conclusão.',
                          });
                          navigate('/login');
                          return;
                        }

                        await signOut();
                        toast({
                          title: 'Conta Deletada',
                          description: 'Sua conta foi permanentemente deletada.',
                        });
                        navigate('/login');
                      } catch (error) {
                        logger.error('Erro ao deletar conta:', error);
                        toast({
                          title: 'Erro',
                          description: 'Não foi possível deletar a conta. Tente novamente.',
                          variant: 'destructive'
                        });
                        setDeleting(false);
                      }
                    }}
                    disabled={deleting || deleteConfirmText !== 'CONFIRMAR EXCLUSÃO'}
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold"
                  >
                    {deleting ? (
                      <>
                        <span className="animate-spin mr-2">⏳</span>
                        Deletando...
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-4 h-4 mr-2" />
                        Deletar Permanentemente
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default StudentProfilePage;
