// src/utils/formUtils.js

import * as Yup from 'yup';

// Esquema de validação para atividades
export const activityValidationSchema = Yup.object().shape({
  title: Yup.string()
    .required('O título é obrigatório')
    .max(100, 'O título não pode ter mais de 100 caracteres'),
  description: Yup.string()
    .max(1000, 'A descrição não pode ter mais de 1000 caracteres'),
  type: Yup.string()
    .required('O tipo de atividade é obrigatório')
    .oneOf(['assignment', 'quiz', 'material'], 'Tipo de atividade inválido'),
  points: Yup.number()
    .min(0, 'A pontuação não pode ser negativa')
    .max(1000, 'A pontuação máxima é 1000')
    .nullable(),
  dueDate: Yup.date()
    .nullable()
    .when('availableFrom', (availableFrom, schema) => {
      if (availableFrom) {
        return schema.min(
          availableFrom,
          'A data de término deve ser posterior à data de início'
        );
      }
      return schema;
    }),
  availableFrom: Yup.date()
    .nullable(),
  isVisible: Yup.boolean(),
  status: Yup.string()
    .oneOf(['draft', 'published', 'scheduled', 'unpublished'], 'Status inválido'),
  submissionType: Yup.string()
    .when('type', {
      is: 'assignment',
      then: Yup.string()
        .required('O tipo de envio é obrigatório')
        .oneOf(
          ['online', 'file', 'both', 'none'],
          'Tipo de envio inválido'
        ),
    }),
  allowedFileTypes: Yup.array()
    .when(['type', 'submissionType'], {
      is: (type, submissionType) => 
        type === 'assignment' && (submissionType === 'file' || submissionType === 'both'),
      then: Yup.array()
        .min(1, 'Selecione pelo menos um tipo de arquivo permitido')
        .of(Yup.string()),
    }),
  maxFileSize: Yup.number()
    .when(['type', 'submissionType'], {
      is: (type, submissionType) => 
        type === 'assignment' && (submissionType === 'file' || submissionType === 'both'),
      then: Yup.number()
        .min(1, 'O tamanho máximo deve ser pelo menos 1MB')
        .max(100, 'O tamanho máximo não pode exceder 100MB')
        .required('O tamanho máximo é obrigatório'),
    }),
  timeLimit: Yup.number()
    .when('type', {
      is: 'quiz',
      then: Yup.number()
        .min(1, 'O tempo limite deve ser de pelo menos 1 minuto')
        .max(240, 'O tempo limite não pode exceder 4 horas')
        .nullable(),
    }),
  attemptsAllowed: Yup.number()
    .when('type', {
      is: 'quiz',
      then: Yup.number()
        .min(1, 'O número de tentativas deve ser pelo menos 1')
        .max(10, 'O número máximo de tentativas é 10')
        .nullable(),
    }),
  passingScore: Yup.number()
    .when('type', {
      is: 'quiz',
      then: Yup.number()
        .min(0, 'A nota de aprovação não pode ser negativa')
        .max(100, 'A nota de aprovação não pode ser superior a 100%')
        .nullable(),
    }),
  questions: Yup.array()
    .when('type', {
      is: 'quiz',
      then: Yup.array()
        .min(1, 'Adicione pelo menos uma questão')
        .of(
          Yup.object().shape({
            question: Yup.string().required('A pergunta é obrigatória'),
            type: Yup.string()
              .required('O tipo de questão é obrigatório')
              .oneOf(
                ['multiple_choice', 'true_false', 'short_answer', 'essay', 'matching', 'fill_blank', 'numerical'],
                'Tipo de questão inválido'
              ),
            points: Yup.number()
              .min(0, 'A pontuação não pode ser negativa')
              .required('A pontuação é obrigatória'),
            options: Yup.array()
              .when('type', {
                is: (type) => ['multiple_choice', 'true_false', 'matching'].includes(type),
                then: Yup.array()
                  .min(2, 'Adicione pelo menos duas opções')
                  .of(
                    Yup.object().shape({
                      text: Yup.string().required('O texto da opção é obrigatório'),
                      isCorrect: Yup.boolean(),
                    })
                  ),
              }),
            correctAnswer: Yup.mixed()
              .when('type', {
                is: 'true_false',
                then: Yup.boolean().required('Selecione a resposta correta'),
              }),
          })
        ),
    }),
  attachments: Yup.array().of(
    Yup.object().shape({
      id: Yup.string().required(),
      name: Yup.string().required(),
      type: Yup.string().required(),
      size: Yup.number().required(),
      url: Yup.string(),
      status: Yup.string().oneOf(['uploading', 'completed', 'error']),
      progress: Yup.number().min(0).max(100),
    })
  ),
});

