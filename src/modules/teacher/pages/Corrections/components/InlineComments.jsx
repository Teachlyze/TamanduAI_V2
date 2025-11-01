import React, { useState } from 'react';
import { MessageSquare, ThumbsUp, AlertCircle, Lightbulb, X } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Textarea } from '@/shared/components/ui/textarea';
import { Card } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/components/ui/popover';
import { RadioGroup, RadioGroupItem } from '@/shared/components/ui/radio-group';
import { Label } from '@/shared/components/ui/label';

const InlineComments = ({ text, comments = [], onAddComment, onDeleteComment }) => {
  const [selection, setSelection] = useState(null);
  const [showCommentForm, setShowCommentForm] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [commentType, setCommentType] = useState('correction');

  const handleTextSelection = () => {
    const selectedText = window.getSelection();
    const text = selectedText.toString().trim();
    
    if (text.length > 0) {
      const range = selectedText.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      
      setSelection({
        text,
        start: range.startOffset,
        end: range.endOffset,
        rect: {
          top: rect.top + window.scrollY,
          left: rect.left + window.scrollX
        }
      });
      setShowCommentForm(true);
    }
  };

  const handleAddComment = () => {
    if (!selection || !commentText) return;

    const newComment = {
      id: Date.now().toString(),
      text: commentText,
      type: commentType,
      selection: {
        text: selection.text,
        start: selection.start,
        end: selection.end
      },
      createdAt: new Date().toISOString()
    };

    onAddComment(newComment);
    setCommentText('');
    setCommentType('correction');
    setShowCommentForm(false);
    setSelection(null);
  };

  const getCommentIcon = (type) => {
    switch (type) {
      case 'praise':
        return <ThumbsUp className="w-4 h-4 text-green-600" />;
      case 'correction':
        return <AlertCircle className="w-4 h-4 text-red-600" />;
      case 'question':
        return <MessageSquare className="w-4 h-4 text-blue-600" />;
      case 'suggestion':
        return <Lightbulb className="w-4 h-4 text-yellow-600" />;
      default:
        return <MessageSquare className="w-4 h-4" />;
    }
  };

  const getCommentColor = (type) => {
    switch (type) {
      case 'praise':
        return 'bg-green-100 border-green-300';
      case 'correction':
        return 'bg-red-100 border-red-300';
      case 'question':
        return 'bg-blue-100 border-blue-300';
      case 'suggestion':
        return 'bg-yellow-100 border-yellow-300';
      default:
        return 'bg-gray-100 border-gray-300';
    }
  };

  // Renderizar texto com highlights de comentários
  const renderTextWithHighlights = () => {
    if (!text || comments.length === 0) {
      return <p className="whitespace-pre-wrap">{text}</p>;
    }

    // Criar spans com highlights para cada comentário
    // Simplificado - em produção usar biblioteca como draft-js
    return (
      <div className="relative" onMouseUp={handleTextSelection}>
        <p className="whitespace-pre-wrap">{text}</p>
        {comments.map((comment, idx) => (
          <span
            key={comment.id}
            className="absolute bg-yellow-200 opacity-30 pointer-events-none"
            style={{
              // Posicionamento aproximado - melhorar em produção
              top: `${idx * 2}rem`,
              left: 0
            }}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Texto com seleção */}
      <Card className="p-4 bg-gray-50">
        <div className="prose max-w-none">
          {renderTextWithHighlights()}
        </div>

        {/* Botão flutuante para adicionar comentário */}
        {showCommentForm && selection && (
          <Popover open={showCommentForm} onOpenChange={setShowCommentForm}>
            <PopoverTrigger asChild>
              <div 
                className="absolute bg-blue-600 text-white rounded-full p-2 shadow-lg cursor-pointer"
                style={{
                  top: selection.rect?.top - 40,
                  left: selection.rect?.left
                }}
              >
                <MessageSquare className="w-4 h-4" />
              </div>
            </PopoverTrigger>
            <PopoverContent className="w-80">
              <div className="space-y-3">
                <div>
                  <Label className="text-sm font-semibold">Texto selecionado:</Label>
                  <p className="text-sm italic text-gray-600 mt-1">"{selection.text}"</p>
                </div>

                <div>
                  <Label>Tipo de Comentário</Label>
                  <RadioGroup value={commentType} onValueChange={setCommentType} className="mt-2">
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="praise" id="praise" />
                      <Label htmlFor="praise" className="cursor-pointer flex items-center gap-2">
                        <ThumbsUp className="w-4 h-4 text-green-600" />
                        Elogio
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="correction" id="correction" />
                      <Label htmlFor="correction" className="cursor-pointer flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-red-600" />
                        Correção
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="question" id="question" />
                      <Label htmlFor="question" className="cursor-pointer flex items-center gap-2">
                        <MessageSquare className="w-4 h-4 text-blue-600" />
                        Dúvida
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="suggestion" id="suggestion" />
                      <Label htmlFor="suggestion" className="cursor-pointer flex items-center gap-2">
                        <Lightbulb className="w-4 h-4 text-yellow-600" />
                        Sugestão
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                <div>
                  <Label>Comentário</Label>
                  <Textarea
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="Digite seu comentário..."
                    className="mt-1"
                    rows={3}
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" size="sm" onClick={() => setShowCommentForm(false)}>
                    Cancelar
                  </Button>
                  <Button size="sm" onClick={handleAddComment} disabled={!commentText}>
                    Adicionar
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        )}
      </Card>

      {/* Lista de Comentários */}
      {comments.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-semibold text-sm">Comentários ({comments.length})</h4>
          {comments.map((comment, idx) => (
            <Card key={comment.id} className={`p-3 ${getCommentColor(comment.type)} border-l-4`}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    {getCommentIcon(comment.type)}
                    <Badge variant="outline" className="text-xs">
                      #{idx + 1}
                    </Badge>
                    <span className="text-xs text-gray-500 italic">
                      "{comment.selection.text}"
                    </span>
                  </div>
                  <p className="text-sm">{comment.text}</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => onDeleteComment(comment.id)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {comments.length === 0 && (
        <p className="text-sm text-gray-500 text-center py-4">
          Selecione um trecho do texto acima para adicionar um comentário
        </p>
      )}
    </div>
  );
};

export default InlineComments;
