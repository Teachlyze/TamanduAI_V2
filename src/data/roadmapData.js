import {
  Brain, FileEdit, Shield, BarChart3, Calendar, Users, Upload,
  MessageSquare, FileText, ClipboardCheck, Award, Target, Zap,
  BookOpen, TrendingUp, Globe, Lock, Bell, Video, UserCheck,
  GraduationCap, Heart, Trophy, LineChart, Clock, CheckCircle,
  Settings, Mail, Phone, MessageCircle, Share2, Download,
  Smartphone, Laptop, Monitor, PieChart, Activity, FileSpreadsheet,
  Printer, Rocket, Sparkles, Mic
} from 'lucide-react';

export const roadmapPhases = [
  {
    id: 1,
    title: "MVP - Lançamento",
    subtitle: "Versão Inicial - Funcionalidades serão aprimoradas nos próximos trimestres",
    status: "completed",
    progress: 100,
    timeline: "11 de Novembro de 2025",
    color: "emerald",
    icon: CheckCircle,
    features: [
      {
        icon: Brain,
        title: "Chatbot v1.0 com RAG",
        description: "IA treinada com materiais (PDF, Word, PPT, URLs) para responder dúvidas 24/7",
        status: "live",
        tags: ["IA", "Automação"]
      },
      {
        icon: Target,
        title: "Recomendações IA (Beta)",
        description: "Sistema experimental de recomendação de conteúdos - requer ajustes",
        status: "live",
        tags: ["IA", "Personalização"]
      },
      {
        icon: FileEdit,
        title: "Correção Automática com IA",
        description: "Sistema inteligente de correção com feedback detalhado, economizando 70% do tempo",
        status: "live",
        tags: ["IA", "Produtividade"]
      },
      {
        icon: Shield,
        title: "Antiplágio Winston AI",
        description: "Detecção automática de plágio e conteúdo gerado por IA (100 verificações/hora)",
        status: "live",
        tags: ["Segurança", "IA"]
      },
      {
        icon: BarChart3,
        title: "Analytics em Tempo Real",
        description: "Dashboards completos com estatísticas e exportação de relatórios em CSV",
        status: "live",
        tags: ["Analytics", "Relatórios"]
      },
      {
        icon: Calendar,
        title: "Calendário de Eventos",
        description: "Gestão de prazos, aulas recorrentes e eventos sincronizados",
        status: "live",
        tags: ["Organização"]
      },
      {
        icon: Users,
        title: "Gestão Multi-perfil",
        description: "Sistema completo para Professor, Aluno e Escola em uma plataforma",
        status: "live",
        tags: ["Gestão"]
      },
      {
        icon: Upload,
        title: "Importar Atividades",
        description: "Upload de TXT, PDF, DOCX, ODT com extração automática de questões",
        status: "live",
        tags: ["Automação"]
      },
      {
        icon: MessageSquare,
        title: "Sistema de Eventos",
        description: "Eventos personalizados com seleção de alunos por turma ou individual",
        status: "live",
        tags: ["Comunicação"]
      },
      {
        icon: FileText,
        title: "Gestão de Materiais",
        description: "Organização e compartilhamento de materiais didáticos com turmas",
        status: "live",
        tags: ["Organização"]
      }
    ]
  },
  {
    id: 2,
    title: "Q1 2026 - Gestão Escolar & IA Financeira",
    subtitle: "Janeiro a Março 2026",
    status: "in-progress",
    progress: 0,
    timeline: "Q1 2026",
    color: "blue",
    icon: GraduationCap,
    features: [
      {
        icon: Users,
        title: "Dashboard Escolar Completo",
        description: "Visão completa de professores, alunos, turmas e atividades da escola",
        status: "planned",
        tags: ["Escola"]
      },
      {
        icon: UserCheck,
        title: "Gestão de Corpo Docente",
        description: "Controle de professores, vinculação e métricas de desempenho",
        status: "planned",
        tags: ["Escola"]
      },
      {
        icon: PieChart,
        title: "Sistema Financeiro",
        description: "Controle de mensalidades, planos e gestão de pagamentos",
        status: "planned",
        tags: ["Financeiro"]
      },
      {
        icon: BarChart3,
        title: "Analytics Institucional",
        description: "Relatórios comparativos entre turmas, professores e alunos",
        status: "planned",
        tags: ["Escola", "Analytics"]
      },
      {
        icon: ClipboardCheck,
        title: "Controle de Frequência",
        description: "Sistema completo de registro de presença em aulas e eventos",
        status: "planned",
        tags: ["Escola", "Gestão"]
      },
      {
        icon: Award,
        title: "Sistema de Recompensas Escolar",
        description: "Pontos, XP e badges gerenciados pela instituição",
        status: "planned",
        tags: ["Escola", "Gamificação"]
      },
      {
        icon: FileSpreadsheet,
        title: "Exportação Excel/CSV",
        description: "Exportar relatórios, notas e analytics em planilhas Excel e CSV",
        status: "planned",
        tags: ["Relatórios", "Produtividade"]
      },
      {
        icon: Printer,
        title: "Exportação PDF",
        description: "Gerar PDFs profissionais de atividades, relatórios e boletins",
        status: "planned",
        tags: ["Relatórios", "Produtividade"]
      },
      {
        icon: Target,
        title: "Correção Sistema de Recomendações",
        description: "Ajustes e melhorias no sistema de recomendação de conteúdos do MVP",
        status: "planned",
        tags: ["IA", "Personalização"]
      },
      {
        icon: Brain,
        title: "Chatbot v2.0 - Contexto Melhorado",
        description: "Memória de conversas anteriores e respostas mais contextualizadas",
        status: "planned",
        tags: ["IA", "Chatbot"]
      }
    ]
  },
  {
    id: 3,
    title: "Q2 2026 - Gamificação & Recomendações IA",
    subtitle: "Abril a Junho 2026",
    status: "planned",
    progress: 0,
    timeline: "Q2 2026",
    color: "purple",
    icon: Trophy,
    features: [
      {
        icon: Award,
        title: "Sistema de Badges",
        description: "Conquistas e reconhecimentos por marcos alcançados",
        status: "planned",
        tags: ["Gamificação"]
      },
      {
        icon: Trophy,
        title: "Ranking e Competições",
        description: "Rankings globais, por escola e por turma para motivar alunos",
        status: "planned",
        tags: ["Gamificação"]
      },
      {
        icon: Target,
        title: "Missões e Desafios",
        description: "Sistema de missões personalizáveis criadas por professores",
        status: "planned",
        tags: ["Gamificação"]
      },
      {
        icon: Zap,
        title: "Sistema de XP e Níveis",
        description: "Progressão gamificada baseada em atividades e engajamento",
        status: "planned",
        tags: ["Gamificação"]
      },
      {
        icon: Target,
        title: "Aprimoramento Sistema de Recomendações",
        description: "Melhorias avançadas: sugestões mais precisas baseadas em padrões e dificuldades",
        status: "planned",
        tags: ["IA", "Personalização"]
      },
      {
        icon: Bell,
        title: "Sistema de Notificações - Parte 1",
        description: "Notificações in-app e por email para eventos, atividades e comunicados",
        status: "planned",
        tags: ["Comunicação", "Notificações"]
      },
      {
        icon: Brain,
        title: "Chatbot v3.0 - Multi-idioma",
        description: "Suporte para inglês, espanhol e respostas adaptativas por perfil de aluno",
        status: "planned",
        tags: ["IA", "Chatbot"]
      }
    ]
  },
  {
    id: 4,
    title: "Q3 2026 - Portal dos Pais & Tutor IA",
    subtitle: "Julho a Setembro 2026",
    status: "planned",
    progress: 0,
    timeline: "Q3 2026",
    color: "cyan",
    icon: Heart,
    features: [
      {
        icon: UserCheck,
        title: "Portal dos Pais Completo",
        description: "Dashboard para pais acompanharem notas, frequência e desempenho dos filhos",
        status: "planned",
        tags: ["Pais"]
      },
      {
        icon: Calendar,
        title: "Agenda e Eventos para Pais",
        description: "Visualização de provas, trabalhos, reuniões e eventos escolares",
        status: "planned",
        tags: ["Pais"]
      },
      {
        icon: Bell,
        title: "Notificações para Pais",
        description: "Alertas sobre notas, faltas, comunicados e eventos importantes",
        status: "planned",
        tags: ["Pais", "Comunicação"]
      },
      {
        icon: Mail,
        title: "Comunicação Escola-Pais",
        description: "Canal direto entre escola/professores e pais com confirmação de leitura",
        status: "planned",
        tags: ["Pais", "Comunicação"]
      },
      {
        icon: BarChart3,
        title: "Relatórios de Desempenho para Pais",
        description: "Boletins, gráficos de evolução e comparação com média da turma",
        status: "planned",
        tags: ["Pais", "Analytics"]
      },
      {
        icon: Phone,
        title: "Agendamento de Reuniões",
        description: "Sistema para pais agendarem reuniões com professores e coordenação",
        status: "planned",
        tags: ["Pais"]
      },
      {
        icon: Bell,
        title: "Sistema de Notificações - Conclusão",
        description: "Push notifications + personalização inteligente por perfil e preferências do usuário",
        status: "planned",
        tags: ["Comunicação", "Notificações"]
      },
      {
        icon: Sparkles,
        title: "Tutor Personalizado IA",
        description: "IA separada que adapta conteúdos e exercícios ao ritmo e estilo de aprendizagem do aluno",
        status: "planned",
        tags: ["IA", "Personalização", "Tutor"]
      },
      {
        icon: Brain,
        title: "Chatbot v4.0 - Otimização",
        description: "Melhorias em velocidade, assertividade, eficácia e desempenho das respostas",
        status: "planned",
        tags: ["IA", "Chatbot", "Performance"]
      }
    ]
  },
  {
    id: 5,
    title: "Q4 2026 - Aprimoramentos & Chatbot v5.0",
    subtitle: "Outubro a Dezembro 2026",
    status: "planned",
    progress: 0,
    timeline: "Q4 2026",
    color: "orange",
    icon: Settings,
    features: [
      {
        icon: TrendingUp,
        title: "Analytics Avançado com ML",
        description: "Machine Learning para previsão de desempenho e identificação de padrões",
        status: "planned",
        tags: ["IA", "ML", "Analytics"]
      },
      {
        icon: BookOpen,
        title: "Banco de Questões Público",
        description: "Milhares de questões compartilhadas pela comunidade com sistema de compartilhamento",
        status: "planned",
        tags: ["Conteúdo", "Comunidade"]
      },
      {
        icon: Video,
        title: "Reuniões e Whiteboard",
        description: "Videoconferência integrada com quadro branco colaborativo",
        status: "planned",
        tags: ["Colaboração"]
      },
      {
        icon: MessageCircle,
        title: "Chat em Tempo Real",
        description: "Mensagens instantâneas entre todos os usuários da plataforma",
        status: "planned",
        tags: ["Comunicação"]
      },
      {
        icon: Clock,
        title: "Modo Foco e Produtividade",
        description: "Timer Pomodoro, estatísticas de foco e gamificação de estudo",
        status: "planned",
        tags: ["Produtividade"]
      },
      {
        icon: Brain,
        title: "Chatbot v5.0 - Integração Completa",
        description: "Integração total com todas as funcionalidades da plataforma e preparação para IA generativa",
        status: "planned",
        tags: ["IA", "Chatbot", "Integração"]
      }
    ]
  },
  {
    id: 6,
    title: "2027+ - Funcionalidades Avançadas",
    subtitle: "Ecossistema Educacional Completo",
    status: "planned",
    progress: 0,
    timeline: "2027 e além",
    color: "pink",
    icon: Rocket,
    features: [
      {
        icon: FileText,
        title: "Gerador de Provas com IA",
        description: "Criação automática de avaliações baseadas em critérios e nível de dificuldade",
        status: "planned",
        tags: ["IA", "Automação"]
      },
      {
        icon: Globe,
        title: "Multi-idioma Global",
        description: "Suporte completo para português, inglês, espanhol e mais idiomas",
        status: "planned",
        tags: ["Global"]
      },
      {
        icon: Smartphone,
        title: "Apps Mobile Nativos",
        description: "Aplicativos iOS e Android com funcionalidades offline",
        status: "planned",
        tags: ["Mobile"]
      },
      {
        icon: Settings,
        title: "API Pública e Integrações",
        description: "Integração com Google Classroom, Moodle e outros sistemas educacionais",
        status: "planned",
        tags: ["Integração"]
      },
      {
        icon: Award,
        title: "Sistema de Certificações",
        description: "Emissão automática de certificados digitais de conclusão",
        status: "planned",
        tags: ["Reconhecimento"]
      },
      {
        icon: Mic,
        title: "Interação por Voz e Áudio",
        description: "Chatbot com suporte a voz, respostas em áudio e transcrição automática",
        status: "planned",
        tags: ["IA", "Acessibilidade"]
      },
      {
        icon: Brain,
        title: "Chatbot v6.0+ - IA Generativa Completa",
        description: "Geração de conteúdo educacional, exercícios personalizados e assistente virtual completo",
        status: "planned",
        tags: ["IA", "Chatbot", "Generativa"]
      }
    ]
  }
];

