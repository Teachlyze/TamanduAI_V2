/**
 * Advanced Card Types Components
 * Supports Cloze, Multiple Choice, Match, and Order card types
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Check, X, ArrowRight, GripVertical } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Card } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/shared/components/ui/radio-group';

// ============================================================================
// CLOZE CARD EDITOR
// ============================================================================

export const ClozeCardEditor = ({ value, onChange }) => {
  const [text, setText] = useState(value?.text || '');
  const [clozes, setClozes] = useState(value?.clozes || []);

  useEffect(() => {
    onChange({ text, clozes });
  }, [text, clozes]);

  const handleAddCloze = () => {
    const selectedText = window.getSelection().toString();
    if (!selectedText) {
      alert('Selecione o texto que deseja ocultar');
      return;
    }

    const clozeIndex = clozes.length + 1;
    const clozeText = `{{c${clozeIndex}::${selectedText}}}`;
    const newText = text.replace(selectedText, clozeText);

    setText(newText);
    setClozes([...clozes, { index: clozeIndex, text: selectedText }]);
  };

  const handleRemoveCloze = (index) => {
    const cloze = clozes.find(c => c.index === index);
    if (!cloze) return;

    const clozeText = `{{c${index}::${cloze.text}}}`;
    const newText = text.replace(clozeText, cloze.text);

    setText(newText);
    setClozes(clozes.filter(c => c.index !== index));
  };

  return (
    <div className="space-y-4">
      <div>
        <Label>Texto com Lacunas (Cloze)</Label>
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
          Selecione o texto e clique em "Adicionar Lacuna" para criar uma oclusão
        </p>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="w-full p-3 border rounded-lg min-h-[120px] font-mono text-sm"
          placeholder="Digite o texto completo. Ex: A capital do Brasil é Brasília."
        />
        <Button
          type="button"
          onClick={handleAddCloze}
          className="mt-2"
          size="sm"
          variant="outline"
        >
          Adicionar Lacuna
        </Button>
      </div>

      {clozes.length > 0 && (
        <div>
          <Label>Lacunas Criadas</Label>
          <div className="space-y-2 mt-2">
            {clozes.map((cloze) => (
              <div
                key={cloze.index}
                className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-900 rounded"
              >
                <span className="text-sm">
                  <Badge variant="secondary" className="mr-2">c{cloze.index}</Badge>
                  {cloze.text}
                </span>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => handleRemoveCloze(cloze.index)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      <Card className="p-4 bg-blue-50 dark:bg-blue-950/30">
        <Label className="text-sm font-semibold mb-2 block">Preview</Label>
        <p className="text-sm">{text}</p>
      </Card>
    </div>
  );
};

// ============================================================================
// MULTIPLE CHOICE CARD EDITOR
// ============================================================================

export const MultipleChoiceCardEditor = ({ value, onChange }) => {
  const [question, setQuestion] = useState(value?.question || '');
  const [options, setOptions] = useState(value?.options || ['', '', '', '']);
  const [correctIndex, setCorrectIndex] = useState(value?.correctIndex || 0);

  useEffect(() => {
    onChange({ question, options, correctIndex });
  }, [question, options, correctIndex]);

  const handleOptionChange = (index, text) => {
    const newOptions = [...options];
    newOptions[index] = text;
    setOptions(newOptions);
  };

  const handleAddOption = () => {
    setOptions([...options, '']);
  };

  const handleRemoveOption = (index) => {
    if (options.length <= 2) return;
    const newOptions = options.filter((_, i) => i !== index);
    setOptions(newOptions);
    if (correctIndex >= newOptions.length) {
      setCorrectIndex(newOptions.length - 1);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <Label>Pergunta</Label>
        <Input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Digite a pergunta..."
        />
      </div>

      <div>
        <Label>Opções</Label>
        <RadioGroup value={correctIndex.toString()} onValueChange={(v) => setCorrectIndex(parseInt(v))}>
          {options.map((option, index) => (
            <div key={index} className="flex items-center gap-2 mt-2">
              <RadioGroupItem value={index.toString()} id={`option-${index}`} />
              <Input
                value={option}
                onChange={(e) => handleOptionChange(index, e.target.value)}
                placeholder={`Opção ${index + 1}`}
                className="flex-1"
              />
              {options.length > 2 && (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => handleRemoveOption(index)}
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
          ))}
        </RadioGroup>
        {options.length < 6 && (
          <Button
            type="button"
            onClick={handleAddOption}
            className="mt-2"
            size="sm"
            variant="outline"
          >
            Adicionar Opção
          </Button>
        )}
        <p className="text-xs text-slate-600 dark:text-slate-400 mt-2">
          Marque a opção correta e preencha todas as alternativas
        </p>
      </div>

      <Card className="p-4 bg-blue-50 dark:bg-blue-950/30">
        <Label className="text-sm font-semibold mb-2 block">Preview</Label>
        <p className="text-sm font-semibold mb-2">{question || 'Pergunta aparecerá aqui'}</p>
        <div className="space-y-1">
          {options.map((option, index) => (
            <div
              key={index}
              className={`p-2 rounded text-sm ${
                index === correctIndex
                  ? 'bg-green-100 dark:bg-green-900/30 border border-green-300'
                  : 'bg-white dark:bg-slate-800'
              }`}
            >
              {index === correctIndex && <Check className="w-4 h-4 inline mr-2 text-green-600" />}
              {option || `Opção ${index + 1}`}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};

// ============================================================================
// ORDER CARD EDITOR
// ============================================================================

export const OrderCardEditor = ({ value, onChange }) => {
  const [question, setQuestion] = useState(value?.question || '');
  const [items, setItems] = useState(value?.items || ['', '']);

  useEffect(() => {
    onChange({ question, items });
  }, [question, items]);

  const handleItemChange = (index, text) => {
    const newItems = [...items];
    newItems[index] = text;
    setItems(newItems);
  };

  const handleAddItem = () => {
    setItems([...items, '']);
  };

  const handleRemoveItem = (index) => {
    if (items.length <= 2) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const handleMoveUp = (index) => {
    if (index === 0) return;
    const newItems = [...items];
    [newItems[index - 1], newItems[index]] = [newItems[index], newItems[index - 1]];
    setItems(newItems);
  };

  const handleMoveDown = (index) => {
    if (index === items.length - 1) return;
    const newItems = [...items];
    [newItems[index], newItems[index + 1]] = [newItems[index + 1], newItems[index]];
    setItems(newItems);
  };

  return (
    <div className="space-y-4">
      <div>
        <Label>Pergunta</Label>
        <Input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ex: Ordene os eventos cronologicamente"
        />
      </div>

      <div>
        <Label>Itens (na ordem correta)</Label>
        <div className="space-y-2 mt-2">
          {items.map((item, index) => (
            <div key={index} className="flex items-center gap-2">
              <Badge variant="outline">{index + 1}</Badge>
              <Input
                value={item}
                onChange={(e) => handleItemChange(index, e.target.value)}
                placeholder={`Item ${index + 1}`}
                className="flex-1"
              />
              <div className="flex gap-1">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => handleMoveUp(index)}
                  disabled={index === 0}
                >
                  ↑
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => handleMoveDown(index)}
                  disabled={index === items.length - 1}
                >
                  ↓
                </Button>
                {items.length > 2 && (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => handleRemoveItem(index)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
        <Button
          type="button"
          onClick={handleAddItem}
          className="mt-2"
          size="sm"
          variant="outline"
        >
          Adicionar Item
        </Button>
        <p className="text-xs text-slate-600 dark:text-slate-400 mt-2">
          Organize os itens na ordem correta. O aluno terá que reorganizá-los.
        </p>
      </div>

      <Card className="p-4 bg-blue-50 dark:bg-blue-950/30">
        <Label className="text-sm font-semibold mb-2 block">Preview</Label>
        <p className="text-sm font-semibold mb-2">{question || 'Pergunta aparecerá aqui'}</p>
        <div className="space-y-2">
          {items.map((item, index) => (
            <div key={index} className="flex items-center gap-2 p-2 bg-white dark:bg-slate-800 rounded">
              <GripVertical className="w-4 h-4 text-slate-400" />
              <span className="text-sm">{item || `Item ${index + 1}`}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};

// ============================================================================
// CLOZE CARD REVIEW (During study)
// ============================================================================

export const ClozeCardReview = ({ card, showAnswer }) => {
  const renderText = () => {
    if (!card.front) return null;

    const clozeRegex = /\{\{c\d+::(.*?)\}\}/g;
    
    if (showAnswer) {
      // Show all answers
      return card.front.replace(clozeRegex, '<span class="font-bold text-green-600 bg-green-50 dark:bg-green-950/30 px-1 rounded">$1</span>');
    } else {
      // Hide answers
      return card.front.replace(clozeRegex, '<span class="inline-block min-w-[80px] h-6 bg-blue-200 dark:bg-blue-800 rounded mx-1"></span>');
    }
  };

  return (
    <div
      className="text-lg leading-relaxed"
      dangerouslySetInnerHTML={{ __html: renderText() }}
    />
  );
};

// ============================================================================
// MULTIPLE CHOICE CARD REVIEW
// ============================================================================

export const MultipleChoiceCardReview = ({ card, showAnswer, onAnswer }) => {
  const [selectedIndex, setSelectedIndex] = useState(null);
  const typeData = card.type_data || {};
  const options = typeData.options || [];
  const correctIndex = typeData.correct_index || 0;

  const handleSelect = (index) => {
    if (showAnswer) return;
    setSelectedIndex(index);
    if (onAnswer) onAnswer(index === correctIndex);
  };

  return (
    <div className="space-y-4">
      <p className="text-xl font-semibold mb-4">{card.front}</p>
      <div className="space-y-2">
        {options.map((option, index) => (
          <button
            key={index}
            onClick={() => handleSelect(index)}
            disabled={showAnswer}
            className={`
              w-full text-left p-4 rounded-lg border-2 transition-all
              ${!showAnswer && 'hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30'}
              ${selectedIndex === index && !showAnswer && 'border-blue-500 bg-blue-50 dark:bg-blue-950/30'}
              ${showAnswer && index === correctIndex && 'border-green-500 bg-green-50 dark:bg-green-950/30'}
              ${showAnswer && selectedIndex === index && index !== correctIndex && 'border-red-500 bg-red-50 dark:bg-red-950/30'}
              ${showAnswer && index !== correctIndex && index !== selectedIndex && 'opacity-50'}
            `}
          >
            <div className="flex items-center gap-3">
              <div className={`
                w-6 h-6 rounded-full border-2 flex items-center justify-center
                ${showAnswer && index === correctIndex && 'bg-green-500 border-green-500'}
                ${showAnswer && selectedIndex === index && index !== correctIndex && 'bg-red-500 border-red-500'}
              `}>
                {showAnswer && index === correctIndex && <Check className="w-4 h-4 text-white" />}
                {showAnswer && selectedIndex === index && index !== correctIndex && <X className="w-4 h-4 text-white" />}
              </div>
              <span>{option}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default {
  ClozeCardEditor,
  MultipleChoiceCardEditor,
  OrderCardEditor,
  ClozeCardReview,
  MultipleChoiceCardReview,
};
