/**
 * Edge Function: Import Anki Deck Package (.apkg)
 * 
 * Processes Anki .apkg files (zip containing SQLite DB + media)
 * and imports notes/cards into TamanduAI flashcard system.
 * 
 * @endpoint POST /functions/v1/import-anki
 * @auth Bearer token required
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';
import { readZip } from 'https://deno.land/x/jszip/mod.ts';
import { parseAnkiCollection, getFieldIndicesForTemplate, type AnkiNote, type AnkiModel, type AnkiCollection } from './sqlite-parser.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Limites de segurança
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
const MAX_CARDS = 10000;
const BATCH_SIZE = 100;
const MAX_MEDIA_FILES = 200;

interface ImportRequest {
  bucket: string;
  file_path: string;
  deck_id?: string | null;
  create_new_deck?: boolean;
  deck_name?: string;
  deck_description?: string;
  deck_color?: string;
}

interface ImportStats {
  total_notes: number;
  total_cards_created: number;
  notes_ignored: number;
  media_files_processed: number;
  time_ms: number;
}

serve(async (req) => {
  const startTime = Date.now();

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 1. Verificar autenticação
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    // Criar cliente Supabase com service role (sem sobrescrever Authorization)
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verificar usuário
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      console.error('Auth error:', userError);
      throw new Error('Invalid authentication token');
    }

    console.log(`[import-anki] User ${user.id} - Starting import`);

    // 2. Parsear e validar request
    const body: ImportRequest = await req.json();
    const { 
      bucket, 
      file_path, 
      deck_id,
      create_new_deck = true,
      deck_name,
      deck_description,
      deck_color = '#3B82F6'
    } = body;

    if (!bucket || !file_path) {
      throw new Error('bucket and file_path are required');
    }

    if (create_new_deck && !deck_name) {
      throw new Error('deck_name is required when create_new_deck is true');
    }

    let deckIdFinal: string;

    // 3. Se não for criar deck novo, validar que o deck existe
    if (!create_new_deck) {
      if (!deck_id) {
        throw new Error('deck_id is required when create_new_deck is false');
      }

      const { data: existingDeck, error: deckError } = await supabase
        .from('decks')
        .select('id')
        .eq('id', deck_id)
        .eq('user_id', user.id)
        .single();

      if (deckError || !existingDeck) {
        throw new Error('Deck not found or access denied');
      }

      deckIdFinal = deck_id;
      console.log(`[import-anki] Adding to existing deck ${deckIdFinal}`);
    } else {
      deckIdFinal = ''; // Will be created later
    }

    // 4. Download do arquivo .apkg do Storage
    console.log(`[import-anki] Downloading file from ${bucket}/${file_path}`);
    const { data: fileData, error: downloadError } = await supabase.storage
      .from(bucket)
      .download(file_path);

    if (downloadError || !fileData) {
      console.error('Download error:', downloadError);

      // Tentar logar corpo completo da resposta do Storage para diagnóstico
      try {
        const anyError = downloadError as any;
        const original = anyError?.originalError as Response | undefined;
        if (original && typeof original.text === 'function') {
          const bodyText = await original.text();
          console.error('[import-anki] Download error body:', bodyText);
        }
      } catch (e) {
        console.error('[import-anki] Failed to read download error body:', e);
      }

      throw new Error('Failed to download .apkg file from storage');
    }

    const fileBuffer = await fileData.arrayBuffer();
    const fileSize = fileBuffer.byteLength;

    console.log(`[import-anki] File downloaded: ${fileSize} bytes`);

    if (fileSize > MAX_FILE_SIZE) {
      throw new Error(`File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB`);
    }

    // 5. Descompactar o .apkg (zip)
    console.log('[import-anki] Extracting .apkg contents');
    const tempDir = await Deno.makeTempDir();
    const apkgPath = `${tempDir}/deck.apkg`;

    // Salvar o buffer em um arquivo temporário
    await Deno.writeFile(apkgPath, new Uint8Array(fileBuffer));

    // Ler arquivo .apkg como zip usando jszip
    const zip = await readZip(apkgPath);

    // 6. Extrair arquivo de coleção (SQLite)
    // Preferir formato mais recente (collection.anki21), com fallback para collection.anki2
    let collectionFileName = 'collection.anki21';
    let collectionEntry = zip.file(collectionFileName);

    if (!collectionEntry) {
      collectionFileName = 'collection.anki2';
      collectionEntry = zip.file(collectionFileName);
    }

    if (!collectionEntry) {
      throw new Error('Invalid .apkg file: collection.anki21/collection.anki2 not found');
    }

    const collectionData = await collectionEntry.async('uint8array');
    const collectionPath = `${tempDir}/${collectionFileName}`;
    await Deno.writeFile(collectionPath, collectionData);

    console.log(`[import-anki] Extracted ${collectionFileName}`);

    // 7. Ler dados do SQLite antes de processar mídia (para saber o que é realmente usado)
    console.log('[import-anki] Parsing SQLite database');
    const collection: AnkiCollection = await parseAnkiCollection(collectionPath);
    const notes = collection.notes;
    const models = collection.models;
    console.log(`[import-anki] Found ${notes.length} notes and ${models.size} models`);

    // Logar uma prévia da primeira nota para debug (sem spam grande)
    if (notes.length > 0) {
      const preview = notes[0];
      const noteModel = models.get(preview.mid);
      console.log('[import-anki] First note preview:', {
        id: preview.id,
        mid: preview.mid,
        modelName: noteModel?.name || 'Unknown',
        flds: preview.flds,
        tags: preview.tags,
      });
    }

    if (notes.length === 0) {
      throw new Error('No notes found in .apkg file');
    }

    if (notes.length > MAX_CARDS) {
      throw new Error(`Too many cards. Maximum is ${MAX_CARDS}`);
    }

    // 8. Ler arquivo media (JSON com mapeamento de mídia) diretamente do zip
    let mediaMap: Record<string, string> = {};
    const mediaEntry = zip.file('media');
    if (mediaEntry) {
      const mediaContent = await mediaEntry.async('string');
      mediaMap = JSON.parse(mediaContent);
      console.log(`[import-anki] Found ${Object.keys(mediaMap).length} media files in map`);
    } else {
      console.log('[import-anki] No media file found or empty');
    }

    // 9. Otimizar mídia: manter apenas arquivos realmente referenciados nas notas
    let mediaEntriesToProcess: [string, string][] = [];
    if (Object.keys(mediaMap).length > 0) {
      const referencedMedia = extractReferencedMediaFilenames(notes);

      if (referencedMedia.size > 0) {
        const allEntries = Object.entries(mediaMap);
        const filtered: [string, string][] = [];

        for (const [mediaId, fileName] of allEntries) {
          if (referencedMedia.has(fileName)) {
            filtered.push([mediaId, fileName]);
          }
        }

        const skipped = allEntries.length - filtered.length;
        console.log(`[import-anki] Media optimization: ${referencedMedia.size} referenced filenames, ${filtered.length} entries kept, ${skipped} skipped from media map`);
        mediaEntriesToProcess = filtered;
      } else {
        console.log('[import-anki] No media references found in notes; skipping media extraction/upload.');
        mediaEntriesToProcess = [];
      }
    }

    // 10. Aplicar limite máximo de arquivos de mídia processados
    if (mediaEntriesToProcess.length > MAX_MEDIA_FILES) {
      console.log(`[import-anki] Media entries exceed limit (${mediaEntriesToProcess.length} > ${MAX_MEDIA_FILES}). Only first ${MAX_MEDIA_FILES} will be processed.`);
      mediaEntriesToProcess = mediaEntriesToProcess.slice(0, MAX_MEDIA_FILES);
    }

    // Extrair arquivos de mídia numerados para o diretório temporário
    for (const [mediaId, fileName] of mediaEntriesToProcess) {
      const mediaFile = zip.file(mediaId);
      if (!mediaFile) {
        console.warn(`[import-anki] Media file ${mediaId} (${fileName}) not found in zip`);
        continue;
      }

      const mediaData = await mediaFile.async('uint8array');
      const mediaFilePath = `${tempDir}/${mediaId}`;
      await Deno.writeFile(mediaFilePath, mediaData);
    }

    // 11. Processar mídia e fazer upload para Storage
    const mediaUrls: Record<string, string> = {};
    const tempPrefix = `${user.id}/temp-${Date.now()}`;
    const totalMedia = mediaEntriesToProcess.length;
    console.log(`[import-anki] Uploading ${totalMedia} media files`);
    
    for (const [mediaId, fileName] of mediaEntriesToProcess) {
      const mediaFilePath = `${tempDir}/${mediaId}`;
      
      try {
        const mediaFileData = await Deno.readFile(mediaFilePath);
        
        // Upload para bucket flashcards-media (prefixo temp único por importação)
        const storagePath = `${tempPrefix}/${fileName}`;
        const { error: uploadError } = await supabase.storage
          .from('flashcards-media')
          .upload(storagePath, mediaFileData, {
            contentType: getContentType(fileName),
            upsert: true
          });

        if (!uploadError) {
          // Gerar URL pública (ou signed se preferir)
          const { data: urlData } = supabase.storage
            .from('flashcards-media')
            .getPublicUrl(storagePath);
          
          if (urlData?.publicUrl) {
            mediaUrls[fileName] = urlData.publicUrl;
            console.log(`[import-anki] Uploaded media: ${fileName}`);
          }
        } else {
          console.error(`[import-anki] Failed to upload ${fileName}:`, uploadError);
        }
      } catch (error) {
        console.error(`[import-anki] Error processing media ${fileName}:`, error);
      }
    }

    console.log(`[import-anki] Processed ${Object.keys(mediaUrls).length} media files`);

    // 10. Criar deck se necessário
    if (create_new_deck) {
      console.log(`[import-anki] Creating new deck: ${deck_name}`);
      const { data: newDeck, error: createError } = await supabase
        .from('decks')
        .insert({
          user_id: user.id,
          name: deck_name,
          description: deck_description || null,
          color: deck_color,
          icon: 'BookOpen'
        })
        .select('id')
        .single();

      if (createError || !newDeck) {
        console.error('Deck creation error:', createError);
        throw new Error('Failed to create deck');
      }

      deckIdFinal = newDeck.id;
      console.log(`[import-anki] Deck created: ${deckIdFinal}`);

      // Atualizar paths de mídia com deck_id correto
      const updatedMediaUrls: Record<string, string> = {};
      for (const [fileName, tempUrl] of Object.entries(mediaUrls)) {
        const tempPath = tempUrl.split('/flashcards-media/')[1];
        const newPath = tempPath.replace(/temp-\d+/, deckIdFinal);
        
        // Mover arquivo no storage
        try {
          const { error: moveError } = await supabase.storage
            .from('flashcards-media')
            .move(tempPath, newPath);
          
          if (!moveError) {
            const { data: urlData } = supabase.storage
              .from('flashcards-media')
              .getPublicUrl(newPath);
            
            updatedMediaUrls[fileName] = urlData?.publicUrl || tempUrl;
          } else {
            updatedMediaUrls[fileName] = tempUrl;
          }
        } catch {
          updatedMediaUrls[fileName] = tempUrl;
        }
      }
      
      Object.assign(mediaUrls, updatedMediaUrls);
    }

    // 11. Converter notes para cards
    console.log('[import-anki] Converting notes to cards');
    const cards = notes.map(note => {
      const model = models.get(note.mid);
      return convertNoteToCard(note, model, deckIdFinal, user.id, mediaUrls);
    });
    const validCards = cards.filter(card => card.front && card.back);
    
    console.log(`[import-anki] Generated ${validCards.length} valid cards from ${notes.length} notes`);

    // 12. Inserir cards no banco em batches
    let totalCreated = 0;
    for (let i = 0; i < validCards.length; i += BATCH_SIZE) {
      const batch = validCards.slice(i, i + BATCH_SIZE);
      
      const { error: insertError } = await supabase
        .from('cards')
        .insert(batch);

      if (insertError) {
        console.error(`[import-anki] Batch insert error:`, insertError);
        throw new Error(`Failed to insert cards: ${insertError.message}`);
      }

      totalCreated += batch.length;
      console.log(`[import-anki] Inserted batch ${Math.floor(i / BATCH_SIZE) + 1}: ${batch.length} cards`);
    }

    // 13. Limpar arquivos temporários
    try {
      await Deno.remove(tempDir, { recursive: true });
    } catch (error) {
      console.error('[import-anki] Failed to clean temp files:', error);
    }

    const endTime = Date.now();
    const stats: ImportStats = {
      total_notes: notes.length,
      total_cards_created: totalCreated,
      notes_ignored: notes.length - validCards.length,
      media_files_processed: Object.keys(mediaUrls).length,
      time_ms: endTime - startTime
    };

    console.log(`[import-anki] Import completed:`, stats);

    return new Response(
      JSON.stringify({
        success: true,
        deck_id: deckIdFinal,
        created_new_deck: create_new_deck,
        import_stats: stats
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('[import-anki] Error:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Import failed',
        code: 'IMPORT_ERROR'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});


/**
 * Convert Anki note to TamanduAI card format using template mapping
 */
