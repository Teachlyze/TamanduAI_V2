import { logger } from '@/shared/utils/logger';
import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog';
import { Card } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { ScrollArea } from '@/shared/components/ui/scroll-area';
import { AlertTriangle, Users } from 'lucide-react';
import { getSubmissionDetails } from '@/shared/services/correctionService';
import { useToast } from '@/shared/components/ui/use-toast';

const CompareSubmissionsModal = ({ submissionIds, onClose }) => {
  const { toast } = useToast();
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [similarityScore, setSimilarityScore] = useState(null);

  const extractSubmissionText = (submission) => {
    if (!submission) return '';

    const content = submission.content;
    const activity = submission.activity;

    if (!content) return '';

    if (typeof content === 'string') {
      try {
        const parsed = JSON.parse(content);
        if (parsed && typeof parsed === 'object') {
          if (typeof parsed.answer === 'string' && parsed.answer.trim()) {
            return parsed.answer;
          }

          if (typeof parsed.text === 'string' && parsed.text.trim()) {
            return parsed.text;
          }

          const questions = activity?.content?.questions || [];
          const fromContent =
            parsed.selectedAnswers ||
            parsed.answers ||
            (questions.length > 0 ? parsed : null);

          if (fromContent && typeof fromContent === 'object' && questions.length > 0) {
            const parts = [];

            questions.forEach((question, index) => {
              const questionKey = question.id ?? index;
              const rawValue =
                fromContent[questionKey] ??
                fromContent[String(questionKey)] ??
                fromContent[`question_${index}`];

              if (rawValue === undefined || rawValue === null || rawValue === '') return;

              let label = null;

              if (question.alternatives && question.alternatives.length > 0) {
                const normalized = String(rawValue);

                const byId = question.alternatives.find((alt) => String(alt.id) === normalized);
                const byLetter = question.alternatives.find((alt) => String(alt.letter) === normalized);
                const byText = question.alternatives.find((alt) => alt.text === rawValue);

                const match = byId || byLetter || byText;
                label = match?.text || normalized;
              } else {
                label = typeof rawValue === 'string' ? rawValue : JSON.stringify(rawValue);
              }

              const title = question.text || question.question || `Questão ${index + 1}`;
              parts.push(`${title}: ${label}`);
            });

            if (parts.length > 0) {
              return parts.join('\n');
            }
          }
        }

        return content;
      } catch (e) {
        return content;
      }
    }

    if (typeof content === 'object') {
      if (typeof content.answer === 'string' && content.answer.trim()) {
        return content.answer;
      }

      if (typeof content.text === 'string' && content.text.trim()) {
        return content.text;
      }

      const questions = activity?.content?.questions || [];
      const fromContent =
        content.selectedAnswers ||
        content.answers ||
        (questions.length > 0 ? content : null);

      if (fromContent && typeof fromContent === 'object' && questions.length > 0) {
        const parts = [];

        questions.forEach((question, index) => {
          const questionKey = question.id ?? index;
          const rawValue =
            fromContent[questionKey] ??
            fromContent[String(questionKey)] ??
            fromContent[`question_${index}`];

          if (rawValue === undefined || rawValue === null || rawValue === '') return;

          let label = null;

          if (question.alternatives && question.alternatives.length > 0) {
            const normalized = String(rawValue);

            const byId = question.alternatives.find((alt) => String(alt.id) === normalized);
            const byLetter = question.alternatives.find((alt) => String(alt.letter) === normalized);
            const byText = question.alternatives.find((alt) => alt.text === rawValue);

            const match = byId || byLetter || byText;
            label = match?.text || normalized;
          } else {
            label = typeof rawValue === 'string' ? rawValue : JSON.stringify(rawValue);
          }

          const title = question.text || question.question || `Questão ${index + 1}`;
          parts.push(`${title}: ${label}`);
        });

        if (parts.length > 0) {
          return parts.join('\n');
        }
      }

      try {
        return JSON.stringify(content);
      } catch (e) {
        return '';
      }
    }

    return '';
  };

  useEffect(() => {
    loadSubmissions();
  }, [submissionIds]);

  const loadSubmissions = async () => {
    setLoading(true);
    try {
      const promises = submissionIds.map(id => getSubmissionDetails(id));
      const results = await Promise.all(promises);
      const subs = results.map(r => r.data).filter(Boolean);
      setSubmissions(subs);
      
      // Calcular similaridade simples (em produção usar algoritmo real)
      if (subs.length === 2) {
        const similarity = calculateSimilarity(subs[0], subs[1]);
        setSimilarityScore(similarity);
      }
    } catch (error) {
      logger.error('Erro ao carregar submissões:', error)
    } finally {
      setLoading(false);
    }
  };

  const calculateSimilarity = (submission1, submission2) => {
    // Implementação simplificada - em produção usar Levenshtein ou similar
    const str1 = extractSubmissionText(submission1) || '';
    const str2 = extractSubmissionText(submission2) || '';
    
    const words1 = str1.toLowerCase().split(/\s+/);
    const words2 = str2.toLowerCase().split(/\s+/);
    
    const commonWords = words1.filter(word => words2.includes(word));
    const similarity = (commonWords.length / Math.max(words1.length, words2.length)) * 100;
    
    return Math.round(similarity);
  };

  const getSimilarityColor = (score) => {
    if (score >= 80) return 'text-red-600 bg-red-100';
    if (score >= 60) return 'text-yellow-600 bg-yellow-100';
    return 'text-green-600 bg-green-100';
  };

  if (loading) {
    return (
      <Dialog open={true} onOpenChange={onClose}>
        <DialogContent className="max-w-6xl h-[80vh]">
          <div className="flex items-center justify-center h-full">
            <p>Carregando comparação...</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Comparação de Submissões
          </DialogTitle>
        </DialogHeader>

        {/* Score de Similaridade */}
        {similarityScore !== null && (
          <Card className={`p-4 ${getSimilarityColor(similarityScore)}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                <span className="font-semibold">Similaridade Detectada:</span>
              </div>
              <div className="text-2xl font-bold">
                {similarityScore}%
              </div>
            </div>
            {similarityScore >= 60 && (
              <p className="text-sm mt-2">
                Alta similaridade detectada entre as submissões. Recomenda-se revisão manual detalhada.
              </p>
            )}
          </Card>
        )}

        {/* Comparação Lado a Lado */}
        <div className="grid grid-cols-2 gap-4 flex-1 overflow-hidden">
          {submissions.map((submission, idx) => (
            <Card key={submission.id} className="p-4 flex flex-col">
              {/* Header */}
              <div className="mb-4">
                <h3 className="font-semibold text-lg">{submission.student?.full_name}</h3>
                <p className="text-sm text-gray-600">{submission.activity?.title}</p>
                <div className="flex gap-2 mt-2">
                  {submission.grade !== null && (
                    <Badge>Nota: {submission.grade}</Badge>
                  )}
                  <Badge variant="outline">
                    {submission.status === 'graded' ? 'Corrigida' : 'Pendente'}
                  </Badge>
                </div>
              </div>

              {/* Conteúdo */}
              <ScrollArea className="flex-1">
                <div className="pr-4">
                  <h4 className="font-semibold mb-2">Submissão:</h4>
                  <div className="bg-gray-50 p-3 rounded whitespace-pre-wrap text-sm">
                    {extractSubmissionText(submission) || 'Sem conteúdo'}
                  </div>

                  {submission.feedback && (
                    <>
                      <h4 className="font-semibold mt-4 mb-2">Feedback:</h4>
                      <div className="bg-blue-50 p-3 rounded text-sm">
                        {submission.feedback}
                      </div>
                    </>
                  )}
                </div>
              </ScrollArea>
            </Card>
          ))}
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center pt-4 border-t">
          <div className="text-sm text-gray-600">
            Comparando {submissions.length} submissões
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Fechar
            </Button>
            <Button 
              variant="destructive"
              disabled={similarityScore < 60}
              onClick={() => {
                // Marcar para revisão ou ação de plágio
                toast({ 
                  title: '🚧 Em desenvolvimento', 
                  description: 'Funcionalidade de marcar plágio será implementada em breve.' 
                });
              }}
            >
              Marcar como Suspeita
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CompareSubmissionsModal;
