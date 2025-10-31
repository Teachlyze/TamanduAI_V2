import React from 'react';
import { CheckCircle2, XCircle, AlertCircle, ChevronRight } from 'lucide-react';
import { Card } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';

const ValidationChecklist = ({ errors, warnings, onValidate, onNavigateToError }) => {
  return (
    <Card className="p-6">
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold mb-2">Validação da Atividade</h2>
          <p className="text-gray-600">
            Verifique se sua atividade está pronta para ser publicada
          </p>
        </div>

        <Button onClick={onValidate} className="w-full">
          Executar Validação
        </Button>

        {/* Resumo */}
        <div className="grid grid-cols-3 gap-4">
          <Card className="p-4 bg-green-50 dark:bg-green-900/20">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              <span className="text-sm font-semibold">Válido</span>
            </div>
            <p className="text-2xl font-bold text-green-600">
              {errors.length === 0 ? '✓' : '—'}
            </p>
          </Card>

          <Card className="p-4 bg-red-50 dark:bg-red-900/20">
            <div className="flex items-center gap-2 mb-1">
              <XCircle className="w-5 h-5 text-red-600" />
              <span className="text-sm font-semibold">Erros</span>
            </div>
            <p className="text-2xl font-bold text-red-600">{errors.length}</p>
          </Card>

          <Card className="p-4 bg-yellow-50 dark:bg-yellow-900/20">
            <div className="flex items-center gap-2 mb-1">
              <AlertCircle className="w-5 h-5 text-yellow-600" />
              <span className="text-sm font-semibold">Avisos</span>
            </div>
            <p className="text-2xl font-bold text-yellow-600">{warnings.length}</p>
          </Card>
        </div>

        {/* Erros Críticos */}
        {errors.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <XCircle className="w-5 h-5 text-red-600" />
              <h3 className="font-semibold text-red-600">
                Erros Críticos ({errors.length})
              </h3>
            </div>
            <div className="space-y-2">
              {errors.map((error, idx) => (
                <Card
                  key={idx}
                  className="p-4 bg-red-50 dark:bg-red-900/20 border-l-4 border-l-red-500 cursor-pointer hover:bg-red-100 transition-colors"
                  onClick={() => onNavigateToError(error.field)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <Badge variant="destructive" className="mb-2">
                        {error.field}
                      </Badge>
                      <p className="text-sm text-red-800 dark:text-red-200">
                        {error.message}
                      </p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-red-600 flex-shrink-0" />
                  </div>
                </Card>
              ))}
            </div>
            <p className="text-sm text-red-600 mt-3">
              ❌ Corrija todos os erros antes de publicar a atividade.
            </p>
          </div>
        )}

        {/* Avisos */}
        {warnings.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <AlertCircle className="w-5 h-5 text-yellow-600" />
              <h3 className="font-semibold text-yellow-600">
                Avisos ({warnings.length})
              </h3>
            </div>
            <div className="space-y-2">
              {warnings.map((warning, idx) => (
                <Card
                  key={idx}
                  className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-l-yellow-500 cursor-pointer hover:bg-yellow-100 transition-colors"
                  onClick={() => onNavigateToError(warning.field)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <Badge variant="outline" className="mb-2 border-yellow-600 text-yellow-700">
                        {warning.field}
                      </Badge>
                      <p className="text-sm text-yellow-800 dark:text-yellow-200">
                        {warning.message}
                      </p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-yellow-600 flex-shrink-0" />
                  </div>
                </Card>
              ))}
            </div>
            <p className="text-sm text-yellow-600 mt-3">
              ⚠️ Avisos não impedem a publicação, mas é recomendado corrigi-los.
            </p>
          </div>
        )}

        {/* Sucesso */}
        {errors.length === 0 && warnings.length === 0 && (
          <Card className="p-6 bg-green-50 dark:bg-green-900/20 border-2 border-green-500">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
              <div>
                <h3 className="font-semibold text-green-800 dark:text-green-200">
                  Atividade Pronta!
                </h3>
                <p className="text-sm text-green-700 dark:text-green-300">
                  Sua atividade está válida e pronta para ser publicada.
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Checklist Visual */}
        <div>
          <h3 className="font-semibold mb-3">Checklist Geral</h3>
          <div className="space-y-2">
            <ChecklistItem
              checked={errors.filter(e => e.field === 'title').length === 0}
              label="Título válido"
            />
            <ChecklistItem
              checked={errors.filter(e => e.field === 'description').length === 0}
              label="Descrição válida"
            />
            <ChecklistItem
              checked={errors.filter(e => e.field === 'questions').length === 0}
              label="Pelo menos uma questão"
            />
            <ChecklistItem
              checked={errors.filter(e => e.field.startsWith('question')).length === 0}
              label="Todas as questões válidas"
            />
            <ChecklistItem
              checked={warnings.filter(w => w.field === 'tags').length === 0}
              label="Tags adicionadas"
              warning={true}
            />
            <ChecklistItem
              checked={warnings.filter(w => w.field === 'score').length === 0}
              label="Pontuação consistente"
              warning={true}
            />
          </div>
        </div>
      </div>
    </Card>
  );
};

const ChecklistItem = ({ checked, label, warning = false }) => {
  return (
    <div className="flex items-center gap-3 p-2 rounded hover:bg-gray-50 dark:hover:bg-gray-800">
      {checked ? (
        <CheckCircle2 className={`w-5 h-5 ${warning ? 'text-yellow-600' : 'text-green-600'}`} />
      ) : (
        <XCircle className="w-5 h-5 text-red-600" />
      )}
      <span className={`text-sm ${checked ? 'text-gray-900 dark:text-gray-100' : 'text-gray-500'}`}>
        {label}
      </span>
    </div>
  );
};

export default ValidationChecklist;
