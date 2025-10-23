/**
 * Chart Helpers for Analytics Components
 * Utilities for formatting and preparing data for Recharts
 */

/**
 * Format date for chart display
 * @param {string} dateStr - Date string
 * @returns {string} - Formatted date (dd/MMM)
 */
export const formatChartDate = (dateStr) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('pt-BR', { 
    day: '2-digit', 
    month: 'short' 
  });
};

/**
 * Generate color based on value
 * @param {number} value - Numeric value
 * @param {number} threshold1 - First threshold (green/yellow)
 * @param {number} threshold2 - Second threshold (yellow/red)
 * @returns {string} - Color hex code
 */
export const getColorByValue = (value, threshold1 = 7, threshold2 = 5) => {
  if (value >= threshold1) return '#10b981'; // green
  if (value >= threshold2) return '#f59e0b'; // yellow
  return '#ef4444'; // red
};

/**
 * Calculate percentage
 * @param {number} value - Current value
 * @param {number} total - Total value
 * @returns {number} - Percentage (0-100)
 */
export const calculatePercentage = (value, total) => {
  if (!total || total === 0) return 0;
  return Math.round((value / total) * 100);
};

/**
 * Custom tooltip formatter for Recharts
 * @param {number} value - Tooltip value
 * @param {string} name - Data key name
 * @param {Object} props - Tooltip props
 * @returns {Array} - [formattedValue, formattedName]
 */
export const customTooltipFormatter = (value, name, props) => {
  const labelMap = {
    alunos: 'Alunos Presentes',
    presente: 'Presença',
    ausente: 'Ausência',
    media: 'Média',
    nota: 'Nota'
  };
  
  return [value, labelMap[name] || name];
};

/**
 * Prepare attendance data for line chart
 * @param {Array} rawData - Raw attendance data
 * @returns {Array} - Formatted chart data
 */
export const prepareAttendanceChartData = (rawData) => {
  if (!rawData || rawData.length === 0) return [];
  
  // Group by date
  const groupedByDate = {};
  
  rawData.forEach(record => {
    const date = record.attended_date;
    if (!groupedByDate[date]) {
      groupedByDate[date] = {
        date: formatChartDate(date),
        presente: 0,
        ausente: 0
      };
    }
    groupedByDate[date].presente++;
  });
  
  return Object.values(groupedByDate).sort((a, b) => 
    new Date(a.date) - new Date(b.date)
  );
};

/**
 * Prepare grade distribution data for pie chart
 * @param {Array} grades - Array of grades
 * @returns {Array} - Pie chart data
 */
export const prepareGradeDistribution = (grades) => {
  const distribution = {
    excellent: 0, // 9-10
    good: 0,      // 7-8.9
    average: 0,   // 5-6.9
    poor: 0       // 0-4.9
  };
  
  grades.forEach(grade => {
    if (grade >= 9) distribution.excellent++;
    else if (grade >= 7) distribution.good++;
    else if (grade >= 5) distribution.average++;
    else distribution.poor++;
  });
  
  return [
    { name: 'Excelente (9-10)', value: distribution.excellent, fill: '#10b981' },
    { name: 'Bom (7-8.9)', value: distribution.good, fill: '#3b82f6' },
    { name: 'Regular (5-6.9)', value: distribution.average, fill: '#f59e0b' },
    { name: 'Baixo (0-4.9)', value: distribution.poor, fill: '#ef4444' }
  ].filter(item => item.value > 0);
};

/**
 * Custom label for pie chart
 * @param {Object} entry - Pie slice data
 * @returns {string} - Label text
 */
export const renderCustomPieLabel = ({ name, percent }) => {
  return `${name}: ${(percent * 100).toFixed(0)}%`;
};

/**
 * Format large numbers (1000 -> 1K)
 * @param {number} num - Number to format
 * @returns {string} - Formatted number
 */
export const formatLargeNumber = (num) => {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
};

export default {
  formatChartDate,
  getColorByValue,
  calculatePercentage,
  customTooltipFormatter,
  prepareAttendanceChartData,
  prepareGradeDistribution,
  renderCustomPieLabel,
  formatLargeNumber
};
