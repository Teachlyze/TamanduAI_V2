import React, { useState, useEffect } from 'react';
import { MessageSquare } from 'lucide-react';
import { Card } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { DashboardHeader } from '@/shared/design';
import { supabase } from '@/shared/services/supabaseClient';
import { useAuth } from '@/shared/hooks/useAuth';

const StudentFeedbackPage = () => {
  const { user } = useAuth();
  const [feedbacks, setFeedbacks] = useState([]);

  useEffect(() => {
    loadFeedbacks();
  }, [user]);

  const loadFeedbacks = async () => {
    if (!user) return;

    const { data: submissions } = await supabase
      .from('submissions')
      .select(`
        id,
        activity:activities(title),
        feedback:feedbacks(comment, created_at)
      `)
      .eq('student_id', user.id)
      .not('feedback', 'is', null);

    setFeedbacks(submissions || []);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-6">
      <DashboardHeader title="Feedbacks" subtitle="Comentários dos professores" role="student" />
      
      <div className="space-y-4">
        {feedbacks.length > 0 ? (
          feedbacks.map(item => (
            <Card key={item.id} className="p-6 bg-white dark:bg-slate-900">
              <div className="flex items-start justify-between mb-3">
                <h3 className="font-bold">{item.activity?.title}</h3>
                <Badge>Feedback</Badge>
              </div>
              <p className="text-slate-600 dark:text-slate-400">
                {item.feedback?.[0]?.comment || 'Sem comentários'}
              </p>
              <p className="text-xs text-slate-500 mt-2">
                {item.feedback?.[0]?.created_at 
                  ? new Date(item.feedback[0].created_at).toLocaleDateString('pt-BR')
                  : ''}
              </p>
            </Card>
          ))
        ) : (
          <Card className="p-8 bg-white dark:bg-slate-900 text-center">
            <MessageSquare className="w-16 h-16 mx-auto mb-4 text-slate-400" />
            <p className="text-slate-600">Nenhum feedback ainda</p>
          </Card>
        )}
      </div>
    </div>
  );
};

export default StudentFeedbackPage;
