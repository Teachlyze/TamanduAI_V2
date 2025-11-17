import React from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Shield, Eye, Lock, Database, FileText, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import Footer from '@/shared/components/Footer';

export default function PrivacyPolicyPage() {
  return (
    <>
      <Helmet>
        <title>Política de Privacidade | TamanduAI</title>
        <meta name="description" content="Política de Privacidade da plataforma TamanduAI. Saiba como coletamos, usamos e protegemos seus dados pessoais." />
      </Helmet>

      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-50 dark:from-slate-900 dark:via-blue-950 dark:to-slate-900">
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
              <Link
                to="/"
                className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Voltar para Home
              </Link>
            </div>
          </div>
        </header>

        {/* Hero */}
        <section className="py-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 mb-6">
                <Shield className="w-4 h-4" />
                <span className="text-sm font-semibold">Última atualização: 16 de Novembro de 2025</span>
              </div>
              <h1 className="text-4xl lg:text-5xl font-bold mb-6 bg-gradient-to-r from-blue-600 via-cyan-600 to-purple-600 bg-clip-text text-transparent">
                Política de Privacidade
              </h1>
              <p className="text-xl text-slate-600 dark:text-slate-400">
                Transparência total sobre como protegemos seus dados
              </p>
            </motion.div>
          </div>
        </section>

        {/* Content */}
        <section className="pb-20 px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="max-w-4xl mx-auto"
          >
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl p-8 lg:p-12 space-y-8">
              
              {/* Introdução */}
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                  <Eye className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl font-bold mb-4">1. Introdução</h2>
                  <p className="text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
                    A <strong>TamanduAI</strong> ("nós", "nosso" ou "plataforma") está comprometida com a proteção da privacidade e dos dados pessoais de seus usuários. Esta Política de Privacidade descreve como coletamos, usamos, armazenamos e protegemos suas informações pessoais.
                  </p>
                  <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                    Ao utilizar nossa plataforma, você concorda com as práticas descritas nesta política. Esta política está em conformidade com a <strong>Lei Geral de Proteção de Dados (LGPD - Lei 13.709/2018)</strong> e o <strong>General Data Protection Regulation (GDPR)</strong>.
                  </p>
                </div>
              </div>

              <hr className="border-slate-200 dark:border-slate-700" />

              {/* Dados Coletados */}
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-lg bg-cyan-100 dark:bg-cyan-900/30">
                  <Database className="w-6 h-6 text-cyan-600 dark:text-cyan-400" />
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl font-bold mb-4">2. Dados Coletados</h2>
                  
                  <h3 className="text-lg font-semibold mb-2">2.1 Dados Fornecidos por Você</h3>
                  <ul className="list-disc list-inside space-y-2 text-slate-600 dark:text-slate-400 mb-4">
                    <li><strong>Cadastro:</strong> Nome completo, e-mail, CPF, telefone, data de nascimento</li>
                    <li><strong>Perfil:</strong> Foto de perfil, instituição de ensino, especialização</li>
                    <li><strong>Conteúdo:</strong> Atividades, submissões, materiais didáticos, mensagens do chatbot</li>
                    <li><strong>Pagamento:</strong> Dados de transação (processados por terceiros seguros)</li>
                  </ul>

                  <h3 className="text-lg font-semibold mb-2">2.2 Dados Coletados Automaticamente</h3>
                  <ul className="list-disc list-inside space-y-2 text-slate-600 dark:text-slate-400">
                    <li><strong>Uso da plataforma:</strong> Páginas acessadas, tempo de sessão, cliques</li>
                    <li><strong>Dispositivo:</strong> Tipo de dispositivo, navegador, sistema operacional, IP</li>
                    <li><strong>Performance:</strong> Métricas de velocidade e experiência (via Vercel Analytics)</li>
                    <li><strong>Cookies:</strong> Preferências e autenticação (veja nossa Política de Cookies)</li>
                  </ul>
                </div>
              </div>

              <hr className="border-slate-200 dark:border-slate-700" />

              {/* Uso dos Dados */}
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                  <FileText className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl font-bold mb-4">3. Como Usamos Seus Dados</h2>
                  <ul className="list-disc list-inside space-y-2 text-slate-600 dark:text-slate-400">
                    <li>Fornecer, operar e melhorar a plataforma educacional</li>
                    <li>Processar atividades, correções automáticas e detecção de plágio</li>
                    <li>Personalizar o chatbot e recomendações de aprendizado</li>
                    <li>Gerar relatórios de desempenho e analytics para professores</li>
                    <li>Enviar notificações importantes sobre sua conta e atividades</li>
                    <li>Prevenir fraudes e garantir a segurança da plataforma</li>
                    <li>Cumprir obrigações legais e regulatórias</li>
                  </ul>

                  <h3 className="text-lg font-semibold mb-2 mt-4">3.1 Conteúdo de estudo e decks importados</h3>
                  <p className="text-slate-600 dark:text-slate-400 leading-relaxed mb-2">
                    Conteúdos de estudo que você envia ou importa para a Plataforma (como atividades, materiais didáticos, decks de flashcards ou arquivos de estudo, incluindo arquivos de deck de terceiros como Anki) são armazenados de forma privada e vinculados à sua conta. Esses conteúdos não são exibidos publicamente nem disponibilizados a outros usuários, salvo quando você utilizar funcionalidades específicas de compartilhamento (por exemplo, dentro de turmas ou recursos colaborativos que você optar por usar).
                  </p>
                  <p className="text-slate-600 dark:text-slate-400 leading-relaxed mb-2">
                    O conteúdo importado é processado apenas para fins de funcionamento da Plataforma, como geração e organização de flashcards, cálculo de estatísticas de estudo e recomendações pedagógicas. Não utilizamos o conteúdo dos seus decks ou arquivos de estudo para fins de publicidade, venda de dados ou qualquer análise comercial externa.
                  </p>
                  <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                    Aplicam-se a esses dados as mesmas medidas de segurança descritas nesta Política, incluindo criptografia em trânsito, controles de acesso e demais mecanismos técnicos e organizacionais adotados para proteger suas informações contra acesso não autorizado, perda ou divulgação indevida.
                  </p>
                </div>
              </div>

              <hr className="border-slate-200 dark:border-slate-700" />

              {/* Compartilhamento */}
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-lg bg-amber-100 dark:bg-amber-900/30">
                  <Lock className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl font-bold mb-4">4. Compartilhamento de Dados</h2>
                  <p className="text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
                    <strong>Não vendemos seus dados pessoais.</strong> Compartilhamos informações apenas nas seguintes situações:
                  </p>
                  <ul className="list-disc list-inside space-y-2 text-slate-600 dark:text-slate-400">
                    <li><strong>Provedores de serviço:</strong> Supabase (banco de dados), Vercel (hospedagem), Winston AI (antiplágio)</li>
                    <li><strong>Processadores de pagamento:</strong> Stripe ou Mercado Pago (dados de pagamento)</li>
                    <li><strong>Requisitos legais:</strong> Quando exigido por lei ou ordem judicial</li>
                    <li><strong>Com seu consentimento:</strong> Quando você autorizar explicitamente</li>
                  </ul>
                </div>
              </div>

              <hr className="border-slate-200 dark:border-slate-700" />

              {/* Segurança */}
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-lg bg-red-100 dark:bg-red-900/30">
                  <Shield className="w-6 h-6 text-red-600 dark:text-red-400" />
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl font-bold mb-4">5. Segurança dos Dados</h2>
                  <p className="text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
                    Implementamos medidas técnicas e organizacionais para proteger seus dados:
                  </p>
                  <ul className="list-disc list-inside space-y-2 text-slate-600 dark:text-slate-400">
                    <li>Criptografia SSL/TLS para transmissão de dados</li>
                    <li>Senhas protegidas com hash bcrypt</li>
                    <li>Autenticação de dois fatores (2FA) disponível</li>
                    <li>Controle de acesso baseado em funções (RBAC)</li>
                    <li>Backups regulares e recuperação de desastres</li>
                    <li>Monitoramento contínuo de segurança</li>
                  </ul>
                </div>
              </div>

              <hr className="border-slate-200 dark:border-slate-700" />

              {/* Retenção */}
              <div>
                <h2 className="text-2xl font-bold mb-4">6. Retenção de Dados</h2>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                  Mantemos seus dados apenas pelo tempo necessário para fornecer os serviços e cumprir obrigações legais:
                </p>
                <ul className="list-disc list-inside space-y-2 text-slate-600 dark:text-slate-400 mt-4">
                  <li><strong>Dados de conta ativa:</strong> Durante a vigência do uso da plataforma</li>
                  <li><strong>Dados de atividades/submissões:</strong> Por até 5 anos após conclusão (para fins educacionais)</li>
                  <li><strong>Dados de pagamento:</strong> Conforme exigido pela legislação tributária (5 anos)</li>
                  <li><strong>Logs de acesso:</strong> Por até 6 meses</li>
                </ul>
              </div>

              <hr className="border-slate-200 dark:border-slate-700" />

              {/* Seus Direitos */}
              <div>
                <h2 className="text-2xl font-bold mb-4">7. Seus Direitos (LGPD e GDPR)</h2>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
                  Você tem os seguintes direitos sobre seus dados pessoais:
                </p>
                <ul className="list-disc list-inside space-y-2 text-slate-600 dark:text-slate-400">
                  <li><strong>Acesso:</strong> Solicitar cópia de todos os dados que temos sobre você</li>
                  <li><strong>Correção:</strong> Corrigir dados incorretos ou desatualizados</li>
                  <li><strong>Exclusão:</strong> Solicitar a exclusão de seus dados ("direito ao esquecimento")</li>
                  <li><strong>Portabilidade:</strong> Receber seus dados em formato estruturado</li>
                  <li><strong>Oposição:</strong> Opor-se ao processamento de seus dados</li>
                  <li><strong>Revogação:</strong> Retirar consentimento a qualquer momento</li>
                </ul>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed mt-4">
                  Para exercer qualquer desses direitos, entre em contato através de <strong>privacy@tamanduai.com</strong>
                </p>
              </div>

              <hr className="border-slate-200 dark:border-slate-700" />

              {/* Cookies */}
              <div>
                <h2 className="text-2xl font-bold mb-4">8. Cookies e Tecnologias Similares</h2>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                  Utilizamos cookies essenciais para autenticação e funcionamento da plataforma. Para mais informações, consulte nossa <Link to="/cookie-policy" className="text-blue-600 dark:text-blue-400 hover:underline font-semibold">Política de Cookies</Link>.
                </p>
              </div>

              <hr className="border-slate-200 dark:border-slate-700" />

              {/* Menores */}
              <div>
                <h2 className="text-2xl font-bold mb-4">9. Proteção de Menores</h2>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                  Usuários menores de 18 anos devem ter autorização de pais ou responsáveis para usar a plataforma. Não coletamos intencionalmente dados de menores de 13 anos sem consentimento parental.
                </p>
              </div>

              <hr className="border-slate-200 dark:border-slate-700" />

              {/* Alterações */}
              <div>
                <h2 className="text-2xl font-bold mb-4">10. Alterações nesta Política</h2>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                  Podemos atualizar esta política periodicamente. Notificaremos sobre mudanças significativas por e-mail ou através de aviso na plataforma. A data da última atualização está sempre indicada no topo deste documento.
                </p>
              </div>

              <hr className="border-slate-200 dark:border-slate-700" />

              {/* Contato */}
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-6">
                <h2 className="text-2xl font-bold mb-4">11. Contato - DPO (Data Protection Officer)</h2>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
                  Para dúvidas, solicitações ou reclamações relacionadas à privacidade:
                </p>
                <ul className="space-y-2 text-slate-600 dark:text-slate-400">
                  <li><strong>E-mail:</strong> privacy@tamanduai.com</li>
                  <li><strong>DPO:</strong> dpo@tamanduai.com</li>
                  <li><strong>Endereço:</strong> [Seu endereço comercial]</li>
                </ul>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed mt-4">
                  Responderemos sua solicitação em até <strong>15 dias úteis</strong>.
                </p>
              </div>

            </div>
          </motion.div>
        </section>

        <Footer />
      </div>
    </>
  );
}
