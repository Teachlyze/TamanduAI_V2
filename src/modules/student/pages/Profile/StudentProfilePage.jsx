import React, { useState, useEffect } from 'react';
import { User, Mail, Phone } from 'lucide-react';
import { Card } from '@/shared/components/ui/card';
import { Input } from '@/shared/components/ui/input';
import { Button } from '@/shared/components/ui/button';
import { DashboardHeader } from '@/shared/design';
import { useAuth } from '@/shared/hooks/useAuth';
import { supabase } from '@/shared/services/supabaseClient';

const StudentProfilePage = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState({ name: '', email: '', phone: '' });

  useEffect(() => {
    if (user) {
      setProfile({
        name: user.user_metadata?.name || '',
        email: user.email || '',
        phone: user.user_metadata?.phone || ''
      });
    }
  }, [user]);

  const handleSave = async () => {
    try {
      await supabase.auth.updateUser({
        data: { name: profile.name, phone: profile.phone }
      });
      alert('Perfil atualizado!');
    } catch (error) {
      console.error('Erro:', error);
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
