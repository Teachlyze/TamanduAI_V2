import { logger } from '@/shared/utils/logger';
// Hook customizado para carregar dados de relatórios com cache
import { useState } from 'react';
import { supabase } from '@/shared/services/supabaseClient';
import { useToast } from '@/shared/components/ui/use-toast';
import { showErrorToast } from '@/shared/utils/toastUtils';

export const useReportData = () => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const { toast } = useToast();

  const generateReport = async (reportType, targetId, period = '30') => {
    setLoading(true);
    setData(null);

    try {
      // Usar edge function com cache
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-report-data`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ 
            reportType,
            targetId,
            period
          })
        }
      );

      if (!response.ok) {
        throw new Error('Erro ao gerar relatório');
      }

      const result = await response.json();
      
      setData(result.data);

      if (result.cached) {
        toast({
          title: '⚡ Cache',
          description: 'Relatório carregado do cache (10min)',
          duration: 2000
        });
      } else {
        toast({
          title: '✅ Relatório gerado',
          description: 'Dados atualizados com sucesso'
        });
      }

      return result.data;

    } catch (error) {
      showErrorToast(
        toast,
        'Não foi possível gerar o relatório.',
        error,
        { logPrefix: '[useReportData] Erro ao gerar relatório' }
      );
      return null;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    data,
    generateReport
  };
};

// Exemplo de uso em TeacherReportsPage.jsx:
/*
import { useReportData } from './hooks/useReportData';

function TeacherReportsPage() {
  const { loading, data, generateReport } = useReportData();

  const handleGenerateReport = async (templateId) => {
    // Mostrar modal para selecionar aluno/turma
    const studentId = await showStudentPickerModal();
    
    // Gerar relatório
    const reportData = await generateReport(
      templateId, // 'individual-student', 'class-report', etc
      studentId,
      '30' // período em dias
    );

    if (reportData) {
      // Abrir preview ou gerar PDF
      showReportPreview(reportData);
    }
  };

  return (
    <div>
      {REPORT_TEMPLATES.map(template => (
        <Button onClick={() => handleGenerateReport(template.id)}>
          Gerar {template.name}
        </Button>
      ))}
    </div>
  );
}
*/
