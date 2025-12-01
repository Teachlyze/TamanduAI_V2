import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Home, ArrowLeft, Search, AlertCircle, Mail, MessageCircle } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';

/**
 * NotFoundPage - Página 404 customizada
 * 
 * Exibida quando o usuário tenta acessar uma rota inexistente
 * ou sem permissão
 */
const NotFoundPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const requestedPath = location?.pathname || '';

  const handleQuickSearch = (query) => {
    setSearchQuery(query);
    const value = query.trim();
    if (value) {
      navigate(`/faq?search=${encodeURIComponent(value)}`);
    } else {
      navigate('/faq');
    }
  };

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-amber-50 via-blue-50/40 to-cyan-50 px-4 py-12 md:py-16 overflow-hidden">
      <div className="pointer-events-none absolute -top-48 -right-32 h-96 w-96 rounded-full bg-gradient-to-tr from-indigo-300 via-sky-300 to-lime-300 opacity-60 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-56 -left-40 h-96 w-96 rounded-full bg-gradient-to-tr from-sky-300 via-indigo-300 to-fuchsia-300 opacity-60 blur-3xl" />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 max-w-7xl mx-auto flex flex-col justify-center min-h-[calc(100vh-6rem)] space-y-10 md:space-y-14"
      >
        <header className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="flex items-center gap-2"
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center shadow-sm">
              <span className="text-white text-sm font-bold">T</span>
            </div>
            <span className="text-base md:text-lg font-semibold text-slate-900">
              TamanduAI <span className="hidden sm:inline text-slate-400">· Central de Ajuda</span>
            </span>
          </button>

          <button
            type="button"
            onClick={() => navigate('/')}
            className="hidden sm:inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:border-indigo-400 hover:text-indigo-700 hover:bg-indigo-50"
          >
            <Home className="w-4 h-4" />
            Voltar para Home
          </button>
        </header>

        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="inline-flex items-center gap-2 rounded-full bg-white/90 px-4 py-2 border border-slate-200 text-[11px] md:text-xs font-medium text-slate-700 shadow-sm"
          role="status"
          aria-live="polite"
        >
          <AlertCircle className="w-4 h-4 text-lime-400" />
          <span>Página não encontrada · Código do erro 404</span>
        </motion.div>

        <div className="grid gap-12 lg:gap-20 md:grid-cols-[minmax(0,2fr),minmax(0,1.4fr)] items-start md:items-center">
          <div>
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="text-[60px] md:text-[96px] leading-none font-black tracking-tight"
            >
              <span className="relative inline-block">
                <span className="absolute -inset-1 rounded-[32px] bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-cyan-500/10 blur" />
                <span className="relative bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 bg-clip-text text-transparent">
                  404
                </span>
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="mt-6 text-2xl md:text-3xl font-semibold text-slate-900"
            >
              Não encontramos o que você procura.
            </motion.p>

            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="mt-4 text-sm md:text-base text-slate-600 max-w-xl leading-relaxed"
            >
              A página pode ter sido movida, renomeada ou nunca existiu. Verifique se o endereço está correto,
              faça uma nova busca no Centro de Ajuda ou escolha um dos caminhos sugeridos abaixo.
            </motion.p>

            {requestedPath && (
              <p className="mt-2 text-xs text-slate-500">
                Rota solicitada: <span className="font-mono text-slate-700">{requestedPath}</span>
              </p>
            )}

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
              className="mt-8"
            >
              <div className="relative max-w-2xl mt-8">
                <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const value = searchQuery.trim();
                      if (value) {
                        navigate(`/faq?search=${encodeURIComponent(value)}`);
                      } else {
                        navigate('/faq');
                      }
                    }
                  }}
                  placeholder="Buscar no Centro de Ajuda (ex: flashcards, plágio, chatbot)..."
                  aria-label="Buscar no Centro de Ajuda"
                  className="w-full rounded-full border border-slate-200 bg-white px-14 py-4 md:py-5 text-sm md:text-base text-slate-900 placeholder:text-slate-400 shadow-[0_18px_40px_rgba(148,163,184,0.25)] focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200 outline-none"
                />
              </div>

              <div className="mt-4 flex flex-wrap gap-3 text-[11px] md:text-xs text-slate-500">
                <span className="uppercase tracking-wide text-slate-500">Sugestões rápidas:</span>
                <button
                  type="button"
                  onClick={() => handleQuickSearch('entrar em uma turma')}
                  className="rounded-full border border-slate-200 bg-white px-3 py-1 hover:border-indigo-400 hover:text-indigo-600 transition-colors"
                >
                  Entrar em uma turma
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickSearch('chatbot educacional')}
                  className="rounded-full border border-slate-200 bg-white px-3 py-1 hover:border-indigo-400 hover:text-indigo-600 transition-colors"
                >
                  Chatbot educacional
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickSearch('antiplágio')}
                  className="rounded-full border border-slate-200 bg-white px-3 py-1 hover:border-indigo-400 hover:text-indigo-600 transition-colors"
                >
                  Antiplágio
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickSearch('planos e preços')}
                  className="rounded-full border border-slate-200 bg-white px-3 py-1 hover:border-indigo-400 hover:text-indigo-600 transition-colors"
                >
                  Planos e preços
                </button>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="mt-8 flex flex-col sm:flex-row flex-wrap gap-3 md:gap-4"
            >
              <Button
                onClick={() => navigate(-1)}
                variant="ghost"
                className="flex items-center gap-2 px-6 py-3 text-sm md:text-base rounded-full border border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
              >
                <ArrowLeft className="w-4 h-4" />
                Voltar página
              </Button>

              <Button
                onClick={() => navigate('/faq')}
                variant="outline"
                className="flex items-center gap-2 px-6 py-3 text-sm md:text-base rounded-full border-slate-300 bg-white text-slate-800 hover:border-indigo-400 hover:bg-indigo-50 hover:text-indigo-700"
              >
                <Search className="w-4 h-4" />
                Ir para Central de Ajuda
              </Button>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45 }}
            className="rounded-3xl border border-indigo-100 bg-white p-7 md:p-8 lg:p-9 shadow-[0_18px_45px_rgba(148,163,184,0.35)] flex flex-col gap-5 md:gap-6 max-w-md md:max-w-lg lg:max-w-xl"
          >
            <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-[11px] font-medium text-indigo-700 border border-indigo-100 w-fit mb-1">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
              <span>Ajuda rápida</span>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 border border-indigo-100">
                <MessageCircle className="w-7 h-7 text-indigo-500" />
              </div>
              <div>
                <p className="text-base font-semibold text-slate-900">Dúvidas sobre para onde ir?</p>
                <p className="mt-1 text-sm text-slate-600">Use o Centro de Ajuda para encontrar tutoriais e respostas sobre IA, flashcards e configurações da conta.</p>
              </div>
            </div>

            <ul className="space-y-2 text-[11px] md:text-xs text-slate-600">
              <li>• Professores geralmente começam pela página de <span className="text-indigo-600 font-medium">Professores</span>.</li>
              <li>• Alunos acessam suas turmas pelo dashboard em <span className="text-indigo-600 font-medium">/students</span>.</li>
              <li>• Em caso de dúvidas sobre cobrança ou LGPD, consulte a <span className="text-indigo-600 font-medium">Política de Privacidade</span>.</li>
            </ul>

            <div className="mt-2 flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => navigate('/professores')}
                className="h-8 rounded-full border-slate-200 bg-white text-xs text-slate-800 hover:border-indigo-400 hover:text-indigo-700"
              >
                Página para Professores
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => navigate('/login')}
                className="h-8 rounded-full border-slate-200 bg-white text-xs text-slate-800 hover:border-indigo-400 hover:text-indigo-700"
              >
                Ir para Login
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => navigate('/contact')}
                className="h-8 rounded-full text-xs text-slate-500 hover:text-slate-900 hover:bg-slate-100"
              >
                <Mail className="w-3 h-3 mr-1" />
                Falar com o suporte
              </Button>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
};

export default NotFoundPage;
