# ✅ CHECKLIST DE DESENVOLVIMENTO POR ROLE

## 🎯 Objetivo: Completar todas as páginas por role

---

## 🧩 FASE 1: COMPONENTES BASE (Esta Semana)

### Componentes do Design System

- [x] StatsCard
- [x] DashboardHeader
- [x] EmptyState
- [x] ClassCard
- [x] ActivityCard
- [ ] SearchInput
- [ ] FilterBar
- [ ] DataTable
- [ ] SubmissionCard
- [ ] GradeForm
- [ ] FeedbackEditor
- [ ] NavigationButtons
- [ ] TeacherCard
- [ ] StudentCard
- [ ] AlertCard

**Progresso:** 5/15 (33%)

---

## 👨‍🏫 FASE 2: TEACHER PAGES (Semana 2)

### Dashboard
- [x] TeacherDashboard
  - [x] DashboardHeader
  - [x] StatsCard (4x)
  - [x] ClassCard (lista)
  - [x] ActivityCard (lista)
  - [x] EmptyState
  - [x] Integração com ClassService

### Classes
- [ ] ClassesListPage
  - [ ] DashboardHeader
  - [ ] SearchInput
  - [ ] FilterBar
  - [ ] ClassCard (grid)
  - [ ] EmptyState
  - [ ] Integração com ClassService

- [ ] ClassDetailPage
  - [ ] DashboardHeader
  - [ ] Tabs (Atividades | Alunos | Config)
  - [ ] ActivityCard (lista)
  - [ ] DataTable (alunos)
  - [ ] EmptyState
  - [ ] Integração com ClassService

### Activities
- [ ] ActivitiesListPage
  - [ ] DashboardHeader
  - [ ] SearchInput
  - [ ] FilterBar
  - [ ] ActivityCard (grid)
  - [ ] EmptyState
  - [ ] Integração com ActivityService

- [ ] ActivityDetailPage
  - [ ] DashboardHeader
  - [ ] Tabs (Detalhes | Submissões | Feedback)
  - [ ] DataTable (submissões)
  - [ ] SubmissionCard
  - [ ] EmptyState
  - [ ] Integração com SubmissionService

### Grading
- [ ] GradingPage
  - [ ] DashboardHeader
  - [ ] SubmissionCard (grande)
  - [ ] GradeForm
  - [ ] FeedbackEditor
  - [ ] NavigationButtons
  - [ ] Integração com SubmissionService

**Progresso:** 1/6 (17%)

---

## 🏫 FASE 3: SCHOOL PAGES (Semana 3)

### Dashboard
- [x] SchoolDashboard
  - [x] DashboardHeader
  - [x] StatsCard (8x)
  - [x] LineChart
  - [x] AlertCard (mock)

### Teachers
- [ ] TeachersListPage
  - [ ] DashboardHeader
  - [ ] SearchInput
  - [ ] FilterBar
  - [ ] TeacherCard (grid)
  - [ ] DataTable
  - [ ] EmptyState
  - [ ] Integração com TeacherService

### Students
- [ ] StudentsListPage
  - [ ] DashboardHeader
  - [ ] SearchInput
  - [ ] FilterBar
  - [ ] StudentCard (grid)
  - [ ] DataTable
  - [ ] EmptyState
  - [ ] Integração com StudentService

### Classes
- [ ] ClassesListPage (School)
  - [ ] DashboardHeader
  - [ ] SearchInput
  - [ ] FilterBar
  - [ ] ClassCard (grid)
  - [ ] DataTable
  - [ ] EmptyState
  - [ ] Integração com ClassService

### Reports
- [ ] ReportsPage
  - [ ] DashboardHeader
  - [ ] ReportCard
  - [ ] DateRangePicker
  - [ ] ExportButton
  - [ ] Charts
  - [ ] Integração com ReportService

### Settings
- [ ] SettingsPage
  - [ ] DashboardHeader
  - [ ] SettingsForm
  - [ ] ToggleSwitch
  - [ ] ColorPicker
  - [ ] Integração com SettingsService

**Progresso:** 1/6 (17%)

---

## 👨‍🎓 FASE 4: STUDENT PAGES (Semana 4)

### Dashboard
- [x] StudentDashboard
  - [x] DashboardHeader
  - [x] StatsCard (6x)
  - [x] ActivityCard (lista)
  - [x] AlertCard (mock)

### Classes
- [ ] ClassesListPage (Student)
  - [ ] DashboardHeader
  - [ ] SearchInput
  - [ ] FilterBar
  - [ ] ClassCard (grid)
  - [ ] EmptyState
  - [ ] Integração com ClassService

