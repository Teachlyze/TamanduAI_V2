import React, { useState } from 'react';
import { MessageSquare, Bot } from 'lucide-react';
import { Card } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';

const ChatbotTab = ({ classId, classData }) => {
  const [enabled, setEnabled] = useState(false);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Assistente Virtual (Chatbot)</h2>

      <Card className="p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
            <Bot className="w-8 h-8 text-blue-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-lg mb-1">
              Ative o Chatbot para esta Turma
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Um assistente virtual responderá dúvidas dos alunos automaticamente
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
          </label>
        </div>

        {enabled && (
          <div className="p-4 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              ℹ️ Você poderá treinar e configurar o chatbot posteriormente na página específica de Chatbot.
            </p>
          </div>
        )}
      </Card>

      {!enabled && (
        <Card className="p-12 text-center">
          <MessageSquare className="w-16 h-16 mx-auto mb-4 text-slate-400" />
          <h3 className="text-lg font-semibold mb-2">Chatbot Desativado</h3>
          <p className="text-slate-600 dark:text-slate-400 mb-4">
            Ative o chatbot para permitir que alunos tirem dúvidas automaticamente
          </p>
          <Button onClick={() => setEnabled(true)}>
            Ativar Chatbot
          </Button>
        </Card>
      )}
    </div>
  );
};

export default ChatbotTab;