function convertNoteToCard(
  note: AnkiNote,
  model: AnkiModel | undefined,
  deckId: string,
  userId: string,
  mediaUrls: Record<string, string>
): any {
  // Parse fields (separated by \x1f)
  const rawFields = (note.flds || '').split('\x1f');
  const fields = rawFields.map((f) => (f || '').trim());
  const nonEmptyFields = fields.filter((f) => f.length > 0);

  let front = '';
  let back = '';

  // Try template-based conversion first
  if (model && model.tmpls && model.tmpls.length > 0) {
    const templateMapping = getFieldIndicesForTemplate(model);
    
    if (templateMapping.frontIndices.length > 0 || templateMapping.backIndices.length > 0) {
      // Build front from template indices
      const frontParts: string[] = [];
      for (const idx of templateMapping.frontIndices) {
        if (fields[idx] && fields[idx].trim()) {
          frontParts.push(fields[idx].trim());
        }
      }
      
      // Build back from template indices
      const backParts: string[] = [];
      for (const idx of templateMapping.backIndices) {
        if (fields[idx] && fields[idx].trim()) {
          // Skip if it's the same as front (avoid duplication)
          if (!frontParts.includes(fields[idx].trim())) {
            backParts.push(fields[idx].trim());
          }
        }
      }
      
      front = frontParts.join('\n\n');
      back = backParts.length > 0 ? backParts.join('\n\n') : front;
      
      // For cloze cards, process cloze deletions
      if (templateMapping.isCloze) {
        const clozeRegex = /\{\{c\d+::(.*?)(::.*?)?\}\}/g;
        if (clozeRegex.test(front)) {
          const frontWithBlanks = front.replace(clozeRegex, '[...]');
          back = front;  // Back shows the complete text
          front = frontWithBlanks;
        }
      }
      
      console.log(`[import-anki] Note ${note.id} converted using template "${model.name}"`);
    }
  }
  
  // Fallback to heuristic-based conversion if template didn't work
  if (!front || !back) {
    console.log(`[import-anki] Note ${note.id} falling back to heuristic conversion`);

  if (nonEmptyFields.length === 0) {
    console.log(`[import-anki] Note ${note.id} ignored: no non-empty fields`);
  } else if (nonEmptyFields.length === 1) {
    const field = nonEmptyFields[0];

    // Tentativa de suporte simples a Cloze: front com lacunas, back com texto completo
    const clozeRegex = /\{\{c\d+::(.*?)(::.*?)?\}\}/g;
    if (clozeRegex.test(field)) {
      const frontText = field.replace(clozeRegex, ' [...] ');
      front = frontText.trim();
      back = field.trim();
    } else {
      front = field;
      back = field;
    }
  } else {
    type FieldCandidate = {
      index: number;
      text: string;
      cleanText: string;
      length: number;
      hasCyrillic: boolean;
      hasCJK: boolean;
      hasLatin: boolean;
      latinCount: number;
      cyrillicCount: number;
      cjkCount: number;
      hasHtml: boolean;
      lineCount: number;
      numericOnly: boolean;
      hasSound: boolean;
      isSoundOnly: boolean;
      hasCloze: boolean;
      isMetaLabel: boolean;
      baseScore: number;
      frontScore: number;
      backScore: number;
    };

    const soundRegex = /\[sound:[^\]]+\]/i;
    const clozeRegexMulti = /\{\{c\d+::/i;

    const candidates: FieldCandidate[] = nonEmptyFields.map((text, index) => {
      const cleanText = text.trim();
      const length = cleanText.length;
      const numericOnly = /^[\d.,]+$/.test(cleanText);
      const hasCyrillic = /[\u0400-\u04FF]/.test(cleanText);
      const hasCJK = /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/.test(cleanText);
      const hasLatin = /[A-Za-z]/.test(cleanText);
      const latinMatches = cleanText.match(/[A-Za-z]/g) || [];
      const cyrillicMatches = cleanText.match(/[\u0400-\u04FF]/g) || [];
      const cjkMatches = cleanText.match(/[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/g) || [];
      const latinCount = latinMatches.length;
      const cyrillicCount = cyrillicMatches.length;
      const cjkCount = cjkMatches.length;
      const hasHtml = /<[^>]+>/.test(cleanText);
      const lineCount = (cleanText.match(/\n/g) || []).length + 1;
      const hasSound = soundRegex.test(cleanText);
      const textWithoutSound = cleanText.replace(soundRegex, '').trim();
      const isSoundOnly = hasSound && textWithoutSound.length === 0;
      const hasCloze = clozeRegexMulti.test(cleanText);
      const isLatinOnly = hasLatin && !hasCyrillic && !hasCJK;
      const hasPunctuation = /[.!?;:]/.test(cleanText);
      const hasDigits = /\d/.test(cleanText);
      const wordCount = cleanText.split(/\s+/).filter(Boolean).length;
      const isSingleLine = lineCount === 1;

      let baseScore = 0;

      if (numericOnly) baseScore -= 10;
      if (length < 2) baseScore -= 2;
      if (length >= 5 && length <= 120) baseScore += 2;
      if (length > 120 && length <= 400) baseScore += 1;
      if (length > 800) baseScore -= 3;
      if (lineCount > 8) baseScore -= 2;
      if (/[A-Za-zÀ-ÿА-Яа-я]/.test(cleanText)) baseScore += 1;
      if (isSoundOnly) baseScore -= 5;

      let frontScore = baseScore;
      const targetScriptCount = Math.max(cyrillicCount, cjkCount);
      if (hasCyrillic || hasCJK) frontScore += 6;
      if (!hasCyrillic && !hasCJK && hasLatin) frontScore -= 1;
      if (targetScriptCount > 0) {
        frontScore += Math.min(targetScriptCount, 40) * 0.3;
        if (latinCount > 0) {
          frontScore -= Math.min(latinCount, 40) * 0.2;
        }
      }
      if (hasHtml && length > 200) frontScore -= 4;
      if (hasHtml && length > 800) frontScore -= 4;

      if (hasCloze) {
        // Em decks de gramática, o campo com Cloze geralmente é o enunciado principal
        frontScore += 8;
      }

      let backScore = baseScore;
      if (hasLatin) backScore += 4;
      if ((hasCyrillic || hasCJK) && hasLatin) backScore += 1;
      if (!hasLatin && (hasCyrillic || hasCJK)) backScore -= 1;
      if (latinCount > 0) {
        backScore += Math.min(latinCount, 60) * 0.2;
      }
      if (targetScriptCount > 0 && latinCount === 0) {
        backScore -= 2;
      }
      if (hasHtml && length > 200 && length <= 800) backScore += 1;
      if (length > 800) backScore -= 1;

      if (hasCloze) {
        // Para o verso também é importante, mas um pouco menos que para a frente
        backScore += 4;
      }

      const isMetaLabel =
        isLatinOnly &&
        isSingleLine &&
        !hasPunctuation &&
        !hasDigits &&
        wordCount >= 2 &&
        wordCount <= 6 &&
        length <= 60;

      return {
        index,
        text,
        cleanText,
        length,
        hasCyrillic,
        hasCJK,
        hasLatin,
        latinCount,
        cyrillicCount,
        cjkCount,
        hasHtml,
        lineCount,
        numericOnly,
        hasSound,
        isSoundOnly,
        hasCloze,
        isMetaLabel,
        baseScore,
        frontScore,
        backScore,
      };
    });

    const hasLongTextCandidate = candidates.some(
      (c) => !c.numericOnly && !c.isSoundOnly && c.length >= 80,
    );

    for (const c of candidates) {
      if (!c.isMetaLabel) continue;
      c.frontScore -= hasLongTextCandidate ? 8 : 4;
    }

    let frontCandidate: FieldCandidate | null = null;
    let backCandidate: FieldCandidate | null = null;

    for (const c of candidates) {
      if (c.isSoundOnly || c.numericOnly) continue;
      if (!frontCandidate || c.frontScore > frontCandidate.frontScore) {
        frontCandidate = c;
      }
    }

    for (const c of candidates) {
      if (c.isSoundOnly || c.numericOnly) continue;
      if (frontCandidate && c.index === frontCandidate.index) continue;
      if (!backCandidate || c.backScore > backCandidate.backScore) {
        backCandidate = c;
      }
    }

    frontCandidate = frontCandidate ?? candidates.find((c) => !c.isSoundOnly && !c.numericOnly) ?? candidates[0];
    backCandidate = backCandidate ?? candidates.find((c) => !c.isSoundOnly && !c.numericOnly && c.index !== frontCandidate.index) ?? frontCandidate;

    const backExtras: FieldCandidate[] = [];
    for (const c of candidates) {
      if (!backCandidate) break;
      if (c.index === frontCandidate.index || c.index === backCandidate.index) continue;
      if (c.isSoundOnly || c.numericOnly) continue;
      if (c.length > 600) continue;
      if (c.backScore >= backCandidate.backScore - 2) {
        backExtras.push(c);
      }
    }
    backExtras.sort((a, b) => b.backScore - a.backScore);
    const limitedBackExtras = backExtras.slice(0, 3);

    front = frontCandidate.text;
    const backParts = [backCandidate.text, ...limitedBackExtras.map((c) => c.text)];
    back = backParts.join('\n\n');
  }
  }  // End of fallback block

  // Parse tags
  const tags = (note.tags || '')
    .trim()
    .split(' ')
    .filter((t: string) => t.length > 0);

  // Replace media references
  front = replaceMediaReferences(front, mediaUrls);
  back = replaceMediaReferences(back, mediaUrls);

  front = stripHtmlTags(front);
  back = stripHtmlTags(back);

  // Em muitos decks de alfabeto, campos como "letter n" contêm um rótulo em inglês
  // seguido de um único caractere em script alvo. Nesse caso, usamos apenas o(s)
  // token(s) com caracteres não-latinos (cirílico/CJK) como frente.
  const refinedFront = refineFrontForTargetScript(front);
  if (refinedFront) {
    front = refinedFront;
  }

  if (!front || !back) {
    console.log(`[import-anki] Note ${note.id} ignored after conversion (empty front/back)`, {
      frontLength: front?.length || 0,
      backLength: back?.length || 0,
    });
  }

  return {
    deck_id: deckId,
    user_id: userId,
    front,
    back,
    card_type: 'basic',
    tags
  };
}

/**
 * Replace Anki media references with URLs
 */
function replaceMediaReferences(text: string, mediaUrls: Record<string, string>): string {
  let result = text;

  // Replace [sound:filename.mp3] with link
  result = result.replace(/\[sound:([^\]]+)\]/g, (match, filename) => {
    const url = mediaUrls[filename];
    return url ? `🔊 Áudio: ${url}` : match;
  });

  // Replace <img src="filename.png"> with link
  result = result.replace(/<img\s+src=["']([^"']+)["'][^>]*>/gi, (match, filename) => {
    const url = mediaUrls[filename];
    return url ? `🖼️ Imagem: ${url}` : match;
  });

  return result;
}

function stripHtmlTags(text: string): string {
  if (!text) return text;

  let result = text;

  result = result.replace(/<br\s*\/?>(\s*)/gi, '\n');
  result = result.replace(/<\/?p\s*>/gi, '\n');
  result = result.replace(/<\/?div\s*>/gi, '\n');

  result = result.replace(/<[^>]+>/g, '');

   // Entidades HTML comuns
  result = result.replace(/&nbsp;/gi, ' ');
  result = result.replace(/&amp;/gi, '&');
  result = result.replace(/&lt;/gi, '<');
  result = result.replace(/&gt;/gi, '>');
  result = result.replace(/&quot;/gi, '"');
  result = result.replace(/&#39;/g, "'");

  result = result.replace(/\n{3,}/g, '\n\n');

  return result.trim();
}

function refineFrontForTargetScript(text: string): string | null {
  const trimmed = (text || '').trim();
  if (!trimmed) return null;

  const hasLatin = /[A-Za-z]/.test(trimmed);
  const hasTarget = /[\u0400-\u04FF\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/.test(trimmed);
  if (!hasLatin || !hasTarget) {
    // Já é puro na língua alvo ou puro em latim; não mexer
    return null;
  }

  const tokens = trimmed.split(/\s+/);
  const targetTokens = tokens.filter((t) => /[\u0400-\u04FF\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/.test(t));
  const joined = targetTokens.join(' ').trim();
  if (!joined) return null;

  // Evitar mudanças drásticas em frases grandes: se quase todo o texto já é alvo,
  // mantemos como está. Ex.: frase longa em russo sem inglês auxiliar.
  const ratio = joined.length / trimmed.length;
  if (ratio > 0.8) {
    return null;
  }

  return joined;
}

/**
 * Extract media filenames referenced in Anki notes
 */
function extractReferencedMediaFilenames(notes: AnkiNote[]): Set<string> {
  const result = new Set<string>();
  const soundRegex = /\[sound:([^\]]+)\]/g;
  const imgRegex = /<img\s+[^>]*src=["']([^"']+)["'][^>]*>/gi;

  for (const note of notes) {
    const fields = (note.flds || '').split('\x1f');

    for (const field of fields) {
      let match: RegExpExecArray | null;

      // [sound:filename.ext]
      while ((match = soundRegex.exec(field)) !== null) {
        const filename = match[1];
        if (filename) {
          result.add(filename);
        }
      }

      // <img src="filename.ext">
      while ((match = imgRegex.exec(field)) !== null) {
        const filename = match[1];
        if (filename) {
          result.add(filename);
        }
      }
    }
  }

  return result;
}

/**
 * Get content type from filename
 */
function getContentType(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase();
  const types: Record<string, string> = {
    'mp3': 'audio/mpeg',
    'wav': 'audio/wav',
    'ogg': 'audio/ogg',
    'png': 'image/png',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'gif': 'image/gif',
    'webp': 'image/webp'
  };
  return types[ext || ''] || 'application/octet-stream';
}
