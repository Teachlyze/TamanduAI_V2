import React, { useState } from 'react';
import { X, Search, UserPlus, Link as LinkIcon, Copy, QrCode } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Card } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { toast } from '@/shared/components/ui/use-toast';
import { supabase } from '@/shared/services/supabaseClient';
import { redisCache } from '@/shared/services/redisCache';

const AddStudentModal = ({ isOpen, onClose, classId, classData, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [method, setMethod] = useState('email'); // email, invite_link, bulk
  const [email, setEmail] = useState('');
  const [bulkEmails, setBulkEmails] = useState('');
  const [searchResult, setSearchResult] = useState(null);

  const inviteLink = classData?.invite_code 
    ? `${window.location.origin}/join/${classData.invite_code}`
    : '';

  const handleSearchEmail = async () => {
    if (!email.trim()) {
      toast({
        title: 'Email obrigatório',
        description: 'Digite um email para buscar',
        variant: 'destructive'
      });
      return;
    }

    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url')
        .eq('email', email.toLowerCase())
        .eq('role', 'student')
        .single();

      if (error || !data) {
        setSearchResult({ found: false, searched: true });
        toast({
          title: 'Aluno não encontrado',
          description: 'Email não cadastrado no sistema como aluno',
          variant: 'destructive'
        });
        return;
      }

      setSearchResult({ found: true, user: data });
    } catch (error) {
      console.error('Erro ao buscar email:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddStudent = async () => {
    if (!searchResult?.user) return;

    try {
      setLoading(true);

      // Verificar se já é membro
      const { data: existing } = await supabase
        .from('class_members')
        .select('id')
        .eq('class_id', classId)
        .eq('user_id', searchResult.user.id)
        .single();

      if (existing) {
        toast({
          title: 'Aluno já está na turma',
          variant: 'destructive'
        });
        return;
      }

      // Adicionar à turma
      const { data: inserted, error } = await supabase
        .from('class_members')
        .insert({
          class_id: classId,
          user_id: searchResult.user.id,
          role: 'student',
          joined_at: new Date().toISOString()
        })
        .select();

      if (error) throw error;

      // Verificar se realmente foi inserido
      if (!inserted || inserted.length === 0) {
        throw new Error('Falha ao adicionar aluno - nenhum registro criado');
      }

      console.log('✅ Aluno adicionado com sucesso:', inserted[0]);

      // Invalidar cache
      try {
        await redisCache.invalidateClass(classId);
      } catch (cacheError) {
        console.warn('Aviso: Erro ao invalidar cache, mas aluno foi adicionado:', cacheError);
      }

      toast({
        title: '✅ Aluno adicionado com sucesso!',
        description: `${searchResult.user.full_name} agora faz parte da turma. Peça para ele fazer logout e login novamente.`
      });

      setEmail('');
      setSearchResult(null);
      onSuccess?.();
      
    } catch (error) {
      console.error('Erro ao adicionar aluno:', error);
      toast({
        title: 'Erro ao adicionar aluno',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBulkAdd = async () => {
    const emails = bulkEmails
      .split('\n')
      .map(e => e.trim())
      .filter(e => e && e.includes('@'));

    if (emails.length === 0) {
      toast({
        title: 'Nenhum email válido',
        variant: 'destructive'
      });
      return;
    }

    try {
      setLoading(true);
      let added = 0;
      let notFound = 0;
      let alreadyMember = 0;

      for (const emailItem of emails) {
        // Buscar usuário
        const { data: user } = await supabase
          .from('profiles')
          .select('id')
          .eq('email', emailItem.toLowerCase())
          .eq('role', 'student')
          .single();

        if (!user) {
          notFound++;
          continue;
        }

        // Verificar se já é membro
        const { data: existing } = await supabase
          .from('class_members')
          .select('id')
          .eq('class_id', classId)
          .eq('user_id', user.id)
          .single();

        if (existing) {
          alreadyMember++;
          continue;
        }

        // Adicionar
        await supabase
          .from('class_members')
          .insert({
            class_id: classId,
            user_id: user.id,
            role: 'student',
            joined_at: new Date().toISOString()
          });

        added++;
      }

      // Invalidar cache
      await redisCache.invalidateClass(classId);

      toast({
        title: 'Importação concluída',
        description: `${added} alunos adicionados, ${notFound} não encontrados, ${alreadyMember} já eram membros`
      });

      setBulkEmails('');
      onSuccess?.();

    } catch (error) {
      console.error('Erro na importação:', error);
      toast({
        title: 'Erro na importação',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(inviteLink);
    toast({
      title: 'Link copiado!',
      description: 'Link de convite copiado para área de transferência'
    });
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(classData.invite_code);
    toast({
      title: 'Código copiado!',
      description: 'Código de convite copiado'
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-900">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-cyan-600 p-6 rounded-t-xl">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white">Adicionar Aluno</h2>
              <p className="text-cyan-100 text-sm">Escolha um método para adicionar alunos</p>
            </div>
            <button 
              onClick={onClose}
              className="text-white hover:bg-white/20 p-2 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Tabs de Método */}
          <div className="flex gap-2">
            {[
              { id: 'email', label: 'Buscar por Email', icon: Search },
              { id: 'invite_link', label: 'Link de Convite', icon: LinkIcon }
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setMethod(tab.id)}
                  className={`flex-1 px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                    method === tab.id
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                  }`}
                >
                  <Icon className="w-4 h-4 inline mr-2" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Método: Email */}
          {method === 'email' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Email do Aluno</label>
                <div className="flex gap-2">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="aluno@exemplo.com"
                    className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-600 dark:bg-slate-800"
                    onKeyPress={(e) => e.key === 'Enter' && handleSearchEmail()}
                  />
                  <Button onClick={handleSearchEmail} disabled={loading}>
                    <Search className="w-4 h-4 mr-2" />
                    {loading ? 'Buscando...' : 'Buscar'}
                  </Button>
                </div>
              </div>

              {searchResult?.found && searchResult.user && (
                <Card className="p-4 bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-bold">
                        {searchResult.user.full_name?.[0] || 'A'}
                      </div>
                      <div>
                        <div className="font-semibold">{searchResult.user.full_name}</div>
                        <div className="text-sm text-slate-600">{searchResult.user.email}</div>
                      </div>
                    </div>
                    <Button onClick={handleAddStudent} disabled={loading}>
                      {loading ? 'Adicionando...' : 'Adicionar à Turma'}
                    </Button>
                  </div>
                </Card>
              )}

              {searchResult?.searched && !searchResult?.found && (
                <Card className="p-4 bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800">
                  <div className="text-center">
                    <div className="text-red-600 font-semibold mb-1">❌ Email não encontrado</div>
                    <div className="text-sm text-slate-600">
                      Verifique se o email está correto ou se o aluno já está cadastrado no sistema.
                    </div>
                  </div>
                </Card>
              )}
            </div>
          )}

          {/* Método: Link de Convite */}
          {method === 'invite_link' && (
            <div className="space-y-4">
              <Card className="p-4 bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
                <h3 className="font-semibold mb-2">Código de Convite</h3>
                <div className="flex items-center gap-2 mb-3">
                  <code className="flex-1 px-3 py-2 bg-white dark:bg-slate-800 rounded border text-lg font-mono">
                    {classData?.invite_code || 'N/A'}
                  </code>
                  <Button variant="outline" size="sm" onClick={handleCopyCode}>
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
                <h3 className="font-semibold mb-2">Link de Convite</h3>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={inviteLink}
                    readOnly
                    className="flex-1 px-3 py-2 bg-white dark:bg-slate-800 rounded border text-sm"
                  />
                  <Button variant="outline" size="sm" onClick={handleCopyLink}>
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </Card>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Compartilhe o código ou link com os alunos. Eles poderão entrar automaticamente na turma.
              </p>
            </div>
          )}

          {/* Método: Importação em Lote */}
          {method === 'bulk' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Lista de Emails</label>
                <textarea
                  value={bulkEmails}
                  onChange={(e) => setBulkEmails(e.target.value)}
                  placeholder="aluno1@exemplo.com&#10;aluno2@exemplo.com&#10;aluno3@exemplo.com"
                  rows={8}
                  className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-600 dark:bg-slate-800 font-mono text-sm"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Cole uma lista de emails (um por linha)
                </p>
              </div>
              <Button onClick={handleBulkAdd} disabled={loading} className="w-full">
                {loading ? 'Importando...' : 'Importar Alunos'}
              </Button>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default AddStudentModal;
