import React from 'react';
import { motion } from 'framer-motion';
import { Card } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { BookOpen, Users, Star, FileText } from 'lucide-react';

export const ClassCard = ({ classItem, onClick, index = 0 }) => {
  const gradients = {
    blue: 'from-blue-600 to-cyan-500',
    green: 'from-green-600 to-emerald-500',
    purple: 'from-purple-600 to-pink-500',
    orange: 'from-orange-600 to-amber-500',
    red: 'from-red-600 to-rose-500',
    yellow: 'from-yellow-600 to-orange-500',
    pink: 'from-pink-600 to-rose-500',
    indigo: 'from-indigo-600 to-purple-500',
    cyan: 'from-cyan-600 to-blue-500',
    teal: 'from-teal-600 to-green-500',
  };
  
  const gradient = gradients[classItem.color] || gradients.blue;
  
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.1, type: "spring" }}
      whileHover={{ scale: 1.05, y: -8 }}
      onClick={onClick}
      className="cursor-pointer"
    >
      <Card className="overflow-hidden border-2 border-slate-200 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-600 hover:shadow-2xl transition-all">
        {/* Header com Gradiente */}
        <div className={`h-28 sm:h-32 bg-gradient-to-br ${gradient} p-4 sm:p-6 text-white relative overflow-hidden`}>
          {/* Ícone de fundo decorativo */}
          <div className="absolute -right-8 -bottom-8 opacity-20">
            <BookOpen className="w-32 h-32" />
          </div>
          
          {/* Conteúdo do Header */}
          <div className="relative z-10">
            <Badge className="mb-2 bg-white/20 text-white border-white/30 backdrop-blur-sm">
              {classItem.subject || 'Matéria'}
            </Badge>
            <h3 className="text-lg sm:text-xl font-bold line-clamp-2">
              {classItem.name}
            </h3>
          </div>
        </div>
        
        {/* Corpo do Card */}
        <div className="p-4 sm:p-6 space-y-3 sm:space-y-4">
          {/* Professor */}
          <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
            <Users className="w-4 h-4" />
            <span className="truncate">{classItem.teacher_name || 'Professor'}</span>
          </div>
          
          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-2 sm:gap-4">
            {/* Pendentes */}
            <div className="text-center">
              <div className="text-xl sm:text-2xl font-bold text-blue-600 dark:text-blue-400">
                {classItem.pendingActivities || 0}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Pendentes
              </div>
            </div>
            
            {/* Média */}
            <div className="text-center">
              <div className="text-xl sm:text-2xl font-bold text-green-600 dark:text-green-400">
                {classItem.avgGrade !== null && classItem.avgGrade !== undefined 
                  ? classItem.avgGrade.toFixed(1) 
                  : '--'}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Média
              </div>
            </div>
            
            {/* Alunos */}
            <div className="text-center">
              <div className="text-xl sm:text-2xl font-bold text-orange-600 dark:text-orange-400">
                {classItem.studentsCount || 0}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Alunos
              </div>
            </div>
          </div>
          
          {/* Notificações de Novas Atividades */}
          {classItem.newActivities > 0 && (
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              <Badge className="w-full justify-center py-2 bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300 border-orange-300 dark:border-orange-700">
                🔔 {classItem.newActivities} nova{classItem.newActivities > 1 ? 's' : ''} atividade{classItem.newActivities > 1 ? 's' : ''}
              </Badge>
            </motion.div>
          )}
          
          {/* Próximo Prazo */}
          {classItem.nextDeadline && (
            <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <FileText className="w-3 h-3" />
              Próximo prazo: {classItem.nextDeadline}
            </div>
          )}
        </div>
      </Card>
    </motion.div>
  );
};
