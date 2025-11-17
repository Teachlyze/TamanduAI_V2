import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import Seo from '@/shared/components/Seo';
import { Button } from '@/shared/components/ui/button';
import { Card } from '@/shared/components/ui/card';
import Footer from '@/shared/components/Footer';
import {
  Check, X, Zap, Rocket, Building2, Sparkles, HelpCircle,
  Users, Shield, Calendar, Award, TrendingUp, ArrowRight, BookOpen
} from 'lucide-react';

export default function PricingPage() {
  const navigate = useNavigate();
  const [billingPeriod, setBillingPeriod] = useState('monthly');

  const plans = [
    {
      id: 'beta',
      name: 'Beta',
      description: 'Programa Beta Exclusivo',
      icon: Sparkles,
      price: { monthly: 0, yearly: 0 },
      badge: '✨ 3 meses grátis',
      features: [
        'Acesso completo a TODAS funcionalidades',
        'Chatbot RAG ilimitado',
        'Anti-plágio Winston AI',
        'Analytics com 4 modelos ML',
        'Gamificação completa',
        'Videoconferências ilimitadas',
        'Suporte prioritário beta',
        'Sem compromisso - cancele quando quiser'
      ],
      cta: 'Participar do Beta',
      highlighted: true,
      color: 'from-cyan-500 to-blue-600'
    },
    {
      id: 'pro',
      name: 'Pro',
      description: 'Para professores independentes',
      icon: Users,
      price: { monthly: 49, yearly: 490 },
      features: [
        'Até 5 turmas simultâneas',
        'Até 200 alunos',
        'Chatbot RAG (200 msgs/dia)',
        'Anti-plágio (100 verificações/hora)',
        'Analytics básico',
        'Gamificação completa',
        'Videoconferências (100h/mês)',
        'Suporte por email'
      ],
      excluded: ['Analytics ML avançado', 'API access', 'White label'],
      cta: 'Começar Agora',
      highlighted: false,
      color: 'from-blue-500 to-blue-700'
    },
    {
      id: 'school-small',
      name: 'Escola Pequena',
      description: 'Até 200 alunos',
      icon: Building2,
      price: { monthly: 199, yearly: 1990 },
      features: [
        'Turmas ilimitadas',
        'Até 200 alunos',
        'Até 10 professores',
        'Tudo do plano Pro',
        'Analytics ML completo',
        'Dashboard administrativo',
        'Relatórios executivos',
        'Suporte prioritário',
        '2 meses grátis no anual'
      ],
      cta: 'Contratar Agora',
      highlighted: false,
      color: 'from-purple-500 to-indigo-600'
    },
    {
      id: 'school-medium',
      name: 'Escola Média',
      description: 'Até 1000 alunos',
      icon: Building2,
      price: { monthly: 499, yearly: 4990 },
      features: [
        'Turmas ilimitadas',
        'Até 1000 alunos',
        'Professores ilimitados',
        'Tudo do plano Pequena',
        'API access',
        'Integrações personalizadas',
        'Treinamento para equipe',
        'Gerente de conta dedicado',
        '2 meses grátis no anual'
      ],
      cta: 'Contratar Agora',
      highlighted: false,
      color: 'from-orange-500 to-red-600'
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      description: 'Soluções customizadas',
      icon: Rocket,
      price: { monthly: null, yearly: null },
      priceLabel: 'Sob consulta',
      features: [
        'Alunos ilimitados',
        'Professores ilimitados',
        'Tudo dos planos anteriores',
        'White label (sua marca)',
        'Servidor dedicado',
        'SLA 99.9% uptime',
        'Suporte 24/7',
        'Desenvolvimento personalizado',
        'Onboarding completo'
      ],
      cta: 'Falar com Vendas',
      highlighted: false,
      color: 'from-green-500 to-emerald-600'
    }
  ];

  const faqs = [
    {
      q: 'Posso cancelar a qualquer momento?',
      a: 'Sim! Sem multas ou taxas. Cancele quando quiser e mantenha acesso até o fim do período pago.'
    },
    {
      q: 'O que acontece após o período Beta?',
      a: 'Você será automaticamente migrado para o plano Pro com 50% de desconto nos primeiros 3 meses.'
    },
    {
      q: 'Posso mudar de plano depois?',
      a: 'Sim! Upgrade ou downgrade a qualquer momento. Diferenças são calculadas proporcionalmente.'
    },
    {
      q: 'Quais formas de pagamento aceitam?',
      a: 'Cartão de crédito, boleto, Pix e transferência bancária. Planos anuais aceitam parcelamento.'
    },
    {
      q: 'Têm desconto para escolas públicas?',
      a: 'Sim! 40% de desconto para escolas públicas e ONGs educacionais. Entre em contato.'
    },
    {
      q: 'Há taxa de setup ou implementação?',
      a: 'Não! Todos os planos incluem setup gratuito e suporte na migração de dados.'
    }
  ];

  const comparison = [
    { feature: 'Turmas', beta: 'Ilimitadas', pro: '5', small: 'Ilimitadas', medium: 'Ilimitadas', enterprise: 'Ilimitadas' },
    { feature: 'Alunos', beta: 'Ilimitados', pro: '200', small: '200', medium: '1000', enterprise: 'Ilimitados' },
    { feature: 'Chatbot RAG', beta: true, pro: '200/dia', small: true, medium: true, enterprise: true },
    { feature: 'Anti-plágio', beta: true, pro: '100/hora', small: true, medium: true, enterprise: true },
    { feature: 'Analytics ML', beta: true, pro: false, small: true, medium: true, enterprise: true },
    { feature: 'API Access', beta: false, pro: false, small: false, medium: true, enterprise: true },
    { feature: 'White Label', beta: false, pro: false, small: false, medium: false, enterprise: true },
    { feature: 'Suporte', beta: 'Email', pro: 'Email', small: 'Prioritário', medium: 'Dedicado', enterprise: '24/7' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-cyan-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <Seo 
        title="Preços - TamanduAI"
        description="Planos flexíveis para professores e escolas. Comece grátis no programa Beta!"
      />

      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-cyan-600 via-blue-600 to-blue-800 rounded-xl flex items-center justify-center">
                <BookOpen className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-cyan-600 via-blue-600 to-blue-800 bg-clip-text text-transparent">
                TamanduAI
              </span>
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
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-5xl lg:text-6xl font-bold text-gray-900 dark:text-white mb-6">
              Planos que <span className="bg-gradient-to-r from-cyan-600 via-blue-600 to-blue-800 bg-clip-text text-transparent">crescem com você</span>
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto mb-8">
              Do professor independente à grande instituição. Escolha o plano ideal e comece grátis!
            </p>

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
                Anual <span className="ml-1 text-xs">(2 meses grátis)</span>
              </button>
            </div>
          </motion.div>
        </section>

        {/* Pricing Cards */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-20">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
            {plans.map((plan, idx) => (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: idx * 0.1 }}
                className={`relative ${plan.highlighted ? 'xl:col-span-1' : ''}`}
              >
                <Card className={`h-full relative overflow-hidden transition-all duration-300 hover:shadow-xl ${
                  plan.highlighted 
                    ? 'border-4 border-amber-400 shadow-2xl shadow-amber-200/50' 
                    : 'border border-blue-100/60 dark:border-blue-900/40 hover:border-blue-200'
                }`}>
                  {plan.badge && (
                    <div className="absolute top-0 right-0 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-400 text-gray-900 text-xs font-bold px-3 py-1 rounded-bl-lg shadow-lg">
                      {plan.badge}
                    </div>
                  )}
                  
                  <div className="p-6">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${plan.color} flex items-center justify-center mb-4`}>
                      <plan.icon className="w-6 h-6 text-white" />
                    </div>
                    
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{plan.name}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">{plan.description}</p>
                    
                    <div className="mb-6">
                      {plan.priceLabel ? (
                        <p className="text-3xl font-bold text-gray-900 dark:text-white">{plan.priceLabel}</p>
                      ) : (
                        <>
                          <span className="text-4xl font-bold text-gray-900 dark:text-white">
                            R$ {billingPeriod === 'monthly' ? plan.price.monthly : Math.floor(plan.price.yearly / 12)}
                          </span>
                          <span className="text-gray-600 dark:text-gray-400">/mês</span>
                          {billingPeriod === 'yearly' && plan.price.yearly > 0 && (
                            <p className="text-sm text-gray-500 mt-1">
                              Cobrado anualmente: R$ {plan.price.yearly}
                            </p>
                          )}
                        </>
                      )}
                    </div>

                    <Link to={plan.id === 'enterprise' ? '/contact' : '/register'}>
                      <Button 
                        variant={plan.highlighted ? 'gradient' : 'gradientOutline'} 
                        className="w-full mb-6"
                        rightIcon={<ArrowRight className="w-4 h-4" />}
                      >
                        {plan.cta}
                      </Button>
                    </Link>

                    <ul className="space-y-3">
                      {plan.features.map((feature, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                          <span className="text-gray-700 dark:text-gray-300">{feature}</span>
                        </li>
                      ))}
                      {plan.excluded?.map((feature, i) => (
                        <li key={`excluded-${i}`} className="flex items-start gap-2 text-sm">
                          <X className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                          <span className="text-gray-400 line-through">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Comparison Table */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Compare os <span className="bg-gradient-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent">planos</span>
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300">Veja todos os recursos lado a lado</p>
          </motion.div>

          <div className="overflow-x-auto">
            <table className="w-full bg-white dark:bg-gray-800 rounded-xl shadow-xl">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="px-6 py-4 text-left text-sm font-bold text-gray-900 dark:text-white">Recurso</th>
                  <th className="px-6 py-4 text-center text-sm font-bold text-gray-900 dark:text-white">Beta</th>
                  <th className="px-6 py-4 text-center text-sm font-bold text-gray-900 dark:text-white">Pro</th>
                  <th className="px-6 py-4 text-center text-sm font-bold text-gray-900 dark:text-white">Pequena</th>
                  <th className="px-6 py-4 text-center text-sm font-bold text-gray-900 dark:text-white">Média</th>
                  <th className="px-6 py-4 text-center text-sm font-bold text-gray-900 dark:text-white">Enterprise</th>
                </tr>
              </thead>
              <tbody>
                {comparison.map((row, idx) => (
                  <tr key={idx} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">{row.feature}</td>
                    {['beta', 'pro', 'small', 'medium', 'enterprise'].map(plan => (
                      <td key={plan} className="px-6 py-4 text-center text-sm">
                        {typeof row[plan] === 'boolean' ? (
                          row[plan] ? (
                            <Check className="w-5 h-5 text-green-600 mx-auto" />
                          ) : (
                            <X className="w-5 h-5 text-gray-300 mx-auto" />
                          )
                        ) : (
                          <span className="text-gray-700 dark:text-gray-300">{row[plan]}</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* FAQ */}
        <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 mb-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
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
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: idx * 0.05 }}
              >
                <Card className="p-6">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3 flex items-start gap-2">
                    <HelpCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
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
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6 }}
            className="bg-gradient-to-r from-cyan-500 via-blue-600 to-blue-800 rounded-3xl p-12 text-center text-white"
          >
            <h2 className="text-4xl font-bold mb-4">Pronto para começar?</h2>
            <p className="text-xl mb-8 opacity-90">
              Participe do programa Beta e tenha 3 meses grátis!
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/register">
                <Button size="lg" className="bg-white text-blue-600 hover:bg-gray-100">
                  Começar Agora
                </Button>
              </Link>
              <Link to="/contact">
                <Button size="lg" variant="outline" className="border-2 border-white text-white hover:bg-white/20">
                  Falar com Vendas
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
