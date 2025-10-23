import { supabase } from '@/shared/services/supabaseClient';
import mammoth from 'mammoth';
import * as pdfjsLib from 'pdfjs-dist';

// Configure PDF.js worker
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
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
      console.error('Error parsing DOCX:', error);
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
      console.error('Error parsing PDF:', error);
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
          upsert: false
        });
      
      if (error) throw error;
      
      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(filePath);
      
      return publicUrl;
    } catch (error) {
      console.error('Error uploading document:', error);
      throw new Error('Erro ao fazer upload do arquivo');
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
    
    // Upload original file
    const fileUrl = await this.uploadDocument(file);
    
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
    
    // Simple regex to find numbered questions
    const questionPattern = /(\d+)[\.\)]\s*(.+?)(?=\n\d+[\.\)]|\n\n|$)/gs;
    const matches = [...text.matchAll(questionPattern)];
    
    matches.forEach((match, index) => {
      const questionText = match[2].trim();
      
      // Check if it looks like a multiple choice question
      const hasOptions = /[A-E]\)\s*[^\n]+/i.test(questionText);
      
      questions.push({
        id: `q_${index + 1}`,
        order: index + 1,
        question: questionText,
        type: hasOptions ? 'multiple_choice' : 'short_answer',
        points: 1,
        required: true
      });
    });
    
    return questions.length > 0 ? questions : [{
      id: 'q_1',
      order: 1,
      question: 'Responda com base no documento fornecido',
      type: 'paragraph',
      points: 10,
      required: true
    }];
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
