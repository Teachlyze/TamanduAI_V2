import { logger } from '@/shared/utils/logger';
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Users, UserPlus, Search, Trash2, Mail, Calendar, ArrowLeft } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import {
  DashboardHeader,
  StatsCard,
  SearchInput,
  DataTable,
  EmptyState,
  CopyButton,
  gradients
} from '@/shared/design';
import LoadingSpinner from '@/shared/components/ui/LoadingSpinner';
import { ClassService } from '@/shared/services/classService';
import { useAuth } from '@/shared/hooks/useAuth';

const ClassMembersPage = () => {
  const { classId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [classData, setClassData] = useState(null);
  const [members, setMembers] = useState([]);
  const [filteredMembers, setFilteredMembers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [stats, setStats] = useState({
    totalStudents: 0,
    activeStudents: 0,
    inactiveStudents: 0
  });

  useEffect(() => {
    loadData();
  }, [classId]);

  useEffect(() => {
    applySearch();
  }, [members, searchQuery]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Load class data
      const classInfo = await ClassService.getClassById(classId);
      setClassData(classInfo);

      // Load members
      const membersData = await ClassService.getClassMembers(classId, { role: 'student' });
      setMembers(membersData || []);

      // Calculate stats
      const activeCount = membersData?.filter(m => m.user?.role === 'student').length || 0;
      setStats({
        totalStudents: membersData?.length || 0,
        activeStudents: activeCount,
        inactiveStudents: 0
      });

    } catch (error) {
      logger.error('Erro ao carregar membros:', error)
    } finally {
      setLoading(false);
    }
  };

  const applySearch = () => {
    if (!searchQuery) {
      setFilteredMembers(members);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = members.filter(member =>
      member.user?.name?.toLowerCase().includes(query) ||
      member.user?.email?.toLowerCase().includes(query)
    );
    setFilteredMembers(filtered);
  };

  const handleRemoveMember = async (memberId, userId) => {
    if (!confirm('Tem certeza que deseja remover este aluno da turma?')) return;

    try {
      await ClassService.removeStudentsFromClass(classId, [userId]);
      
      // Reload members
      await loadData();
    } catch (error) {
      logger.error('Erro ao remover membro:', error)
      alert('Erro ao remover membro. Tente novamente.');
    }
  };

  const columns = [
    {
      key: 'name',
      label: 'Aluno',
      sortable: true,
      render: (_, row) => (
        <div className="flex items-center gap-3">
          {row.user?.avatar_url ? (
            <img
              src={row.user.avatar_url}
              alt={row.user.name}
              className="w-10 h-10 rounded-full object-cover"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-bold">
              {row.user?.name?.[0] || 'A'}
            </div>
          )}
          <div>
            <div className="font-semibold text-slate-900 dark:text-white">
              {row.user?.name || 'Sem nome'}
            </div>
            <div className="text-sm text-slate-600 dark:text-slate-400">
              {row.user?.email || 'Sem email'}
            </div>
          </div>
        </div>
      )
    },
    {
      key: 'joined_at',
      label: 'Data de Entrada',
      sortable: true,
      type: 'date'
    },
    {
      key: 'actions',
      label: 'Ações',
      align: 'right',
      render: (_, row) => (
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(`/dashboard/students/${row.user_id}`)}
          >
            Ver Perfil
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleRemoveMember(row.id, row.user_id)}
            className="text-red-600 hover:text-red-700 dark:text-red-400"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      )
    }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" text="Carregando membros..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-6">
      {/* Back Button */}
      <Button
        variant="ghost"
        onClick={() => navigate(`/dashboard/classes/${classId}`)}
        className="mb-4"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Voltar para Turma
      </Button>

      {/* Header */}
      <DashboardHeader
        title={`Membros - ${classData?.name || 'Turma'}`}
        subtitle={`Gerencie os alunos da turma ${classData?.subject ? `• ${classData.subject}` : ''}`}
        role="teacher"
      />

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <StatsCard
          title="Total de Alunos"
          value={stats.totalStudents}
          icon={Users}
          gradient={gradients.stats.students}
          bgColor="bg-blue-50 dark:bg-blue-950/30"
          delay={0}
        />
        <StatsCard
          title="Código de Convite"
          value={classData?.invite_code || 'N/A'}
          icon={Mail}
          gradient={gradients.primary}
          bgColor="bg-blue-50 dark:bg-blue-950/30"
          delay={0.1}
          format="text"
        />
        <div className="flex items-center gap-2">
          <CopyButton
            text={classData?.invite_code || ''}
            label="Copiar Código"
            successMessage="Copiado!"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => {}}
          >
            Gerar Novo Código
          </Button>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col md:flex-row gap-4 mb-8">
        <div className="flex-1">
          <SearchInput
            placeholder="Buscar por nome ou email..."
            value={searchQuery}
            onChange={setSearchQuery}
          />
        </div>
        <Button className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white">
          <UserPlus className="w-4 h-4 mr-2" />
          Adicionar Aluno
        </Button>
      </div>

      {/* Members Table */}
      {filteredMembers.length > 0 ? (
        <DataTable
          columns={columns}
          data={filteredMembers}
          loading={loading}
        />
      ) : (
        <EmptyState
          icon={Users}
          title={searchQuery ? 'Nenhum aluno encontrado' : 'Nenhum aluno na turma'}
          description={
            searchQuery
              ? 'Tente buscar por outro termo.'
              : 'Adicione alunos usando o código de convite ou convide-os manualmente.'
          }
          actionLabel="Adicionar Aluno"
          actionIcon={UserPlus}
          action={() => {}}
        />
      )}
    </div>
  );
};

export default ClassMembersPage;
