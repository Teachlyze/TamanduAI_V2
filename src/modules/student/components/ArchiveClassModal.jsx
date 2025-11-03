/**
 * ArchiveClassModal - Modal de confirmação para arquivar turma
 */

import React from 'react';
import { Archive, X } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';

const ArchiveClassModal = ({ isOpen, onClose, onConfirm, className, loading = false }) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 bg-amber-100 dark:bg-amber-900/30 rounded-full">
              <Archive className="w-6 h-6 text-amber-600 dark:text-amber-400" />
            </div>
            <DialogTitle className="text-xl">Arquivar Turma</DialogTitle>
          </div>
          <DialogDescription className="text-base pt-2">
            Tem certeza que deseja arquivar esta turma? 
            <br /><br />
            Você ainda poderá acessá-la na seção <strong>"Turmas Arquivadas"</strong> quando precisar.
            Nenhum dado será perdido.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={loading}
          >
            <X className="w-4 h-4 mr-2" />
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="bg-amber-600 hover:bg-amber-700 text-white"
          >
            <Archive className="w-4 h-4 mr-2" />
            {loading ? 'Arquivando...' : 'Arquivar Turma'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ArchiveClassModal;
