import React from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { FileText, CheckCircle, XCircle, AlertTriangle, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';

export default function TermsOfServicePage() {
  return (
    <>
      <Helmet>
        <title>Termos de Uso | TamanduAI</title>
        <meta name="description" content="Termos de Uso da plataforma TamanduAI. Leia os termos e condições para uso da plataforma educacional." />
      </Helmet>

      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-slate-50 dark:from-slate-900 dark:via-purple-950 dark:to-slate-900">
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
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 mb-6">
                <FileText className="w-4 h-4" />
                <span className="text-sm font-semibold">Última atualização: 10 de Novembro de 2025</span>
              </div>
              <h1 className="text-4xl lg:text-5xl font-bold mb-6 bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 bg-clip-text text-transparent">
                Termos de Uso
              </h1>
              <p className="text-xl text-slate-600 dark:text-slate-400">
                Leia com atenção antes de usar a plataforma
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
              
              {/* Aceitação */}
              <div>
                <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                  1. Aceitação dos Termos
                </h2>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                  Ao acessar e usar a plataforma <strong>TamanduAI</strong> ("Plataforma", "Serviço", "nós"), você concorda em cumprir estes Termos de Uso. Se você não concorda com qualquer parte destes termos, não deve usar a Plataforma.
                </p>
              </div>

              <hr className="border-slate-200 dark:border-slate-700" />

              {/* Definições */}
              <div>
                <h2 className="text-2xl font-bold mb-4">2. Definições</h2>
                <ul className="space-y-3 text-slate-600 dark:text-slate-400">
                  <li><strong>"Usuário":</strong> Qualquer pessoa que acessa a Plataforma (aluno, professor, administrador escolar)</li>
                  <li><strong>"Conta":</strong> Registro individual de acesso à Plataforma</li>
                  <li><strong>"Conteúdo":</strong> Textos, imagens, vídeos, atividades e materiais enviados pelos Usuários</li>
                  <li><strong>"Serviços":</strong> Funcionalidades oferecidas pela Plataforma (chatbot, correção automática, analytics, etc.)</li>
                </ul>
              </div>

              <hr className="border-slate-200 dark:border-slate-700" />

              {/* Uso da Plataforma */}
              <div>
                <h2 className="text-2xl font-bold mb-4">3. Uso da Plataforma</h2>
                
                <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  3.1 Uso Permitido
                </h3>
                <ul className="list-disc list-inside space-y-2 text-slate-600 dark:text-slate-400 mb-4">
                  <li>Criar e participar de turmas educacionais</li>
                  <li>Enviar e receber atividades acadêmicas</li>
                  <li>Interagir com o chatbot para fins educacionais</li>
                  <li>Acompanhar desempenho e gerar relatórios</li>
                  <li>Compartilhar materiais didáticos com sua turma</li>
                </ul>

                <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                  <XCircle className="w-5 h-5 text-red-600" />
                  3.2 Uso Proibido
                </h3>
                <ul className="list-disc list-inside space-y-2 text-slate-600 dark:text-slate-400">
                  <li>Violar direitos autorais ou propriedade intelectual de terceiros</li>
                  <li>Enviar conteúdo ofensivo, difamatório, obsceno ou ilegal</li>
                  <li>Tentar acessar contas de outros usuários sem autorização</li>
                  <li>Fazer engenharia reversa, descompilar ou desmontar a Plataforma</li>
                  <li>Usar bots, scripts ou automações não autorizadas</li>
                  <li>Realizar ataques de negação de serviço (DDoS)</li>
                  <li>Coletar dados de outros usuários sem consentimento</li>
                  <li>Revender ou comercializar o acesso à Plataforma</li>
                </ul>
              </div>

              <hr className="border-slate-200 dark:border-slate-700" />

              {/* Conta de Usuário */}
              <div>
                <h2 className="text-2xl font-bold mb-4">4. Conta de Usuário</h2>
                <ul className="space-y-3 text-slate-600 dark:text-slate-400">
                  <li><strong>4.1 Registro:</strong> Você deve fornecer informações verdadeiras, precisas e atualizadas durante o cadastro.</li>
                  <li><strong>4.2 Segurança:</strong> Você é responsável por manter a confidencialidade de suas credenciais de acesso.</li>
                  <li><strong>4.3 Idade Mínima:</strong> Menores de 18 anos devem ter autorização dos pais ou responsáveis.</li>
                  <li><strong>4.4 Suspensão:</strong> Reservamos o direito de suspender ou excluir contas que violem estes Termos.</li>
                </ul>
              </div>

              <hr className="border-slate-200 dark:border-slate-700" />

              {/* Propriedade Intelectual */}
              <div>
                <h2 className="text-2xl font-bold mb-4">5. Propriedade Intelectual</h2>
                
                <h3 className="text-lg font-semibold mb-2">5.1 Propriedade da Plataforma</h3>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
                  Todo o código-fonte, design, marca, logotipo e funcionalidades da TamanduAI são de propriedade exclusiva da empresa e estão protegidos por leis de direitos autorais e propriedade intelectual.
                </p>

                <h3 className="text-lg font-semibold mb-2">5.2 Conteúdo do Usuário</h3>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
                  Você mantém os direitos sobre o conteúdo que envia (atividades, materiais, etc.). Ao enviar conteúdo, você concede à TamanduAI uma licença mundial, não exclusiva e gratuita para usar, armazenar e processar esse conteúdo com o objetivo de fornecer os Serviços.
                </p>

                <h3 className="text-lg font-semibold mb-2">5.3 IA e Correção Automática</h3>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                  Os resultados gerados por IA (correções, sugestões, chatbot) são fornecidos "como estão" e devem ser revisados por um professor humano antes de serem considerados finais.
                </p>
              </div>

              <hr className="border-slate-200 dark:border-slate-700" />

              {/* Planos e Pagamentos */}
              <div>
                <h2 className="text-2xl font-bold mb-4">6. Planos e Pagamentos</h2>
                <ul className="space-y-3 text-slate-600 dark:text-slate-400">
                  <li><strong>6.1 Planos:</strong> Oferecemos planos Gratuito, Pro e Enterprise conforme descritos na página de Preços.</li>
                  <li><strong>6.2 Faturamento:</strong> Planos pagos são cobrados mensalmente ou anualmente, conforme escolhido.</li>
                  <li><strong>6.3 Reembolso:</strong> Oferecemos garantia de 30 dias para planos pagos (primeiro pagamento).</li>
                  <li><strong>6.4 Alteração de Plano:</strong> Você pode fazer upgrade ou downgrade a qualquer momento.</li>
                  <li><strong>6.5 Cancelamento:</strong> Você pode cancelar sua assinatura a qualquer momento. O acesso permanece até o fim do período pago.</li>
                </ul>
              </div>

              <hr className="border-slate-200 dark:border-slate-700" />

              {/* Limitações */}
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-lg bg-amber-100 dark:bg-amber-900/30">
                  <AlertTriangle className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl font-bold mb-4">7. Limitações de Responsabilidade</h2>
                  <p className="text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
                    A Plataforma é fornecida "como está" e "conforme disponível". Não garantimos que:
                  </p>
                  <ul className="list-disc list-inside space-y-2 text-slate-600 dark:text-slate-400">
                    <li>O serviço será ininterrupto, seguro ou livre de erros</li>
                    <li>Os resultados obtidos serão precisos ou confiáveis</li>
                    <li>Defeitos serão corrigidos imediatamente</li>
                  </ul>
                  <p className="text-slate-600 dark:text-slate-400 leading-relaxed mt-4">
                    <strong>Não nos responsabilizamos por:</strong> Perda de dados, lucros cessantes, danos indiretos ou consequenciais resultantes do uso ou impossibilidade de uso da Plataforma.
                  </p>
                </div>
              </div>

              <hr className="border-slate-200 dark:border-slate-700" />

              {/* Detecção de Plágio */}
              <div>
                <h2 className="text-2xl font-bold mb-4">8. Detecção de Plágio e IA</h2>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
                  Utilizamos tecnologia de terceiros (Winston AI) para detectar plágio e conteúdo gerado por IA. Os resultados são indicativos e não devem ser usados como única prova de má conduta acadêmica. Recomendamos análise humana complementar.
                </p>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                  <strong>Não nos responsabilizamos</strong> por falsos positivos ou falsos negativos nas verificações de plágio.
                </p>
              </div>

              <hr className="border-slate-200 dark:border-slate-700" />

              {/* Dados e Privacidade */}
              <div>
                <h2 className="text-2xl font-bold mb-4">9. Privacidade e Proteção de Dados</h2>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                  A coleta, uso e proteção de seus dados pessoais são regidos pela nossa <Link to="/privacy" className="text-blue-600 dark:text-blue-400 hover:underline font-semibold">Política de Privacidade</Link>, que está em conformidade com a LGPD e GDPR.
                </p>
              </div>

              <hr className="border-slate-200 dark:border-slate-700" />

              {/* Rescisão */}
              <div>
                <h2 className="text-2xl font-bold mb-4">10. Rescisão</h2>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
                  Podemos suspender ou encerrar sua conta imediatamente, sem aviso prévio, se você violar estes Termos. Após a rescisão:
                </p>
                <ul className="list-disc list-inside space-y-2 text-slate-600 dark:text-slate-400">
                  <li>Você perde acesso à Plataforma</li>
                  <li>Seus dados podem ser excluídos após 30 dias</li>
                  <li>Você pode solicitar exportação de dados antes da exclusão</li>
                </ul>
              </div>

              <hr className="border-slate-200 dark:border-slate-700" />

              {/* Lei Aplicável */}
              <div>
                <h2 className="text-2xl font-bold mb-4">11. Lei Aplicável e Jurisdição</h2>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                  Estes Termos são regidos pelas leis da República Federativa do Brasil. Quaisquer disputas serão resolvidas no foro da comarca de <strong>[Sua cidade]</strong>, com exclusão de qualquer outro, por mais privilegiado que seja.
                </p>
              </div>

              <hr className="border-slate-200 dark:border-slate-700" />

              {/* Alterações */}
              <div>
                <h2 className="text-2xl font-bold mb-4">12. Alterações nos Termos</h2>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                  Reservamos o direito de modificar estes Termos a qualquer momento. Alterações significativas serão notificadas por e-mail ou aviso na Plataforma com <strong>30 dias de antecedência</strong>. O uso continuado da Plataforma após a notificação constitui aceitação dos novos Termos.
                </p>
              </div>

              <hr className="border-slate-200 dark:border-slate-700" />

              {/* Disposições Gerais */}
              <div>
                <h2 className="text-2xl font-bold mb-4">13. Disposições Gerais</h2>
                <ul className="space-y-3 text-slate-600 dark:text-slate-400">
                  <li><strong>13.1 Totalidade do Acordo:</strong> Estes Termos constituem o acordo completo entre você e a TamanduAI.</li>
                  <li><strong>13.2 Separabilidade:</strong> Se alguma cláusula for considerada inválida, as demais permanecem em vigor.</li>
                  <li><strong>13.3 Cessão:</strong> Você não pode transferir seus direitos sem nossa autorização prévia.</li>
                  <li><strong>13.4 Idioma:</strong> Em caso de conflito entre versões traduzidas, a versão em português prevalece.</li>
                </ul>
              </div>

              <hr className="border-slate-200 dark:border-slate-700" />

              {/* Contato */}
              <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-6">
                <h2 className="text-2xl font-bold mb-4">14. Contato</h2>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
                  Para dúvidas sobre estes Termos de Uso:
                </p>
                <ul className="space-y-2 text-slate-600 dark:text-slate-400">
                  <li><strong>E-mail:</strong> legal@tamanduai.com</li>
                  <li><strong>Suporte:</strong> support@tamanduai.com</li>
                  <li><strong>Endereço:</strong> [Seu endereço comercial]</li>
                </ul>
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
                <Link to="/cookie-policy" className="text-sm text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400">
                  Política de Cookies
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
