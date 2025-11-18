import React from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowRight, Mail, MessageCircle, Sparkles } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { useIsMobile, usePrefersReducedMotion } from '@/shared/hooks/useMediaQuery';

export const RoadmapCTA = () => {
  const isMobile = useIsMobile();
  const prefersReducedMotion = usePrefersReducedMotion();
  const isMotionLight = isMobile || prefersReducedMotion;

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const rotateX = useSpring(useTransform(mouseY, [-0.5, 0.5], [5, -5]));
  const rotateY = useSpring(useTransform(mouseX, [-0.5, 0.5], [-5, 5]));

  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    mouseX.set(x);
    mouseY.set(y);
  };

  return (
    <div className="relative py-32 bg-gradient-to-br from-blue-50 via-white to-cyan-50 overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 bg-grid-white opacity-20" />
      
      {/* Animated orbs */}
      {!isMotionLight && (
        <div className="absolute inset-0 overflow-hidden">
          <motion.div
            animate={{
              x: [0, 100, 0],
              y: [0, -100, 0],
              scale: [1, 1.2, 1],
            }}
            transition={{
              duration: 20,
              repeat: Infinity,
              ease: "linear"
            }}
            className="absolute top-1/4 left-1/4 w-64 h-64 bg-blue-400 rounded-full blur-3xl opacity-15"
          />
          <motion.div
            animate={{
              x: [0, -100, 0],
              y: [0, 100, 0],
              scale: [1, 1.3, 1],
            }}
            transition={{
              duration: 25,
              repeat: Infinity,
              ease: "linear",
              delay: 1.5
            }}
            className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-purple-400 rounded-full blur-3xl opacity-15"
          />
          <motion.div
            animate={{
              x: [0, 50, 0],
              y: [0, -50, 0],
              scale: [1, 1.1, 1],
            }}
            transition={{
              duration: 15,
              repeat: Infinity,
              ease: "linear",
              delay: 3
            }}
            className="absolute top-1/2 right-1/3 w-64 h-64 bg-cyan-400 rounded-full blur-3xl opacity-15"
          />
        </div>
      )}

      <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          style={isMotionLight ? {} : {
            rotateX,
            rotateY,
            transformStyle: "preserve-3d"
          }}
          onMouseMove={isMotionLight ? undefined : handleMouseMove}
          className="relative perspective-1000 cursor-pointer"
        >
          {/* Main card */}
          <div className="relative p-12 md:p-16 rounded-3xl bg-white/90 border-2 border-slate-200 backdrop-blur-xl overflow-hidden shadow-2xl">
            {/* Glow effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-400 via-purple-400 to-pink-400 opacity-5 blur-3xl" />

            {/* Content */}
            <div className="relative" style={{ transform: "translateZ(50px)" }}>
              {/* Sparkles icon */}
              <motion.div
                initial={{ rotate: -180, scale: 0 }}
                whileInView={{ rotate: 0, scale: 1 }}
                viewport={{ once: true }}
                transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
                whileHover={{ rotate: 180, scale: 1.2 }}
                className="inline-flex items-center justify-center w-16 h-16 mb-8 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-500 shadow-2xl"
                style={{ transform: "translateZ(80px)" }}
              >
                <Sparkles className="w-8 h-8 text-white" />
              </motion.div>

              {/* Title */}
              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.3 }}
                className="text-4xl md:text-5xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 via-cyan-600 to-purple-600"
                style={{ transform: "translateZ(50px)" }}
              >
                Faça Parte da Revolução Educacional
              </motion.h2>

              {/* Description */}
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.4 }}
                className="text-xl text-slate-700 mb-12 max-w-2xl font-medium"
                style={{ transform: "translateZ(30px)" }}
              >
                Junte-se a centenas de educadores que já estão transformando a educação com tecnologia e inteligência artificial.
              </motion.p>

              {/* CTAs */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.5 }}
                className="flex flex-col sm:flex-row gap-4"
                style={{ transform: "translateZ(40px)" }}
              >
                <Link to="/register">
                  <Button
                    size="lg"
                    className="group bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white shadow-2xl shadow-blue-500/50 hover:shadow-purple-500/50 transition-all duration-300"
                  >
                    Começar Agora
                    <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>

                <Link to="/contact">
                  <Button
                    size="lg"
                    variant="outline"
                    className="border-white/20 hover:bg-white/5 text-white backdrop-blur-sm"
                  >
                    <MessageCircle className="mr-2 w-5 h-5" />
                    Falar com Time
                  </Button>
                </Link>
              </motion.div>

              {/* Stats */}
              <motion.div
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.6 }}
                className="mt-12 pt-12 border-t border-white/10 grid grid-cols-2 md:grid-cols-4 gap-8"
                style={{ transform: "translateZ(20px)" }}
              >
                {[
                  { label: "Lançamento", value: "11/11/25" },
                  { label: "Trimestres 2026", value: "Q1-Q4" },
                  { label: "Versões Chatbot", value: "v1-v5+" },
                  { label: "Features Totais", value: "40+" }
                ].map((stat, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.7 + index * 0.1 }}
                    className="text-center"
                  >
                    <div className="text-2xl md:text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600 mb-2">
                      {stat.value}
                    </div>
                    <div className="text-sm text-slate-600 font-medium">{stat.label}</div>
                  </motion.div>
                ))}
              </motion.div>
            </div>

            {/* Decorative elements */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-blue-400 to-purple-400 rounded-full blur-3xl opacity-10 -z-10" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-br from-cyan-400 to-pink-400 rounded-full blur-3xl opacity-10 -z-10" />
          </div>
        </motion.div>

        {/* Bottom text */}
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.8 }}
          className="text-center mt-8 text-slate-600 flex items-center justify-center gap-2 font-medium"
        >
          <Mail className="w-4 h-4" />
          Dúvidas? Entre em contato: <a href="mailto:contato@tamandu.ai" className="text-blue-400 hover:text-blue-300 underline">contato@tamandu.ai</a>
        </motion.p>
      </div>
    </div>
  );
};
