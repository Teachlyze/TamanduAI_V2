import { logger } from '@/shared/utils/logger';
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Plus,
  Folder,
  FileText,
  Calendar as CalendarIcon,
  Upload,
  Trash2,
  Edit3,
  Share2
} from 'lucide-react';
import { supabase } from '@/shared/services/supabaseClient';
import { useAuth } from '@/shared/hooks/useAuth';
import { useToast } from '@/shared/components/ui/use-toast';
import { Button } from '@/shared/components/ui/button';
import { Card } from '@/shared/components/ui/card';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Badge } from '@/shared/components/ui/badge';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog';
import Breadcrumb from '@/shared/components/ui/Breadcrumb';
import { DashboardHeader, EmptyState } from '@/shared/design';
import useActivityFiles from '@/shared/hooks/useActivityFiles';
import PostActivityModal from './components/PostActivityModal';

const TeacherProjectActivitiesPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [activities, setActivities] = useState([]);
  const [classes, setClasses] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewModal, setShowNewModal] = useState(false);
  const [editingActivity, setEditingActivity] = useState(null);
  const [activityForPosting, setActivityForPosting] = useState(null);

  useEffect(() => {
    if (user) {
      loadActivities();
      loadClasses();
    } else {
      logger.warn('[TeacherProjectActivitiesPage] ⚠️ User not found!');
    }
  }, [user]);

  const loadActivities = async () => {
    if (!user) return;

    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('activities')
        .select(`
          *,
          assignments:activity_class_assignments(
            id,
            class_id,
            assigned_at,
            class:classes(id, name)
          )
        `)
        .eq('created_by', user.id)
        .eq('type', 'project')
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setActivities(data || []);
    } catch (error) {
      logger.error('Erro ao carregar atividades por arquivo:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar suas tarefas por arquivo.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const loadClasses = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('classes')
        .select('id, name')
        .eq('created_by', user.id)
        .eq('is_active', true);

      if (error) throw error;
      setClasses(data || []);
    } catch (error) {
      logger.error('Erro ao carregar turmas para tarefas por arquivo:', error);
    }
  };

  const filteredActivities = useMemo(() => {
    if (!searchQuery) return activities;
    const query = searchQuery.toLowerCase();
    return activities.filter((activity) => {
      return (
        activity.title?.toLowerCase().includes(query) ||
        activity.description?.toLowerCase().includes(query) ||
        activity.content?.subject?.toLowerCase().includes(query) ||
        (Array.isArray(activity.content?.tags) && activity.content.tags.some((tag) => tag.toLowerCase().includes(query)))
      );
    });
  }, [activities, searchQuery]);

  const handleArchive = async (activityId) => {
    try {
      const { error } = await supabase
        .from('activities')
        .update({ status: 'archived', updated_at: new Date().toISOString() })
        .eq('id', activityId);
      if (error) throw error;
      toast({ title: 'Atividade arquivada' });
      setActivities((prev) => prev.filter((a) => a.id !== activityId));
    } catch (error) {
      logger.error('Erro ao arquivar tarefa por arquivo:', error);
      toast({ title: 'Erro ao arquivar', variant: 'destructive' });
    }
  };

  const handleDelete = async (activityId) => {
    try {
      const { error } = await supabase
        .from('activities')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', activityId);
      if (error) throw error;
      toast({ title: 'Tarefa excluída' });
      setActivities((prev) => prev.filter((a) => a.id !== activityId));
    } catch (error) {
      logger.error('Erro ao excluir tarefa por arquivo:', error);
      toast({ title: 'Erro ao excluir', variant: 'destructive' });
    }
  };

  const stats = useMemo(() => {
    const total = activities.length;
    const drafts = activities.filter((a) => a.status === 'draft').length;
    const published = activities.filter((a) => a.status === 'published').length;
    return { total, drafts, published };
  }, [activities]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-sm text-slate-500">Carregando tarefas por arquivo...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-6">
      <div className="mb-8">
        <Breadcrumb
          items={[
            { label: 'Atividades', path: '/dashboard/activities' },
            { label: 'Tarefas por Arquivo', path: '/dashboard/activities/projects' }
          ]}
          className="mb-2"
        />
        <DashboardHeader
          title="Tarefas por Arquivo"
          subtitle="Gerencie atividades baseadas apenas em upload de PDF/DOCX"
          role="teacher"
        />
        <div className="flex flex-wrap gap-3 mt-4">
          <Button
            size="lg"
            onClick={() => setShowNewModal(true)}
            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
          >
            <Plus className="w-5 h-5 mr-2" />
            Nova Tarefa por Arquivo
          </Button>
          <Button variant="outline" size="lg" onClick={() => navigate('/dashboard/activities')}>
            Voltar para Banco de Atividades
          </Button>
        </div>
      </div>

      <Card className="p-4 mb-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex gap-4">
          <div className="px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-800">
            <p className="text-xs text-slate-500">Total</p>
            <p className="text-lg font-semibold">{stats.total}</p>
          </div>
          <div className="px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-800">
            <p className="text-xs text-slate-500">Rascunhos</p>
            <p className="text-lg font-semibold">{stats.drafts}</p>
          </div>
          <div className="px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-800">
            <p className="text-xs text-slate-500">Publicadas</p>
            <p className="text-lg font-semibold">{stats.published}</p>
          </div>
        </div>
        <div className="w-full md:w-64">
          <Input
            placeholder="Buscar por título, descrição ou tag..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </Card>

      {filteredActivities.length === 0 ? (
        <EmptyState
          icon={FileText}
          title={searchQuery ? 'Nenhuma tarefa encontrada' : 'Nenhuma tarefa por arquivo ainda'}
          description={
            searchQuery
              ? 'Ajuste a busca ou limpe o campo para ver todas as tarefas.'
              : 'Crie sua primeira tarefa por arquivo para começar.'
          }
          actionLabel="Nova Tarefa por Arquivo"
          actionIcon={Plus}
          action={() => setShowNewModal(true)}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredActivities.map((activity, index) => (
            <motion.div
              key={activity.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className="p-5 flex flex-col gap-4 h-full justify-between">
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <Folder className="w-4 h-4 text-purple-500" />
                      <h3 className="font-semibold text-base leading-snug">{activity.title}</h3>
                    </div>
                    <Badge variant={activity.status === 'published' ? 'default' : 'outline'}>
                      {activity.status === 'published' ? 'Publicada' : 'Rascunho'}
                    </Badge>
                  </div>
                  {activity.description && (
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-2 line-clamp-3">
                      {activity.description}
                    </p>
                  )}
                  {Array.isArray(activity.content?.tags) && activity.content.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {activity.content.tags.map((tag, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          #{tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                  <div className="mt-3 space-y-1 text-xs text-slate-500">
                    <div className="flex items-center gap-2">
                      <CalendarIcon className="w-3 h-3" />
                      <span>
                        {activity.due_date
                          ? new Date(activity.due_date).toLocaleString('pt-BR')
                          : 'Sem prazo definido'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Upload className="w-3 h-3" />
                      <span>
                        {(activity.content?.attachments?.length || 0)} arquivo(s) de enunciado
                      </span>
                    </div>
                    {Array.isArray(activity.assignments) && activity.assignments.length > 0 && (
                      <div className="flex items-center gap-2">
                        <Share2 className="w-3 h-3" />
                        <span>
                          Postada em {activity.assignments.length} turma(s)
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 mt-3">
                  <Button size="sm" variant="outline" onClick={() => setEditingActivity(activity)}>
                    <Edit3 className="w-4 h-4 mr-1" />
                    Editar
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setActivityForPosting(activity)}
                  >
                    <Share2 className="w-4 h-4 mr-1" />
                    Postar
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="ml-auto text-slate-600"
                    onClick={() => handleArchive(activity.id)}
                  >
                    Arquivar
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleDelete(activity.id)}
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    Excluir
                  </Button>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {showNewModal && (
        <NewProjectActivityModal
          open={showNewModal}
          onClose={() => setShowNewModal(false)}
          onCreated={() => {
            setShowNewModal(false);
            loadActivities();
          }}
          userId={user?.id}
        />
      )}

      {editingActivity && (
        <EditProjectActivityModal
          activity={editingActivity}
          open={!!editingActivity}
          onClose={() => setEditingActivity(null)}
          onSaved={() => {
            setEditingActivity(null);
            loadActivities();
          }}
          userId={user?.id}
        />
      )}

      {activityForPosting && (
        <PostActivityModal
          activities={[activityForPosting]}
          classes={classes}
          onClose={() => setActivityForPosting(null)}
          onSuccess={() => {
            setActivityForPosting(null);
            loadActivities();
          }}
        />
      )}
    </div>
  );
};

const NewProjectActivityModal = ({ open, onClose, onCreated, userId }) => {
  const { toast } = useToast();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [maxScore, setMaxScore] = useState(10);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!title.trim()) {
      toast({
        title: 'Título obrigatório',
        description: 'Defina um título para a tarefa.',
        variant: 'destructive'
      });
      return;
    }

    try {
      setSaving(true);
      const tags = tagsInput
        .split(',')
        .map((t) => t.trim())
        .filter((t) => t.length > 0);

      const { error } = await supabase.from('activities').insert({
        title: title.trim(),
        description: description.trim(),
        type: 'project',
        status: 'draft',
        is_published: false,
        max_score: maxScore,
        due_date: dueDate || null,
        created_by: userId,
        content: {
          tags,
          attachments: [],
          advanced_settings: {
            submissionMode: 'file_upload',
            plagiarismEnabled: false,
            autoGradingEnabled: false,
            shuffleQuestions: false
          }
        }
      });

      if (error) throw error;

      toast({
        title: 'Tarefa criada',
        description: 'Agora você pode adicionar arquivos de enunciado e postar nas turmas.'
      });

      onCreated();
    } catch (error) {
      logger.error('Erro ao criar tarefa por arquivo:', error);
      toast({
        title: 'Erro ao criar tarefa',
        description: 'Tente novamente em instantes.',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Nova Tarefa por Arquivo</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label htmlFor="title">Título *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Projeto de Pesquisa - Tema Livre"
            />
          </div>
          <div>
            <Label htmlFor="description">Descrição / Enunciado</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Explique brevemente o que os alunos devem fazer."
            />
          </div>
          <div>
            <Label htmlFor="tags">Tags (separadas por vírgula)</Label>
            <Input
              id="tags"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="ex: redação, projeto, pesquisa"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="dueDate">Prazo (opcional)</Label>
              <Input
                id="dueDate"
                type="datetime-local"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="maxScore">Pontuação Máxima</Label>
              <Input
                id="maxScore"
                type="number"
                min="0"
                step="0.5"
                value={maxScore}
                onChange={(e) => setMaxScore(parseFloat(e.target.value) || 0)}
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Salvando...' : 'Salvar Tarefa'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const EditProjectActivityModal = ({ activity, open, onClose, onSaved, userId }) => {
  const { toast } = useToast();
  const [title, setTitle] = useState(activity.title || '');
  const [description, setDescription] = useState(activity.description || '');
  const [tags, setTags] = useState(activity.content?.tags || []);
  const [dueDate, setDueDate] = useState(activity.due_date || '');
  const [maxScore, setMaxScore] = useState(activity.max_score || 10);
  const [attachments, setAttachments] = useState(activity.content?.attachments || []);
  const [saving, setSaving] = useState(false);

  const {
    uploadActivityFile,
    isUploading,
    uploadProgress
  } = useActivityFiles(activity.id, userId, false);

  const handleUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const meta = await uploadActivityFile(file);
      const next = [...attachments, {
        name: meta.name,
        url: meta.url,
        path: meta.path,
        size: meta.size,
        type: meta.type
      }];
      setAttachments(next);
    } catch (error) {
      toast({
        title: 'Erro ao enviar arquivo',
        description: error?.message || 'Tente novamente em instantes.',
        variant: 'destructive'
      });
    } finally {
      event.target.value = '';
    }
  };

  const handleRemoveAttachment = (index) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const updatedTags = Array.isArray(tags) ? tags : [];

      const { error } = await supabase
        .from('activities')
        .update({
          title: title.trim(),
          description: description.trim(),
          max_score: maxScore,
          due_date: dueDate || null,
          content: {
            ...(activity.content || {}),
            tags: updatedTags,
            attachments,
            advanced_settings: {
              ...(activity.content?.advanced_settings || {}),
              submissionMode: 'file_upload',
              plagiarismEnabled: false,
              autoGradingEnabled: false,
              shuffleQuestions: false
            }
          },
          updated_at: new Date().toISOString()
        })
        .eq('id', activity.id);

      if (error) throw error;

      toast({ title: 'Tarefa atualizada com sucesso!' });
      onSaved();
    } catch (error) {
      logger.error('Erro ao atualizar tarefa por arquivo:', error);
      toast({
        title: 'Erro ao salvar alterações',
        description: 'Tente novamente em instantes.',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleTagsInputChange = (value) => {
    const next = value
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0);
    setTags(next);
  };

  const tagsInputValue = useMemo(() => {
    return Array.isArray(tags) ? tags.join(', ') : '';
  }, [tags]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Tarefa por Arquivo</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label htmlFor="title-edit">Título *</Label>
            <Input
              id="title-edit"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="description-edit">Descrição / Enunciado</Label>
            <Input
              id="description-edit"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="tags-edit">Tags (separadas por vírgula)</Label>
            <Input
              id="tags-edit"
              value={tagsInputValue}
              onChange={(e) => handleTagsInputChange(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="dueDate-edit">Prazo (opcional)</Label>
              <Input
                id="dueDate-edit"
                type="datetime-local"
                value={dueDate || ''}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="maxScore-edit">Pontuação Máxima</Label>
              <Input
                id="maxScore-edit"
                type="number"
                min="0"
                step="0.5"
                value={maxScore}
                onChange={(e) => setMaxScore(parseFloat(e.target.value) || 0)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Arquivos de Enunciado</Label>
            <div className="flex items-center gap-2">
              <Input
                type="file"
                accept=".pdf,.doc,.docx,.odt,.txt"
                onChange={handleUpload}
                disabled={isUploading}
              />
              {isUploading && (
                <span className="text-xs text-slate-500">Enviando... {uploadProgress}%</span>
              )}
            </div>
            {attachments.length > 0 && (
              <div className="mt-2 space-y-2">
                {attachments.map((file, index) => (
                  <div
                    key={`${file.path || file.url || index}`}
                    className="flex items-center justify-between text-sm border rounded px-3 py-2"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="w-4 h-4 text-purple-500 flex-shrink-0" />
                      <span className="truncate">{file.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {file.url && (
                        <a
                          href={file.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 hover:underline"
                        >
                          Abrir
                        </a>
                      )}
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-red-500"
                        onClick={() => handleRemoveAttachment(index)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Salvando...' : 'Salvar alterações'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TeacherProjectActivitiesPage;
