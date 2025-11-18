import React from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import Seo from '@/shared/components/Seo';
import { SEO, StructuredData } from '@/shared/components/seo/StructuredData';
import { Button } from '@/shared/components/ui/button';
import SkipLinks from '@/shared/components/SkipLinks';
import CookieBanner from '@/shared/components/CookieBanner';
import Footer from '@/shared/components/Footer';
import { useIsMobile, usePrefersReducedMotion } from '@/shared/hooks/useMediaQuery';
import {
  BookOpen,
  Sparkles,
  Brain,
  Clock,
  Users,
  Calendar,
  Shield,
  BarChart3,
  MessageSquare,
  Heart,
  ArrowRight,
  Lightbulb,
} from 'lucide-react';

const problemStats = [
  {
    label: '60h/semana',
    description: 'Carga total de trabalho somando sala de aula e tarefas extraclasse.',
  },
  {
    label: '3–12h extras',
    description: 'Tempo extra por semana só com cadastro, notas, comunicados e materiais.',
  },
  {
    label: 'Nunca desconecta',
    description: 'Muitas ferramentas, mensagens o tempo todo e sensação de estar sempre trabalhando.',
  },
];

const pillars = [
  {
    icon: Brain,
    title: 'Chatbot com IA treinado pelos seus materiais',
    description:
      'Um assistente que responde dúvidas dos alunos usando os conteúdos que você envia, alinhado à sua forma de ensinar.',
    items: [
      'Treine o chatbot com PDFs, slides e textos da disciplina',
      'Atendimento aos alunos 24/7 sem exigir que você esteja sempre disponível',
      'Respostas alinhadas à sua metodologia, não a um conteúdo genérico da internet',
    ],
  },
  {
    icon: BarChart3,
    title: 'Analytics das turmas em tempo real',
    description:
      'Acompanhe rapidamente quem está indo bem, quem precisa de ajuda e como sua turma está evoluindo ao longo do tempo.',
    items: [
      'Visão geral de desempenho por turma e por atividade',
      'Identificação de alunos em risco ou com baixa participação',
      'Relatórios simples para reuniões com coordenação e responsáveis',
    ],
  },
  {
    icon: MessageSquare,
    title: 'Organiza o caos de ferramentas e prazos',
    description:
      'Reúna turmas, atividades, materiais, calendário e recados em um único ambiente fácil de usar.',
    items: [
      'Gestão de turmas, atividades e arquivos em um painel único',
      'Calendário centralizado de aulas, atividades e eventos',
      'Fluxo de correção e antiplágio com IA integrado ao dia a dia do professor',
    ],
  },
];

const researchStats = [
  {
    label: '77,8%',
    description: 'dos professores entrevistados têm mais de 5 anos de experiência em sala de aula.',
  },
  {
    label: '90%',
    description:
      'disseram que usariam uma plataforma com IA de chatbot alinhada à sua metodologia de ensino.',
  },
];

const beyondTccItems = [
  'Gestão multi-perfil para professor, aluno e escola em um único ambiente.',
  'Analytics em tempo real para acompanhar desempenho de turmas e estudantes.',
  'Calendário de aulas, atividades e eventos integrado ao fluxo de trabalho docente.',
  'Importação de atividades e materiais em múltiplos formatos (TXT, PDF, DOCX, ODT).',
];

