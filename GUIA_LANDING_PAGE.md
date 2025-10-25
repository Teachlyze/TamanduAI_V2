# 🎨 GUIA: Copiar Landing Page Atualizada para TamanduAI_V2

## 📋 RESUMO

Este guia explica como copiar a landing page atualizada (com cores em tons de azul) do projeto antigo para o TamanduAI_V2 organizado.

---

## 🔧 ALTERAÇÕES NECESSÁRIAS NOS IMPORTS

### **Antes (Projeto Antigo):**
```javascript
import Seo from '@/components/Seo';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import SkipLinks from '@/components/SkipLinks';
import LanguageSelector from '@/components/ui/LanguageSelector';
import CookieBanner from '@/components/CookieBanner';
```

### **Depois (TamanduAI_V2):**
```javascript
// Helmet para SEO (se não tiver, criar ou remover)
import { Helmet } from 'react-helmet-async';

// Componentes UI
import { Button } from '@/shared/components/ui/button';
import { Card } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';

// Remover ou criar esses componentes:
// - Seo → usar Helmet ou <head> tags
// - SkipLinks → criar ou remover
// - LanguageSelector → criar ou remover  
// - CookieBanner → criar ou remover

// i18n (se necessário)
// import { useTranslation } from 'react-i18next'; → criar hook ou remover
```

---

## 📁 ESTRUTURA DE ARQUIVOS

### **Copiar do Projeto Antigo:**
```
src/pages/LandingPage.jsx
  ↓
TamanduAI_V2/src/pages/LandingPage.jsx
```

### **Componentes que Precisam Existir:**

**1. SEO Component (opcional):**
```javascript
// TamanduAI_V2/src/shared/components/Seo.jsx
import React from 'react';
import { Helmet } from 'react-helmet-async';

export default function Seo({ title, description, path }) {
  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={`https://tamanduai.com${path}`} />
    </Helmet>
  );
}
```

**2. Skip Links (acessibilidade):**
```javascript
// TamanduAI_V2/src/shared/components/SkipLinks.jsx
import React from 'react';

export default function SkipLinks() {
  return (
    <a 
      href="#main-content" 
      className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:p-4 focus:bg-blue-600 focus:text-white"
    >
      Pular para o conteúdo principal
    </a>
  );
}
```

**3. Cookie Banner (opcional):**
```javascript
// TamanduAI_V2/src/shared/components/CookieBanner.jsx
import React, { useState, useEffect } from 'react';
import { Button } from '@/shared/components/ui/button';

export default function CookieBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const accepted = localStorage.getItem('cookies-accepted');
    if (!accepted) setShow(true);
  }, []);

  const accept = () => {
    localStorage.setItem('cookies-accepted', 'true');
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 p-4 shadow-lg z-50">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 flex-wrap">
        <p className="text-sm text-gray-600 dark:text-gray-300">
          Usamos cookies para melhorar sua experiência. Ao continuar navegando, você concorda com nossa{' '}
          <a href="/privacy" className="underline">Política de Privacidade</a>.
        </p>
        <Button onClick={accept} size="sm" variant="gradient">
          Aceitar
        </Button>
      </div>
    </div>
  );
}
```

**4. Language Selector (opcional):**
```javascript
// TamanduAI_V2/src/shared/components/LanguageSelector.jsx
import React from 'react';

export default function LanguageSelector() {
  return (
    <select className="bg-transparent border border-gray-300 dark:border-gray-700 rounded-md px-2 py-1 text-sm">
      <option value="pt">PT</option>
      <option value="en">EN</option>
      <option value="es">ES</option>
    </select>
  );
}
```

---

## 🎨 CORES ATUALIZADAS (JÁ APLICADAS)

O gradiente customizado já foi aplicado no `button.jsx`:

```javascript
// Gradiente aplicado automaticamente em variant="gradient"
background: linear-gradient(
  121.22deg, 
  rgba(0, 255, 136, 0.6) 0%,
  rgba(0, 217, 255, 0.6) 34.99%,
  rgba(0, 102, 255, 0.6) 64.96%,
  rgba(0, 4, 255, 0.6) 100%
);
```

### **Paleta de Cores em Tons de Azul:**

| Elemento | Cor Antes | Cor Depois |
|----------|-----------|------------|
| Primária | `from-indigo-600 via-purple-600 to-pink-600` | `from-cyan-600 via-blue-600 to-blue-800` |
| Secundária | `indigo-600` | `blue-600` |
| Background | `blue-50 via-purple-50 to-pink-50` | `cyan-50 via-blue-50 to-blue-100` |
| Hover | `purple-600` | `blue-600` |

---

## 🔄 SUBSTITUIÇÃO i18n (opcional)

### **Se não tiver react-i18next no TamanduAI_V2:**

**Opção 1: Criar hook mock:**
```javascript
// TamanduAI_V2/src/shared/hooks/useTranslation.js
export function useTranslation() {
  return {
    t: (key, fallback) => fallback || key
  };
}
```

**Opção 2: Remover completamente:**
```javascript
// Trocar:
{t('landing.hero.title', 'Título Padrão')}

