// src/services/activityDraftService.js
import { supabase } from '@/shared/services/supabaseClient';
import { v4 as uuidv4 } from 'uuid';
import { getCurrentUser } from '@/shared/services/apiSupabase';

const BUCKET = 'activity-drafts';

// Ensure bucket exists is out of scope here; create it in Supabase if missing.

export async function saveDraft({ draftId, data }) {
  const user = await getCurrentUser();
  if (!user) throw new Error('User not authenticated');
  const id = draftId || uuidv4();
  const path = `${user.id}/${id}.json`;
  const file = new File([JSON.stringify(data)], `${id}.json`, { type: 'application/json' });

  // upsert-like behavior: try upload, else update via remove+upload
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: true, contentType: 'application/json' });
  if (error) throw error;
  return { draftId: id, path };
}

export async function loadDraft(draftId) {
  const user = await getCurrentUser();
  if (!user) throw new Error('User not authenticated');
  const path = `${user.id}/${draftId}.json`;
  const { data, error } = await supabase.storage.from(BUCKET).download(path);
  if (error) throw error;
  const text = await data.text();
  return JSON.parse(text);
}

export async function deleteDraft(draftId) {
  const user = await getCurrentUser();
  if (!user) throw new Error('User not authenticated');
  const path = `${user.id}/${draftId}.json`;
  const { error } = await supabase.storage.from(BUCKET).remove([path]);
  if (error) throw error;
  return true;
}

export async function listDrafts() {
  const user = await getCurrentUser();
  if (!user) throw new Error('User not authenticated');
  const { data, error } = await supabase.storage.from(BUCKET).list(user.id, { limit: 100, sortBy: { column: 'created_at', order: 'desc' } });
  if (error) throw error;
  // Map entries to draft IDs
  return (data || [])
    .filter((f) => f.name.endsWith('.json'))
    .map((f) => ({
      draftId: f.name.replace('.json', ''),
      name: f.name,
      created_at: f.created_at,
      updated_at: f.updated_at,
      size: f.metadata?.size || f.size,
    }));
}
