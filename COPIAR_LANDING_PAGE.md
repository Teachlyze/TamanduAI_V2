# 🎨 COPIAR LANDING PAGE ATUALIZADA

**Problema:** Landing page está com design antigo (sem tons de azul)  
**Solução:** Copiar landing page atualizada do projeto antigo

---

## 🚀 PASSO A PASSO (2 MINUTOS)

### **1. Abrir os 2 arquivos:**

**Origem (design atualizado):**
```
📄 tamanduai-new/src/pages/LandingPage.jsx
```

**Destino (substituir):**
```
📄 TamanduAI_V2/src/pages/LandingPage.jsx
```

---

### **2. Copiar TODO o conteúdo:**

1. Abrir `tamanduai-new/src/pages/LandingPage.jsx`
2. Selecionar tudo (Ctrl+A)
3. Copiar (Ctrl+C)
4. Abrir `TamanduAI_V2/src/pages/LandingPage.jsx`
5. Selecionar tudo (Ctrl+A)
6. Colar (Ctrl+V)
7. Salvar (Ctrl+S)

---

### **3. Ajustar APENAS os imports:**

**Trocar estas linhas no TOPO do arquivo:**

```javascript
// ❌ ANTES (projeto antigo):
import Seo from '@/components/Seo';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import SkipLinks from '@/components/SkipLinks';
import LanguageSelector from '@/components/ui/LanguageSelector';
import CookieBanner from '@/components/CookieBanner';
import { useTranslation } from 'react-i18next';

// ✅ DEPOIS (TamanduAI_V2):
import Seo from '@/shared/components/Seo';
import { Button } from '@/shared/components/ui/button';
import { Card } from '@/shared/components/ui/card';
import SkipLinks from '@/shared/components/SkipLinks';
import CookieBanner from '@/shared/components/CookieBanner';
// REMOVER: LanguageSelector e useTranslation (não vamos usar)
```

---

### **4. Remover código de i18n:**

**No início da função LandingPage:**

```javascript
// ❌ REMOVER esta linha:
const { t } = useTranslation();

// Depois, fazer busca e substituição:
// Procurar: {t('landing.
// Substituir todos por apenas o texto padrão
```

**OU** mais simples: deixar como está, o hook retorna o fallback!

---

## 🎯 RESULTADO ESPERADO

Após copiar e ajustar:

✅ **Landing page com:**
- Cores em tons de azul (cyan → blue → blue dark)
- Gradiente customizado nos botões
- Layout moderno com animações
- Hero section atualizada
- Features v2.0
- Split sections
- Testimonials
- FAQ
- CTA com gradiente

---

## ⚡ ALTERNATIVA RÁPIDA

Se não quiser ajustar imports manualmente, posso criar o arquivo completo já ajustado!

Basta confirmar e eu crio o arquivo pronto.

---

## 🐛 SE DER ERRO

### **Erro: Cannot find module '@/shared/components/Seo'**

Verificar se o componente existe:
```bash
# Deve existir:
TamanduAI_V2/src/shared/components/Seo.jsx
TamanduAI_V2/src/shared/components/SkipLinks.jsx
TamanduAI_V2/src/shared/components/CookieBanner.jsx
```

Se não existir, eu já criei! Estão prontos.

### **Erro: useTranslation is not defined**

Hook existe em `@/shared/hooks/useTranslation.js` mas está deprecated.

**Solução:** Remover todas as chamadas `t()` e deixar apenas os textos:

```javascript
// ❌ Antes:
{t('landing.hero.title', 'Título Padrão')}

// ✅ Depois:
{'Título Padrão'}
```

---

## 📝 RESUMO

**3 passos:**
1. ✅ Copiar conteúdo completo
2. ✅ Ajustar imports (shared)
3. ✅ Remover i18n (opcional)

**Tempo:** 2-5 minutos

**Resultado:** Landing page linda em tons de azul! 🎨

---

**Quer que eu crie o arquivo completo já ajustado? Responda sim!**
