import React from 'react';
import { motion } from 'framer-motion';
import { FileText, CheckSquare, Grid, ChevronRight } from 'lucide-react';
import { Card } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { cn } from '@/lib/utils';

const ActivityTypeSelector = ({ selectedType, onSelectType }) => {
  const types = [
    {
      id: 'open',
      name: 'Atividade Aberta',
      subtitle: 'Dissertativa',
      icon: FileText,
      color: 'from-green-500 to-emerald-600',
      description: 'Questões dissertativas com respostas textuais',
      features: [
        'Respostas escritas pelos alunos',
        'Correção manual com rubricas',
        'Análise de antiplágio disponível'
      ],
      idealFor: 'Análises, redações, explicações detalhadas'
    },
    {
      id: 'closed',
      name: 'Atividade Fechada',
      subtitle: 'Objetiva',
      icon: CheckSquare,
      color: 'from-blue-500 to-cyan-600',
      description: 'Questões de múltipla escolha',
      features: [
        'Alternativas pré-definidas',
        'Correção automática instantânea',
        'Feedback imediato para alunos'
      ],
      idealFor: 'Testes, quizzes, avaliações rápidas'
    },
    {
      id: 'mixed',
      name: 'Atividade Mista',
      subtitle: 'Híbrida',
      icon: Grid,
      color: 'from-purple-500 to-pink-600',
      description: 'Combina questões abertas e fechadas',
      features: [
        'Flexibilidade máxima',
        'Parte automática + parte manual',
        'Avaliação completa e versátil'
      ],
      idealFor: 'Provas completas, avaliações abrangentes'
    }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          Escolha o Tipo de Atividade
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Selecione o formato que melhor se adequa à sua avaliação. Você não poderá mudar após salvar.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {types.map((type, index) => {
          const Icon = type.icon;
          const isSelected = selectedType === type.id;

          return (
            <motion.div
              key={type.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card
                className={cn(
                  "p-6 cursor-pointer transition-all duration-200 hover:shadow-xl",
                  isSelected && "ring-2 ring-blue-500 shadow-xl"
                )}
                onClick={() => onSelectType(type.id)}
              >
                <div className="flex items-start gap-6">
                  {/* Ícone */}
                  <div className={cn(
                    "p-4 rounded-xl bg-gradient-to-br",
                    type.color,
                    "flex-shrink-0"
                  )}>
                    <Icon className="w-8 h-8 text-white" />
                  </div>

                  {/* Conteúdo */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                        {type.name}
                      </h3>
                      <Badge variant="outline">{type.subtitle}</Badge>
                    </div>

                    <p className="text-gray-700 dark:text-gray-300 mb-4">
                      {type.description}
                    </p>

                    {/* Características */}
                    <div className="space-y-2 mb-4">
                      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                        Características:
                      </p>
                      <ul className="space-y-1">
                        {type.features.map((feature, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                            <ChevronRight className="w-4 h-4 mt-0.5 flex-shrink-0 text-green-500" />
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Ideal para */}
                    <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                      <span className="text-sm font-semibold text-blue-700 dark:text-blue-300">
                        Ideal para:
                      </span>
                      <span className="text-sm text-blue-600 dark:text-blue-400">
                        {type.idealFor}
                      </span>
                    </div>
                  </div>

                  {/* Indicador de seleção */}
                  {isSelected && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="flex-shrink-0"
                    >
                      <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                        <CheckSquare className="w-5 h-5 text-white" />
                      </div>
                    </motion.div>
                  )}
                </div>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {selectedType && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex justify-center"
        >
          <Badge className="bg-green-100 text-green-700 px-4 py-2">
            ✓ Tipo selecionado! Continue preenchendo as informações básicas.
          </Badge>
        </motion.div>
      )}
    </div>
  );
};

export default ActivityTypeSelector;
