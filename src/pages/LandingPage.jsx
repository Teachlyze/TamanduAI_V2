import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  GraduationCap, 
  BookOpen, 
  Trophy, 
  Users, 
  Brain, 
  Sparkles,
  ChevronRight,
  CheckCircle2,
  BarChart3,
  MessageSquare,
  Calendar,
  Award,
  Moon,
  Sun,
  Menu,
  X
} from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Card } from '@/shared/components/ui/card';

const LandingPage = () => {
  const [isDark, setIsDark] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const theme = localStorage.getItem('theme') || 'light';
    setIsDark(theme === 'dark');
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = isDark ? 'light' : 'dark';
    setIsDark(!isDark);
    localStorage.setItem('theme', newTheme);
    document.documentElement.classList.toggle('dark');
  };

  const features = [
    {
      icon: Brain,
      title: 'IA Avançada',
      description: 'Sistema de correção automática com feedback personalizado usando inteligência artificial',
      gradient: 'from-purple-500 to-pink-500'
    },
    {
      icon: BarChart3,
      title: 'Analytics em Tempo Real',
      description: 'Dashboards inteligentes com insights sobre performance e evolução dos alunos',
      gradient: 'from-blue-500 to-cyan-500'
    },
    {
      icon: Trophy,
      title: 'Gamificação Completa',
      description: 'Sistema de XP, badges, missões e rankings para engajar os estudantes',
      gradient: 'from-amber-500 to-orange-500'
    },
    {
      icon: MessageSquare,
      title: 'Comunicação Integrada',
      description: 'Mural de avisos, chat e notificações em tempo real para toda a comunidade',
      gradient: 'from-green-500 to-emerald-500'
    },
    {
      icon: Calendar,
      title: 'Gestão Completa',
      description: 'Calendário, frequência, materiais e atividades em um só lugar',
      gradient: 'from-indigo-500 to-purple-500'
    },
    {
      icon: Award,
      title: 'Banco de Questões',
      description: 'Milhares de questões organizadas por tema, dificuldade e competência BNCC',
      gradient: 'from-rose-500 to-red-500'
    }
  ];

  const stats = [
    { value: '10k+', label: 'Alunos Ativos' },
    { value: '500+', label: 'Escolas' },
    { value: '98%', label: 'Satisfação' },
    { value: '24/7', label: 'Suporte' }
  ];

  const roles = [
    {
      title: 'Para Alunos',
      icon: GraduationCap,
      features: [
        'Atividades personalizadas',
        'Sistema de XP e badges',
        'Feedback instantâneo',
        'Acompanhamento de notas',
        'Missões e desafios'
      ],
      color: 'from-blue-600 to-indigo-600'
    },
    {
      title: 'Para Professores',
      icon: BookOpen,
      features: [
        'Correção automática com IA',
        'Banco de questões ilimitado',
        'Analytics detalhado',
        'Gestão de turmas',
        'Comunicação facilitada'
      ],
      color: 'from-purple-600 to-pink-600'
    },
    {
      title: 'Para Escolas',
      icon: Users,
      features: [
        'Gestão completa de turmas',
        'Relatórios consolidados',
        'Analytics institucional',
        'Comunicação em massa',
        'Ranking entre turmas'
      ],
      color: 'from-emerald-600 to-teal-600'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 dark:from-slate-950 dark:to-slate-900 transition-colors">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 dark:bg-slate-950/80 backdrop-blur-lg border-b border-gray-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
                <GraduationCap className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                TamanduAI
              </span>
            </Link>

            {/* Desktop Menu */}
            <div className="hidden md:flex items-center gap-6">
              <a href="#features" className="text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                Funcionalidades
              </a>
              <a href="#roles" className="text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                Para Quem
              </a>
              <a href="#pricing" className="text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                Preços
              </a>
              
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleTheme}
                className="rounded-full"
              >
                {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </Button>

              <Link to="/login">
                <Button variant="ghost" className="whitespace-nowrap">
                  Entrar
                </Button>
              </Link>
              
              <Link to="/register">
                <Button className="whitespace-nowrap bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white">
                  Começar Grátis
                </Button>
              </Link>
            </div>

            {/* Mobile Menu Button */}
            <div className="md:hidden flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleTheme}
                className="rounded-full"
              >
                {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden border-t border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-950"
            >
              <div className="px-4 py-4 space-y-3">
                <a href="#features" className="block px-3 py-2 text-slate-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg">
                  Funcionalidades
                </a>
                <a href="#roles" className="block px-3 py-2 text-slate-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg">
                  Para Quem
                </a>
                <a href="#pricing" className="block px-3 py-2 text-slate-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg">
                  Preços
                </a>
                <Link to="/login" className="block">
                  <Button variant="outline" className="w-full whitespace-nowrap">
                    Entrar
                  </Button>
                </Link>
                <Link to="/register" className="block">
                  <Button className="w-full whitespace-nowrap bg-gradient-to-r from-blue-600 to-purple-600 text-white">
                    Começar Grátis
                  </Button>
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 mb-6"
            >
              <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                Plataforma Educacional com IA
              </span>
            </motion.div>

            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold mb-6 leading-tight">
              <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                Transforme a Educação
              </span>
              <br />
              <span className="text-slate-900 dark:text-white">
                com Inteligência Artificial
              </span>
            </h1>

            <p className="text-xl text-slate-600 dark:text-slate-400 mb-8 max-w-3xl mx-auto">
              A plataforma completa que une professores, alunos e gestores em uma experiência
              educacional personalizada, gamificada e orientada por dados.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
              <Link to="/register">
                <Button size="lg" className="whitespace-nowrap inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white text-lg px-8 h-14">
                  <span>Começar Grátis</span>
                  <ChevronRight className="w-5 h-5" />
                </Button>
              </Link>
              <Button size="lg" variant="outline" className="whitespace-nowrap inline-flex items-center gap-2 text-lg px-8 h-14">
                <span>Ver Demo</span>
              </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto">
              {stats.map((stat, index) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 + index * 0.1 }}
                  className="text-center"
                >
                  <div className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
                    {stat.value}
                  </div>
                  <div className="text-sm text-slate-600 dark:text-slate-400">
                    {stat.label}
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4 sm:px-6 lg:px-8 bg-white dark:bg-slate-950">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl sm:text-5xl font-bold mb-4">
              <span className="text-slate-900 dark:text-white">Funcionalidades</span>{' '}
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Premium
              </span>
            </h2>
            <p className="text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
              Tudo o que você precisa para revolucionar o ensino e aprendizado
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="p-6 hover:shadow-xl transition-all duration-300 border-2 hover:border-blue-200 dark:hover:border-blue-800 bg-white dark:bg-slate-900">
                  <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-4`}>
                    <feature.icon className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="text-xl font-bold mb-2 text-slate-900 dark:text-white">
                    {feature.title}
                  </h3>
                  <p className="text-slate-600 dark:text-slate-400">
                    {feature.description}
                  </p>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Roles Section */}
      <section id="roles" className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl sm:text-5xl font-bold mb-4">
              <span className="text-slate-900 dark:text-white">Para</span>{' '}
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Todos
              </span>
            </h2>
            <p className="text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
              Recursos específicos para cada perfil de usuário
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {roles.map((role, index) => (
              <motion.div
                key={role.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="p-8 h-full bg-white dark:bg-slate-900 border-2 hover:border-blue-200 dark:hover:border-blue-800 hover:shadow-xl transition-all">
                  <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${role.color} flex items-center justify-center mb-6`}>
                    <role.icon className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold mb-6 text-slate-900 dark:text-white">
                    {role.title}
                  </h3>
                  <ul className="space-y-3">
                    {role.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-3">
                        <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                        <span className="text-slate-600 dark:text-slate-400">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 p-12 text-center text-white"
          >
            <div className="relative z-10">
              <h2 className="text-4xl sm:text-5xl font-bold mb-4">
                Pronto para começar?
              </h2>
              <p className="text-xl mb-8 text-blue-100">
                Junte-se a milhares de educadores que já transformaram suas aulas
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link to="/register">
                  <Button size="lg" className="whitespace-nowrap inline-flex items-center gap-2 bg-white text-blue-600 hover:bg-blue-50 text-lg px-8 h-14">
                    <span>Criar Conta Grátis</span>
                    <ChevronRight className="w-5 h-5" />
                  </Button>
                </Link>
                <Button size="lg" variant="outline" className="whitespace-nowrap inline-flex items-center gap-2 border-white text-white hover:bg-white/10 text-lg px-8 h-14">
                  <span>Falar com Vendas</span>
                </Button>
              </div>
            </div>
            
            {/* Decorative elements */}
            <div className="absolute -top-24 -right-24 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
            <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 sm:px-6 lg:px-8 border-t border-gray-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <GraduationCap className="w-5 h-5 text-white" />
              </div>
              <span className="text-lg font-bold text-slate-900 dark:text-white">
                TamanduAI
              </span>
            </div>
            <p className="text-slate-600 dark:text-slate-400 text-sm">
              © 2025 TamanduAI. Todos os direitos reservados.
            </p>
            <div className="flex items-center gap-6">
              <a href="#" className="text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 text-sm">
                Termos
              </a>
              <a href="#" className="text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 text-sm">
                Privacidade
              </a>
              <a href="#" className="text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 text-sm">
                Suporte
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
