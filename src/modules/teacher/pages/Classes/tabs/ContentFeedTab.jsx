import React, { useState } from 'react';
import { Plus, FileText } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Card } from '@/shared/components/ui/card';
import CreatePostModal from '../components/CreatePostModal';

const ContentFeedTab = ({ classId }) => {
  const [showCreateModal, setShowCreateModal] = useState(false);

  const handlePostCreated = () => {
    // Recarregar posts
    setShowCreateModal(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Mural de Conteúdo</h2>
        <Button 
          className="bg-gradient-to-r from-blue-600 to-cyan-600"
          onClick={() => setShowCreateModal(true)}
        >
          <Plus className="w-4 h-4 mr-2" />
          Nova Postagem
        </Button>
      </div>

      <Card className="p-12 text-center">
        <FileText className="w-16 h-16 mx-auto mb-4 text-slate-400" />
        <h3 className="text-lg font-semibold mb-2">Nenhum conteúdo postado ainda</h3>
        <p className="text-slate-600 dark:text-slate-400 mb-4">
          Compartilhe materiais, vídeos e links com seus alunos
        </p>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Criar Primeira Postagem
        </Button>
      </Card>

      {/* Modal de Criação */}
      <CreatePostModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        classId={classId}
        onSuccess={handlePostCreated}
      />
    </div>
  );
};

export default ContentFeedTab;
