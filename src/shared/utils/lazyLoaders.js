// Lazy loading for heavy dependencies
export const loadExcelJS = async () => {
  try {
    const ExcelJS = await import('exceljs');
    return ExcelJS.default || ExcelJS;
  } catch (error) {
    console.error('Failed to load ExcelJS:', error);
    throw error;
  }
};

// Export all lazy loaders
export default {
  loadExcelJS,
};
