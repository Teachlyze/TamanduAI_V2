import { logger } from '@/shared/utils/logger';
import React, { useState, useEffect } from 'react';
import { User, Mail, Phone } from 'lucide-react';
import { Card } from '@/shared/components/ui/card';
import { Input } from '@/shared/components/ui/input';
import { Button } from '@/shared/components/ui/button';
import { DashboardHeader } from '@/shared/design';
import { useAuth } from '@/shared/hooks/useAuth';
import { supabase } from '@/shared/services/supabaseClient';
import { useToast } from '@/shared/components/ui/use-toast';

const StudentProfilePage = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState({ name: '', email: '', phone: '' });
  const { toast } = useToast();

  useEffect(() => {
    const loadProfile = async () => {
      if (!user?.id) return;
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('full_name, email')
          .eq('id', user.id)
          .single();
        if (error && error.code !== 'PGRST116') throw error; // ignore not found
        setProfile({
          name: data?.full_name || user.user_metadata?.name || '',
          email: data?.email || user.email || '',
          phone: user.user_metadata?.phone || ''
        });
      } catch (e) {
        logger.warn('Falha ao carregar perfil:', e)
        setProfile({
          name: user.user_metadata?.name || '',
          email: user.email || '',
          phone: user.user_metadata?.phone || ''
        });
      }
    };
    loadProfile();
  }, [user]);

  const handleSave = async () => {
    try {
      if (!user?.id) return;
      // Atualiza tabela profiles
      const { error: upsertError } = await supabase
        .from('profiles')
        .upsert({ id: user.id, full_name: profile.name, email: profile.email }, { onConflict: 'id' });
      if (upsertError) throw upsertError;

      // Atualiza metadados de auth (telefone e nome para consistência)
      const { error: authError } = await supabase.auth.updateUser({
        data: { name: profile.name, phone: profile.phone }
      });
      if (authError) throw authError;

      toast({ title: 'Perfil atualizado', description: 'Suas informações foram salvas com sucesso.' });
    } catch (error) {
      logger.error('Erro:', error)
      toast({ variant: 'destructive', title: 'Erro ao salvar', description: 'Não foi possível atualizar seu perfil.' });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-6">
      <DashboardHeader title="Meu Perfil" subtitle="Gerencie suas informações" role="student" />
      
      <Card className="p-6 bg-white dark:bg-slate-900 max-w-2xl mx-auto">
        <div className="space-y-4">
          <div>
            <label className="text-sm font-semibold mb-2 block">Nome</label>
            <Input
              value={profile.name}
              onChange={(e) => setProfile({ ...profile, name: e.target.value })}
              placeholder="Seu nome"
            />
          </div>
          <div>
            <label className="text-sm font-semibold mb-2 block">Email</label>
            <Input value={profile.email} disabled />
          </div>
          <div>
            <label className="text-sm font-semibold mb-2 block">Telefone</label>
            <Input
              value={profile.phone}
              onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
              placeholder="(00) 00000-0000"
            />
          </div>
          <Button onClick={handleSave} className="w-full bg-gradient-to-r from-blue-600 to-cyan-600">
            Salvar Alterações
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default StudentProfilePage;
