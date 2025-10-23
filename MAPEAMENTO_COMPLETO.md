# 📊 Mapeamento Completo - TamanduAI Atual vs V2

## 🔍 O Que Já Existe no Projeto Atual

### ✅ PROJETO ANTIGO (tamanduai-new/src)

#### **Services (75 arquivos - 100% Reutilizáveis)**
```
✅ authNotificationService.js
✅ classService.js
✅ submissionService.js
✅ gradesService.js
✅ gamificationService.js
✅ notificationService.js
✅ schoolService.js
✅ calendarService.js
✅ materialsService.js
✅ attendanceService.js
✅ analyticsMLService.js
✅ plagiarismService.js
✅ ragTrainingService.js
✅ gradingService.js
✅ classFeedService.js
✅ questionBankService.js
✅ missionsService.js
✅ studentPerformanceService.js
✅ emailService.js
✅ exportService.js
✅ smartCache.js
✅ rateLimiter.js
✅ supabaseErrorHandler.js
... (e mais 52 services)
```

#### **Migrations Supabase (35+ arquivos - 100% Reutilizáveis)**
```
✅ 20250120000000_create_class_feed_system.sql
✅ 20250120010000_create_grading_system.sql
✅ 20250120020000_create_grades_system.sql
✅ 20250121000000_create_class_analytics_system.sql
✅ 20250118000000_create_safe_count_functions.sql
✅ 20250118000001_fix_indirect_class_members_recursion.sql
... (e mais 29 migrations)
```

#### **Componentes UI (92 arquivos - 100% Reutilizáveis)**
```
✅ shadcn/ui completo em src/components/ui/
- accordion.jsx, alert.jsx, avatar.jsx, badge.jsx
- button.jsx, card.jsx, checkbox.jsx, dialog.jsx
- dropdown-menu.jsx, input.jsx, select.jsx, tabs.jsx
- toast.jsx, tooltip.jsx, form.jsx, table.jsx
... (e mais 76 componentes)
```

#### **Utils (23 arquivos - 90% Reutilizáveis)**
```
✅ formatters.js - formatDate, formatCurrency, formatNumber
✅ validators.js - validateEmail, validateCPF, validatePhone
✅ exportUtils.js - exportToExcel, exportToPDF
✅ performance.js - monitoramento de performance
✅ errorHandling.js - tratamento de erros
... (e mais 18 utils)
```

#### **Contexts (10 arquivos - 80% Reutilizáveis)**
```
✅ AuthContext.jsx
✅ ThemeContext.jsx
✅ XPContext.jsx
✅ GlobalStateContext.jsx (refatorar)
⚠️ ActivityContext.jsx (mover lógica para service)
⚠️ ClassContext.jsx (mover lógica para service)
```

#### **Hooks (35 arquivos - 70% Reutilizáveis)**
```
✅ useAuth.js
✅ useDebounce.js
✅ useLocalStorage.js
✅ useKeyboardNavigation.js
✅ useInfiniteScroll.js
... (revisar e adaptar os demais)
```

#### **Constants (6 arquivos - 100% Reutilizáveis)**
```
✅ roles.js - USER_ROLES
✅ activityTypes.js - ACTIVITY_TYPES
✅ routes.js - ROUTE_PATHS
✅ notifications.js - NOTIFICATION_TYPES
✅ gamification.js - XP_VALUES, BADGES
✅ status.js - STATUS_TYPES
```

---

### 📄 PÁGINAS EXISTENTES (118 arquivos)

#### **Projeto Antigo - Páginas Principais**
```
❌ LandingPage.jsx (duplicado com "Premium")
❌ LoginPagePremium.jsx (manter apenas essa)
❌ RegisterPagePremium.jsx (manter apenas essa)
❌ DashboardHome.jsx (genérico demais)
❌ CreateActivityPage.jsx (duplicado)
❌ CreateActivityPageEnhanced.jsx (duplicado)
❌ CreateActivityPageFixed.jsx (duplicado)
```

#### **Student Pages (Antigo)**
```
⚠️ StudentDashboard.jsx (refatorar)
⚠️ StudentActivitiesPage.jsx (refatorar)
⚠️ StudentPerformancePage.jsx (refatorar)
⚠️ StudentGamificationPage.jsx (refatorar)
⚠️ StudentHistoryPage.jsx (refatorar)
⚠️ StudentCalendarPage.jsx (refatorar)
```

