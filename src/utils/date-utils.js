import { format, formatDistanceToNow, isToday, isYesterday, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function formatDate(date, pattern = 'PP') {
  return format(new Date(date), pattern, { locale: ptBR });
}

export function formatRelativeTime(date) {
  const parsed = typeof date === 'string' ? parseISO(date) : new Date(date);

  if (isToday(parsed)) return `Hoje às ${format(parsed, 'HH:mm')}`;
  if (isYesterday(parsed)) return `Ontem às ${format(parsed, 'HH:mm')}`;

  return formatDistanceToNow(parsed, { addSuffix: true, locale: ptBR });
}
