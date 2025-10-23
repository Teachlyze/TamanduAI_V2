# 🏗️ ANÁLISE DA ARQUITETURA ATUAL

## 📊 ESTRUTURA DO BANCO DE DADOS (Supabase)

### **Tabelas Principais:**

#### **1. classes** ✅
```sql
- id (uuid)
- name (text) - Nome da turma
- subject (text) - Matéria/disciplina
- description (text)
- color (text) - default '#3B82F6'
- room_number (text)
- student_capacity (integer) - default 30
- created_by (uuid) - Professor que criou
- professor_id (uuid) - DEPRECATED? (usar created_by)
- school_id (uuid) - Escola (se gerenciada por escola)
- invite_code (varchar(12)) - Código de convite
- banner_color (varchar(50)) - Gradiente do banner
- is_active (boolean) - default true
- created_at, updated_at (timestamp)
```

**Relacionamentos:**
- `class_members` - Membros da turma (alunos + professor)
- `activity_class_assignments` - Atividades atribuídas
- `meetings` - Aulas/reuniões
- `discussions` - Fórum de discussão
- `class_students` - Alunos matriculados

---

#### **2. activities** ✅
```sql
- id (uuid)
- title (text)
- description (text)
- content (jsonb) - Conteúdo estruturado
- type (text) - 'assignment', 'quiz', 'project'
- max_grade (numeric) - Nota máxima
- max_score (numeric) - Pontuação máxima
- due_date (timestamp)
- created_by (uuid) - Professor
- teacher_id (uuid) - DEPRECATED? (usar created_by)
- is_published (boolean) - Publicada ou não
- is_draft (boolean) - Rascunho
- status (text) - 'draft', 'active', 'closed'
- weight (numeric) - Peso na média
- plagiarism_enabled (boolean)
- plagiarism_threshold (smallint) - default 35
- is_group_activity (boolean)
- group_size (integer)
- instructions (text)
- created_at, updated_at (timestamp)
```

**Relacionamentos:**
- `activity_class_assignments` - Turmas onde foi atribuída
- `submissions` - Submissões dos alunos
- `answers` - Respostas dos alunos

---

#### **3. submissions** ✅
```sql
- id (uuid)
- activity_id (uuid)
- user_id (uuid) - Aluno
- content (jsonb) - Conteúdo da submissão
- grade (numeric) - Nota recebida
- feedback (text) - Feedback do professor
- status (text) - 'pending', 'graded', 'late'
- submitted_at (timestamp)
- graded_at (timestamp)
- graded_by (uuid) - Professor que corrigiu
- created_at, updated_at (timestamp)
```

**Relacionamentos:**
- `answers` - Respostas individuais
- `activities` - Atividade
- `profiles` - Aluno

---

#### **4. class_members** ✅
```sql
- id (uuid)
- class_id (uuid)
- user_id (uuid)
- role (text) - 'teacher', 'student'
- joined_at (timestamp)
```

---

#### **5. profiles** ✅
```sql
- id (uuid) - FK para auth.users
- email (text)
- name (text)
- role (text) - 'teacher', 'student', 'school'
- avatar_url (text)
- bio (text)
- created_at, updated_at (timestamp)
```

---

#### **6. gamification_profiles** ✅
```sql
- user_id (uuid)
- xp_total (integer) - XP total
- level (integer) - Nível
- current_streak (integer) - Streak atual
- longest_streak (integer) - Maior streak
- last_activity_at (timestamp)
- created_at, updated_at (timestamp)
```

---

#### **7. discussions (Feed/Mural)** ✅
```sql
- id (uuid)
- class_id (uuid)
- activity_id (uuid) - Opcional
- title (text)
- description (text)
- created_by (uuid)
- is_pinned (boolean) - Fixado
- is_locked (boolean) - Trancado
- created_at, updated_at (timestamp)
```

**Relacionamentos:**
- `discussion_messages` - Comentários

---

#### **8. discussion_messages** ✅
```sql
- id (uuid)
- discussion_id (uuid)
- parent_message_id (uuid) - Para threading
- user_id (uuid)
- content (text)
- is_deleted (boolean)
- deleted_by (uuid)
- deleted_at (timestamp)
- is_edited (boolean)
- edited_at (timestamp)
- created_at (timestamp)
```

---

## 🛠️ SERVICES EXISTENTES

### **ClassService** ✅
**Arquivo:** `src/shared/services/classService.js`

**Métodos Implementados:**
- `getClasses(options)` - Lista turmas com filtros
- `getClassById(classId)` - Busca turma por ID
- `createClass(classData, studentIds)` - Cria turma
- (verificar mais métodos...)

**Query Patterns:**
```javascript
// Busca com relacionamentos
supabase
  .from('classes')
  .select(`
    *,
    members:class_members(*, user:profiles(*)),
    meetings:meetings(*)
  `)
```

---

### **SubmissionService** ✅
**Arquivo:** `src/shared/services/submissionService.js`

**Métodos (verificados):**
- `createSubmission(data, submit)`
- `getSubmission(submissionId, userId)`
- `getSubmissionsForActivity(activityId, options)`
- `gradeSubmission(submissionId, gradingData)`
- `getSubmissionStats(activityId)`
- `submitDraft(submissionId)`

---

### **ActivityService** ⚠️
**Arquivo:** Precisa verificar se existe

---

## 🔌 EDGE FUNCTIONS EXISTENTES

**Total:** 32 edge functions

