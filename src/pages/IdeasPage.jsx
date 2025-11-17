import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet-async';
import { Link, useNavigate } from 'react-router-dom';
import { 
  BookOpen, 
  ArrowRight, 
  Lightbulb, 
  TrendingUp, 
  CheckCircle2, 
  Clock, 
  Sparkles,
  ChevronUp,
  Filter,
  Loader2,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import SkipLinks from '@/shared/components/SkipLinks';
import CookieBanner from '@/shared/components/CookieBanner';
import Footer from '@/shared/components/Footer';
import { listIdeas, createIdea, toggleIdeaVote, getUserVotedIdeas } from '@/shared/services/edgeFunctions';
import { toast } from '@/shared/components/ui/use-toast';

const statusConfig = {
  'em-analise': {
    label: 'Em análise',
    color: 'bg-amber-100 text-amber-800 border-amber-200',
    icon: Clock,
  },
  'em-desenvolvimento': {
    label: 'Em desenvolvimento',
    color: 'bg-blue-100 text-blue-800 border-blue-200',
    icon: TrendingUp,
  },
  'lancado': {
    label: 'Lançado',
    color: 'bg-green-100 text-green-800 border-green-200',
    icon: CheckCircle2,
  },
};

export default function IdeasPage() {
  const navigate = useNavigate();
  const [allIdeas, setAllIdeas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('todos');
  const [sortBy, setSortBy] = useState('votos');
  const [votedIdeas, setVotedIdeas] = useState(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [newIdeaId, setNewIdeaId] = useState(null);
  const ITEMS_PER_PAGE = 6;
  
  // Form state
  const [formData, setFormData] = useState({
    title: '',
    problem: '',
    solution: '',
    segment: '',
    identification: '',
    email: '',
  });

  // Buscar TODAS as ideias uma única vez (cache local)
  const fetchIdeas = useCallback(async () => {
    try {
      setLoading(true);
      const [result, votedIds] = await Promise.all([
        listIdeas({ status: 'todos', sort: 'votos', page: 1, limit: 1000 }), // Buscar todas
        getUserVotedIdeas(),
      ]);
      setAllIdeas(result.ideas || []);
      setVotedIdeas(new Set(votedIds));
    } catch (error) {
      console.error('Error fetching ideas:', error);
      toast({
        title: 'Erro ao carregar ideias',
        description: 'Tente novamente mais tarde.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchIdeas();
  }, [fetchIdeas]);

  // Filtrar e ordenar localmente (sem recarregar)
  const filteredAndSortedIdeas = useMemo(() => {
    let result = [...allIdeas];
    
    // Filtrar por status
    if (filter !== 'todos') {
      result = result.filter(idea => idea.status === filter);
    }
    
    // Ordenar
    if (sortBy === 'votos') {
      result.sort((a, b) => b.votes_count - a.votes_count);
    } else {
      result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }
    
    return result;
  }, [allIdeas, filter, sortBy]);

  // Paginar localmente
  const paginatedIdeas = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;
    return filteredAndSortedIdeas.slice(start, end);
  }, [filteredAndSortedIdeas, currentPage]);

  // Metadados de paginação
  const pagination = useMemo(() => {
    const total = filteredAndSortedIdeas.length;
    const totalPages = Math.ceil(total / ITEMS_PER_PAGE);
    return {
      page: currentPage,
      limit: ITEMS_PER_PAGE,
      total,
      totalPages,
      hasNext: currentPage < totalPages,
      hasPrev: currentPage > 1,
    };
  }, [filteredAndSortedIdeas.length, currentPage]);

  // Reset para página 1 ao mudar filtros
  useEffect(() => {
    setCurrentPage(1);
  }, [filter, sortBy]);

  // Handler de voto
  const handleVote = async (ideaId) => {
    try {
      const result = await toggleIdeaVote(ideaId);
      
      // Atualizar estado local
      setAllIdeas(allIdeas.map(i => 
        i.id === ideaId 
          ? { ...i, votes_count: result.votes_count }
          : i
      ));
      
      // Atualizar set de votos
      setVotedIdeas(prev => {
        const newSet = new Set(prev);
        if (result.has_voted) {
          newSet.add(ideaId);
        } else {
          newSet.delete(ideaId);
        }
        return newSet;
      });
    } catch (error) {
      console.error('Error voting:', error);
      toast({
        title: 'Erro ao votar',
        description: 'Tente novamente mais tarde.',
        variant: 'destructive',
      });
    }
  };

  // Handler de submit do formulário
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.title || formData.title.length < 3) {
      toast({
        title: 'Título inválido',
        description: 'O título deve ter pelo menos 3 caracteres.',
        variant: 'destructive',
      });
      return;
    }
    
    try {
      setSubmitting(true);
      const newIdea = await createIdea({
        title: formData.title.trim(),
        problem: formData.problem.trim(),
        solution: formData.solution.trim(),
        segment: formData.segment || null,
        identification: formData.identification.trim(),
        email: formData.email.trim() || null,
      });
      
      // Adicionar ideia à lista localmente (optimistic update)
      setAllIdeas([newIdea, ...allIdeas]);
      setNewIdeaId(newIdea.id);
      
      // Limpar formulário
      setFormData({
        title: '',
        problem: '',
        solution: '',
        segment: '',
        identification: '',
        email: '',
      });
      
      // Mostrar mensagem de sucesso
      setShowSuccessMessage(true);
      setTimeout(() => setShowSuccessMessage(false), 5000);
      
      // Resetar filtros para "Todas" e trocar ordenação para "Mais recentes"
      setFilter('todos');
      setSortBy('recentes');
      setCurrentPage(1);
      
      // Toast de sucesso
      toast({
        title: '✅ Ideia enviada com sucesso!',
        description: 'Sua ideia já aparece na lista abaixo e está em análise.',
        className: 'bg-green-50 border-green-200',
      });
      
      // Scroll suave para a seção de ideias
      setTimeout(() => {
        const el = document.getElementById('ideias');
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 300);
      
      // Remover highlight após 3 segundos
      setTimeout(() => setNewIdeaId(null), 3000);
    } catch (error) {
      console.error('Error creating idea:', error);
      toast({
        title: 'Erro ao enviar ideia',
        description: error.message || 'Tente novamente mais tarde.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Handler de mudança de página
  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
    // Scroll suave para o topo da seção de ideias
    const el = document.getElementById('ideias');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Helmet>
        <title>Ideias e Sugestões - TamanduAI</title>
        <meta name="description" content="Ajude a construir a TamanduAI. Vote nas ideias que fazem sentido para você e proponha novas melhorias." />
      </Helmet>

      <SkipLinks />
      <CookieBanner />

      {/* Header */}
      <motion.header
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-200 dark:border-gray-800 sticky top-0 z-50 shadow-lg"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link to="/" className="flex items-center space-x-3">
              <div className="w-9 h-9 bg-gradient-to-br from-cyan-500 via-blue-600 to-blue-800 rounded-lg flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-white" />
              </div>
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="text-xl font-bold bg-gradient-to-r from-cyan-600 via-blue-600 to-blue-800 bg-clip-text text-transparent"
              >
                TamanduAI
              </motion.span>
            </Link>
            <div className="flex items-center space-x-3">
              <Link to="/professores">
                <Button variant="ghost" size="sm" className="text-sm">
                  Para Professores
                </Button>
              </Link>
              <Link to="/roadmap">
                <Button variant="ghost" size="sm" className="text-sm">
                  Roadmap
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </motion.header>

      <main id="main-content" className="flex-grow w-full">
        {/* Hero Section */}
        <section className="relative overflow-hidden py-16 lg:py-24 bg-gradient-to-br from-amber-50 via-blue-50/30 to-cyan-50">
          <div className="absolute inset-0 pointer-events-none hidden lg:block">
            <div className="absolute top-10 left-10 w-32 h-2 bg-amber-300 rounded-full rotate-[-6deg] opacity-60" />
            <div className="absolute top-20 right-20 w-20 h-2 bg-blue-300 rounded-full rotate-[8deg] opacity-60" />
            <div className="absolute bottom-10 left-1/3 w-24 h-2 bg-cyan-300 rounded-full rotate-[4deg] opacity-60" />
          </div>

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-center max-w-4xl mx-auto"
            >
              <div className="inline-flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-full bg-amber-300 text-gray-900 shadow-md mb-6">
                <Lightbulb className="w-4 h-4" />
                Construa a TamanduAI conosco
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-gray-900 dark:text-white leading-tight mb-6">
                Ajude a decidir os{' '}
                <span className="relative inline-block px-2 py-1 rounded-md bg-amber-300 text-gray-900">
                  próximos passos
                </span>{' '}
                da TamanduAI
              </h1>

              <p className="text-lg text-gray-600 dark:text-gray-300 mb-8 leading-relaxed max-w-2xl mx-auto">
                Veja o que outros professores sugeriram, vote nas ideias que fazem sentido para você e proponha novas melhorias para a plataforma.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button
                  size="lg"
                  onClick={() => {
                    const el = document.getElementById('nova-ideia');
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                  }}
                  leftIcon={<Sparkles className="w-5 h-5" />}
                  className="relative bg-gradient-to-r from-amber-400 via-amber-500 to-amber-400 hover:from-amber-500 hover:via-amber-600 hover:to-amber-500 text-gray-900 font-bold shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300 overflow-hidden group"
                >
                  <span className="relative z-10">Enviar nova ideia</span>
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
                </Button>
                <Button
                  size="lg"
                  onClick={() => {
                    const el = document.getElementById('ideias');
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                  }}
                  variant="gradientOutline"
                  className="border-2 border-blue-600 text-blue-600 hover:bg-blue-50"
                >
                  Ver ideias
                </Button>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Ideas Section */}
        <section id="ideias" className="py-16 lg:py-24 bg-background">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* Success Message Banner */}
            {showSuccessMessage && (
              <motion.div
                initial={{ opacity: 0, y: -20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.95 }}
                className="mb-8 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-2xl p-6 shadow-lg"
              >
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
                      <CheckCircle2 className="w-7 h-7 text-white" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-green-900 mb-1">
                      🎉 Ideia enviada com sucesso!
                    </h3>
                    <p className="text-green-800 mb-3">
                      Obrigado por contribuir! Sua ideia já está visível abaixo e entrará em análise pela nossa equipe.
                    </p>
                    <div className="flex items-center gap-2 text-sm text-green-700">
                      <Clock className="w-4 h-4" />
                      <span>Status: <strong>Em análise</strong></span>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowSuccessMessage(false)}
                    className="flex-shrink-0 text-green-600 hover:text-green-800 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </motion.div>
            )}

            {/* Filters */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="mb-12"
            >
              <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setFilter('todos')}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                      filter === 'todos'
                        ? 'bg-gray-900 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Todas {pagination && `(${pagination.total})`}
                  </button>
                  {Object.entries(statusConfig).map(([key, config]) => (
                    <button
                      key={key}
                      onClick={() => setFilter(key)}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-all inline-flex items-center gap-2 ${
                        filter === key
                          ? config.color.replace('100', '200')
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {config.label}
                    </button>
                  ))}
                </div>

                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Ordenar por" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="votos">Mais votadas</SelectItem>
                    <SelectItem value="recentes">Mais recentes</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </motion.div>

            {/* Loading State */}
            {loading && (
              <div className="flex justify-center items-center py-20">
                <Loader2 className="w-12 h-12 text-amber-500 animate-spin" />
              </div>
            )}

            {/* Ideas Grid */}
            {!loading && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {paginatedIdeas.map((idea, index) => {
                const StatusIcon = statusConfig[idea.status].icon;
                const hasVoted = votedIdeas.has(idea.id);

                const isNewIdea = idea.id === newIdeaId;

                return (
                  <motion.div
                    key={idea.id}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: index * 0.1 }}
                    whileHover={{ y: -4, transition: { duration: 0.2 } }}
                    className={`relative bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-lg hover:shadow-xl border flex flex-col transition-all duration-300 ${
                      isNewIdea 
                        ? 'border-4 border-green-400 shadow-2xl shadow-green-200/50 animate-pulse' 
                        : 'border border-blue-100/60 dark:border-blue-900/40'
                    }`}
                  >
                    {/* New Idea Badge */}
                    {isNewIdea && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                        <div className="bg-gradient-to-r from-green-500 to-emerald-500 text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-lg flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5" />
                          SUA IDEIA
                        </div>
                      </div>
                    )}
                    {/* Status Badge */}
                    <div className="absolute top-4 right-4">
                      <div className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full border ${statusConfig[idea.status].color}`}>
                        <StatusIcon className="w-3.5 h-3.5" />
                        {statusConfig[idea.status].label}
                      </div>
                    </div>

                    {/* Vote Button */}
                    <div className="mb-4">
                      <button
                        onClick={() => handleVote(idea.id)}
                        className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg font-bold transition-all ${
                          hasVoted
                            ? 'bg-amber-500 text-white shadow-md hover:bg-amber-600'
                            : 'bg-gray-100 text-gray-700 hover:bg-amber-100 hover:text-amber-700'
                        }`}
                      >
                        <ChevronUp className={`w-5 h-5 ${hasVoted ? 'text-white' : ''}`} />
                        <span className="text-sm">{idea.votes_count}</span>
                      </button>
                    </div>

                    {/* Content */}
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3 pr-12">
                      {idea.title}
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4 flex-grow leading-relaxed">
                      {idea.problem || idea.solution || 'Sem descrição'}
                    </p>

                    {/* Author */}
                    {idea.identification && (
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-auto pt-4 border-t border-gray-100 dark:border-gray-800">
                        Sugerido por {idea.identification}
                      </div>
                    )}
                  </motion.div>
                );
                })}
              </div>
            )}

            {/* Empty State */}
            {!loading && filteredAndSortedIdeas.length === 0 && (
              <div className="text-center py-20">
                <Lightbulb className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                  Nenhuma ideia encontrada
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Seja o primeiro a sugerir uma ideia!
                </p>
              </div>
            )}

            {/* Paginação */}
            {!loading && pagination && pagination.totalPages > 1 && (
              <div className="mt-12 flex flex-col sm:flex-row items-center justify-between gap-4">
                {/* Info */}
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Mostrando <span className="font-semibold text-gray-900 dark:text-white">{paginatedIdeas.length}</span> de{' '}
                  <span className="font-semibold text-gray-900 dark:text-white">{pagination.total}</span> ideias
                </div>

                {/* Botoes de paginação */}
                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={!pagination.hasPrev}
                    variant="outline"
                    size="sm"
                    className="gap-2"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Anterior
                  </Button>

                  {/* Números de página */}
                  <div className="flex items-center gap-1">
                    {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map(page => {
                      // Mostrar apenas 5 páginas por vez
                      const showPage = page === 1 || 
                                       page === pagination.totalPages ||
                                       Math.abs(page - currentPage) <= 1;
                      

                      if (!showPage) {
                        // Mostrar ... entre páginas
                        if (page === currentPage - 2 || page === currentPage + 2) {
                          return <span key={page} className="px-2 text-gray-400">…</span>;
                        }
                        return null;
                      }

                      return (
                        <button
                          key={page}
                          onClick={() => handlePageChange(page)}
                          className={`min-w-[2.5rem] h-10 px-3 rounded-lg text-sm font-medium transition-all ${
                            page === currentPage
                              ? 'bg-amber-500 text-white shadow-md'
                              : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-600'
                          }`}
                        >
                          {page}
                        </button>
                      );
                    })}
                  </div>

                  <Button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={!pagination.hasNext}
                    variant="outline"
                    size="sm"
                    className="gap-2"
                  >
                    Próxima
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* New Idea Form Section */}
        <section id="nova-ideia" className="py-16 lg:py-24 bg-gradient-to-br from-slate-50 via-amber-50/20 to-slate-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="text-center mb-12">
                <div className="inline-flex items-center text-xs font-semibold px-3 py-1 rounded-full bg-amber-100 text-amber-800 mb-4">
                  Sua voz importa
                </div>
                <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-6 leading-tight">
                  Compartilhe sua ideia
                </h2>
                <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                  Conte pra gente que problema você enfrenta e como imagina que a TamanduAI poderia ajudar.
                </p>
              </div>

              <div className="bg-white dark:bg-gray-900 rounded-2xl p-8 shadow-xl border border-blue-100/60 dark:border-blue-900/40">
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <label className="block text-sm font-semibold bg-gradient-to-r from-blue-600 to-amber-600 bg-clip-text text-transparent mb-2">
                      Título da ideia
                    </label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="Ex: Integração com Google Classroom"
                      required
                      className="w-full px-4 py-3 rounded-lg border-2 border-blue-200 dark:border-blue-800 bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder:text-gray-400 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 hover:border-blue-400 transition-all duration-200 shadow-sm hover:shadow-md"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold bg-gradient-to-r from-blue-600 to-amber-600 bg-clip-text text-transparent mb-2">
                      Que problema você quer resolver?
                      <span className="text-xs text-gray-500 ml-2 font-normal">({formData.problem.length}/500 caracteres)</span>
                    </label>
                    <textarea
                      rows={4}
                      value={formData.problem}
                      onChange={(e) => {
                        if (e.target.value.length <= 500) {
                          setFormData({ ...formData, problem: e.target.value });
                        }
                      }}
                      placeholder="Descreva em até 500 caracteres (~5 frases)..."
                      maxLength={500}
                      className="w-full px-4 py-3 rounded-lg border-2 border-blue-200 dark:border-blue-800 bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder:text-gray-400 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 hover:border-blue-400 transition-all duration-200 shadow-sm hover:shadow-md resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold bg-gradient-to-r from-blue-600 to-amber-600 bg-clip-text text-transparent mb-2">
                      Como você imagina que a TamanduAI poderia ajudar?
                      <span className="text-xs text-gray-500 ml-2 font-normal">({formData.solution.length}/500 caracteres)</span>
                    </label>
                    <textarea
                      rows={4}
                      value={formData.solution}
                      onChange={(e) => {
                        if (e.target.value.length <= 500) {
                          setFormData({ ...formData, solution: e.target.value });
                        }
                      }}
                      placeholder="Conte sua ideia em até 500 caracteres (~5 frases)..."
                      maxLength={500}
                      className="w-full px-4 py-3 rounded-lg border-2 border-blue-200 dark:border-blue-800 bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder:text-gray-400 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 hover:border-blue-400 transition-all duration-200 shadow-sm hover:shadow-md resize-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold bg-gradient-to-r from-blue-600 to-amber-600 bg-clip-text text-transparent mb-2">
                        Seu nome
                      </label>
                      <input
                        type="text"
                        value={formData.identification}
                        onChange={(e) => setFormData({ ...formData, identification: e.target.value })}
                        placeholder="Ex: Prof. de Matemática"
                        required
                        minLength={3}
                        maxLength={100}
                        className="w-full px-4 py-3 rounded-lg border-2 border-blue-200 dark:border-blue-800 bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder:text-gray-400 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 hover:border-blue-400 transition-all duration-200 shadow-sm hover:shadow-md"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold bg-gradient-to-r from-blue-600 to-amber-600 bg-clip-text text-transparent mb-2">
                        Seu e-mail
                      </label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="seuemail@exemplo.com"
                        maxLength={100}
                        className="w-full px-4 py-3 rounded-lg border-2 border-blue-200 dark:border-blue-800 bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder:text-gray-400 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 hover:border-blue-400 transition-all duration-200 shadow-sm hover:shadow-md"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold bg-gradient-to-r from-blue-600 to-amber-600 bg-clip-text text-transparent mb-2">
                      Segmento (opcional)
                    </label>
                    <Select value={formData.segment} onValueChange={(value) => setFormData({ ...formData, segment: value })}>
                      <SelectTrigger className="w-full h-12">
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fundamental-1">Fundamental I</SelectItem>
                        <SelectItem value="fundamental-2">Fundamental II</SelectItem>
                        <SelectItem value="medio">Ensino Médio</SelectItem>
                        <SelectItem value="tecnico">Técnico</SelectItem>
                        <SelectItem value="superior">Superior</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-gray-500 mt-1.5">
                      📧 Poderemos entrar em contato com você para mais detalhes sobre sua ideia.
                    </p>
                  </div>

                  <div className="pt-4">
                    <Button
                      type="submit"
                      size="lg"
                      disabled={submitting}
                      leftIcon={submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                      className="w-full relative bg-gradient-to-r from-amber-400 via-amber-500 to-amber-400 hover:from-amber-500 hover:via-amber-600 hover:to-amber-500 text-gray-900 font-bold shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300 overflow-hidden group disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                    >
                      <span className="relative z-10">{submitting ? 'Enviando...' : 'Enviar ideia'}</span>
                      {!submitting && (
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
                      )}
                    </Button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="relative py-16 lg:py-20 bg-gradient-to-br from-cyan-500 via-blue-600 to-blue-800 overflow-hidden">
          <div className="absolute top-10 right-10 w-32 h-32 bg-amber-400/10 rounded-full blur-2xl hidden lg:block"></div>
          <div className="absolute bottom-10 left-10 w-40 h-40 bg-white/5 rounded-full blur-3xl hidden lg:block"></div>

          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4">
                Veja o que já está sendo construído
              </h2>
              <p className="text-lg text-white/80 mb-8 max-w-2xl mx-auto">
                Confira nosso roadmap público e acompanhe o desenvolvimento de novas funcionalidades em tempo real.
              </p>

              <Link to="/roadmap">
                <Button
                  size="lg"
                  rightIcon={<ArrowRight className="w-5 h-5" />}
                  className="bg-white text-blue-600 hover:bg-gray-50 shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300 text-lg px-10 py-7 font-bold"
                >
                  Ver roadmap completo
                </Button>
              </Link>
            </motion.div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
