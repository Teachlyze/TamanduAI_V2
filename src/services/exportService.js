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

export default {
  exportGradesToPDF,
  exportGradesToExcel,
  exportClassReportToPDF
};
