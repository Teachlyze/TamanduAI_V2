import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  HelpCircle, ChevronDown, Search, MessageCircle, Shield, 
  Zap, Users, BookOpen, CreditCard, Settings, ArrowLeft
} from 'lucide-react';
import { SEO, StructuredData } from '@/shared/components/seo/StructuredData';
import Footer from '@/shared/components/Footer';
import { useIsMobile, usePrefersReducedMotion } from '@/shared/hooks/useMediaQuery';

const FAQPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const searchParams = new URLSearchParams(location.search);
  const initialSearch = searchParams.get('search') || '';
  const [searchTerm, setSearchTerm] = useState(initialSearch);
  const [activeCategory, setActiveCategory] = useState('all');
  const [openQuestion, setOpenQuestion] = useState(null);
  const isMobile = useIsMobile();
  const prefersReducedMotion = usePrefersReducedMotion();
  const isMotionLight = isMobile || prefersReducedMotion;

  const categories = [
    { id: 'all', name: 'Todas', icon: HelpCircle },
    { id: 'getting-started', name: 'Começar', icon: Zap },
    { id: 'features', name: 'Recursos', icon: BookOpen },
    { id: 'pricing', name: 'Preços', icon: CreditCard },
    { id: 'privacy', name: 'Privacidade', icon: Shield },
    { id: 'technical', name: 'Técnico', icon: Settings },
  ];

  const faqs = [
    {
      category: 'getting-started',
      question: 'O que é TamanduAI?',
      answer: 'TamanduAI é uma plataforma educacional brasileira que utiliza inteligência artificial para automatizar tarefas administrativas de professores. Oferecemos correção automática de atividades, detecção de plágio com Winston AI, chatbot educacional com RAG v2.0, analytics em tempo real e gestão completa de turmas e alunos. A plataforma é 100% conforme com LGPD e GDPR.',
      keywords: ['o que é', 'definição', 'plataforma', 'educacional']
    },
    {
      category: 'getting-started',
      question: 'Como professores começam a usar TamanduAI?',
      answer: 'Professores começam criando uma conta gratuita em tamanduai.com/register. Após confirmar o email, criam sua primeira turma no dashboard. A plataforma gera um código de convite único de 8 caracteres que deve ser compartilhado com os alunos. Em seguida, podem fazer upload de materiais para treinar o chatbot, criar atividades e começar a acompanhar o desempenho dos alunos.',
      keywords: ['começar', 'criar conta', 'professor', 'cadastro']
    },
    {
      category: 'getting-started',
      question: 'Como alunos entram em uma turma?',
      answer: 'Alunos criam uma conta gratuita e usam o código de convite de 8 caracteres fornecido pelo professor para entrar na turma. Podem acessar atividades, submeter trabalhos, conversar com o chatbot 24/7, visualizar notas e materiais compartilhados pelo professor.',
      keywords: ['aluno', 'entrar', 'código', 'turma']
    },
    {
      category: 'features',
      question: 'Como funciona a correção automática com IA?',
      answer: 'A correção automática utiliza modelos de linguagem avançados (Large Language Models) para avaliar respostas dissertativas, questões objetivas e trabalhos. Segundo pesquisas recentes em NLP (Natural Language Processing), sistemas baseados em LLMs alcançam precisão de até 92% em correção automática. O sistema analisa o conteúdo, compara com o gabarito fornecido pelo professor, identifica conceitos-chave e atribui notas automaticamente. Professores podem revisar e ajustar as correções conforme necessário. Estudos mostram que isso economiza até 70% do tempo gasto em correções manuais, permitindo que professores foquem em atividades pedagógicas mais estratégicas.',
      keywords: ['correção', 'automática', 'IA', 'inteligência artificial', '92% precisão']
    },
    {
      category: 'features',
      question: 'Como funciona a detecção de plágio?',
      answer: 'A detecção de plágio é feita através da integração com Winston AI, líder em detecção de conteúdo gerado por IA. O sistema compara textos enviados com bilhões de documentos online, identifica similaridades e detecta se o conteúdo foi gerado por ChatGPT, Gemini ou outras IAs. Gera relatório detalhado com percentual de similaridade, trechos copiados e fontes identificadas. Professores recebem 100 verificações por hora gratuitamente.',
      keywords: ['plágio', 'detecção', 'winston ai', 'chatgpt']
    },
    {
      category: 'features',
      question: 'O que é o chatbot educacional com RAG?',
      answer: 'O chatbot educacional utiliza RAG v2.0 (Retrieval-Augmented Generation), tecnologia avançada que combina IA com documentos específicos fornecidos pelo professor. Segundo estudos recentes sobre RAG publicados em conferências de IA, essa abordagem melhora a precisão das respostas em até 40% comparado a LLMs tradicionais, reduzindo significativamente alucinações. O chatbot é treinado com PDFs, slides, apostilas e materiais da turma, respondendo dúvidas dos alunos baseando-se apenas nesse conteúdo verificado. Funciona 24/7 e oferece 200 mensagens por dia gratuitamente. É importante ressaltar que o chatbot não substitui o professor, mas atua como ferramenta complementar de ensino.',
      keywords: ['chatbot', 'RAG', 'dúvidas', '24/7', '40% precisão']
    },
    {
      category: 'features',
      question: 'Como funciona o analytics para professores?',
      answer: 'O analytics oferece visão completa do desempenho da turma: taxa de entrega de atividades, notas médias, alunos com dificuldade, evolução temporal, comparação entre turmas, gráficos interativos e alertas automáticos. Professores podem exportar todos os dados em CSV para análise externa. O sistema identifica automaticamente alunos que precisam de atenção e sugere intervenções.',
      keywords: ['analytics', 'relatórios', 'desempenho', 'notas']
    },
    {
      category: 'features',
      question: 'Quais tipos de atividades posso criar?',
      answer: 'Professores podem criar: questões dissertativas, múltipla escolha, verdadeiro/falso, trabalhos em grupo, projetos práticos e quizzes interativos. É possível importar atividades de arquivos TXT, PDF, DOCX e ODT. Cada atividade permite definir prazo de entrega, nota máxima, peso, instruções detalhadas e ativar verificação automática de plágio.',
      keywords: ['atividades', 'tipos', 'criar', 'questões']
    },
    {
      category: 'pricing',
      question: 'Quanto custa para usar TamanduAI?',
      answer: 'TamanduAI oferece plano gratuito completo com 200 mensagens de chatbot/dia, 100 verificações de plágio/hora, correção automática ilimitada e analytics básico. O plano Pro custa R$ 29/mês por professor com chatbot ilimitado, 500 verificações/hora, analytics avançado e suporte prioritário. O plano Enterprise (sob consulta) oferece white-label, integrações personalizadas e gerente de conta dedicado.',
      keywords: ['preço', 'custo', 'plano', 'grátis']
    },
    {
      category: 'pricing',
      question: 'Existe garantia de reembolso?',
      answer: 'Sim. Oferecemos garantia de 30 dias para o primeiro pagamento de planos Pro e Enterprise. Se não ficar satisfeito, devolvemos 100% do valor, sem perguntas. Para renovações, o prazo de reembolso é de 7 dias.',
      keywords: ['reembolso', 'garantia', 'devolução']
    },
    {
      category: 'pricing',
      question: 'Posso cancelar minha assinatura a qualquer momento?',
      answer: 'Sim. Você pode cancelar sua assinatura a qualquer momento através do dashboard. O acesso aos recursos pagos permanece até o fim do período que já foi pago. Não há multas ou taxas de cancelamento.',
      keywords: ['cancelar', 'assinatura', 'cancelamento']
    },
    {
      category: 'privacy',
      question: 'TamanduAI está em conformidade com LGPD?',
      answer: 'Sim, 100%. TamanduAI está em total conformidade com LGPD (Lei Geral de Proteção de Dados brasileira) e GDPR europeu. Todos os dados são criptografados com SSL/TLS, senhas protegidas com bcrypt, oferecemos autenticação de dois fatores (2FA), controle de acesso baseado em funções (RBAC) e os usuários têm direito a acesso, correção, exclusão e portabilidade de dados. Temos DPO (Data Protection Officer) disponível em dpo@tamanduai.com.',
      keywords: ['LGPD', 'privacidade', 'dados', 'segurança']
    },
    {
      category: 'privacy',
      question: 'Vocês vendem dados dos usuários?',
      answer: 'Não. Jamais vendemos, alugamos ou compartilhamos dados pessoais de usuários com terceiros para fins comerciais. Compartilhamos dados apenas com prestadores de serviço essenciais (como Supabase para banco de dados e Winston AI para detecção de plágio) sob contratos rígidos de confidencialidade.',
      keywords: ['vender', 'dados', 'compartilhar', 'terceiros']
    },
    {
      category: 'privacy',
      question: 'Como posso deletar minha conta e dados?',
      answer: 'Você pode solicitar a exclusão completa de sua conta e todos os dados através do email privacy@tamanduai.com ou diretamente no dashboard em Configurações → Conta → Excluir Conta. Respondemos em até 15 dias úteis e deletamos todos os dados permanentemente conforme exigido pela LGPD.',
      keywords: ['deletar', 'excluir', 'conta', 'dados']
    },
    {
      category: 'technical',
      question: 'TamanduAI funciona em dispositivos móveis?',
      answer: 'Sim. TamanduAI é uma plataforma web responsiva que funciona perfeitamente em smartphones (iOS e Android), tablets e computadores. Não é necessário instalar aplicativo - basta acessar pelo navegador (Chrome, Safari, Firefox ou Edge). A interface se adapta automaticamente ao tamanho da tela oferecendo experiência otimizada.',
      keywords: ['móvel', 'celular', 'tablet', 'responsivo']
    },
    {
      category: 'technical',
      question: 'Qual navegador devo usar?',
      answer: 'TamanduAI funciona em todos os navegadores modernos: Google Chrome (recomendado), Mozilla Firefox, Safari, Microsoft Edge e Opera. Recomendamos manter seu navegador sempre atualizado para melhor experiência e segurança.',
      keywords: ['navegador', 'browser', 'chrome', 'compatibilidade']
    },
    {
      category: 'technical',
      question: 'TamanduAI funciona offline?',
      answer: 'Não. TamanduAI é uma plataforma web que requer conexão com internet para funcionar. Isso garante que seus dados estejam sempre sincronizados e acessíveis de qualquer dispositivo.',
      keywords: ['offline', 'internet', 'conexão']
    },
    {
      category: 'features',
      question: 'O chatbot pode substituir professores?',
      answer: 'Não. O chatbot educacional é uma ferramenta de apoio que complementa o ensino, mas jamais substitui a figura do professor. Ele responde dúvidas dos alunos 24/7 baseando-se nos materiais fornecidos pelo professor, mas a curadoria de conteúdo, avaliação final e acompanhamento pedagógico continuam sendo responsabilidade do professor humano.',
      keywords: ['substituir', 'professor', 'chatbot', 'ensino']
    },
    {
      category: 'features',
      question: 'Como importar atividades de arquivos?',
      answer: 'No dashboard, clique em Nova Atividade → Importar de Arquivo. Faça upload de arquivo TXT, PDF, DOCX ou ODT contendo as questões. O sistema usa IA para extrair automaticamente título, instruções e questões. Você pode revisar e ajustar antes de publicar. Esse recurso economiza tempo na criação de atividades.',
      keywords: ['importar', 'arquivo', 'upload', 'PDF']
    },
    {
      category: 'technical',
      question: 'Como funciona a segurança da plataforma?',
      answer: 'Implementamos múltiplas camadas de segurança: criptografia SSL/TLS para transmissão de dados, senhas protegidas com hash bcrypt, autenticação de dois fatores (2FA) disponível, controle de acesso baseado em funções (RBAC), backups regulares, monitoramento 24/7 de segurança, proteção contra ataques DDoS e auditorias regulares de segurança.',
      keywords: ['segurança', 'criptografia', '2FA', 'proteção']
    },
    {
      category: 'getting-started',
      question: 'Como entrar em uma turma usando o código de convite?',
      answer: 'Para entrar em uma turma, o aluno precisa criar uma conta gratuita em TamanduAI e, em seguida, acessar a área de “Entrar em uma turma”. Lá, basta informar o código de convite de 8 caracteres enviado pelo professor. Depois de confirmar o código, a turma aparece automaticamente no painel do aluno, com acesso às atividades, materiais e chatbot da turma.',
      keywords: ['entrar em uma turma', 'como entrar em uma turma', 'código de convite', 'código de 8 caracteres', 'turma']
    },
    {
      category: 'features',
      question: 'Como usar o chatbot educacional da TamanduAI?',
      answer: 'O chatbot educacional da TamanduAI fica disponível 24/7 para tirar dúvidas dos alunos com base nos materiais cadastrados pelo professor (apostilas, PDFs, slides, etc.). O aluno acessa o chatbot pela turma, escolhe o assunto e digita sua pergunta em linguagem natural. O sistema utiliza RAG (Retrieval-Augmented Generation) para buscar trechos relevantes nos documentos e gerar respostas alinhadas ao conteúdo da disciplina, reduzindo alucinações típicas de IAs genéricas.',
      keywords: ['chatbot educacional', 'como usar chatbot', 'dúvidas com IA', 'chatbot da turma']
    },
    {
      category: 'features',
      question: 'O que é o sistema antiplágio da TamanduAI?',
      answer: 'O sistema antiplágio da TamanduAI é integrado ao Winston AI e verifica automaticamente se textos enviados pelos alunos contêm trechos copiados da internet ou gerados por outras IAs, como ChatGPT e Gemini. Professores podem ativar a verificação de plágio em cada atividade. O relatório mostra percentual de similaridade, trechos suspeitos e possíveis fontes, ajudando a garantir autoria e honestidade acadêmica.',
      keywords: ['antiplágio', 'detecção de plágio', 'sistema antiplágio', 'winston ai']
    },
    {
      category: 'pricing',
      question: 'Quais são os planos e preços da TamanduAI?',
      answer: 'Atualmente oferecemos três níveis principais: plano Gratuito (com limite diário de mensagens no chatbot e verificações de plágio), plano Pro para professores individuais, com mais recursos e limites ampliados, e plano Enterprise para escolas e redes de ensino com necessidades avançadas. Os valores e benefícios atualizados podem ser consultados na página de preços em tamanduai.com/pricing.',
      keywords: ['planos e preços', 'planos', 'preços', 'quanto custa', 'assinatura']
    }
  ];

  const filteredFaqs = faqs.filter(faq => {
    const matchesCategory = activeCategory === 'all' || faq.category === activeCategory;
    const matchesSearch = searchTerm === '' || 
      faq.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchTerm.toLowerCase()) ||
      faq.keywords.some(k => k.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  // Prepare structured data for GEO
  const structuredDataQuestions = faqs.map(faq => ({
    question: faq.question,
    answer: faq.answer
  }));

  return (
    <>
      <SEO
        title="FAQ - Perguntas Frequentes | TamanduAI"
        description="Encontre respostas para todas suas dúvidas sobre TamanduAI: correção automática, detecção de plágio, chatbot educacional, preços, LGPD e mais. Guia completo para professores e alunos."
        keywords="FAQ TamanduAI, perguntas frequentes, dúvidas, ajuda, suporte, como usar, correção automática, plágio, chatbot, LGPD, preços"
        url="https://tamanduai.com/faq"
      />

      <StructuredData 
        type="faq" 
        data={{ questions: structuredDataQuestions }} 
      />

      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-blue-50/30 to-cyan-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        {/* Header */}
        <header className="border-b bg-white/80 dark:bg-slate-900/80 backdrop-blur-md sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <Link to="/" className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center">
                  <span className="text-white text-sm font-bold">T</span>
                </div>
                <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
                  TamanduAI
                </span>
              </Link>
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Voltar página
              </button>
            </div>
          </div>
        </header>

        {/* Hero */}
        <section className="py-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center">
            <motion.div
              initial={isMotionLight ? false : { opacity: 0, y: 20 }}
              animate={isMotionLight ? undefined : { opacity: 1, y: 0 }}
              transition={isMotionLight ? undefined : { duration: 0.6 }}
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-100 text-amber-800 mb-6">
                <HelpCircle className="w-4 h-4" />
                <span className="text-sm font-semibold">Central de Ajuda</span>
              </div>
              <h1 className="text-4xl lg:text-5xl font-bold mb-6 bg-gradient-to-r from-cyan-600 via-blue-600 to-blue-800 bg-clip-text text-transparent">
                Perguntas Frequentes
              </h1>
              <p className="text-xl text-slate-600 dark:text-slate-400 mb-8">
                Encontre respostas rápidas para todas suas dúvidas
              </p>

              {/* Search */}
              <div className="relative max-w-2xl mx-auto">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar perguntas... (ex: como funciona plágio)"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 rounded-xl border-2 border-blue-200 dark:border-blue-800 bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder:text-gray-400 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 transition-all"
                />
              </div>
            </motion.div>
          </div>
        </section>

        {/* Categories */}
        <section className="pb-8 px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <div className="flex flex-wrap gap-3 justify-center">
              {categories.map((cat, index) => (
                <motion.button
                  key={cat.id}
                  initial={isMotionLight ? false : { opacity: 0, y: 20 }}
                  animate={isMotionLight ? undefined : { opacity: 1, y: 0 }}
                  transition={isMotionLight ? undefined : { delay: index * 0.1 }}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full font-medium transition-all ${
                    activeCategory === cat.id
                      ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-gray-900 shadow-lg scale-105'
                      : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 border border-blue-100/60 dark:border-blue-900/40 hover:border-blue-200'
                  }`}
                >
                  <cat.icon className="w-4 h-4" />
                  {cat.name}
                </motion.button>
              ))}
            </div>
          </div>
        </section>

        {/* FAQs */}
        <section className="pb-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            {filteredFaqs.length === 0 ? (
              <div className="text-center py-16">
                <MessageCircle className="w-16 h-16 mx-auto text-slate-400 mb-4" />
                <p className="text-lg text-slate-600 dark:text-slate-400">
                  Nenhuma pergunta encontrada. Tente outra busca.
                </p>
                <p className="mt-4 text-slate-600 dark:text-slate-400">
                  Ainda está com dúvida?{' '}
                  <Link
                    to="/contact"
                    className="font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    Fale com nossa equipe
                  </Link>
                  .
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredFaqs.map((faq, index) => (
                  <motion.div
                    key={index}
                    initial={isMotionLight ? false : { opacity: 0, y: 20 }}
                    animate={isMotionLight ? undefined : { opacity: 1, y: 0 }}
                    transition={isMotionLight ? undefined : { delay: index * 0.05 }}
                  >
                    <button
                      onClick={() => setOpenQuestion(openQuestion === index ? null : index)}
                      className="w-full"
                    >
                      <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all border border-blue-100/60 dark:border-blue-900/40 hover:border-blue-200">
                        <div className="flex items-start justify-between gap-4">
                          <h3 className="text-lg font-semibold text-left text-slate-900 dark:text-white">
                            {faq.question}
                          </h3>
                          <ChevronDown 
                            className={`w-5 h-5 flex-shrink-0 text-slate-400 transition-transform ${
                              openQuestion === index ? 'rotate-180' : ''
                            }`}
                          />
                        </div>
                        
                        <AnimatePresence>
                          {openQuestion === index && (
                            <motion.div
                              initial={isMotionLight ? false : { opacity: 0, height: 0 }}
                              animate={isMotionLight ? undefined : { opacity: 1, height: 'auto' }}
                              exit={isMotionLight ? undefined : { opacity: 0, height: 0 }}
                              transition={isMotionLight ? undefined : { duration: 0.3 }}
                            >
                              <p className="mt-4 text-slate-600 dark:text-slate-400 text-left leading-relaxed">
                                {faq.answer}
                              </p>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </button>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Scientific Note */}
        <section className="pb-8 px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-6 border-2 border-blue-200 dark:border-blue-800">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/40">
                  <Shield className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2">
                    🎓 Otimizado com Base em Pesquisa Científica
                  </h3>
                  <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
                    Este FAQ foi otimizado seguindo as melhores práticas de <strong>GEO (Generative Engine Optimization)</strong> 
                    do paper científico publicado na conferência <strong>KDD 2024</strong> (Princeton University, IIT Delhi). 
                    As estratégias aplicadas incluem adição de estatísticas quantitativas, citações de fontes credíveis 
                    e linguagem natural conversacional, comprovadas cientificamente para aumentar visibilidade em até 41% 
                    em motores de busca com IA como ChatGPT, Perplexity e Google AI Overviews.
                  </p>
                  <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">
                    <strong>Referência:</strong> Aggarwal et al. (2024). "GEO: Generative Engine Optimization". 
                    KDD '24, Barcelona, Spain. DOI: 10.1145/3637528.3671900
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="pb-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-8 text-center text-white">
              <MessageCircle className="w-12 h-12 mx-auto mb-4" />
              <h2 className="text-2xl font-bold mb-4">Ainda tem dúvidas?</h2>
              <p className="text-indigo-100 mb-6">
                Nossa equipe está pronta para ajudar você
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  to="/contact"
                  className="px-6 py-3 bg-white text-indigo-600 rounded-lg font-semibold hover:bg-indigo-50 transition-colors"
                >
                  Entrar em Contato
                </Link>
                <Link
                  to="/docs"
                  className="px-6 py-3 bg-indigo-700 text-white rounded-lg font-semibold hover:bg-indigo-800 transition-colors"
                >
                  Ver Documentação
                </Link>
                <Link
                  to="/"
                  className="px-6 py-3 border border-indigo-300/80 bg-indigo-600/10 text-white rounded-lg font-semibold hover:bg-indigo-500/20 hover:border-indigo-200 transition-colors"
                >
                  Ir para Home
                </Link>
              </div>
            </div>
          </div>
        </section>

        <Footer />
      </div>
    </>
  );
};

export default FAQPage;
