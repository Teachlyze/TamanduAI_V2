# 🏗️ Arquitetura Proposta - TamanduAI V2

## 📋 Estrutura de Pastas Completa

```
TamanduAI_V2/
├── public/                          # Assets estáticos
│   ├── images/
│   └── icons/
│
├── src/
│   ├── shared/                      # ✅ CÓDIGO COMUM A TODOS ROLES
│   │   ├── components/
│   │   │   ├── ui/                  # ✅ 91 componentes shadcn/ui (COPIADO)
│   │   │   ├── layout/              # 🔨 CRIAR
│   │   │   │   ├── Header.jsx
│   │   │   │   ├── Footer.jsx
│   │   │   │   ├── Sidebar.jsx
│   │   │   │   └── MainLayout.jsx
│   │   │   └── common/              # 🔨 CRIAR
│   │   │       ├── LoadingSpinner.jsx
│   │   │       ├── EmptyState.jsx
│   │   │       ├── ErrorState.jsx
│   │   │       └── ConfirmDialog.jsx
│   │   │
│   │   ├── services/                # ✅ 75 services (COPIADO)
│   │   │   ├── auth/
│   │   │   ├── classes/
│   │   │   ├── activities/
│   │   │   ├── gamification/
│   │   │   └── analytics/
│   │   │
│   │   ├── hooks/                   # ✅ 35 hooks (COPIADO)
│   │   │   ├── useAuth.js
│   │   │   ├── useDebounce.js
│   │   │   └── useLocalStorage.js
│   │   │
│   │   ├── contexts/                # ✅ 10 contexts (COPIADO)
│   │   │   ├── AuthContext.jsx
│   │   │   ├── ThemeContext.jsx
│   │   │   └── XPContext.jsx
│   │   │
│   │   ├── utils/                   # ✅ 23 utils (COPIADO)
│   │   │   ├── formatters.js
│   │   │   ├── validators.js
│   │   │   └── exportUtils.js
│   │   │
│   │   └── constants/               # ✅ 6 arquivos (COPIADO)
│   │       ├── roles.js
│   │       ├── activityTypes.js
│   │       └── routes.js
│   │
│   ├── features/                    # 🔨 FEATURES COMPARTILHADAS
│   │   ├── auth/
│   │   │   ├── pages/
│   │   │   │   ├── LoginPage.jsx
│   │   │   │   ├── RegisterPage.jsx
│   │   │   │   ├── ForgotPasswordPage.jsx
│   │   │   │   └── VerifyEmailPage.jsx
│   │   │   ├── components/
│   │   │   │   ├── LoginForm.jsx
│   │   │   │   └── RegisterForm.jsx
│   │   │   └── routes.jsx
│   │   │
│   │   ├── notifications/
│   │   │   ├── pages/
│   │   │   │   └── NotificationCenter.jsx
│   │   │   ├── components/
│   │   │   │   ├── NotificationCard.jsx
│   │   │   │   └── NotificationBadge.jsx
│   │   │   └── routes.jsx
│   │   │
│   │   ├── profile/
│   │   │   ├── pages/
│   │   │   │   ├── ProfilePage.jsx
│   │   │   │   └── EditProfilePage.jsx
│   │   │   ├── components/
│   │   │   │   └── ProfileCard.jsx
│   │   │   └── routes.jsx
│   │   │
│   │   └── settings/
│   │       ├── pages/
│   │       │   └── SettingsPage.jsx
│   │       ├── components/
│   │       │   ├── ThemeToggle.jsx
│   │       │   └── AccessibilitySettings.jsx
│   │       └── routes.jsx
│   │
│   ├── modules/                     # 🔨 MÓDULOS POR ROLE
│   │   ├── student/
│   │   │   ├── pages/
│   │   │   │   ├── Dashboard/
│   │   │   │   │   └── StudentDashboard.jsx
│   │   │   │   ├── Classes/
│   │   │   │   │   ├── ClassesList.jsx
│   │   │   │   │   └── ClassDetails.jsx
│   │   │   │   ├── Activities/
│   │   │   │   │   ├── ActivitiesList.jsx
│   │   │   │   │   ├── ActivityDetails.jsx
│   │   │   │   │   └── SubmitActivity.jsx
│   │   │   │   ├── Performance/
│   │   │   │   │   ├── MyGrades.jsx
│   │   │   │   │   └── Analytics.jsx
│   │   │   │   ├── Gamification/
│   │   │   │   │   ├── GamificationDashboard.jsx
│   │   │   │   │   └── Ranking.jsx
│   │   │   │   └── Calendar/
│   │   │   │       └── StudentCalendar.jsx
│   │   │   ├── components/
│   │   │   │   ├── StudentSidebar.jsx
│   │   │   │   ├── ActivityCard.jsx
│   │   │   │   ├── GradeCard.jsx
│   │   │   │   └── XPProgressBar.jsx
│   │   │   ├── hooks/
│   │   │   │   └── useStudentActivities.js
│   │   │   └── routes.jsx
│   │   │
│   │   ├── teacher/
│   │   │   ├── pages/
│   │   │   │   ├── Dashboard/
│   │   │   │   │   └── TeacherDashboard.jsx
│   │   │   │   ├── Classes/
│   │   │   │   │   ├── ClassesList.jsx
│   │   │   │   │   ├── ClassDetails.jsx
│   │   │   │   │   ├── ClassMembers.jsx
│   │   │   │   │   ├── ClassFeed.jsx
│   │   │   │   │   ├── ClassGrades.jsx
│   │   │   │   │   ├── ClassMaterials.jsx
│   │   │   │   │   ├── ClassAnalytics.jsx
│   │   │   │   │   └── ClassAttendance.jsx
│   │   │   │   ├── Activities/
│   │   │   │   │   ├── ActivitiesList.jsx
│   │   │   │   │   ├── CreateActivity.jsx
│   │   │   │   │   ├── EditActivity.jsx
│   │   │   │   │   └── ActivitySubmissions.jsx
│   │   │   │   ├── Grading/
│   │   │   │   │   ├── GradingQueue.jsx
│   │   │   │   │   ├── GradingInterface.jsx
│   │   │   │   │   └── RubricManager.jsx
│   │   │   │   ├── Students/
│   │   │   │   │   ├── StudentsList.jsx
│   │   │   │   │   └── StudentDetails.jsx
│   │   │   │   ├── QuestionBank/
│   │   │   │   │   ├── QuestionBankPage.jsx
│   │   │   │   │   └── CreateQuestion.jsx
│   │   │   │   ├── Analytics/
│   │   │   │   │   ├── AnalyticsDashboard.jsx
│   │   │   │   │   └── MLInsights.jsx
│   │   │   │   └── Calendar/
│   │   │   │       └── TeacherCalendar.jsx
│   │   │   ├── components/
│   │   │   │   ├── TeacherSidebar.jsx
│   │   │   │   ├── ClassCard.jsx
│   │   │   │   ├── SubmissionCard.jsx
│   │   │   │   ├── GradingForm.jsx
│   │   │   │   └── ActivityBuilder.jsx
│   │   │   ├── hooks/
│   │   │   │   ├── useTeacherClasses.js
│   │   │   │   └── useGrading.js
│   │   │   └── routes.jsx
│   │   │
│   │   └── school/
│   │       ├── pages/
│   │       │   ├── Dashboard/
│   │       │   │   └── SchoolDashboard.jsx
│   │       │   ├── Classes/
│   │       │   │   ├── ClassesList.jsx
│   │       │   │   └── ClassDetails.jsx
│   │       │   ├── Teachers/
│   │       │   │   ├── TeachersList.jsx
│   │       │   │   ├── InviteTeacher.jsx
│   │       │   │   └── TeacherDetails.jsx
│   │       │   ├── Students/
│   │       │   │   ├── StudentsList.jsx
│   │       │   │   └── StudentDetails.jsx
│   │       │   ├── Analytics/
│   │       │   │   ├── SchoolAnalytics.jsx
│   │       │   │   └── MLInsights.jsx
│   │       │   ├── Communications/
│   │       │   │   └── CommunicationsPage.jsx
│   │       │   ├── Reports/
│   │       │   │   └── ReportsPage.jsx
│   │       │   ├── Ranking/
│   │       │   │   └── RankingPage.jsx
│   │       │   └── Settings/
│   │       │       ├── SchoolSettings.jsx
│   │       │       └── RewardSettings.jsx
│   │       ├── components/
│   │       │   ├── SchoolSidebar.jsx
│   │       │   ├── TeacherCard.jsx
│   │       │   ├── SchoolStatsCard.jsx
│   │       │   └── AnnouncementForm.jsx
│   │       ├── hooks/
│   │       │   └── useSchoolStats.js
│   │       └── routes.jsx
│   │
│   ├── App.jsx                      # App principal
│   ├── main.jsx                     # Entry point
│   └── routes.jsx                   # Roteamento central
│
├── supabase/
│   ├── migrations/                  # ✅ 22 migrations (COPIADO)
│   └── functions/                   # Edge functions
│
├── package.json                     # ✅ Dependências (COPIADO)
├── tailwind.config.js              # ✅ Config Tailwind (COPIADO)
├── vite.config.js                  # ✅ Config Vite (COPIADO)
└── README.md
```

