import React from 'react';
import { motion } from 'framer-motion';
import { PremiumButton } from './PremiumButton';
import { 
  Inbox, 
  Search, 
  FolderOpen, 
  FileQuestion,
  AlertCircle,
  Users,
  BookOpen
} from 'lucide-react';

/**
 * Premium Empty State Component - Beautiful empty states
 */
export const EmptyState = ({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  variant = 'default' // 'default' | 'search' | 'error'
}) => {
  const icons = {
    inbox: Inbox,
    search: Search,
    folder: FolderOpen,
    question: FileQuestion,
    error: AlertCircle,
    users: Users,
    book: BookOpen
  };

  const DisplayIcon = Icon || icons.inbox;

  const variants = {
    default: {
      iconColor: 'text-muted-foreground',
      iconBg: 'bg-muted'
    },
    search: {
      iconColor: 'text-blue-500',
      iconBg: 'bg-blue-500/10'
    },
    error: {
      iconColor: 'text-destructive',
      iconBg: 'bg-destructive/10'
    }
  };

  const style = variants[variant];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="flex flex-col items-center justify-center py-16 px-4 text-center"
    >
      {/* Animated Icon */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ 
          type: "spring",
          stiffness: 260,
          damping: 20,
          delay: 0.1
        }}
        className={`w-24 h-24 rounded-full ${style.iconBg} flex items-center justify-center mb-6`}
      >
        <DisplayIcon className={`w-12 h-12 ${style.iconColor}`} />
      </motion.div>

      {/* Title */}
      <motion.h3
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="text-2xl font-bold text-foreground mb-3"
      >
        {title}
      </motion.h3>

      {/* Description */}
      {description && (
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-muted-foreground max-w-md mb-8 leading-relaxed"
        >
          {description}
        </motion.p>
      )}

      {/* Actions */}
      {(actionLabel || secondaryActionLabel) && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="flex flex-col sm:flex-row gap-3"
        >
          {actionLabel && (
            <PremiumButton
              variant="gradient"
              size="lg"
              onClick={onAction}
            >
              {actionLabel}
            </PremiumButton>
          )}
          {secondaryActionLabel && (
            <PremiumButton
              variant="outline"
              size="lg"
              onClick={onSecondaryAction}
            >
              {secondaryActionLabel}
            </PremiumButton>
          )}
        </motion.div>
      )}
    </motion.div>
  );
};

/**
 * Specific Empty States
 */
export const NoDataEmpty = ({ onAction }) => (
  <EmptyState
    icon={Inbox}
    title="Nenhum dado encontrado"
    description="Não há nada aqui ainda. Comece criando seu primeiro item!"
    actionLabel="Criar Novo"
    onAction={onAction}
  />
);

export const NoSearchResults = ({ query, onClear }) => (
  <EmptyState
    icon={Search}
    variant="search"
    title="Nenhum resultado encontrado"
    description={`Não encontramos nada para "${query}". Tente buscar com outros termos.`}
    actionLabel="Limpar Busca"
    onAction={onClear}
  />
);

export const NoClasses = ({ onCreate }) => (
  <EmptyState
    icon={BookOpen}
    title="Nenhuma turma criada"
    description="Crie sua primeira turma para começar a gerenciar alunos e atividades!"
    actionLabel="Criar Turma"
    onAction={onCreate}
  />
);

export const NoStudents = ({ onInvite }) => (
  <EmptyState
    icon={Users}
    title="Nenhum aluno cadastrado"
    description="Convide alunos para sua turma e comece a acompanhar o progresso deles."
    actionLabel="Convidar Alunos"
    onAction={onInvite}
  />
);

export const ErrorState = ({ onRetry, message }) => (
  <EmptyState
    icon={AlertCircle}
    variant="error"
    title="Algo deu errado"
    description={message || "Não foi possível carregar os dados. Por favor, tente novamente."}
    actionLabel="Tentar Novamente"
    onAction={onRetry}
  />
);

export default EmptyState;
