// src/components/ui/AdvancedComponents.jsx
import React, { useEffect, useRef, useState } from 'react';
import { LoadingScreen } from '@/shared/components/ui/LoadingScreen';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar,
  Clock,
  Users,
  BookOpen,
  Award,
  TrendingUp,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Info,
  Star,
  Heart,
  MessageCircle,
  Share,
  Download,
  Upload,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Settings,
  Filter,
  SortAsc,
  SortDesc,
  Grid,
  List,
  Eye,
  EyeOff,
} from 'lucide-react';

/**
 * Componente de calendário interativo aprimorado
 */
export const [loading, setLoading] = useState(true);
  const InteractiveCalendar = ({
  events = [],
  selectedDate,
  onDateSelect,
  onEventClick,
  view = 'month',
  className = '',
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [calendarView, setCalendarView] = useState(view);

  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();

  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  const getEventsForDate = (date) => {
    return events.filter(event => {
      const eventDate = new Date(event.date);
      return eventDate.toDateString() === date.toDateString();
    });
  };

  const renderDay = (day, isCurrentMonth = true) => {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    const dayEvents = getEventsForDate(date);
    const isSelected = selectedDate?.toDateString() === date.toDateString();
    const isToday = new Date().toDateString() === date.toDateString();
  return (
      <motion.div
        key={day}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => onDateSelect?.(date)}
        className={`relative p-2 min-h-[80px] cursor-pointer transition-all duration-200 ${
          isCurrentMonth ? 'bg-base-100' : 'bg-base-200/50'
        } ${isSelected ? 'bg-primary/20 border-2 border-primary' : ''} ${
          isToday ? 'ring-2 ring-accent' : ''
        } hover:bg-base-200 rounded-lg`}
      >
        <div className={`text-sm font-medium mb-1 ${isToday ? 'text-accent font-bold' : ''}`}>
          {day}
        </div>

        {/* Indicadores de eventos */}
        <div className="space-y-1">
          {dayEvents.slice(0, 3).map((event, index) => (
            <div
              key={index}
              onClick={(e) => {
                e.stopPropagation();
                onEventClick?.(event);
              }}
              className={`text-xs px-1 py-0.5 rounded truncate ${
                event.type === 'meeting' ? 'bg-info/20 text-info' :
                event.type === 'assignment' ? 'bg-warning/20 text-warning' :
                'bg-success/20 text-success'
              }`}
            >
              {event.title}
            </div>
          ))}
          {dayEvents.length > 3 && (
            <div className="text-xs text-base-content/60">
              +{dayEvents.length - 3} mais
            </div>
          )}
        </div>
      </motion.div>
    );
  };
  return (
    <div className={`card bg-base-100 ${className}`}>
      {/* Header do calendário */}
      <div className="card-header">
        <div className="flex items-center justify-between">
          <h3 className="card-title">
            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
          </h3>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1))}
              className="btn btn-ghost btn-sm"
            >
              ←
            </button>
            <button
              onClick={() => setCurrentDate(new Date())}
              className="btn btn-ghost btn-sm"
            >
              Hoje
            </button>
            <button
              onClick={() => setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1))}
              className="btn btn-ghost btn-sm"
            >
              →
            </button>
          </div>
        </div>

        {/* Legenda de tipos de evento */}
        <div className="flex flex-wrap gap-4 mt-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-info rounded-full"></div>
            <span className="text-sm">Reuniões</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-warning rounded-full"></div>
            <span className="text-sm">Atividades</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-success rounded-full"></div>
            <span className="text-sm">Eventos</span>
          </div>
        </div>
      </div>

      <div className="card-body p-0">
        {/* Dias da semana */}
        <div className="grid grid-cols-7 gap-0 border-b border-base-200">
          {dayNames.map(day => (
            <div key={day} className="p-3 text-center text-sm font-medium text-base-content/70 border-r border-base-200 last:border-r-0">
              {day}
            </div>
          ))}
        </div>

        {/* Grid do calendário */}
        <div className="grid grid-cols-7 gap-0">
          {/* Dias vazios do mês anterior */}
          {Array.from({ length: firstDayOfMonth }).map((_, index) => (
            <div key={`empty-${index}`} className="p-2 min-h-[80px] bg-base-200/30"></div>
          ))}

          {/* Dias do mês atual */}
          {Array.from({ length: daysInMonth }).map((_, index) => renderDay(index + 1, true))}

          {/* Dias vazios do próximo mês */}
          {Array.from({ length: (7 - ((firstDayOfMonth + daysInMonth) % 7)) % 7 }).map((_, index) => (
            <div key={`next-empty-${index}`} className="p-2 min-h-[80px] bg-base-200/30"></div>
          ))}
        </div>
      </div>
    </div>
  );
};

