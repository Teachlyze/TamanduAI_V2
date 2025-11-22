import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import Seo from '@/shared/components/Seo';
import { Button } from '@/shared/components/ui/button';
import { Card } from '@/shared/components/ui/card';
import Footer from '@/shared/components/Footer';
import { useIsMobile, usePrefersReducedMotion } from '@/shared/hooks/useMediaQuery';

export default function PricingPage() {
  const navigate = useNavigate();
  const [billingPeriod, setBillingPeriod] = useState('monthly');
  const isMobile = useIsMobile();
  const prefersReducedMotion = usePrefersReducedMotion();
  const isMotionLight = isMobile || prefersReducedMotion;

  const professorPlan = {
    id: 'professor',
    name: 'Plano Professor',
    description: 'Acesso completo a todas as funcionalidades por apenas R$ 15/mês',
    price: 15,
    priceYearly: 153,
    badge: 'Plano exclusivo para professores',
    features: [
      'Acesso completo a todas as funcionalidades',
      'Chatbot RAG com IA',
      'Correção automática de atividades',
      'Verificação antiplágio Winston AI',
      'Analytics completo com dashboards',
      'Turmas ilimitadas',
      'Alunos ilimitados',
      'Calendário de eventos e aulas',
      'Gestão de materiais e recursos',
      'Exportação de relatórios em CSV e PDF',
      'Suporte por email',
      'Garantia de 7 dias para reembolso'
    ],
    cta: 'Começar Agora',
    highlighted: true,
    color: 'from-cyan-500 via-blue-600 to-blue-800'
  };

  const faqs = [
    {
      q: 'Qual o preço do plano para professores?',
      a: 'Apenas R$ 15 por mês com acesso completo a todas as funcionalidades. Ou R$ 153 por ano com 15% de desconto.'
    },
    {
      q: 'Alunos precisam pagar?',
      a: 'Não! Alunos usam a plataforma gratuitamente. Apenas professores fazem a assinatura de R$ 15/mês.'
    },
    {
      q: 'Posso cancelar a qualquer momento?',
      a: 'Sim! Sem multas ou taxas. Cancele quando quiser e mantenha acesso até o fim do período pago.'
    },
    {
      q: 'E se eu não gostar? Tem reembolso?',
      a: 'Sim! Garantia de 7 dias para reembolso integral. Se não gostar, peça seu dinheiro de volta.'
    },
    {
      q: 'Quantos alunos posso ter?',
      a: 'Alunos ilimitados! Não há restrição de quantidade de alunos ou turmas.'
    },
    {
      q: 'Quais formas de pagamento aceitam?',
      a: 'Cartão de crédito, boleto, Pix e transferência bancária.'
    },
    {
      q: 'Há taxa de setup ou implementação?',
      a: 'Não! Setup gratuito e suporte completo para começar a usar imediatamente.'
    }
  ];


  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-cyan-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <Seo 
        title="Preços - TamanduAI"
        description="Plano exclusivo para professores por apenas R$ 15/mês. Alunos não pagam."
      />

      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-r from-cyan-600 via-blue-600 to-blue-800 rounded-xl flex items-center justify-center">
                  <span className="text-white font-bold">T</span>
                </div>
                <span className="text-xl font-bold bg-gradient-to-r from-cyan-600 via-blue-600 to-blue-800 bg-clip-text text-transparent">
                  TamanduAI
                </span>
              </div>
            </Link>
            <nav className="flex items-center gap-4">
              <Link to="/docs">
                <Button variant="ghost" size="sm">Documentação</Button>
              </Link>
              <Link to="/login">
                <Button variant="ghost" size="sm">Entrar</Button>
              </Link>
              <Link to="/register">
                <Button variant="gradient" size="sm">
                  Começar Grátis
                </Button>
              </Link>
            </nav>
          </div>
        </div>
      </header>

      <main className="py-20">
        {/* Hero Section */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center mb-16">
          <motion.div
            initial={isMotionLight ? false : { opacity: 0, y: 20 }}
            animate={isMotionLight ? undefined : { opacity: 1, y: 0 }}
            transition={isMotionLight ? undefined : { duration: 0.6 }}
          >
            <h1 className="text-5xl lg:text-6xl font-bold text-gray-900 dark:text-white mb-6">
              Plano <span className="bg-gradient-to-r from-cyan-600 via-blue-600 to-blue-800 bg-clip-text text-transparent">Professor</span>
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto mb-8">
              Acesso completo a todas as funcionalidades por apenas R$ 15 por mês. Alunos não pagam!
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
              <div className="inline-flex items-center bg-green-100 dark:bg-green-900/30 rounded-full px-6 py-3">
                <span className="text-green-800 dark:text-green-300 font-medium">
                  ✓ Alunos usam gratuitamente
                </span>
              </div>
              <div className="inline-flex items-center bg-blue-100 dark:bg-blue-900/30 rounded-full px-6 py-3">
                <span className="text-blue-800 dark:text-blue-300 font-medium">
                  ✓ 7 dias garantia de reembolso
                </span>
              </div>
            </div>

            {/* Billing Toggle */}
            <div className="inline-flex items-center bg-white dark:bg-gray-800 rounded-full p-1 shadow-lg border border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setBillingPeriod('monthly')}
                className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${
                  billingPeriod === 'monthly'
                    ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md'
                    : 'text-gray-600 dark:text-gray-400'
                }`}
                aria-pressed={billingPeriod === 'monthly'}
              >
                Mensal
              </button>
              <button
                onClick={() => setBillingPeriod('yearly')}
                className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${
                  billingPeriod === 'yearly'
                    ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md'
                    : 'text-gray-600 dark:text-gray-400'
                }`}
                aria-pressed={billingPeriod === 'yearly'}
              >
                Anual <span className="ml-1 text-xs">(15% OFF)</span>
              </button>
            </div>

          </motion.div>
        </section>

        {/* Pricing Card */}
        <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 mb-20">
          <motion.div
            initial={isMotionLight ? false : { opacity: 0, y: 20 }}
            animate={isMotionLight ? undefined : { opacity: 1, y: 0 }}
            transition={isMotionLight ? undefined : { duration: 0.6 }}
            className="relative"
          >
            <Card className="relative overflow-hidden transition-all duration-300 hover:shadow-2xl border-4 border-cyan-400 shadow-cyan-200/50">
              <div className="absolute top-0 right-0 bg-gradient-to-r from-cyan-400 via-blue-500 to-cyan-400 text-white text-xs font-bold px-3 py-1 rounded-bl-lg shadow-lg">
                {professorPlan.badge}
              </div>
              
              <div className="p-8">
                <div className="flex items-center justify-between mb-6">
                  <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${professorPlan.color} flex items-center justify-center`}>
                    <span className="text-white text-2xl font-bold">T</span>
                  </div>
                  <div className="text-right">
                    <span className="text-5xl font-bold text-gray-900 dark:text-white">
                      R$ {billingPeriod === 'monthly' ? professorPlan.price : Math.floor(professorPlan.priceYearly / 12)}
                    </span>
                    <span className="text-gray-600 dark:text-gray-400 block">/mês</span>
                    {billingPeriod === 'yearly' && (
                      <p className="text-sm text-green-600 font-medium mt-1">
                        Economize R$ 27 no ano (15% de desconto)
                      </p>
                    )}
                  </div>
                </div>
                
                <h3 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">{professorPlan.name}</h3>
                <p className="text-lg text-gray-600 dark:text-gray-400 mb-8">{professorPlan.description}</p>

                <Link to="/register">
                  <Button 
                    variant="gradient" 
                    className="w-full mb-8 h-14 text-lg"
                  >
                    {professorPlan.cta}
                  </Button>
                </Link>

                <ul className="space-y-4">
                  {professorPlan.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-3 text-base">
                      <span className="text-green-600 font-bold mt-0.5">•</span>
                      <span className="text-gray-700 dark:text-gray-300">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </Card>
          </motion.div>
        </section>


        {/* FAQ */}
        <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 mb-20">
          <motion.div
            initial={isMotionLight ? false : { opacity: 0, y: 20 }}
            whileInView={isMotionLight ? undefined : { opacity: 1, y: 0 }}
            transition={isMotionLight ? undefined : { duration: 0.6 }}
            className="text-center mb-12"
          >
            <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Perguntas <span className="bg-gradient-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent">Frequentes</span>
            </h2>
          </motion.div>

          <div className="space-y-4">
            {faqs.map((faq, idx) => (
              <motion.div
                key={idx}
                initial={isMotionLight ? false : { opacity: 0, y: 20 }}
                whileInView={isMotionLight ? undefined : { opacity: 1, y: 0 }}
                transition={isMotionLight ? undefined : { duration: 0.6, delay: idx * 0.05 }}
              >
                <Card className="p-6">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3">
                    {faq.q}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300 pl-7">{faq.a}</p>
                </Card>
              </motion.div>
            ))}
          </div>
        </section>

        {/* CTA Final */}
        <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={isMotionLight ? false : { opacity: 0, scale: 0.95 }}
            whileInView={isMotionLight ? undefined : { opacity: 1, scale: 1 }}
            transition={isMotionLight ? undefined : { duration: 0.6 }}
            className="bg-gradient-to-r from-cyan-500 via-blue-600 to-blue-800 rounded-3xl p-12 text-center text-white"
          >
            <h2 className="text-4xl font-bold mb-4">Pronto para começar?</h2>
            <p className="text-xl mb-8 opacity-90">
              Junte-se a professores que estão testando a TamanduAI para reduzir sua sobrecarga digital com IA
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/register">
                <Button size="lg" className="bg-white text-blue-600 hover:bg-gray-100">
                  Começar Agora
                </Button>
              </Link>
              <Link to="/contact">
                <Button size="lg" variant="outline" className="border-2 border-white text-white hover:bg-white/20">
                  Falar com Especialista
                </Button>
              </Link>
            </div>
          </motion.div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
