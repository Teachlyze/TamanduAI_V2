import React from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import Seo from '@/shared/components/Seo';
import { SEO, StructuredData } from '@/shared/components/seo/StructuredData';
import { Button } from '@/shared/components/ui/button';
import { Card } from '@/shared/components/ui/card';
import SkipLinks from '@/shared/components/SkipLinks';
import CookieBanner from '@/shared/components/CookieBanner';
import Footer from '@/shared/components/Footer';
import {
  BookOpen, Users, Sparkles, TrendingUp, Brain,
  Clock, Lightbulb, Target, Rocket, Calendar, Shield,
  Star, Heart, CheckCircle, ArrowRight, Globe, Award,
  Zap, MessageSquare, FileText, BarChart3,
  CheckCircle2, XCircle, ChevronRight, Mail,
  Lock, Smartphone, Laptop, Headphones, BadgeCheck, FileEdit, Upload, ClipboardCheck
} from 'lucide-react';

export default function LandingPage() {
  const navigate = useNavigate();

  const features = [
    { icon: Brain, title: 'Chatbot com RAG v2.0', description: 'Treine o chatbot com seus materiais (PDF, Word, PPT, URLs) para responder dúvidas 24/7', gradient: "from-blue-500 to-blue-600", badge: 'Até 200 msgs/dia' },
    { icon: FileEdit, title: 'Correção Automática com IA', description: 'Correção inteligente de atividades com feedback detalhado gerado por IA', gradient: "from-purple-500 to-purple-600", badge: 'Economia de 70%' },
    { icon: Shield, title: 'Antiplágio Winston AI', description: 'Detecção automática de plágio e conteúdo gerado por IA', gradient: "from-red-500 to-red-600", badge: '100 verificações/hora' },
    { icon: BarChart3, title: 'Analytics em Tempo Real', description: 'Dashboards completos com métricas de desempenho e relatórios exportáveis', gradient: "from-indigo-500 to-blue-600", badge: 'Exportação CSV' },
    { icon: Calendar, title: 'Calendário de Eventos', description: 'Visualize prazos, aulas e eventos em um calendário sincronizado', gradient: "from-blue-500 to-cyan-500", badge: 'Aulas recorrentes' },
    { icon: Users, title: 'Gestão Completa', description: 'Organize turmas, professores e alunos com sistema multi-perfil', gradient: "from-cyan-500 to-teal-500", badge: 'Multi-perfil' },
    { icon: Upload, title: 'Importar Atividades', description: 'Importe atividades de TXT, PDF, DOCX, ODT com extração automática', gradient: "from-green-500 to-emerald-500", badge: '4 formatos' },
    { icon: MessageSquare, title: 'Sistema de Eventos', description: 'Crie eventos personalizados e selecione alunos por turma ou individual', gradient: "from-purple-500 to-pink-500", badge: 'Personalizado' }
  ];

  const benefits = [
    { icon: Clock, title: 'Economiza Tempo', description: 'Automatize correções e tarefas administrativas', stat: "Auto" },
    { icon: TrendingUp, title: 'Analytics Completo', description: 'Dashboards e relatórios em tempo real', stat: "CSV" },
    { icon: Lightbulb, title: 'Facilita Ensino', description: 'Chatbot 24/7 treinado com seus materiais', stat: "24/7" },
    { icon: Target, title: 'Organização', description: 'Gestão centralizada de turmas e conteúdo', stat: "∞" }
  ];

  // Removido: stats e testimonials fictícios (aguardando dados reais de usuários)

  const allFeatures = [
    { icon: Brain, title: "Chatbot com RAG v2.0", description: "Treine o chatbot com seus materiais (PDF, Word, PPT, URLs) para responder dúvidas 24/7", color: "violet" },
    { icon: FileEdit, title: "Correção Automática com IA", description: "Sistema de correção inteligente com feedback detalhado gerado por IA", color: "purple" },
    { icon: Shield, title: "Antiplágio Winston AI", description: "Detecção automática com IA (100 checks/hora) de plágio e conteúdo gerado por IA", color: "red" },
    { icon: BarChart3, title: "Analytics em Tempo Real", description: "Dashboards completos com estatísticas e métricas de desempenho", color: "indigo" },
    { icon: Calendar, title: "Calendário de Eventos", description: "Visualize e gerencie todos os prazos, aulas e eventos", color: "blue" },
    { icon: Upload, title: "Importar Atividades", description: "Upload de TXT, PDF, DOCX, ODT com extração automática", color: "cyan" },
    { icon: ClipboardCheck, title: "Controle de Frequência", description: "Registre e acompanhe presença dos alunos em aulas e eventos", color: "green" },
    { icon: Users, title: "Gestão Multi-perfil", description: "Professor, Aluno e Escola em um só lugar", color: "indigo" },
    { icon: FileText, title: "Exportação de Relatórios", description: "Exporte analytics e notas em formato CSV", color: "green" },
    { icon: MessageSquare, title: "Sistema de Eventos", description: "Crie eventos e selecione alunos por turma ou individual", color: "pink" },
    { icon: FileText, title: "Gestão de Materiais", description: "Organize e compartilhe materiais didáticos com as turmas", color: "blue" },
    { icon: Users, title: "Sistema de Turmas", description: "Crie e gerencie turmas com código de convite", color: "cyan" },
    { icon: BarChart3, title: "Relatórios de Notas", description: "Visualize estatísticas e histórico de notas dos alunos", color: "indigo" },
  ];

  const howItWorks = [
    { step: "1", title: "Cadastre-se Grátis", description: "Crie sua conta em menos de 2 minutos e escolha seu perfil (Professor ou Aluno)", icon: Rocket },
    { step: "2", title: "Configure sua Turma", description: "Crie turmas, adicione alunos via código de convite e organize seu conteúdo", icon: Users },
    { step: "3", title: "Treine o Chatbot", description: "Faça upload de PDFs, Word, PPT ou URLs para o chatbot responder dúvidas 24/7", icon: Brain },
    { step: "4", title: "Crie Atividades", description: "Crie atividades interativas com correção automática por IA e antiplágio integrado", icon: Sparkles },
    { step: "5", title: "Organize Materiais", description: "Faça upload e compartilhe materiais didáticos com suas turmas", icon: Upload },
    { step: "6", title: "Acompanhe Resultados", description: "Visualize analytics, estatísticas e exporte relatórios em CSV", icon: TrendingUp },
  ];

  const comparison = [
    { feature: "Correção automática de atividades com IA", before: false, after: true },
    { feature: "Chatbot IA treinado com seus materiais", before: false, after: true },
    { feature: "Antiplágio automático (Winston AI)", before: false, after: true },
    { feature: "Analytics e dashboards em tempo real", before: false, after: true },
    { feature: "Calendário sincronizado com eventos", before: false, after: true },
    { feature: "Controle de frequência digital", before: false, after: true },
    { feature: "Importação automática de atividades", before: false, after: true },
    { feature: "Relatórios exportáveis em CSV", before: false, after: true },
    { feature: "Gestão de múltiplas turmas", before: false, after: true },
    { feature: "Sistema de eventos personalizado", before: false, after: true },
    { feature: "Gestão de materiais didáticos", before: false, after: true },
    { feature: "Sistema multi-perfil (Professor/Aluno/Escola)", before: false, after: true },
    { feature: "Tempo gasto em tarefas administrativas", before: true, after: false },
    { feature: "Correção manual de todas atividades", before: true, after: false },
    { feature: "Planilhas desorganizadas e dispersas", before: true, after: false },
    { feature: "Controle de presença em papel", before: true, after: false },
  ];

  const faqs = [
    { q: "Qual o estágio atual do produto?", a: "O TamanduAI está em fase Beta com funcionalidades implementadas: chatbot com RAG, correção automática com IA, antiplágio, analytics e gestão de turmas." },
    { q: "Preciso de conhecimento técnico?", a: "Não! A interface é intuitiva com tutoriais completos e documentação detalhada para começar em minutos." },
    { q: "Os dados estão seguros?", a: "Sim! Somos 100% compatíveis com a LGPD e os dados ficam armazenados em servidores seguros com criptografia." },
    { q: "Funciona em dispositivos móveis?", a: "Sim! O TamanduAI é 100% responsivo e funciona perfeitamente em computadores, tablets e smartphones." },
    { q: "Como funciona o chatbot IA?", a: "Você treina o chatbot fazendo upload de PDFs, Word, PowerPoint ou URLs. Ele usa RAG v2.0 para responder dúvidas dos alunos 24/7 com precisão." },
    { q: "Tem limite de turmas ou alunos?", a: "Não! Você pode adicionar quantas turmas, alunos e professores precisar. Escalamos conforme o crescimento." },
    { q: "Como funciona a correção automática?", a: "Nossa IA analisa as respostas dos alunos e fornece feedback detalhado, economizando até 70% do tempo de correção." },
    { q: "Como funciona o sistema antiplágio?", a: "Usamos Winston AI (100 checks/hora) para detectar plágio e conteúdo gerado por IA automaticamente em todas as submissões." },
  ];

  const useCases = [
    { icon: BookOpen, title: "Professores", description: "Reduza trabalho manual e foque no ensino", gradient: "from-blue-500 to-cyan-500" },
    { icon: Users, title: "Escolas", description: "Centralize gestão de toda instituição", gradient: "from-blue-500 to-cyan-500" },
    { icon: Brain, title: "Tutores", description: "Acompanhe alunos individualmente", gradient: "from-indigo-500 to-blue-500" },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Seo
        title="TamanduAI — Plataforma Educacional com Inteligência Artificial"
        description="Plataforma educacional completa com IA: chatbot RAG, correção automática, antiplágio e analytics em tempo real. Solução moderna para professores, alunos e escolas."
        path="/"
      />
      
      {/* SEO Otimizado para GEO (Generative Engine Optimization) */}
      <SEO
        title="TamanduAI - Plataforma Educacional com IA para Professores e Alunos"
        description="Automatize correções com IA, detecte plágio com Winston AI, use chatbot educacional com RAG, analytics em tempo real. Plataforma brasileira LGPD compliant. Plano gratuito disponível."
        keywords="plataforma educacional IA, correção automática inteligência artificial, detecção plágio Winston AI, chatbot educacional RAG, analytics educacional, gestão turmas, professores, alunos, Brasil, LGPD"
        url="https://tamanduai.com"
        image="https://tamanduai.com/og-image.png"
      />
      
      {/* Dados Estruturados para IAs (ChatGPT, Perplexity, Google AI) */}
      <StructuredData type="organization" />
      <StructuredData type="software" />
      
      <StructuredData 
        type="howto" 
        data={{
          name: "Como usar TamanduAI - Guia para professores",
          description: "Passo a passo completo para começar a usar TamanduAI",
          steps: [
            { name: "Criar conta gratuita", text: "Cadastre-se em tamanduai.com/register como Professor" },
            { name: "Criar primeira turma", text: "No dashboard, clique em Nova Turma e defina nome e disciplina" },
            { name: "Treinar chatbot", text: "Faça upload de PDFs, slides e materiais para treinar o chatbot com RAG" },
            { name: "Criar atividades", text: "Crie atividades com correção automática e detecção de plágio" },
            { name: "Acompanhar analytics", text: "Visualize dashboards e exporte relatórios em CSV" }
          ]
        }} 
      />
      
      {/* Header */}
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
                <a href="#features" className="text-sm text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 hover:underline underline-offset-4 font-medium transition-colors">Recursos</a>
                <Link to="/professores" className="text-sm text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 hover:underline underline-offset-4 font-medium transition-colors">Para Professores</Link>
                <Link to="/roadmap" className="text-sm text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 hover:underline underline-offset-4 font-medium transition-colors">Roadmap</Link>
                <Link to="/pricing" className="text-sm text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 hover:underline underline-offset-4 font-medium transition-colors">Preços</Link>
                <a href="#technology" className="text-sm text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 hover:underline underline-offset-4 font-medium transition-colors">Tecnologia</a>
                <Link to="/docs" className="text-sm text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 hover:underline underline-offset-4 font-medium transition-colors">Docs</Link>
                <Link to="/contact" className="text-sm text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 hover:underline underline-offset-4 font-medium transition-colors">Contato</Link>
              </nav>
            </div>
            <div className="flex items-center space-x-3">
              <Link to="/login">
                <Button variant="ghost" size="sm" className="text-sm">Entrar</Button>
              </Link>
              <Link to="/register">
                <Button 
                  size="sm"
                  rightIcon={<ArrowRight className="w-4 h-4" />} 
                  variant="gradient"
                >
                  Começar Grátis
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </motion.header>

      {/* Main */}
      <main id="main-content" className="flex-grow w-full">
        <SkipLinks />
        {/* Hero */}
        <section className="relative overflow-hidden py-16 lg:py-24 bg-gradient-to-br from-cyan-50 via-blue-50 to-blue-100 dark:from-gray-900 dark:via-gray-800 dark:to-background">
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <motion.div 
              animate={{ 
                scale: [1, 1.2, 1],
                rotate: [0, 90, 0]
              }}
              transition={{ 
                duration: 20,
                repeat: Infinity,
                ease: "linear"
              }}
              className="absolute top-0 right-0 w-96 h-96 bg-cyan-400/20 rounded-full blur-3xl"
            />
            <motion.div
              animate={{ 
                scale: [1, 1.3, 1],
                rotate: [0, -90, 0]
              }}
              transition={{ 
                duration: 15,
                repeat: Infinity,
                ease: "linear"
              }}
              className="absolute bottom-0 left-0 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl"
            />
            <motion.div
              animate={{ 
                scale: [1, 1.1, 1],
                x: [0, 100, 0]
              }}
              transition={{ 
                duration: 25,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              className="absolute top-1/2 left-1/2 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl"
            />
          </div>
          
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="text-center lg:text-left">
                <motion.div 
                  initial={{ opacity: 0, y: 10 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  transition={{ duration: 0.6 }}
                  className="flex flex-wrap items-center gap-3 mb-6"
                >
                  <div className="inline-flex items-center text-xs font-semibold px-3 py-1.5 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md">
                    <Sparkles className="w-3.5 h-3.5 mr-1.5" />Plataforma Educacional com IA
                  </div>
                  <div className="inline-flex items-center text-xs font-bold px-3 py-1.5 rounded-full bg-blue-600 text-white shadow-md">
                    BETA
                  </div>
                </motion.div>
                
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-gray-900 dark:text-white leading-tight mb-6">
                  Educação moderna com <span className="inline-block bg-gradient-to-r from-cyan-600 via-blue-600 to-blue-800 bg-clip-text text-transparent text-5xl sm:text-6xl lg:text-7xl">Inteligência Artificial</span>
                </h1>
                
                <p className="text-lg text-gray-600 dark:text-gray-300 mb-8 leading-relaxed">
                  <strong className="text-blue-600 dark:text-blue-400">Versão 2.0:</strong> Chatbot com RAG, Correção Automática com IA, Antiplágio Winston AI, Analytics em Tempo Real e Calendário de Eventos. Tecnologia de ponta para transformar a educação.
                </p>

                <div className="flex flex-col sm:flex-row gap-3">
                  <Button 
                    size="lg" 
                    onClick={() => navigate('/register')} 
                    leftIcon={<Rocket className="w-5 h-5" />}
                    variant="gradient"
                  >
                    Testar Plataforma
                  </Button>
                  <Button 
                    size="lg" 
                    onClick={() => navigate('/contact')} 
                    leftIcon={<Mail className="w-5 h-5" />}
                    variant="gradientOutline"
                    className="border-2 border-blue-600 text-blue-600 hover:bg-blue-50"
                  >
                    Falar com Time
                  </Button>
                </div>
              </motion.div>

              <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.8, delay: 0.2 }} className="relative">
                <div className="relative">
                  <div className="w-full h-96 bg-gradient-to-br from-cyan-100 via-blue-100 to-blue-200 rounded-3xl shadow-2xl overflow-hidden relative">
                    <div className="absolute inset-4 bg-white rounded-2xl shadow-lg p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-2">
                          <div className="w-8 h-8 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-lg"></div>
                          <div className="h-4 bg-gray-200 rounded w-24"></div>
                        </div>
                        <div className="flex space-x-2">
                          <div className="w-6 h-6 bg-green-100 rounded-full"></div>
                          <div className="w-6 h-6 bg-yellow-100 rounded-full"></div>
                          <div className="w-6 h-6 bg-red-100 rounded-full"></div>
                        </div>
                      </div>
                      <div className="space-y-3">
                        <div className="h-3 bg-gray-100 rounded w-3/4"></div>
                        <div className="h-3 bg-gray-100 rounded w-1/2"></div>
                        <div className="h-3 bg-blue-100 rounded w-2/3"></div>
                      </div>
                      <div className="mt-6 grid grid-cols-2 gap-4">
                        <div className="h-16 bg-gradient-to-br from-cyan-50 to-blue-50 rounded-lg"></div>
                        <div className="h-16 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg"></div>
                      </div>
                      <div className="mt-4 flex justify-center">
                        <div className="w-32 h-8 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-lg"></div>
                      </div>
                    </div>
                  </div>
                  
                  <motion.div animate={{ y: [0, -10, 0] }} transition={{ duration: 3, repeat: Infinity }} className="absolute -top-4 -right-4 w-20 h-20 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-2xl shadow-xl flex items-center justify-center">
                    <Brain className="w-10 h-10 text-white" />
                  </motion.div>
                  <motion.div animate={{ y: [0, 10, 0] }} transition={{ duration: 3, repeat: Infinity, delay: 1 }} className="absolute -bottom-4 -left-4 w-16 h-16 bg-gradient-to-r from-blue-500 to-blue-700 rounded-xl shadow-xl flex items-center justify-center">
                    <Sparkles className="w-8 h-8 text-white" />
                  </motion.div>
                  <motion.div animate={{ y: [0, -8, 0] }} transition={{ duration: 4, repeat: Infinity, delay: 2 }} className="absolute top-1/2 -left-6 w-12 h-12 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full shadow-lg flex items-center justify-center">
                    <Heart className="w-6 h-6 text-white" />
                  </motion.div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Features v2.0 */}
        <section id="features" className="py-20 bg-background">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} className="text-center mb-16">
              <div className="inline-flex items-center px-3 py-1.5 bg-gradient-to-r from-cyan-600 via-blue-600 to-blue-800 rounded-full text-xs font-semibold text-white shadow-sm mb-4">
                <Sparkles className="w-3.5 h-3.5 mr-1.5" />Funcionalidades Principais
              </div>
              <h2 className="text-4xl lg:text-5xl font-bold text-foreground mb-6">
                Tecnologias implementadas com <span className="bg-gradient-to-r from-cyan-600 via-blue-600 to-blue-800 bg-clip-text text-transparent">Inteligência Artificial</span>
              </h2>
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto">Chatbot RAG, Correção com IA, Antiplágio, Analytics e muito mais</p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {features.map((f, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: i * 0.1 }} className="group h-full">
                  <div className="relative p-6 bg-card text-card-foreground rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 border border-border h-full flex flex-col">
                    <div className={`w-16 h-16 bg-gradient-to-r ${f.gradient} rounded-2xl flex items-center justify-center mb-6 shadow-lg group-hover:scale-110 transition-transform`}>
                      <f.icon className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="text-lg font-bold text-foreground mb-3">{f.title}</h3>
                    <p className="text-muted-foreground leading-relaxed flex-grow mb-4">{f.description}</p>
                    {f.badge && (
                      <div className="inline-flex items-center px-3 py-1 bg-gradient-to-r from-cyan-100 to-blue-100 dark:from-cyan-900/30 dark:to-blue-900/30 rounded-full text-xs font-semibold text-blue-700 dark:text-blue-300">
                        <Zap className="w-3 h-3 mr-1" />
                        {f.badge}
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Benefits */}
        <section id="benefits" className="py-20 bg-background">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} className="text-center mb-16">
              <h2 className="text-4xl lg:text-5xl font-bold text-foreground mb-6">
                Impacto <span className="bg-gradient-to-r from-cyan-600 via-blue-600 to-blue-800 bg-clip-text text-transparent">mensurável</span>
              </h2>
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto">Resultados reais na prática educacional</p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {benefits.map((b, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: i * 0.1 }} className="group h-full">
                  <div className="p-6 bg-card rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 border border-border">
                    <div className="flex items-center justify-between mb-6">
                      <div className="w-12 h-12 bg-gradient-to-r from-cyan-500 via-blue-600 to-blue-700 rounded-xl flex items-center justify-center mb-4 shadow-lg">
                        <b.icon className="w-6 h-6 text-white" />
                      </div>
                      <div className="text-2xl font-bold bg-gradient-to-r from-cyan-600 via-blue-600 to-blue-800 bg-clip-text text-transparent">{b.stat}</div>
                    </div>
                    <h3 className="text-lg font-bold text-foreground mb-3">{b.title}</h3>
                    <p className="text-muted-foreground leading-relaxed flex-grow">{b.description}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>


        {/* All Features Grid */}
        <section className="py-20 bg-background">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} className="text-center mb-16">
              <h2 className="text-4xl lg:text-5xl font-bold text-foreground mb-6">
                Tudo que você <span className="bg-gradient-to-r from-cyan-600 via-blue-600 to-blue-800 bg-clip-text text-transparent">precisa</span>
              </h2>
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto">Uma plataforma completa para modernizar sua educação</p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {allFeatures.map((feature, i) => {
                const colorMap = {
                  violet: 'from-violet-400 to-violet-600',
                  blue: 'from-blue-400 to-blue-600',
                  indigo: 'from-indigo-400 to-indigo-600',
                  emerald: 'from-emerald-400 to-emerald-600',
                  cyan: 'from-cyan-400 to-cyan-600',
                  orange: 'from-orange-400 to-orange-600',
                  red: 'from-red-400 to-red-600',
                  yellow: 'from-yellow-400 to-yellow-600',
                  purple: 'from-purple-400 to-purple-600',
                  pink: 'from-pink-400 to-pink-600'
                };
                return (
                  <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: i * 0.05 }} className="group">
                    <div className="p-4 bg-card text-card-foreground rounded-xl shadow-md hover:shadow-xl transition-all duration-300 border border-border h-full hover:scale-105 hover:border-primary/50">
                      <div className={`w-10 h-10 bg-gradient-to-r ${colorMap[feature.color] || 'from-blue-400 to-blue-600'} rounded-lg flex items-center justify-center mb-3 group-hover:scale-110 transition-transform shadow-lg`}>
                        <feature.icon className="w-6 h-6 text-white" />
                      </div>
                      <h3 className="text-base font-semibold text-foreground mb-2">{feature.title}</h3>
                      <p className="text-sm text-muted-foreground">{feature.description}</p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="py-20 bg-gradient-to-br from-cyan-50 via-blue-50 to-blue-100 dark:from-gray-800 dark:via-gray-700 dark:to-gray-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} className="text-center mb-16">
              <h2 className="text-4xl lg:text-5xl font-bold text-foreground mb-6">
                Como <span className="bg-gradient-to-r from-cyan-600 via-blue-600 to-blue-800 bg-clip-text text-transparent">funciona</span>
              </h2>
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto">Comece em 6 passos simples e transforme sua sala de aula</p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {howItWorks.map((step, i) => (
                <motion.div 
                  key={i} 
                  initial={{ opacity: 0, y: 30 }} 
                  whileInView={{ opacity: 1, y: 0 }} 
                  transition={{ duration: 0.6, delay: i * 0.1 }} 
                  className="relative group h-full"
                >
                  <div className="text-center bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300 border-2 border-transparent hover:border-blue-500/50 hover:scale-105 h-full flex flex-col">
                    <div className="relative inline-block mb-6 mx-auto">
                      <div className="w-20 h-20 bg-gradient-to-br from-cyan-600 via-blue-600 to-blue-800 rounded-2xl flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform">
                        <span className="text-3xl font-bold text-white">{step.step}</span>
                      </div>
                      <div className="absolute -bottom-3 -right-3 w-12 h-12 bg-white dark:bg-gray-700 rounded-xl flex items-center justify-center shadow-lg border-2 border-cyan-200 dark:border-cyan-800 group-hover:scale-110 transition-transform">
                        <step.icon className="w-6 h-6 text-cyan-600 dark:text-cyan-400" />
                      </div>
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">{step.title}</h3>
                    <p className="text-gray-600 dark:text-gray-300 leading-relaxed flex-grow">{step.description}</p>
                  </div>
                  {(i + 1) % 3 !== 0 && i < howItWorks.length - 1 && (
                    <div className="hidden lg:flex absolute top-1/2 -right-4 transform -translate-y-1/2 z-10">
                      <div className="w-8 h-8 bg-gradient-to-r from-cyan-600 via-blue-600 to-blue-800 rounded-full flex items-center justify-center shadow-lg">
                        <ChevronRight className="w-5 h-5 text-white" />
                      </div>
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Comparison Table */}
        <section className="py-20 bg-background">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} className="text-center mb-16">
              <h2 className="text-4xl lg:text-5xl font-bold text-foreground mb-6">
                Antes vs <span className="bg-gradient-to-r from-cyan-600 via-blue-600 to-blue-800 bg-clip-text text-transparent">Depois</span>
              </h2>
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto">Veja a transformação completa na sua rotina educacional com todas as funcionalidades</p>
            </motion.div>

            <div className="grid md:grid-cols-2 gap-8">
              {/* Antes */}
              <motion.div 
                initial={{ opacity: 0, x: -30 }} 
                whileInView={{ opacity: 1, x: 0 }} 
                transition={{ duration: 0.8 }}
                className="bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 rounded-2xl p-8 shadow-xl border-2 border-red-200 dark:border-red-800 h-full"
              >
                <div className="flex items-center justify-center mb-6">
                  <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center shadow-lg">
                    <XCircle className="w-10 h-10 text-white" />
                  </div>
                </div>
                <h3 className="text-2xl font-bold text-center text-red-700 dark:text-red-400 mb-2">Sem TamanduAI</h3>
                <p className="text-center text-sm text-red-600 dark:text-red-400 mb-6">Método tradicional e trabalhoso</p>
                <ul className="space-y-3">
                  {comparison.filter(item => item.before).map((item, i) => (
                    <li key={i} className="flex items-start space-x-3">
                      <XCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-700 dark:text-gray-300 text-sm font-medium">{item.feature}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>

              {/* Depois */}
              <motion.div 
                initial={{ opacity: 0, x: 30 }} 
                whileInView={{ opacity: 1, x: 0 }} 
                transition={{ duration: 0.8 }}
                className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-2xl p-8 shadow-xl border-2 border-green-200 dark:border-green-800 relative overflow-hidden h-full"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-green-400/10 rounded-full -mr-16 -mt-16"></div>
                <div className="flex items-center justify-center mb-6 relative z-10">
                  <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center shadow-lg">
                    <CheckCircle2 className="w-10 h-10 text-white" />
                  </div>
                </div>
                <h3 className="text-2xl font-bold text-center text-green-700 dark:text-green-400 mb-2 relative z-10">Com TamanduAI</h3>
                <p className="text-center text-sm text-green-600 dark:text-green-400 mb-6 relative z-10">Plataforma completa com IA</p>
                <ul className="space-y-3 relative z-10">
                  {comparison.filter(item => item.after).map((item, i) => (
                    <li key={i} className="flex items-start space-x-3">
                      <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-700 dark:text-gray-300 text-sm font-medium">{item.feature}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Use Cases */}
        <section className="py-20 bg-gradient-to-br from-slate-50 to-blue-50 dark:from-gray-800 dark:to-gray-900">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} className="text-center mb-16">
              <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 dark:text-white mb-6">
                Perfeito para <span className="bg-gradient-to-r from-cyan-600 via-blue-600 to-blue-800 bg-clip-text text-transparent">todos</span>
              </h2>
              <p className="text-xl text-gray-600 dark:text-gray-300">Independente do seu perfil, temos a solução ideal</p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {useCases.map((useCase, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: i * 0.1 }} className="group">
                  <div className={`relative p-8 bg-gradient-to-br ${useCase.gradient} rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 overflow-hidden`}>
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
                    <div className="relative z-10">
                      <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center mb-6">
                        <useCase.icon className="w-8 h-8 text-white" />
                      </div>
                      <h3 className="text-2xl font-bold text-white mb-3">{useCase.title}</h3>
                      <p className="text-white/90 leading-relaxed mb-6">{useCase.description}</p>
                      <Button 
                        variant="outline" 
                        rightIcon={<ArrowRight className="w-4 h-4" />}
                        className="bg-white/20 hover:bg-white/30 text-white border-white/30 hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-xl"
                      >
                        Saiba Mais
                      </Button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="py-20 bg-gradient-to-br from-cyan-50 to-blue-100 dark:from-gray-800 dark:to-gray-900">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} className="text-center mb-16">
              <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 dark:text-white mb-6">
                Perguntas <span className="bg-gradient-to-r from-cyan-600 via-blue-600 to-blue-800 bg-clip-text text-transparent">Frequentes</span>
              </h2>
              <p className="text-xl text-gray-600 dark:text-gray-300">Tudo que você precisa saber</p>
            </motion.div>

            <div className="space-y-4">
              {faqs.map((faq, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: i * 0.05 }}>
                  <div className="p-6 bg-white dark:bg-gray-800 rounded-xl shadow-md hover:shadow-lg transition-shadow">
                    <h3 className="text-base font-bold text-gray-900 dark:text-white mb-3 flex items-start">
                      <span className="w-6 h-6 bg-gradient-to-r from-cyan-600 via-blue-600 to-blue-800 rounded-full flex items-center justify-center text-white text-sm font-bold mr-3 mt-0.5">?</span>
                      {faq.q}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-300">{faq.a}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Technology Stack */}
        <section id="technology" className="py-20 bg-background">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} className="text-center mb-16">
              <h2 className="text-4xl lg:text-5xl font-bold text-foreground mb-6">
                Stack <span className="bg-gradient-to-r from-cyan-600 via-blue-600 to-blue-800 bg-clip-text text-transparent">tecnológico</span>
              </h2>
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto">Tecnologias modernas para uma solução escalável e segura</p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="text-center">
                <div className="w-20 h-20 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                  <Brain className="w-10 h-10 text-white" />
                </div>
                <h3 className="text-lg font-bold text-foreground mb-2">Inteligência Artificial</h3>
                <p className="text-sm text-muted-foreground">RAG v2.0, Correção com IA, Antiplágio</p>
              </motion.div>
              
              <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }} className="text-center">
                <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                  <Shield className="w-10 h-10 text-white" />
                </div>
                <h3 className="text-lg font-bold text-foreground mb-2">Segurança LGPD</h3>
                <p className="text-sm text-muted-foreground">Criptografia SSL e compliance total</p>
              </motion.div>
              
              <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }} className="text-center">
                <div className="w-20 h-20 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                  <Zap className="w-10 h-10 text-white" />
                </div>
                <h3 className="text-lg font-bold text-foreground mb-2">Performance</h3>
                <p className="text-sm text-muted-foreground">Cache Redis, Edge Functions otimizadas</p>
              </motion.div>
              
              <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.3 }} className="text-center">
                <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                  <Globe className="w-10 h-10 text-white" />
                </div>
                <h3 className="text-lg font-bold text-foreground mb-2">Escalável</h3>
                <p className="text-sm text-muted-foreground">Arquitetura preparada para crescimento</p>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Trust Indicators */}
        <section className="py-16 bg-white dark:bg-gray-900 border-y border-gray-200 dark:border-gray-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-wrap items-center justify-center gap-12">
              <motion.div initial={{ opacity: 0, scale: 0.8 }} whileInView={{ opacity: 1, scale: 1 }} className="flex items-center space-x-3">
                <Shield className="w-8 h-8 text-green-600" />
                <div>
                  <div className="font-bold text-gray-900 dark:text-white">100% Seguro</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Criptografia SSL</div>
                </div>
              </motion.div>
              <motion.div initial={{ opacity: 0, scale: 0.8 }} whileInView={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }} className="flex items-center space-x-3">
                <BadgeCheck className="w-8 h-8 text-blue-600" />
                <div>
                  <div className="font-bold text-foreground">LGPD Compliant</div>
                  <div className="text-sm text-muted-foreground">Dados Protegidos</div>
                </div>
              </motion.div>
              <motion.div initial={{ opacity: 0, scale: 0.8 }} whileInView={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }} className="flex items-center space-x-3">
                <Smartphone className="w-8 h-8 text-blue-600" />
                <div>
                  <div className="font-bold text-foreground">Multi-Plataforma</div>
                  <div className="text-sm text-muted-foreground">Web, iOS, Android</div>
                </div>
              </motion.div>
              <motion.div initial={{ opacity: 0, scale: 0.8 }} whileInView={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 }} className="flex items-center space-x-3">
                <Headphones className="w-8 h-8 text-orange-600" />
                <div>
                  <div className="font-bold text-foreground">Suporte 24/7</div>
                  <div className="text-sm text-muted-foreground">Sempre disponível</div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Beta */}
        <section className="py-20 bg-gradient-to-r from-cyan-500 via-blue-600 to-blue-800">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
              <div className="inline-flex items-center px-4 py-2 bg-white/20 rounded-full text-sm font-medium text-white mb-6">
                <Rocket className="w-4 h-4 mr-2" />Programa Beta Exclusivo
              </div>
              <h2 className="text-4xl lg:text-5xl font-bold text-white mb-6">Teste a plataforma TamanduAI</h2>
              <p className="text-xl text-white/80 mb-8 max-w-2xl mx-auto">Acesso gratuito ao programa Beta com todas as funcionalidades implementadas.</p>
              
              <Link to="/register">
                <Button 
                  size="lg"
                  leftIcon={<Rocket className="w-5 h-5" />}
                  className="bg-white text-blue-600 hover:bg-gray-50 shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300 text-lg px-8 py-6"
                >
                  Participar do Beta
                </Button>
              </Link>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
                  <Calendar className="w-8 h-8 text-white mx-auto mb-3" />
                  <h3 className="font-semibold text-white mb-2">3 Meses Grátis</h3>
                  <p className="text-white/80 text-sm">Acesso completo a todas funcionalidades</p>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
                  <Shield className="w-8 h-8 text-white mx-auto mb-3" />
                  <h3 className="font-semibold text-white mb-2">Sem Compromisso</h3>
                  <p className="text-white/80 text-sm">Cancele quando quiser, sem taxas</p>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
                  <Users className="w-8 h-8 text-white mx-auto mb-3" />
                  <h3 className="font-semibold text-white mb-2">Suporte Exclusivo</h3>
                  <p className="text-white/80 text-sm">Atendimento prioritário para beta testers</p>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Roadmap Teaser */}
        <section className="py-20 bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} className="text-center mb-12">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-500/30 backdrop-blur-sm mb-6 shadow-lg">
                <Sparkles className="w-4 h-4 text-blue-300" />
                <span className="text-sm font-bold text-blue-300">Lançamento 11/11/2025 • Roadmap 2026</span>
              </div>
              <h2 className="text-4xl lg:text-5xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-cyan-400 to-purple-400">Roadmap de Desenvolvimento 2026</h2>
              <p className="text-xl text-slate-200 max-w-3xl mx-auto">Do lançamento MVP até o ecossistema completo - escola, gamificação, pais e muito mais</p>
            </motion.div>

            <div className="grid md:grid-cols-3 gap-6 mb-12">
              <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }} className="relative group">
                <div className="p-6 rounded-2xl bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 backdrop-blur-xl overflow-hidden hover:scale-105 transition-transform duration-300 shadow-xl">
                  <div className="absolute inset-0 bg-gradient-to-br from-emerald-500 to-teal-500 opacity-0 group-hover:opacity-10 transition-opacity duration-500" />
                  <div className="relative">
                    <CheckCircle className="w-12 h-12 text-emerald-400 mb-4" />
                    <h3 className="text-2xl font-bold text-white mb-2">Lançamento MVP</h3>
                    <p className="text-slate-300 mb-4">Chatbot v1.0 com RAG básico + 10 features</p>
                    <div className="flex items-center gap-2 text-emerald-400 text-sm font-medium">
                      <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      11 de Novembro 2025
                    </div>
                  </div>
                </div>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }} className="relative group">
                <div className="p-6 rounded-2xl bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/20 backdrop-blur-xl overflow-hidden hover:scale-105 transition-transform duration-300 shadow-xl">
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-purple-500 opacity-0 group-hover:opacity-10 transition-opacity duration-500" />
                  <div className="relative">
                    <Clock className="w-12 h-12 text-blue-400 mb-4" />
                    <h3 className="text-2xl font-bold text-white mb-2">Ano de 2026</h3>
                    <p className="text-slate-300 mb-4">Escola → Gamificação → Pais → Aprimoramentos</p>
                    <div className="flex items-center gap-2 text-blue-400 text-sm font-medium">
                      <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                      Q1 a Q4 • Chatbot v2-v5
                    </div>
                  </div>
                </div>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.3 }} className="relative group">
                <div className="p-6 rounded-2xl bg-gradient-to-br from-pink-500/10 to-purple-500/10 border border-pink-500/20 backdrop-blur-xl overflow-hidden hover:scale-105 transition-transform duration-300 shadow-xl">
                  <div className="absolute inset-0 bg-gradient-to-br from-pink-500 to-purple-500 opacity-0 group-hover:opacity-10 transition-opacity duration-500" />
                  <div className="relative">
                    <Target className="w-12 h-12 text-pink-400 mb-4" />
                    <h3 className="text-2xl font-bold text-white mb-2">2027 e Além</h3>
                    <p className="text-slate-300 mb-4">Banco de Questões + Apps Mobile + IA Generativa</p>
                    <div className="flex items-center gap-2 text-pink-400 text-sm font-medium">
                      <div className="w-2 h-2 rounded-full bg-pink-400 animate-pulse" />
                      Chatbot v6.0+ Completo
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>

            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.4 }} className="text-center">
              <Link to="/roadmap">
                <Button 
                  size="lg" 
                  className="bg-gradient-to-r from-blue-500 via-cyan-500 to-purple-500 hover:from-blue-600 hover:via-cyan-600 hover:to-purple-600 text-white shadow-2xl shadow-blue-500/50 hover:shadow-purple-500/50 transition-all duration-300 group"
                >
                  Ver Roadmap Completo
                  <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
            </motion.div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-20 bg-gradient-to-br from-cyan-500 via-blue-600 to-blue-800">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
              <h2 className="text-4xl lg:text-5xl font-bold text-white mb-6">Pronto para transformar a educação?</h2>
              <p className="text-xl text-white/80 mb-8 max-w-2xl mx-auto">Plataforma completa com IA para revolucionar o ensino. Teste todas as funcionalidades!</p>
              
              <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
                <Button 
                  size="lg" 
                  onClick={() => navigate('/register')} 
                  leftIcon={<CheckCircle className="w-6 h-6" />}
                  className="bg-white text-blue-600 hover:bg-gray-50 shadow-2xl hover:shadow-3xl hover:scale-110 transition-all duration-300 text-xl px-10 py-7 font-bold"
                >
                  Começar Gratuitamente
                </Button>
                <Button 
                  size="lg" 
                  variant="outline" 
                  onClick={() => navigate('/contact')} 
                  leftIcon={<Globe className="w-6 h-6" />}
                  className="bg-transparent text-white border-2 border-white hover:bg-white/20 hover:scale-110 transition-all duration-300 text-xl px-10 py-7 font-bold shadow-xl"
                >
                  Falar com Especialista
                </Button>
              </div>
            </motion.div>
          </div>
        </section>
      </main>

      <Footer />
      
      {/* Cookie Banner */}
      <CookieBanner />
    </div>
  );
}