export default function TeacherLandingPage() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const prefersReducedMotion = usePrefersReducedMotion();
  const isMotionLight = isMobile || prefersReducedMotion;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Seo
        title="TamanduAI — EdTech com IA para Professores"
        description="EdTech com IA que transforma horas de tarefas em minutos, organiza turmas e automatiza o trabalho fora da sala de aula."
        path="/"
      />

      <SEO
        title="TamanduAI para Professores — Transforme horas de tarefas em minutos"
        description="Centralize turmas, atividades e comunicação em um só lugar. Automatize correções, antiplágio, relatórios e dúvidas repetidas com uma IA ética que respeita sua autonomia pedagógica."
        keywords="sobrecarga docente, trabalho fora da sala de aula, plataforma educacional IA, assistente virtual professor, TamanduAI, educação brasileira, burnout docente"
        url="https://tamanduai.com"
        image="https://tamanduai.com/og-image.png"
      />

      <StructuredData type="organization" />
      <StructuredData type="software" />

      <motion.header
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-200 dark:border-gray-800 sticky top-0 z-50 shadow-lg"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
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
              <nav className="hidden md:flex space-x-6 ml-6">
                <Link
                  to="/"
                  className="text-sm text-gray-600 dark:text-gray-300 hover:text-amber-600 dark:hover:text-amber-400 hover:underline underline-offset-4 font-medium transition-colors"
                >
                  Início
                </Link>
                <a
                  href="#como-ajudamos"
                  className="relative text-sm text-gray-600 dark:text-gray-300 hover:text-amber-600 dark:hover:text-amber-400 font-medium transition-colors group"
                >
                  Como ajudamos
                  <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-amber-400 to-amber-600 group-hover:w-full transition-all duration-300"></span>
                </a>
                <Link
                  to="/pricing"
                  className="relative text-sm text-gray-600 dark:text-gray-300 hover:text-amber-600 dark:hover:text-amber-400 font-medium transition-colors group"
                >
                  Preços
                  <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-amber-400 to-amber-600 group-hover:w-full transition-all duration-300"></span>
                </Link>
                <Link
                  to="/contact"
                  className="relative text-sm text-gray-600 dark:text-gray-300 hover:text-amber-600 dark:hover:text-amber-400 font-medium transition-colors group"
                >
                  Contato
                  <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-amber-400 to-amber-600 group-hover:w-full transition-all duration-300"></span>
                </Link>
                <Link
                  to="/faq"
                  className="relative text-sm text-gray-600 dark:text-gray-300 hover:text-amber-600 dark:hover:text-amber-400 font-medium transition-colors group"
                >
                  FAQ
                  <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-amber-400 to-amber-600 group-hover:w-full transition-all duration-300"></span>
                </Link>
              </nav>
            </div>
            <div className="flex items-center space-x-3">
              <Link to="/login">
                <Button variant="ghost" size="sm" className="text-sm">
                  Entrar
                </Button>
              </Link>
              <Link to="/register">
                <Button size="sm" rightIcon={<ArrowRight className="w-4 h-4" />} variant="gradient">
                  Começar Grátis
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </motion.header>

      <main id="main-content" className="flex-grow w-full">
        <SkipLinks />

        <section className="relative overflow-hidden py-16 lg:py-24 bg-gradient-to-br from-amber-50 via-blue-50/30 to-cyan-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
          <div className="absolute inset-0 pointer-events-none hidden lg:block">
            <div className="absolute -top-6 left-6 w-32 h-2 bg-amber-300 rounded-full rotate-[-6deg] opacity-70" />
            <div className="absolute top-4 left-24 w-20 h-2 bg-amber-200 rounded-full rotate-[4deg] opacity-60" />
            <div className="absolute -bottom-8 right-8 w-32 h-2 bg-amber-300 rounded-full rotate-[8deg] opacity-70" />
          </div>

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="text-center lg:text-left"
              >
                <div className="flex flex-wrap items-center gap-3 mb-6 justify-center lg:justify-start">
                  <div className="inline-flex items-center text-xs font-semibold px-3 py-1.5 rounded-full bg-amber-300 text-gray-900 shadow-md">
                    <Sparkles className="w-3.5 h-3.5 mr-1.5 text-gray-900" />
                    Feita para organizar sua rotina
                  </div>
                  <div className="inline-flex items-center text-xs font-semibold px-3 py-1.5 rounded-full bg-white/80 text-blue-700 border border-blue-100 shadow-sm">
                    IA que reduz o trabalho fora da sala de aula
                  </div>
                </div>

                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-gray-900 dark:text-white leading-tight mb-6">
                  Transforme{' '}
                  <span className="relative inline-block px-2 py-1 rounded-md bg-amber-300 text-gray-900">
                    horas de tarefas
                  </span>{' '}
                  em minutos.
                  <br />
                  <span className="inline-block bg-gradient-to-r from-cyan-600 via-blue-600 to-blue-800 bg-clip-text text-transparent text-4xl sm:text-5xl lg:text-6xl">
                    Com IA pensada para professores.
                  </span>
                </h1>

                <p className="text-lg text-gray-600 dark:text-gray-300 mb-8 leading-relaxed max-w-xl">
                  Centralize turmas, atividades e comunicação em um só lugar. A plataforma automatiza o trabalho fora da sala de aula e
                  deixa você focar na parte pedagógica.
                </p>

                <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
                  <Button
                    size="lg"
                    onClick={() => navigate('/register')}
                    leftIcon={<Sparkles className="w-5 h-5" />}
                    className="relative bg-gradient-to-r from-amber-400 via-amber-500 to-amber-400 hover:from-amber-500 hover:via-amber-600 hover:to-amber-500 text-gray-900 font-bold shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300 overflow-hidden group"
                  >
                    <span className="relative z-10">Testar como Professor</span>
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
                  </Button>
                  <Button
                    size="lg"
                    onClick={() => {
                      const el = document.getElementById('problema');
                      if (el) {
                        el.scrollIntoView({ behavior: 'smooth' });
                      }
                    }}
                    variant="gradientOutline"
                    className="border-2 border-blue-600 text-blue-600 hover:bg-blue-50"
                  >
                    Ver como reduz minha carga
                  </Button>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8, delay: 0.2 }}
                className="relative"
              >
                <div className="w-full h-96 bg-gradient-to-br from-cyan-100 via-blue-100 to-blue-200 rounded-3xl shadow-2xl overflow-hidden relative flex items-center justify-center">
                  <div className="absolute inset-6 bg-white rounded-2xl shadow-lg p-6 flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-2">
                        <div className="w-9 h-9 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-lg flex items-center justify-center">
                          <Brain className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <div className="h-3 bg-gray-200 rounded w-24 mb-1" />
                          <div className="h-2 bg-gray-100 rounded w-16" />
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <div className="w-6 h-6 bg-green-100 rounded-full" />
                        <div className="w-6 h-6 bg-yellow-100 rounded-full" />
                        <div className="w-6 h-6 bg-red-100 rounded-full" />
                      </div>
                    </div>
                    <div className="space-y-3 mb-4">
                      <div className="h-3 bg-blue-100 rounded w-3/4" />
                      <div className="h-3 bg-gray-100 rounded w-2/3" />
                      <div className="h-3 bg-gray-100 rounded w-1/2" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="h-16 bg-gradient-to-br from-cyan-50 to-blue-50 rounded-lg" />
                      <div className="h-16 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg" />
                    </div>
                    <div className="mt-4 flex justify-center">
                      <div className="w-28 h-8 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-lg" />
                    </div>
                  </div>

                  {!isMotionLight && (
                    <>
                      <motion.div
                        animate={{ y: [0, -10, 0] }}
                        transition={{ duration: 3, repeat: Infinity }}
                        className="absolute top-4 right-4 w-16 h-16 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-2xl shadow-xl flex items-center justify-center"
                      >
                        <Clock className="w-8 h-8 text-white" />
                      </motion.div>
                      <motion.div
                        animate={{ y: [0, 10, 0] }}
                        transition={{ duration: 3, repeat: Infinity, delay: 1 }}
                        className="absolute bottom-4 left-4 w-14 h-14 bg-gradient-to-r from-blue-500 to-blue-700 rounded-xl shadow-xl flex items-center justify-center"
                      >
                        <Heart className="w-7 h-7 text-white" />
                      </motion.div>
                    </>
                  )}
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        <section id="problema" className="relative py-16 lg:py-20 bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 overflow-hidden">
          <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05] hidden md:block" style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 35px, currentColor 35px, currentColor 36px), repeating-linear-gradient(90deg, transparent, transparent 35px, currentColor 35px, currentColor 36px)', backgroundSize: '36px 36px' }}></div>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-center mb-12"
            >
              <div className="inline-flex items-center text-xs font-semibold px-3 py-1 rounded-full bg-amber-100 text-amber-800 mb-4">
                Realidade hoje
              </div>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-6 leading-tight">
                Muito trabalho fora da sala, pouco tempo para ensinar
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                Horas corrigindo atividades, preenchendo planilhas e respondendo mensagens roubam o tempo de preparação e atenção aos
                alunos.
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
              {problemStats.map((stat, index) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  whileHover={{ y: -4, transition: { duration: 0.2 } }}
                  className="relative bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-lg hover:shadow-xl border border-blue-100/60 dark:border-blue-900/40 h-full flex flex-col overflow-hidden transition-shadow duration-300"
                >
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-300 via-amber-400 to-amber-300"></div>
                  <div className="text-3xl font-extrabold bg-gradient-to-r from-cyan-600 via-blue-600 to-blue-800 bg-clip-text text-transparent mb-3">
                    {stat.label}
                  </div>
                  <p className="text-sm text-muted-foreground flex-grow">{stat.description}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        <section id="como-ajudamos" className="relative py-20 lg:py-28 bg-gradient-to-br from-cyan-50/50 via-blue-50/30 to-indigo-50/50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-amber-200/20 rounded-full blur-3xl hidden lg:block"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-200/20 rounded-full blur-3xl hidden lg:block"></div>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-center mb-12"
            >
              <div className="inline-flex items-center text-xs font-semibold px-3 py-1 rounded-full bg-amber-100 text-amber-800 mb-4">
                Como a plataforma ajuda
              </div>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-6 leading-tight">
                Como a TamanduAI reduz sua carga fora da sala de aula
              </h2>
              <p className="text-lg text-muted-foreground max-w-3xl mx-auto leading-relaxed">
                Em vez de ser mais uma plataforma para você cuidar, a TamanduAI organiza e automatiza o que já consome seu tempo fora
                do horário de aula.
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
              {pillars.map((pillar, index) => {
                const tabColors = [
                  'from-amber-400 to-amber-500',
                  'from-cyan-400 to-cyan-500',
                  'from-blue-400 to-blue-500'
                ];
                return (
                  <motion.div
                    key={pillar.title}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: index * 0.1 }}
                    whileHover={{ y: -6, transition: { duration: 0.2 } }}
                    className="relative bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-lg hover:shadow-2xl border border-blue-100/60 dark:border-blue-900/40 flex flex-col overflow-hidden transition-all duration-300 group"
                  >
                    <div className={`absolute top-0 left-0 w-16 h-1.5 bg-gradient-to-r ${tabColors[index]} rounded-br-lg`}></div>
                    <div className="absolute top-0 right-4 w-8 h-8 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-gray-800 dark:to-gray-700 rounded-full opacity-40 group-hover:opacity-60 transition-opacity">
                      <pillar.icon className="w-4 h-4 text-blue-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-30" />
                    </div>
                    <div className="w-12 h-12 bg-gradient-to-r from-cyan-500 via-blue-600 to-blue-700 rounded-xl flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform duration-300">
                      <pillar.icon className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{pillar.title}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">{pillar.description}</p>
                    <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
                      {pillar.items.map((item) => (
                        <li key={item} className="flex items-start gap-2">
                          <span className="mt-1 w-2 h-2 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </motion.div>
                );
              })}
            </div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="mt-12 text-center"
            >
              <p className="text-lg text-gray-600 dark:text-gray-300 mb-6">
                Quer conhecer todas as funcionalidades em detalhes?
              </p>
              <Link to="/funcionalidades">
                <Button
                  size="lg"
                  variant="gradientOutline"
                  rightIcon={<ArrowRight className="w-5 h-5" />}
                  className="text-lg px-8 py-6 font-bold"
                >
                  Ver Todas as Funcionalidades
                </Button>
              </Link>
            </motion.div>
          </div>
        </section>

        <section id="pesquisa" className="relative py-20 lg:py-28 bg-gradient-to-br from-slate-50 via-amber-50/20 to-slate-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 overflow-hidden">
          <div className="absolute top-10 left-10 w-24 h-2 bg-amber-300/40 rounded-full rotate-12 hidden lg:block"></div>
          <div className="absolute bottom-10 right-10 w-32 h-2 bg-blue-300/40 rounded-full -rotate-12 hidden lg:block"></div>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
            <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center mb-16">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6 }}
              >
                <div className="inline-flex items-center text-xs font-semibold px-3 py-1 rounded-full bg-amber-100 text-amber-800 mb-4">
                  Pesquisa e roadmap
                </div>
                <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-6 leading-tight">
                  Pesquisa com professores e evolução contínua
                </h2>
                <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
                  A TamanduAI nasceu ouvindo docentes da educação básica e continua crescendo a partir do uso real em turmas.
                </p>
                <div className="flex flex-col sm:flex-row gap-4">
                  <Link
                    to="/ideias"
                    className="inline-flex items-center gap-2 text-amber-600 dark:text-amber-400 font-semibold hover:gap-3 transition-all group"
                  >
                    <Lightbulb className="w-5 h-5" />
                    Deixar sua ideia
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </Link>
                  <Link
                    to="/roadmap"
                    className="inline-flex items-center gap-2 text-blue-600 dark:text-blue-400 font-semibold hover:gap-3 transition-all group"
                  >
                    Ver roadmap completo
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </div>
              </motion.div>

              <div className="grid grid-cols-1 gap-6">
                {researchStats.map((stat, index) => (
                  <motion.div
                    key={stat.label}
                    initial={{ opacity: 0, x: 20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.6, delay: index * 0.15 }}
                    whileHover={{ scale: 1.02, transition: { duration: 0.2 } }}
                    className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-lg hover:shadow-xl border border-amber-100/60 dark:border-amber-900/40 flex items-start gap-4 transition-all duration-300"
                  >
                    <div className="text-4xl lg:text-5xl font-extrabold bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 bg-clip-text text-transparent flex-shrink-0">
                      {stat.label}
                    </div>
                    <p className="text-sm text-muted-foreground pt-2">{stat.description}</p>
                  </motion.div>
                ))}
              </div>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              whileHover={{ scale: 1.01, transition: { duration: 0.2 } }}
              className="relative bg-gradient-to-r from-amber-500/10 via-blue-500/10 to-cyan-500/10 dark:from-amber-500/20 dark:via-blue-500/20 dark:to-cyan-500/20 border border-amber-300/30 rounded-2xl p-8 md:p-10 shadow-lg hover:shadow-xl flex flex-col md:flex-row items-start md:items-center gap-6 overflow-hidden transition-all duration-300"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-300 via-blue-300 to-cyan-300"></div>
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg flex-shrink-0">
                <Users className="w-8 h-8 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-2xl lg:text-3xl font-bold text-foreground mb-3 leading-tight">
                  De MVP a plataforma em expansão
                </h3>
                <p className="text-base text-muted-foreground leading-relaxed mb-4">
                  Cada funcionalidade nasceu de necessidades reais documentadas na pesquisa com professores. Do chatbot IA ao antiplágio, tudo é testado e aprimorado em salas de aula reais.
                </p>
                <div className="flex flex-wrap gap-3">
                  <div className="inline-flex items-center gap-2 text-sm font-medium text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/20 px-3 py-1.5 rounded-full">
                    <Shield className="w-4 h-4" />
                    Multi-perfil
                  </div>
                  <div className="inline-flex items-center gap-2 text-sm font-medium text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/20 px-3 py-1.5 rounded-full">
                    <BarChart3 className="w-4 h-4" />
                    Analytics em tempo real
                  </div>
                  <div className="inline-flex items-center gap-2 text-sm font-medium text-cyan-700 dark:text-cyan-300 bg-cyan-50 dark:bg-cyan-900/20 px-3 py-1.5 rounded-full">
                    <Calendar className="w-4 h-4" />
                    Calendário integrado
                  </div>
                </div>
              </div>
              <div>
                <Button
                  size="lg"
                  onClick={() => navigate('/register')}
                  leftIcon={<Sparkles className="w-5 h-5" />}
                  className="relative bg-gradient-to-r from-amber-400 via-amber-500 to-amber-400 hover:from-amber-500 hover:via-amber-600 hover:to-amber-500 text-gray-900 font-bold shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300 px-8 py-5 text-base whitespace-nowrap overflow-hidden group"
                >
                  <span className="relative z-10">Começar agora</span>
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
                </Button>
              </div>
            </motion.div>
          </div>
        </section>

        <section className="relative py-16 lg:py-20 bg-gradient-to-br from-cyan-500 via-blue-600 to-blue-800 overflow-hidden">
          <div className="absolute top-10 right-10 w-32 h-32 bg-amber-400/10 rounded-full blur-2xl hidden lg:block"></div>
          <div className="absolute bottom-10 left-10 w-40 h-40 bg-white/5 rounded-full blur-3xl hidden lg:block"></div>
          <div className="absolute top-1/2 left-1/4 w-2 h-20 bg-amber-300/15 rounded-full rotate-12 hidden lg:block"></div>
          <div className="absolute top-1/3 right-1/4 w-2 h-16 bg-white/10 rounded-full -rotate-12 hidden lg:block"></div>
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4">
                Pronto para reduzir sua sobrecarga digital?
              </h2>
              <p className="text-lg text-white/80 mb-8 max-w-2xl mx-auto">
                Participe do programa Beta, experimente a plataforma no seu contexto real e nos ajude a construir a melhor solução
                possível para professores brasileiros.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 justify-center items-center">
                <Button
                  size="lg"
                  onClick={() => navigate('/register')}
                  leftIcon={<Sparkles className="w-6 h-6" />}
                  className="relative bg-gradient-to-r from-amber-400 to-amber-500 text-gray-900 hover:from-amber-500 hover:to-amber-600 shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300 text-lg px-10 py-7 font-bold overflow-hidden group"
                >
                  <span className="relative z-10">Participar do Beta</span>
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => navigate('/contact')}
                  leftIcon={<MessageSquare className="w-6 h-6" />}
                  className="bg-transparent text-white border-2 border-white hover:bg-white/10 hover:scale-105 transition-all duration-300 text-lg px-10 py-7 font-bold shadow-lg"
                >
                  Falar com o time
                </Button>
              </div>
            </motion.div>
          </div>
        </section>
      </main>

      <Footer />

      <CookieBanner />
    </div>
  );
}
