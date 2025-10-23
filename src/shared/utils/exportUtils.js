import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';

/**
 * Utilitários de Exportação - PDF e Excel
 */

/**
 * Exporta dados para PDF
 * @param {Array} data - Array de objetos com os dados
 * @param {string} filename - Nome do arquivo (sem extensão)
 * @param {Array} columns - Array de objetos {header: string, key: string}
 * @param {Object} options - Opções adicionais
 */
export const exportToPDF = (data, filename, columns, options = {}) => {
  const {
    title = 'TamanduAI - Relatório',
    subtitle = null,
    orientation = 'portrait', // ou 'landscape'
    pageSize = 'a4'
  } = options;

  const doc = new jsPDF({
    orientation,
    unit: 'mm',
    format: pageSize
  });

  // Header
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(title, 14, 20);

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 14, 28);

  if (subtitle) {
    doc.text(subtitle, 14, 34);
  }

  // Table
  doc.autoTable({
    head: [columns.map(c => c.header)],
    body: data.map(row => columns.map(c => row[c.key] || '-')),
    startY: subtitle ? 40 : 35,
    theme: 'grid',
    headStyles: {
      fillColor: [59, 130, 246],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 10
    },
    styles: {
      font: 'helvetica',
      fontSize: 9,
      cellPadding: 3
    },
    alternateRowStyles: {
      fillColor: [245, 247, 250]
    },
    margin: { top: 10, left: 14, right: 14 },
    didDrawPage: (data) => {
      // Footer
      const pageCount = doc.internal.getNumberOfPages();
      doc.setFontSize(9);
      doc.setTextColor(150);
      doc.text(
        `Página ${data.pageNumber} de ${pageCount}`,
        doc.internal.pageSize.getWidth() / 2,
        doc.internal.pageSize.getHeight() - 10,
        { align: 'center' }
      );
    }
  });

  doc.save(`${filename}.pdf`);
};

/**
 * Exporta dados para Excel
 * @param {Array} data - Array de objetos com os dados
 * @param {string} filename - Nome do arquivo (sem extensão)
 * @param {string} sheetName - Nome da planilha
 * @param {Object} options - Opções adicionais
 */
export const exportToExcel = (data, filename, sheetName = 'Dados', options = {}) => {
  const {
    columnWidths = {},
    formatting = {}
  } = options;

  // Criar worksheet
  const ws = XLSX.utils.json_to_sheet(data);

  // Aplicar larguras de coluna
  if (Object.keys(columnWidths).length > 0) {
    ws['!cols'] = Object.values(columnWidths).map(width => ({ wch: width }));
  }

  // Aplicar formatação de células
  Object.keys(formatting).forEach(cell => {
    if (ws[cell]) {
      ws[cell].s = formatting[cell];
    }
  });

  // Criar workbook
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);

  // Adicionar metadados
  wb.Props = {
    Title: filename,
    Author: 'TamanduAI',
    CreatedDate: new Date()
  };

  // Salvar arquivo
  XLSX.writeFile(wb, `${filename}.xlsx`);
};

/**
 * Exporta múltiplas planilhas para Excel
 * @param {Object} sheets - Objeto {sheetName: data}
 * @param {string} filename - Nome do arquivo (sem extensão)
 */
export const exportMultipleSheetsToExcel = (sheets, filename) => {
  const wb = XLSX.utils.book_new();

  Object.entries(sheets).forEach(([sheetName, data]) => {
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
  });

  wb.Props = {
    Title: filename,
    Author: 'TamanduAI',
    CreatedDate: new Date()
  };

  XLSX.writeFile(wb, `${filename}.xlsx`);
};

/**
 * Exporta relatório completo com gráficos (PDF)
 * @param {Object} reportData - Dados do relatório
 * @param {string} filename - Nome do arquivo
 */
export const exportDetailedReport = (reportData, filename) => {
  const {
    title,
    summary,
    tables,
    charts
  } = reportData;

  const doc = new jsPDF();
  let yPosition = 20;

  // Título
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text(title, 14, yPosition);
  yPosition += 10;

  // Data
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 14, yPosition);
  yPosition += 15;

  // Sumário
  if (summary) {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Sumário Executivo', 14, yPosition);
    yPosition += 8;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    summary.forEach(item => {
      doc.text(`• ${item}`, 18, yPosition);
      yPosition += 6;
    });
    yPosition += 10;
  }

  // Tabelas
  if (tables && tables.length > 0) {
    tables.forEach(table => {
      if (yPosition > 250) {
        doc.addPage();
        yPosition = 20;
      }

      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text(table.title, 14, yPosition);
      yPosition += 8;

      doc.autoTable({
        head: [table.columns.map(c => c.header)],
        body: table.data.map(row => table.columns.map(c => row[c.key] || '-')),
        startY: yPosition,
        theme: 'grid',
        headStyles: { fillColor: [59, 130, 246] },
        styles: { fontSize: 9 }
      });

      yPosition = doc.lastAutoTable.finalY + 15;
    });
  }

  // Gráficos (se tiver canvas/imagem)
  if (charts && charts.length > 0) {
    charts.forEach(chart => {
      if (yPosition > 200) {
        doc.addPage();
        yPosition = 20;
      }

      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text(chart.title, 14, yPosition);
      yPosition += 8;

      if (chart.image) {
        doc.addImage(chart.image, 'PNG', 14, yPosition, 180, 100);
        yPosition += 110;
      }
    });
  }

  doc.save(`${filename}.pdf`);
};

/**
 * Exporta CSV
 * @param {Array} data - Array de objetos
 * @param {string} filename - Nome do arquivo
 */
export const exportToCSV = (data, filename) => {
  if (!data || data.length === 0) {
    console.error('Nenhum dado para exportar');
    return;
  }

  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(','),
    ...data.map(row => headers.map(header => {
      const value = row[header];
      // Escapar vírgulas e aspas
      return typeof value === 'string' && (value.includes(',') || value.includes('"'))
        ? `"${value.replace(/"/g, '""')}"`
        : value;
    }).join(','))
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${filename}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
};

export default {
  exportToPDF,
  exportToExcel,
  exportMultipleSheetsToExcel,
  exportDetailedReport,
  exportToCSV
};
