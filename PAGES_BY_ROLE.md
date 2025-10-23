# 📄 PÁGINAS POR ROLE - Plano Completo

## 🎯 Estratégia: Desenvolver todas as telas por role

Ao invés de fazer feature por feature, vamos fazer **role por role**. Isso significa:
- Completar TODAS as páginas do Teacher
- Depois TODAS as páginas do School
- Depois TODAS as páginas do Student

---

## 👨‍🏫 TEACHER ROLE - 6 Páginas

### 1. **Dashboard** ✅ (Pronto)
**Arquivo:** `src/modules/teacher/pages/Dashboard/TeacherDashboard.jsx`

**Componentes:**
- DashboardHeader
- StatsCard (4x)
- ClassCard (lista recentes)
- ActivityCard (lista recentes)
- EmptyState

**Funcionalidades:**
- ✅ Mostrar stats (turmas, alunos, atividades, correções)
- ✅ Listar turmas recentes
- ✅ Listar atividades recentes
- ✅ Listar correções pendentes
- ✅ Botões de ação rápida

---

### 2. **Classes List** 📝 (Novo)
**Arquivo:** `src/modules/teacher/pages/Classes/ClassesListPage.jsx`

**Componentes:**
- DashboardHeader
- SearchInput (novo)
- FilterBar (novo)
- ClassCard (grid)
- EmptyState

**Funcionalidades:**
- [ ] Listar todas as turmas do professor
- [ ] Buscar por nome
- [ ] Filtrar por status (ativa, inativa, arquivada)
- [ ] Ordenar por nome, data criação, quantidade alunos
- [ ] Botão "Nova Turma"
- [ ] Ações: Ver, Editar, Arquivar, Deletar

**Dados:**
```jsx
{
  id: string,
  name: string,
  subject: string,
  description: string,
  studentCount: number,
  status: 'active' | 'inactive' | 'archived',
  createdAt: date,
  color: string
}
```

---

### 3. **Class Detail** 📝 (Novo)
**Arquivo:** `src/modules/teacher/pages/Classes/ClassDetailPage.jsx`

**Componentes:**
- DashboardHeader (com nome da turma)
- Tabs: Atividades | Alunos | Configurações
- ActivityCard (lista)
- DataTable (alunos)
- EmptyState

**Funcionalidades:**
- [ ] Mostrar detalhes da turma
- [ ] Listar atividades da turma
- [ ] Listar alunos da turma
- [ ] Botão "Nova Atividade"
- [ ] Botão "Adicionar Aluno"
- [ ] Editar configurações da turma

**Dados:**
```jsx
{
  id: string,
  name: string,
  subject: string,
  description: string,
  students: Array,
  activities: Array,
  settings: Object
}
```

---

### 4. **Activities List** 📝 (Novo)
**Arquivo:** `src/modules/teacher/pages/Activities/ActivitiesListPage.jsx`

**Componentes:**
- DashboardHeader
- SearchInput
- FilterBar
- ActivityCard (grid)
- EmptyState

**Funcionalidades:**
- [ ] Listar todas as atividades do professor
- [ ] Buscar por título
- [ ] Filtrar por status, classe, prioridade
- [ ] Ordenar por data, prioridade, progresso
- [ ] Botão "Nova Atividade"
- [ ] Ações: Ver, Editar, Duplicar, Deletar

**Dados:**
```jsx
{
  id: string,
  title: string,
  className: string,
  dueDate: date,
  status: 'active' | 'completed' | 'pending' | 'closed',
  priority: 'low' | 'normal' | 'high' | 'urgent',
  submissionCount: number,
  totalStudents: number
}
```

---

### 5. **Activity Detail** 📝 (Novo)
**Arquivo:** `src/modules/teacher/pages/Activities/ActivityDetailPage.jsx`

**Componentes:**
- DashboardHeader
- Tabs: Detalhes | Submissões | Feedback
- DataTable (submissões)
- SubmissionCard (novo)
- EmptyState

**Funcionalidades:**
- [ ] Mostrar detalhes da atividade
- [ ] Listar submissões dos alunos
- [ ] Filtrar por status (entregue, não entregue, atrasada)
- [ ] Ver submissão individual
- [ ] Dar nota
- [ ] Dar feedback
- [ ] Botão "Editar Atividade"

**Dados:**
```jsx
{
  id: string,
  title: string,
  description: string,
  dueDate: date,
  submissions: Array,
  rubric: Object
}
```

