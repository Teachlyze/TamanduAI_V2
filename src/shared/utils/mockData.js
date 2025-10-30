/**
 * Sistema de dados mockados configuráveis para desenvolvimento
 * Permite personalizar dados de teste através de variáveis de ambiente
 */

import { getCurrentEnvironment } from '@/config/app-config';

// Dados mockados padrão para desenvolvimento
export const MOCK_DATA = {
  // Dados do dashboard
  DASHBOARD: {
    stats: [
      {
        icon: 'Users',
        label: 'Total de Alunos',
        value: () => parseInt(import.meta.env.VITE_DEFAULT_TOTAL_STUDENTS || '0'),
        change: () => `+${import.meta.env.VITE_MOCK_STUDENTS_CHANGE_PERCENTAGE || '12'}%`,
        changeType: 'positive',
        gradient: 'from-blue-500 to-cyan-500'
      },
      {
        icon: 'GraduationCap',
        label: 'Turmas Ativas',
        value: () => parseInt(import.meta.env.VITE_DEFAULT_TOTAL_CLASSES || '0'),
        change: () => `+${import.meta.env.VITE_MOCK_CLASSES_CHANGE_PERCENTAGE || '2'}`,
        changeType: 'positive',
        gradient: 'from-green-500 to-emerald-500'
      },
      {
        icon: 'FileText',
        label: 'Atividades',
        value: () => parseInt(import.meta.env.VITE_DEFAULT_TOTAL_ACTIVITIES || '0'),
        change: () => `+${import.meta.env.VITE_MOCK_ACTIVITIES_CHANGE_PERCENTAGE || '5'}`,
        changeType: 'positive',
        gradient: 'from-blue-500 to-cyan-500'
      },
      {
        icon: 'TrendingUp',
        label: 'Taxa de Conclusão',
        value: () => `${parseInt(import.meta.env.VITE_DEFAULT_COMPLETION_RATE || '0')}%`,
        change: () => `+${import.meta.env.VITE_MOCK_COMPLETION_RATE_CHANGE_PERCENTAGE || '3'}%`,
        changeType: 'positive',
        gradient: 'from-orange-500 to-red-500'
      },
    ],

    recentActivities: [
      {
        icon: 'FileText',
        title: 'Nova atividade criada',
        description: 'Matemática Básica - Turma A',
        time: '2 horas atrás',
        color: 'blue'
      },
      {
        icon: 'Users',
        title: 'Aluno inscrito',
        description: 'João Silva entrou na plataforma',
        time: '4 horas atrás',
        color: 'green'
      },
      {
        icon: 'Award',
        title: 'Certificado emitido',
        description: 'Maria Santos completou o curso',
        time: '1 dia atrás',
        color: 'blue'
      },
    ],

    upcomingDeadlines: [
      {
        title: 'Entrega do Projeto Final',
        class: 'Matemática Avançada',
        date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 dias
        daysLeft: 3
      },
      {
        title: 'Prova de Física',
        class: 'Física II',
        date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 dias
        daysLeft: 7
      },
    ]
  },

  // Dados de usuários mockados
  USERS: {
    teachers: [
      {
        id: '1',
        name: 'Prof. Carlos Silva',
        email: 'carlos.silva@escola.edu.br',
        role: 'teacher',
        avatar: '/avatars/teacher1.jpg',
        subjects: ['Matemática', 'Física'],
        classesCount: 5,
        studentsCount: 120,
        lastActive: new Date(),
      },
      {
        id: '2',
        name: 'Prof. Ana Santos',
        email: 'ana.santos@escola.edu.br',
        role: 'teacher',
        avatar: '/avatars/teacher2.jpg',
        subjects: ['Português', 'Literatura'],
        classesCount: 3,
        studentsCount: 85,
        lastActive: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 horas atrás
      },
    ],

    students: [
      {
        id: '1',
        name: 'João Silva',
        email: 'joao.silva@aluno.edu.br',
        role: 'student',
        avatar: '/avatars/student1.jpg',
        class: '8º Ano A',
        enrolledAt: new Date('2024-01-15'),
        lastActive: new Date(),
        progress: 85,
      },
      {
        id: '2',
        name: 'Maria Santos',
        email: 'maria.santos@aluno.edu.br',
        role: 'student',
        avatar: '/avatars/student2.jpg',
        class: '8º Ano A',
        enrolledAt: new Date('2024-01-15'),
        lastActive: new Date(Date.now() - 30 * 60 * 1000), // 30 minutos atrás
        progress: 92,
      },
    ],
  },

  // Dados de atividades mockadas
  ACTIVITIES: {
    list: [
      {
        id: '1',
        title: 'Introdução à Matemática',
        description: 'Conceitos básicos de matemática para iniciantes',
        subject: 'Matemática',
        class: '7º Ano A',
        type: 'lesson',
        status: 'published',
        createdAt: new Date('2024-01-10'),
        deadline: new Date('2024-01-25'),
        submissions: 25,
        maxSubmissions: 30,
      },
      {
        id: '2',
        title: 'Ensaio sobre Literatura Brasileira',
        description: 'Análise crítica de obras clássicas',
        subject: 'Português',
        class: '8º Ano B',
        type: 'assignment',
        status: 'active',
        createdAt: new Date('2024-01-12'),
        deadline: new Date('2024-01-28'),
        submissions: 18,
        maxSubmissions: 28,
      },
    ],
  },

  // Dados de classes mockadas
  CLASSES: {
    list: [
      {
        id: '1',
        name: '7º Ano A - Manhã',
        subject: 'Matemática',
        teacher: 'Prof. Carlos Silva',
        students: 30,
        schedule: '08:00 - 10:00',
        room: 'Sala 101',
        status: 'active',
      },
      {
        id: '2',
        name: '8º Ano B - Tarde',
        subject: 'Português',
        teacher: 'Prof. Ana Santos',
        students: 28,
        schedule: '14:00 - 16:00',
        room: 'Sala 205',
        status: 'active',
      },
    ],
  },

  // Dados de métricas de sistema
  SYSTEM_METRICS: {
    totalRequests: 15420,
    errors: 23,
    avgResponseTime: 145,
    cacheHitRate: 87,
    memoryUsage: {
      used: 512 * 1024 * 1024, // 512MB
      limit: 1024 * 1024 * 1024, // 1GB
    },
    cache: {
      status: 'healthy',
    },
    timestamp: new Date(),
  },
};

