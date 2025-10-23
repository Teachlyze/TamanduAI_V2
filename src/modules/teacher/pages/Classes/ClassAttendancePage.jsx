import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Card } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { Input } from '@/shared/components/ui/input';
import {
  DashboardHeader,
  StatsCard,
  gradients
} from '@/shared/design';
import LoadingSpinner from '@/shared/components/ui/LoadingSpinner';
import { ClassService } from '@/shared/services/classService';

const ClassAttendancePage = () => {
  const { classId } = useParams();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [classData, setClassData] = useState(null);
  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState({});
  const [notes, setNotes] = useState({});
  const [stats, setStats] = useState({
    averageRate: 0,
    totalPresent: 0,
    totalAbsent: 0
  });

  useEffect(() => {
    loadData();
  }, [classId]);

  const loadData = async () => {
    try {
      setLoading(true);

      const classInfo = await ClassService.getClassById(classId);
      setClassData(classInfo);

      const members = await ClassService.getClassMembers(classId, { role: 'student' });
      setStudents(members || []);

      // Initialize attendance as all present
      const initialAttendance = {};
      members.forEach(member => {
        initialAttendance[member.user_id] = true;
      });
      setAttendance(initialAttendance);

      // Mock historical stats
      const mockStats = {
        averageRate: 92.5,
        totalPresent: 450,
        totalAbsent: 35
      };
      setStats(mockStats);

    } catch (error) {
      console.error('Erro:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleAttendance = (studentId) => {
    setAttendance(prev => ({
      ...prev,
      [studentId]: !prev[studentId]
    }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      // TODO: Implementar salvamento real
      const attendanceData = {
        classId,
        date: new Date().toISOString(),
        records: Object.entries(attendance).map(([studentId, present]) => ({
          studentId,
          present,
          note: notes[studentId] || null
        }))
      };

      console.log('Salvando frequência:', attendanceData);

      alert('Frequência salva com sucesso!');
      navigate(`/teacher/classes/${classId}`);

    } catch (error) {
      console.error('Erro:', error);
      alert('Erro ao salvar frequência.');
    } finally {
      setSaving(false);
    }
  };

  const presentCount = Object.values(attendance).filter(Boolean).length;
  const absentCount = students.length - presentCount;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-6">
      <Button
        variant="ghost"
        onClick={() => navigate(`/teacher/classes/${classId}`)}
        className="mb-4"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Voltar
      </Button>

      <DashboardHeader
        title={`Frequência - ${classData?.name || 'Turma'}`}
        subtitle={`Chamada de ${new Date().toLocaleDateString('pt-BR')}`}
        role="teacher"
      />

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <StatsCard
          title="Taxa de Presença Média"
          value={`${stats.averageRate}%`}
          icon={CheckCircle}
          gradient={gradients.success}
          format="text"
          delay={0}
        />
        <StatsCard
          title="Presenças Totais"
          value={stats.totalPresent}
          icon={CheckCircle}
          gradient={gradients.success}
          delay={0.1}
        />
        <StatsCard
          title="Faltas Totais"
          value={stats.totalAbsent}
          icon={XCircle}
          gradient={gradients.danger}
          delay={0.2}
        />
      </div>

      {/* Banner PRO */}
      <Card className="p-6 bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 mb-8">
        <p className="text-amber-800 dark:text-amber-200 text-sm">
          ⚠️ <strong>Versão FREE:</strong> Histórico limitado às últimas 30 chamadas.
          <br />
          💎 <strong>PRO:</strong> Histórico ilimitado, gráficos de presença e exportação.
        </p>
      </Card>

      {/* Today's Stats */}
      <Card className="p-6 bg-white dark:bg-slate-900 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
              Chamada de Hoje
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {students.length} alunos • {presentCount} presentes • {absentCount} ausentes
            </p>
          </div>
          <div className="flex gap-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                {presentCount}
              </div>
              <div className="text-xs text-slate-600 dark:text-slate-400">Presentes</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-red-600 dark:text-red-400">
                {absentCount}
              </div>
              <div className="text-xs text-slate-600 dark:text-slate-400">Ausentes</div>
            </div>
          </div>
        </div>
      </Card>

      {/* Attendance List */}
      <Card className="p-6 bg-white dark:bg-slate-900 mb-6">
        <div className="space-y-4">
          {students.map(student => {
            const isPresent = attendance[student.user_id];
            
            return (
              <div
                key={student.user_id}
                className="flex items-center gap-4 p-4 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                {/* Avatar */}
                {student.user?.avatar_url ? (
                  <img src={student.user.avatar_url} alt={student.user.name} className="w-12 h-12 rounded-full" />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold">
                    {student.user?.name?.[0] || 'A'}
                  </div>
                )}

                {/* Info */}
                <div className="flex-1">
                  <div className="font-semibold text-slate-900 dark:text-white">
                    {student.user?.name || 'Sem nome'}
                  </div>
                  <div className="text-sm text-slate-600 dark:text-slate-400">
                    {student.user?.email}
                  </div>
                </div>

                {/* Note */}
                <Input
                  placeholder="Observação (opcional)"
                  value={notes[student.user_id] || ''}
                  onChange={(e) => setNotes(prev => ({ ...prev, [student.user_id]: e.target.value }))}
                  className="w-48"
                />

                {/* Toggle */}
                <Button
                  onClick={() => toggleAttendance(student.user_id)}
                  className={`
                    w-32
                    ${isPresent 
                      ? 'bg-green-600 hover:bg-green-700 text-white' 
                      : 'bg-red-600 hover:bg-red-700 text-white'}
                  `}
                >
                  {isPresent ? (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Presente
                    </>
                  ) : (
                    <>
                      <XCircle className="w-4 h-4 mr-2" />
                      Ausente
                    </>
                  )}
                </Button>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Actions */}
      <Card className="p-6 bg-white dark:bg-slate-900">
        <div className="flex gap-4">
          <Button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
          >
            {saving ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Salvar Frequência
              </>
            )}
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate(`/teacher/classes/${classId}`)}
          >
            Cancelar
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default ClassAttendancePage;