- [ ] ClassDetailPage (Student)
  - [ ] DashboardHeader
  - [ ] Tabs (Atividades | Notas | Recursos)
  - [ ] ActivityCard (lista)
  - [ ] GradeCard
  - [ ] ResourceCard
  - [ ] EmptyState
  - [ ] Integração com ClassService

### Activities
- [ ] ActivitiesListPage (Student)
  - [ ] DashboardHeader
  - [ ] SearchInput
  - [ ] FilterBar
  - [ ] ActivityCard (grid)
  - [ ] EmptyState
  - [ ] Integração com ActivityService

- [ ] ActivityDetailPage (Student)
  - [ ] DashboardHeader
  - [ ] Tabs (Enunciado | Submissão | Feedback)
  - [ ] ActivityContent
  - [ ] SubmissionForm
  - [ ] FeedbackDisplay
  - [ ] Integração com SubmissionService

### Performance
- [ ] PerformancePage
  - [ ] DashboardHeader
  - [ ] StatsCard (4x)
  - [ ] LineChart (notas)
  - [ ] RadarChart (disciplinas)
  - [ ] GradeCard
  - [ ] Integração com PerformanceService

**Progresso:** 1/6 (17%)

---

## 🔌 FASE 5: INTEGRAÇÃO (Semana 5)

### Supabase Setup
- [ ] Criar tabelas (se não existirem)
- [ ] Configurar RLS
- [ ] Criar seed data (5 usuários, 10 turmas, 20 atividades)
- [ ] Testar queries

### Services
- [ ] ClassService - Completar todos os métodos
- [ ] ActivityService - Criar e completar
- [ ] SubmissionService - Completar todos os métodos
- [ ] TeacherService - Criar e completar
- [ ] StudentService - Criar e completar
- [ ] SchoolService - Completar todos os métodos
- [ ] ReportService - Criar e completar
- [ ] PerformanceService - Criar e completar

### Testes
- [ ] Testar fluxo Teacher completo
- [ ] Testar fluxo School completo
- [ ] Testar fluxo Student completo
- [ ] Testar autenticação
- [ ] Testar permissões

### Deploy
- [ ] Build production
- [ ] Deploy no Netlify
- [ ] Testar em produção
- [ ] Documentar

**Progresso:** 0/20 (0%)

---

## 📊 RESUMO GERAL

| Fase | Componente | Total | Completo | % |
|------|-----------|-------|----------|---|
| 1 | Componentes | 15 | 5 | 33% |
| 2 | Teacher | 6 | 1 | 17% |
| 3 | School | 6 | 1 | 17% |
| 4 | Student | 6 | 1 | 17% |
| 5 | Integração | 20 | 0 | 0% |
| **TOTAL** | **53** | **8** | **15%** |

---

## 🎯 PRÓXIMOS PASSOS IMEDIATOS

### Esta Semana:
1. [ ] Criar SearchInput component
2. [ ] Criar FilterBar component
3. [ ] Criar DataTable component
4. [ ] Criar SubmissionCard component
5. [ ] Criar GradeForm component

### Próxima Semana:
1. [ ] Implementar ClassesListPage (Teacher)
2. [ ] Implementar ClassDetailPage (Teacher)
3. [ ] Implementar ActivitiesListPage (Teacher)
4. [ ] Implementar ActivityDetailPage (Teacher)
5. [ ] Implementar GradingPage (Teacher)

---

## 💡 DICAS

- **Reutilizar componentes:** Use ClassCard, ActivityCard, etc em múltiplas páginas
- **Padrão consistente:** Todas as List pages têm: Header + Search + Filter + Grid + Empty
- **Services primeiro:** Antes de criar página, tenha o service pronto
- **Seed data:** Crie dados de teste para cada página
- **Dark mode:** Testar todas as páginas em dark mode
- **Responsivo:** Testar em mobile, tablet, desktop

---

## 📈 PROGRESSO VISUAL

```
Fase 1: Componentes
████████░░░░░░░░░░░░ 33%

Fase 2: Teacher
█░░░░░░░░░░░░░░░░░░░ 17%

Fase 3: School
█░░░░░░░░░░░░░░░░░░░ 17%

Fase 4: Student
█░░░░░░░░░░░░░░░░░░░ 17%

Fase 5: Integração
░░░░░░░░░░░░░░░░░░░░ 0%

TOTAL: ██░░░░░░░░░░░░░░░░░░ 15%
```

---

**Última atualização:** 22 de Outubro de 2025
**Próxima revisão:** Após completar Fase 1
**Responsável:** Você + Cascade

*Atualize este arquivo conforme progride!*
