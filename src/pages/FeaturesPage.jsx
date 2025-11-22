import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import Seo from '@/shared/components/Seo';
import { Button } from '@/shared/components/ui/button';
import { Card } from '@/shared/components/ui/card';
import Footer from '@/shared/components/Footer';
import { useIsMobile, usePrefersReducedMotion } from '@/shared/hooks/useMediaQuery';
import {
  Brain, FileEdit, Shield, BarChart3, MessageSquare, Calendar,
  Users, Upload, Sparkles, TrendingUp, Clock, CheckCircle,
  BookOpen, Zap, Target, ArrowRight, Heart, Award
} from 'lucide-react';

export default function FeaturesPage() {
  const isMobile = useIsMobile();
  const prefersReducedMotion = usePrefersReducedMotion();
  const isMotionLight = isMobile || prefersReducedMotion;

  const coreFeatures = [
    {
      icon: Brain,
      title: 'Chatbot com RAG v2.0',
      description: 'Treine o chatbot com seus materiais (PDF, Word, PPT, URLs) para responder dúvidas 24/7',
      details: [
        'Upload de materiais em múltiplos formatos',
        'Respostas alinhadas à sua metodologia',
        'Até 200 mensagens/dia no plano básico',
        'Atendimento automático aos alunos'
      ],
      badge: 'Até 200 msgs/dia',
      gradient: 'from-blue-500 to-blue-600'
    },
    {
      icon: FileEdit,
      title: 'Correção Automática com IA',
      description: 'Correção inteligente de atividades com feedback detalhado gerado por IA',
      details: [
        'Economia de até 70% do tempo de correção',
        'Feedback personalizado para cada aluno',
        'Critérios de avaliação customizáveis',
        'Histórico completo de correções'
      ],
      badge: 'Economia de 70%',
      gradient: 'from-purple-500 to-purple-600'
    },
    {
      icon: Shield,
      title: 'Antiplágio Winston AI',
      description: 'Detecção automática de plágio e conteúdo gerado por IA',
      details: [
        '100 verificações por hora',
        'Detecção de IA com Winston AI',
        'Relatórios detalhados com fontes',
        'Integrado ao fluxo de correção'
      ],
      badge: '100 verificações/hora',
      gradient: 'from-red-500 to-red-600'
    },
    {
      icon: BarChart3,
      title: 'Analytics em Tempo Real',
      description: 'Dashboards completos com métricas de desempenho e relatórios exportáveis',
      details: [
        'KPIs por turma e aluno',
        'Identificação de alunos em risco',
        'Exportação em CSV',
        'Gráficos de evolução temporal'
      ],
      badge: 'Exportação CSV',
      gradient: 'from-indigo-500 to-blue-600'
    }
  ];

  const organizationFeatures = [
    {
      icon: Calendar,
      title: 'Calendário Integrado',
      description: 'Gestão de aulas, atividades e eventos em um único lugar',
      items: [
        'Aulas recorrentes (diário, semanal, mensal)',
        'Notificações automáticas de prazos',
        'Sincronização com turmas',
        'Visualização por turma ou global'
      ]
    },
    {
      icon: Users,
      title: 'Gestão de Turmas',
      description: 'Organize alunos, professores e conteúdo por turma',
      items: [
        'Código de convite único por turma',
        'Multi-perfil (professor, aluno, escola)',
        'Controle de acesso granular',
        'Capacidade configurável'
      ]
    },
    {
      icon: Upload,
      title: 'Importação de Atividades',
      description: 'Crie atividades importando arquivos existentes',
      items: [
        'Suporte a TXT, PDF, DOCX, ODT',
        'Extração automática de conteúdo',
        'Edição após importação',
        'Economize tempo na criação'
      ]
    },
    {
      icon: MessageSquare,
      title: 'Discussões por Turma',
      description: 'Fórum de discussões integrado para cada turma',
      items: [
        'Threads de discussão por atividade',
        'Respostas aninhadas',
        'Moderação de professores',
        'Notificações de novas mensagens'
      ]
    }
  ];

  const advancedFeatures = [
    {
      icon: Target,
      title: 'Sistema de Eventos',
      description: 'Personalizados por turma ou individuais',
      color: 'text-orange-600'
    },
    {
      icon: Award,
      title: 'Gamificação',
      description: 'Badges, missões e conquistas para engajamento',
      color: 'text-yellow-600'
    },
    {
      icon: Sparkles,
      title: 'Materiais Compartilháveis',
      description: 'Upload e gestão de materiais de apoio',
      color: 'text-pink-600'
    },
    {
      icon: TrendingUp,
      title: 'Relatórios de Notas',
      description: 'Estatísticas e histórico completo por aluno',
      color: 'text-green-600'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-blue-50/30 to-cyan-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <Seo 
        title="Funcionalidades - TamanduAI"
        description="Conheça todas as funcionalidades da TamanduAI: chatbot com IA, correção automática, antiplágio, analytics e muito mais."
      />

      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-cyan-600 via-blue-600 to-blue-800 rounded-xl flex items-center justify-center">
                <BookOpen className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-cyan-600 via-blue-600 to-blue-800 bg-clip-text text-transparent">
                TamanduAI
              </span>
            </Link>
            <nav className="flex items-center gap-4">
              <Link to="/pricing">
                <Button variant="ghost" size="sm">Preços</Button>
              </Link>
              <Link to="/professores">
                <Button variant="ghost" size="sm">Para Professores</Button>
              </Link>
              <Link to="/login">
                <Button variant="ghost" size="sm">Entrar</Button>
              </Link>
              <Link to="/register">
                <Button variant="gradient" size="sm">
                  Começar Grátis
                </Button>
              </Link>
            </nav>
          </div>
        </div>
      </header>

      <main className="py-20">
        {/* Hero Section */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center mb-20">
          <motion.div
            initial={isMotionLight ? false : { opacity: 0, y: 20 }}
            animate={isMotionLight ? undefined : { opacity: 1, y: 0 }}
            transition={isMotionLight ? undefined : { duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-100 text-amber-800 mb-6">
              <Sparkles className="w-4 h-4" />
              <span className="text-sm font-semibold">Funcionalidades Completas</span>
            </div>
            <h1 className="text-5xl lg:text-6xl font-bold text-gray-900 dark:text-white mb-6">
              Tudo que você precisa para <br />
              <span className="bg-gradient-to-r from-cyan-600 via-blue-600 to-blue-800 bg-clip-text text-transparent">
                revolucionar sua forma de ensinar
              </span>
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto mb-8">
              Descubra como a TamanduAI automatiza tarefas repetitivas e libera seu tempo para o que realmente importa: ensinar.
            </p>
          </motion.div>
        </section>

        {/* Core Features */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Funcionalidades Principais
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-300">
              As ferramentas que fazem a diferença no dia a dia do professor
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {coreFeatures.map((feature, idx) => (
              <motion.div
                key={idx}
                initial={isMotionLight ? false : { opacity: 0, y: 20 }}
                whileInView={isMotionLight ? undefined : { opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={isMotionLight ? undefined : { duration: 0.6, delay: idx * 0.1 }}
              >
                <Card className="h-full p-8 rounded-2xl border border-blue-100/60 dark:border-blue-900/40 hover:shadow-xl transition-all duration-300">
                  {/* Icon & Badge */}
                  <div className="flex items-start justify-between mb-6">
                    <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center`}>
                      <feature.icon className="w-8 h-8 text-white" />
                    </div>
                    <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-semibold">
                      {feature.badge}
                    </span>
                  </div>

                  {/* Content */}
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300 mb-6">
                    {feature.description}
                  </p>

                  {/* Details List */}
                  <ul className="space-y-3">
                    {feature.details.map((detail, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                        <span className="text-sm text-gray-700 dark:text-gray-300">{detail}</span>
                      </li>
                    ))}
                  </ul>
                </Card>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Organization Features */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Organização e Gestão
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-300">
              Centralize tudo em um único lugar
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {organizationFeatures.map((feature, idx) => (
              <motion.div
                key={idx}
                initial={isMotionLight ? false : { opacity: 0, y: 20 }}
                whileInView={isMotionLight ? undefined : { opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={isMotionLight ? undefined : { duration: 0.6, delay: idx * 0.1 }}
              >
                <Card className="h-full p-6 rounded-2xl border border-blue-100/60 dark:border-blue-900/40 hover:shadow-xl transition-all duration-300">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center mb-4">
                    <feature.icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                    {feature.description}
                  </p>
                  <ul className="space-y-2">
                    {feature.items.map((item, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-600 flex-shrink-0 mt-1.5" />
                        <span className="text-xs text-gray-600 dark:text-gray-400">{item}</span>
                      </li>
                    ))}
                  </ul>
                </Card>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Advanced Features */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              E muito mais...
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-300">
              Recursos adicionais para enriquecer a experiência
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {advancedFeatures.map((feature, idx) => (
              <motion.div
                key={idx}
                initial={isMotionLight ? false : { opacity: 0, scale: 0.9 }}
                whileInView={isMotionLight ? undefined : { opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={isMotionLight ? undefined : { duration: 0.6, delay: idx * 0.1 }}
              >
                <Card className="p-6 rounded-2xl border border-blue-100/60 dark:border-blue-900/40 hover:shadow-xl transition-all duration-300 text-center">
                  <feature.icon className={`w-12 h-12 mx-auto mb-4 ${feature.color}`} />
                  <h3 className="font-bold text-gray-900 dark:text-white mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    {feature.description}
                  </p>
                </Card>
              </motion.div>
            ))}
          </div>
        </section>

        {/* CTA Final */}
        <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 mb-20">
          <motion.div
            initial={isMotionLight ? false : { opacity: 0, y: 20 }}
            whileInView={isMotionLight ? undefined : { opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={isMotionLight ? undefined : { duration: 0.6 }}
          >
            <Card className="relative overflow-hidden p-12 rounded-2xl border border-amber-200 dark:border-amber-800/40 bg-gradient-to-br from-amber-50 via-blue-50/30 to-cyan-50/30 dark:from-amber-900/20 dark:via-blue-900/20 dark:to-cyan-900/20">
              {/* Decorative Elements */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-amber-200/20 rounded-full blur-3xl" />
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-200/20 rounded-full blur-3xl" />

              <div className="relative text-center">
                <Heart className="w-16 h-16 mx-auto mb-6 text-amber-600" />
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
                  Pronto para transformar sua rotina?
                </h2>
                <p className="text-lg text-gray-600 dark:text-gray-300 mb-8 max-w-2xl mx-auto">
                  Junte-se aos professores que estão testando a TamanduAI para reduzir sua sobrecarga digital com IA
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link to="/register">
                    <Button
                      size="lg"
                      className="relative bg-gradient-to-r from-amber-400 via-amber-500 to-amber-400 hover:from-amber-500 hover:via-amber-600 hover:to-amber-500 text-gray-900 font-bold shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300"
                    >
                      <Sparkles className="w-5 h-5 mr-2" />
                      Começar Grátis Agora
                    </Button>
                  </Link>
                  <Link to="/pricing">
                    <Button
                      size="lg"
                      variant="gradientOutline"
                      rightIcon={<ArrowRight className="w-5 h-5" />}
                    >
                      Ver Preços
                    </Button>
                  </Link>
                </div>
              </div>
            </Card>
          </motion.div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