**Principais:**
1. **auth-***  - Autenticação (login, register, guard)
2. **plagiarism-check** - Verificação de plágio
3. **chatbot-query** - Chatbot IA
4. **quiz-generator** - Gerador de quizzes
5. **process-rag-training** - Treinamento de RAG
6. **send-email** - Envio de emails
7. **ranking-job** - Atualização de rankings
8. **school-aggregations** - Agregações de escola
9. **invite-teacher** - Convidar professor
10. **notify-upcoming-classes** - Notificar aulas

---

## 📐 PADRÕES ARQUITETURAIS

### **1. Separação por Role:**
```
src/modules/
├── teacher/
│   ├── pages/
│   ├── components/
│   └── routes.jsx
├── school/
│   ├── pages/
│   ├── components/
│   └── routes.jsx
└── student/
    ├── pages/
    ├── components/
    └── routes.jsx
```

### **2. Services Layer:**
```
src/shared/services/
├── supabaseClient.js - Cliente configurado
├── classService.js - CRUD de turmas
├── submissionService.js - CRUD de submissões
├── activityService.js - CRUD de atividades (?)
├── notificationOrchestrator.js - Notificações
└── edgeFunctions/
    └── authEdge.js - Funções de auth
```

### **3. Design System:**
```
src/shared/design/
├── tokens.js - Tokens de design
├── components/ - Componentes reutilizáveis
│   ├── StatsCard.jsx ✅
│   ├── DashboardHeader.jsx ✅
│   ├── EmptyState.jsx ✅
│   ├── ClassCard.jsx ✅
│   └── ActivityCard.jsx ✅
└── index.js - Exports
```

---

## ⚠️ PONTOS DE ATENÇÃO

### **1. Campos Duplicados:**
- `activities.teacher_id` vs `activities.created_by`
- `classes.professor_id` vs `classes.created_by`
- ❗ **USAR created_by** (é o padrão novo)

### **2. Status vs Estado:**
- `activities.status` ('draft', 'active', 'closed')
- `activities.is_draft` (boolean)
- `activities.is_published` (boolean)
- ❗ **Priorizar `status`**

### **3. Gamificação:**
- XP system implementado
- Levels e streaks
- Badges e achievements
- ❗ **Integrar nas páginas**

### **4. RLS (Row Level Security):**
- Todas as tabelas têm RLS ativado
- ❗ **Respeitar permissões**
- Testar com diferentes roles

---

## 🎯 DECISÕES ARQUITETURAIS

### **Para TeacherClassroomsPage:**

**1. Query de Turmas:**
```javascript
const { data: classes } = await ClassService.getClasses({
  teacherId: user.id,
  activeOnly: true
});
```

**2. Contagem de Alunos:**
```javascript
// Já vem no relacionamento
const studentCount = classItem.members?.filter(m => m.role === 'student').length || 0;
```

**3. Contagem de Atividades:**
```javascript
// Precisa criar query específica ou usar aggregation
const { data: activities } = await supabase
  .from('activity_class_assignments')
  .select('activity_id')
  .eq('class_id', classId);
```

**4. Código de Convite:**
```javascript
// Já existe no banco: invite_code
// Copiar: navigator.clipboard.writeText(inviteCode)
```

---

## 📝 MÉTODOS QUE PRECISAM SER CRIADOS

### **ClassService:**
- [ ] `getClassStats(classId)` - Stats da turma
- [ ] `generateInviteCode(classId)` - Gerar novo código
- [ ] `updateClass(classId, data)` - Atualizar turma
- [ ] `archiveClass(classId)` - Arquivar turma
- [ ] `deleteClass(classId)` - Deletar turma
- [ ] `getClassMembers(classId)` - Listar membros
- [ ] `addMember(classId, userId, role)` - Adicionar membro
- [ ] `removeMember(classId, userId)` - Remover membro

### **ActivityService (criar):**
- [ ] `getActivities(options)` - Listar atividades
- [ ] `getActivityById(activityId)` - Buscar atividade
- [ ] `createActivity(data)` - Criar atividade
- [ ] `updateActivity(activityId, data)` - Atualizar
- [ ] `deleteActivity(activityId)` - Deletar
- [ ] `publishActivity(activityId)` - Publicar
- [ ] `assignToClass(activityId, classId)` - Atribuir à turma

---

## 🚀 PRÓXIMOS PASSOS

### **FASE 1: Componentes Base**
1. Criar componentes necessários:
   - SearchInput
   - FilterBar
   - DataTable
   - CopyButton
   - InlineEdit
   - ColorPicker

### **FASE 2: Completar Services**
1. Adicionar métodos faltantes em ClassService
2. Criar ActivityService completo
3. Criar MaterialService (para arquivos)

### **FASE 3: TeacherClassroomsPage**
1. Implementar página completa
2. Integrar com services
3. Testar com dados reais

---

## ✅ CHECKLIST DE CONFORMIDADE

Ao criar cada página, garantir:

- [ ] Usar `created_by` (não `teacher_id` ou `professor_id`)
- [ ] Respeitar RLS policies
- [ ] Usar services existentes
- [ ] Seguir padrão de componentes do design system
- [ ] Tratar empty states
- [ ] Tratar erros graciosamente
- [ ] Usar formatação de dados (valueOrEmpty, formatNumber)
- [ ] Manter consistência de gradientes por role
- [ ] Implementar dark mode
- [ ] Mobile responsivo

---

**Status:** ✅ Análise Completa
**Próximo:** Criar componentes base da Fase 1
**Data:** 22 de Outubro de 2025
