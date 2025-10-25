import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import Seo from '@/shared/components/Seo';
import { Button } from '@/shared/components/ui/button';
import { Card } from '@/shared/components/ui/card';
import { Input } from '@/shared/components/ui/input';
import {
  BookOpen, Search, Home, Users, GraduationCap, Video,
  MessageSquare, Settings, BarChart3, Shield, Zap,
  ArrowLeft, Sparkles, Code, Database, Trophy, Brain,
  Calendar, Bell, ChevronRight
} from 'lucide-react';

export default function DocumentationPage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSection, setSelectedSection] = useState('intro');

  const sections = [
    {
      id: 'intro',
      title: 'Introdução',
      icon: Home,
      category: 'Início',
      content: {
        title: 'Bem-vindo ao TamanduAI',
        description: 'A plataforma educacional mais completa do Brasil',
        items: [
          {
            title: 'O que é TamanduAI?',
            content: 'TamanduAI é a primeira plataforma educacional brasileira que combina IA avançada (RAG, ML, NLP), gamificação completa, gestão de turmas, criação de atividades com correção automática, sistema anti-plágio, videoconferências, chatbot inteligente e analytics com 4 modelos de Machine Learning.'
          },
          {
            title: 'Diferenciais Únicos',
            list: [
              'Chatbot RAG: IA que aprende com SEU material didático',
              'Gamificação Completa: Sistema de XP e badges',
              'Anti-Plágio Duplo: Detecta plágio e conteúdo gerado por IA',
              'Analytics Preditivo: Prevê risco de reprovação',
              'Suporte Brasileiro: Time local em português'
            ]
          },
          {
            title: 'Para Quem é o TamanduAI?',
            list: [
              '👨‍🏫 Professores Independentes',
              '🏫 Escolas Pequenas e Médias',
              '🎓 Instituições de Ensino Superior',
              '📚 Cursos Preparatórios',
              '🌐 Ensino EAD'
            ]
          }
        ]
      }
    },
    {
      id: 'getting-started',
      title: 'Primeiros Passos',
      icon: Zap,
      category: 'Início',
      content: {
        title: 'Começando com TamanduAI',
        description: 'Guia completo passo-a-passo',
        items: [
          {
            title: 'Passo 1: Criar uma Conta',
            content: 'Acesse tamanduai.com/register e preencha: nome completo, email válido e senha forte (mínimo 8 caracteres).',
            list: ['Email único', 'Senha segura', 'Escolha seu perfil: Professor, Aluno ou Escola']
          },
          {
            title: 'Passo 2: Confirmar Email',
            content: 'Verifique sua caixa de entrada e clique no link de confirmação. Sem confirmação, você não pode criar turmas.'
          },
          {
            title: 'Passo 3: Criar Primeira Turma',
            content: 'Menu lateral > Turmas > Nova Turma. Preencha: nome único, matéria, ano letivo e descrição.',
            code: `{
  name: "Matemática 9A",
  subject: "Matemática",
  grade_level: "9º ano",
  academic_year: 2024,
  description: "Foco em Álgebra"
}`
          },
          {
            title: 'Passo 4: Convidar Alunos',
            content: 'Copie o código de 6 dígitos ou link direto. Compartilhe com alunos por WhatsApp ou email.'
          }
        ]
      }
    },
    {
      id: 'teachers',
      title: 'Guia para Professores',
      icon: Users,
      category: 'Usuários',
      content: {
        title: 'Professores',
        description: 'Recursos e funcionalidades para educadores',
        items: [
          {
            title: 'Gerenciar Turmas',
            list: [
              'Criar e organizar turmas',
              'Adicionar/remover alunos',
              'Visualizar lista de presença',
              'Acompanhar desempenho',
              'Enviar comunicados'
            ]
          },
          {
            title: 'Criar Atividades',
            list: [
              'Trabalhos dissertativos',
              'Provas objetivas',
              'Quizzes interativos',
              'Projetos em grupo',
              'Atividades com prazo'
            ]
          },
          {
            title: 'Correção Automática',
            content: 'Para questões objetivas, a correção é instantânea. Para dissertativas, use a IA como assistente.'
          }
        ]
      }
    },
    {
      id: 'students',
      title: 'Guia para Alunos',
      icon: GraduationCap,
      category: 'Usuários',
      content: {
        title: 'Alunos',
        description: 'Como usar a plataforma como estudante',
        items: [
          {
            title: 'Acessar Turmas',
            content: 'Use o código fornecido pelo professor para entrar em uma turma.'
          },
          {
            title: 'Realizar Atividades',
            list: [
              'Visualize prazos no calendário',
              'Responda questões',
              'Anexe arquivos',
              'Salve rascunhos',
              'Receba feedback'
            ]
          },
          {
            title: 'Chatbot Educacional',
            content: 'Tire dúvidas 24/7 com nosso assistente virtual.'
          }
        ]
      }
    },
    {
      id: 'chatbot',
      title: 'Chatbot com IA',
      icon: MessageSquare,
      category: 'Recursos',
      content: {
        title: 'Assistente Virtual',
        description: 'IA educacional para tirar dúvidas',
        items: [
          {
            title: 'Como Funciona',
            content: 'Nosso chatbot usa modelos de linguagem avançados treinados em conteúdo educacional.'
          },
          {
            title: 'Tipos de Perguntas',
            list: [
              'Explicação de conceitos',
              'Resolução de exercícios',
              'Dúvidas sobre matérias',
              'Recomendações de estudo',
              'Simulados e questões'
            ]
          }
        ]
      }
    },
    {
      id: 'plagiarism',
      title: 'Sistema Anti-Plágio',
      icon: Shield,
      category: 'Recursos',
      content: {
        title: 'Detecção de Plágio',
        description: 'IA para garantir originalidade',
        items: [
          {
            title: 'Como Funciona',
            content: 'Cada resposta dissertativa é analisada contra nossa base de conhecimento e internet.'
          },
          {
            title: 'Níveis de Alerta',
            list: [
              '🟢 Verde (0-20%): Originalidade alta',
              '🟡 Amarelo (20-50%): Suspeita baixa',
              '🟠 Laranja (50-70%): Investigar',
              '🔴 Vermelho (70-100%): Plágio detectado'
            ]
          }
        ]
      }
    },
    {
      id: 'analytics',
      title: 'Relatórios e Analytics',
      icon: BarChart3,
      category: 'Recursos',
      content: {
        title: 'Análise de Desempenho',
        description: 'Dados e insights educacionais',
        items: [
          {
            title: 'Dashboard do Professor',
            list: [
              'Média geral de turmas',
              'Taxa de conclusão',
              'Alunos com dificuldades',
              'Evolução temporal',
              'Comparativo entre turmas'
            ]
          },
          {
            title: 'Dashboard do Aluno',
            list: [
              'Suas notas e médias',
              'Progresso em cada matéria',
              'Ranking na turma',
              'Atividades pendentes',
              'Sugestões de melhoria'
            ]
          }
        ]
      }
    },
    {
      id: 'gamification',
      title: 'Gamificação',
      icon: Trophy,
      category: 'Recursos',
      content: {
        title: 'Sistema de Gamificação',
        description: 'XP, níveis e badges para engajar alunos',
        items: [
          {
            title: 'Sistema de XP',
            content: 'Alunos ganham XP realizando atividades. Cada 100 XP = 1 nível.',
            list: [
              'Submeter atividade: +20 XP',
              'Nota 9-10: bônus +50% XP',
              'Primeira atividade do dia: +5 XP',
              'Streak diário: +10 XP',
              'Participar em discussão: +5 XP'
            ]
          },
          {
            title: 'Badges e Conquistas',
            list: [
              '🏆 Primeira Atividade',
              '⭐ Nota 10',
              '🔥 Streak 7 dias',
              '📚 Estudioso - 50 atividades',
              '🥇 Top 3 do ranking'
            ]
          }
        ]
      }
    },
    {
      id: 'ml-analytics',
      title: 'Analytics com ML',
      icon: Brain,
      category: 'Recursos',
      content: {
        title: 'Machine Learning',
        description: '4 modelos de ML para insights avançados',
        items: [
          {
            title: 'K-Means Clustering',
            content: 'Agrupa alunos automaticamente em 3 clusters: Alto Desempenho, Médio e Baixo.'
          },
          {
            title: 'Análise de Sentimento',
            content: 'IA analisa textos de alunos detectando sentimentos: Positivo, Neutro ou Negativo.'
          },
          {
            title: 'Predição de Desempenho',
            content: 'Prevê nota final do aluno baseado em notas parciais, frequência e engajamento.'
          }
        ]
      }
    },
    {
      id: 'settings',
      title: 'Configurações',
      icon: Settings,
      category: 'Avançado',
      content: {
        title: 'Personalização',
        description: 'Configure a plataforma do seu jeito',
        items: [
          {
            title: 'Perfil',
            list: [
              'Alterar foto e informações',
              'Atualizar email e senha',
              'Preferências de notificação',
              'Tema claro/escuro'
            ]
          },
          {
            title: 'Privacidade',
            list: [
              'Controlar visibilidade',
              'Gerenciar dados',
              'Exportar ou deletar dados',
              'Histórico de acessos'
            ]
          }
        ]
      }
    },
    {
      id: 'api',
      title: 'API e Integrações',
      icon: Code,
      category: 'Avançado',
      content: {
        title: 'Integrações',
        description: 'Conecte com outras ferramentas',
        items: [
          {
            title: 'API REST',
            content: 'Acesse nossos endpoints para integrar TamanduAI com sistemas externos.'
          },
          {
            title: 'Integrações Disponíveis',
            list: [
              'Google Classroom',
              'Microsoft Teams',
              'Moodle',
              'Canvas LMS',
              'Google Drive',
              'Zoom'
            ]
          }
        ]
      }
    }
  ];

  const categories = useMemo(() => {
    const cats = new Set(sections.map(s => s.category));
    return Array.from(cats);
  }, []);

  const filteredSections = useMemo(() => {
    if (!searchQuery) return sections;
    return sections.filter(section => 
      section.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      section.content.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      section.content.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery, sections]);

  const currentSection = sections.find(s => s.id === selectedSection);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Seo 
        title="Documentação - TamanduAI"
        description="Guia completo para usar a plataforma TamanduAI"
      />

      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link to="/" className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-r from-cyan-600 via-blue-600 to-blue-800 rounded-xl flex items-center justify-center">
                  <BookOpen className="w-6 h-6 text-white" />
                </div>
                <span className="text-xl font-bold bg-gradient-to-r from-cyan-600 via-blue-600 to-blue-800 bg-clip-text text-transparent">
                  TamanduAI
                </span>
              </Link>
              <span className="text-sm text-gray-500 dark:text-gray-400 hidden sm:inline">Documentação</span>
            </div>
            <nav className="flex items-center gap-4">
              <Link to="/pricing">
                <Button variant="ghost" size="sm">Preços</Button>
              </Link>
              <Link to="/login">
                <Button variant="ghost" size="sm">Entrar</Button>
              </Link>
            </nav>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar */}
          <aside className="lg:w-64 flex-shrink-0">
            <div className="sticky top-24 space-y-6">
              {/* Back Button - Agora com z-index adequado */}
              <Link to="/">
                <Button 
                  variant="ghost" 
                  className="w-full justify-start relative z-10 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                  leftIcon={<ArrowLeft className="w-4 h-4" />}
                >
                  Voltar ao Início
                </Button>
              </Link>

              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  type="search"
                  placeholder="Buscar na documentação..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                  aria-label="Buscar documentação"
                />
              </div>

              {/* Navigation */}
              <nav className="space-y-1" aria-label="Navegação da documentação">
                {categories.map(category => {
                  const categorySections = filteredSections.filter(s => s.category === category);
                  if (categorySections.length === 0) return null;
                  
                  return (
                    <div key={category} className="space-y-1">
                      <h3 className="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        {category}
                      </h3>
                      {categorySections.map(section => (
                        <button
                          key={section.id}
                          onClick={() => setSelectedSection(section.id)}
                          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                            selectedSection === section.id
                              ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md'
                              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                          }`}
                          aria-current={selectedSection === section.id ? 'page' : undefined}
                        >
                          <section.icon className="w-5 h-5 flex-shrink-0" />
                          <span className="text-sm font-medium">{section.title}</span>
                        </button>
                      ))}
                    </div>
                  );
                })}
              </nav>
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1 min-w-0">
            <motion.div
              key={selectedSection}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="p-8">
                <div className="mb-6">
                  <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-3">
                    {currentSection?.content.title}
                  </h1>
                  {currentSection?.content.description && (
                    <p className="text-xl text-gray-600 dark:text-gray-300">
                      {currentSection.content.description}
                    </p>
                  )}
                </div>

                <div className="prose dark:prose-invert max-w-none">
                  {currentSection?.content.items.map((item, idx) => (
                    <div key={idx} className="mb-8">
                      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                        <ChevronRight className="w-6 h-6 text-blue-600" />
                        {item.title}
                      </h2>
                      
                      {item.content && (
                        <p className="text-gray-700 dark:text-gray-300 mb-4 leading-relaxed">
                          {item.content}
                        </p>
                      )}

                      {item.list && (
                        <ul className="space-y-2 ml-4">
                          {item.list.map((listItem, i) => (
                            <li key={i} className="flex items-start gap-3">
                              <div className="w-1.5 h-1.5 rounded-full bg-blue-600 mt-2 flex-shrink-0" />
                              <span className="text-gray-700 dark:text-gray-300">{listItem}</span>
                            </li>
                          ))}
                        </ul>
                      )}

                      {item.code && (
                        <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto mt-4">
                          <code>{item.code}</code>
                        </pre>
                      )}
                    </div>
                  ))}
                </div>

                {/* Navigation Footer */}
                <div className="flex items-center justify-between pt-8 mt-8 border-t border-gray-200 dark:border-gray-700">
                  <div>
                    {sections.findIndex(s => s.id === selectedSection) > 0 && (
                      <Button
                        variant="ghost"
                        onClick={() => setSelectedSection(sections[sections.findIndex(s => s.id === selectedSection) - 1].id)}
                        leftIcon={<ArrowLeft className="w-4 h-4" />}
                      >
                        Anterior
                      </Button>
                    )}
                  </div>
                  <div>
                    {sections.findIndex(s => s.id === selectedSection) < sections.length - 1 && (
                      <Button
                        variant="gradient"
                        onClick={() => setSelectedSection(sections[sections.findIndex(s => s.id === selectedSection) + 1].id)}
                        rightIcon={<ChevronRight className="w-4 h-4" />}
                      >
                        Próximo
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            </motion.div>
          </main>
        </div>
      </div>
    </div>
  );
}