/**
 * Hook para acessar dados mockados configuráveis
 */
export const useMockData = (dataType) => {
  const isDevelopment = getCurrentEnvironment() === 'development';
  const enableMockData = import.meta.env.VITE_ENABLE_MOCK_DATA === 'true' || isDevelopment;

  if (!enableMockData) {
    return null;
  }

  return MOCK_DATA[dataType] || null;
};

/**
 * Função para gerar dados mockados dinâmicos baseados em configuração
 */
export const generateMockData = (type, overrides = {}) => {
  const baseData = MOCK_DATA[type];

  if (!baseData) {
    console.warn(`Tipo de dado mockado não encontrado: ${type}`);
    return null;
  }

  // Aplicar overrides se fornecidos
  if (overrides && typeof overrides === 'object') {
    return {
      ...baseData,
      ...overrides,
    };
  }

  return baseData;
};

/**
 * Middleware para simular delay de API em desenvolvimento
 */
export const mockApiDelay = async () => {
  const isDevelopment = getCurrentEnvironment() === 'development';
  const enableMockDelay = import.meta.env.VITE_MOCK_API_DELAY && isDevelopment;

  if (!enableMockDelay) {
    return Promise.resolve();
  }

  const delayAmount = parseInt(import.meta.env.VITE_MOCK_API_DELAY) || 500;

  return new Promise(resolve => setTimeout(resolve, delayAmount));
};

export default MOCK_DATA;