// Cores por status
export const statusColors = {
  live: { bg: "bg-emerald-500/10", text: "text-emerald-500", border: "border-emerald-500/20", glow: "shadow-emerald-500/20" },
  "in-progress": { bg: "bg-blue-500/10", text: "text-blue-500", border: "border-blue-500/20", glow: "shadow-blue-500/20" },
  planned: { bg: "bg-slate-500/10", text: "text-slate-400", border: "border-slate-500/20", glow: "shadow-slate-500/20" }
};

// Cores por fase
export const phaseColors = {
  emerald: {
    gradient: "from-emerald-500 via-teal-500 to-green-500",
    glow: "shadow-emerald-500/50",
    border: "border-emerald-500/20",
    bg: "bg-emerald-500/5"
  },
  blue: {
    gradient: "from-blue-500 via-cyan-500 to-blue-600",
    glow: "shadow-blue-500/50",
    border: "border-blue-500/20",
    bg: "bg-blue-500/5"
  },
  purple: {
    gradient: "from-purple-500 via-violet-500 to-purple-600",
    glow: "shadow-purple-500/50",
    border: "border-purple-500/20",
    bg: "bg-purple-500/5"
  },
  cyan: {
    gradient: "from-cyan-500 via-blue-500 to-teal-500",
    glow: "shadow-cyan-500/50",
    border: "border-cyan-500/20",
    bg: "bg-cyan-500/5"
  },
  orange: {
    gradient: "from-orange-500 via-amber-500 to-yellow-500",
    glow: "shadow-orange-500/50",
    border: "border-orange-500/20",
    bg: "bg-orange-500/5"
  },
  pink: {
    gradient: "from-pink-500 via-rose-500 to-purple-500",
    glow: "shadow-pink-500/50",
    border: "border-pink-500/20",
    bg: "bg-pink-500/5"
  }
};
