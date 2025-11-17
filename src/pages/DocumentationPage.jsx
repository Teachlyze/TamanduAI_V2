import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import Seo from '@/shared/components/Seo';
import { Button } from '@/shared/components/ui/button';
import { Card } from '@/shared/components/ui/card';
import { Input } from '@/shared/components/ui/input';
import Footer from '@/shared/components/Footer';
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
        description: 'Plataforma Educacional com Inteligência Artificial',
        items: [
          {
            title: 'O que é TamanduAI?',
            content: 'TamanduAI é uma plataforma educacional brasileira que combina IA para gestão de turmas, criação de atividades com correção automática, chatbot com RAG personalizado, detecção de conteúdo gerado por IA (Winston AI) e analytics em tempo real com exportação de relatórios.'
          },
          {
            title: 'Funcionalidades Principais (MVP)',
            list: [
              'Chatbot v1.0 com RAG: IA treinada com seus materiais (PDF, Word, PPT, URLs)',
              'Correção Automática com IA: Economize 70% do tempo',
              'Winston AI: Detecta se texto foi gerado por IA (100 verificações/hora)',
              'Analytics em Tempo Real: Dashboards + exportação CSV',
              'Calendário de Eventos: Aulas recorrentes e prazos',
              'Gestão Multi-perfil: Professor, Aluno e Escola'
            ]
          },
          {
            title: 'Roadmap 2026',
            content: 'Estamos em constante evolução! Em 2026 vamos adicionar: Gestão Escolar completa, Sistema Financeiro, Gamificação, Portal dos Pais, Tutor Personalizado IA, Analytics com ML e muito mais.',
            list: [
              'Q1 2026: Gestão Escolar & IA Financeira',
              'Q2 2026: Gamificação & Notificações',
              'Q3 2026: Portal dos Pais & Tutor IA',
              'Q4 2026: Banco de Questões & Aprimoramentos'
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
              'Criar turmas com código de convite',
              'Adicionar/remover alunos',
              'Acompanhar desempenho (notas e estatísticas)',
              'Visualizar histórico de atividades'
            ]
          },
          {
            title: 'Criar Atividades',
            list: [
              'Trabalhos dissertativos com correção automática por IA',
              'Importar atividades de TXT, PDF, DOCX, ODT',
              'Verificação de conteúdo gerado por IA (Winston AI)',
              'Atividades com prazo e calendário',
              'Exportar relatórios em CSV'
            ]
          },
          {
            title: 'Treinar Chatbot',
            content: 'Carregue seus materiais (PDF, Word, PowerPoint, URLs) e o chatbot aprende automaticamente. Até 200 mensagens por dia.',
            list: [
              'Upload de PDF, DOCX, PPTX',
              'Adicionar URLs de conteúdo',
              'Chatbot responde baseado nos seus materiais',
              'Disponível 24/7 para alunos'
            ]
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
            title: 'Entrar em Turmas',
            content: 'Use o código de 6 dígitos fornecido pelo professor para entrar em uma turma.'
          },
          {
            title: 'Realizar Atividades',
            list: [
              'Visualize prazos no calendário',
              'Responda questões dissertativas',
              'Submeta suas respostas',
              'Receba correção automática com IA',
              'Veja notas e histórico'
            ]
          },
          {
            title: 'Usar o Chatbot',
            content: 'Tire dúvidas 24/7 sobre os materiais da turma. O chatbot foi treinado com o conteúdo que o professor carregou.',
            list: [
              'Até 200 mensagens por dia',
              'Respostas baseadas no material da disciplina',
              'Disponível a qualquer hora'
            ]
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
        title: 'Chatbot v1.0 com RAG',
        description: 'IA personalizada treinada com SEU material didático',
        items: [
          {
            title: 'Como Funciona o RAG',
            content: 'RAG (Retrieval-Augmented Generation) é uma técnica de IA onde o chatbot busca informações nos materiais que VOCÊ carregou antes de responder. Isso garante respostas baseadas no seu conteúdo, não em conhecimento genérico.',
            list: [
              '1. Você carrega PDFs, Word, PowerPoint ou URLs',
              '2. O sistema processa e indexa o conteúdo',
              '3. Alunos fazem perguntas',
              '4. O chatbot busca nos SEUS materiais',
              '5. Responde baseado no que você ensinou'
            ]
          },
          {
            title: 'Limitações Atuais',
            list: [
              'Até 200 mensagens por dia',
              'Apenas responde sobre conteúdo carregado',
              'Versão 1.0 - será aprimorado em 2026',
              'Recomendações IA ainda em Beta'
            ]
          },
          {
            title: 'Próximas Versões',
            content: 'Em 2026: v2.0 com memória de conversas, v3.0 multi-idioma, v4.0 otimizado, v5.0 integrado'
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
        title: 'Winston AI - Detector de Conteúdo IA',
        description: 'Detecta se texto foi gerado por Inteligência Artificial',
        items: [
          {
            title: 'O Que é Winston AI',
            content: 'Winston AI é uma ferramenta especializada em detectar se um texto foi escrito por humano ou gerado por IA (ChatGPT, GPT-4, Claude, etc). NÃO detecta plágio tradicional.',
            list: [
              '100 verificações por hora',
              'Detecta ChatGPT, GPT-4, Claude, Bard',
              'Score de 0-100% de conteúdo IA',
              'Relatório instantâneo'
            ]
          },
          {
            title: 'Como Interpretar',
            list: [
              '🟢 0-20%: Provavelmente escrito por humano',
              '🟡 20-60%: Suspeita moderada',
              '🔴 60-100%: Altamente provável que foi gerado por IA'
            ]
          },
          {
            title: 'Importante',
            content: 'Winston AI detecta APENAS conteúdo gerado por IA. Para plágio tradicional (cópia de sites ou trabalhos), essa funcionalidade estará disponível no futuro.'
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
            title: 'Dashboards em Tempo Real',
            content: 'Visualize métricas e estatísticas atualizadas em tempo real sobre turmas e alunos.',
            list: [
              'Média geral de turmas',
              'Notas individuais por aluno',
              'Histórico de submissões',
              'Estatísticas de atividades'
            ]
          },
          {
            title: 'Exportação de Relatórios',
            content: 'Exporte todos os dados em formato CSV para análise externa ou backup.',
            list: [
              'Exportar notas em CSV',
              'Exportar lista de alunos',
              'Exportar histórico de atividades',
              'Compatível com Excel e Google Sheets'
            ]
          },
          {
            title: 'Próximas Funcionalidades (2026)',
            list: [
              'Q4 2026: Analytics Avançado com Machine Learning',
              'Previsão de desempenho com IA',
              'Clustering automático de alunos',
              'Análise de sentimento'
            ]
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
      id: 'roadmap',
      title: 'Roadmap 2026',
      icon: Calendar,
      category: 'Avançado',
      content: {
        title: 'Futuro da Plataforma',
        description: 'Veja o que está por vir',
        items: [
          {
            title: 'Q1 2026 - Gestão Escolar',
            list: [
              'Dashboard Escolar Completo',
              'Sistema Financeiro',
              'Controle de Frequência',
              'Exportações PDF e Excel'
            ]
          },
          {
            title: 'Q2 2026 - Gamificação',
            list: [
              'Sistema de XP e Níveis',
              'Badges e Conquistas',
              'Rankings e Competições',
              'Notificações'
            ]
          },
          {
            title: 'Q3 2026 - Portal dos Pais',
            list: [
              'Dashboard para Pais',
              'Tutor Personalizado IA',
              'Comunicação Escola-Pais'
            ]
          },
          {
            title: '2027+ - Integrações',
            content: 'API pública e integrações com Google Classroom, Moodle, Teams e mais.'
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

      <Footer />
    </div>
  );
}
