import React, { useState, useEffect } from 'react';
import { X, Clock, MapPin, Video, Calendar } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';

const DAYS_OF_WEEK = [
  { id: 'monday', label: 'Segunda-feira' },
  { id: 'tuesday', label: 'Terça-feira' },
  { id: 'wednesday', label: 'Quarta-feira' },
  { id: 'thursday', label: 'Quinta-feira' },
  { id: 'friday', label: 'Sexta-feira' },
  { id: 'saturday', label: 'Sábado' },
  { id: 'sunday', label: 'Domingo' }
];

const ScheduleClassModal = ({ isOpen, onClose, onSave, initialData }) => {
  const [formData, setFormData] = useState({
    day: 'monday',
    start_time: '08:00',
    end_time: '10:00',
    modality: 'online',
    location: ''
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    } else {
      setFormData({
        day: 'monday',
        start_time: '08:00',
        end_time: '10:00',
        modality: 'online',
        location: ''
      });
    }
    setErrors({});
  }, [initialData, isOpen]);

  const validate = () => {
    const newErrors = {};

    if (!formData.day) {
      newErrors.day = 'Selecione um dia da semana';
    }

    if (!formData.start_time) {
      newErrors.start_time = 'Informe o horário de início';
    }

    if (!formData.end_time) {
      newErrors.end_time = 'Informe o horário de término';
    }

    if (formData.start_time && formData.end_time) {
      if (formData.start_time >= formData.end_time) {
        newErrors.end_time = 'Horário de término deve ser maior que o início';
      }
    }

    if (formData.location && formData.location.length > 200) {
      newErrors.location = 'Localização muito longa';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!validate()) return;

    onSave(formData);
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Limpar erro do campo
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl max-w-md w-full my-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-cyan-500 p-6 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <Calendar className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">
                  {initialData ? 'Editar Horário' : 'Adicionar Horário'}
                </h2>
                <p className="text-cyan-100 text-sm">Configure o horário de aula</p>
              </div>
            </div>
            <button 
              onClick={onClose} 
              className="text-white hover:bg-white/20 p-2 rounded-lg transition-colors"
              aria-label="Fechar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Dia da Semana */}
          <div>
            <Label htmlFor="day">Dia da Semana *</Label>
            <Select value={formData.day} onValueChange={(value) => handleChange('day', value)}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DAYS_OF_WEEK.map(day => (
                  <SelectItem key={day.id} value={day.id}>
                    {day.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.day && <p className="text-xs text-red-600 mt-1">{errors.day}</p>}
          </div>

          {/* Horários */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="start_time">Início *</Label>
              <div className="relative mt-1">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  id="start_time"
                  type="time"
                  value={formData.start_time}
                  onChange={(e) => handleChange('start_time', e.target.value)}
                  className="pl-10"
                />
              </div>
              {errors.start_time && <p className="text-xs text-red-600 mt-1">{errors.start_time}</p>}
            </div>

            <div>
              <Label htmlFor="end_time">Término *</Label>
              <div className="relative mt-1">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  id="end_time"
                  type="time"
                  value={formData.end_time}
                  onChange={(e) => handleChange('end_time', e.target.value)}
                  className="pl-10"
                />
              </div>
              {errors.end_time && <p className="text-xs text-red-600 mt-1">{errors.end_time}</p>}
            </div>
          </div>

          {/* Modalidade */}
          <div>
            <Label htmlFor="modality">Modalidade</Label>
            <Select value={formData.modality} onValueChange={(value) => handleChange('modality', value)}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="online">
                  <div className="flex items-center gap-2">
                    <Video className="w-4 h-4" />
                    Online
                  </div>
                </SelectItem>
                <SelectItem value="presential">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    Presencial
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Localização/Link */}
          <div>
            <Label htmlFor="location">
              {formData.modality === 'online' ? 'Link da Reunião' : 'Local'}
            </Label>
            <div className="relative mt-1">
              {formData.modality === 'online' ? (
                <Video className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              ) : (
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              )}
              <Input
                id="location"
                type="text"
                value={formData.location}
                onChange={(e) => handleChange('location', e.target.value)}
                placeholder={formData.modality === 'online' ? 'https://meet.google.com/...' : 'Sala 101'}
                className="pl-10"
              />
            </div>
            {errors.location && <p className="text-xs text-red-600 mt-1">{errors.location}</p>}
          </div>

          {/* Info */}
          <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <p className="text-xs text-blue-700 dark:text-blue-300">
              <strong>Dica:</strong> Este horário será adicionado à agenda dos alunos da turma automaticamente.
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-gradient-to-r from-blue-600 to-cyan-600"
            >
              {initialData ? 'Salvar Alterações' : 'Adicionar Horário'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ScheduleClassModal;
