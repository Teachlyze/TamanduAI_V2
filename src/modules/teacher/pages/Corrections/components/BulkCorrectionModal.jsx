import { logger } from '@/shared/utils/logger';
import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Textarea } from '@/shared/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/shared/components/ui/radio-group';
import { Label } from '@/shared/components/ui/label';
import { Card } from '@/shared/components/ui/card';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/shared/components/ui/select';
import { useToast } from '@/shared/components/ui/use-toast';
import { bulkCorrect } from '@/shared/services/correctionService';
import { useAuth } from '@/shared/hooks/useAuth';

const BulkCorrectionModal = ({ submissions, onClose, onCompleted }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(false);
  const [method, setMethod] = useState('same_grade'); // same_grade, by_criteria, adjust
  const [sameGrade, setSameGrade] = useState('');
  const [sameFeedback, setSameFeedback] = useState('');
  const [adjustValue, setAdjustValue] = useState('');
  const [adjustType, setAdjustType] = useState('add'); // add, subtract, multiply
  const [newDeadline, setNewDeadline] = useState('');
  const [classScope, setClassScope] = useState('all');

  const classOptions = useMemo(() => {
    const map = new Map();
    (submissions || []).forEach((s) => {
      const assignments = s.activity?.activity_class_assignments || [];
      assignments.forEach((aca) => {
        const classId = aca.class_id || aca.class?.id;
        const className = aca.class?.name || 'Turma';
        if (classId && !map.has(classId)) {
          map.set(classId, { id: classId, name: className });
        }
      });
    });
    return Array.from(map.values());
  }, [submissions]);

  const maxScore = submissions[0]?.activity?.max_score || 10;

  const handleApply = async () => {
    setLoading(true);

    try {
      let correctionData = {
        feedback: sameFeedback,
        method,
      };

      // Determinar nota baseado no método
      if (method === 'same_grade') {
        if (!sameGrade || parseFloat(sameGrade) < 0 || parseFloat(sameGrade) > maxScore) {
          toast({
            title: 'Erro',
            description: `Nota deve estar entre 0 e ${maxScore}`,
            variant: 'destructive'
          });
          setLoading(false);
          return;
        }
        correctionData.grade = parseFloat(sameGrade);
      } else if (method === 'adjust') {
        if (!adjustValue || isNaN(parseFloat(adjustValue))) {
          toast({
            title: 'Erro',
            description: 'Informe um valor numérico válido para o ajuste.',
            variant: 'destructive'
          });
          setLoading(false);
          return;
        }

        correctionData.adjustValue = parseFloat(adjustValue);
        correctionData.adjustType = adjustType;
      } else if (method === 'by_criteria') {
        toast({
          title: 'Em breve',
          description: 'Correção por critério ainda não está disponível na correção em lote.',
        });
        setLoading(false);
        return;
      }

      // Status explícito: correção em lote sempre marca como "corrigida" neste primeiro passo
      correctionData.status = 'graded';

      // Atualização opcional de prazo da atividade
      if (newDeadline) {
        const parsed = new Date(newDeadline);
        if (!Number.isNaN(parsed.getTime())) {
          correctionData.newDueDate = parsed.toISOString();
          if (classScope && classScope !== 'all') {
            correctionData.classScope = classScope;
          }
        }
      }

      // Aplicar correção em lote
      const { data, error } = await bulkCorrect(submissions, correctionData, user.id);

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: `${data.successCount} submissões corrigidas. ${data.failedCount} falharam.`
      });

      onCompleted();
      onClose();
    } catch (error) {
      logger.error('Erro na correção em lote:', error)
      toast({
        title: 'Erro',
        description: 'Não foi possível completar a correção em lote',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Correção em Lote</DialogTitle>
          <p className="text-sm text-gray-600">
            {submissions.length} submissões selecionadas
          </p>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Lista de Selecionadas */}
          <Card className="p-4 max-h-40 overflow-y-auto">
            <h4 className="font-semibold mb-2">Submissões:</h4>
            <ul className="space-y-1 text-sm">
              {submissions.map(s => (
                <li key={s.id} className="flex justify-between">
                  <span>{s.student?.full_name}</span>
                  <span className="text-gray-500">{s.activity?.title}</span>
                </li>
              ))}
            </ul>
          </Card>

          {/* Método de Correção */}
          <div>
            <Label className="text-base font-semibold mb-3 block">Método de Correção</Label>
            <RadioGroup value={method} onValueChange={setMethod}>
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="same_grade" id="same_grade" />
                  <Label htmlFor="same_grade" className="cursor-pointer">
                    Mesma nota para todas
                  </Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="by_criteria" id="by_criteria" />
                  <Label htmlFor="by_criteria" className="cursor-pointer">
                    Nota baseada em critério (em breve)
                  </Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="adjust" id="adjust" />
                  <Label htmlFor="adjust" className="cursor-pointer">
                    Ajuste proporcional
                  </Label>
                </div>
              </div>
            </RadioGroup>
          </div>

          {/* Configurações por Método */}
          {method === 'same_grade' && (
            <div className="space-y-4">
              <div>
                <Label>Nota (0 - {maxScore})</Label>
                <Input
                  type="number"
                  min="0"
                  max={maxScore}
                  step="0.1"
                  value={sameGrade}
                  onChange={(e) => setSameGrade(e.target.value)}
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label>Feedback Padrão</Label>
                <Textarea
                  value={sameFeedback}
                  onChange={(e) => setSameFeedback(e.target.value)}
                  placeholder="Digite um feedback que será aplicado a todas as submissões..."
                  className="mt-1"
                  rows={4}
                />
              </div>
            </div>
          )}

          {method === 'adjust' && (
            <div className="space-y-4">
              <div>
                <Label className="block mb-2">Tipo de ajuste</Label>
                <RadioGroup value={adjustType} onValueChange={setAdjustType} className="flex flex-col space-y-2">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="add" id="adjust_add" />
                    <Label htmlFor="adjust_add" className="cursor-pointer">
                      Somar pontos
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="subtract" id="adjust_subtract" />
                    <Label htmlFor="adjust_subtract" className="cursor-pointer">
                      Subtrair pontos
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="multiply" id="adjust_multiply" />
                    <Label htmlFor="adjust_multiply" className="cursor-pointer">
                      Multiplicar por fator
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              <div>
                <Label>
                  Valor de ajuste {adjustType === 'multiply' ? '(fator, ex: 1.1)' : `(pontos na escala da turma, máx. ${maxScore})`}
                </Label>
                <Input
                  type="number"
                  step="0.1"
                  value={adjustValue}
                  onChange={(e) => setAdjustValue(e.target.value)}
                  className="mt-1"
                />
              </div>

              <div>
                <Label>Feedback Padrão (opcional)</Label>
                <Textarea
                  value={sameFeedback}
                  onChange={(e) => setSameFeedback(e.target.value)}
                  placeholder="Digite um feedback que será aplicado a todas as submissões..."
                  className="mt-1"
                  rows={3}
                />
              </div>
            </div>
          )}

          {/* Status / Prazos */}
          <Card className="p-4 bg-slate-50 dark:bg-slate-900/40 space-y-3">
            <div>
              <h4 className="font-semibold mb-1">Status e notificações</h4>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Todas as submissões selecionadas serão marcadas como <strong>corrigidas</strong> e os alunos receberão uma notificação de atividade corrigida.
              </p>
            </div>

            <div className="space-y-1">
              <Label htmlFor="bulk-deadline" className="text-sm font-medium">
                Atualizar prazo da atividade (opcional)
              </Label>
              <Input
                id="bulk-deadline"
                type="datetime-local"
                value={newDeadline}
                onChange={(e) => setNewDeadline(e.target.value)}
                className="mt-1 max-w-xs"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Se preenchido, o prazo será atualizado para todas as atividades relacionadas às submissões selecionadas.
              </p>
            </div>

            {classOptions.length > 1 && (
              <div className="space-y-1">
                <Label className="text-sm font-medium">
                  Aplicar novo prazo para
                </Label>
                <Select value={classScope} onValueChange={setClassScope}>
                  <SelectTrigger className="mt-1 max-w-xs">
                    <SelectValue placeholder="Selecione a turma" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as turmas destas atividades</SelectItem>
                    {classOptions.map((cls) => (
                      <SelectItem key={cls.id} value={cls.id}>
                        {cls.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Use esta opção se a mesma atividade estiver em mais de uma turma e você quiser atualizar o prazo apenas para uma turma específica.
                </p>
              </div>
            )}
          </Card>

          {/* Preview */}
          <Card className="p-4 bg-blue-50 dark:bg-blue-950/30">
            <h4 className="font-semibold mb-2">Preview do Resultado</h4>
            <div className="text-sm space-y-1">
              <p><strong>Submissões afetadas:</strong> {submissions.length}</p>
              {method === 'same_grade' && sameGrade && (
                <p><strong>Nota a ser atribuída:</strong> {sameGrade}/{maxScore}</p>
              )}
              {method === 'adjust' && adjustValue && (
                <p>
                  <strong>Ajuste:</strong>{' '}
                  {adjustType === 'add' && '+'}
                  {adjustType === 'subtract' && '-'}
                  {adjustType === 'multiply' && '×'}{' '}
                  {adjustValue}
                </p>
              )}
              {newDeadline && (
                <p>
                  <strong>Novo prazo:</strong>{' '}
                  {(() => {
                    const parsed = new Date(newDeadline);
                    if (Number.isNaN(parsed.getTime())) return newDeadline;
                    return parsed.toLocaleString('pt-BR', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    });
                  })()}
                </p>
              )}
              <p><strong>Feedback:</strong> {sameFeedback ? `${sameFeedback.substring(0, 50)}...` : 'Nenhum'}</p>
            </div>
          </Card>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button 
            onClick={handleApply}
            disabled={
              loading ||
              (method === 'same_grade' && !sameGrade) ||
              (method === 'adjust' && !adjustValue)
            }
            className="bg-green-600 hover:bg-green-700"
          >
            {loading ? 'Aplicando...' : 'Aplicar Correções'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BulkCorrectionModal;
