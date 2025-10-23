import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Mail, Lock, GraduationCap, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Card } from '@/shared/components/ui/card';
import { Alert, AlertDescription } from '@/shared/components/ui/alert';
import { useAuth } from '@/shared/hooks/useAuth';
import { validateLogin, onLoginSuccess } from '@/shared/services/edgeFunctions/authEdge';
import { supabase } from '@/shared/services/supabaseClient';

const LoginPage = () => {
  const navigate = useNavigate();
  const { signIn } = useAuth();
  
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setError(''); // Limpa erro ao digitar
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    // Validações básicas
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
      // 1. Validar login com Edge Function
      try {
        await validateLogin(formData.email, formData.password);
      } catch (validationError) {
        console.log('Validation error (non-blocking):', validationError);
        // Continuar mesmo se a edge function falhar
      }

      // 2. Fazer login com Supabase
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
        // 3. Callback de sucesso (não-bloqueante)
        try {
          await onLoginSuccess(data.user.id);
        } catch (callbackError) {
          console.log('Login success callback error (non-blocking):', callbackError);
        }

        // 4. Buscar profile e redirecionar
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', data.user.id)
          .single();

        if (profile?.role === 'student') {
          navigate('/students/dashboard');
        } else if (profile?.role === 'teacher') {
          navigate('/dashboard');
        } else if (profile?.role === 'school') {
          navigate('/dashboard/school');
        } else {
          navigate('/dashboard');
        }
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('Erro ao fazer login. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 flex items-center justify-center p-4">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-grid-slate-900/[0.04] dark:bg-grid-slate-400/[0.05] bg-[size:20px_20px]" />
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md relative z-10"
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
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2 text-slate-900 dark:text-white">
              Bem-vindo de volta!
            </h1>
            <p className="text-slate-600 dark:text-slate-400">
              Entre para continuar sua jornada educacional
            </p>
          </div>

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
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-slate-700 dark:text-slate-300">
                  Senha
                </Label>
                <Link
                  to="/forgot-password"
                  className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                >
                  Esqueceu a senha?
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={handleChange}
                  className="pl-10 pr-10 h-12 bg-white dark:bg-slate-900 text-foreground border-border"
                  disabled={loading}
                  autoComplete="current-password"
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

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 text-base whitespace-nowrap inline-flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Entrando...</span>
                </>
              ) : (
                <span>Entrar</span>
              )}
            </Button>
          </form>

          {/* Divider */}
          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200 dark:border-slate-700" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400">
                Novo por aqui?
              </span>
            </div>
          </div>

          {/* Register Link */}
          <Link to="/register">
            <Button
              type="button"
              variant="outline"
              className="w-full h-12 text-base whitespace-nowrap bg-white dark:bg-slate-900 text-foreground border-border hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              Criar uma conta
            </Button>
          </Link>
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

export default LoginPage;
