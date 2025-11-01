import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Textarea } from '@/shared/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/shared/components/ui/radio-group';
import { Label } from '@/shared/components/ui/label';
import { Card } from '@/shared/components/ui/card';
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

  const maxScore = submissions[0]?.activity?.max_score || 10;

  const handleApply = async () => {
    setLoading(true);

    try {
      let correctionData = {
        feedback: sameFeedback
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
      }

      // Aplicar correção em lote
      const submissionIds = submissions.map(s => s.id);
      const { data, error } = await bulkCorrect(submissionIds, correctionData, user.id);

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: `${data.successCount} submissões corrigidas. ${data.failedCount} falharam.`
      });

      onCompleted();
      onClose();
    } catch (error) {
      console.error('Erro na correção em lote:', error);
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
                    Ajuste proporcional (em breve)
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

          {/* Preview */}
          <Card className="p-4 bg-blue-50 dark:bg-blue-950/30">
            <h4 className="font-semibold mb-2">Preview do Resultado</h4>
            <div className="text-sm space-y-1">
              <p><strong>Submissões afetadas:</strong> {submissions.length}</p>
              {method === 'same_grade' && sameGrade && (
                <p><strong>Nota a ser atribuída:</strong> {sameGrade}/{maxScore}</p>
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
            disabled={loading || !sameGrade}
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
