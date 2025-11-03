import { supabase } from '@/shared/services/supabaseClient';
import { toast } from '@/shared/components/ui/use-toast';

/**
 * Gera uma versão imprimível da atividade e aciona o diálogo de impressão (PDF via navegador)
 * Mantém zero dependências externas.
 */
export const exportActivityToPDF = async (activity) => {
  try {
    if (!activity?.id) throw new Error('Atividade inválida');

    const createdAt = activity.created_at
      ? new Date(activity.created_at).toLocaleString('pt-BR')
      : '-';
    const dueDate = activity.due_date
      ? new Date(activity.due_date).toLocaleString('pt-BR')
      : 'Sem prazo';

    const attachments = Array.isArray(activity.content?.attachments)
      ? activity.content.attachments
      : [];

    const html = `<!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="utf-8" />
        <title>Atividade - ${activity.title}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 24px; color: #0f172a; }
          h1 { margin: 0 0 8px; font-size: 22px; }
          h2 { margin: 18px 0 8px; font-size: 16px; }
          .meta { color: #475569; font-size: 12px; margin-bottom: 16px; }
          .section { margin-top: 16px; }
          .badge { display:inline-block; padding:4px 8px; border:1px solid #cbd5e1; border-radius: 999px; font-size: 12px; color:#334155; }
          ol { padding-left: 20px; }
          .muted { color:#475569; }
          @media print { .no-print { display: none; } }
        </style>
      </head>
      <body>
        <h1>${activity.title}</h1>
        <div class="meta">
          Criada: ${createdAt} • Prazo: ${dueDate} • Pontuação Máx.: ${activity.max_score ?? '-'}
        </div>
        <div class="section">
          <div class="badge">${activity.status || 'draft'}</div>
        </div>
        <div class="section">
          <h2>Descrição</h2>
          <div>${activity.description || '<span class="muted">Sem descrição</span>'}</div>
        </div>
        ${Array.isArray(activity.instructions) || activity.instructions ? `
        <div class="section">
          <h2>Instruções</h2>
          <div>${Array.isArray(activity.instructions) ? activity.instructions.join('<br/>') : activity.instructions}</div>
        </div>` : ''}
        ${Array.isArray(activity.content?.criteria) && activity.content.criteria.length ? `
        <div class="section">
          <h2>Critérios de Avaliação</h2>
          <ol>
            ${activity.content.criteria.map((c) => `<li>${c}</li>`).join('')}
          </ol>
        </div>` : ''}
        ${Array.isArray(activity.content?.questions) && activity.content.questions.length ? `
        <div class="section">
          <h2>Questões</h2>
          <ol>
            ${activity.content.questions.map((q, i) => `<li><div><strong>${q.title || `Questão ${i+1}`}</strong></div><div>${q.text || ''}</div></li>`).join('')}
          </ol>
        </div>` : ''}
        ${attachments.length ? `
        <div class="section">
          <h2>Anexos</h2>
          <ol>
            ${attachments.map((a) => `<li><a href="${a.url}" target="_blank" rel="noopener">${a.name || a.url}</a></li>`).join('')}
          </ol>
        </div>` : ''}
      </body>
      </html>`;

    const win = window.open('', '_blank');
    win.document.open();
    win.document.write(html);
    win.document.close();
    setTimeout(() => win.print(), 250);
  } catch (e) {
    toast({ variant: 'destructive', title: 'Falha na exportação', description: 'Não foi possível gerar o PDF.' });
    throw e;
  }
};
