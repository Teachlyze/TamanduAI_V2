/**
 * Success Dialog Component
 * Modal de sucesso que só fecha ao clicar no botão OK
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, X } from 'lucide-react';
import { Button } from './button';

const SuccessDialog = ({ isOpen, onClose, title, message }) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        />

        {/* Dialog */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: 'spring', duration: 0.3 }}
          className="relative z-50 w-full max-w-md mx-4"
        >
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-6 text-white">
              <div className="flex items-center gap-3">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                >
                  <CheckCircle className="w-12 h-12" />
                </motion.div>
                <div>
                  <h2 className="text-2xl font-bold">{title}</h2>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-6">
              <p className="text-slate-700 dark:text-slate-300 text-lg leading-relaxed">
                {message}
              </p>
            </div>

            {/* Actions */}
            <div className="p-6 pt-0 flex justify-end">
              <Button
                onClick={onClose}
                className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white px-8"
              >
                OK, Entendi!
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default SuccessDialog;
