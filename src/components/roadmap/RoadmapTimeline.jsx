import React, { useState } from 'react';
import { motion, useScroll, useSpring } from 'framer-motion';
import { Check, Clock, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
import { roadmapPhases, phaseColors, statusColors } from '@/data/roadmapData';

export const RoadmapTimeline = () => {
  const [expandedPhases, setExpandedPhases] = useState({});
  
  const { scrollYProgress } = useScroll();
  const scaleY = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001
  });

  const togglePhase = (phaseId) => {
    setExpandedPhases(prev => ({
      ...prev,
      [phaseId]: !prev[phaseId]
    }));
  };

  const getStatusIcon = (status) => {
    if (status === 'completed') return Check;
    if (status === 'in-progress') return Clock;
    return Sparkles;
  };

  return (
    <div className="relative py-32 bg-gradient-to-b from-slate-50 via-white to-blue-50">
      {/* Background effects */}
      <div className="absolute inset-0 bg-grid-white opacity-20" />
      
      {/* Decorative elements */}
      <div className="absolute top-20 left-10 w-72 h-72 bg-gradient-to-br from-blue-400 to-cyan-400 rounded-full filter blur-3xl opacity-10 animate-pulse" />
      <div className="absolute bottom-20 right-10 w-72 h-72 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full filter blur-3xl opacity-10 animate-pulse" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-20"
        >
          <motion.div
            initial={{ scale: 0 }}
            whileInView={{ scale: 1 }}
            viewport={{ once: true }}
            transition={{ type: "spring", stiffness: 200 }}
            className="inline-block mb-4"
          >
            <div className="px-4 py-2 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 text-white text-sm font-semibold shadow-lg">
              📅 Roadmap 2026
            </div>
          </motion.div>
          <h2 className="text-4xl md:text-5xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600">
            Roadmap de Desenvolvimento 2026
          </h2>
          <p className="text-xl text-slate-700 max-w-3xl mx-auto">
            De gestão escolar e finanças até portal dos pais, com evolução contínua do chatbot (v1.0 → v6.0+)
          </p>
        </motion.div>

        {/* Timeline */}
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-8 md:left-1/2 top-0 bottom-0 w-1 bg-gradient-to-b from-blue-300 via-purple-300 to-pink-300 transform md:-translate-x-1/2 rounded-full shadow-md">
            <motion.div
              style={{ scaleY }}
              className="absolute inset-0 bg-gradient-to-b from-blue-600 via-cyan-600 to-purple-600 origin-top rounded-full"
            />
          </div>

          {/* Phases */}
          <div className="space-y-24">
            {roadmapPhases.map((phase, phaseIndex) => {
              const StatusIcon = getStatusIcon(phase.status);
              const colors = phaseColors[phase.color];
              const PhaseIcon = phase.icon;

              return (
                <motion.div
                  key={phase.id}
                  initial={{ opacity: 0, x: phaseIndex % 2 === 0 ? -100 : 100 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: "-100px" }}
                  transition={{ duration: 0.6, delay: phaseIndex * 0.1 }}
                  className={`relative flex items-center ${
                    phaseIndex % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'
                  } flex-col md:gap-16`}
                >
                  {/* Timeline dot */}
                  <div className="absolute left-8 md:left-1/2 transform md:-translate-x-1/2 -translate-y-1/2 top-0 z-10">
                    <motion.div
                      initial={{ scale: 0 }}
                      whileInView={{ scale: 1 }}
                      viewport={{ once: true }}
                      transition={{ type: "spring", stiffness: 200, delay: phaseIndex * 0.1 + 0.3 }}
                      className={`relative w-20 h-20 rounded-full bg-gradient-to-br ${colors.gradient} flex items-center justify-center shadow-2xl ${colors.glow} border-4 border-white`}
                    >
                      <PhaseIcon className="w-10 h-10 text-white" />
                      
                      {/* Pulse animation */}
                      {phase.status === 'in-progress' && (
                        <motion.div
                          animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
                          transition={{ duration: 2, repeat: Infinity }}
                          className={`absolute inset-0 rounded-full bg-gradient-to-br ${colors.gradient}`}
                        />
                      )}
                    </motion.div>
                  </div>

                  {/* Content card */}
                  <div className={`w-full md:w-5/12 ml-24 md:ml-0 ${phaseIndex % 2 === 0 ? 'md:text-right' : 'md:text-left'}`}>
                    <motion.div
                      whileHover={{ scale: 1.02, y: -5 }}
                      transition={{ type: "spring", stiffness: 300 }}
                      className={`relative p-8 rounded-2xl border-2 ${colors.border} bg-white shadow-xl hover:shadow-2xl overflow-hidden group`}
                    >
                      {/* Glow effect on hover */}
                      <div className={`absolute inset-0 bg-gradient-to-br ${colors.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-500`} />

                      {/* Header */}
                      <div className={`flex items-center gap-3 mb-4 ${phaseIndex % 2 === 0 ? 'md:flex-row-reverse' : ''}`}>
                        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border-2 ${
                          phase.status === 'completed' ? 'bg-emerald-50 border-emerald-400' : 
                          phase.status === 'in-progress' ? 'bg-blue-50 border-blue-400' : 
                          'bg-slate-50 border-slate-300'
                        } shadow-sm`}>
                          <StatusIcon className={`w-4 h-4 ${
                            phase.status === 'completed' ? 'text-emerald-600' : 
                            phase.status === 'in-progress' ? 'text-blue-600' : 
                            'text-slate-500'
                          }`} />
                          <span className={`text-xs font-bold ${
                            phase.status === 'completed' ? 'text-emerald-700' : 
                            phase.status === 'in-progress' ? 'text-blue-700' : 
                            'text-slate-600'
                          }`}>
                            {phase.status === 'completed' ? '✓ Concluído' : phase.status === 'in-progress' ? '⏳ Próximo' : '📋 Planejado'}
                          </span>
                        </div>
                        <span className="text-sm text-slate-600 font-semibold">{phase.timeline}</span>
                      </div>

                      {/* Title */}
                      <h3 className="text-2xl md:text-3xl font-bold text-slate-900 mb-2">
                        {phase.title}
                      </h3>
                      <p className="text-lg text-slate-600 font-medium mb-6">{phase.subtitle}</p>

                      {/* Progress bar */}
                      <div className="mb-6">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm text-slate-600 font-medium">Progresso</span>
                          <span className="text-sm font-bold text-slate-900">{phase.progress}%</span>
                        </div>
                        <div className="h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                          <motion.div
                            initial={{ width: 0 }}
                            whileInView={{ width: `${phase.progress}%` }}
                            viewport={{ once: true }}
                            transition={{ duration: 1, delay: phaseIndex * 0.1 + 0.5 }}
                            className={`h-full bg-gradient-to-r ${colors.gradient} shadow-lg`}
                          />
                        </div>
                      </div>

                      {/* Features */}
                      <div className="space-y-3">
                        {/* Initial features with animation */}
                        {phase.features.slice(0, 4).map((feature, idx) => {
                          const FeatureIcon = feature.icon;
                          return (
                            <motion.div
                              key={idx}
                              initial={{ opacity: 0, x: phaseIndex % 2 === 0 ? 20 : -20 }}
                              whileInView={{ opacity: 1, x: 0 }}
                              viewport={{ once: true }}
                              transition={{ delay: phaseIndex * 0.1 + idx * 0.05 + 0.6 }}
                              className={`flex items-start gap-3 ${phaseIndex % 2 === 0 ? 'md:flex-row-reverse md:text-right' : ''}`}
                            >
                              <div className={`flex-shrink-0 w-10 h-10 rounded-lg bg-gradient-to-br ${colors.gradient} flex items-center justify-center shadow-md`}>
                                <FeatureIcon className="w-5 h-5 text-white" />
                              </div>
                              <div className="flex-1">
                                <h4 className="text-sm font-semibold text-slate-900 mb-1">{feature.title}</h4>
                                <p className="text-xs text-slate-600">{feature.description}</p>
                              </div>
                            </motion.div>
                          );
                        })}
                        
                        {/* Expanded features without animation (instant) */}
                        {expandedPhases[phase.id] && phase.features.slice(4).map((feature, idx) => {
                          const FeatureIcon = feature.icon;
                          return (
                            <motion.div
                              key={idx + 4}
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              transition={{ duration: 0.15, ease: 'easeOut' }}
                              className={`flex items-start gap-3 ${phaseIndex % 2 === 0 ? 'md:flex-row-reverse md:text-right' : ''}`}
                            >
                              <div className={`flex-shrink-0 w-10 h-10 rounded-lg bg-gradient-to-br ${colors.gradient} flex items-center justify-center shadow-md`}>
                                <FeatureIcon className="w-5 h-5 text-white" />
                              </div>
                              <div className="flex-1">
                                <h4 className="text-sm font-semibold text-slate-900 mb-1">{feature.title}</h4>
                                <p className="text-xs text-slate-600">{feature.description}</p>
                              </div>
                            </motion.div>
                          );
                        })}
                        
                        {/* Expand/Collapse Button */}
                        {phase.features.length > 4 && (
                          <motion.button
                            onClick={() => togglePhase(phase.id)}
                            whileHover={{ scale: 1.05, y: -2 }}
                            whileTap={{ scale: 0.95 }}
                            className={`relative w-full mt-6 px-6 py-3 rounded-xl border-2 ${colors.border} bg-gradient-to-r ${colors.gradient} hover:shadow-lg transition-all duration-300 flex items-center justify-center gap-2 text-sm font-bold text-white shadow-md overflow-hidden group`}
                          >
                            <div className="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition-colors duration-300" />
                            {expandedPhases[phase.id] ? (
                              <>
                                <ChevronUp className="w-5 h-5" />
                                Mostrar menos
                              </>
                            ) : (
                              <>
                                <ChevronDown className="w-5 h-5" />
                                Ver +{phase.features.length - 4} funcionalidades
                              </>
                            )}
                          </motion.button>
                        )}
                      </div>
                    </motion.div>
                  </div>

                  {/* Spacer for desktop */}
                  <div className="hidden md:block w-5/12" />
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
