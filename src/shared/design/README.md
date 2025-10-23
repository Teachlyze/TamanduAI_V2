# 🎨 Design System - TamanduAI

Sistema centralizado de design que serve toda a aplicação.

## 📁 Estrutura

```
src/shared/design/
├── tokens.js              # Tokens de design (cores, gradientes, etc)
├── components/            # Componentes reutilizáveis
│   ├── StatsCard.jsx
│   ├── DashboardHeader.jsx
│   └── EmptyState.jsx
├── index.js              # Exports centralizados
└── README.md             # Este arquivo
```

---

## 🎯 Tokens de Design

### Gradientes

```jsx
import { gradients } from '@/shared/design';

// Por Role
gradients.teacher  // 'from-blue-600 via-purple-600 to-pink-600'
gradients.school   // 'from-slate-700 via-slate-800 to-slate-900'
gradients.student  // 'from-blue-600 via-purple-600 to-pink-600'

// Por Feature
gradients.primary    // 'from-blue-600 to-purple-600'
gradients.success    // 'from-emerald-600 to-teal-600'
gradients.warning    // 'from-amber-600 to-orange-600'

// Stats Cards
gradients.stats.classes     // 'from-blue-500 to-indigo-500'
gradients.stats.students    // 'from-purple-500 to-pink-500'
gradients.stats.activities  // 'from-emerald-500 to-teal-500'
```

### Cores

```jsx
import { colors } from '@/shared/design';

// Background
colors.bg.light  // 'bg-white'
colors.bg.dark   // 'bg-slate-900'
colors.bg.muted  // 'bg-slate-50 dark:bg-slate-950'

// Text
colors.text.primary    // 'text-slate-900 dark:text-white'
colors.text.secondary  // 'text-slate-600 dark:text-slate-400'
colors.text.muted      // 'text-slate-500 dark:text-slate-500'

// Border
colors.border.default  // 'border-slate-200 dark:border-slate-700'
colors.border.hover    // 'hover:border-slate-300 dark:hover:border-slate-600'
```

### Componentes

```jsx
import { components } from '@/shared/design';

// Card
components.card.base         // Estilo base
components.card.hover        // Com hover effect
components.card.interactive  // Clicável

// Button
components.button.base      // Estilo base
components.button.gradient  // Com gradiente
components.button.outline   // Outline style

// Badge
components.badge.base                    // Estilo base
components.badge.variants.primary        // Variante primary
components.badge.variants.success        // Variante success
```

---

## 🧩 Componentes

### StatsCard

Card de estatísticas reutilizável.

```jsx
import { StatsCard, gradients } from '@/shared/design';
import { BookOpen } from 'lucide-react';

<StatsCard
  title="Total de Turmas"
  value={5}
  icon={BookOpen}
  gradient={gradients.stats.classes}
  bgColor="bg-blue-50 dark:bg-blue-950/30"
  delay={0.1}
  format="number"  // 'number', 'text', 'percentage'
  onClick={() => console.log('clicked')}
/>
```

**Props:**
- `title` (string) - Título do card
- `value` (any) - Valor a ser exibido
- `icon` (Component) - Ícone do lucide-react
- `gradient` (string) - Gradiente do ícone
- `bgColor` (string) - Cor de fundo do ícone
- `delay` (number) - Delay da animação
- `format` (string) - Formato do valor ('number', 'text', 'percentage')
- `onClick` (function) - Callback ao clicar

**Tratamento de dados vazios:**
- Se `value` for `null`, `undefined` ou `''`, exibe `-`
- Se `format='number'` e não for número, exibe `-`

---

### DashboardHeader

Header animado para dashboards com gradiente e padrão de pontos.

```jsx
import { DashboardHeader } from '@/shared/design';

<DashboardHeader
  title="Dashboard do Professor"
  subtitle="Bem-vindo de volta!"
  role="teacher"  // 'teacher', 'school', 'student'
/>
```

**Props:**
- `title` (string) - Título do dashboard
- `subtitle` (string) - Subtítulo
- `role` (string) - Role para definir gradiente
- `gradient` (string) - Gradiente customizado (opcional)

---

### EmptyState

Estado vazio reutilizável.

```jsx
import { EmptyState } from '@/shared/design';
import { BookOpen, Plus } from 'lucide-react';

<EmptyState
  icon={BookOpen}
  title="Nenhuma turma encontrada"
  description="Crie sua primeira turma para começar."
  actionLabel="Criar Turma"
  actionIcon={Plus}
  action={() => console.log('action')}
/>
```

**Props:**
- `icon` (Component) - Ícone do lucide-react
- `title` (string) - Título
- `description` (string) - Descrição
- `actionLabel` (string) - Label do botão de ação
- `actionIcon` (Component) - Ícone do botão
- `action` (function) - Callback do botão

---

## 🛠️ Utilitários

### valueOrEmpty

Retorna valor ou empty state padrão.

```jsx
import { valueOrEmpty } from '@/shared/design';

valueOrEmpty(null)        // '-'
valueOrEmpty(undefined)   // '-'
valueOrEmpty('')          // '-'
valueOrEmpty('teste')     // 'teste'
valueOrEmpty(0)           // 0
valueOrEmpty(null, 'N/A') // 'N/A'
```

