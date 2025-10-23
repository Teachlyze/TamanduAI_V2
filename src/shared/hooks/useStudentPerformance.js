import { useState, useEffect } from 'react';

export const useStudentPerformance = (studentId) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPerformanceData = async () => {
      if (!studentId) return;

      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/students/${studentId}/performance`);
        if (!response.ok) {
          throw new Error('Failed to fetch student performance data');
        }

        const performanceData = await response.json();
        setData(performanceData);
      } catch (err) {
        console.error('Error fetching student performance:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchPerformanceData();
  }, [studentId]);

  return { data, loading, error };
};
