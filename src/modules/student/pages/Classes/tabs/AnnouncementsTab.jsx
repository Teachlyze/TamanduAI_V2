import React from 'react';
import { motion } from 'framer-motion';
import { Megaphone, AlertCircle, Info, AlertTriangle, Clock } from 'lucide-react';
import { Card } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const urgencyConfig = {
  critical: {
    icon: AlertCircle,
    label: 'Urgente',
    color: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
    borderColor: 'border-l-red-500'
  },
  warning: {
    icon: AlertTriangle,
    label: 'Atenção',
    color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
    borderColor: 'border-l-orange-500'
  },
  info: {
    icon: Info,
    label: 'Informativo',
    color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
    borderColor: 'border-l-blue-500'
  }
};

const AnnouncementsTab = ({ announcements, loading }) => {
  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2].map(i => (
          <Card key={i} className="p-6 animate-pulse">
            <div className="space-y-3">
              <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-3/4" />
              <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-full" />
              <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-5/6" />
            </div>
          </Card>
        ))}
      </div>
    );
  }

  if (!announcements || announcements.length === 0) {
    return (
      <Card className="p-12 text-center">
        <Megaphone className="w-16 h-16 mx-auto mb-4 text-slate-300 dark:text-slate-600" />
        <h3 className="text-xl font-semibold mb-2">Nenhum comunicado</h3>
        <p className="text-slate-600 dark:text-slate-400">
          Comunicados importantes aparecerão aqui
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {announcements.map((announcement, index) => {
        const urgency = announcement.tags?.[0] || 'info';
        const config = urgencyConfig[urgency] || urgencyConfig.info;
        const Icon = config.icon;

        return (
          <motion.div
            key={announcement.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <Card className={`p-6 border-l-4 ${config.borderColor} hover:shadow-lg transition-shadow`}>
              <div className="flex items-start gap-4">
                {/* Ícone */}
                <div className={`p-3 rounded-xl ${config.color} flex-shrink-0`}>
                  <Icon className="w-6 h-6" />
                </div>

                {/* Conteúdo */}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                      {announcement.title}
                    </h3>
                    <Badge className={config.color}>{config.label}</Badge>
                  </div>

                  <p className="text-slate-700 dark:text-slate-300 mb-3 whitespace-pre-wrap">
                    {announcement.description}
                  </p>

                  <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {format(new Date(announcement.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </span>
                    {announcement.creator && (
                      <span>Por {announcement.creator.full_name}</span>
                    )}
                  </div>

                  {/* Arquivo anexo */}
                  {announcement.file_url && (
                    <a
                      href={announcement.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-3 inline-flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      📎 Ver anexo
                    </a>
                  )}
                </div>
              </div>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
};

export default AnnouncementsTab;
