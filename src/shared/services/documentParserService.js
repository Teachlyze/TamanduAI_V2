import { logger } from '@/shared/utils/logger';
import { supabase } from '@/shared/services/supabaseClient';
import mammoth from 'mammoth';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';

// Configure PDF.js worker (use local bundled worker, not CDN)
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;
}

/**
 * Document Parser Service
 * Parses DOCX and PDF files to extract text content for activities
 */

export const DocumentParserService = {
  /**
   * Parse DOCX file to extract text and questions
   * @param {File} file - DOCX file
   * @returns {Promise<Object>} - Parsed content
   */
  async parseDocx(file) {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer });
      
      return {
        text: result.value,
        type: 'docx',
        fileName: file.name,
        parsedAt: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Error parsing DOCX:', error)
      throw new Error('Erro ao processar arquivo DOCX');
    }
  },

  /**
   * Parse PDF file to extract text
   * @param {File} file - PDF file
   * @returns {Promise<Object>} - Parsed content
   */
  async parsePdf(file) {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      
      let fullText = '';
      
      // Extract text from all pages
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map(item => item.str).join(' ');
        fullText += pageText + '\n\n';
      }
      
      return {
        text: fullText,
        type: 'pdf',
        fileName: file.name,
        pages: pdf.numPages,
        parsedAt: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Error parsing PDF:', error)
      throw new Error('Erro ao processar arquivo PDF');
    }
  },

  /**
   * Upload document to Supabase storage
   * @param {File} file - Document file
   * @param {string} folder - Storage folder
   * @returns {Promise<string>} - Public URL
   */
  async uploadDocument(file, folder = 'activities') {
    try {
      const fileName = `${Date.now()}_${file.name}`;
      const filePath = `${folder}/${fileName}`;
      
      const { data, error } = await supabase.storage
        .from('documents')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: file.type || undefined
        });
      
      if (error) throw error;
      
      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(filePath);
      
      return publicUrl;
    } catch (error) {
      logger.error('Error uploading document:', error)
      // Não tornar upload bloqueante para o parsing – apenas retorne null
      return null;
    }
  },

  /**
   * Parse document and create activity structure
   * @param {File} file - Document file (DOCX or PDF)
   * @returns {Promise<Object>} - Activity structure
   */
  async parseToActivity(file) {
    const fileType = file.name.toLowerCase();
    let parsed;
    
    if (fileType.endsWith('.docx')) {
      parsed = await this.parseDocx(file);
    } else if (fileType.endsWith('.pdf')) {
      parsed = await this.parsePdf(file);
    } else {
      throw new Error('Formato de arquivo não suportado. Use DOCX ou PDF.');
    }
    
    // Upload original file (não-fatal)
    let fileUrl = null;
    try {
      fileUrl = await this.uploadDocument(file);
    } catch (e) {
      // uploadDocument já captura e retorna null, mas por segurança
      logger.warn('Upload do arquivo original falhou, prosseguindo sem URL pública');
      fileUrl = null;
    }
    
    // Try to extract questions from text
    const questions = this.extractQuestions(parsed.text);
    
    return {
      title: file.name.replace(/\.(docx|pdf)$/i, ''),
      description: parsed.text.substring(0, 500) + '...',
      content: {
        type: 'imported',
        source: parsed.type,
        originalFile: fileUrl,
        text: parsed.text,
        questions: questions,
        metadata: {
          fileName: parsed.fileName,
          parsedAt: parsed.parsedAt,
          pages: parsed.pages
        }
      },
      type: 'assignment'
    };
  },

  /**
   * Extract questions from text (simple heuristic)
   * @param {string} text - Text content
   * @returns {Array<Object>} - Extracted questions
   */
  extractQuestions(text) {
    const questions = [];

    if (!text || !text.trim()) return [];

    // Normalize newlines
    const normalized = text.replace(/\r\n?/g, '\n');

    // Find question blocks starting with number like "1)" or "1." or "Questão 1:"
    const blocks = [];
    const pattern = /(^\s*(?:quest[aã]o\s*)?(\d+)\s*[\)\.:\-]\s*)([\s\S]*?)(?=\n\s*(?:quest[aã]o\s*)?\d+\s*[\)\.:\-]\s|$)/gim;
    let m;
    while ((m = pattern.exec(normalized)) !== null) {
      const body = (m[3] || '').trim();
      if (body) blocks.push(body);
    }

    const sourceBlocks = blocks.length > 0 ? blocks : [normalized.trim()];

    sourceBlocks.forEach((block, idx) => {
      // Split lines for detecting alternatives
      const lines = block.split(/\n+/).map(l => l.trim()).filter(Boolean);
      const joined = lines.join('\n');

      // Detect alternatives like "A) ...", "B. ...", "C - ..."
      const altRegex = /^\s*([A-H])\s*[\)\.\-]\s+(.+)/i;
      const alternatives = [];
      for (const line of lines) {
        const altMatch = line.match(altRegex);
        if (altMatch) {
          const letter = altMatch[1].toUpperCase();
          const altText = altMatch[2].trim();
          alternatives.push({
            id: `${Date.now()}_${idx}_${letter}`,
            letter,
            text: altText,
            isCorrect: false
          });
        }
      }

      // Question stem: first line(s) before first alternative, or whole block if none
      let stem = joined;
      if (alternatives.length > 0) {
        const firstAltIndex = lines.findIndex(l => altRegex.test(l));
        stem = lines.slice(0, Math.max(0, firstAltIndex)).join('\n').trim();
      }

      if (alternatives.length >= 2) {
        questions.push({
          id: `q_${idx + 1}_${Date.now()}`,
          type: 'closed',
          text: stem || `Questão ${idx + 1}`,
          points: 1,
          alternatives: alternatives.map((a, i) => ({
            ...a,
            letter: String.fromCharCode(65 + i) // Reindex letters sequentially
          })),
          explanation: '',
          hint: ''
        });
      } else {
        questions.push({
          id: `q_${idx + 1}_${Date.now()}`,
          type: 'open',
          text: stem,
          points: 1,
          maxLines: null,
          maxCharacters: null,
          image: null,
          attachments: [],
          rubric: [],
          expectedAnswer: ''
        });
      }
    });

    return questions;
  },

  /**
   * Supported file types
   */
  supportedTypes: [
    { extension: '.docx', mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' },
    { extension: '.pdf', mime: 'application/pdf' }
  ],

  /**
   * Check if file type is supported
   * @param {File} file - File to check
   * @returns {boolean} - Is supported
   */
  isSupported(file) {
    return this.supportedTypes.some(
      type => file.name.toLowerCase().endsWith(type.extension) || 
              file.type === type.mime
    );
  }
};

export default DocumentParserService;
