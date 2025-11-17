import React, { useState, useEffect } from 'react';
import { motion, useScroll, useSpring } from 'framer-motion';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { ArrowUp, BookOpen } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { RoadmapHero } from '@/components/roadmap/RoadmapHero';
import { RoadmapTimeline } from '@/components/roadmap/RoadmapTimeline';
import { RoadmapCTA } from '@/components/roadmap/RoadmapCTA';
import SkipLinks from '@/shared/components/SkipLinks';
import CookieBanner from '@/shared/components/CookieBanner';
import Footer from '@/shared/components/Footer';
import { roadmapPhases } from '@/data/roadmapData';
import { supabase } from '@/shared/services/supabaseClient';

export default function RoadmapPage() {
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001
  });

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 400);
    };

    const handleMouseMove = (e) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener('scroll', handleScroll);
    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Partículas flutuantes
  const particles = Array.from({ length: 30 }, (_, i) => ({
    id: i,
    size: Math.random() * 6 + 2,
    x: Math.random() * 100,
    delay: Math.random() * 5,
    duration: Math.random() * 15 + 15
  }));

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-cyan-50 text-slate-900">
      <Helmet>
        <title>Roadmap 2026 - TamanduAI | Do MVP à Plataforma Completa</title>
        <meta 
          name="description" 
          content="Acompanhe a evolução do TamanduAI: lançamento em 11/11/2025 e roadmap completo de 2026 com melhorias do chatbot a cada trimestre."
        />
        <meta name="keywords" content="roadmap, educação, ia, inteligência artificial, plataforma educacional, edtech, chatbot, 2026" />
      </Helmet>

      <SkipLinks />

      {/* Scroll progress bar */}
      <motion.div
        style={{ scaleX }}
        className="fixed top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-cyan-500 to-purple-500 transform origin-left z-50 shadow-lg"
      />

      {/* Cursor glow effect */}
      <motion.div
        className="fixed w-96 h-96 rounded-full pointer-events-none z-0 mix-blend-multiply filter blur-3xl opacity-20"
        style={{
          background: 'radial-gradient(circle, rgba(59, 130, 246, 0.6), transparent)',
          x: mousePosition.x - 192,
          y: mousePosition.y - 192,
        }}
        animate={{
          scale: [1, 1.2, 1],
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />

      {/* Partículas flutuantes de fundo */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        {particles.map((particle) => (
          <motion.div
            key={particle.id}
            className="absolute rounded-full bg-gradient-to-br from-blue-400 to-cyan-400 opacity-20"
            style={{
              width: particle.size,
              height: particle.size,
              left: `${particle.x}%`,
              top: '100%'
            }}
            animate={{
              y: [0, -50, 0],
              opacity: [0, 0.4, 0],
              scale: [0.5, 1.2, 0.5]
            }}
            transition={{
              duration: particle.duration,
              repeat: Infinity,
              delay: particle.delay,
              ease: "easeInOut"
            }}
          />
        ))}
      </div>

      {/* Navbar */}
      <motion.header 
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, type: "spring", stiffness: 100 }}
        className="z-40 w-full bg-white/80 backdrop-blur-xl border-b border-slate-200/60 sticky top-0 shadow-sm"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Link to="/" className="flex items-center space-x-3 group">
                <motion.div 
                  className="w-9 h-9 bg-gradient-to-br from-blue-500 via-cyan-500 to-purple-500 rounded-lg flex items-center justify-center shadow-md"
                  whileHover={{ rotate: 360 }}
                  transition={{ duration: 0.6 }}
                >
                  <BookOpen className="w-5 h-5 text-white" />
                </motion.div>
                <span className="text-xl font-bold bg-gradient-to-r from-blue-600 via-cyan-600 to-purple-600 bg-clip-text text-transparent">
                  TamanduAI
                </span>
              </Link>
            </motion.div>
            <nav className="hidden md:flex space-x-6">
              {[
                { to: '/', label: 'Início' },
                { to: '/pricing', label: 'Preços' },
                { to: '/docs', label: 'Docs' },
                { to: '/contact', label: 'Contato' }
              ].map((item, index) => (
                <motion.div
                  key={item.to}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 + 0.2 }}
                >
                  <Link 
                    to={item.to} 
                    className="text-sm text-slate-600 hover:text-blue-600 transition-colors font-medium relative group"
                  >
                    {item.label}
                    <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-blue-500 to-cyan-500 group-hover:w-full transition-all duration-300" />
                  </Link>
                </motion.div>
              ))}
            </nav>
            <div className="flex items-center space-x-3">
              <Link to="/login">
                <Button variant="ghost" size="sm" className="text-slate-700 hover:text-blue-600 hover:bg-blue-50">Entrar</Button>
              </Link>
              <Link to="/register">
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button 
                    size="sm"
                    className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 transition-all duration-300"
                  >
                    Começar Grátis
                  </Button>
                </motion.div>
              </Link>
            </div>
          </div>
        </div>
      </motion.header>

      {/* Main content */}
      <main id="main-content" className="relative z-10">
        <RoadmapHero />
        <RoadmapTimeline />
        <RoadmapCTA />
      </main>

      <Footer />

      {/* Scroll to top button */}
      <motion.button
        initial={{ opacity: 0, scale: 0, rotate: -180 }}
        animate={{ 
          opacity: showScrollTop ? 1 : 0,
          scale: showScrollTop ? 1 : 0,
          rotate: showScrollTop ? 0 : -180,
          y: showScrollTop ? 0 : 20
        }}
        whileHover={{ 
          scale: 1.2, 
          rotate: 360,
          boxShadow: "0 20px 60px rgba(59, 130, 246, 0.5)"
        }}
        whileTap={{ scale: 0.9 }}
        transition={{ 
          type: "spring",
          stiffness: 260,
          damping: 20
        }}
        onClick={scrollToTop}
        className="fixed bottom-8 right-8 z-50 w-14 h-14 rounded-full bg-gradient-to-r from-blue-500 via-cyan-500 to-purple-500 flex items-center justify-center shadow-2xl shadow-blue-500/40 hover:shadow-purple-500/60 border-2 border-white"
        style={{ 
          pointerEvents: showScrollTop ? 'auto' : 'none'
        }}
        aria-label="Voltar ao topo"
      >
        <ArrowUp className="w-7 h-7 text-white" />
      </motion.button>

      <CookieBanner />
    </div>
  );
}