// Valores iniciais para o formulário de atividade
export const initialActivityValues = {
  title: '',
  description: '',
  type: 'assignment',
  points: 10,
  dueDate: null,
  availableFrom: null,
  isVisible: true,
  status: 'draft',
  submissionType: 'online',
  allowedFileTypes: [],
  maxFileSize: 10, // MB
  timeLimit: null, // minutos
  attemptsAllowed: 1,
  passingScore: 70, // porcentagem
  questions: [],
  attachments: [],
  access: 'all', // 'all', 'specific', 'groups'
  selectedUsers: [],
  selectedGroups: [],
  tags: [],
  category: '',
  instructions: '',
  showCorrectAnswers: false,
  showFeedback: true,
  allowComments: true,
  allowResubmissions: false,
  resubmissionLimit: 1,
  lateSubmissionAllowed: false,
  latePenalty: 0, // porcentagem por dia
  requirePasscode: false,
  passcode: '',
  shuffleQuestions: false,
  shuffleAnswers: false,
  showOneQuestionAtATime: false,
  lockQuestionsAfterAnswer: false,
  availableUntil: null,
  timeLimitEnforced: false,
  allowMultipleAttempts: false,
  scoreToKeep: 'highest', // 'highest', 'latest', 'average'
  showProgressBar: true,
  showQuestionNumbers: true,
  showQuizTimer: true,
  restrictAccessByDate: false,
  restrictAccessByGroup: false,
  requireViewingConfirmation: false,
  showCorrectAnswersAfter: 'never', // 'never', 'after_attempt', 'after_due_date', 'on_specific_date'
  specificDate: null,
  feedbackMode: 'immediate', // 'immediate', 'on_submission', 'manual'
  customFeedback: '',
  allowPrinting: true,
  allowDownload: false,
  enableProctoring: false,
  proctoringMode: 'none', // 'none', 'low', 'medium', 'high'
  enableRespondusLockdown: false,
  enableWebcam: false,
  enableScreenSharing: false,
  enableLocationTracking: false,
  enableIPRestriction: false,
  allowedIPs: [],
  enableBrowserLock: false,
  allowedBrowsers: [],
  enableFullScreen: false,
  enableCopyPasteProtection: false,
  enableRightClickProtection: false,
  enablePrintScreenProtection: false,
  enableOfflineAccess: false,
  syncWhenOnline: true,
  offlineAccessExpiry: 7, // dias
  enableSCORM: false,
  SCORMPackage: null,
  enableLTI: false,
  LTIConsumerKey: '',
  LTISecret: '',
  LTIURL: '',
  enableAnalytics: true,
  trackDetailedAnalytics: false,
  enableNotifications: true,
  notifyOnSubmission: true,
  notifyOnLateSubmission: true,
  notifyOnGrading: true,
  notificationEmails: [],
  customFields: [],
  metadata: {},
  version: 1,
  createdBy: null,
  updatedBy: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

// Função para formatar erros de validação do Yup
export const formatYupErrors = (error) => {
  if (!error.inner || error.inner.length === 0) {
    return { [error.path]: error.message };
  }
  
  return error.inner.reduce((acc, currentError) => {
    if (!acc[currentError.path]) {
      acc[currentError.path] = currentError.message;
    }
    return acc;
  }, {});
};

// Função para validar um formulário com Yup
export const validateForm = async (values, validationSchema) => {
  try {
    await validationSchema.validate(values, { abortEarly: false });
    return { isValid: true, errors: {} };
  } catch (error) {
    return { isValid: false, errors: formatYupErrors(error) };
  }
};

// Função para formatar valores do formulário antes de enviar
export const formatFormValues = (values) => {
  const formattedValues = { ...values };
  
  // Remover campos vazios ou nulos
  Object.keys(formattedValues).forEach(key => {
    if (formattedValues[key] === '' || formattedValues[key] === null) {
      delete formattedValues[key];
    }
  });
  
  // Formatar datas
  if (formattedValues.dueDate) {
    formattedValues.dueDate = new Date(formattedValues.dueDate).toISOString();
  }
  
  if (formattedValues.availableFrom) {
    formattedValues.availableFrom = new Date(formattedValues.availableFrom).toISOString();
  }
  
  if (formattedValues.specificDate) {
    formattedValues.specificDate = new Date(formattedValues.specificDate).toISOString();
  }
  
  // Formatar anexos
  if (Array.isArray(formattedValues.attachments)) {
    formattedValues.attachments = formattedValues.attachments.map(attachment => ({
      id: attachment.id,
      name: attachment.name,
      type: attachment.type,
      size: attachment.size,
      url: attachment.url,
    }));
  }
  
  return formattedValues;
};

// Função para processar valores iniciais do formulário
export const processInitialValues = (initialValues) => {
  const processedValues = { ...initialValues };
  
  // Converter strings de data para objetos Date
  if (processedValues.dueDate) {
    processedValues.dueDate = new Date(processedValues.dueDate);
  }
  
  if (processedValues.availableFrom) {
    processedValues.availableFrom = new Date(processedValues.availableFrom);
  }
  
  if (processedValues.specificDate) {
    processedValues.specificDate = new Date(processedValues.specificDate);
  }
  
  return processedValues;
};

// Função para gerar um ID único
export const generateId = (prefix = '') => {
  return `${prefix}${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

// Função para formatar o tamanho do arquivo
export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Função para obter o tipo MIME com base na extensão do arquivo
export const getMimeType = (filename) => {
  const extension = filename.split('.').pop().toLowerCase();
  
  const mimeTypes = {
    // Imagens
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    bmp: 'image/bmp',
    webp: 'image/webp',
    svg: 'image/svg+xml',
    
    // Documentos
    pdf: 'application/pdf',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xls: 'application/vnd.ms-excel',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ppt: 'application/vnd.ms-powerpoint',
    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    txt: 'text/plain',
    rtf: 'application/rtf',
    csv: 'text/csv',
    
    // Arquivos de código
    html: 'text/html',
    htm: 'text/html',
    css: 'text/css',
    js: 'application/javascript',
    json: 'application/json',
    xml: 'application/xml',
    
    // Arquivos compactados
    zip: 'application/zip',
    rar: 'application/x-rar-compressed',
    '7z': 'application/x-7z-compressed',
    tar: 'application/x-tar',
    gz: 'application/gzip',
    
    // Áudio
    mp3: 'audio/mpeg',
    wav: 'audio/wav',
    ogg: 'audio/ogg',
    m4a: 'audio/mp4',
    
    // Vídeo
    mp4: 'video/mp4',
    webm: 'video/webm',
    ogg: 'video/ogg',
    mov: 'video/quicktime',
    avi: 'video/x-msvideo',
    wmv: 'video/x-ms-wmv',
    flv: 'video/x-flv',
    mkv: 'video/x-matroska',
  };
  
  return mimeTypes[extension] || 'application/octet-stream';
};

// Função para validar o tipo de arquivo
export const validateFileType = (file, allowedTypes) => {
  if (!allowedTypes || allowedTypes.length === 0) return true;
  
  const fileType = file.type || getMimeType(file.name);
  const fileExtension = file.name.split('.').pop().toLowerCase();
  
  return allowedTypes.some(type => {
    if (type === 'any') return true;
    
    // Verificar por tipo MIME (ex: image/*, application/pdf)
    if (type.includes('*')) {
      const mimePrefix = type.split('*')[0];
      return fileType.startsWith(mimePrefix);
    }
    
    // Verificar por extensão de arquivo
    return type.toLowerCase() === fileExtension;
  });
};

// Função para validar o tamanho do arquivo
export const validateFileSize = (file, maxSizeMB) => {
  if (!maxSizeMB) return true;
  
  const maxSizeBytes = maxSizeMB * 1024 * 1024; // Converter MB para bytes
  return file.size <= maxSizeBytes;
};

// Função para simular upload de arquivo
export const simulateFileUpload = (file, onProgress, onSuccess, onError) => {
  const fileId = generateId('file-');
  const fileType = file.type || getMimeType(file.name);
  const fileSize = file.size;
  
  // Simular progresso de upload
  let progress = 0;
  const interval = setInterval(() => {
    progress += Math.random() * 20;
    if (progress >= 100) {
      progress = 100;
      clearInterval(interval);
      
      // Simular atraso no processamento
      setTimeout(() => {
        onSuccess({
          id: fileId,
          name: file.name,
          type: fileType,
          size: fileSize,
          url: URL.createObjectURL(file),
          status: 'completed',
          progress: 100,
        });
      }, 500);
    } else {
      onProgress({
        id: fileId,
        name: file.name,
        type: fileType,
        size: fileSize,
        status: 'uploading',
        progress: progress,
        url: ''
      });
    }
  }, 200);

  // Retorna uma função para cancelar o upload
  return () => {
    clearInterval(interval);
    onProgress({
      id: fileId,
      name: file.name,
      type: fileType,
      size: fileSize,
      status: 'canceled',
      progress: 0,
      url: ''
    });
  };
};
