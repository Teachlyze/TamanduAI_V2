import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog';
import { Card } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { ScrollArea } from '@/shared/components/ui/scroll-area';
import { AlertTriangle, Users } from 'lucide-react';
import { getSubmissionDetails } from '@/shared/services/correctionService';

const CompareSubmissionsModal = ({ submissionIds, onClose }) => {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [similarityScore, setSimilarityScore] = useState(null);

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
        const similarity = calculateSimilarity(subs[0].content, subs[1].content);
        setSimilarityScore(similarity);
      }
    } catch (error) {
      console.error('Erro ao carregar submissões:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateSimilarity = (text1, text2) => {
    // Implementação simplificada - em produção usar Levenshtein ou similar
    const str1 = typeof text1 === 'string' ? text1 : text1?.text || '';
    const str2 = typeof text2 === 'string' ? text2 : text2?.text || '';
    
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
                    {typeof submission.content === 'string' 
                      ? submission.content 
                      : submission.content?.text || 'Sem conteúdo'}
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
                alert('Funcionalidade de marcar plágio será implementada');
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
