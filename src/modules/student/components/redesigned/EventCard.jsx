import React from 'react';
import { motion } from 'framer-motion';
import { Card } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { Clock, Video, MapPin, Calendar, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const EventCard = ({ event, onClick, index = 0 }) => {
  const isMeeting = event.type === 'meeting' || event.type === 'reunião';
  const isActivity = event.type === 'activity' || event.type === 'atividade';
  const isOnline = event.modality === 'online';
  const isPresential = event.modality === 'presential';
  
  const EventIcon = isMeeting ? Video : isActivity ? FileText : Calendar;
  
  const eventColors = {
    meeting: {
      bg: 'bg-purple-100 dark:bg-purple-900/30',
      text: 'text-purple-600 dark:text-purple-400',
      badge: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
      border: 'border-purple-200 dark:border-purple-800'
    },
    activity: {
      bg: 'bg-orange-100 dark:bg-orange-900/30',
      text: 'text-orange-600 dark:text-orange-400',
      badge: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
      border: 'border-orange-200 dark:border-orange-800'
    },
    event: {
      bg: 'bg-blue-100 dark:bg-blue-900/30',
      text: 'text-blue-600 dark:text-blue-400',
      badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
      border: 'border-blue-200 dark:border-blue-800'
    }
  };
  
  const colors = isMeeting ? eventColors.meeting : isActivity ? eventColors.activity : eventColors.event;
  
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      whileHover={{ scale: 1.02, x: 5 }}
      onClick={onClick}
      className="cursor-pointer"
    >
      <Card className={`p-4 border-2 hover:shadow-lg transition-all ${colors.border} hover:border-opacity-100`}>
        <div className="flex items-start gap-3">
          {/* Ícone */}
          <div className={`p-2 rounded-lg ${colors.bg} flex-shrink-0`}>
            <EventIcon className={`w-5 h-5 ${colors.text}`} />
          </div>
          
          <div className="flex-1 min-w-0">
            {/* Header */}
            <div className="flex items-start justify-between gap-2 mb-2">
              <h4 className="font-semibold text-slate-900 dark:text-white line-clamp-1">
                {event.title}
              </h4>
              <Badge className={`${colors.badge} whitespace-nowrap flex-shrink-0`}>
                {isMeeting ? '📹' : isActivity ? '📝' : '📅'}
              </Badge>
            </div>
            
            {/* Info */}
            <div className="flex items-center gap-3 flex-wrap text-sm text-slate-600 dark:text-slate-400">
              {/* Horário */}
              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {format(new Date(event.start_time), 'HH:mm', { locale: ptBR })}
              </span>
              
              {/* Link de reunião online */}
              {isMeeting && isOnline && event.meeting_link && (
                <a
                  href={event.meeting_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className={`flex items-center gap-1 ${colors.text} hover:underline font-medium`}
                >
                  <Video className="w-4 h-4" />
                  Entrar
                </a>
              )}
              
              {/* Local de reunião presencial */}
              {isMeeting && isPresential && event.location && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  {event.location}
                </span>
              )}
            </div>
            
            {/* Turma */}
            {event.class_name && (
              <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">
                {event.class_name}
              </p>
            )}
            
            {/* Descrição */}
            {event.description && (
              <p className="text-xs text-slate-500 dark:text-slate-500 mt-1 line-clamp-1">
                {event.description}
              </p>
            )}
          </div>
        </div>
      </Card>
    </motion.div>
  );
};
