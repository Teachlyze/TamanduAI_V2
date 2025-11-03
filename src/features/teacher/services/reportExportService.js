import { toast } from '@/shared/components/ui/use-toast';

/**
 * Exporta relatório para PDF (via impressão do navegador, sem dependências externas).
 * Se houver tabelas, sugere usar exportação CSV separada.
 */
export const exportReportToPDF = async (report) => {
  try {
    const title = report?.title || report?.templateName || 'Relatório';
    const html = `<!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="utf-8" />
        <title>${title}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 24px; color: #0f172a; }
          h1 { margin: 0 0 8px; font-size: 22px; }
          h2 { margin: 18px 0 8px; font-size: 16px; }
          .section { margin-top: 16px; }
          table { width: 100%; border-collapse: collapse; }
          th, td { border: 1px solid #e2e8f0; padding: 8px; font-size: 12px; }
          th { background: #f1f5f9; text-align: left; }
          @media print { .no-print { display: none; } }
        </style>
      </head>
      <body>
        <h1>${title}</h1>
        <div class="section">Gerado em ${new Date(report.generatedAt).toLocaleString('pt-BR')}</div>
        ${report.summary ? `<div class="section"><h2>Resumo</h2><ul>${Object.entries(report.summary).map(([k,v])=>`<li><strong>${k}</strong>: ${v}</li>`).join('')}</ul></div>` : ''}
        ${Array.isArray(report.tables) && report.tables.length ? report.tables.map(t => `
          <div class="section">
            <h2>${t.title}</h2>
            <table>
              <thead><tr>${t.headers.map(h=>`<th>${h}</th>`).join('')}</tr></thead>
              <tbody>
                ${t.rows.map(r=>`<tr>${r.map(c=>`<td>${typeof c === 'object' ? JSON.stringify(c) : (c ?? '')}</td>`).join('')}</tr>`).join('')}
              </tbody>
            </table>
          </div>
        `).join('') : ''}
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

export const exportReportToCSVorJSON = (report) => {
  try {
    if (report.tables && report.tables.length > 0) {
      const table = report.tables[0];
      const headers = table.headers || [];
      const csvRows = [headers.join(',')];
      (table.rows || []).forEach((row) => {
        const line = row.map((cell) => {
          const s = typeof cell === 'object' ? JSON.stringify(cell) : String(cell ?? '');
          return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
        }).join(',');
        csvRows.push(line);
      });
      const csv = csvRows.join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const name = (report.title || report.templateName || 'relatorio').toLowerCase().replace(/\s+/g, '-');
      a.href = url;
      a.download = `${name}-${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast({ title: 'Exportado (CSV)', description: 'Arquivo CSV baixado com sucesso.' });
      return;
    }
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const name = (report.title || report.templateName || 'relatorio').toLowerCase().replace(/\s+/g, '-');
    a.href = url;
    a.download = `${name}-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast({ title: 'Exportado (JSON)', description: 'Arquivo JSON baixado com sucesso.' });
  } catch (e) {
    toast({ variant: 'destructive', title: 'Falha na exportação', description: 'Tente novamente.' });
  }
};

export const printReport = () => {
  try {
    window.print();
  } catch (e) {
    toast({ variant: 'destructive', title: 'Falha ao imprimir', description: 'Tente novamente.' });
  }
};

export const shareReport = async (report) => {
  try {
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const title = report.title || report.templateName || 'Relatório';
    if (navigator.share) {
      await navigator.share({ title, text: title, url });
    } else {
      await navigator.clipboard.writeText(url);
      toast({ title: 'Link copiado', description: 'Link do relatório copiado para a área de transferência.' });
    }
  } catch (e) {
    toast({ variant: 'destructive', title: 'Falha ao compartilhar', description: 'Tente novamente.' });
  }
};
