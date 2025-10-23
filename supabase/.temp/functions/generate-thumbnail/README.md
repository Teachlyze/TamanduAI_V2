# Generate Thumbnail Edge Function

Esta Edge Function gera thumbnails automaticamente para imagens enviadas no Supabase Storage.

## Funcionalidades

- ✅ Geração automática de thumbnails para imagens
- ✅ Redimensionamento configurável
- ✅ Compressão com controle de qualidade
- ✅ Suporte para múltiplos formatos de imagem (JPEG, PNG, WebP)
- ✅ Usa a API de transformação do Supabase Storage (Plano Pro)

## Como usar

### 1. Deploy da função

```bash
supabase functions deploy generate-thumbnail
```

### 2. Chamar a função

```javascript
const { data, error } = await supabase.functions.invoke('generate-thumbnail', {
  body: {
    bucket: 'activities',
    filePath: 'user123/activity456/image.jpg',
    width: 300,      // opcional, padrão: 300
    height: 300,     // opcional, padrão: 300
    quality: 80      // opcional, padrão: 80 (1-100)
  }
});
```

### 3. Resposta

```json
{
  "success": true,
  "originalPath": "user123/activity456/image.jpg",
  "thumbnailUrl": "https://...storage.supabase.co/...?transform=...",
  "dimensions": { "width": 300, "height": 300 },
  "quality": 80
}
```

## Configuração automática

Para gerar thumbnails automaticamente ao fazer upload, use o hook `useActivityFiles`:

```javascript
const { uploadActivityFile } = useActivityFiles(activityId, userId);

const uploadedFile = await uploadActivityFile(file);
// O thumbnail será gerado automaticamente se for uma imagem
```

## Variáveis de ambiente necessárias

- `SUPABASE_URL`: URL do projeto Supabase
- `SUPABASE_SERVICE_ROLE_KEY`: Service role key para acesso ao storage

## Limitações

- Requer Supabase Pro para usar a API de transformação nativa
- Para planos gratuitos, considere processar imagens no cliente antes do upload
- Formatos suportados: JPEG, PNG, WebP, GIF

## Alternativa para plano gratuito

Se você está no plano gratuito, pode usar a biblioteca `browser-image-compression` no frontend:

```javascript
import imageCompression from 'browser-image-compression';

const options = {
  maxSizeMB: 1,
  maxWidthOrHeight: 1920,
  useWebWorker: true
};

const compressedFile = await imageCompression(file, options);
```
