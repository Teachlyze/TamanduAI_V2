import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * CopyButton - Botão para copiar texto
 * 
 * @param {string} text - Texto a ser copiado
 * @param {string} label - Label do botão
 * @param {string} successMessage - Mensagem de sucesso
 * @param {string} variant - Variante do botão
 * @param {string} size - Tamanho do botão
 * @param {function} onCopy - Callback após copiar
 */
const CopyButton = ({
  text,
  label = 'Copiar',
  successMessage = 'Copiado!',
  variant = 'outline',
  size = 'sm',
  onCopy
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      
      if (onCopy) {
        onCopy(text);
      }

      // Reset após 2 segundos
      setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch (error) {
      console.error('Erro ao copiar:', error);
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleCopy}
      className={`whitespace-nowrap inline-flex items-center gap-2 ${
        copied
          ? 'bg-green-50 dark:bg-green-950/30 border-green-300 dark:border-green-700 text-green-700 dark:text-green-300'
          : ''
      }`}
    >
      <AnimatePresence mode="wait">
        {copied ? (
          <motion.div
            key="check"
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 0, rotate: 180 }}
            transition={{ duration: 0.2 }}
            className="inline-flex items-center gap-2"
          >
            <Check className="w-4 h-4" />
            {successMessage}
          </motion.div>
        ) : (
          <motion.div
            key="copy"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            transition={{ duration: 0.2 }}
            className="inline-flex items-center gap-2"
          >
            <Copy className="w-4 h-4" />
            {label}
          </motion.div>
        )}
      </AnimatePresence>
    </Button>
  );
};

export default CopyButton;
