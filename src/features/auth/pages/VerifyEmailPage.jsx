import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, GraduationCap, CheckCircle2, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Card } from '@/shared/components/ui/card';
import { supabase } from '@/shared/services/supabaseClient';

const VerifyEmailPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');

  useEffect(() => {
    // Pegar email do localStorage se tiver
    const savedEmail = localStorage.getItem('pendingVerificationEmail');
    if (savedEmail) {
      setEmail(savedEmail);
    }
  }, []);

  const handleResendEmail = async () => {
    if (!email) {
      setMessage('Por favor, faça login novamente para reenviar o email de verificação');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email
      });

      if (error) throw error;

      setMessage('Email de verificação reenviado com sucesso! Verifique sua caixa de entrada.');
    } catch (error) {
      console.error('Erro ao reenviar email:', error);
      setMessage('Erro ao reenviar email. Tente novamente mais tarde.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-blue-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 flex items-center justify-center p-4">
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
          <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-xl flex items-center justify-center">
            <GraduationCap className="w-7 h-7 text-white" />
          </div>
          <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
            TamanduAI
          </span>
        </Link>

        <Card className="p-8 bg-white dark:bg-slate-900 shadow-2xl border-0">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center"
          >
            {/* Icon */}
            <div className="w-20 h-20 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
              <Mail className="w-10 h-10 text-blue-600 dark:text-blue-400" />
            </div>
            
            {/* Header */}
            <h1 className="text-3xl font-bold mb-3 text-slate-900 dark:text-white">
              Verifique seu e-mail
            </h1>
            
            <p className="text-slate-600 dark:text-slate-400 mb-6">
              Enviamos um link de verificação para
              {email && (
                <>
                  <br />
                  <strong className="text-slate-900 dark:text-white">{email}</strong>
                </>
              )}
            </p>

            {/* Instructions */}
            <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-6 mb-6 text-left">
              <h3 className="font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                Próximos passos:
              </h3>
              <ol className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                <li className="flex items-start gap-2">
                  <span className="font-bold text-blue-600 dark:text-blue-400 mt-0.5">1.</span>
                  <span>Abra sua caixa de entrada de e-mail</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold text-blue-600 dark:text-blue-400 mt-0.5">2.</span>
                  <span>Procure por um e-mail de <strong>TamanduAI</strong></span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold text-blue-600 dark:text-blue-400 mt-0.5">3.</span>
                  <span>Clique no link de verificação</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold text-blue-600 dark:text-blue-400 mt-0.5">4.</span>
                  <span>Você será redirecionado automaticamente</span>
                </li>
              </ol>
            </div>

            {/* Message */}
            {message && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-4 rounded-lg mb-6 text-sm ${
                  message.includes('sucesso')
                    ? 'bg-green-50 dark:bg-green-950/30 text-green-800 dark:text-green-200'
                    : 'bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-200'
                }`}
              >
                {message}
              </motion.div>
            )}

            {/* Actions */}
            <div className="space-y-3">
              <Button
                onClick={handleResendEmail}
                disabled={loading || !email}
                className="w-full h-12 whitespace-nowrap inline-flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Reenviando...</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-5 h-5" />
                    <span>Reenviar E-mail</span>
                  </>
                )}
              </Button>

              <Link to="/login" className="block">
                <Button
                  variant="outline"
                  className="w-full h-12 whitespace-nowrap bg-white dark:bg-slate-900 text-foreground border-border"
                >
                  Voltar para Login
                </Button>
              </Link>
            </div>

            {/* Help Text */}
            <p className="text-sm text-slate-500 dark:text-slate-500 mt-6">
              Não recebeu o e-mail? Verifique sua pasta de spam ou lixo eletrônico
            </p>
          </motion.div>
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
      <div className="fixed bottom-0 right-0 w-96 h-96 bg-cyan-400/20 dark:bg-cyan-600/10 rounded-full blur-3xl -z-10" />
    </div>
  );
};

export default VerifyEmailPage;
