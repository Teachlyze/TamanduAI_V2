import React from 'react';
import { X, AlertTriangle } from 'lucide-react';
import { Button } from './button';
import { Card } from './card';

/**
 * Dialog de confirmação customizado para substituir window.confirm()
 */
const ConfirmDialog = ({ isOpen, onClose, onConfirm, title, message, confirmText = 'Confirmar', cancelText = 'Cancelar', variant = 'danger' }) => {
  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Card className="w-full max-w-md bg-white dark:bg-slate-900 p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${
              variant === 'danger' 
                ? 'bg-red-100 dark:bg-red-900/20' 
                : 'bg-yellow-100 dark:bg-yellow-900/20'
            }`}>
              <AlertTriangle className={`w-6 h-6 ${
                variant === 'danger' 
                  ? 'text-red-600 dark:text-red-400' 
                  : 'text-yellow-600 dark:text-yellow-400'
              }`} />
            </div>
            <h2 className="text-xl font-bold">{title}</h2>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Message */}
        <p className="text-slate-600 dark:text-slate-400 mb-6">
          {message}
        </p>

        {/* Actions */}
        <div className="flex gap-3 justify-end">
          <Button 
            variant="outline" 
            onClick={onClose}
          >
            {cancelText}
          </Button>
          <Button 
            onClick={handleConfirm}
            className={
              variant === 'danger'
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : 'bg-yellow-600 hover:bg-yellow-700 text-white'
            }
          >
            {confirmText}
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default ConfirmDialog;
