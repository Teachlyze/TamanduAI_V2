import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Megaphone, Plus, AlertTriangle, Info, AlertCircle as AlertIcon,
  Bell, Eye, Edit, Trash2, Pin, MoreVertical, Calendar, Users
} from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Card } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu';
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
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import CreateAnnouncementModal from '../components/CreateAnnouncementModal';
import ConfirmDialog from '@/shared/components/ui/ConfirmDialog';

const AnnouncementsTab = ({ classId }) => {
  const [loading, setLoading] = useState(true);
  const [announcements, setAnnouncements] = useState([]);
  const [filterUrgency, setFilterUrgency] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, id: null, title: '' });
  const [stats, setStats] = useState({
    total: 0,
    info: 0,
    warning: 0,
    urgent: 0,
    critical: 0
  });

  useEffect(() => {
    loadAnnouncements();
  }, [classId]);

  const loadAnnouncements = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('class_materials')
        .select(`
          *,
          creator:profiles!class_materials_created_by_fkey(id, full_name, avatar_url)
        `)
        .eq('class_id', classId)
        .eq('category', 'announcement')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const items = data || [];
      setStats({
        total: items.length,
        info: items.filter(a => (a.tags?.[0] || 'info') === 'info').length,
        warning: items.filter(a => (a.tags?.[0] || 'info') === 'warning').length,
        urgent: items.filter(a => (a.tags?.[0] || 'info') === 'urgent').length,
        critical: items.filter(a => (a.tags?.[0] || 'info') === 'critical').length
      });

      setAnnouncements(items);

    } catch (error) {
      console.error('Erro ao carregar comunicados:', error);
      toast({
        title: 'Erro ao carregar comunicados',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const getUrgencyConfig = (urgency) => {
    switch (urgency) {
      case 'critical':
        return {
          icon: AlertTriangle,
          color: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
          borderColor: 'border-red-200 dark:border-red-800',
          label: 'Crítico'
        };
      case 'urgent':
        return {
          icon: Bell,
          color: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300',
          borderColor: 'border-orange-200 dark:border-orange-800',
          label: 'Urgente'
        };
      case 'warning':
        return {
          icon: AlertIcon,
          color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
          borderColor: 'border-yellow-200 dark:border-yellow-800',
          label: 'Aviso'
        };
      default:
        return {
          icon: Info,
          color: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
          borderColor: 'border-blue-200 dark:border-blue-800',
          label: 'Informação'
        };
    }
  };

  const handleViewReads = (announcement) => {
    toast({
      title: 'Em desenvolvimento',
      description: 'Visualização de leituras será implementada em breve'
    });
  };

  const handleEditAnnouncement = (announcement) => {
    toast({
      title: 'Em desenvolvimento',
      description: 'Edição de comunicados será implementada em breve'
    });
  };

  const handlePinAnnouncement = (announcement) => {
    toast({
      title: 'Em desenvolvimento',
      description: 'Fixar comunicados será implementado em breve'
    });
  };

  const handleDeleteAnnouncement = (id, title) => {
    setDeleteConfirm({ isOpen: true, id, title });
  };

  const confirmDelete = async () => {
    const { id, title } = deleteConfirm;
    
    try {
      const { error } = await supabase
        .from('class_materials')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: '✅ Comunicado deletado',
        description: `"${title}" foi removido com sucesso.`
      });

      loadAnnouncements();
    } catch (error) {
      console.error('Erro ao deletar comunicado:', error);
      toast({
        title: '❌ Erro ao deletar comunicado',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const filteredAnnouncements = filterUrgency === 'all'
    ? announcements
    : announcements.filter(a => (a.tags?.[0] || 'info') === filterUrgency);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ========== CARDS DE ESTATÍSTICAS ========== */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card className="p-4 border-2 border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800">
              <Megaphone className="w-5 h-5 text-slate-600 dark:text-slate-400" />
            </div>
            <div>
              <div className="text-2xl font-bold">{stats.total}</div>
              <div className="text-sm text-slate-600 dark:text-slate-400">Total</div>
            </div>
          </div>
        </Card>

        <Card className="p-4 border-2 border-blue-200 dark:border-blue-800">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900">
              <Info className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <div className="text-2xl font-bold">{stats.info}</div>
              <div className="text-sm text-slate-600 dark:text-slate-400">Info</div>
            </div>
          </div>
        </Card>

        <Card className="p-4 border-2 border-yellow-200 dark:border-yellow-800">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-yellow-100 dark:bg-yellow-900">
              <AlertIcon className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div>
              <div className="text-2xl font-bold">{stats.warning}</div>
              <div className="text-sm text-slate-600 dark:text-slate-400">Avisos</div>
            </div>
          </div>
        </Card>

        <Card className="p-4 border-2 border-orange-200 dark:border-orange-800">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900">
              <Bell className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <div className="text-2xl font-bold">{stats.urgent}</div>
              <div className="text-sm text-slate-600 dark:text-slate-400">Urgentes</div>
            </div>
          </div>
        </Card>

        <Card className="p-4 border-2 border-red-200 dark:border-red-800">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900">
              <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <div className="text-2xl font-bold">{stats.critical}</div>
              <div className="text-sm text-slate-600 dark:text-slate-400">Críticos</div>
            </div>
          </div>
        </Card>
      </div>

      {/* ========== HEADER COM AÇÕES ========== */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">Comunicados</h2>
          <p className="text-slate-600 dark:text-slate-400">
            {filteredAnnouncements.length} de {stats.total} comunicados
          </p>
        </div>
        
        <div className="flex gap-2">
          <Select value={filterUrgency} onValueChange={setFilterUrgency}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filtrar urgência" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="info">📘 Informação</SelectItem>
              <SelectItem value="warning">⚠️ Aviso</SelectItem>
              <SelectItem value="urgent">🔔 Urgente</SelectItem>
              <SelectItem value="critical">🚨 Crítico</SelectItem>
            </SelectContent>
          </Select>
          
          <Button className="bg-gradient-to-r from-orange-600 to-red-600 text-white" onClick={() => setShowCreateModal(true)}>
            <Megaphone className="w-4 h-4 mr-2" />
            Novo Comunicado
          </Button>
        </div>
      </div>

      {/* ========== LISTA DE COMUNICADOS ========== */}
      {filteredAnnouncements.length === 0 ? (
        <Card className="p-12">
          <div className="text-center">
            <Megaphone className="w-16 h-16 text-slate-300 dark:text-slate-700 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              {announcements.length === 0 ? 'Nenhum comunicado publicado' : 'Nenhum resultado encontrado'}
            </h3>
            <p className="text-slate-600 dark:text-slate-400 mb-6">
              {announcements.length === 0
                ? 'Avisos importantes aparecerão aqui e notificarão todos os alunos'
                : 'Ajuste o filtro para ver mais resultados.'}
            </p>
            {announcements.length === 0 && (
              <Button className="bg-gradient-to-r from-orange-600 to-red-600" onClick={() => setShowCreateModal(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Criar Primeiro Comunicado
              </Button>
            )}
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredAnnouncements.map((announcement, index) => {
            const urgency = announcement.tags?.[0] || 'info';
            const config = getUrgencyConfig(urgency);
            const Icon = config.icon;

            return (
              <motion.div
                key={announcement.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className={`p-6 border-2 ${config.borderColor} hover:shadow-lg transition-all`}>
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-lg ${config.color}`}>
                      <Icon className="w-6 h-6" />
                    </div>

                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-lg font-semibold">{announcement.title}</h3>
                            <Badge className={config.color}>{config.label}</Badge>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-slate-500">
                            <Calendar className="w-3 h-3" />
                            {formatDistanceToNow(new Date(announcement.created_at), { locale: ptBR, addSuffix: true })}
                          </div>
                        </div>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleViewReads(announcement)}>
                              <Eye className="w-4 h-4 mr-2" />
                              Ver Leituras
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEditAnnouncement(announcement)}>
                              <Edit className="w-4 h-4 mr-2" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handlePinAnnouncement(announcement)}>
                              <Pin className="w-4 h-4 mr-2" />
                              Fixar no Topo
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={() => handleDeleteAnnouncement(announcement.id, announcement.title)}
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Deletar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      <p className="text-slate-700 dark:text-slate-300 mb-3">
                        {announcement.description}
                      </p>

                      <div className="flex items-center gap-4 text-sm text-slate-500">
                        <span className="flex items-center gap-1">
                          <Users className="w-4 h-4" />
                          Todos os alunos
                        </span>
                        <span className="flex items-center gap-1">
                          <Eye className="w-4 h-4" />
                          0 leituras
                        </span>
                      </div>
                    </div>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Modal de Criar Comunicado */}
      <CreateAnnouncementModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        classId={classId}
        onSuccess={loadAnnouncements}
      />

      {/* Dialog de Confirmação de Exclusão */}
      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ isOpen: false, id: null, title: '' })}
        onConfirm={confirmDelete}
        title="Deletar Comunicado"
        message={`Tem certeza que deseja deletar "${deleteConfirm.title}"? Esta ação não pode ser desfeita.`}
        confirmText="Deletar"
        cancelText="Cancelar"
        variant="danger"
      />
    </div>
  );
};

export default AnnouncementsTab;
