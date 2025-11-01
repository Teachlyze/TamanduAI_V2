import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  User,
  Settings,
  Shield,
  Camera,
  Save,
  X,
  Mail,
  Phone,
  Calendar,
  Award,
  Bell,
  Moon,
  Sun,
  Globe,
  Clock
} from 'lucide-react';
import { Card } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import LoadingSpinner from '@/shared/components/ui/LoadingSpinner';
import { useAuth } from '@/shared/hooks/useAuth';
import { toast } from '@/shared/components/ui/use-toast';
import teacherService from '@/shared/services/teacherService';
import { supabase } from '@/shared/services/supabaseClient';

const TeacherProfilePage = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('personal');
  const [photoUploading, setPhotoUploading] = useState(false);
  
  const [profileData, setProfileData] = useState({
    full_name: '',
    email: '',
    phone: '',
    cpf: '',
    date_of_birth: '',
    specializations: [],
    education: '',
    institution: '',
    avatar_url: ''
  });

  const [preferences, setPreferences] = useState({
    notifications: {
      email: {
        newSubmissions: true,
        studentsAlert: true,
        upcomingEvents: true,
        weeklyReport: true,
        platform: true
      },
      push: {
        newSubmissions: true,
        todayEvents: false,
        messages: true
      },
      inApp: 'all' // 'all', 'important', 'disabled'
    },
    interface: {
      language: 'pt-BR',
      theme: 'light', // 'light', 'dark', 'auto'
      fontSize: 'medium' // 'small', 'medium', 'large'
    },
    regional: {
      timezone: 'America/Sao_Paulo',
      dateFormat: 'DD/MM/YYYY',
      timeFormat: '24h'
    },
    dashboard: {
      itemsPerPage: 25,
      defaultClassOrder: 'recent',
      showArchivedClasses: false
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

      const { data, error } = await teacherService.getTeacherProfile(user.id);
      
      if (error) throw error;

      if (data) {
        setProfileData({
          full_name: data.full_name || '',
          email: data.email || '',
          phone: data.phone || '',
          cpf: data.cpf || '',
          date_of_birth: data.date_of_birth || '',
          specializations: data.specializations || [],
          education: data.education || '',
          institution: data.institution || '',
          avatar_url: data.avatar_url || ''
        });

        if (data.preferences) {
          setPreferences(prev => ({
            ...prev,
            ...data.preferences
          }));
        }
      }
    } catch (error) {
      console.error('Erro ao carregar perfil:', error);
      toast({
        title: 'Erro ao carregar perfil',
        description: 'Não foi possível carregar seus dados.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validar tipo
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Arquivo inválido',
        description: 'Por favor, selecione uma imagem.',
        variant: 'destructive'
      });
      return;
    }

    // Validar tamanho (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'Arquivo muito grande',
        description: 'A imagem deve ter no máximo 5MB.',
        variant: 'destructive'
      });
      return;
    }

    try {
      setPhotoUploading(true);

      const { data, error } = await teacherService.uploadAvatar(user.id, file);
      
      if (error) throw error;

      setProfileData(prev => ({ ...prev, avatar_url: data.avatar_url }));

      toast({
        title: 'Foto atualizada!',
        description: 'Sua foto de perfil foi atualizada com sucesso.'
      });
    } catch (error) {
      console.error('Erro ao fazer upload:', error);
      toast({
        title: 'Erro ao fazer upload',
        description: 'Não foi possível atualizar sua foto.',
        variant: 'destructive'
      });
    } finally {
      setPhotoUploading(false);
    }
  };

  const handleSaveProfile = async () => {
    // Validações
    if (!profileData.full_name.trim()) {
      toast({
        title: 'Nome obrigatório',
        description: 'Por favor, preencha seu nome completo.',
        variant: 'destructive'
      });
      return;
    }

    try {
      setSaving(true);

      const { error } = await teacherService.updateTeacherProfile(user.id, {
        full_name: profileData.full_name,
        phone: profileData.phone,
        cpf: profileData.cpf,
        date_of_birth: profileData.date_of_birth,
        specializations: profileData.specializations,
        education: profileData.education,
        institution: profileData.institution
      });

      if (error) throw error;

      toast({
        title: 'Perfil atualizado!',
        description: 'Suas informações foram salvas com sucesso.'
      });
    } catch (error) {
      console.error('Erro ao salvar perfil:', error);
      toast({
        title: 'Erro ao salvar',
        description: 'Não foi possível salvar suas alterações.',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSavePreferences = async () => {
    try {
      setSaving(true);

      const { error } = await teacherService.updatePreferences(user.id, preferences);

      if (error) throw error;

      toast({
        title: 'Preferências salvas!',
        description: 'Suas configurações foram atualizadas.'
      });

      // Aplicar tema imediatamente
      applyTheme(preferences.interface.theme);
    } catch (error) {
      console.error('Erro ao salvar preferências:', error);
      toast({
        title: 'Erro ao salvar',
        description: 'Não foi possível salvar suas preferências.',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const applyTheme = (theme) => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else if (theme === 'light') {
      root.classList.remove('dark');
    } else {
      // Auto: detectar preferência do sistema
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    }
  };

  const tabs = [
    { id: 'personal', label: 'Dados Pessoais', icon: User },
    { id: 'preferences', label: 'Preferências', icon: Settings },
    { id: 'security', label: 'Segurança', icon: Shield }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-6">
      {/* Header */}
      <div className="relative mb-6 overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-500 p-8 text-white shadow-lg">
        <div className="absolute inset-0 bg-grid-white/[0.05] bg-[size:20px_20px]" />
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative z-10"
        >
          <h1 className="text-3xl font-bold mb-2">Meu Perfil</h1>
          <p className="text-cyan-100">Gerencie suas informações pessoais e preferências</p>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Menu Lateral */}
        <Card className="lg:col-span-1 p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 h-fit">
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
                      ? 'bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 border-2 border-blue-600'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 border-2 border-transparent'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </Card>

        {/* Conteúdo */}
        <div className="lg:col-span-3">
          {activeTab === 'personal' && (
            <Card className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <h2 className="text-2xl font-bold mb-6 text-slate-900 dark:text-white">Dados Pessoais</h2>

              {/* Foto de Perfil */}
              <div className="mb-8">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
                  Foto de Perfil
                </label>
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center text-white text-2xl font-bold overflow-hidden">
                      {profileData.avatar_url ? (
                        <img
                          src={profileData.avatar_url}
                          alt="Avatar"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        profileData.full_name?.[0] || 'P'
                      )}
                    </div>
                    {photoUploading && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full">
                        <LoadingSpinner size="sm" />
                      </div>
                    )}
                  </div>
                  <div>
                    <input
                      type="file"
                      id="avatar-upload"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      className="hidden"
                      disabled={photoUploading}
                    />
                    <label
                      htmlFor="avatar-upload"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg cursor-pointer transition-colors"
                    >
                      <Camera className="w-4 h-4" />
                      Alterar Foto
                    </label>
                    <p className="text-xs text-slate-500 mt-2">
                      JPG, PNG ou GIF. Máximo 5MB.
                    </p>
                  </div>
                </div>
              </div>

              {/* Informações Básicas */}
              <div className="space-y-4 mb-8">
                <h3 className="font-semibold text-lg text-slate-900 dark:text-white">Informações Básicas</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Nome Completo *
                    </label>
                    <input
                      type="text"
                      value={profileData.full_name}
                      onChange={(e) => setProfileData(prev => ({ ...prev, full_name: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-slate-800"
                      placeholder="Seu nome completo"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Email
                    </label>
                    <input
                      type="email"
                      value={profileData.email}
                      readOnly
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-100 dark:bg-slate-800 cursor-not-allowed"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Telefone
                    </label>
                    <input
                      type="tel"
                      value={profileData.phone}
                      onChange={(e) => setProfileData(prev => ({ ...prev, phone: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-slate-800"
                      placeholder="(00) 00000-0000"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      CPF
                    </label>
                    <input
                      type="text"
                      value={profileData.cpf}
                      onChange={(e) => setProfileData(prev => ({ ...prev, cpf: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-slate-800"
                      placeholder="000.000.000-00"
                    />
                  </div>
                </div>
              </div>

              {/* Informações Profissionais */}
              <div className="space-y-4 mb-8">
                <h3 className="font-semibold text-lg text-slate-900 dark:text-white">Informações Profissionais</h3>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Instituição
                  </label>
                  <input
                    type="text"
                    value={profileData.institution}
                    onChange={(e) => setProfileData(prev => ({ ...prev, institution: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-slate-800"
                    placeholder="Nome da escola/universidade"
                  />
                </div>
              </div>

              {/* Botões de Ação */}
              <div className="flex items-center gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                <Button
                  onClick={handleSaveProfile}
                  disabled={saving}
                  className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700"
                >
                  {saving ? (
                    <>
                      <LoadingSpinner size="sm" className="mr-2" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Salvar Alterações
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={loadProfile}
                  disabled={saving}
                >
                  <X className="w-4 h-4 mr-2" />
                  Cancelar
                </Button>
              </div>
            </Card>
          )}

          {activeTab === 'preferences' && (
            <Card className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <h2 className="text-2xl font-bold mb-6 text-slate-900 dark:text-white">Preferências</h2>

              {/* Notificações */}
              <div className="mb-8">
                <h3 className="font-semibold text-lg text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                  <Bell className="w-5 h-5" />
                  Notificações por Email
                </h3>
                <div className="space-y-3">
                  {Object.entries({
                    newSubmissions: 'Novas submissões de alunos',
                    studentsAlert: 'Alunos em alerta',
                    upcomingEvents: 'Lembrete de eventos próximos',
                    weeklyReport: 'Resumo semanal de atividades',
                    platform: 'Comunicados da plataforma'
                  }).map(([key, label]) => (
                    <label key={key} className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={preferences.notifications.email[key]}
                        onChange={(e) => setPreferences(prev => ({
                          ...prev,
                          notifications: {
                            ...prev.notifications,
                            email: {
                              ...prev.notifications.email,
                              [key]: e.target.checked
                            }
                          }
                        }))}
                        className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm text-slate-700 dark:text-slate-300">{label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Interface */}
              <div className="mb-8">
                <h3 className="font-semibold text-lg text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                  {preferences.interface.theme === 'dark' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
                  Interface
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Tema Visual
                    </label>
                    <div className="flex gap-3">
                      {[
                        { value: 'light', label: 'Claro', icon: Sun },
                        { value: 'dark', label: 'Escuro', icon: Moon },
                        { value: 'auto', label: 'Automático', icon: Globe }
                      ].map(({ value, label, icon: Icon }) => (
                        <button
                          key={value}
                          onClick={() => setPreferences(prev => ({
                            ...prev,
                            interface: { ...prev.interface, theme: value }
                          }))}
                          className={`flex-1 flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all ${
                            preferences.interface.theme === value
                              ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/30'
                              : 'border-slate-200 dark:border-slate-700 hover:border-blue-300'
                          }`}
                        >
                          <Icon className="w-5 h-5" />
                          <span className="text-sm font-medium">{label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Botões de Ação */}
              <div className="flex items-center gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                <Button
                  onClick={handleSavePreferences}
                  disabled={saving}
                  className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700"
                >
                  {saving ? (
                    <>
                      <LoadingSpinner size="sm" className="mr-2" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Salvar Preferências
                    </>
                  )}
                </Button>
              </div>
            </Card>
          )}

          {activeTab === 'security' && (
            <Card className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <h2 className="text-2xl font-bold mb-6 text-slate-900 dark:text-white">Segurança</h2>
              <div className="text-center py-12">
                <Shield className="w-16 h-16 mx-auto mb-4 text-slate-400" />
                <p className="text-slate-600 dark:text-slate-400">
                  Funcionalidades de segurança em breve.
                </p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default TeacherProfilePage;
