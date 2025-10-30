import React from 'react';
import { Megaphone, Plus } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Card } from '@/shared/components/ui/card';

const AnnouncementsTab = ({ classId }) => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Comunicados</h2>
        <Button className="bg-gradient-to-r from-orange-600 to-red-600">
          <Megaphone className="w-4 h-4 mr-2" />
          Novo Comunicado
        </Button>
      </div>

      <Card className="p-12 text-center">
        <Megaphone className="w-16 h-16 mx-auto mb-4 text-slate-400" />
        <h3 className="text-lg font-semibold mb-2">Nenhum comunicado publicado ainda</h3>
        <p className="text-slate-600 dark:text-slate-400 mb-4">
          Avisos importantes aparecerão aqui e notificarão todos os alunos
        </p>
        <Button className="bg-gradient-to-r from-orange-600 to-red-600">
          <Plus className="w-4 h-4 mr-2" />
          Criar Primeiro Comunicado
        </Button>
      </Card>
    </div>
  );
};

export default AnnouncementsTab;
