import { logger } from '@/shared/utils/logger';
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { 
  GraduationCap, 
  Mail, 
  Lock, 
  ArrowRight, 
  Sparkles,
  Users,
  BarChart3,
  Eye,
  EyeOff,
  AlertCircle,
  BookOpen
} from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Alert, AlertDescription } from '@/shared/components/ui/alert';
import { useAuth } from '@/shared/hooks/useAuth';
import { supabase } from '@/shared/services/supabaseClient';
import toast from 'react-hot-toast';
import { useIsMobile, usePrefersReducedMotion } from '@/shared/hooks/useMediaQuery';

const LoginPage = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const { signIn, user, profile, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();
  const prefersReducedMotion = usePrefersReducedMotion();
  const isMotionLight = isMobile || prefersReducedMotion;

  // Redirect if already logged in
  useEffect(() => {
    console.log('[LoginPage] Auth state:', { 
      hasUser: !!user, 
      hasProfile: !!profile, 
      authLoading,
      profileRole: profile?.role 
    });
    
    if (user && profile && !authLoading) {
      logger.debug('[LoginPage] ✅ All conditions met, redirecting to:', profile.role)
      
      const userRole = profile.role;
      
      if (userRole === 'student') {
        logger.debug('[LoginPage] Navigating to /students/dashboard')
        navigate('/students/dashboard');
      } else if (userRole === 'teacher') {
        logger.debug('[LoginPage] Navigating to /dashboard')
        navigate('/dashboard');
      } else if (userRole === 'school') {
        logger.debug('[LoginPage] Navigating to /school')
        navigate('/school');
      } else {
        logger.debug('[LoginPage] Fallback: Navigating to /dashboard')
        navigate('/dashboard');
      }
    }
  }, [user, profile, authLoading, navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!formData.email || !formData.password) {
      setError('Por favor, preencha todos os campos');
      return;
    }

    if (!formData.email.includes('@')) {
      setError('Por favor, insira um e-mail válido');
      return;
    }

    setLoading(true);

    try {
      // Fazer login direto com Supabase (sem Edge Functions)
      const { data, error: signInError } = await signIn(formData.email, formData.password);
      
      if (signInError) {
        if (signInError.message.includes('Invalid login credentials')) {
          setError('E-mail ou senha incorretos');
        } else if (signInError.message.includes('Email not confirmed')) {
          setError('Por favor, confirme seu e-mail antes de fazer login');
        } else {
          setError(signInError.message || 'Erro ao fazer login. Tente novamente.');
        }
        return;
      }

      if (data?.user) {
        toast.success('Login realizado com sucesso!');
        // O redirecionamento será feito pelo useEffect quando profile estiver pronto
      }
    } catch (err) {
      logger.error('Login error:', err)
      setError('Erro ao fazer login. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const features = [
    {
      icon: Sparkles,
      title: 'IA Avançada',
      description: 'Chatbot inteligente para suas turmas'
    },
    {
      icon: Users,
      title: 'Gestão Fácil',
      description: 'Organize alunos e professores'
    },
    {
      icon: BarChart3,
      title: 'Analytics',
      description: 'Acompanhe o progresso em tempo real'
    }
  ];

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Form */}
      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-amber-50 via-blue-50/30 to-cyan-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <motion.div
          initial={isMotionLight ? false : { opacity: 0, x: -20 }}
          animate={isMotionLight ? undefined : { opacity: 1, x: 0 }}
          transition={isMotionLight ? undefined : { duration: 0.5 }}
          className="w-full max-w-md"
        >
          {/* Logo */}
          <Link to="/" className="flex items-center justify-center gap-3 mb-8">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg bg-gradient-to-br from-cyan-600 via-blue-600 to-blue-800">
              <BookOpen className="w-7 h-7 text-white" />
            </div>
            <span className="text-3xl font-bold bg-gradient-to-r from-cyan-600 via-blue-600 to-blue-800 bg-clip-text text-transparent">
              TamanduAI
            </span>
          </Link>

          {/* Welcome Text */}
          <motion.div
            initial={isMotionLight ? false : { opacity: 0, y: 10 }}
            animate={isMotionLight ? undefined : { opacity: 1, y: 0 }}
            transition={isMotionLight ? undefined : { delay: 0.1 }}
            className="text-center mb-8"
          >
            <h2 className="text-3xl font-bold text-foreground mb-2">
              Bem-vindo de volta!
            </h2>
            <p className="text-muted-foreground">
              Entre para continuar gerenciando suas turmas
            </p>
          </motion.div>

          {/* Form */}
          <motion.form
            initial={isMotionLight ? false : { opacity: 0, y: 20 }}
            animate={isMotionLight ? undefined : { opacity: 1, y: 0 }}
            transition={isMotionLight ? undefined : { delay: 0.2 }}
            onSubmit={handleSubmit}
            className="space-y-6"
          >
            {/* Error Alert */}
            {error && (
              <Alert variant="destructive" className="mb-6">
                <AlertCircle className="w-4 h-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={formData.email}
                  onChange={handleChange}
                  className="pl-10 h-12"
                  disabled={loading}
                  autoComplete="email"
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Senha</Label>
                <Link
                  to="/forgot-password"
                  className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 hover:underline"
                >
                  Esqueceu a senha?
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={handleChange}
                  className="pl-10 pr-10 h-12"
                  disabled={loading}
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
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

            {/* Submit Button */}
            <Button
              type="submit"
              variant="gradient"
              size="lg"
              className="w-full"
              disabled={loading}
              rightIcon={<ArrowRight className="w-5 h-5" />}
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </Button>
            
            {/* Terms Notice */}
            <p className="text-xs text-center text-slate-500 dark:text-slate-400 mt-3">
              Ao fazer login, você concorda com nossos{' '}
              <Link to="/terms" target="_blank" className="text-blue-600 dark:text-blue-400 hover:underline">
                Termos de Uso
              </Link>
              {' '}e{' '}
              <Link to="/privacy" target="_blank" className="text-blue-600 dark:text-blue-400 hover:underline">
                Política de Privacidade
              </Link>
            </p>
          </motion.form>

          {/* Divider */}
          <motion.div
            initial={isMotionLight ? false : { opacity: 0 }}
            animate={isMotionLight ? undefined : { opacity: 1 }}
            transition={isMotionLight ? undefined : { delay: 0.3 }}
            className="my-8 flex items-center gap-4"
          >
            <div className="flex-1 h-px bg-border" />
            <span className="text-sm text-muted-foreground">ou</span>
            <div className="flex-1 h-px bg-border" />
          </motion.div>

          {/* Sign Up Link */}
          <motion.p
            initial={isMotionLight ? false : { opacity: 0 }}
            animate={isMotionLight ? undefined : { opacity: 1 }}
            transition={isMotionLight ? undefined : { delay: 0.4 }}
            className="text-center text-muted-foreground"
          >
            Não tem uma conta?{' '}
            <Link
              to="/register"
              state={location.state?.redirectTo ? { redirectTo: location.state.redirectTo } : undefined}
              className="text-blue-600 dark:text-blue-400 font-semibold hover:underline"
            >
              Cadastre-se grátis
            </Link>
          </motion.p>
        </motion.div>
      </div>

      {/* Right Side - Hero */}
      <div className="hidden lg:flex lg:flex-1 relative overflow-hidden bg-gradient-to-br from-cyan-700 via-blue-700 to-blue-900">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
            backgroundSize: '40px 40px'
          }} />
        </div>

        <div className="relative z-10 flex flex-col justify-center px-12 text-white">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
          >
            <h2 className="text-4xl font-bold mb-6">
              A plataforma educacional<br />que professores adoram
            </h2>
            <p className="text-xl text-white/90 mb-12">
              Reduza 70% do tempo em tarefas administrativas e<br />
              foque no que realmente importa: ensinar.
            </p>

            {/* Features */}
            <div className="space-y-6">
              {features.map((feature, index) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 + index * 0.1 }}
                  className="flex items-start gap-4 p-4 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20"
                >
                  <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                    <feature.icon className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg mb-1">
                      {feature.title}
                    </h3>
                    <p className="text-white/80 text-sm">
                      {feature.description}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Stats */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9 }}
              className="mt-12 grid grid-cols-3 gap-6"
            >
              {[
                { value: '10K+', label: 'Professores' },
                { value: '50K+', label: 'Alunos' },
                { value: '99%', label: 'Satisfação' }
              ].map((stat, i) => (
                <div key={i} className="text-center">
                  <div className="text-3xl font-bold mb-1">{stat.value}</div>
                  <div className="text-sm text-white/70">{stat.label}</div>
                </div>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