// Por:
{'Título Padrão'}
```

---

## 📝 PASSO A PASSO DE IMPLEMENTAÇÃO

### **1. Criar Componentes Auxiliares (se não existirem):**

```bash
# Criar pasta para componentes genéricos se não existir
mkdir -p TamanduAI_V2/src/shared/components

# Criar os componentes:
# - Seo.jsx
# - SkipLinks.jsx
# - CookieBanner.jsx (opcional)
# - LanguageSelector.jsx (opcional)
```

### **2. Copiar Landing Page:**

1. Abrir `src/pages/LandingPage.jsx` (projeto antigo)
2. Copiar todo o conteúdo
3. Colar em `TamanduAI_V2/src/pages/LandingPage.jsx`

### **3. Ajustar Imports:**

```javascript
// No topo do arquivo LandingPage.jsx do TamanduAI_V2
import React from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/shared/components/ui/button';
import { Card } from '@/shared/components/ui/card';
import Seo from '@/shared/components/Seo'; // se criou
import SkipLinks from '@/shared/components/SkipLinks'; // se criou
import CookieBanner from '@/shared/components/CookieBanner'; // se criou
import {
  BookOpen, Users, Sparkles, TrendingUp, Brain,
  Clock, Lightbulb, Target, Rocket, Calendar, Shield,
  Star, Heart, CheckCircle, ArrowRight, Globe, Award,
  Zap, MessageSquare, FileText, BarChart3, Video,
  CheckCircle2, XCircle, Play, ChevronRight, Mail,
  Lock, Smartphone, Laptop, Headphones, BadgeCheck, Trophy, Bell, DollarSign
} from 'lucide-react';

// Se não tiver i18n, criar mock ou remover
// import { useTranslation } from 'react-i18next';
```

### **4. Verificar Rotas:**

Certifique-se que as rotas mencionadas existem:
- `/login`
- `/register`
- `/register/teacher`
- `/pricing`
- `/docs`
- `/contact`
- `/privacy`
- `/terms`

---

## ✅ CHECKLIST FINAL

- [ ] **Button.jsx** atualizado com gradiente customizado
- [ ] Componentes auxiliares criados (Seo, SkipLinks, etc)
- [ ] Landing Page copiada e imports ajustados
- [ ] Cores em tons de azul verificadas
- [ ] i18n removido ou adaptado
- [ ] Rotas existentes verificadas
- [ ] Teste visual no navegador
- [ ] Responsividade mobile testada
- [ ] Dark mode funcionando

---

## 🎯 RESULTADO ESPERADO

Uma landing page moderna com:
- ✅ Tons de azul (Cyan → Blue → Blue Dark)
- ✅ Gradiente customizado nos CTAs
- ✅ Animações suaves com Framer Motion
- ✅ Totalmente responsiva
- ✅ Dark mode suportado
- ✅ Acessibilidade (ARIA labels, Skip Links)
- ✅ SEO otimizado

---

## 📸 PREVIEW DAS SEÇÕES

### **Hero:**
- Background: Gradiente cyan/blue
- Título: "Educação Inteligente com IA"
- CTAs: Gradiente customizado
- Stats: 4 métricas em azul

### **Features:**
- 8 cards com ícones
- Badges com gradiente azul
- Hover effects

### **How It Works:**
- 4 passos numerados
- Background cyan/blue
- Conectores com gradiente

### **Testimonials:**
- 3 depoimentos
- Avatares com shadow
- Stars amarelas

### **CTA Final:**
- Background: Gradiente customizado
- 2 botões grandes
- Copy impactante

---

## 🚀 PRÓXIMOS PASSOS

Após copiar a landing page:

1. **Testar em desenvolvimento:**
```bash
cd TamanduAI_V2
npm run dev
```

2. **Ajustar conforme necessário:**
   - Textos específicos do projeto
   - Links corretos
   - Imagens/assets

3. **Otimizar:**
   - Comprimir imagens
   - Lazy loading
   - Code splitting

4. **Deploy:**
   - Build de produção
   - Testes E2E
   - Lighthouse audit

---

**Criado em:** 24 de Outubro de 2025  
**Projeto:** TamanduAI V2 - Landing Page Migration