## 🎯 Convenções de Nomenclatura

### Arquivos
- **Pages**: `PascalCase.jsx` (ex: `StudentDashboard.jsx`)
- **Components**: `PascalCase.jsx` (ex: `ActivityCard.jsx`)
- **Services**: `camelCase.js` (ex: `classService.js`)
- **Hooks**: `camelCase.js` com prefixo `use` (ex: `useAuth.js`)
- **Utils**: `camelCase.js` (ex: `formatDate.js`)

### Rotas
- **Student**: `/student/*`
- **Teacher**: `/teacher/*`
- **School**: `/school/*`
- **Shared**: `/auth/*`, `/profile/*`, `/settings/*`

## 📦 Organização de Imports

```javascript
// 1. React e bibliotecas externas
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// 2. Componentes UI
import { Button, Card } from '@/shared/components/ui';

// 3. Componentes locais
import ActivityCard from '../components/ActivityCard';

// 4. Hooks
import { useAuth } from '@/shared/hooks/useAuth';

// 5. Services
import classService from '@/shared/services/classService';

// 6. Utils e constantes
import { formatDate } from '@/shared/utils/formatters';
import { ACTIVITY_TYPES } from '@/shared/constants/activityTypes';
```

## 🔄 Fluxo de Dados

```
User Interaction
    ↓
Component (Page/Feature)
    ↓
Hook (custom logic)
    ↓
Service (API calls)
    ↓
Supabase
```

## 🎨 Design System

### Cores por Role
```javascript
const ROLE_COLORS = {
  student: {
    primary: 'blue',
    gradient: 'from-blue-600 via-indigo-600 to-purple-600'
  },
  teacher: {
    primary: 'emerald',
    gradient: 'from-emerald-600 via-teal-600 to-cyan-600'
  },
  school: {
    primary: 'slate',
    gradient: 'from-slate-600 via-gray-700 to-zinc-700'
  }
};
```

### Padrão de Botões
```jsx
// Botão padrão
<Button className="whitespace-nowrap inline-flex items-center gap-2 bg-white dark:bg-slate-900">
  <Icon className="w-4 h-4" />
  <span>Texto</span>
</Button>

// Botão em gradiente
<Button className="whitespace-nowrap inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
  <Icon className="w-4 h-4" />
  <span>Texto</span>
</Button>
```
