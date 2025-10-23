import React, { useEffect, useState } from 'react';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { Badge } from '@/shared/components/ui/badge';
import { useAuth } from "@/hooks/useAuth";
import { useClass } from '@/shared/contexts/ClassContext';
import { supabase } from '@/shared/services/supabaseClient';
import { Logger } from '@/shared/services/logger';
import { GraduationCap, BookOpen, Users, Calendar, AlertTriangle } from 'lucide-react';

const ClassSelector = ({ onClassSelect, showCreateButton = true }) => {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { selectClass, selectedClass } = useClass();
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedTerm, setDebouncedTerm] = useState('');

  // Debounce search term
  useEffect(() => {
    const t = setTimeout(() => setDebouncedTerm(searchTerm.trim()), 350);
    return () => clearTimeout(t);
  }, [searchTerm]);

  useEffect(() => {
    const fetchClasses = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        Logger.info('Buscando turmas do professor', { teacherId: user.id });

        // Primeiro tenta com colunas seguras (evita 400 quando campos não existem)
        let query = supabase
          .from('classes')
          .select('id, name, subject, grade')
          .eq('created_by', user.id)
          .order('name', { ascending: true })
          .limit(100);

        if (debouncedTerm && debouncedTerm.length >= 2) {
          const q = debouncedTerm.replace(/%/g, '');
          query = query.or(`name.ilike.%${q}%,subject.ilike.%${q}%`);
        }

        let { data, error } = await query;

        // Fallback: tenta buscar todas as colunas se ainda houver erro
        if (error) {
          Logger.warn('Falha ao buscar colunas seguras de classes, tentando fallback *', { error: error.message });
          let fallbackQuery = supabase
            .from('classes')
            .select('*')
            .eq('created_by', user.id)
            .order('name', { ascending: true })
            .limit(100);

          if (debouncedTerm && debouncedTerm.length >= 2) {
            const q2 = debouncedTerm.replace(/%/g, '');
            fallbackQuery = fallbackQuery.or(`name.ilike.%${q2}%,subject.ilike.%${q2}%`);
          }

          const fallback = await fallbackQuery;
          data = fallback.data;
          error = fallback.error;
        }

        if (error) {
          Logger.error('Erro ao buscar turmas', { error: error.message });
          setClasses([]);
        } else {
          Logger.info('Turmas carregadas com sucesso', { count: data.length });
          setClasses(data || []);
        }
      } catch (error) {
        Logger.error('Erro ao buscar turmas', error);
        setClasses([]);
      } finally {
        setLoading(false);
      }
    };

    fetchClasses();
  }, [user, debouncedTerm]);

  const handleClassSelect = (classId) => {
    const selectedClassData = classes.find(c => c.id === classId);
    if (selectedClassData) {
      selectClass(selectedClassData);
      onClassSelect?.(selectedClassData);
      Logger.info('Turma selecionada', {
        classId: selectedClassData.id,
        className: selectedClassData.name
      });
    }
  };

  const getSubjectDisplayName = (subject) => {
    const subjects = {
      matematica: 'Matemática',
      portugues: 'Português',
      ciencias: 'Ciências',
      historia: 'História',
      geografia: 'Geografia',
      fisica: 'Física',
      quimica: 'Química',
      biologia: 'Biologia',
      ingles: 'Inglês',
      educacao_fisica: 'Educação Física',
      artes: 'Artes'
    };
    return subjects[subject] || subject;
  };

  const getGradeDisplayName = (grade) => {
    const grades = {
      '6ano': '6º Ano',
      '7ano': '7º Ano',
      '8ano': '8º Ano',
      '9ano': '9º Ano',
      '1medio': '1º Médio',
      '2medio': '2º Médio',
      '3medio': '3º Médio'
    };
    return grades[grade] || grade;
  };

  if (loading) {
    return (
      <Card className="bg-white/70 backdrop-blur-sm border-white/50 shadow-lg">
        <CardContent className="p-6">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-sm text-gray-600">Carregando turmas...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Class Selection */}
      <Card className="bg-white/70 backdrop-blur-sm border-white/50 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
              <GraduationCap className="w-4 h-4 text-white" />
            </div>
            Selecionar Turma
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search Input */}
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por nome/disciplinas..."
              className="w-full h-9 px-3 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <Select
            value={selectedClass?.id || ''}
            onValueChange={handleClassSelect}
          >
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder="Selecione uma turma" />
            </SelectTrigger>
            <SelectContent className="max-h-60 overflow-y-auto text-sm">
              {classes.length > 0 ? (
                classes.map((classItem) => (
                  <SelectItem key={classItem.id} value={classItem.id} className="py-1.5">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: classItem.color === 'blue' ? '#3b82f6' :
                                                  classItem.color === 'green' ? '#10b981' :
                                                  classItem.color === 'purple' ? '#8b5cf6' :
                                                  classItem.color === 'red' ? '#ef4444' :
                                                  classItem.color === 'yellow' ? '#f59e0b' :
                                                  classItem.color === 'pink' ? '#ec4899' :
                                                  classItem.color === 'orange' ? '#f97316' :
                                                  classItem.color === 'indigo' ? '#6366f1' : '#6b7280' }}
                      />
                      <div>
                        <div className="font-medium leading-tight">{classItem.name}</div>
                        <div className="text-xs text-gray-500">
                          {getSubjectDisplayName(classItem.subject)} • {getGradeDisplayName(classItem.grade)}
                        </div>
                      </div>
                    </div>
                  </SelectItem>
                ))
              ) : (
                <SelectItem value="none" disabled>
                  Nenhuma turma encontrada
                </SelectItem>
              )}
            </SelectContent>
          </Select>

          {selectedClass && (
            <div className="pt-4 border-t border-gray-200">
              <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <BookOpen className="w-5 h-5 text-blue-600" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900">{selectedClass.name}</h4>
                  <div className="flex flex-wrap gap-2 mt-1">
                    <Badge variant="secondary" className="text-xs">
                      {getSubjectDisplayName(selectedClass.subject)}
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                      {getGradeDisplayName(selectedClass.grade)}
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                      {selectedClass.semester}º Semestre
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600 mt-2">
                    {selectedClass.description || 'Sem descrição'}
                  </p>
                  <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                    <div className="flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      Capacidade: {selectedClass.capacity}
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {selectedClass.schedule}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {classes.length === 0 && !loading && (
            <div className="text-center py-6">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <GraduationCap className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Nenhuma turma encontrada
              </h3>
              <p className="text-gray-600 mb-4">
                Você ainda não possui turmas criadas. Crie sua primeira turma para começar.
              </p>
              <div className="flex items-center gap-2 justify-center text-sm text-amber-600">
                <AlertTriangle className="w-4 h-4" />
                <span>Selecione uma turma para usar as funcionalidades da plataforma</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ClassSelector;