### formatNumber

Formata número ou retorna empty state.

```jsx
import { formatNumber } from '@/shared/design';

formatNumber(1000)      // '1.000'
formatNumber(null)      // '-'
formatNumber(undefined) // '-'
formatNumber(NaN)       // '-'
formatNumber(null, '0') // '0'
```

### getRoleGradient

Retorna gradiente baseado no role.

```jsx
import { getRoleGradient } from '@/shared/design';

getRoleGradient('teacher')  // 'from-blue-600 via-purple-600 to-pink-600'
getRoleGradient('school')   // 'from-slate-700 via-slate-800 to-slate-900'
getRoleGradient('student')  // 'from-blue-600 via-purple-600 to-pink-600'
getRoleGradient('invalid')  // 'from-blue-600 to-purple-600' (fallback)
```

### getStatusBadge

Retorna badge variant baseado em status.

```jsx
import { getStatusBadge } from '@/shared/design';

getStatusBadge('active')     // badge.variants.success
getStatusBadge('pending')    // badge.variants.warning
getStatusBadge('completed')  // badge.variants.success
getStatusBadge('error')      // badge.variants.danger
```

---

## 📖 Uso Completo

### Exemplo: Dashboard com Design System

```jsx
import React, { useState, useEffect } from 'react';
import { 
  StatsCard, 
  DashboardHeader, 
  EmptyState,
  gradients,
  formatNumber
} from '@/shared/design';
import { BookOpen, Users, Plus } from 'lucide-react';
import LoadingSpinner from '@/shared/components/ui/LoadingSpinner';
import ClassService from '@/shared/services/classService';

const Dashboard = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ totalClasses: 0, totalStudents: 0 });
  const [classes, setClasses] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const result = await ClassService.getClasses();
      const classesData = result?.data || [];
      
      setStats({
        totalClasses: classesData.length,
        totalStudents: classesData.reduce((sum, c) => sum + (c.student_count || 0), 0)
      });
      setClasses(classesData);
    } catch (error) {
      console.error('Erro:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner size="lg" text="Carregando..." />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-6">
      <DashboardHeader
        title="Meu Dashboard"
        subtitle="Visão geral das suas turmas"
        role="teacher"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <StatsCard
          title="Total de Turmas"
          value={stats.totalClasses}
          icon={BookOpen}
          gradient={gradients.stats.classes}
          bgColor="bg-blue-50 dark:bg-blue-950/30"
          delay={0}
        />
        
        <StatsCard
          title="Total de Alunos"
          value={stats.totalStudents}
          icon={Users}
          gradient={gradients.stats.students}
          bgColor="bg-purple-50 dark:bg-purple-950/30"
          delay={0.1}
        />
      </div>

      {classes.length === 0 && (
        <EmptyState
          icon={BookOpen}
          title="Nenhuma turma encontrada"
          description="Crie sua primeira turma para começar."
          actionLabel="Criar Turma"
          actionIcon={Plus}
          action={() => window.location.href = '/dashboard/classes/new'}
        />
      )}
    </div>
  );
};

export default Dashboard;
```

---

## ✅ Boas Práticas

### ✓ Usar tokens ao invés de hardcode

```jsx
// ❌ Errado
<div className="bg-white dark:bg-slate-900">

// ✅ Correto
import { colors } from '@/shared/design';
<div className={colors.bg.light}>
```

### ✓ Usar componentes do design system

```jsx
// ❌ Errado
<div className="p-6 bg-white dark:bg-slate-900 rounded-xl">
  <h3>{value || '-'}</h3>
</div>

// ✅ Correto
<StatsCard title="Total" value={value} icon={Icon} />
```

### ✓ Tratar dados vazios com utilitários

```jsx
// ❌ Errado
<span>{data?.value || 'N/A'}</span>

// ✅ Correto
import { valueOrEmpty } from '@/shared/design';
<span>{valueOrEmpty(data?.value, 'N/A')}</span>
```

### ✓ Usar EmptyState para listas vazias

```jsx
// ❌ Errado
{items.length === 0 && <p>Nenhum item</p>}

// ✅ Correto
{items.length === 0 && (
  <EmptyState
    icon={Icon}
    title="Nenhum item"
    description="Descrição..."
  />
)}
```

---

## 🎨 Expandindo o Design System

### Adicionar novo token

```js
// src/shared/design/tokens.js

export const newToken = {
  // seu token aqui
};
```

### Adicionar novo componente

```jsx
// src/shared/design/components/NewComponent.jsx

import React from 'react';
import { tokens } from '../tokens';

const NewComponent = ({ ...props }) => {
  return <div>...</div>;
};

export default NewComponent;
```

```js
// src/shared/design/index.js

export { default as NewComponent } from './components/NewComponent';
```

---

## 📊 Status

- ✅ Tokens de design
- ✅ StatsCard
- ✅ DashboardHeader
- ✅ EmptyState
- ✅ Utilitários
- ✅ Documentação
- ⏳ Mais componentes (futuros)

---

**Mantido por:** Equipe TamanduAI
**Última atualização:** 22 de Outubro de 2025
