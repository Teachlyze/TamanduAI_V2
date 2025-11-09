import React, { useRef } from 'react';
import { motion, useScroll, useTransform, useSpring, useMotionValue } from 'framer-motion';
import { Rocket, Sparkles, TrendingUp } from 'lucide-react';

export const RoadmapHero = () => {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"]
  });

  const y = useTransform(scrollYProgress, [0, 1], ["0%", "50%"]);
  const opacity = useTransform(scrollYProgress, [0, 1], [1, 0]);

  // Mouse tracking para efeito 3D nos cards
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

  const stats = [
    { icon: Rocket, label: "Lançamento MVP", value: "11/11/2025", color: "from-emerald-500 to-teal-500" },
    { icon: TrendingUp, label: "Trimestres 2026", value: "Q1 - Q4", color: "from-blue-500 to-cyan-500" },
    { icon: Sparkles, label: "Versões Chatbot", value: "v1.0 - v5.0", color: "from-purple-500 to-pink-500" }
  ];

  return (
    <div ref={ref} className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-white via-blue-50 to-cyan-50">
      {/* Animated background */}
      <div className="absolute inset-0 bg-grid-white opacity-30" />
      
      {/* Radial gradient overlay */}
      <div className="absolute inset-0 bg-gradient-radial from-transparent via-blue-50/30 to-white/50" />
      
      {/* Animated gradient orbs */}
      <motion.div
        className="absolute top-20 right-20 w-96 h-96 bg-gradient-to-br from-blue-400 to-cyan-400 rounded-full filter blur-3xl opacity-20"
        animate={{
          scale: [1, 1.2, 1],
          rotate: [0, 90, 0]
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "linear"
        }}
      />
      <motion.div
        className="absolute bottom-20 left-20 w-96 h-96 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full filter blur-3xl opacity-20"
        animate={{
          scale: [1, 1.3, 1],
          rotate: [0, -90, 0]
        }}
        transition={{
          duration: 25,
          repeat: Infinity,
          ease: "linear"
        }}
      />

      {/* Content with parallax */}
      <motion.div 
        style={{ y, opacity }}
        className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-32"
      >
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="flex justify-center mb-8"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/30 backdrop-blur-sm shadow-lg">
            <Sparkles className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-700">Lançamento 11/11/2025 • Roadmap 2026</span>
          </div>
        </motion.div>

        {/* Title */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-5xl md:text-7xl font-bold text-center mb-6 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 via-cyan-600 to-purple-600"
        >
          Nossa Jornada
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="text-xl md:text-2xl text-slate-700 text-center max-w-3xl mx-auto mb-16"
        >
          Do MVP à plataforma educacional mais completa e inovadora do Brasil
        </motion.p>

        {/* Stats Cards com 3D effect */}
        <div 
          className="grid md:grid-cols-3 gap-6 perspective-1000"
          onMouseMove={handleMouseMove}
        >
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, rotateY: -90, scale: 0.8 }}
                animate={{ opacity: 1, rotateY: 0, scale: 1 }}
                transition={{ 
                  duration: 0.6, 
                  delay: 0.6 + index * 0.1,
                  type: "spring",
                  stiffness: 100
                }}
                whileHover={{ scale: 1.05, z: 50 }}
                style={{
                  rotateX,
                  rotateY,
                  transformStyle: "preserve-3d"
                }}
                className="relative group"
              >
                <div className={`relative p-6 rounded-2xl bg-white/80 border-2 border-slate-200 backdrop-blur-xl overflow-hidden shadow-xl hover:shadow-2xl transition-shadow duration-300`}>
                  {/* Glow effect */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${stat.color} opacity-0 group-hover:opacity-10 transition-opacity duration-500 blur-xl`} />
                  
                  {/* Content */}
                  <div className="relative" style={{ transform: "translateZ(50px)" }}>
                    <motion.div 
                      className="mb-4"
                      whileHover={{ rotate: 360, scale: 1.2 }}
                      transition={{ duration: 0.6 }}
                      style={{ transform: "translateZ(50px)" }}
                    >
                      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center shadow-lg`}>
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                    </motion.div>
                    
                    <div style={{ transform: "translateZ(30px)" }}>
                      <h3 className="text-3xl font-bold text-slate-900 mb-2">{stat.value}</h3>
                      <p className="text-slate-600 font-medium">{stat.label}</p>
                    </div>
                  </div>

                  {/* Decorative gradient */}
                  <div className={`absolute -bottom-12 -right-12 w-32 h-32 bg-gradient-to-br ${stat.color} rounded-full blur-3xl opacity-10 group-hover:opacity-20 transition-opacity duration-500`} style={{ transform: "translateZ(20px)" }} />
                </div>
              </motion.div>
            );
          })}
        </div>
      </motion.div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2, duration: 0.6 }}
        className="absolute bottom-8 left-1/2 transform -translate-x-1/2"
      >
        <motion.div
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="w-6 h-10 rounded-full border-2 border-slate-400 flex items-start justify-center p-2 shadow-md bg-white/50"
        >
          <motion.div 
            animate={{ height: ["20%", "80%", "20%"] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="w-1 bg-gradient-to-b from-blue-600 to-purple-600 rounded-full"
          />
        </motion.div>
      </motion.div>
    </div>
  );
};
