# Import Anki (.apkg) - Edge Function

Esta Edge Function processa arquivos `.apkg` (Anki deck package) e importa notes/cards para o sistema de flashcards do TamanduAI.

## Funcionalidades

- ✅ Importar decks Anki (.apkg) como novo deck ou adicionar a deck existente
- ✅ Processar mídia (áudio e imagens) contida nos pacotes
- ✅ Parsing de banco SQLite do Anki (collection.anki2)
- ✅ Conversão automática de notes para cards
- ✅ Suporte a tags
- ✅ Upload de mídia para Supabase Storage
- ✅ Batch insert otimizado (100 cards por vez)

## Configuração necessária

### 1. Buckets do Supabase Storage

Você precisa criar dois buckets no Supabase Storage:

#### `flashcards-imports`
- **Propósito**: Armazenamento temporário de arquivos .apkg enviados
- **Configuração**:
  - Public: `false`
  - File size limit: `100 MB`
  - Allowed MIME types: `application/zip, application/x-zip-compressed`
  
- **RLS Policy** (Row Level Security):
  ```sql
  -- Permitir usuários autenticados fazer upload
  CREATE POLICY "Users can upload their own files"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'flashcards-imports' AND auth.uid()::text = (storage.foldername(name))[1]);

  -- Permitir service role ler (para a Edge Function)
  CREATE POLICY "Service role can read all files"
  ON storage.objects FOR SELECT
  TO service_role
  USING (bucket_id = 'flashcards-imports');
  
  -- Permitir service role deletar (cleanup)
  CREATE POLICY "Service role can delete files"
  ON storage.objects FOR DELETE
  TO service_role
  USING (bucket_id = 'flashcards-imports');
  ```

#### `flashcards-media`
- **Propósito**: Armazenamento permanente de mídia dos flashcards (áudio/imagens)
- **Configuração**:
  - Public: `true` (ou use signed URLs se preferir)
  - File size limit: `10 MB` por arquivo
  - Allowed MIME types: `audio/mpeg, audio/wav, audio/ogg, image/png, image/jpeg, image/gif, image/webp`

- **RLS Policy**:
  ```sql
  -- Permitir service role fazer upload (via Edge Function)
  CREATE POLICY "Service role can upload media"
  ON storage.objects FOR INSERT
  TO service_role
  WITH CHECK (bucket_id = 'flashcards-media');
  
  -- Permitir leitura pública (ou restringir a donos dos decks)
  CREATE POLICY "Public can read media"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'flashcards-media');

  -- OU (alternativa mais segura - só dono do deck):
  CREATE POLICY "Users can read their own media"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'flashcards-media' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
  ```

### 2. Criar os buckets via SQL

Você pode executar isso no SQL Editor do Supabase:

```sql
-- Criar bucket flashcards-imports
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'flashcards-imports',
  'flashcards-imports',
  false,
  104857600, -- 100MB
  ARRAY['application/zip', 'application/x-zip-compressed', 'application/octet-stream']
);

-- Criar bucket flashcards-media
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'flashcards-media',
  'flashcards-media',
  true,
  10485760, -- 10MB
  ARRAY['audio/mpeg', 'audio/wav', 'audio/ogg', 'image/png', 'image/jpeg', 'image/gif', 'image/webp']
);
```

## Contrato da API

### Request

```json
{
  "bucket": "flashcards-imports",
  "file_path": "user-id/timestamp_filename.apkg",
  "deck_id": "uuid-opcional",
  "create_new_deck": true,
  "deck_name": "Nome do Deck",
  "deck_description": "Descrição opcional",
  "deck_color": "#3B82F6"
}
```

**Parâmetros**:
- `bucket` (string, obrigatório): Nome do bucket onde o .apkg foi salvo
- `file_path` (string, obrigatório): Caminho do arquivo no bucket
- `create_new_deck` (boolean, default: true): Se true, cria um novo deck
- `deck_id` (string, condicional): UUID do deck existente (obrigatório se create_new_deck = false)
- `deck_name` (string, condicional): Nome do novo deck (obrigatório se create_new_deck = true)
- `deck_description` (string, opcional): Descrição do deck
- `deck_color` (string, opcional): Cor hexadecimal do deck

