import React from 'react';
import { BookOpen, Plus, Folder, FileText } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Card } from '@/shared/components/ui/card';

const LibraryTab = ({ classId }) => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Biblioteca de Materiais</h2>
        <div className="flex gap-2">
          <Button variant="outline">
            <Folder className="w-4 h-4 mr-2" />
            Novo Módulo
          </Button>
          <Button className="bg-gradient-to-r from-blue-600 to-cyan-600">
            <Plus className="w-4 h-4 mr-2" />
            Adicionar Material
          </Button>
        </div>
      </div>

      <Card className="p-12 text-center">
        <BookOpen className="w-16 h-16 mx-auto mb-4 text-slate-400" />
        <h3 className="text-lg font-semibold mb-2">Biblioteca Vazia</h3>
        <p className="text-slate-600 dark:text-slate-400 mb-4">
          Comece organizando seus materiais em módulos e tópicos
        </p>
        <Button>
          <Folder className="w-4 h-4 mr-2" />
          Criar Primeiro Módulo
        </Button>
      </Card>
    </div>
  );
};

export default LibraryTab;
