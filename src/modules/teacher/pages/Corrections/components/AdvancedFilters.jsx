import React, { useState, useEffect } from 'react';
import { Card } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Label } from '@/shared/components/ui/label';
import { Checkbox } from '@/shared/components/ui/checkbox';
import { Slider } from '@/shared/components/ui/slider';
import { Calendar } from '@/shared/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { CalendarIcon, X } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

const AdvancedFilters = ({ onApply, onClear }) => {
  const [filters, setFilters] = useState({
    classes: [],
    activities: [],
    statuses: [],
    gradeRange: [0, 10],
    dateRange: { from: null, to: null },
    plagiarismThreshold: 70,
    onlyFlagged: false
  });

  const handleApply = () => {
    onApply(filters);
  };

  const handleClear = () => {
    const cleared = {
      classes: [],
      activities: [],
      statuses: [],
      gradeRange: [0, 10],
      dateRange: { from: null, to: null },
      plagiarismThreshold: 70,
      onlyFlagged: false
    };
    setFilters(cleared);
    onClear();
  };

  return (
    <Card className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Filtros Avançados</h3>
        <Button variant="ghost" size="sm" onClick={handleClear}>
          <X className="w-4 h-4 mr-2" />
          Limpar Todos
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Status da Correção */}
        <div className="space-y-2">
          <Label className="font-semibold">Status da Correção</Label>
          <div className="space-y-2">
            {['submitted', 'graded', 'needs_revision'].map(status => (
              <div key={status} className="flex items-center space-x-2">
                <Checkbox
                  id={`status-${status}`}
                  checked={filters.statuses.includes(status)}
                  onCheckedChange={(checked) => {
                    setFilters(prev => ({
                      ...prev,
                      statuses: checked
                        ? [...prev.statuses, status]
                        : prev.statuses.filter(s => s !== status)
                    }));
                  }}
                />
                <Label htmlFor={`status-${status}`} className="cursor-pointer text-sm">
                  {status === 'submitted' ? 'Não Corrigidas' :
                   status === 'graded' ? 'Corrigidas' :
                   'Necessitam Revisão'}
                </Label>
              </div>
            ))}
          </div>
        </div>

        {/* Faixa de Nota */}
        <div className="space-y-3">
          <Label className="font-semibold">Faixa de Nota (apenas corrigidas)</Label>
          <div className="space-y-2">
            <Slider
              value={filters.gradeRange}
              onValueChange={(value) => setFilters(prev => ({ ...prev, gradeRange: value }))}
              min={0}
              max={10}
              step={0.5}
              className="w-full"
            />
            <div className="flex justify-between text-sm text-gray-600">
              <span>{filters.gradeRange[0]}</span>
              <span>{filters.gradeRange[1]}</span>
            </div>
          </div>
        </div>

        {/* Data de Submissão */}
        <div className="space-y-2">
          <Label className="font-semibold">Data de Submissão</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !filters.dateRange.from && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {filters.dateRange.from ? (
                  filters.dateRange.to ? (
                    <>
                      {format(filters.dateRange.from, "dd/MM/yyyy", { locale: ptBR })} -{" "}
                      {format(filters.dateRange.to, "dd/MM/yyyy", { locale: ptBR })}
                    </>
                  ) : (
                    format(filters.dateRange.from, "dd/MM/yyyy", { locale: ptBR })
                  )
                ) : (
                  <span>Selecione período</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                initialFocus
                mode="range"
                selected={filters.dateRange}
                onSelect={(range) => setFilters(prev => ({ ...prev, dateRange: range || { from: null, to: null } }))}
                numberOfMonths={2}
                locale={ptBR}
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Antiplágio */}
        <div className="space-y-3">
          <Label className="font-semibold">Originalidade Mínima (%)</Label>
          <div className="space-y-2">
            <Slider
              value={[filters.plagiarismThreshold]}
              onValueChange={([value]) => setFilters(prev => ({ ...prev, plagiarismThreshold: value }))}
              min={0}
              max={100}
              step={5}
              className="w-full"
            />
            <div className="text-sm text-center text-gray-600">
              Mostrar apenas com originalidade &lt; {filters.plagiarismThreshold}%
            </div>
          </div>
        </div>

        {/* Marcadas */}
        <div className="space-y-2">
          <Label className="font-semibold">Outros Filtros</Label>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="flagged"
              checked={filters.onlyFlagged}
              onCheckedChange={(checked) => setFilters(prev => ({ ...prev, onlyFlagged: checked }))}
            />
            <Label htmlFor="flagged" className="cursor-pointer text-sm">
              Apenas marcadas para revisão
            </Label>
          </div>
        </div>
      </div>

      {/* Botões de Ação */}
      <div className="flex justify-end gap-2 pt-4 border-t">
        <Button variant="outline" onClick={handleClear}>
          Limpar
        </Button>
        <Button onClick={handleApply} className="bg-blue-600 hover:bg-blue-700">
          Aplicar Filtros
        </Button>
      </div>
    </Card>
  );
};

export default AdvancedFilters;