### Response (sucesso)

```json
{
  "success": true,
  "deck_id": "uuid-do-deck",
  "created_new_deck": true,
  "import_stats": {
    "total_notes": 120,
    "total_cards_created": 110,
    "notes_ignored": 10,
    "media_files_processed": 34,
    "time_ms": 2345
  }
}
```

### Response (erro)

```json
{
  "success": false,
  "error": "Mensagem de erro amigável",
  "code": "IMPORT_ERROR"
}
```

## Limitações

- **Tamanho máximo do arquivo**: 100 MB
- **Máximo de cards por importação**: 10,000
- **Batch size**: 100 cards por insert
- **Mapeamento de campos**: Por padrão, campo 0 → frente, campo 1 → verso
- **Modelos complexos**: Atualmente não suportado (será implementado em versão futura)

## Formato Anki (.apkg)

Um arquivo `.apkg` é um arquivo ZIP contendo:

1. **collection.anki2**: Banco de dados SQLite com notes, cards, decks, etc.
2. **media**: Arquivo JSON com mapeamento de IDs para nomes de arquivos de mídia
3. **0, 1, 2, ...**: Arquivos binários de mídia (áudio/imagens)

### Estrutura do SQLite (tabela `notes`)

```sql
SELECT id, flds, tags FROM notes;
```

- `id`: ID único da note
- `flds`: Campos separados por `\x1f` (unit separator)
- `tags`: Tags separadas por espaço

### Referências de mídia

- Áudio: `[sound:filename.mp3]`
- Imagem: `<img src="filename.png">`

A função substitui essas referências por URLs do Storage.

## Dependências

- `sql.js@1.8.0`: SQLite compilado para WebAssembly
- `std/archive/zip`: Biblioteca de descompactação do Deno
- `@supabase/supabase-js@2.38.4`: Cliente Supabase

## Aspectos legais e jurídicos

✅ **Já implementado** nos Termos de Uso e Política de Privacidade:

- Usuário é 100% responsável pelo conteúdo importado
- Decks permanecem privados (não compartilhados publicamente)
- Não-afiliação com Anki declarada
- Processo de notificação DMCA disponível (copyright@tamanduai.com)
- Mídia tratada com as mesmas políticas de privacidade

## Teste local

Para testar localmente:

```bash
# 1. Certifique-se que os buckets existem no Supabase
# 2. Deploy da função
supabase functions deploy import-anki

# 3. Testar com curl
curl -X POST \
  https://seu-projeto.supabase.co/functions/v1/import-anki \
  -H "Authorization: Bearer SEU_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "bucket": "flashcards-imports",
    "file_path": "user-id/1234_test.apkg",
    "create_new_deck": true,
    "deck_name": "Test Deck"
  }'
```

## Roadmap futuro

- [ ] Suporte a modelos complexos do Anki (cloze, multiple choice)
- [ ] Preservar histórico de revisões do Anki (se possível)
- [ ] Suporte a sub-decks
- [ ] Renderização inline de mídia no ReviewPage
- [ ] Processamento assíncrono para decks muito grandes (>5k cards)
- [ ] Lifecycle automático para limpar arquivos temporários

## Troubleshooting

### Erro: "Invalid .apkg file: collection.anki2 not found"
- O arquivo não é um .apkg válido ou está corrompido
- Tente abrir no Anki desktop primeiro para validar

### Erro: "Failed to download .apkg file from storage"
- Verifique se o bucket existe e as políticas RLS estão corretas
- Verifique se o arquivo foi realmente uploaded

### Erro: "Failed to parse Anki database"
- O banco SQLite pode estar corrompido
- sql.js pode ter problema com versões muito antigas do Anki

### Mídia não aparece nos cards
- Verifique se o bucket `flashcards-media` é público OU
- Use signed URLs na Edge Function ao invés de URLs públicas

## Contato

Para problemas ou sugestões, abrir issue no repositório ou contatar suporte técnico.
