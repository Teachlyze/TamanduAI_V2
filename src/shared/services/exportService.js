import { logger } from '@/shared/utils/logger';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import ExcelJS from 'exceljs';

/**
 * Export grades to PDF
 */
export const exportGradesToPDF = (studentName, grades, className) => {
  const doc = new jsPDF();
  
  // Title
  doc.setFontSize(18);
  doc.text('Relatório de Notas', 14, 22);
  
  // Student info
  doc.setFontSize(12);
  doc.text(`Aluno: ${studentName}`, 14, 32);
  doc.text(`Turma: ${className}`, 14, 40);
  doc.text(`Data: ${new Date().toLocaleDateString('pt-BR')}`, 14, 48);
  
  // Grades table
  const tableData = grades.map(g => [
    g.activityName || 'Sem título',
    g.finalGrade !== null ? `${g.finalGrade}%` : 'Não avaliada',
    g.submittedAt ? new Date(g.submittedAt).toLocaleDateString('pt-BR') : '-',
    g.status || '-'
  ]);
  
  doc.autoTable({
    startY: 56,
    head: [['Atividade', 'Nota', 'Data de Entrega', 'Status']],
    body: tableData,
    theme: 'striped',
    headStyles: { fillColor: [59, 130, 246] }, // blue-500
    styles: { fontSize: 10 }
  });
  
  // Calculate average
  const gradedItems = grades.filter(g => g.finalGrade !== null);
  if (gradedItems.length > 0) {
    const average = gradedItems.reduce((sum, g) => sum + g.finalGrade, 0) / gradedItems.length;
    const finalY = doc.lastAutoTable.finalY + 10;
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text(`Média Geral: ${average.toFixed(2)}%`, 14, finalY);
  }
  
  // Save
  doc.save(`notas_${studentName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
};

/**
 * Export grades to Excel using ExcelJS
 */
export const exportGradesToExcel = async (studentName, grades, className) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Notas');

  // Title
  worksheet.mergeCells('A1:E1');
  const titleCell = worksheet.getCell('A1');
  titleCell.value = 'Relatório de Notas';
  titleCell.font = { size: 16, bold: true, color: { argb: 'FF3B82F6' } };
  titleCell.alignment = { horizontal: 'center' };

  // Student info
  worksheet.getCell('A3').value = 'Aluno:';
  worksheet.getCell('B3').value = studentName;
  worksheet.getCell('A4').value = 'Turma:';
  worksheet.getCell('B4').value = className;
  worksheet.getCell('A5').value = 'Data:';
  worksheet.getCell('B5').value = new Date().toLocaleDateString('pt-BR');

  // Header row
  const headerRow = worksheet.getRow(7);
  headerRow.values = ['Atividade', 'Nota', 'Data de Entrega', 'Status', 'Feedback'];
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF3B82F6' }
  };
  headerRow.alignment = { horizontal: 'center' };

  // Data rows
  grades.forEach((g, index) => {
    const row = worksheet.getRow(8 + index);
    row.values = [
      g.activityName || 'Sem título',
      g.finalGrade !== null ? g.finalGrade : '-',
      g.submittedAt ? new Date(g.submittedAt).toLocaleDateString('pt-BR') : '-',
      g.status || '-',
      g.feedback || '-'
    ];
    
    // Alternate row colors
    if (index % 2 === 0) {
      row.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF3F4F6' }
      };
    }
  });

  // Calculate average
  const gradedItems = grades.filter(g => g.finalGrade !== null);
  if (gradedItems.length > 0) {
    const average = gradedItems.reduce((sum, g) => sum + g.finalGrade, 0) / gradedItems.length;
    const avgRow = worksheet.getRow(8 + grades.length + 1);
    avgRow.values = ['Média Geral:', `${average.toFixed(2)}%`];
    avgRow.font = { bold: true };
  }

  // Auto-size columns
  worksheet.columns = [
    { width: 30 },
    { width: 12 },
    { width: 18 },
    { width: 15 },
    { width: 40 }
  ];

  // Generate file
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `notas_${studentName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`;
  link.click();
  window.URL.revokeObjectURL(url);
};

/**
 * Export class report to PDF
 */
export const exportClassReportToPDF = (className, students, activities) => {
  const doc = new jsPDF();
  
  doc.setFontSize(18);
  doc.text(`Relatório da Turma: ${className}`, 14, 22);
  
  doc.setFontSize(12);
  doc.text(`Total de Alunos: ${students.length}`, 14, 32);
  doc.text(`Total de Atividades: ${activities.length}`, 14, 40);
  doc.text(`Data: ${new Date().toLocaleDateString('pt-BR')}`, 14, 48);
  
  // Student performance table
  const tableData = students.map(s => [
    s.name,
    s.averageGrade !== null ? `${s.averageGrade.toFixed(2)}%` : '-',
    `${s.submissionsCount || 0}/${activities.length}`,
    s.lateCount || 0
  ]);
  
  doc.autoTable({
    startY: 56,
    head: [['Aluno', 'Média', 'Entregas', 'Atrasos']],
    body: tableData,
    theme: 'striped',
    headStyles: { fillColor: [59, 130, 246] },
    styles: { fontSize: 10 }
  });
  
  doc.save(`relatorio_${className.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
};

/**
 * Export dashboard/analytics to PNG
 * Requires html2canvas library
 */
export const exportDashboardToPNG = async (elementId, fileName = 'dashboard') => {
  try {
    // Dynamically import html2canvas (needs to be installed: npm install html2canvas)
    const html2canvas = (await import('html2canvas')).default;
    
    const element = document.getElementById(elementId);
    if (!element) {
      throw new Error(`Element with id "${elementId}" not found`);
    }

    const canvas = await html2canvas(element, {
      scale: 2, // Higher quality
      backgroundColor: '#ffffff',
      logging: false,
      useCORS: true
    });

    // Convert to blob and download
    canvas.toBlob((blob) => {
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${fileName}_${new Date().toISOString().split('T')[0]}.png`;
      link.click();
      window.URL.revokeObjectURL(url);
    });
  } catch (error) {
    logger.error('Erro ao exportar PNG:', error)
    throw error;
  }
};

/**
 * Export analytics report to PDF with charts
 */
export const exportAnalyticsReportToPDF = (classData, analytics) => {
  const doc = new jsPDF();
  
  // Title
  doc.setFontSize(20);
  doc.text('Relatório de Analytics - Chatbot', 14, 22);
  
  // Class info
  doc.setFontSize(12);
  doc.text(`Turma: ${classData.name}`, 14, 35);
  doc.text(`Período: Últimos 7 dias`, 14, 42);
  doc.text(`Data: ${new Date().toLocaleDateString('pt-BR')}`, 14, 49);
  
  // Stats summary
  doc.setFontSize(14);
  doc.setFont(undefined, 'bold');
  doc.text('Estatísticas Gerais', 14, 62);
  doc.setFont(undefined, 'normal');
  doc.setFontSize(11);
  doc.text(`Total de Conversas: ${analytics.totalConversations}`, 20, 70);
  doc.text(`Alunos Ativos: ${analytics.activeStudents}`, 20, 77);
  doc.text(`Satisfação: ${analytics.satisfaction}%`, 20, 84);
  doc.text(`Tempo Médio de Resposta: ${analytics.avgResponseTime}s`, 20, 91);
  
  // Top questions table
  doc.setFontSize(14);
  doc.setFont(undefined, 'bold');
  doc.text('Perguntas Mais Frequentes', 14, 105);
  
  const questionsData = analytics.topQuestions.map(q => [
    q.question,
    q.count.toString(),
    q.activity,
    q.resolved ? 'Resolvida' : 'Atenção'
  ]);
  
  doc.autoTable({
    startY: 110,
    head: [['Pergunta', 'Freq.', 'Atividade', 'Status']],
    body: questionsData,
    theme: 'striped',
    headStyles: { fillColor: [59, 130, 246] },
    styles: { fontSize: 9, cellWidth: 'wrap' },
    columnStyles: {
      0: { cellWidth: 80 },
      1: { cellWidth: 20 },
      2: { cellWidth: 40 },
      3: { cellWidth: 30 }
    }
  });
  
  // Difficult topics
  const startY = doc.lastAutoTable.finalY + 10;
  doc.setFontSize(14);
  doc.setFont(undefined, 'bold');
  doc.text('Tópicos Mais Difíceis', 14, startY);
  
  const topicsData = analytics.difficultTopics.map(t => [
    t.topic,
    t.questions.toString(),
    `${t.satisfaction}%`
  ]);
  
  doc.autoTable({
    startY: startY + 5,
    head: [['Tópico', 'Perguntas', 'Satisfação']],
    body: topicsData,
    theme: 'striped',
    headStyles: { fillColor: [59, 130, 246] },
    styles: { fontSize: 10 }
  });
  
  // Insights
  const insightsY = doc.lastAutoTable.finalY + 10;
  doc.setFontSize(14);
  doc.setFont(undefined, 'bold');
  doc.text('💡 Insights Automáticos', 14, insightsY);
  doc.setFontSize(10);
  doc.setFont(undefined, 'normal');
  
  let currentY = insightsY + 7;
  analytics.insights.forEach((insight, idx) => {
    doc.text(`• ${insight.message}`, 20, currentY);
    currentY += 6;
    if (insight.suggestion) {
      doc.setTextColor(100, 100, 100);
      doc.text(`  💡 ${insight.suggestion}`, 24, currentY);
      doc.setTextColor(0, 0, 0);
      currentY += 6;
    }
  });
  
  doc.save(`analytics_chatbot_${classData.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
};

/**
 * Export teacher analytics dashboard to PDF
 * Recebe um objeto com os principais dados já agregados na tela de Analytics do professor
 */
export const exportTeacherAnalyticsDashboardToPDF = (analytics) => {
  const {
    period,
    kpis,
    gradeEvolution,
    classComparison,
    gradeDistribution,
    weeklyTrends,
    topStudents,
    bottomStudents,
  } = analytics || {};

  const doc = new jsPDF();

  try {
    // Cabeçalho
    doc.setFontSize(18);
    doc.text('Relatório de Analytics - Professor', 14, 18);

    doc.setFontSize(11);
    const periodLabel = period === 'all' ? 'Todo o período' : `Últimos ${period} dias`;
    doc.text(`Período: ${periodLabel}`, 14, 26);
    doc.text(`Data: ${new Date().toLocaleDateString('pt-BR')}`, 14, 32);

    // KPIs principais
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text('Visão Geral', 14, 42);
    doc.setFontSize(11);
    doc.setFont(undefined, 'normal');

    const kpiRows = [
      ['Total de Alunos', String(kpis?.totalStudents ?? 0)],
      ['Total de Atividades', String(kpis?.totalActivities ?? 0)],
      ['Atividades em Aberto', String(kpis?.openActivities ?? 0)],
      ['Correções Pendentes', String(kpis?.pendingCorrections ?? 0)],
      ['Nota Média Geral', (kpis?.avgGrade ?? 0).toFixed(2)],
      ['Entrega no Prazo', `${(kpis?.onTimeRate ?? 0).toFixed(1)}%`],
    ];

    doc.autoTable({
      startY: 46,
      head: [['Indicador', 'Valor']],
      body: kpiRows,
      theme: 'striped',
      headStyles: { fillColor: [59, 130, 246] },
      styles: { fontSize: 10 },
    });

    // Evolução de notas (resumo)
    let y = doc.lastAutoTable.finalY + 8;
    doc.setFontSize(13);
    doc.setFont(undefined, 'bold');
    doc.text('Evolução das notas (amostra)', 14, y);
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');

    const evoSample = (gradeEvolution || []).slice(-10);
    if (evoSample.length > 0) {
      const evoRows = evoSample.map((row) => [row.date, (row.media ?? 0).toFixed(2)]);
      doc.autoTable({
        startY: y + 4,
        head: [['Dia', 'Média']],
        body: evoRows,
        theme: 'striped',
        headStyles: { fillColor: [59, 130, 246] },
        styles: { fontSize: 9 },
      });
      y = doc.lastAutoTable.finalY + 8;
    } else {
      doc.text('Sem dados suficientes para evolução de notas.', 14, y + 4);
      y += 12;
    }

    // Comparação entre turmas
    doc.setFontSize(13);
    doc.setFont(undefined, 'bold');
    doc.text('Comparação entre turmas', 14, y);
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');

    const classRows = (classComparison || []).map((c) => [
      c.name,
      (c.media ?? 0).toFixed(2),
      String(c.alunos ?? ''),
      String(c.atividades ?? ''),
    ]);

    if (classRows.length > 0) {
      doc.autoTable({
        startY: y + 4,
        head: [['Turma', 'Média', 'Alunos', 'Atividades']],
        body: classRows,
        theme: 'striped',
        headStyles: { fillColor: [79, 70, 229] },
        styles: { fontSize: 9 },
      });
      y = doc.lastAutoTable.finalY + 8;
    } else {
      doc.text('Nenhuma turma com dados disponíveis.', 14, y + 4);
      y += 12;
    }

    // Distribuição de notas (faixas)
    doc.setFontSize(13);
    doc.setFont(undefined, 'bold');
    doc.text('Distribuição de notas (0-10)', 14, y);
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');

    const distRows = (gradeDistribution || []).map((d) => [d.range, String(d.count ?? 0)]);
    if (distRows.length > 0) {
      doc.autoTable({
        startY: y + 4,
        head: [['Faixa', 'Quantidade']],
        body: distRows,
        theme: 'striped',
        headStyles: { fillColor: [79, 70, 229] },
        styles: { fontSize: 9 },
      });
      y = doc.lastAutoTable.finalY + 8;
    } else {
      doc.text('Nenhuma nota registrada para distribuição.', 14, y + 4);
      y += 12;
    }

    // Top alunos
    doc.setFontSize(13);
    doc.setFont(undefined, 'bold');
    doc.text('Top alunos', 14, y);
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');

    const topRows = (topStudents || []).map((s, idx) => [
      String(idx + 1),
      s.name || 'Sem nome',
      (s.avgGrade ?? 0).toFixed(2),
      String(s.activities ?? 0),
      `${s.onTimeRate ?? 0}%`,
    ]);

    if (topRows.length > 0) {
      doc.autoTable({
        startY: y + 4,
        head: [['Posição', 'Aluno', 'Média', 'Atividades', 'No prazo']],
        body: topRows,
        theme: 'striped',
        headStyles: { fillColor: [22, 163, 74] },
        styles: { fontSize: 9 },
      });
      y = doc.lastAutoTable.finalY + 8;
    } else {
      doc.text('Sem alunos em destaque positivo neste período.', 14, y + 4);
      y += 12;
    }

    // Alunos que precisam de atenção
    doc.setFontSize(13);
    doc.setFont(undefined, 'bold');
    doc.text('Alunos que precisam de atenção', 14, y);
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');

    const bottomRows = (bottomStudents || []).map((s) => [
      s.name || 'Sem nome',
      (s.avgGrade ?? 0).toFixed(2),
      String(s.activities ?? 0),
      `${s.onTimeRate ?? 0}%`,
    ]);

    if (bottomRows.length > 0) {
      doc.autoTable({
        startY: y + 4,
        head: [['Aluno', 'Média', 'Atividades', 'No prazo']],
        body: bottomRows,
        theme: 'striped',
        headStyles: { fillColor: [234, 179, 8] },
        styles: { fontSize: 9 },
      });
      y = doc.lastAutoTable.finalY + 8;
    } else {
      doc.text('Nenhum aluno em destaque negativo neste período.', 14, y + 4);
    }

    doc.save(`analytics_professor_${new Date().toISOString().split('T')[0]}.pdf`);
  } catch (error) {
    logger.error('Erro ao gerar PDF de analytics do professor:', error);
    throw error;
  }
};

export default {
  exportGradesToPDF,
  exportGradesToExcel,
  exportClassReportToPDF,
  exportDashboardToPNG,
  exportAnalyticsReportToPDF,
  exportTeacherAnalyticsDashboardToPDF
};
