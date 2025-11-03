import { logger } from '@/shared/utils/logger';
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Eye, EyeOff, Mail, Lock, User, GraduationCap, AlertCircle, 
  Loader2, CheckCircle2, BookOpen, Users, Building2, ChevronRight,
  CreditCard, Calendar, Check, X, Info, Sparkles
} from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Card } from '@/shared/components/ui/card';
import { Alert, AlertDescription } from '@/shared/components/ui/alert';
import { useAuth } from '@/shared/hooks/useAuth';

const RegisterPage = () => {
  const navigate = useNavigate();
  const { signUp } = useAuth();
  
  const [step, setStep] = useState(1); // 1: Escolher role, 2: Preencher dados
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    cpf: '',
    birthDate: '',
    role: ''
  });
  const [validations, setValidations] = useState({
    name: null,
    email: null,
    cpf: null,
    birthDate: null,
    password: { valid: null, messages: [] }
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const roles = [
    {
      id: 'student',
      title: 'Aluno',
      description: 'Acesse atividades, acompanhe seu progresso e ganhe XP',
      icon: GraduationCap,
      gradient: 'from-cyan-600 to-blue-600',
      features: ['Atividades personalizadas', 'Sistema de XP', 'Acompanhamento de notas'],
      disabled: false
    },
    {
      id: 'teacher',
      title: 'Professor',
      description: 'Crie turmas, atividades e acompanhe seus alunos',
      icon: BookOpen,
      gradient: 'from-blue-600 to-blue-800',
      features: ['Correção automática', 'Analytics detalhado', 'Gestão de turmas'],
      disabled: false
    },
    {
      id: 'school',
      title: 'Escola',
      description: 'Gerencie toda a instituição em um só lugar',
      icon: Building2,
      gradient: 'from-gray-400 to-gray-600',
      features: ['Gestão completa', 'Relatórios consolidados', 'Múltiplos professores'],
      disabled: true,
      badge: 'Em Breve'
    }
  ];

  // Funções de validação regex
  const validateName = (name) => {
    const regex = /^[a-zA-ZÀ-ÿ\s]{3,}$/;
    return regex.test(name);
  };

  const validateEmail = (email) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  };

  const validateCPF = (cpf) => {
    const cleanCPF = cpf.replace(/\D/g, '');
    if (cleanCPF.length !== 11) return false;
    
    // Verifica se todos os dígitos são iguais
    if (/^(\d)\1{10}$/.test(cleanCPF)) return false;
    
    // Validação dos dígitos verificadores
    let sum = 0;
    for (let i = 0; i < 9; i++) {
      sum += parseInt(cleanCPF.charAt(i)) * (10 - i);
    }
    let digit = 11 - (sum % 11);
    if (digit >= 10) digit = 0;
    if (parseInt(cleanCPF.charAt(9)) !== digit) return false;
    
    sum = 0;
    for (let i = 0; i < 10; i++) {
      sum += parseInt(cleanCPF.charAt(i)) * (11 - i);
    }
    digit = 11 - (sum % 11);
    if (digit >= 10) digit = 0;
    if (parseInt(cleanCPF.charAt(10)) !== digit) return false;
    
    return true;
  };

  const validateBirthDate = (date) => {
    if (!date) return false;
    const birthDate = new Date(date);
    const today = new Date();
    const age = today.getFullYear() - birthDate.getFullYear();
    return age >= 5 && age <= 120;
  };

  const validatePassword = (password) => {
    const messages = [];
    let valid = true;

    if (password.length < 8) {
      messages.push('Mínimo 8 caracteres');
      valid = false;
    }
    if (!/\d/.test(password)) {
      messages.push('Pelo menos 1 número');
      valid = false;
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      messages.push('Pelo menos 1 caractere especial');
      valid = false;
    }

    return { valid, messages };
  };

  const formatCPF = (value) => {
    const cleaned = value.replace(/\D/g, '');
    const match = cleaned.match(/^(\d{0,3})(\d{0,3})(\d{0,3})(\d{0,2})$/);
    if (match) {
      return !match[2] ? match[1] : `${match[1]}.${match[2]}${match[3] ? `.${match[3]}` : ''}${match[4] ? `-${match[4]}` : ''}`;
    }
    return value;
  };

  const handleRoleSelect = (roleId) => {
    const role = roles.find(r => r.id === roleId);
    if (role?.disabled) return;
    setFormData(prev => ({ ...prev, role: roleId }));
    setStep(2);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    let newValue = value;

    // Formatar CPF
    if (name === 'cpf') {
      newValue = formatCPF(value);
    }

    setFormData(prev => ({
      ...prev,
      [name]: newValue
    }));
    setError('');

    // Validações em tempo real
    if (name === 'name' && value) {
      setValidations(prev => ({ ...prev, name: validateName(value) }));
    }
    if (name === 'email' && value) {
      setValidations(prev => ({ ...prev, email: validateEmail(value) }));
    }
    if (name === 'cpf' && value) {
      setValidations(prev => ({ ...prev, cpf: validateCPF(value) }));
    }
    if (name === 'birthDate' && value) {
      setValidations(prev => ({ ...prev, birthDate: validateBirthDate(value) }));
    }
    if (name === 'password' && value) {
      setValidations(prev => ({ ...prev, password: validatePassword(value) }));
    }
  };

  const validateForm = () => {
    if (!formData.name || !formData.email || !formData.password || !formData.confirmPassword || !formData.cpf || !formData.birthDate) {
      setError('Por favor, preencha todos os campos obrigatórios');
      return false;
    }

    if (!validateName(formData.name)) {
      setError('Nome inválido (mínimo 3 caracteres, apenas letras)');
      return false;
    }

    if (!validateEmail(formData.email)) {
      setError('E-mail inválido');
      return false;
    }

    if (!validateCPF(formData.cpf)) {
      setError('CPF inválido');
      return false;
    }

    if (!validateBirthDate(formData.birthDate)) {
      setError('Data de nascimento inválida');
      return false;
    }

    const passwordValidation = validatePassword(formData.password);
    if (!passwordValidation.valid) {
      setError(`Senha inválida: ${passwordValidation.messages.join(', ')}`);
      return false;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('As senhas não coincidem');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!validateForm()) return;

    setLoading(true);

    try {
      // Fazer registro direto com Supabase (sem Edge Functions)
      const { data, error: signUpError } = await signUp(
        formData.email,
        formData.password,
        {
          name: formData.name,
          role: formData.role
        }
      );
      
      if (signUpError) {
        if (signUpError.message.includes('already registered')) {
          setError('Este e-mail já está cadastrado');
        } else {
          setError(signUpError.message || 'Erro ao criar conta. Tente novamente.');
        }
        return;
      }

      if (data?.user) {
        setSuccess(true);
        setTimeout(() => {
          navigate('/login', { 
            state: { message: 'Conta criada! Verifique seu e-mail para confirmar.' }
          });
        }, 2000);
      }
    } catch (err) {
      logger.error('Register error:', err)
      setError('Erro ao criar conta. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const selectedRole = roles.find(r => r.id === formData.role);

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-blue-50 to-blue-100 dark:from-gray-950 dark:via-gray-900 dark:to-slate-950 flex items-center justify-center p-4">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-grid-slate-900/[0.04] dark:bg-grid-slate-400/[0.05] bg-[size:20px_20px]" />
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-4xl relative z-10"
      >
        {/* Logo */}
        <Link to="/" className="flex items-center justify-center gap-2 mb-8">
          <div className="w-12 h-12 bg-gradient-to-br from-cyan-600 via-blue-600 to-blue-800 rounded-xl flex items-center justify-center shadow-lg">
            <Sparkles className="w-7 h-7 text-white" />
          </div>
          <span className="text-2xl font-bold bg-gradient-to-r from-cyan-600 via-blue-600 to-blue-800 bg-clip-text text-transparent">
            TamanduAI
          </span>
        </Link>

        <Card className="p-8 bg-white dark:bg-slate-900 shadow-2xl border-0">
          {/* Progress Indicator */}
          <div className="flex items-center justify-center gap-4 mb-8">
            <div className={`flex items-center justify-center w-10 h-10 rounded-full ${step >= 1 ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'}`}>
              {step > 1 ? <CheckCircle2 className="w-5 h-5" /> : '1'}
            </div>
            <div className={`h-1 w-16 rounded-full ${step >= 2 ? 'bg-gradient-to-r from-cyan-600 to-blue-600' : 'bg-slate-200 dark:bg-slate-700'}`} />
            <div className={`flex items-center justify-center w-10 h-10 rounded-full ${step >= 2 ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'}`}>
              2
            </div>
          </div>

          <AnimatePresence mode="wait">
            {/* Step 1: Choose Role */}
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <div className="text-center mb-8">
                  <h1 className="text-3xl font-bold mb-2 text-slate-900 dark:text-white">
                    Escolha seu perfil
                  </h1>
                  <p className="text-slate-600 dark:text-slate-400">
                    Selecione como você vai usar a plataforma
                  </p>
                </div>

                <div className="grid md:grid-cols-3 gap-4">
                  {roles.map((role, index) => (
                    <motion.button
                      key={role.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      onClick={() => handleRoleSelect(role.id)}
                      disabled={role.disabled}
                      className={`group relative p-6 rounded-2xl border-2 transition-all text-left ${
                        role.disabled
                          ? 'border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 cursor-not-allowed opacity-75'
                          : 'border-slate-200 dark:border-slate-700 hover:border-cyan-400 dark:hover:border-cyan-600 hover:shadow-xl cursor-pointer'
                      }`}
                    >
                      {role.badge && (
                        <div className="absolute top-3 right-3 px-3 py-1 bg-gradient-to-r from-cyan-600 to-blue-600 text-white text-xs font-bold rounded-full shadow-md">
                          {role.badge}
                        </div>
                      )}
                      <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${role.gradient} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                        <role.icon className="w-7 h-7 text-white" />
                      </div>
                      
                      <h3 className="text-xl font-bold mb-2 text-slate-900 dark:text-white">
                        {role.title}
                      </h3>
                      
                      <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                        {role.description}
                      </p>

                      <ul className="space-y-2">
                        {role.features.map((feature, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-400">
                            <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>

                      <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                        <ChevronRight className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                      </div>
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Step 2: Fill Form */}
            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="max-w-2xl mx-auto"
              >
                {/* Selected Role Badge */}
                {selectedRole && (
                  <div className="flex items-center justify-center mb-6">
                    <div className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-gradient-to-r from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700">
                      <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${selectedRole.gradient} flex items-center justify-center`}>
                        <selectedRole.icon className="w-5 h-5 text-white" />
                      </div>
                      <div className="text-left">
                        <div className="text-sm text-slate-600 dark:text-slate-400">Cadastrando como</div>
                        <div className="font-bold text-slate-900 dark:text-white">{selectedRole.title}</div>
                      </div>
                      <button
                        onClick={() => setStep(1)}
                        className="ml-2 text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                      >
                        Alterar
                      </button>
                    </div>
                  </div>
                )}

                <div className="text-center mb-8">
                  <h1 className="text-3xl font-bold mb-2 text-slate-900 dark:text-white">
                    Criar sua conta
                  </h1>
                  <p className="text-slate-600 dark:text-slate-400">
                    Complete seus dados para começar
                  </p>
                </div>

                {/* Success Message */}
                {success && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <Alert className="mb-6 border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950">
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                      <AlertDescription className="text-green-800 dark:text-green-200">
                        Conta criada com sucesso! Redirecionando...
                      </AlertDescription>
                    </Alert>
                  </motion.div>
                )}

                {/* Error Alert */}
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <Alert variant="destructive" className="mb-6">
                      <AlertCircle className="w-4 h-4" />
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  </motion.div>
                )}

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Name */}
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-slate-700 dark:text-slate-300">
                      Nome completo *
                    </Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <Input
                        id="name"
                        name="name"
                        type="text"
                        placeholder="Seu nome"
                        value={formData.name}
                        onChange={handleChange}
                        className={`pl-10 pr-10 h-12 bg-white dark:bg-slate-900 text-foreground ${
                          validations.name === true ? 'border-green-500 focus:ring-green-500' :
                          validations.name === false ? 'border-red-500 focus:ring-red-500' :
                          'border-border'
                        }`}
                        disabled={loading}
                        required
                      />
                      {validations.name !== null && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          {validations.name ? (
                            <Check className="w-5 h-5 text-green-500" />
                          ) : (
                            <X className="w-5 h-5 text-red-500" />
                          )}
                        </div>
                      )}
                    </div>
                    {validations.name === false && (
                      <p className="text-xs text-red-500">Mínimo 3 caracteres, apenas letras</p>
                    )}
                  </div>

                  {/* Email */}
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-slate-700 dark:text-slate-300">
                      E-mail *
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        placeholder="seu@email.com"
                        value={formData.email}
                        onChange={handleChange}
                        className={`pl-10 pr-10 h-12 bg-white dark:bg-slate-900 text-foreground ${
                          validations.email === true ? 'border-green-500 focus:ring-green-500' :
                          validations.email === false ? 'border-red-500 focus:ring-red-500' :
                          'border-border'
                        }`}
                        disabled={loading}
                        autoComplete="email"
                        required
                      />
                      {validations.email !== null && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          {validations.email ? (
                            <Check className="w-5 h-5 text-green-500" />
                          ) : (
                            <X className="w-5 h-5 text-red-500" />
                          )}
                        </div>
                      )}
                    </div>
                    {validations.email === false && (
                      <p className="text-xs text-red-500">E-mail inválido</p>
                    )}
                  </div>

                  {/* CPF */}
                  <div className="space-y-2">
                    <Label htmlFor="cpf" className="text-slate-700 dark:text-slate-300">
                      CPF *
                    </Label>
                    <div className="relative">
                      <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <Input
                        id="cpf"
                        name="cpf"
                        type="text"
                        placeholder="000.000.000-00"
                        value={formData.cpf}
                        onChange={handleChange}
                        maxLength={14}
                        className={`pl-10 pr-10 h-12 bg-white dark:bg-slate-900 text-foreground ${
                          validations.cpf === true ? 'border-green-500 focus:ring-green-500' :
                          validations.cpf === false ? 'border-red-500 focus:ring-red-500' :
                          'border-border'
                        }`}
                        disabled={loading}
                        required
                      />
                      {validations.cpf !== null && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          {validations.cpf ? (
                            <Check className="w-5 h-5 text-green-500" />
                          ) : (
                            <X className="w-5 h-5 text-red-500" />
                          )}
                        </div>
                      )}
                    </div>
                    {validations.cpf === false && (
                      <p className="text-xs text-red-500">CPF inválido</p>
                    )}
                  </div>

                  {/* Data de Nascimento */}
                  <div className="space-y-2">
                    <Label htmlFor="birthDate" className="text-slate-700 dark:text-slate-300">
                      Data de Nascimento *
                    </Label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <Input
                        id="birthDate"
                        name="birthDate"
                        type="date"
                        value={formData.birthDate}
                        onChange={handleChange}
                        className={`pl-10 pr-10 h-12 bg-white dark:bg-slate-900 text-foreground ${
                          validations.birthDate === true ? 'border-green-500 focus:ring-green-500' :
                          validations.birthDate === false ? 'border-red-500 focus:ring-red-500' :
                          'border-border'
                        }`}
                        disabled={loading}
                        required
                      />
                      {validations.birthDate !== null && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          {validations.birthDate ? (
                            <Check className="w-5 h-5 text-green-500" />
                          ) : (
                            <X className="w-5 h-5 text-red-500" />
                          )}
                        </div>
                      )}
                    </div>
                    {validations.birthDate === false && (
                      <p className="text-xs text-red-500">Idade deve ser entre 5 e 120 anos</p>
                    )}
                  </div>

                  {/* Password */}
                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-slate-700 dark:text-slate-300">
                      Senha *
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <Input
                        id="password"
                        name="password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Mínimo 8 caracteres"
                        value={formData.password}
                        onChange={handleChange}
                        className={`pl-10 pr-20 h-12 bg-white dark:bg-slate-900 text-foreground ${
                          validations.password.valid === true ? 'border-green-500 focus:ring-green-500' :
                          validations.password.valid === false ? 'border-red-500 focus:ring-red-500' :
                          'border-border'
                        }`}
                        disabled={loading}
                        autoComplete="new-password"
                        required
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                        {validations.password.valid !== null && (
                          <div>
                            {validations.password.valid ? (
                              <Check className="w-5 h-5 text-green-500" />
                            ) : (
                              <X className="w-5 h-5 text-red-500" />
                            )}
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                          tabIndex={-1}
                        >
                          {showPassword ? (
                            <EyeOff className="w-5 h-5" />
                          ) : (
                            <Eye className="w-5 h-5" />
                          )}
                        </button>
                      </div>
                    </div>
                    {validations.password.messages.length > 0 && (
                      <div className="space-y-1">
                        {validations.password.messages.map((msg, idx) => (
                          <p key={idx} className="text-xs text-red-500 flex items-center gap-1">
                            <X className="w-3 h-3" /> {msg}
                          </p>
                        ))}
                      </div>
                    )}
                    {formData.password && validations.password.valid && (
                      <p className="text-xs text-green-500 flex items-center gap-1">
                        <Check className="w-3 h-3" /> Senha forte!
                      </p>
                    )}
                  </div>

                  {/* Confirm Password */}
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword" className="text-slate-700 dark:text-slate-300">
                      Confirmar senha
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <Input
                        id="confirmPassword"
                        name="confirmPassword"
                        type={showConfirmPassword ? 'text' : 'password'}
                        placeholder="Digite a senha novamente"
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        className="pl-10 pr-10 h-12 bg-white dark:bg-slate-900 text-foreground border-border"
                        disabled={loading}
                        autoComplete="new-password"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                        tabIndex={-1}
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="w-5 h-5" />
                        ) : (
                          <Eye className="w-5 h-5" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Terms */}
                  <p className="text-sm text-slate-600 dark:text-slate-400 text-center">
                    Ao criar uma conta, você concorda com nossos{' '}
                    <a href="#" className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300">
                      Termos de Uso
                    </a>{' '}
                    e{' '}
                    <a href="#" className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300">
                      Política de Privacidade
                    </a>
                  </p>

                  {/* Submit Buttons */}
                  <div className="flex gap-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setStep(1)}
                      disabled={loading}
                      className="flex-1 h-12 whitespace-nowrap bg-white dark:bg-slate-900 text-foreground border-border"
                    >
                      Voltar
                    </Button>
                    <Button
                      type="submit"
                      variant="gradient"
                      disabled={loading}
                      className="flex-1 h-12 text-base whitespace-nowrap"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          <span>Criando conta...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-5 h-5" />
                          <span>Criar conta</span>
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Login Section - Melhorada */}
          {step === 2 && (
            <div className="mt-8 space-y-4">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200 dark:border-slate-700" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 font-medium">
                    Já tem uma conta?
                  </span>
                </div>
              </div>

              <Link to="/login" className="block">
                <Button
                  type="button"
                  variant="gradientOutline"
                  className="w-full h-12 text-base font-medium border-2 border-cyan-600 dark:border-cyan-500 text-cyan-700 dark:text-cyan-400 hover:bg-cyan-50 dark:hover:bg-cyan-950/20"
                  leftIcon={<ChevronRight className="w-5 h-5" />}
                >
                  Fazer login agora
                </Button>
              </Link>
            </div>
          )}
        </Card>

        {/* Footer Links */}
        <div className="mt-8 text-center">
          <Link
            to="/"
            className="text-sm text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400"
          >
            ← Voltar para o início
          </Link>
        </div>
      </motion.div>

      {/* Decorative Blobs */}
      <div className="fixed top-0 left-0 w-96 h-96 bg-cyan-400/20 dark:bg-cyan-600/10 rounded-full blur-3xl -z-10" />
      <div className="fixed bottom-0 right-0 w-96 h-96 bg-blue-400/20 dark:bg-blue-600/10 rounded-full blur-3xl -z-10" />
    </div>
  );
};

export default RegisterPage;
