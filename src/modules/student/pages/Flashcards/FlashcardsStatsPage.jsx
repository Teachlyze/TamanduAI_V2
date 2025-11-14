/**
 * Flashcards Statistics Page
 * Advanced analytics with charts and insights
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Calendar,
  Clock,
  Target,
  Award,
  Zap,
  Brain,
} from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Button } from '@/shared/components/ui/button';
import { Card } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { useAuth } from '@/shared/hooks/useAuth';
import { useToast } from '@/shared/components/ui/use-toast';
import LoadingSpinner from '@/shared/components/ui/LoadingSpinner';
import { DashboardHeader, StatsCard } from '@/shared/design';
import flashcardService from '@/shared/services/flashcardService';
import { calculateStudyStats, predictWorkload } from '@/shared/services/spacedRepetition';
import { logger } from '@/shared/utils/logger';

const COLORS = {
  primary: '#8B5CF6',
  secondary: '#EC4899',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#3B82F6',
};

const FlashcardsStatsPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('week'); // today, week, month, all
  const [stats, setStats] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [decks, setDecks] = useState([]);
  const [workloadPrediction, setWorkloadPrediction] = useState([]);

  useEffect(() => {
    if (user?.id) {
      loadStatistics();
    }
  }, [user, period]);

  const loadStatistics = async () => {
    try {
      setLoading(true);

      // Load review history
      const fromDate = getFromDate(period);
      const { data: reviewData, error: reviewError } = await flashcardService.getReviewHistory(
        user.id,
        { from_date: fromDate, limit: 1000 }
      );
      if (reviewError) throw reviewError;
      setReviews(reviewData || []);

      // Calculate stats
      const calculatedStats = calculateStudyStats(reviewData || [], period);
      setStats(calculatedStats);

      // Load decks for prediction
      const { data: deckData } = await flashcardService.getDecks(user.id);
      setDecks(deckData || []);

      // Get all card stats for prediction
      const allCards = [];
      for (const deck of deckData || []) {
        const { data: cards } = await flashcardService.getCardsInDeck(deck.id);
        if (cards) {
          cards.forEach(card => {
            if (card.card_stats?.[0]) {
              allCards.push(card.card_stats[0]);
            }
          });
        }
      }

      // Predict workload
      const prediction = predictWorkload(allCards, 7);
      setWorkloadPrediction(prediction);
    } catch (error) {
      logger.error('Error loading statistics:', error);
      toast({
        title: 'Erro ao carregar',
        description: 'Não foi possível carregar as estatísticas.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getFromDate = (period) => {
    const now = new Date();
    switch (period) {
      case 'today':
        now.setHours(0, 0, 0, 0);
        return now.toISOString();
      case 'week':
        now.setDate(now.getDate() - 7);
        return now.toISOString();
      case 'month':
        now.setDate(now.getDate() - 30);
        return now.toISOString();
      default:
        return new Date(0).toISOString();
    }
  };

  // Prepare data for status distribution (Pie chart)
  const getStatusDistribution = () => {
    const distribution = { new: 0, learning: 0, young: 0, mature: 0 };
    
    decks.forEach(deck => {
      const deckStats = deck.deck_stats?.[0];
      if (deckStats) {
        distribution.new += deckStats.new_cards || 0;
        distribution.learning += deckStats.learning_cards || 0;
        distribution.young += deckStats.young_cards || 0;
        distribution.mature += deckStats.mature_cards || 0;
      }
    });

    return [
      { name: 'Novos', value: distribution.new, color: COLORS.info },
      { name: 'Aprendendo', value: distribution.learning, color: COLORS.warning },
      { name: 'Jovens', value: distribution.young, color: COLORS.success },
      { name: 'Maduros', value: distribution.mature, color: COLORS.primary },
    ].filter(item => item.value > 0);
  };

  // Format time in minutes
  const formatTime = (ms) => {
    const minutes = Math.floor(ms / 60000);
    if (minutes < 60) return `${minutes}min`;
    const hours = Math.floor(minutes / 60);
    const remainingMins = minutes % 60;
    return `${hours}h ${remainingMins}min`;
  };

  if (loading && !stats) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" text="Carregando estatísticas..." />
      </div>
    );
  }

  const statusDistribution = getStatusDistribution();
  const totalCards = statusDistribution.reduce((sum, item) => sum + item.value, 0);
  const hasWorkload = workloadPrediction?.some(
    (d) => (d.new_cards || 0) > 0 || (d.review_cards || 0) > 0
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header com botão voltar no topo esquerdo */}
        <div className="mb-6">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/students/flashcards')}
            className="mb-4 hover:bg-slate-200 dark:hover:bg-slate-800"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
          <DashboardHeader
            title="Estatísticas de Estudo"
            subtitle="Análise detalhada do seu progresso com flashcards"
          />
        </div>

        {/* Period Selector */}
        <div className="flex gap-2 mb-6">
          {[
            { value: 'today', label: 'Hoje' },
            { value: 'week', label: 'Semana' },
            { value: 'month', label: 'Mês' },
            { value: 'all', label: 'Tudo' },
          ].map((p) => (
            <Button
              key={p.value}
              variant={period === p.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => setPeriod(p.value)}
            >
              {p.label}
            </Button>
          ))}
        </div>

        {/* Main Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="p-6">
            <div className="flex flex-col">
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">Total de Revisões</p>
              <p className="text-3xl font-bold text-slate-900 dark:text-white">{stats?.total_reviews || 0}</p>
            </div>
          </Card>
          <Card className="p-6">
            <div className="flex flex-col">
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">Taxa de Retenção</p>
              <p className="text-3xl font-bold text-slate-900 dark:text-white">{stats?.retention_rate || 0}%</p>
            </div>
          </Card>
          <Card className="p-6">
            <div className="flex flex-col">
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">Tempo de Estudo</p>
              <p className="text-3xl font-bold text-slate-900 dark:text-white">{formatTime(stats?.total_time_ms || 0)}</p>
            </div>
          </Card>
          <Card className="p-6">
            <div className="flex flex-col">
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">Tempo Médio/Card</p>
              <p className="text-3xl font-bold text-slate-900 dark:text-white">{Math.round((stats?.average_time_ms || 0) / 1000)}s</p>
            </div>
          </Card>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Reviews Over Time */}
          <Card className="p-6">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">
              Revisões ao Longo do Tempo
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={stats?.chart_data || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="reviews"
                  stroke={COLORS.primary}
                  strokeWidth={2}
                  name="Revisões"
                />
                <Line
                  type="monotone"
                  dataKey="correct"
                  stroke={COLORS.success}
                  strokeWidth={2}
                  name="Corretas"
                />
              </LineChart>
            </ResponsiveContainer>
          </Card>

          {/* Status Distribution */}
          <Card className="p-6">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">
              Distribuição de Cards
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={statusDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => `${entry.name}: ${entry.value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {statusDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex justify-center gap-4 mt-4">
              {statusDistribution.map((item, index) => (
                <div key={index} className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-sm text-slate-600 dark:text-slate-400">
                    {item.name} ({item.value})
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Workload Prediction */}
        <Card className="p-6 mb-6">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">
            Previsão de Carga (Próximos 7 Dias)
          </h3>
          {hasWorkload ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={workloadPrediction}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="new_cards" fill={COLORS.info} name="Novos" />
                <Bar dataKey="review_cards" fill={COLORS.success} name="Revisões" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-sm text-slate-500 dark:text-slate-400">
              Nenhuma revisão prevista nos próximos 7 dias. Estude alguns cards para ver a previsão aqui.
            </div>
          )}
        </Card>

        {/* Insights */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Best Day */}
          <Card className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border-green-200 dark:border-green-800">
            <h4 className="font-bold text-green-900 dark:text-green-100 mb-2">
              Melhor Dia
            </h4>
            <p className="text-2xl font-bold text-green-700 dark:text-green-300 mb-1">
              {stats?.chart_data?.reduce((max, day) => 
                day.reviews > (max?.reviews || 0) ? day : max, {}
              )?.date || '-'}
            </p>
            <p className="text-sm text-green-600 dark:text-green-400">
              {stats?.chart_data?.reduce((max, day) => 
                day.reviews > (max?.reviews || 0) ? day : max, {}
              )?.reviews || 0} revisões
            </p>
          </Card>

          {/* Average Performance */}
          <Card className="p-6 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/20 dark:to-cyan-950/20 border-blue-200 dark:border-blue-800">
            <h4 className="font-bold text-blue-900 dark:text-blue-100 mb-2">
              Desempenho Médio
            </h4>
            <p className="text-2xl font-bold text-blue-700 dark:text-blue-300 mb-1">
              {stats?.retention_rate || 0}%
            </p>
            <p className="text-sm text-blue-600 dark:text-blue-400">
              {stats?.retention_rate >= 80 ? 'Excelente!' : stats?.retention_rate >= 60 ? 'Bom!' : 'Continue praticando'}
            </p>
          </Card>

          {/* Total Cards */}
          <Card className="p-6 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 border-purple-200 dark:border-purple-800">
            <h4 className="font-bold text-purple-900 dark:text-purple-100 mb-2">
              Total de Cards
            </h4>
            <p className="text-2xl font-bold text-purple-700 dark:text-purple-300 mb-1">
              {totalCards}
            </p>
            <p className="text-sm text-purple-600 dark:text-purple-400">
              Distribuídos em {decks.length} deck{decks.length !== 1 ? 's' : ''}
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default FlashcardsStatsPage;
