import { supabase } from '@/lib/supabaseClient';

/**
 * Create a new batch grading job
 * @param {string} classId - The ID of the class
 * @param {string} activityId - The ID of the activity
 * @param {File} file - The file containing submissions to grade
 * @returns {Promise<Object>} - The created batch grading job
 */
export const createBatchGradingJob = async (classId, activityId, file) => {
  try {
    const userId = (await supabase.auth.getUser()).data.user?.id;
    if (!userId) throw new Error('User not authenticated');

    // Upload the file to storage
    const fileExt = file.name.split('.').pop();
    const fileName = `batch-grading/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
    
    const { error: uploadError } = await supabase.storage
      .from('batch-grading')
      .upload(fileName, file);

    if (uploadError) throw uploadError;

    // Get the public URL (commented out as it's not currently used)
    // const { data: { publicUrl } } = supabase.storage
    //   .from('batch-grading')
    //   .getPublicUrl(fileName);

    // Create the batch grading job
    const { data, error } = await supabase
      .from('batch_grading_jobs')
      .insert([
        { 
          user_id: userId,
          class_id: classId,
          activity_id: activityId,
          status: 'pending',
          file_path: fileName
        }
      ])
      .select()
      .single();

    if (error) throw error;

    // Start processing the job
    processBatchGradingJob(data.id);

    return data;
  } catch (error) {
    console.error('Error creating batch grading job:', error);
    throw error;
  }
};

/**
 * Process a batch grading job
 * @param {string} jobId - The ID of the job to process
 */
const processBatchGradingJob = async (jobId) => {
  try {
    // Update job status to processing
    const { data: job, error: jobError } = await supabase
      .from('batch_grading_jobs')
      .update({ status: 'processing' })
      .eq('id', jobId)
      .select()
      .single();

    if (jobError) throw jobError;

    // In a real implementation, you would:
    // 1. Download the file from storage
    // 2. Parse the file (e.g., CSV, Excel)
    // 3. For each submission in the file:
    //    - Grade the submission
    //    - Save the results
    //    - Update the progress
    
    // This is a simplified example
    const results = [];
    let processed = 0;
    const total = 10; // This would be the actual count from the file
    
    // Simulate processing
    for (let i = 0; i < total; i++) {
      // Simulate processing time
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Simulate a grade
      const grade = Math.floor(Math.random() * 100);
      
      // Save the result
      const { data: result, error: resultError } = await supabase
        .from('batch_grading_results')
        .insert([
          {
            job_id: jobId,
            user_id: job.user_id, // In reality, this would be the student's ID
            grade,
            feedback: `Automated feedback for submission ${i + 1}`,
            processed_at: new Date().toISOString()
          }
        ])
        .select()
        .single();

      if (resultError) throw resultError;
      
      results.push(result);
      processed++;
      
      // Update progress
      await supabase
        .from('batch_grading_jobs')
        .update({ 
          processed_submissions: processed,
          total_submissions: total
        })
        .eq('id', jobId);
    }

    // Mark job as completed
    await supabase
      .from('batch_grading_jobs')
      .update({ 
        status: 'completed',
        results: { success: true, processed, total },
        updated_at: new Date().toISOString()
      })
      .eq('id', jobId);

  } catch (error) {
    console.error('Error processing batch grading job:', error);
    
    // Update job status to failed
    await supabase
      .from('batch_grading_jobs')
      .update({ 
        status: 'failed',
        error_message: error.message,
        updated_at: new Date().toISOString()
      })
      .eq('id', jobId);
  }
};

/**
 * Get a batch grading job by ID
 * @param {string} jobId - The ID of the job
 * @returns {Promise<Object>} - The batch grading job with results
 */
export const getBatchGradingJob = async (jobId) => {
  try {
    const { data, error } = await supabase
      .from('batch_grading_jobs')
      .select(`
        *,
        batch_grading_results (*)
      `)
      .eq('id', jobId)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error getting batch grading job:', error);
    throw error;
  }
};

/**
 * Get all batch grading jobs for a class
 * @param {string} classId - The ID of the class
 * @returns {Promise<Array>} - Array of batch grading jobs
 */
export const getBatchGradingJobsForClass = async (classId) => {
  try {
    const { data, error } = await supabase
      .from('batch_grading_jobs')
      .select('*')
      .eq('class_id', classId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error getting batch grading jobs:', error);
    throw error;
  }
};

/**
 * Get all batch grading jobs for an activity
 * @param {string} activityId - The ID of the activity
 * @returns {Promise<Array>} - Array of batch grading jobs
 */
export const getBatchGradingJobsForActivity = async (activityId) => {
  try {
    const { data, error } = await supabase
      .from('batch_grading_jobs')
      .select('*')
      .eq('activity_id', activityId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error getting batch grading jobs for activity:', error);
    throw error;
  }
};
