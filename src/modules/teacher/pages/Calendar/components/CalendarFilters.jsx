import React, { useState, useEffect } from 'react';
import { Filter, X } from 'lucide-react';
import { Card } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { supabase } from '@/shared/services/supabaseClient';

const CalendarFilters = ({ filters, setFilters, teacherId }) => {
  const [classes, setClasses] = useState([]);

  useEffect(() => {
    loadClasses();
  }, [teacherId]);

  const loadClasses = async () => {
    try {
      const { data } = await supabase
        .from('classes')
        .select('id, name')
        .eq('created_by', teacherId)
        .eq('is_active', true)
        .order('name');

      setClasses(data || []);
    } catch (error) {
      console.error('Erro ao carregar turmas:', error);
    }
  };

  const eventTypes = [
    { value: 'class', label: 'Aulas', color: 'blue' },
    { value: 'exam', label: 'Provas', color: 'red' },
    { value: 'meeting', label: 'Reuniões', color: 'purple' },
    { value: 'personal', label: 'Pessoal', color: 'gray' }
  ];

  const toggleType = (type) => {
    const newTypes = filters.types.includes(type)
      ? filters.types.filter(t => t !== type)
      : [...filters.types, type];
    setFilters({ ...filters, types: newTypes });
  };

  const toggleClass = (classId) => {
    const newClasses = filters.classes.includes(classId)
      ? filters.classes.filter(c => c !== classId)
      : [...filters.classes, classId];
    setFilters({ ...filters, classes: newClasses });
  };

  const clearFilters = () => {
    setFilters({ types: [], classes: [], modality: 'all' });
  };

  const hasActiveFilters = filters.types.length > 0 || filters.classes.length > 0 || filters.modality !== 'all';

  return (
    <Card className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
          <Filter className="w-4 h-4" />
          Filtros
        </h3>
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
          >
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Tipo de Evento */}
      <div className="mb-4">
        <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">
          Tipo de Evento
        </label>
        <div className="space-y-2">
          {eventTypes.map((type) => (
            <label
              key={type.value}
              className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 p-2 rounded"
            >
              <input
                type="checkbox"
                checked={filters.types.includes(type.value)}
                onChange={() => toggleType(type.value)}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-slate-700 dark:text-slate-300">{type.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Turmas */}
      <div className="mb-4">
        <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">
          Turmas
        </label>
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {classes.map((classItem) => (
            <label
              key={classItem.id}
              className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 p-2 rounded"
            >
              <input
                type="checkbox"
                checked={filters.classes.includes(classItem.id)}
                onChange={() => toggleClass(classItem.id)}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-slate-700 dark:text-slate-300">{classItem.name}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Modalidade */}
      <div>
        <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">
          Modalidade
        </label>
        <select
          value={filters.modality}
          onChange={(e) => setFilters({ ...filters, modality: e.target.value })}
          className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 text-sm"
        >
          <option value="all">Todas</option>
          <option value="online">Online</option>
          <option value="presential">Presencial</option>
        </select>
      </div>
    </Card>
  );
};

export default CalendarFilters;
