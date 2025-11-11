import React from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Cookie, CheckCircle, Info, Settings, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';

export default function CookiePolicyPage() {
  return (
    <>
      <Helmet>
        <title>Política de Cookies | TamanduAI</title>
        <meta name="description" content="Política de Cookies da plataforma TamanduAI. Saiba como usamos cookies e tecnologias similares." />
      </Helmet>

      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-amber-50 to-slate-50 dark:from-slate-900 dark:via-amber-950 dark:to-slate-900">
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
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 mb-6">
                <Cookie className="w-4 h-4" />
                <span className="text-sm font-semibold">Última atualização: 10 de Novembro de 2025</span>
              </div>
              <h1 className="text-4xl lg:text-5xl font-bold mb-6 bg-gradient-to-r from-amber-600 via-orange-600 to-red-600 bg-clip-text text-transparent">
                Política de Cookies
              </h1>
              <p className="text-xl text-slate-600 dark:text-slate-400">
                Como usamos cookies para melhorar sua experiência
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
              
              {/* O que são Cookies */}
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-lg bg-amber-100 dark:bg-amber-900/30">
                  <Info className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl font-bold mb-4">1. O que são Cookies?</h2>
                  <p className="text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
                    Cookies são pequenos arquivos de texto armazenados no seu dispositivo (computador, smartphone ou tablet) quando você visita um site. Eles permitem que o site reconheça seu dispositivo e lembre suas preferências e ações.
                  </p>
                  <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                    A <strong>TamanduAI</strong> usa cookies e tecnologias similares para melhorar sua experiência, autenticar usuários e fornecer funcionalidades essenciais da plataforma.
                  </p>
                </div>
              </div>

              <hr className="border-slate-200 dark:border-slate-700" />

              {/* Tipos de Cookies */}
              <div>
                <h2 className="text-2xl font-bold mb-6">2. Tipos de Cookies que Usamos</h2>
                
                {/* Essenciais */}
                <div className="mb-6 p-4 rounded-lg border-2 border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400 flex-shrink-0 mt-1" />
                    <div>
                      <h3 className="text-lg font-semibold mb-2 text-green-900 dark:text-green-100">2.1 Cookies Estritamente Necessários</h3>
                      <p className="text-slate-600 dark:text-slate-400 leading-relaxed mb-3">
                        <strong>Não podem ser desativados.</strong> São essenciais para o funcionamento básico da plataforma.
                      </p>
                      <ul className="space-y-2 text-slate-600 dark:text-slate-400">
                        <li className="flex items-start gap-2">
                          <span className="text-green-600 dark:text-green-400">•</span>
                          <span><strong>Autenticação:</strong> Mantêm você conectado durante a sessão</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-green-600 dark:text-green-400">•</span>
                          <span><strong>Segurança:</strong> Protegem contra ataques CSRF e XSS</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-green-600 dark:text-green-400">•</span>
                          <span><strong>Preferências:</strong> Tema escuro/claro, idioma</span>
                        </li>
                      </ul>
                      <p className="text-sm text-slate-500 dark:text-slate-500 mt-3">
                        <strong>Duração:</strong> Sessão ou até 30 dias
                      </p>
                    </div>
                  </div>
                </div>

                {/* Funcionalidade */}
                <div className="mb-6 p-4 rounded-lg border-2 border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20">
                  <div className="flex items-start gap-3">
                    <Settings className="w-6 h-6 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-1" />
                    <div>
                      <h3 className="text-lg font-semibold mb-2 text-blue-900 dark:text-blue-100">2.2 Cookies de Funcionalidade</h3>
                      <p className="text-slate-600 dark:text-slate-400 leading-relaxed mb-3">
                        Melhoram a funcionalidade e permitem personalizações.
                      </p>
                      <ul className="space-y-2 text-slate-600 dark:text-slate-400">
                        <li className="flex items-start gap-2">
                          <span className="text-blue-600 dark:text-blue-400">•</span>
                          <span><strong>Preferências de Layout:</strong> Sidebar expandida/colapsada</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-blue-600 dark:text-blue-400">•</span>
                          <span><strong>Filtros Salvos:</strong> Filtros de turmas e atividades</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-blue-600 dark:text-blue-400">•</span>
                          <span><strong>Últimas Ações:</strong> Última turma acessada</span>
                        </li>
                      </ul>
                      <p className="text-sm text-slate-500 dark:text-slate-500 mt-3">
                        <strong>Duração:</strong> Até 1 ano
                      </p>
                    </div>
                  </div>
                </div>

                {/* Analytics */}
                <div className="mb-6 p-4 rounded-lg border-2 border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-900/20">
                  <div className="flex items-start gap-3">
                    <Info className="w-6 h-6 text-purple-600 dark:text-purple-400 flex-shrink-0 mt-1" />
                    <div>
                      <h3 className="text-lg font-semibold mb-2 text-purple-900 dark:text-purple-100">2.3 Cookies de Analytics e Performance</h3>
                      <p className="text-slate-600 dark:text-slate-400 leading-relaxed mb-3">
                        Coletam informações anônimas sobre como você usa a plataforma.
                      </p>
                      <ul className="space-y-2 text-slate-600 dark:text-slate-400">
                        <li className="flex items-start gap-2">
                          <span className="text-purple-600 dark:text-purple-400">•</span>
                          <span><strong>Vercel Analytics:</strong> Pageviews, tempo de sessão, páginas mais visitadas</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-purple-600 dark:text-purple-400">•</span>
                          <span><strong>Speed Insights:</strong> Métricas de performance (LCP, FID, CLS)</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-purple-600 dark:text-purple-400">•</span>
                          <span><strong>Error Tracking:</strong> Erros e bugs para correção</span>
                        </li>
                      </ul>
                      <p className="text-sm text-slate-500 dark:text-slate-500 mt-3">
                        <strong>Duração:</strong> Até 2 anos | <strong>Dados:</strong> Anonimizados
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <hr className="border-slate-200 dark:border-slate-700" />

              {/* LocalStorage e SessionStorage */}
              <div>
                <h2 className="text-2xl font-bold mb-4">3. LocalStorage e SessionStorage</h2>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
                  Além de cookies, usamos <strong>LocalStorage</strong> e <strong>SessionStorage</strong> (tecnologias HTML5) para armazenar dados localmente no seu navegador:
                </p>
                <ul className="list-disc list-inside space-y-2 text-slate-600 dark:text-slate-400">
                  <li><strong>LocalStorage:</strong> Token de autenticação, preferências de UI (persistente)</li>
                  <li><strong>SessionStorage:</strong> Dados temporários da sessão (apagado ao fechar aba)</li>
                </ul>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed mt-4">
                  Esses dados <strong>não são enviados</strong> para nossos servidores automaticamente, apenas para autenticação via API.
                </p>
              </div>

              <hr className="border-slate-200 dark:border-slate-700" />

              {/* Cookies de Terceiros */}
              <div>
                <h2 className="text-2xl font-bold mb-4">4. Cookies de Terceiros</h2>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
                  Alguns cookies são definidos por serviços de terceiros confiáveis:
                </p>
                <ul className="space-y-3 text-slate-600 dark:text-slate-400">
                  <li><strong>Supabase (supabase.co):</strong> Autenticação e banco de dados</li>
                  <li><strong>Vercel (vercel.com):</strong> Hospedagem, analytics e speed insights</li>
                  <li><strong>Winston AI:</strong> Detecção de plágio (apenas quando ativado)</li>
                </ul>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed mt-4">
                  Esses terceiros seguem suas próprias políticas de privacidade e não compartilhamos dados pessoais sem necessidade.
                </p>
              </div>

              <hr className="border-slate-200 dark:border-slate-700" />

              {/* Como Gerenciar */}
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                  <Settings className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl font-bold mb-4">5. Como Gerenciar Cookies</h2>
                  
                  <h3 className="text-lg font-semibold mb-2">5.1 Configurações do Navegador</h3>
                  <p className="text-slate-600 dark:text-slate-400 leading-relaxed mb-3">
                    Você pode bloquear ou excluir cookies através das configurações do seu navegador:
                  </p>
                  <ul className="list-disc list-inside space-y-2 text-slate-600 dark:text-slate-400 mb-4">
                    <li><strong>Chrome:</strong> Configurações → Privacidade e segurança → Cookies</li>
                    <li><strong>Firefox:</strong> Preferências → Privacidade e segurança → Cookies</li>
                    <li><strong>Safari:</strong> Preferências → Privacidade → Gerenciar dados do site</li>
                    <li><strong>Edge:</strong> Configurações → Cookies e permissões de site</li>
                  </ul>

                  <h3 className="text-lg font-semibold mb-2">5.2 Banner de Cookies</h3>
                  <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                    Na primeira visita, apresentamos um banner onde você pode aceitar ou recusar cookies não essenciais. Você pode rever suas escolhas a qualquer momento através do rodapé da plataforma.
                  </p>
                </div>
              </div>

              <hr className="border-slate-200 dark:border-slate-700" />

              {/* Impacto de Desativar */}
              <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-6 border-l-4 border-amber-500">
                <h2 className="text-2xl font-bold mb-4">6. Impacto de Desativar Cookies</h2>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
                  <strong>Atenção:</strong> Desativar cookies pode afetar a funcionalidade da plataforma:
                </p>
                <ul className="list-disc list-inside space-y-2 text-slate-600 dark:text-slate-400">
                  <li>❌ Você <strong>não poderá fazer login</strong> (cookies essenciais bloqueados)</li>
                  <li>⚠️ Suas preferências de tema e layout serão perdidas</li>
                  <li>⚠️ Alguns recursos podem não funcionar corretamente</li>
                  <li>ℹ️ Analytics não será coletado (sem impacto funcional para você)</li>
                </ul>
              </div>

              <hr className="border-slate-200 dark:border-slate-700" />

              {/* Atualizações */}
              <div>
                <h2 className="text-2xl font-bold mb-4">7. Atualizações desta Política</h2>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                  Podemos atualizar esta Política de Cookies periodicamente para refletir mudanças em nossas práticas ou requisitos legais. A data da última atualização está sempre indicada no topo desta página.
                </p>
              </div>

              <hr className="border-slate-200 dark:border-slate-700" />

              {/* Contato */}
              <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-6">
                <h2 className="text-2xl font-bold mb-4">8. Dúvidas sobre Cookies</h2>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
                  Se você tiver dúvidas sobre como usamos cookies:
                </p>
                <ul className="space-y-2 text-slate-600 dark:text-slate-400">
                  <li><strong>E-mail:</strong> privacy@tamanduai.com</li>
                  <li><strong>Suporte:</strong> support@tamanduai.com</li>
                </ul>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed mt-4">
                  Consulte também nossa <Link to="/privacy" className="text-blue-600 dark:text-blue-400 hover:underline font-semibold">Política de Privacidade</Link> para mais informações sobre proteção de dados.
                </p>
              </div>

            </div>
          </motion.div>
        </section>

        {/* Footer */}
        <footer className="border-t bg-white/80 dark:bg-slate-900/80 backdrop-blur-md py-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                © 2025 TamanduAI. Todos os direitos reservados.
              </p>
              <div className="flex gap-6">
                <Link to="/privacy" className="text-sm text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400">
                  Política de Privacidade
                </Link>
                <Link to="/terms" className="text-sm text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400">
                  Termos de Uso
                </Link>
                <Link to="/contact" className="text-sm text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400">
                  Contato
                </Link>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