---

### 6. **Grading** 📝 (Novo)
**Arquivo:** `src/modules/teacher/pages/Grading/GradingPage.jsx`

**Componentes:**
- DashboardHeader
- SubmissionCard (grande)
- GradeForm (novo)
- FeedbackEditor (novo)
- NavigationButtons (novo)

**Funcionalidades:**
- [ ] Mostrar submissão do aluno
- [ ] Formulário de nota
- [ ] Editor de feedback
- [ ] Navegação entre submissões
- [ ] Salvar nota e feedback
- [ ] Marcar como corrigido

**Dados:**
```jsx
{
  submissionId: string,
  studentName: string,
  activityTitle: string,
  submittedAt: date,
  content: string,
  grade: number,
  feedback: string
}
```

---

## 🏫 SCHOOL ROLE - 6 Páginas

### 1. **Dashboard** ✅ (Pronto)
**Arquivo:** `src/modules/school/pages/Dashboard/SchoolDashboard.jsx`

**Componentes:**
- DashboardHeader
- StatsCard (8x)
- LineChart (crescimento)
- AlertCard (novo)

**Funcionalidades:**
- ✅ Mostrar stats (professores, alunos, turmas, atividades)
- ✅ Gráfico de crescimento de alunos
- ✅ Alertas importantes
- ✅ Professores recentes
- ✅ Top classes

---

### 2. **Teachers List** 📝 (Novo)
**Arquivo:** `src/modules/school/pages/Teachers/TeachersListPage.jsx`

**Componentes:**
- DashboardHeader
- SearchInput
- FilterBar
- TeacherCard (novo)
- DataTable
- EmptyState

**Funcionalidades:**
- [ ] Listar todos os professores
- [ ] Buscar por nome, email
- [ ] Filtrar por status, departamento
- [ ] Ordenar por nome, data entrada
- [ ] Botão "Adicionar Professor"
- [ ] Ações: Ver, Editar, Ativar/Desativar, Deletar

**Dados:**
```jsx
{
  id: string,
  name: string,
  email: string,
  department: string,
  classCount: number,
  studentCount: number,
  status: 'active' | 'inactive',
  joinedAt: date
}
```

---

### 3. **Students List** 📝 (Novo)
**Arquivo:** `src/modules/school/pages/Students/StudentsListPage.jsx`

**Componentes:**
- DashboardHeader
- SearchInput
- FilterBar
- StudentCard (novo)
- DataTable
- EmptyState

**Funcionalidades:**
- [ ] Listar todos os alunos
- [ ] Buscar por nome, email, matrícula
- [ ] Filtrar por status, série, turma
- [ ] Ordenar por nome, data entrada
- [ ] Botão "Adicionar Aluno"
- [ ] Ações: Ver, Editar, Ativar/Desativar, Deletar

**Dados:**
```jsx
{
  id: string,
  name: string,
  email: string,
  enrollment: string,
  grade: string,
  classCount: number,
  status: 'active' | 'inactive',
  joinedAt: date
}
```

---

### 4. **Classes List** 📝 (Novo)
**Arquivo:** `src/modules/school/pages/Classes/ClassesListPage.jsx`

**Componentes:**
- DashboardHeader
- SearchInput
- FilterBar
- ClassCard (grid)
- DataTable
- EmptyState

**Funcionalidades:**
- [ ] Listar todas as turmas da escola
- [ ] Buscar por nome, professor
- [ ] Filtrar por status, série, professor
- [ ] Ordenar por nome, quantidade alunos
- [ ] Ver detalhes da turma
- [ ] Ações: Ver, Editar, Arquivar, Deletar

**Dados:**
```jsx
{
  id: string,
  name: string,
  subject: string,
  teacher: string,
  studentCount: number,
  status: 'active' | 'inactive' | 'archived',
  createdAt: date
}
```

---

### 5. **Reports** 📝 (Novo)
**Arquivo:** `src/modules/school/pages/Reports/ReportsPage.jsx`

**Componentes:**
- DashboardHeader
- ReportCard (novo)
- DateRangePicker (novo)
- ExportButton (novo)
- Charts (novo)

**Funcionalidades:**
- [ ] Gerar relatórios de desempenho
- [ ] Relatório de alunos por turma
- [ ] Relatório de atividades por professor
- [ ] Relatório de notas
- [ ] Filtrar por período
- [ ] Exportar em PDF/Excel

