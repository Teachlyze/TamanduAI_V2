import React, { useState, useEffect } from 'react';
import { useAuth } from '@/shared/hooks/useAuth';
import { supabase } from '@/shared/services/supabaseClient';
import { Card } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import LoadingSpinner from '@/shared/components/ui/LoadingSpinner';
import { User, Mail, Phone, Calendar, Save, Bell, Moon, Sun } from 'lucide-react';

const StudentSettingsPage = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState({
    full_name: '',
    email: '',
    phone: '',
    birth_date: ''
  });
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return localStorage.getItem('theme') === 'dark';
  });

  useEffect(() => {
    if (user?.id) {
      loadProfile();
    } else {
      setLoading(false);
    }
  }, [user]);

  const loadProfile = async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) throw error;

      setProfile({
        full_name: data.full_name || '',
        email: user.email || '',
        phone: data.phone || '',
        birth_date: data.birth_date || ''
      });
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user?.id) return;

    try {
      setSaving(true);
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: profile.full_name,
          phone: profile.phone,
          birth_date: profile.birth_date
        })
        .eq('id', user.id);

      if (error) throw error;

      alert('Perfil atualizado com sucesso!');
    } catch (error) {
      console.error('Error saving profile:', error);
      alert('Erro ao salvar perfil. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  const toggleDarkMode = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    
    if (newMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" text="Carregando configurações..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-sky-50 to-blue-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 p-4 md:p-6">
      {/* Header */}
      <header className="mb-6">
        <h1 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-2">
          Configurações
        </h1>
        <p className="text-slate-600 dark:text-slate-400">
          Gerencie suas informações pessoais e preferências
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Perfil */}
        <div className="lg:col-span-2">
          <Card className="p-6 bg-white dark:bg-slate-900">
            <div className="flex items-center gap-2 mb-6">
              <User className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                Informações Pessoais
              </h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Nome Completo
                </label>
                <input
                  type="text"
                  value={profile.full_name}
                  onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  placeholder="Seu nome completo"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  E-mail
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="email"
                    value={profile.email}
                    disabled
                    className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 cursor-not-allowed"
                  />
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  O e-mail não pode ser alterado
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Telefone
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="tel"
                    value={profile.phone}
                    onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                    className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    placeholder="(00) 00000-0000"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Data de Nascimento
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="date"
                    value={profile.birth_date}
                    onChange={(e) => setProfile({ ...profile, birth_date: e.target.value })}
                    className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                </div>
              </div>

              <Button
                onClick={handleSave}
                disabled={saving}
                className="w-full bg-gradient-to-r from-cyan-600 to-sky-600 hover:opacity-90 text-white"
              >
                {saving ? (
                  <>
                    <LoadingSpinner size="sm" />
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
        </div>

        {/* Preferências */}
        <div className="space-y-6">
          <Card className="p-6 bg-white dark:bg-slate-900">
            <div className="flex items-center gap-2 mb-6">
              <Bell className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                Preferências
              </h2>
            </div>

            <div className="space-y-4">
              {/* Dark Mode */}
              <div className="flex items-center justify-between p-4 rounded-lg border border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-3">
                  {isDarkMode ? (
                    <Moon className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                  ) : (
                    <Sun className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                  )}
                  <div>
                    <p className="text-sm font-medium text-slate-900 dark:text-white">
                      Tema Escuro
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {isDarkMode ? 'Ativado' : 'Desativado'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={toggleDarkMode}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 ${
                    isDarkMode ? 'bg-cyan-600' : 'bg-slate-200'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      isDarkMode ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Status */}
              <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Status da Conta
                  </p>
                  <Badge className="bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400">
                    Ativa
                  </Badge>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Sua conta está ativa e verificada
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default StudentSettingsPage;