#### **Teacher Pages (Antigo)**
```
⚠️ TeacherDashboard.jsx (refatorar)
⚠️ TeacherClassroomsPage.jsx (refatorar)
⚠️ TeacherActivitiesPage.jsx (refatorar)
⚠️ TeacherStudentsPage.jsx (refatorar)
⚠️ GradingQueuePage.jsx (refatorar)
⚠️ QuestionBankPage.jsx (refatorar)
⚠️ AnalyticsMLPage.jsx (refatorar)
```

#### **School Pages (Antigo)**
```
⚠️ SchoolDashboard.jsx (refatorar)
⚠️ SchoolTeachersPage.jsx (refatorar)
⚠️ SchoolStudentsPage.jsx (refatorar)
⚠️ SchoolClassesPage.jsx (refatorar)
⚠️ SchoolRankingPage.jsx (refatorar)
⚠️ SchoolCommsPage.jsx (refatorar)
⚠️ SchoolAnalyticsMLPage.jsx (refatorar)
⚠️ SchoolReportsPage.jsx (refatorar)
⚠️ SchoolSettingsPage.jsx (refatorar)
⚠️ RewardSettingsPage.jsx (refatorar)
⚠️ InviteTeacherPage.jsx (refatorar)
```

---

## 🆕 O QUE JÁ ESTÁ NO V2

### ✅ ESTRUTURA BASE V2 (TamanduAI_V2/)

```
✅ src/
   ✅ components/ui/ (91 componentes shadcn/ui)
   ✅ services/ (75 services copiados)
   ✅ hooks/ (35 hooks copiados)
   ✅ contexts/ (10 contexts copiados)
   ✅ utils/ (23 utils copiados)
   ✅ constants/ (6 arquivos copiados)
   
✅ supabase/
   ✅ migrations/ (22 migrations principais)
   
✅ Config files
   ✅ package.json (sem i18next - removido)
   ✅ tailwind.config.js
   ✅ vite.config.js
   ✅ eslint.config.js
```

---

## 🔨 O QUE PRECISA SER CONSTRUÍDO NO V2

### 📁 Estrutura de Módulos por Role

#### **1. STUDENT MODULE** (🔨 CRIAR)
```
src/modules/student/
├── pages/
│   ├── Dashboard/
│   │   └── StudentDashboard.jsx 🔨
│   ├── Classes/
│   │   ├── ClassesList.jsx 🔨
│   │   ├── ClassDetails.jsx 🔨
│   │   └── JoinClass.jsx 🔨
│   ├── Activities/
│   │   ├── ActivitiesList.jsx 🔨
│   │   ├── ActivityDetails.jsx 🔨
│   │   └── SubmitActivity.jsx 🔨
│   ├── Performance/
│   │   ├── MyGrades.jsx 🔨
│   │   ├── PerformanceAnalytics.jsx 🔨
│   │   └── AcademicHistory.jsx 🔨
│   ├── Gamification/
│   │   ├── GamificationDashboard.jsx 🔨
│   │   ├── Ranking.jsx 🔨
│   │   └── Achievements.jsx 🔨
│   └── Calendar/
│       └── StudentCalendar.jsx 🔨
├── components/
│   ├── StudentSidebar.jsx 🔨
│   ├── ActivityCard.jsx 🔨
│   ├── GradeCard.jsx 🔨
│   ├── XPProgressBar.jsx 🔨
│   └── ClassCard.jsx 🔨
├── hooks/
│   ├── useStudentActivities.js 🔨
│   ├── useStudentGrades.js 🔨
│   └── useStudentClasses.js 🔨
└── routes.jsx 🔨
```