**Dados:**
```jsx
{
  reportType: string,
  period: {start: date, end: date},
  data: Array,
  charts: Array
}
```

---

### 6. **Settings** 📝 (Novo)
**Arquivo:** `src/modules/school/pages/Settings/SettingsPage.jsx`

**Componentes:**
- DashboardHeader
- SettingsForm (novo)
- ToggleSwitch (novo)
- ColorPicker (novo)

**Funcionalidades:**
- [ ] Configurações gerais da escola
- [ ] Logo e nome
- [ ] Cores da marca
- [ ] Permissões
- [ ] Notificações
- [ ] Integrações

**Dados:**
```jsx
{
  schoolName: string,
  logo: string,
  colors: Object,
  permissions: Object,
  notifications: Object,
  integrations: Object
}
```

---

## 👨‍🎓 STUDENT ROLE - 6 Páginas

### 1. **Dashboard** ✅ (Pronto)
**Arquivo:** `src/modules/student/pages/Dashboard/StudentDashboard.jsx`

**Componentes:**
- DashboardHeader
- StatsCard (6x)
- ActivityCard (lista)
- AlertCard
- EmptyState

**Funcionalidades:**
- ✅ Mostrar stats (turmas, atividades, notas, ranking)
- ✅ Atividades pendentes
- ✅ Notas recentes
- ✅ Alertas importantes
- ✅ Botões de ação rápida

---

### 2. **Classes List** 📝 (Novo)
**Arquivo:** `src/modules/student/pages/Classes/ClassesListPage.jsx`

**Componentes:**
- DashboardHeader
- SearchInput
- FilterBar
- ClassCard (grid)
- EmptyState

**Funcionalidades:**
- [ ] Listar todas as turmas do aluno
- [ ] Buscar por nome, professor
- [ ] Filtrar por status
- [ ] Ordenar por nome, professor
- [ ] Ver detalhes da turma
- [ ] Ações: Ver, Sair (se permitido)

**Dados:**
```jsx
{
  id: string,
  name: string,
  subject: string,
  teacher: string,
  status: 'active' | 'completed' | 'archived',
  grade: number,
  progress: number
}
```

---

### 3. **Class Detail** 📝 (Novo)
**Arquivo:** `src/modules/student/pages/Classes/ClassDetailPage.jsx`

**Componentes:**
- DashboardHeader
- Tabs: Atividades | Notas | Recursos
- ActivityCard (lista)
- GradeCard (novo)
- ResourceCard (novo)
- EmptyState

**Funcionalidades:**
- [ ] Mostrar detalhes da turma
- [ ] Listar atividades da turma
- [ ] Mostrar notas recebidas
- [ ] Listar recursos (materiais)
- [ ] Filtrar atividades por status
- [ ] Ver atividade

**Dados:**
```jsx
{
  id: string,
  name: string,
  subject: string,
  teacher: string,
  activities: Array,
  grades: Array,
  resources: Array
}
```

---

### 4. **Activities List** 📝 (Novo)
**Arquivo:** `src/modules/student/pages/Activities/ActivitiesListPage.jsx`

**Componentes:**
- DashboardHeader
- SearchInput
- FilterBar
- ActivityCard (grid)
- EmptyState

**Funcionalidades:**
- [ ] Listar todas as atividades do aluno
- [ ] Buscar por título, classe
- [ ] Filtrar por status, prioridade, classe
- [ ] Ordenar por data, prioridade, prazo
- [ ] Ver atividade
- [ ] Ações: Fazer, Entregar, Ver Feedback

**Dados:**
```jsx
{
  id: string,
  title: string,
  className: string,
  dueDate: date,
  status: 'pending' | 'submitted' | 'graded' | 'overdue',
  priority: 'low' | 'normal' | 'high' | 'urgent',
  grade: number,
  feedback: string
}
```

---

### 5. **Activity Detail** 📝 (Novo)
**Arquivo:** `src/modules/student/pages/Activities/ActivityDetailPage.jsx`

**Componentes:**
- DashboardHeader
- Tabs: Enunciado | Minha Submissão | Feedback
- ActivityContent (novo)
- SubmissionForm (novo)
- FeedbackDisplay (novo)

**Funcionalidades:**
- [ ] Mostrar enunciado da atividade
- [ ] Mostrar rubrica (critérios)
- [ ] Formulário para fazer/editar submissão
- [ ] Mostrar feedback do professor
- [ ] Mostrar nota
- [ ] Botão "Entregar"

