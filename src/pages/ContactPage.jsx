import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import Seo from '@/shared/components/Seo';
import { Button } from '@/shared/components/ui/button';
import { Card } from '@/shared/components/ui/card';
import {
  Mail, Phone, MapPin, Clock, Send, CheckCircle, Loader2,
  MessageSquare, Users, Building2, Sparkles, Linkedin, Twitter, Instagram
} from 'lucide-react';
import { useToast } from '@/shared/components/ui/use-toast';
import { supabase } from '@/shared/services/supabaseClient';

const ContactPage = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    userType: '',
    subject: '',
    company: '',
    message: ''
  });
  const [charCount, setCharCount] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  
  // Honeypot field (anti-spam)
  const [honeypot, setHoneypot] = useState('');

  const userTypes = [
    { value: 'student', label: 'Aluno' },
    { value: 'teacher', label: 'Professor' },
    { value: 'school', label: 'Instituição de Ensino' },
    { value: 'partner', label: 'Parceiro/Fornecedor' },
    { value: 'other', label: 'Outro' }
  ];

  const subjects = [
    { value: 'support', label: 'Suporte Técnico' },
    { value: 'pricing', label: 'Dúvidas sobre Planos' },
    { value: 'partnership', label: 'Parceria' },
    { value: 'suggestion', label: 'Sugestão' },
    { value: 'feedback', label: 'Feedback' },
    { value: 'other', label: 'Outro' }
  ];

  const contactInfo = [
    {
      icon: Mail,
      title: 'Email',
      content: 'contato@tamanduai.com',
      link: 'mailto:contato@tamanduai.com',
      color: 'from-blue-500 to-cyan-500'
    },
    {
      icon: Phone,
      title: 'Telefone',
      content: '+55 (86) 99954-9348',
      link: 'tel:+5586999549348',
      color: 'from-green-500 to-emerald-500'
    },
    {
      icon: MapPin,
      title: 'Endereço',
      content: 'Teresina, PI - Brasil',
      link: null,
      color: 'from-purple-500 to-pink-500'
    },
    {
      icon: Clock,
      title: 'Horário de Atendimento',
      content: 'Seg-Sex: 9h às 18h',
      link: null,
      color: 'from-orange-500 to-red-500'
    }
  ];

  const socialLinks = [
    {
      icon: Linkedin,
      url: 'https://linkedin.com/company/tamanduai',
      label: 'LinkedIn'
    },
    {
      icon: Twitter,
      url: 'https://twitter.com/tamanduai',
      label: 'Twitter'
    },
    {
      icon: Instagram,
      url: 'https://instagram.com/tamanduai',
      label: 'Instagram'
    }
  ];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    if (name === 'message') {
      setCharCount(value.length);
    }
  };

  const validateForm = () => {
    console.log('🔍 Validando formulário com dados:', formData);
    
    // Regex mais robusto para email
    const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    // Regex para telefone brasileiro (com ou sem DDD)
    const phoneRegex = /^\(?\d{2}\)?\s?9?\d{4}-?\d{4}$/;
    // Regex para nome (apenas letras e espaços)
    const nameRegex = /^[a-zA-ZÀ-ÿ\s]{3,}$/;
    
    console.log('Validando nome:', formData.fullName, '- Válido:', nameRegex.test(formData.fullName));
    
    if (!formData.fullName.trim() || !nameRegex.test(formData.fullName)) {
      toast({
        title: 'Nome inválido',
        description: 'Por favor, insira um nome válido (apenas letras, mínimo 3 caracteres).',
        variant: 'destructive'
      });
      return false;
    }
    
    console.log('Validando email:', formData.email, '- Válido:', emailRegex.test(formData.email));
    
    if (!emailRegex.test(formData.email)) {
      toast({
        title: 'Email inválido',
        description: 'Por favor, insira um email válido.',
        variant: 'destructive'
      });
      return false;
    }
    
    console.log('Validando userType:', formData.userType, '- Preenchido:', !!formData.userType);
    
    if (!formData.userType) {
      toast({
        title: 'Tipo de usuário obrigatório',
        description: 'Por favor, selecione o tipo de usuário.',
        variant: 'destructive'
      });
      return false;
    }
    
    console.log('Validando subject:', formData.subject, '- Preenchido:', !!formData.subject);
    
    if (!formData.subject) {
      toast({
        title: 'Assunto obrigatório',
        description: 'Por favor, selecione um assunto.',
        variant: 'destructive'
      });
      return false;
    }
    
    console.log('Validando mensagem:', formData.message, '- Tamanho:', formData.message.length, '- Válido:', formData.message.length >= 20);
    
    if (!formData.message.trim() || formData.message.length < 20) {
      toast({
        title: 'Mensagem muito curta',
        description: 'Por favor, escreva uma mensagem com pelo menos 20 caracteres.',
        variant: 'destructive'
      });
      return false;
    }
    
    // Validar telefone se preenchido
    if (formData.phone) {
      console.log('Validando telefone:', formData.phone, '- Válido:', phoneRegex.test(formData.phone.replace(/\D/g, '')));
      
      if (!phoneRegex.test(formData.phone.replace(/\D/g, ''))) {
        toast({
          title: 'Telefone inválido',
          description: 'Por favor, insira um telefone válido no formato (11) 99999-9999.',
          variant: 'destructive'
        });
        return false;
      }
    }
    
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    console.log('📝 Formulário submetido:', formData);
    
    // Verificar honeypot (anti-spam)
    if (honeypot) {
      console.log('⚠️ Spam detected');
      return;
    }
    
    console.log('✅ Honeypot OK, validando formulário...');
    
    if (!validateForm()) {
      console.log('❌ Validação falhou');
      return;
    }
    
    console.log('✅ Validação OK, enviando...');
    
    setLoading(true);
    
    try {
      // Enviar via Edge Function (salva no banco E envia email)
      const { data, error } = await supabase.functions.invoke('send-contact-email', {
        body: {
          fullName: formData.fullName,
          email: formData.email,
          phone: formData.phone || null,
          userType: formData.userType,
          subject: formData.subject,
          company: formData.company || null,
          message: formData.message
        }
      });
      
      if (error) {
        console.error('Erro na Edge Function:', error);
        throw new Error(error.message || 'Erro ao enviar mensagem');
      }
      
      if (!data.success) {
        console.error('Erro retornado pela função:', data);
        throw new Error(data.error || 'Erro ao processar mensagem');
      }
      
      console.log('✅ Mensagem enviada com sucesso:', data);
      
      setSubmitted(true);
      toast({
        title: '✅ Mensagem enviada com sucesso!',
        description: 'Recebemos sua mensagem e responderemos em até 24 horas úteis.',
        duration: 5000
      });
      
      // Reset form
      setFormData({
        fullName: '',
        email: '',
        phone: '',
        userType: '',
        subject: '',
        company: '',
        message: ''
      });
      setCharCount(0);
      
      // Reset submitted após 5 segundos
      setTimeout(() => setSubmitted(false), 5000);
      
    } catch (error) {
      console.error('Erro ao enviar:', error);
      toast({
        title: 'Erro ao enviar',
        description: error.message || 'Ocorreu um erro. Tente novamente ou entre em contato por email: contato@tamanduai.com',
        variant: 'destructive',
        duration: 7000
      });
    } finally {
      setLoading(false);
    }
  };

  const formatPhoneNumber = (value) => {
    // Remove tudo que não é número
    const numbers = value.replace(/\D/g, '');
    
    // Aplica máscara (11) 99999-9999
    if (numbers.length <= 11) {
      return numbers
        .replace(/^(\d{2})(\d)/g, '($1) $2')
        .replace(/(\d{5})(\d)/, '$1-$2');
    }
    return value;
  };

  const handlePhoneChange = (e) => {
    const formatted = formatPhoneNumber(e.target.value);
    setFormData(prev => ({ ...prev, phone: formatted }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-cyan-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <Seo 
        title="Contato - TamanduAI"
        description="Entre em contato conosco. Estamos prontos para ajudar você!"
      />

      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-cyan-600 via-blue-600 to-blue-800 rounded-xl flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-cyan-600 via-blue-600 to-blue-800 bg-clip-text text-transparent">
                TamanduAI
              </span>
            </Link>
            <nav className="flex items-center gap-4">
              <Link to="/pricing">
                <Button variant="ghost" size="sm">Preços</Button>
              </Link>
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
              Vamos <span className="bg-gradient-to-r from-cyan-600 via-blue-600 to-blue-800 bg-clip-text text-transparent">conversar</span>?
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
              Nossa equipe está pronta para ajudar você a transformar sua experiência educacional.
            </p>
          </motion.div>
        </section>

        {/* Main Content - Split Layout */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Left Side - Contact Form */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
            >
              <Card className="p-8 shadow-2xl border-2 border-blue-100 dark:border-blue-900 bg-gradient-to-br from-white via-blue-50/30 to-cyan-50/30 dark:from-gray-900 dark:via-blue-900/10 dark:to-cyan-900/10">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg">
                    <Send className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                      Envie sua mensagem
                    </h2>
                    <p className="text-gray-600 dark:text-gray-400 text-sm">
                      Responderemos em até 24h
                    </p>
                  </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Honeypot field (hidden) */}
                  <input
                    type="text"
                    name="website"
                    value={honeypot}
                    onChange={(e) => setHoneypot(e.target.value)}
                    style={{ display: 'none' }}
                    tabIndex="-1"
                    autoComplete="off"
                  />

                  {/* Nome Completo */}
                  <div>
                    <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Nome Completo *
                    </label>
                    <input
                      type="text"
                      id="fullName"
                      name="fullName"
                      value={formData.fullName}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white transition-all duration-200 hover:border-blue-300"
                      placeholder="Seu nome completo"
                    />
                  </div>

                  {/* Email */}
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Email *
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      placeholder="seu@email.com"
                    />
                  </div>

                  {/* Telefone (opcional) */}
                  <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Telefone
                    </label>
                    <input
                      type="tel"
                      id="phone"
                      name="phone"
                      value={formData.phone}
                      onChange={handlePhoneChange}
                      maxLength="15"
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      placeholder="(11) 99999-9999"
                    />
                  </div>

                  {/* Tipo de Usuário */}
                  <div>
                    <label htmlFor="userType" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Você é *
                    </label>
                    <select
                      id="userType"
                      name="userType"
                      value={formData.userType}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    >
                      <option value="">Selecione...</option>
                      {userTypes.map(type => (
                        <option key={type.value} value={type.value}>{type.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Assunto */}
                  <div>
                    <label htmlFor="subject" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Assunto *
                    </label>
                    <select
                      id="subject"
                      name="subject"
                      value={formData.subject}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    >
                      <option value="">Selecione...</option>
                      {subjects.map(subj => (
                        <option key={subj.value} value={subj.value}>{subj.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Empresa/Instituição (opcional) */}
                  <div>
                    <label htmlFor="company" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Empresa / Instituição
                    </label>
                    <input
                      type="text"
                      id="company"
                      name="company"
                      value={formData.company}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      placeholder="Nome da sua instituição"
                    />
                  </div>

                  {/* Mensagem */}
                  <div>
                    <label htmlFor="message" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Mensagem *
                    </label>
                    <textarea
                      id="message"
                      name="message"
                      value={formData.message}
                      onChange={handleChange}
                      required
                      rows="6"
                      maxLength="1000"
                      className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white resize-none transition-all duration-200 hover:border-blue-300"
                      placeholder="Como podemos ajudar você? (mínimo 20 caracteres)"
                    />
                    <div className="flex items-center justify-between mt-2">
                      <p className={`text-sm font-medium ${
                        charCount < 20 
                          ? 'text-red-500 dark:text-red-400' 
                          : 'text-green-600 dark:text-green-400'
                      }`}>
                        {charCount < 20 
                          ? `Faltam ${20 - charCount} caracteres (mínimo 20)` 
                          : '✓ Mensagem válida'
                        }
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {charCount} / 1000
                      </p>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <Button
                    type="submit"
                    variant="gradient"
                    className="w-full h-14 text-lg font-bold shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-[1.02]"
                    disabled={loading || submitted}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Enviando...
                      </>
                    ) : submitted ? (
                      <>
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Mensagem Enviada!
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4 mr-2" />
                        Enviar Mensagem
                      </>
                    )}
                  </Button>

                  <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                    * Campos obrigatórios
                  </p>
                </form>
              </Card>
            </motion.div>

            {/* Right Side - Contact Information */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              className="space-y-8"
            >
              {/* Contact Info Cards */}
              <div className="space-y-4">
                {contactInfo.map((info, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: idx * 0.1 }}
                  >
                    <Card className="p-6 hover:shadow-lg transition-shadow">
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${info.color} flex items-center justify-center flex-shrink-0`}>
                          <info.icon className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                            {info.title}
                          </h3>
                          {info.link ? (
                            <a 
                              href={info.link}
                              className="text-blue-600 dark:text-blue-400 hover:underline"
                            >
                              {info.content}
                            </a>
                          ) : (
                            <p className="text-gray-600 dark:text-gray-400">
                              {info.content}
                            </p>
                          )}
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </div>

              {/* Response Time */}
              <Card className="p-6 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 border-2 border-blue-200 dark:border-blue-800">
                <div className="flex items-start gap-4">
                  <MessageSquare className="w-8 h-8 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                  <div>
                    <h3 className="font-bold text-gray-900 dark:text-white mb-2">
                      Tempo de Resposta
                    </h3>
                    <p className="text-gray-600 dark:text-gray-300">
                      Respondemos em até <strong>24 horas úteis</strong>. Para emergências, entre em contato por telefone.
                    </p>
                  </div>
                </div>
              </Card>

              {/* Social Links */}
              <Card className="p-6">
                <h3 className="font-bold text-gray-900 dark:text-white mb-4">
                  Siga-nos nas Redes Sociais
                </h3>
                <div className="flex gap-4">
                  {socialLinks.map((social, idx) => (
                    <a
                      key={idx}
                      href={social.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center hover:scale-110 transition-transform"
                      aria-label={social.label}
                    >
                      <social.icon className="w-6 h-6 text-white" />
                    </a>
                  ))}
                </div>
              </Card>
            </motion.div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default ContactPage;
