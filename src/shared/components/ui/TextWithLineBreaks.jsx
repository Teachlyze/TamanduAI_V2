import React from 'react';
import { cn } from '@/shared/utils/cn';

/**
 * Componente para exibir texto com quebra de linha e quebra de palavra
 * Garante que o texto não ultrapasse os limites do container
 */
const TextWithLineBreaks = ({
  text = '',
  className = '',
  preserveWhitespace = true,
  maxLines,
  ...props
}) => {
  if (!text) return null;

  // Se for um objeto, converte para string formatada
  const textToRender = typeof text === 'string' 
    ? text 
    : JSON.stringify(text, null, 2);

  // Estilos base para garantir quebra de linha e palavra
    const baseStyles = {
    whiteSpace: preserveWhitespace ? 'pre-wrap' : 'normal',
    wordWrap: 'break-word',
    overflowWrap: 'break-word',
    wordBreak: 'break-word',
    maxWidth: '100%',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    display: maxLines ? '-webkit-box' : 'block',
    WebkitBoxOrient: 'vertical',
    WebkitLineClamp: maxLines || 'unset',
    lineHeight: '1.5'
  };

  return (
    <div 
      className={cn('text-sm break-words', className)}
      style={baseStyles}
      {...props}
    >
      {textToRender}
    </div>
  );
};

export default TextWithLineBreaks;
