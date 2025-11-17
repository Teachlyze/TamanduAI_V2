/**
 * SQLite Parser for Anki collection.anki2
 * Uses sql.js (SQLite compiled to WebAssembly)
 */

// Import sql.js from CDN (WASM SQLite)
import initSqlJs from 'https://esm.sh/sql.js@1.8.0/dist/sql-wasm.js';

export interface AnkiNote {
  id: number;
  mid: number;   // Model ID
  flds: string;  // Fields separated by \x1f
  tags: string;  // Tags separated by space
}

export interface AnkiFieldDef {
  name: string;
  ord: number;
}

export interface AnkiTemplate {
  name: string;
  qfmt: string;  // Front template HTML
  afmt: string;  // Back template HTML
}

export interface AnkiModel {
  id: number;
  name: string;
  flds: AnkiFieldDef[];
  tmpls: AnkiTemplate[];
  type: number;  // 0 = standard, 1 = cloze
}

export interface AnkiCollection {
  notes: AnkiNote[];
  models: Map<number, AnkiModel>;
}

export interface TemplateFieldMapping {
  frontFields: Set<string>;  // Field names used in front template
  backFields: Set<string>;   // Field names used in back template
  isCloze: boolean;          // Whether this is a cloze card
}

/**
 * Parse Anki SQLite database and extract notes with models
 */
export async function parseAnkiDatabase(collectionPath: string): Promise<AnkiNote[]> {
  const collection = await parseAnkiCollection(collectionPath);
  return collection.notes;
}

/**
 * Parse Anki SQLite database and extract full collection (notes + models)
 */
export async function parseAnkiCollection(collectionPath: string): Promise<AnkiCollection> {
  try {
    console.log('[sqlite-parser] Initializing SQL.js');
    
    // Initialize SQL.js
    const SQL = await initSqlJs({
      locateFile: (file: string) => `https://esm.sh/sql.js@1.8.0/dist/${file}`
    });

    // Read database file
    console.log('[sqlite-parser] Reading database file');
    const dbData = await Deno.readFile(collectionPath);
    
    // Open database
    console.log('[sqlite-parser] Opening database');
    const db = new SQL.Database(new Uint8Array(dbData));

    // Query col table to get models
    console.log('[sqlite-parser] Querying models from col table');
    const colResult = db.exec('SELECT models FROM col');
    
    const models = new Map<number, AnkiModel>();
    if (colResult && colResult.length > 0 && colResult[0].values.length > 0) {
      try {
        const modelsJson = colResult[0].values[0][0] as string;
        const modelsObj = JSON.parse(modelsJson);
        
        for (const [modelId, modelData] of Object.entries(modelsObj as Record<string, any>)) {
          const model: AnkiModel = {
            id: parseInt(modelId),
            name: modelData.name || 'Unknown',
            flds: (modelData.flds || []).map((f: any, idx: number) => ({
              name: f.name || `Field${idx}`,
              ord: f.ord ?? idx
            })),
            tmpls: (modelData.tmpls || []).map((t: any) => ({
              name: t.name || 'Card',
              qfmt: t.qfmt || '',
              afmt: t.afmt || ''
            })),
            type: modelData.type ?? 0
          };
          models.set(model.id, model);
        }
        console.log(`[sqlite-parser] Parsed ${models.size} models`);
      } catch (error) {
        console.error('[sqlite-parser] Error parsing models:', error);
      }
    }

    // Query notes table
    console.log('[sqlite-parser] Querying notes');
    const notesResult = db.exec('SELECT id, mid, flds, tags FROM notes');

    db.close();

    if (!notesResult || notesResult.length === 0) {
      console.log('[sqlite-parser] No results found');
      return { notes: [], models };
    }

    const notes: AnkiNote[] = [];
    const rows = notesResult[0].values;

    for (const row of rows) {
      notes.push({
        id: row[0] as number,
        mid: row[1] as number,
        flds: row[2] as string,
        tags: row[3] as string
      });
    }

    console.log(`[sqlite-parser] Parsed ${notes.length} notes`);
    
    // Log template analysis for first model (for debugging)
    if (models.size > 0) {
      const firstModel = Array.from(models.values())[0];
      const mapping = getFieldIndicesForTemplate(firstModel);
      console.log(`[sqlite-parser] Model "${firstModel.name}" template mapping:`, {
        frontIndices: mapping.frontIndices,
        backIndices: mapping.backIndices,
        isCloze: mapping.isCloze,
        fields: firstModel.flds.map(f => f.name)
      });
    }
    
    return { notes, models };

  } catch (error) {
    console.error('[sqlite-parser] Error parsing database:', error);
    throw new Error(`Failed to parse Anki database: ${error.message}`);
  }
}