**Dados:**
```jsx
{
  id: string,
  title: string,
  description: string,
  dueDate: date,
  rubric: Object,
  submission: {
    content: string,
    submittedAt: date,
    grade: number,
    feedback: string
  }
}
```

---

### 6. **Performance** 📝 (Novo)
**Arquivo:** `src/modules/student/pages/Performance/PerformancePage.jsx`

**Componentes:**
- DashboardHeader
- StatsCard (4x)
- LineChart (notas ao longo do tempo)
- RadarChart (desempenho por disciplina)
- GradeCard (novo)

**Funcionalidades:**
- [ ] Mostrar desempenho geral
- [ ] Gráfico de notas ao longo do tempo
- [ ] Desempenho por disciplina
- [ ] Comparação com média da turma
- [ ] Pontos fortes e fracos
- [ ] Recomendações

**Dados:**
```jsx
{
  overallGrade: number,
  grades: Array,
  performance: {
    bySubject: Object,
    trend: Array,
    comparison: Object
  }
}
```

---

## 📊 Resumo de Páginas

| Role | Dashboard | List 1 | Detail 1 | List 2 | Detail 2 | Special |
|------|-----------|--------|----------|--------|----------|---------|
| **Teacher** | ✅ | Classes | Class | Activities | Activity | Grading |
| **School** | ✅ | Teachers | - | Students | - | Reports, Settings |
| **Student** | ✅ | Classes | Class | Activities | Activity | Performance |

**Total:** 18 páginas (3 dashboards + 15 páginas específicas)

---

## 🧩 Componentes Necessários

### ✅ Já Existem:
- StatsCard
- DashboardHeader
- EmptyState
- ClassCard
- ActivityCard

### 📝 Novos Componentes:
1. **SearchInput** - Input de busca
2. **FilterBar** - Barra de filtros
3. **DataTable** - Tabela de dados
4. **SubmissionCard** - Card de submissão
5. **GradeForm** - Formulário de nota
6. **FeedbackEditor** - Editor de feedback
7. **NavigationButtons** - Botões de navegação
8. **TeacherCard** - Card de professor
9. **StudentCard** - Card de aluno
10. **AlertCard** - Card de alerta
11. **ReportCard** - Card de relatório
12. **SettingsForm** - Formulário de configurações
13. **GradeCard** - Card de nota
14. **ResourceCard** - Card de recurso
15. **ActivityContent** - Conteúdo da atividade
16. **SubmissionForm** - Formulário de submissão
17. **FeedbackDisplay** - Exibição de feedback

---

## 🚀 Ordem de Desenvolvimento

### **Fase 1: Componentes Base** (Esta semana)
- [ ] SearchInput
- [ ] FilterBar
- [ ] DataTable
- [ ] SubmissionCard
- [ ] GradeForm

### **Fase 2: Teacher Pages** (Semana 2)
- [ ] ClassesListPage
- [ ] ClassDetailPage
- [ ] ActivitiesListPage
- [ ] ActivityDetailPage
- [ ] GradingPage

### **Fase 3: School Pages** (Semana 3)
- [ ] TeachersListPage
- [ ] StudentsListPage
- [ ] ClassesListPage
- [ ] ReportsPage
- [ ] SettingsPage

### **Fase 4: Student Pages** (Semana 4)
- [ ] ClassesListPage
- [ ] ClassDetailPage
- [ ] ActivitiesListPage
- [ ] ActivityDetailPage
- [ ] PerformancePage

### **Fase 5: Integração** (Semana 5)
- [ ] Seed data no Supabase
- [ ] Conectar services
- [ ] Testar fluxos
- [ ] Deploy

---

## 📈 Progresso

```
Fase 1: Componentes Base
████░░░░░░░░░░░░░░░░ 20%

Fase 2: Teacher Pages
░░░░░░░░░░░░░░░░░░░░ 0%

Fase 3: School Pages
░░░░░░░░░░░░░░░░░░░░ 0%

Fase 4: Student Pages
░░░░░░░░░░░░░░░░░░░░ 0%

Fase 5: Integração
░░░░░░░░░░░░░░░░░░░░ 0%

TOTAL: 20%
```

---

**Status:** 📋 Plano Completo
**Próximo:** Iniciar Fase 1 - Componentes Base
**Estimativa:** 4-5 semanas para tudo pronto

*Última atualização: 22 de Outubro de 2025*