/**
 * Componente de lista de atividades com funcionalidades avançadas
 */
export const ActivityList = ({
  activities = [],
  onActivityClick,
  onStatusChange,
  viewMode = 'list',
  showFilters = true,
  className = '',
}) => {
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortBy, setSortBy] = useState('date');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredActivities = activities.filter(activity => {
    const matchesStatus = filterStatus === 'all' || activity.status === filterStatus;
    const matchesSearch = activity.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         activity.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const sortedActivities = [...filteredActivities].sort((a, b) => {
    switch (sortBy) {
      case 'date':
        return new Date(b.dueDate) - new Date(a.dueDate);
      case 'title':
        return a.title.localeCompare(b.title);
      case 'status':
        return a.status.localeCompare(b.status);
      default:
        return 0;
    }
  });

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed': return CheckCircle;
      case 'overdue': return AlertTriangle;
      case 'in_progress': return Clock;
      default: return BookOpen;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'success';
      case 'overdue': return 'error';
      case 'in_progress': return 'warning';
      default: return 'info';
    }
  };
  return (
    <div className={`space-y-4 ${className}`}>
      {/* Filtros e controles */}
      {showFilters && (
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex flex-col sm:flex-row gap-2 flex-1">
            <input
              type="text"
              placeholder="Buscar atividades..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input input-bordered input-sm"
            />

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="select select-bordered select-sm"
            >
              <option value="all">Todas</option>
              <option value="pending">Pendentes</option>
              <option value="in_progress">Em andamento</option>
              <option value="completed">Concluídas</option>
              <option value="overdue">Atrasadas</option>
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="select select-bordered select-sm"
            >
              <option value="date">Por data</option>
              <option value="title">Por título</option>
              <option value="status">Por status</option>
            </select>
          </div>

          <div className="flex gap-2">
            <button className={`btn btn-sm ${viewMode === 'list' ? 'btn-primary' : 'btn-ghost'}`}>
              <List className="h-4 w-4" />
            </button>
            <button className={`btn btn-sm ${viewMode === 'grid' ? 'btn-primary' : 'btn-ghost'}`}>
              <Grid className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Lista de atividades */}
      <div className={`space-y-3 ${viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' : ''}`}>
        <AnimatePresence>
          {sortedActivities.map((activity) => {
            const StatusIcon = getStatusIcon(activity.status);
            const statusColor = getStatusColor(activity.status);
            const displayPoints = (activity?.points ?? activity?.total_points ?? null);
  return (
              <motion.div
                key={activity.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                whileHover={{ scale: 1.02 }}
                onClick={() => onActivityClick?.(activity)}
                className={`card bg-base-100 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer ${
                  viewMode === 'grid' ? 'p-4' : 'p-6'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg bg-${statusColor}/20`}>
                    <StatusIcon className={`h-5 w-5 text-${statusColor}`} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-base-content truncate">
                      {activity.title}
                    </h3>
                    <p className="text-sm text-base-content/70 mt-1 line-clamp-2">
                      {activity.description}
                    </p>

                    <div className="flex items-center gap-4 mt-3 text-xs text-base-content/60">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(activity.dueDate).toLocaleDateString()}
                      </div>

                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {activity.estimatedTime || 'N/A'}
                      </div>

                      {displayPoints && (
                        <div className="flex items-center gap-1">
                          <Award className="h-3 w-3" />
                          {displayPoints} pts
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    <span className={`badge badge-${statusColor} badge-sm`}>
                      {activity.status === 'completed' ? 'Concluída' :
                       activity.status === 'overdue' ? 'Atrasada' :
                       activity.status === 'in_progress' ? 'Em andamento' : 'Pendente'}
                    </span>

                    {activity.grade !== undefined && activity.grade !== null && (
                      <div className="text-right">
                        <div className="text-sm font-medium">{activity.grade}/{displayPoints || 100}</div>
                        <div className="text-xs text-base-content/60">Nota</div>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {sortedActivities.length === 0 && (
        <div className="text-center py-12">
          <BookOpen className="h-12 w-12 mx-auto mb-4 text-base-content/30" />
          <h3 className="text-lg font-medium mb-2">Nenhuma atividade encontrada</h3>
          <p className="text-base-content/60">
            {searchTerm ? 'Tente ajustar os filtros de busca' : 'Ainda não há atividades para exibir'}
          </p>
        </div>
      )}
    </div>
  );
};

/**
 * Componente de perfil de usuário aprimorado
 */
export const UserProfileCard = ({
  user,
  onEdit,
  onMessage,
  onFollow,
  showStats = true,
  compact = false,
  className = '',
}) => {
  const [isFollowing, setIsFollowing] = useState(user.isFollowing || false);
  const [showFullBio, setShowFullBio] = useState(false);

  const handleFollow = () => {
    setIsFollowing(!isFollowing);
    onFollow?.(!isFollowing);
  };
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`card bg-base-100 ${compact ? 'p-4' : 'p-6'} ${className}`}
    >
      <div className="flex items-start gap-4">
        {/* Avatar */}
        <div className="avatar">
          <div className={`w-${compact ? '12' : '16'} h-${compact ? '12' : '16'} rounded-full bg-primary flex items-center justify-center`}>
            <span className="text-primary-content font-bold text-lg">
              {user.name?.charAt(0).toUpperCase()}
            </span>
          </div>
          {user.isOnline && (
            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-success rounded-full border-2 border-base-100"></div>
          )}
        </div>

        {/* Informações principais */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div>
              <h3 className={`font-bold ${compact ? 'text-base' : 'text-lg'} text-base-content`}>
                {user.name}
              </h3>
              <p className={`text-base-content/70 ${compact ? 'text-sm' : ''}`}>
                @{user.username}
              </p>
            </div>

            <div className="flex items-center gap-2">
              {user.role && (
                <span className={`badge badge-${user.role === 'teacher' ? 'primary' : 'secondary'} badge-sm`}>
                  {user.role === 'teacher' ? 'Professor' : 'Aluno'}
                </span>
              )}

              {user.verified && (
                <CheckCircle className="h-5 w-5 text-success" />
              )}
            </div>
          </div>

          {/* Bio */}
          {user.bio && (
            <div className="mt-3">
              <p className={`text-base-content/80 ${compact ? 'text-sm' : ''} ${!showFullBio && user.bio.length > 100 ? 'line-clamp-2' : ''}`}>
                {user.bio}
              </p>
              {user.bio.length > 100 && (
                <button
                  onClick={() => setShowFullBio(!showFullBio)}
                  className="text-primary text-sm mt-1 hover:underline"
                >
                  {showFullBio ? 'Ver menos' : 'Ver mais'}
                </button>
              )}
            </div>
          )}

          {/* Estatísticas */}
          {showStats && (
            <div className="flex items-center gap-4 mt-4 text-sm text-base-content/70">
              <div className="flex items-center gap-1">
                <Users className="h-4 w-4" />
                <span>{user.followers || 0} seguidores</span>
              </div>
              <div className="flex items-center gap-1">
                <BookOpen className="h-4 w-4" />
                <span>{user.activities || 0} atividades</span>
              </div>
              <div className="flex items-center gap-1">
                <Award className="h-4 w-4" />
                <span>{user.points || 0} pontos</span>
              </div>
            </div>
          )}

          {/* Membro desde */}
          {user.memberSince && (
            <div className="mt-2 text-xs text-base-content/60">
              Membro desde {new Date(user.memberSince).toLocaleDateString()}
            </div>
          )}
        </div>
      </div>

      {/* Ações */}
      <div className="flex gap-2 mt-4">
        {onEdit && (
          <button onClick={onEdit} className="btn btn-outline btn-sm flex-1">
            <Settings className="h-4 w-4 mr-2" />
            Editar
          </button>
        )}

        {onMessage && (
          <button onClick={onMessage} className="btn btn-outline btn-sm flex-1">
            <MessageCircle className="h-4 w-4 mr-2" />
            Mensagem
          </button>
        )}

        {onFollow && (
          <button
            onClick={handleFollow}
            className={`btn btn-sm flex-1 ${isFollowing ? 'btn-ghost' : 'btn-primary'}`}
          >
            {isFollowing ? (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Seguindo
              </>
            ) : (
              <>
                <Users className="h-4 w-4 mr-2" />
                Seguir
              </>
            )}
          </button>
        )}
      </div>
    </motion.div>
  );
};

/**
 * Componente de chat/message aprimorado
 */
export const MessageBubble = ({
  message,
  isOwn = false,
  showAvatar = true,
  showTime = true,
  showStatus = false,
  className = '',
}) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);
  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className={`flex gap-3 ${isOwn ? 'flex-row-reverse' : 'flex-row'} ${className}`}
    >
      {/* Avatar */}
      {showAvatar && (
        <div className="avatar">
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
            <span className="text-primary-content text-sm font-bold">
              {message.sender?.charAt(0).toUpperCase()}
            </span>
          </div>
        </div>
      )}

      {/* Mensagem */}
      <div className={`flex flex-col max-w-[70%] ${isOwn ? 'items-end' : 'items-start'}`}>
        <div
          className={`px-4 py-2 rounded-2xl ${
            isOwn
              ? 'bg-primary text-primary-content'
              : 'bg-base-200 text-base-content'
          }`}
        >
          {message.text}
        </div>

        {/* Metadata */}
        <div className={`flex items-center gap-2 mt-1 text-xs text-base-content/60`}>
          {showTime && (
            <span>
              {new Date(message.timestamp).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit'
              })}
            </span>
          )}

          {showStatus && (
            <span className={isOwn ? 'text-primary/70' : ''}>
              {message.status === 'sent' && '✓'}
              {message.status === 'delivered' && '✓✓'}
              {message.status === 'read' && '✓✓'}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
};

/**
 * Componente de reprodutor de mídia aprimorado
 */
export const MediaPlayer = ({
  src,
  type = 'audio',
  title,
  thumbnail,
  autoplay = false,
  controls = true,
  className = '',
}) => {
  const [isPlaying, setIsPlaying] = useState(autoplay);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);

  const audioRef = React.useRef(null);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
      audioRef.current.muted = isMuted;
    }
  }, [volume, isMuted]);

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
      setDuration(audioRef.current.duration || 0);
    }
  };

  const handleSeek = (e) => {
    if (audioRef.current) {
      const newTime = (e.target.value / 100) * duration;
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const formatTime = (time) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };
  return (
    <div className={`card bg-base-100 ${className}`}>
      {/* Thumbnail/Capa */}
      {thumbnail && (
        <div className="relative">
          <img src={thumbnail} alt={title} className="w-full h-48 object-cover rounded-t-xl" />
          {type === 'video' && (
            <div className="absolute inset-0 flex items-center justify-center">
              <button
                onClick={togglePlay}
                className="btn btn-circle btn-primary btn-lg"
              >
                {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6" />}
              </button>
            </div>
          )}
        </div>
      )}

      <div className="card-body">
        {title && (
          <h3 className="card-title text-base-content">{title}</h3>
        )}

        {/* Player de áudio */}
        {type === 'audio' && (
          <audio
            ref={audioRef}
            src={src}
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleTimeUpdate}
            onEnded={() => setIsPlaying(false)}
            className="hidden"
          />
        )}

        {/* Controles */}
        {controls && (
          <div className="space-y-4">
            {/* Barra de progresso */}
            <div className="space-y-2">
              <div className="w-full bg-base-200 rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full transition-all duration-200"
                  style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
                />
              </div>

              <div className="flex justify-between text-sm text-base-content/70">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            {/* Controles principais */}
            <div className="flex items-center justify-center gap-4">
              <button className="btn btn-ghost btn-sm">
                <SkipBack className="h-5 w-5" />
              </button>

              <button
                onClick={togglePlay}
                className="btn btn-primary btn-circle"
              >
                {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6" />}
              </button>

              <button className="btn btn-ghost btn-sm">
                <SkipForward className="h-5 w-5" />
              </button>
            </div>

            {/* Controle de volume */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsMuted(!isMuted)}
                className="btn btn-ghost btn-sm"
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="h-4 w-4" />
                ) : (
                  <Volume2 className="h-4 w-4" />
                )}
              </button>

              <div className="flex-1">
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={isMuted ? 0 : volume}
                  onChange={(e) => setVolume(parseFloat(e.target.value))}
                  className="range range-primary range-sm"
                />
              </div>

              <span className="text-sm text-base-content/70 w-12">
                {Math.round((isMuted ? 0 : volume) * 100)}%
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Componente de galeria de imagens aprimorado
 */
export const ImageGallery = ({
  images = [],
  onImageClick,
  columns = 3,
  gap = 'gap-4',
  className = '',
}) => {
  const [selectedIndex, setSelectedIndex] = useState(null);

  const gridCols = {
    1: 'grid-cols-1',
    2: 'grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
  };
  return (
    <>
      <div className={`grid ${gridCols[columns]} ${gap} ${className}`}>
        {images.map((image, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.1 }}
            whileHover={{ scale: 1.05 }}
            className="relative group cursor-pointer"
            onClick={() => {
              setSelectedIndex(index);
              onImageClick?.(image, index);
            }}
          >
            <img
              src={image.thumbnail || image.src}
              alt={image.alt || `Imagem ${index + 1}`}
              className="w-full h-48 object-cover rounded-lg transition-transform duration-200 group-hover:shadow-lg"
            />

            {/* Overlay com informações */}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-200 rounded-lg flex items-end">
              <div className="p-3 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <p className="text-sm font-medium">{image.title}</p>
                {image.description && (
                  <p className="text-xs opacity-90">{image.description}</p>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Modal de imagem ampliada */}
      <AnimatePresence>
        {selectedIndex !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedIndex(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative max-w-4xl max-h-full"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={images[selectedIndex]?.src}
                alt={images[selectedIndex]?.alt}
                className="max-w-full max-h-full object-contain rounded-lg"
              />

              {/* Controles do modal */}
              <div className="absolute top-4 right-4 flex gap-2">
                <button
                  onClick={() => setSelectedIndex(null)}
                  className="btn btn-circle btn-ghost btn-sm bg-black/50 text-white hover:bg-black/70"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Navegação entre imagens */}
              {images.length > 1 && (
                <>
                  <button
                    onClick={() => setSelectedIndex((prev) => (prev - 1 + images.length) % images.length)}
                    className="absolute left-4 top-1/2 transform -translate-y-1/2 btn btn-circle btn-ghost btn-sm bg-black/50 text-white hover:bg-black/70"
                  >
                    ←
                  </button>
                  <button
                    onClick={() => setSelectedIndex((prev) => (prev + 1) % images.length)}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 btn btn-circle btn-ghost btn-sm bg-black/50 text-white hover:bg-black/70"
                  >
                    →
                  </button>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

/**
 * Componente de leaderboard/gamificação
 */
export const Leaderboard = ({
  users = [],
  currentUserId,
  metric = 'points',
  period = 'month',
  showAvatars = true,
  className = '',
}) => {
  const getRankIcon = (rank) => {
    switch (rank) {
      case 1: return <Award className="h-5 w-5 text-yellow-500" />;
      case 2: return <Award className="h-5 w-5 text-gray-400" />;
      case 3: return <Award className="h-5 w-5 text-amber-600" />;
      default: return <span className="text-base-content/60 font-bold">#{rank}</span>;
    }
  };

  const getRankBg = (rank) => {
    switch (rank) {
      case 1: return 'bg-gradient-to-r from-yellow-50 to-yellow-100 border-yellow-200';
      case 2: return 'bg-gradient-to-r from-gray-50 to-gray-100 border-gray-200';
      case 3: return 'bg-gradient-to-r from-amber-50 to-amber-100 border-amber-200';
      default: return 'bg-base-100';
    }
  };
  return (
    <div className={`card bg-base-100 ${className}`}>
      <div className="card-header">
        <div className="flex items-center justify-between">
          <h3 className="card-title">Leaderboard</h3>
          <select value={period} className="select select-bordered select-sm">
            <option value="week">Esta semana</option>
            <option value="month">Este mês</option>
            <option value="year">Este ano</option>
            <option value="all">Todo o tempo</option>
          </select>
        </div>
      </div>

      <div className="card-body p-0">
        <div className="divide-y divide-base-200">
          {users.map((user, index) => {
            const rank = index + 1;
            const isCurrentUser = user.id === currentUserId;
  return (
              <motion.div
                key={user.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`flex items-center gap-4 p-4 hover:bg-base-200 transition-colors ${
                  isCurrentUser ? 'bg-primary/5 border-l-4 border-primary' : ''
                } ${getRankBg(rank)}`}
              >
                {/* Rank */}
                <div className="flex items-center justify-center w-8">
                  {getRankIcon(rank)}
                </div>

                {/* Avatar */}
                {showAvatars && (
                  <div className="avatar">
                    <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
                      <span className="text-primary-content font-bold">
                        {user.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  </div>
                )}

                {/* Informações do usuário */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium text-base-content truncate">
                      {user.name}
                    </h4>
                    {isCurrentUser && (
                      <span className="badge badge-primary badge-xs">Você</span>
                    )}
                  </div>

                  <div className="flex items-center gap-4 text-sm text-base-content/70">
                    <span>{user.level || 1}º nível</span>
                    <span>{user.streak || 0} dias seguidos</span>
                  </div>
                </div>

                {/* Métrica */}
                <div className="text-right">
                  <div className="text-lg font-bold text-base-content">
                    {user[metric]?.toLocaleString()}
                  </div>
                  <div className="text-xs text-base-content/60 capitalize">
                    {metric === 'points' ? 'pontos' : metric}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

/**
 * Componente de feed de atividades sociais
 */
export const ActivityFeed = ({
  activities = [],
  onLike,
  onComment,
  onShare,
  className = '',
}) => {
  return (
    <div className={`space-y-4 ${className}`}>
      {activities.map((activity) => (
        <motion.div
          key={activity.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="card bg-base-100"
        >
          <div className="card-body">
            {/* Header da atividade */}
            <div className="flex items-start gap-3">
              <div className="avatar">
                <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
                  <span className="text-primary-content font-bold">
                    {activity.user.name.charAt(0).toUpperCase()}
                  </span>
                </div>
              </div>

              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-base-content">
                    {activity.user.name}
                  </span>
                  <span className="text-base-content/60">•</span>
                  <span className="text-sm text-base-content/60">
                    {new Date(activity.timestamp).toLocaleDateString()}
                  </span>
                </div>

                <p className="text-base-content/80 mt-1">
                  {activity.content}
                </p>
              </div>
            </div>

            {/* Conteúdo da atividade (imagem, etc.) */}
            {activity.media && (
              <div className="mt-4">
                <img
                  src={activity.media}
                  alt="Activity media"
                  className="w-full max-h-96 object-cover rounded-lg"
                />
              </div>
            )}

            {/* Ações da atividade */}
            <div className="flex items-center gap-4 mt-4 pt-4 border-t border-base-200">
              <button
                onClick={() => onLike?.(activity.id)}
                className={`flex items-center gap-2 text-base-content/70 hover:text-error transition-colors ${
                  activity.isLiked ? 'text-error' : ''
                }`}
              >
                <Heart className={`h-4 w-4 ${activity.isLiked ? 'fill-current' : ''}`} />
                <span className="text-sm">{activity.likes || 0}</span>
              </button>

              <button
                onClick={() => onComment?.(activity.id)}
                className="flex items-center gap-2 text-base-content/70 hover:text-primary transition-colors"
              >
                <MessageCircle className="h-4 w-4" />
                <span className="text-sm">{activity.comments || 0}</span>
              </button>

              <button
                onClick={() => onShare?.(activity.id)}
                className="flex items-center gap-2 text-base-content/70 hover:text-accent transition-colors"
              >
                <Share className="h-4 w-4" />
                <span className="text-sm">Compartilhar</span>
              </button>
            </div>
          </div>
        </motion.div>
      ))}

      {activities.length === 0 && (
        <div className="text-center py-12">
          <div className="text-base-content/30 mb-4">
            <MessageCircle className="h-12 w-12 mx-auto" />
          </div>
          <h3 className="text-lg font-medium mb-2">Nenhuma atividade ainda</h3>
          <p className="text-base-content/60">
            As atividades dos usuários aparecerão aqui
          </p>
        </div>
      )}
    </div>
  );
};
