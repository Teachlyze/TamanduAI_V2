import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Eye, EyeOff, Mail, Lock, User, GraduationCap, AlertCircle, 
  Loader2, CheckCircle2, BookOpen, Users, Building2, ChevronRight 
} from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Card } from '@/shared/components/ui/card';
import { Alert, AlertDescription } from '@/shared/components/ui/alert';
import { useAuth } from '@/shared/hooks/useAuth';
import { validateRegister, onRegisterSuccess } from '@/shared/services/edgeFunctions/authEdge';

const RegisterPage = () => {
  const navigate = useNavigate();
  const { signUp } = useAuth();
  
  const [step, setStep] = useState(1); // 1: Escolher role, 2: Preencher dados
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: ''
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
      gradient: 'from-blue-600 to-indigo-600',
      features: ['Atividades personalizadas', 'Sistema de XP', 'Acompanhamento de notas']
    },
    {
      id: 'teacher',
      title: 'Professor',
      description: 'Crie turmas, atividades e acompanhe seus alunos',
      icon: BookOpen,
      gradient: 'from-purple-600 to-pink-600',
      features: ['Correção automática', 'Analytics detalhado', 'Gestão de turmas']
    },
    {
      id: 'school',
      title: 'Escola',
      description: 'Gerencie toda a instituição em um só lugar',
      icon: Building2,
      gradient: 'from-emerald-600 to-teal-600',
      features: ['Gestão completa', 'Relatórios consolidados', 'Múltiplos professores']
    }
  ];

  const handleRoleSelect = (roleId) => {
    setFormData(prev => ({ ...prev, role: roleId }));
    setStep(2);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setError('');
  };

  const validateForm = () => {
    if (!formData.name || !formData.email || !formData.password || !formData.confirmPassword) {
      setError('Por favor, preencha todos os campos');
      return false;
    }

    if (!formData.email.includes('@')) {
      setError('Por favor, insira um e-mail válido');
      return false;
    }

    if (formData.password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres');
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
      // 1. Validar registro com Edge Function
      try {
        await validateRegister({
          email: formData.email,
          name: formData.name,
          role: formData.role
        });
      } catch (validationError) {
        console.log('Validation error (non-blocking):', validationError);
        // Continuar mesmo se a edge function falhar
      }

      // 2. Fazer registro com Supabase
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
        // 3. Callback de sucesso (não-bloqueante)
        try {
          await onRegisterSuccess(data.user.id, {
            name: formData.name,
            role: formData.role
          });
        } catch (callbackError) {
          console.log('Register success callback error (non-blocking):', callbackError);
        }

        setSuccess(true);
        setTimeout(() => {
          navigate('/login', { 
            state: { message: 'Conta criada! Verifique seu e-mail para confirmar.' }
          });
        }, 2000);
      }
    } catch (err) {
      console.error('Register error:', err);
      setError('Erro ao criar conta. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const selectedRole = roles.find(r => r.id === formData.role);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 flex items-center justify-center p-4">
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
          <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
            <GraduationCap className="w-7 h-7 text-white" />
          </div>
          <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            TamanduAI
          </span>
        </Link>

        <Card className="p-8 bg-white dark:bg-slate-900 shadow-2xl border-0">
          {/* Progress Indicator */}
          <div className="flex items-center justify-center gap-4 mb-8">
            <div className={`flex items-center justify-center w-10 h-10 rounded-full ${step >= 1 ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'}`}>
              {step > 1 ? <CheckCircle2 className="w-5 h-5" /> : '1'}
            </div>
            <div className={`h-1 w-16 rounded-full ${step >= 2 ? 'bg-gradient-to-r from-blue-600 to-purple-600' : 'bg-slate-200 dark:bg-slate-700'}`} />
            <div className={`flex items-center justify-center w-10 h-10 rounded-full ${step >= 2 ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'}`}>
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
                      className="group relative p-6 rounded-2xl border-2 border-slate-200 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-600 transition-all text-left hover:shadow-xl"
                    >
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
                      Nome completo
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
                        className="pl-10 h-12 bg-white dark:bg-slate-900 text-foreground border-border"
                        disabled={loading}
                        required
                      />
                    </div>
                  </div>

                  {/* Email */}
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-slate-700 dark:text-slate-300">
                      E-mail
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
                        className="pl-10 h-12 bg-white dark:bg-slate-900 text-foreground border-border"
                        disabled={loading}
                        autoComplete="email"
                        required
                      />
                    </div>
                  </div>

                  {/* Password */}
                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-slate-700 dark:text-slate-300">
                      Senha
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <Input
                        id="password"
                        name="password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Mínimo 6 caracteres"
                        value={formData.password}
                        onChange={handleChange}
                        className="pl-10 pr-10 h-12 bg-white dark:bg-slate-900 text-foreground border-border"
                        disabled={loading}
                        autoComplete="new-password"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
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
                      disabled={loading}
                      className="flex-1 h-12 text-base whitespace-nowrap inline-flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          <span>Criando conta...</span>
                        </>
                      ) : (
                        <span>Criar conta</span>
                      )}
                    </Button>
                  </div>
                </form>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Login Link */}
          {step === 2 && (
            <div className="relative mt-8">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200 dark:border-slate-700" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400">
                  Já tem uma conta?
                </span>
              </div>
            </div>
          )}

          {step === 2 && (
            <Link to="/login" className="block mt-4">
              <Button
                type="button"
                variant="outline"
                className="w-full h-12 text-base whitespace-nowrap bg-white dark:bg-slate-900 text-foreground border-border hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                Fazer login
              </Button>
            </Link>
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
      <div className="fixed top-0 left-0 w-96 h-96 bg-blue-400/20 dark:bg-blue-600/10 rounded-full blur-3xl -z-10" />
      <div className="fixed bottom-0 right-0 w-96 h-96 bg-purple-400/20 dark:bg-purple-600/10 rounded-full blur-3xl -z-10" />
    </div>
  );
};

export default RegisterPage;
