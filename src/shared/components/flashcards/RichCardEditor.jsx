/**
 * Rich Card Editor Component
 * Supports plain text, Markdown, LaTeX math, and images
 */

import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Code,
  Image as ImageIcon,
  Link as LinkIcon,
  FileText,
  Eye,
  Sigma,
  Upload,
} from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Textarea } from '@/shared/components/ui/textarea';
import { Card } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/shared/components/ui/tabs';
import { useToast } from '@/shared/components/ui/use-toast';

const RichCardEditor = ({ value, onChange, placeholder, label, maxLength = 2000 }) => {
  const { toast } = useToast();
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);
  const [mode, setMode] = useState('write'); // write or preview

  // Insert formatting at cursor position
  const insertAtCursor = (before, after = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = value || '';
    const selectedText = text.substring(start, end);

    const newText =
      text.substring(0, start) +
      before +
      selectedText +
      after +
      text.substring(end);

    onChange(newText);

    // Set cursor position after insertion
    setTimeout(() => {
      const newCursorPos = start + before.length + selectedText.length;
      textarea.focus();
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  const handleBold = () => insertAtCursor('**', '**');
  const handleItalic = () => insertAtCursor('*', '*');
  const handleUnderline = () => insertAtCursor('<u>', '</u>');
  const handleCode = () => insertAtCursor('`', '`');
  const handleCodeBlock = () => insertAtCursor('\n```\n', '\n```\n');
  const handleList = () => insertAtCursor('\n- ', '');
  const handleOrderedList = () => insertAtCursor('\n1. ', '');
  const handleLink = () => insertAtCursor('[', '](url)');
  const handleMath = () => insertAtCursor('$', '$');
  const handleMathBlock = () => insertAtCursor('\n$$\n', '\n$$\n');

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Arquivo inválido',
        description: 'Apenas imagens são permitidas.',
        variant: 'destructive',
      });
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: 'Arquivo muito grande',
        description: 'Imagem deve ter no máximo 2MB.',
        variant: 'destructive',
      });
      return;
    }

    try {
      // Convert to base64 for preview (in production, upload to Supabase Storage)
      const reader = new FileReader();
      reader.onload = (e) => {
        const imageUrl = e.target.result;
        insertAtCursor(`![imagem](${imageUrl})\n`, '');
      };
      reader.readAsDataURL(file);
    } catch (error) {
      toast({
        title: 'Erro ao carregar imagem',
        description: 'Tente novamente.',
        variant: 'destructive',
      });
    }
  };

  // Render Markdown preview
  const renderPreview = (text) => {
    if (!text) return <p className="text-slate-400">Preview aparecerá aqui...</p>;

    let html = text;

    // Bold
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    // Italic
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');

    // Underline
    html = html.replace(/<u>(.*?)<\/u>/g, '<u>$1</u>');

    // Code inline
    html = html.replace(/`(.*?)`/g, '<code class="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded text-sm font-mono">$1</code>');

    // Code block
    html = html.replace(/```([\s\S]*?)```/g, '<pre class="bg-slate-100 dark:bg-slate-800 p-3 rounded my-2 overflow-x-auto"><code>$1</code></pre>');

    // Lists
    html = html.replace(/^- (.*)$/gm, '<li>$1</li>');
    html = html.replace(/^(\d+)\. (.*)$/gm, '<li>$2</li>');

    // Links
    html = html.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" class="text-blue-600 hover:underline" target="_blank">$1</a>');

    // Math inline (LaTeX)
    html = html.replace(/\$(.*?)\$/g, '<span class="math-inline bg-blue-50 dark:bg-blue-950/30 px-1 rounded">$1</span>');

    // Math block
    html = html.replace(/\$\$([\s\S]*?)\$\$/g, '<div class="math-block bg-blue-50 dark:bg-blue-950/30 p-3 rounded my-2 text-center">$1</div>');

    // Images
    html = html.replace(/!\[(.*?)\]\((.*?)\)/g, '<img src="$2" alt="$1" class="max-w-full rounded my-2" />');

    // Line breaks
    html = html.replace(/\n/g, '<br />');

    return <div dangerouslySetInnerHTML={{ __html: html }} className="prose dark:prose-invert max-w-none" />;
  };

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg">
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleBold}
            title="Negrito (**texto**)"
          >
            <Bold className="w-4 h-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleItalic}
            title="Itálico (*texto*)"
          >
            <Italic className="w-4 h-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleUnderline}
            title="Sublinhado"
          >
            <Underline className="w-4 h-4" />
          </Button>
        </div>

        <div className="w-px h-6 bg-slate-300 dark:bg-slate-700" />

        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleList}
            title="Lista não ordenada"
          >
            <List className="w-4 h-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleOrderedList}
            title="Lista ordenada"
          >
            <ListOrdered className="w-4 h-4" />
          </Button>
        </div>

        <div className="w-px h-6 bg-slate-300 dark:bg-slate-700" />

        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleCode}
            title="Código inline (`código`)"
          >
            <Code className="w-4 h-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleCodeBlock}
            title="Bloco de código (```)"
          >
            <FileText className="w-4 h-4" />
          </Button>
        </div>

        <div className="w-px h-6 bg-slate-300 dark:bg-slate-700" />

        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleMath}
            title="Fórmula inline ($formula$)"
          >
            <Sigma className="w-4 h-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleLink}
            title="Link [texto](url)"
          >
            <LinkIcon className="w-4 h-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            title="Inserir imagem"
          >
            <ImageIcon className="w-4 h-4" />
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="hidden"
          />
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={mode} onValueChange={setMode}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="write">
            <FileText className="w-4 h-4 mr-2" />
            Escrever
          </TabsTrigger>
          <TabsTrigger value="preview">
            <Eye className="w-4 h-4 mr-2" />
            Preview
          </TabsTrigger>
        </TabsList>

        <TabsContent value="write" className="mt-3">
          <Textarea
            ref={textareaRef}
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            rows={10}
            className="font-mono text-sm"
            maxLength={maxLength}
          />
          <div className="flex items-center justify-between mt-2">
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Suporta Markdown, LaTeX ($formula$) e imagens
            </p>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              {(value || '').length}/{maxLength}
            </p>
          </div>
        </TabsContent>

        <TabsContent value="preview" className="mt-3">
          <Card className="p-4 min-h-[240px] bg-slate-50 dark:bg-slate-900">
            {renderPreview(value)}
          </Card>
        </TabsContent>
      </Tabs>

      {/* Quick Reference */}
      <details className="text-xs text-slate-600 dark:text-slate-400">
        <summary className="cursor-pointer hover:text-slate-900 dark:hover:text-white">
          Guia de Formatação
        </summary>
        <div className="mt-2 p-3 bg-slate-50 dark:bg-slate-900 rounded space-y-1">
          <p><code>**negrito**</code> → <strong>negrito</strong></p>
          <p><code>*itálico*</code> → <em>itálico</em></p>
          <p><code>`código`</code> → <code>código</code></p>
          <p><code>$x^2$</code> → fórmula matemática</p>
          <p><code>[link](url)</code> → link clicável</p>
          <p><code>![alt](url)</code> → imagem</p>
        </div>
      </details>
    </div>
  );
};

export default RichCardEditor;