/**
 * Extract field references from Anki template HTML
 * Matches patterns like {{FieldName}}, {{cloze:Text}}, {{type:Field}}
 */
export function extractTemplateFields(templateHtml: string): Set<string> {
  const fields = new Set<string>();
  
  // Match {{FieldName}}, {{cloze:FieldName}}, {{type:FieldName}}, etc.
  const fieldRegex = /\{\{([^}]+)\}\}/g;
  let match;
  
  while ((match = fieldRegex.exec(templateHtml)) !== null) {
    let fieldRef = match[1].trim();
    
    // Remove special prefixes: cloze:, type:, hint:, etc.
    fieldRef = fieldRef.replace(/^(cloze|type|hint|edit|kanji|kana|furigana|text):/i, '');
    
    // Remove filters (e.g., {{Field::filter}})
    fieldRef = fieldRef.split('::')[0].trim();
    
    // Skip special Anki variables
    if (['FrontSide', 'Tags', 'Type', 'Deck', 'Subdeck', 'Card', 'CardFlag'].includes(fieldRef)) {
      continue;
    }
    
    if (fieldRef && fieldRef.length > 0) {
      fields.add(fieldRef);
    }
  }
  
  return fields;
}

/**
 * Analyze a template and determine field mapping
 */
export function analyzeTemplate(template: AnkiTemplate, model: AnkiModel): TemplateFieldMapping {
  const frontFields = extractTemplateFields(template.qfmt);
  const backFields = extractTemplateFields(template.afmt);
  const isCloze = model.type === 1;
  
  return {
    frontFields,
    backFields,
    isCloze
  };
}

/**
 * Get deck name from collection (optional enhancement)
 */
export async function getAnkiDeckName(collectionPath: string): Promise<string | null> {
  try {
    const SQL = await initSqlJs({
      locateFile: (file: string) => `https://esm.sh/sql.js@1.8.0/dist/${file}`
    });

    const dbData = await Deno.readFile(collectionPath);
    const db = new SQL.Database(new Uint8Array(dbData));

    // Try to get deck name from decks table
    const result = db.exec('SELECT name FROM decks LIMIT 1');
    db.close();

    if (result && result.length > 0 && result[0].values.length > 0) {
      return result[0].values[0][0] as string;
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Build a mapping of which field indices are used in front/back for a given model
 */
export function getFieldIndicesForTemplate(
  model: AnkiModel,
  templateIndex: number = 0
): { frontIndices: number[], backIndices: number[], isCloze: boolean } {
  if (!model.tmpls || model.tmpls.length === 0) {
    return { frontIndices: [], backIndices: [], isCloze: false };
  }
  
  const template = model.tmpls[templateIndex] || model.tmpls[0];
  const mapping = analyzeTemplate(template, model);
  
  const frontIndices: number[] = [];
  const backIndices: number[] = [];
  
  // Map field names to indices
  for (const field of model.flds) {
    if (mapping.frontFields.has(field.name)) {
      frontIndices.push(field.ord);
    }
    if (mapping.backFields.has(field.name)) {
      backIndices.push(field.ord);
    }
  }
  
  return {
    frontIndices,
    backIndices,
    isCloze: mapping.isCloze
  };
}