#### **2. TEACHER MODULE** (🔨 CRIAR)
```
src/modules/teacher/
├── pages/
│   ├── Dashboard/
│   │   └── TeacherDashboard.jsx 🔨
│   ├── Classes/
│   │   ├── ClassesList.jsx 🔨
│   │   ├── CreateClass.jsx 🔨
│   │   ├── ClassDetails.jsx 🔨
│   │   ├── ClassMembers.jsx 🔨
│   │   ├── ClassFeed.jsx (adaptar do antigo) ⚠️
│   │   ├── ClassGrades.jsx (adaptar do antigo) ⚠️
│   │   ├── ClassMaterials.jsx (adaptar do antigo) ⚠️
│   │   ├── ClassAnalytics.jsx (adaptar do antigo) ⚠️
│   │   └── ClassAttendance.jsx (adaptar do antigo) ⚠️
│   ├── Activities/
│   │   ├── ActivitiesList.jsx 🔨
│   │   ├── CreateActivity.jsx (adaptar do antigo) ⚠️
│   │   ├── EditActivity.jsx 🔨
│   │   ├── ActivitySubmissions.jsx 🔨
│   │   └── DraftsPage.jsx 🔨
│   ├── Grading/
│   │   ├── GradingQueue.jsx (adaptar do antigo) ⚠️
│   │   ├── GradingInterface.jsx (adaptar do antigo) ⚠️
│   │   └── RubricManager.jsx (adaptar do antigo) ⚠️
│   ├── Students/
│   │   ├── StudentsList.jsx 🔨
│   │   └── StudentDetails.jsx 🔨
│   ├── QuestionBank/
│   │   ├── QuestionBankPage.jsx (adaptar do antigo) ⚠️
│   │   └── CreateQuestion.jsx 🔨
│   ├── Analytics/
│   │   ├── AnalyticsDashboard.jsx (adaptar do antigo) ⚠️
│   │   └── MLInsights.jsx (adaptar do antigo) ⚠️
│   └── Calendar/
│       └── TeacherCalendar.jsx 🔨
├── components/
│   ├── TeacherSidebar.jsx (adaptar do antigo) ⚠️
│   ├── ClassCard.jsx 🔨
│   ├── SubmissionCard.jsx 🔨
│   ├── GradingForm.jsx 🔨
│   └── ActivityBuilder.jsx (adaptar do antigo) ⚠️
├── hooks/
│   ├── useTeacherClasses.js 🔨
│   ├── useGrading.js 🔨
│   └── useActivityBuilder.js 🔨
└── routes.jsx 🔨
```

#### **3. SCHOOL MODULE** (🔨 CRIAR)
```
src/modules/school/
├── pages/
│   ├── Dashboard/
│   │   └── SchoolDashboard.jsx (adaptar do antigo) ⚠️
│   ├── Classes/
│   │   ├── ClassesList.jsx (adaptar do antigo) ⚠️
│   │   └── ClassDetails.jsx 🔨
│   ├── Teachers/
│   │   ├── TeachersList.jsx (adaptar do antigo) ⚠️
│   │   ├── InviteTeacher.jsx (adaptar do antigo) ⚠️
│   │   └── TeacherDetails.jsx 🔨
│   ├── Students/
│   │   ├── StudentsList.jsx (adaptar do antigo) ⚠️
│   │   └── StudentDetails.jsx 🔨
│   ├── Analytics/
│   │   ├── SchoolAnalytics.jsx (adaptar do antigo) ⚠️
│   │   └── MLInsights.jsx (adaptar do antigo) ⚠️
│   ├── Communications/
│   │   └── CommunicationsPage.jsx (adaptar do antigo) ⚠️
│   ├── Reports/
│   │   └── ReportsPage.jsx (adaptar do antigo) ⚠️
│   ├── Ranking/
│   │   └── RankingPage.jsx (adaptar do antigo) ⚠️
│   └── Settings/
│       ├── SchoolSettings.jsx (adaptar do antigo) ⚠️
│       └── RewardSettings.jsx (adaptar do antigo) ⚠️
├── components/
│   ├── SchoolSidebar.jsx (adaptar do antigo) ⚠️
│   ├── TeacherCard.jsx 🔨
│   ├── SchoolStatsCard.jsx 🔨
│   └── AnnouncementForm.jsx 🔨
├── hooks/
│   ├── useSchoolStats.js 🔨
│   └── useSchoolTeachers.js 🔨
└── routes.jsx 🔨
```

#### **4. SHARED FEATURES** (🔨 CRIAR)
```
src/features/
├── auth/
│   ├── pages/
│   │   ├── LoginPage.jsx (adaptar do antigo) ⚠️
│   │   ├── RegisterPage.jsx (adaptar do antigo) ⚠️
│   │   ├── ForgotPasswordPage.jsx (adaptar do antigo) ⚠️
│   │   ├── ResetPasswordPage.jsx (adaptar do antigo) ⚠️
│   │   └── VerifyEmailPage.jsx (adaptar do antigo) ⚠️
│   ├── components/
│   │   ├── LoginForm.jsx 🔨
│   │   ├── RegisterForm.jsx 🔨
│   │   └── SocialLogin.jsx 🔨
│   └── routes.jsx 🔨
├── notifications/
│   ├── pages/
│   │   └── NotificationCenter.jsx (adaptar do antigo) ⚠️
│   ├── components/
│   │   ├── NotificationCard.jsx 🔨
│   │   ├── NotificationBadge.jsx 🔨
│   │   └── NotificationList.jsx 🔨
│   └── routes.jsx 🔨
├── profile/
│   ├── pages/
│   │   ├── ProfilePage.jsx (adaptar do antigo) ⚠️
│   │   └── EditProfilePage.jsx (adaptar do antigo) ⚠️
│   ├── components/
│   │   ├── ProfileCard.jsx 🔨
│   │   ├── ProfileForm.jsx 🔨
│   │   └── AvatarUpload.jsx 🔨
│   └── routes.jsx 🔨
└── settings/
    ├── pages/
    │   └── SettingsPage.jsx (adaptar do antigo) ⚠️
    ├── components/
    │   ├── ThemeToggle.jsx 🔨
    │   ├── AccessibilitySettings.jsx (adaptar do antigo) ⚠️
    │   └── PrivacySettings.jsx 🔨
    └── routes.jsx 🔨
```

