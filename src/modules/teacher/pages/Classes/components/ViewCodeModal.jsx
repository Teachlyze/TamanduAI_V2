import { logger } from '@/shared/utils/logger';
import React, { useEffect, useRef } from 'react';
import { X, Copy, Download, Share2 } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { toast } from '@/shared/components/ui/use-toast';
import QRCode from 'qrcode';

const ViewCodeModal = ({ isOpen, onClose, classData }) => {
  const qrCanvasRef = useRef(null);
  const inviteCode = classData?.invite_code;
  const inviteLink = `${window.location.origin}/join/${inviteCode}`;

  useEffect(() => {
    if (isOpen && qrCanvasRef.current && inviteCode) {
      QRCode.toCanvas(qrCanvasRef.current, inviteLink, {
        width: 256,
        margin: 2,
        color: {
          dark: '#1e40af',
          light: '#ffffff'
        }
      });
    }
  }, [isOpen, inviteLink, inviteCode]);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(inviteCode);
    toast({
      title: 'Código copiado!',
      description: 'O código foi copiado para a área de transferência.'
    });
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(inviteLink);
    toast({
      title: 'Link copiado!',
      description: 'O link foi copiado para a área de transferência.'
    });
  };

  const handleDownloadQR = () => {
    if (qrCanvasRef.current) {
      const url = qrCanvasRef.current.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `qr-code-${classData.name}.png`;
      link.href = url;
      link.click();
      
      toast({
        title: 'QR Code baixado!',
        description: 'O QR Code foi salvo em seu dispositivo.'
      });
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Convite para ${classData.name}`,
          text: `Use o código ${inviteCode} para entrar na turma ${classData.name}`,
          url: inviteLink
        });
      } catch (error) {
        if (error.name !== 'AbortError') {
          logger.error('Erro ao compartilhar:', error)
        }
      }
    } else {
      handleCopyLink();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl max-w-md w-full">
        <div className="bg-gradient-to-r from-blue-600 to-cyan-500 p-6 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-white">Código de Convite</h2>
            <button onClick={onClose} className="text-white hover:bg-white/20 p-2 rounded-lg">
              <X className="w-5 h-5" />
            </button>
          </div>
          <p className="text-cyan-100 text-sm mt-1">{classData.name}</p>
        </div>

        <div className="p-6 space-y-6">
          {/* Código */}
          <div className="text-center">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
              Código da Turma
            </label>
            <div className="bg-slate-100 dark:bg-slate-800 rounded-xl p-6">
              <div className="text-4xl font-bold text-blue-600 dark:text-blue-400 font-mono tracking-wider">
                {inviteCode}
              </div>
            </div>
            <Button onClick={handleCopyCode} variant="outline" className="mt-3" size="sm">
              <Copy className="w-4 h-4 mr-2" />
              Copiar Código
            </Button>
          </div>

          {/* QR Code */}
          <div className="text-center">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
              QR Code
            </label>
            <div className="flex justify-center">
              <div className="bg-white p-4 rounded-xl">
                <canvas ref={qrCanvasRef} />
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-2">
              Escaneie para acessar o link de convite
            </p>
          </div>

          {/* Link */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Link de Convite
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={inviteLink}
                readOnly
                className="flex-1 px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800"
              />
              <Button onClick={handleCopyLink} variant="outline" size="sm">
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Estatísticas */}
          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-200 dark:border-slate-800">
            <div className="text-center">
              <div className="text-2xl font-bold text-slate-900 dark:text-white">
                {classData.studentCount || 0}
              </div>
              <div className="text-xs text-slate-600 dark:text-slate-400">
                {classData.studentCount === 1 ? 'Aluno' : 'Alunos'}
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {classData.student_capacity || '∞'}
              </div>
              <div className="text-xs text-slate-600 dark:text-slate-400">
                Capacidade
              </div>
            </div>
          </div>

          {/* Ações */}
          <div className="flex gap-2">
            <Button onClick={handleDownloadQR} variant="outline" className="flex-1">
              <Download className="w-4 h-4 mr-2" />
              Baixar QR Code
            </Button>
            <Button onClick={handleShare} className="flex-1 bg-gradient-to-r from-blue-600 to-cyan-600">
              <Share2 className="w-4 h-4 mr-2" />
              Compartilhar
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ViewCodeModal;
