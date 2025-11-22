import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Home, ArrowLeft, Search, AlertCircle, Mail } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Card } from '@/shared/components/ui/card';

/**
 * NotFoundPage - Página 404 customizada
 * 
 * Exibida quando o usuário tenta acessar uma rota inexistente
 * ou sem permissão
 */
const NotFoundPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-2xl"
      >
        <Card className="p-8 md:p-12 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-2 border-slate-200 dark:border-slate-800 shadow-2xl">
          {/* Ícone de Erro */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
            className="flex justify-center mb-6"
          >
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center shadow-xl">
              <AlertCircle className="w-12 h-12 text-white" />
            </div>
          </motion.div>

          {/* Título 404 */}
          <motion.h1
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-6xl md:text-8xl font-bold text-center bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent mb-4"
          >
            404
          </motion.h1>

          {/* Mensagem */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-center mb-8"
          >
            <h2 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white mb-3">
              Página não encontrada
            </h2>
            <p className="text-slate-600 dark:text-slate-400 text-lg">
              Oops! A página que você está procurando não existe ou você não tem permissão para acessá-la.
            </p>
          </motion.div>

          {/* Sugestões */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-6 mb-8"
          >
            <h3 className="font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
              <Search className="w-4 h-4" />
              O que você pode fazer:
            </h3>
            <ul className="space-y-2 text-slate-600 dark:text-slate-400">
              <li className="flex items-start gap-2">
                <span className="text-blue-600 dark:text-blue-400 mt-1">•</span>
                <span>Verificar se o endereço foi digitado corretamente</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 dark:text-blue-400 mt-1">•</span>
                <span>Voltar para a página anterior e tentar novamente</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 dark:text-blue-400 mt-1">•</span>
                <span>Ir para a página inicial e navegar a partir de lá</span>
              </li>
            </ul>
          </motion.div>

          {/* Botões de Ação */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="flex flex-col sm:flex-row gap-3 justify-center"
          >
            <Button
              onClick={() => navigate(-1)}
              variant="outline"
              className="flex items-center gap-2 px-6 py-3 text-base"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar
            </Button>
            <Button
              onClick={() => navigate('/')}
              className="flex items-center gap-2 px-6 py-3 text-base bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600"
            >
              <Home className="w-4 h-4" />
              Página Inicial
            </Button>
          </motion.div>
        </Card>

        {/* Decoração */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="text-center mt-6"
        >
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Se o problema persistir, entre em contato com o suporte.
          </p>
          <Button
            onClick={() => navigate('/contact')}
            variant="ghost"
            size="sm"
            className="mt-2 inline-flex items-center gap-2 text-blue-600 dark:text-blue-400"
          >
            <Mail className="w-4 h-4" />
            Falar com o suporte
          </Button>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default NotFoundPage;