#### **5. SHARED LAYOUT** (🔨 CRIAR)
```
src/shared/components/layout/
├── Header.jsx 🔨
├── Footer.jsx 🔨
├── Sidebar.jsx 🔨 (base genérico)
├── MainLayout.jsx 🔨
├── RoleLayout.jsx 🔨 (wrapper que carrega sidebar correto)
└── ErrorBoundary.jsx ✅ (já existe)
```

#### **6. SHARED COMMON COMPONENTS** (🔨 CRIAR)
```
src/shared/components/common/
├── LoadingSpinner.jsx ✅ (já existe)
├── EmptyState.jsx 🔨
├── ErrorState.jsx 🔨
├── ConfirmDialog.jsx 🔨
├── DataTable.jsx 🔨
├── SearchBar.jsx 🔨
├── FilterDropdown.jsx 🔨
└── Pagination.jsx 🔨
```

---

## 📊 RESUMO QUANTITATIVO

### ✅ O Que Já Está Pronto (Copiar Direto)
- **Services**: 75 arquivos
- **Migrations**: 22 arquivos
- **UI Components**: 91 arquivos
- **Utils**: 23 arquivos
- **Hooks**: 35 arquivos
- **Contexts**: 10 arquivos
- **Constants**: 6 arquivos
- **Total**: ~262 arquivos (70% do projeto)

### 🔨 O Que Precisa Ser Construído
- **Student Module**: ~25 arquivos
- **Teacher Module**: ~35 arquivos
- **School Module**: ~25 arquivos
- **Shared Features**: ~20 arquivos
- **Layout Components**: ~10 arquivos
- **Routes**: ~5 arquivos
- **Total**: ~120 arquivos (30% do projeto)

### ⚠️ O Que Precisa Adaptar
- **Pages antigas**: ~40 arquivos (pegar lógica, refatorar UI)
- **Sidebars**: 3 arquivos (já existem, mas precisam adaptar)

---

## ⏱️ ESTIMATIVA DE TEMPO

### Tier 1: Setup + Copiar (4-5h)
- ✅ Criar estrutura de pastas (1h)
- ✅ Copiar services, utils, hooks, contexts (2h)
- ✅ Copiar UI components (1h)
- ✅ Configurar rotas base (1h)

### Tier 2: Shared Features (8-10h)
- 🔨 Auth pages + components (3h)
- 🔨 Notifications (2h)
- 🔨 Profile (2h)
- 🔨 Settings (2h)
- 🔨 Layout components (2h)

### Tier 3: Student Module (10-12h)
- 🔨 Dashboard (2h)
- 🔨 Classes (3h)
- 🔨 Activities (3h)
- 🔨 Performance (2h)
- 🔨 Gamification (2h)
- 🔨 Components + Routes (2h)

### Tier 4: Teacher Module (15-18h)
- 🔨 Dashboard (2h)
- 🔨 Classes (5h)
- 🔨 Activities (4h)
- 🔨 Grading (3h)
- 🔨 Students (2h)
- 🔨 Question Bank (2h)
- 🔨 Analytics (2h)
- 🔨 Components + Routes (3h)

### Tier 5: School Module (12-15h)
- 🔨 Dashboard (2h)
- 🔨 Classes (2h)
- 🔨 Teachers (3h)
- 🔨 Students (2h)
- 🔨 Analytics (2h)
- 🔨 Communications (2h)
- 🔨 Reports/Ranking (2h)
- 🔨 Settings (2h)
- 🔨 Components + Routes (2h)

### Tier 6: Testes + Ajustes (8-10h)
- 🔨 Testes unitários (3h)
- 🔨 Testes de integração (3h)
- 🔨 Ajustes finais (2h)
- 🔨 Documentação (2h)

**TOTAL ESTIMADO: 57-70 horas (~2-3 semanas de trabalho)**
