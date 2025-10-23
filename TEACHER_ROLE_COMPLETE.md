# 👨‍🏫 TEACHER ROLE - Plano Completo de Implementação

## 📊 Visão Geral

**Total de Páginas:** 16 telas
**Status Atual:** 1/16 completa (6%)
**Tempo Estimado:** 3-4 semanas

---

## ✅ 1. DASHBOARD E VISÃO GERAL (1/1 completa)

### TeacherDashboard ✅
**Rota:** `/teacher/dashboard`
**Status:** ✅ COMPLETO

**Componentes Implementados:**
- [x] Header Animado com padrão de pontos
- [x] Saudação personalizada
- [x] 4 Stats Cards Principais:
  - 📚 Total de Turmas Ativas
  - 👥 Total de Alunos
  - 📝 Total de Atividades (ativas)
  - ⏰ Correções Pendentes
- [x] Turmas Recentes (últimas 5)
- [x] Atividades Recentes (últimas 5)
- [x] Submissões Pendentes de Correção
- [x] Botões de Ação Rápida

**O que falta:**
- [ ] Alunos em Destaque (Top 3)
- [ ] Integração completa com dados reais

---

## 📚 2. TURMAS (CLASSES) (0/6 completas)

### 2.1 TeacherClassroomsPage 📝
**Rota:** `/teacher/classrooms`
**Prioridade:** ⭐⭐⭐ ALTA

**Componentes Necessários:**
- [ ] Header com gradiente
- [ ] Contador: "X turmas ativas"
- [ ] SearchInput (busca por nome/código)
- [ ] FilterBar (ordenação)
- [ ] Stats Gerais:
  - Total de alunos
  - Total de atividades ativas
- [ ] Grid de Cards de Turmas:
  - Nome, matéria, cor
  - Código de convite com botão copiar
  - Stats: alunos, atividades, correções
  - Botões: Ver, Editar, Convidar
- [ ] Botão Flutuante: ➕ Criar Nova Turma
- [ ] EmptyState

**Dados:**
```jsx
{
  id: string,
  name: string,
  subject: string,
  color: string,
  inviteCode: string,
  studentCount: number,
  activityCount: number,
  pendingCorrections: number
}
```

---

### 2.2 ClassDetailsPage 📝
**Rota:** `/teacher/classes/:classId`
**Prioridade:** ⭐⭐⭐ ALTA

**Componentes Necessários:**
- [ ] Header da Turma:
  - Nome editável inline
  - Matéria/disciplina
  - Código de convite com botão copiar
  - Botões: Convidar Alunos, Configurações
- [ ] Tabs de Navegação:
  - 📰 Mural (Feed)
  - ✏️ Correções
  - 📊 Notas
  - 📝 Atividades
  - 📚 Materiais
  - 📋 Frequência
  - 👥 Membros
- [ ] Conteúdo dinâmico por tab

---

### 2.3 ClassDetailsPageNew (Mural/Feed) 📝
**Rota:** `/teacher/classes/:classId/feed`
**Prioridade:** ⭐⭐ MÉDIA

**Componentes Necessários:**
- [ ] Header com gradiente azul/roxo/indigo
- [ ] Botão: ➕ Criar Post
- [ ] Filtros por Tipo:
  - 📢 Todos
  - 📣 Anúncios
  - 📝 Atividades
  - 📚 Materiais
  - 🔗 Links
  - ❓ Perguntas
- [ ] Feed de Posts:
  - Avatar e nome do autor
  - Tipo (badge colorido)
  - Título e conteúdo
  - Link anexado
  - 📌 Ícone de fixado
  - Contadores: visualizações, curtidas, comentários
  - Botões: Curtir, Comentar, Fixar, Excluir
- [ ] Sistema de Comentários:
  - Threading (até 2 níveis)
  - Curtir comentários
  - Deletar próprio comentário
- [ ] Modal de Criar Post:
  - Seletor de tipo
  - Título e conteúdo
  - Campo de link
  - Toggle: Permitir comentários

**Dados:**
```jsx
{
  id: string,
  type: 'announcement' | 'activity' | 'material' | 'link' | 'question',
  author: {id, name, avatar},
  title: string,
  content: string,
  link?: string,
  isPinned: boolean,
  views: number,
  likes: number,
  comments: Array,
  createdAt: date
}
```

---

### 2.4 EditClassPage 📝
**Rota:** `/teacher/classes/:classId/edit`
**Prioridade:** ⭐⭐ MÉDIA

**Componentes Necessários:**
- [ ] Header com gradiente
- [ ] Formulário de Edição:
  - Nome da turma
  - Matéria/disciplina (select)
  - Descrição (textarea)
  - Cor personalizada (color picker)
- [ ] Código de Convite:
  - Código atual (read-only)
  - Botão: 📋 Copiar Código
  - Botão: 🔄 Gerar Novo Código
  - Botão: 🔗 Gerar Link de Acesso
- [ ] Configurações Básicas:
  - Data de início
  - Data de término
- [ ] Zona de Perigo:
  - Botão: 📦 Arquivar Turma
  - Botão: 🗑️ Excluir Turma (confirmação)
- [ ] Botões: 💾 Salvar, ❌ Cancelar

---

### 2.5 TeacherClassMembersPage 📝
**Rota:** `/teacher/classes/:classId/members`
**Prioridade:** ⭐⭐⭐ ALTA

**Componentes Necessários:**
- [ ] Header com nome da turma
- [ ] Stats:
  - 👥 Total de Alunos
  - ✅ Ativos
  - ⏸️ Inativos
- [ ] Botões de Ação:
  - ➕ Adicionar Aluno
  - 📋 Copiar Código de Convite
- [ ] SearchInput (por nome/email)
- [ ] Lista de Membros:
  - Avatar + nome + email
  - Data de entrada
  - Status (badge)
  - Última atividade
  - Botões: Ver Perfil, Remover
- [ ] Histórico de Mudanças

**Dados:**
```jsx
{
  id: string,
  name: string,
  email: string,
  avatar: string,
  status: 'active' | 'inactive',
  joinedAt: date,
  lastActivity: date
}
```

---

### 2.6 ClassSchedulePage 📝
**Rota:** `/teacher/classes/:classId/schedule`
**Prioridade:** ⭐ BAIXA

**Componentes Necessários:**
- [ ] Calendário Mensal (visualização simples)
- [ ] Eventos coloridos por tipo:
  - 📝 Atividades (prazo) - azul
  - 📚 Aulas - verde
  - 📊 Provas - vermelho
  - 🎉 Eventos especiais - roxo
- [ ] Modal de detalhes do evento (ao clicar)
- [ ] Botão: ➕ Adicionar Evento
- [ ] Lista Lateral de Próximos Eventos:
  - Próximos 7 dias
  - Badge de tipo, título, data/hora
  - Countdown

**Dados:**
```jsx
{
  id: string,
  type: 'activity' | 'class' | 'exam' | 'special',
  title: string,
  date: date,
  time: string,
  description: string
}
```

---

## 📝 3. ATIVIDADES (0/3 completas)

### 3.1 TeacherActivitiesPage 📝
**Rota:** `/teacher/activities`
**Prioridade:** ⭐⭐⭐ ALTA

**Componentes Necessários:**
- [ ] Header com gradiente
- [ ] Stats Cards:
  - 📊 Total de Atividades
  - ✅ Ativas
  - 🔒 Encerradas
- [ ] Busca e Filtros:
  - SearchInput (por título)
  - Filtro por turma
  - Filtro por status
  - Filtro por tipo (tarefa/quiz/projeto)
- [ ] Grid de ActivityCards:
  - Título, descrição
  - Turma(s) vinculada(s)
  - Prazo, pontuação máxima
  - Status (badge)
  - Número de submissões
  - Botões: Ver Detalhes, Editar, Ver Submissões
- [ ] Botão: ➕ Nova Atividade

---

### 3.2 ClassActivitiesPage 📝
**Rota:** `/teacher/classes/:classId/activities`
**Prioridade:** ⭐⭐ MÉDIA

**Componentes Necessários:**
- Similar ao TeacherActivitiesPage
- Filtrado por turma específica
- Header com nome da turma
- Botão: ➕ Nova Atividade para esta Turma

---

### 3.3 ActivitySubmissionsPage 📝
**Rota:** `/teacher/activities/:activityId/submissions`
**Prioridade:** ⭐⭐⭐ ALTA

**Componentes Necessários:**
- [ ] Header da Atividade:
  - Título
  - Prazo
  - Pontuação máxima
- [ ] Stats:
  - 📊 Total de Submissões
  - ✅ Corrigidas
  - ⏰ Pendentes
- [ ] Lista de Submissões:
  - Avatar + nome do aluno
  - Data de submissão
  - Status (badge: pendente/corrigida/atrasada)
  - Nota (se corrigida)
  - Botão "Ver/Corrigir"

**Dados:**
```jsx
{
  id: string,
  student: {id, name, avatar},
  submittedAt: date,
  status: 'pending' | 'graded' | 'late',
  grade?: number,
  content: string
}
```

---

## ✏️ 4. CORREÇÕES E NOTAS (0/3 completas)

### 4.1 GradingPage 📝
**Rota:** `/teacher/grading`
**Prioridade:** ⭐⭐⭐ ALTA

**Componentes Necessários:**
- [ ] Header com gradiente
- [ ] Filtros:
  - Dropdown de atividades
  - SearchInput (por nome do aluno)
  - Status (todas/pendentes/corrigidas)
  - Filtro por turma
- [ ] Lista de Submissões Expansíveis:
  - Card com nome, atividade, status
  - Expandir para ver conteúdo
- [ ] Interface de Correção:
  - Visualizar conteúdo
  - Input de nota (0-10)
  - Textarea de feedback
  - Botão "Salvar Nota"

---

### 4.2 ClassGradingPage 📝
**Rota:** `/teacher/classes/:classId/grading`
**Prioridade:** ⭐⭐ MÉDIA

**Componentes Necessários:**
- Idêntico ao GradingPage
- Pré-filtrado pela turma
- Header mostra nome da turma

---

### 4.3 ClassGradesPage 📝
**Rota:** `/teacher/classes/:classId/grades`
**Prioridade:** ⭐⭐ MÉDIA

**Componentes Necessários:**
- [ ] Header com gradiente indigo/purple/pink
- [ ] Stats Cards:
  - 📊 Média da Turma
  - 📈 Maior Nota
  - 📉 Menor Nota
  - 📝 Total de Notas Lançadas
- [ ] Visualização: Lista de Notas
  - Lista de alunos
  - Para cada aluno:
    - Avatar + nome
    - Lista de atividades com notas
    - Média geral
- [ ] SearchInput (por nome do aluno)
- [ ] ⚠️ Banner PRO: matriz interativa e exportação

---

## 📚 5. MATERIAIS E FREQUÊNCIA (0/2 completas)

### 5.1 ClassMaterialsPage 📝
**Rota:** `/teacher/classes/:classId/materials`
**Prioridade:** ⭐⭐ MÉDIA

**Componentes Necessários:**
- [ ] Header com gradiente purple/pink/rose
- [ ] Stats Cards:
  - 📚 Total de Materiais
  - 📥 Downloads Totais
  - ⚠️ Storage: XXX/500MB usado
- [ ] Botão: ➕ Upload Material
- [ ] Filtros Básicos:
  - Por categoria (slides/vídeos/PDFs/links/outros)
  - SearchInput (por título)
- [ ] Visualização: Grid
  - Thumbnail/ícone do tipo
  - Título, descrição
  - Categoria (badge)
  - Tamanho do arquivo
  - Data de upload
  - Botões: Download, Visualizar, Excluir
- [ ] Modal de Upload:
  - Drag & drop (até 50MB)
  - Título, descrição
  - Seletor de categoria
  - Preview
- [ ] Limite: 500MB total
- [ ] ⚠️ Banner PRO: 10GB e arquivos de 500MB

**Dados:**
```jsx
{
  id: string,
  title: string,
  description: string,
  category: 'slides' | 'videos' | 'pdfs' | 'links' | 'others',
  fileUrl: string,
  fileSize: number,
  thumbnail: string,
  downloads: number,
  uploadedAt: date
}
```

---

### 5.2 ClassAttendancePage 📝
**Rota:** `/teacher/classes/:classId/attendance`
**Prioridade:** ⭐ BAIXA

**Componentes Necessários:**
- [ ] Header com gradiente green/emerald/teal
- [ ] Stats Cards:
  - 📊 Taxa de Presença Média
  - ✅ Presenças Totais
  - ❌ Faltas Totais
- [ ] Botão "Registrar Chamada de Hoje"
- [ ] Lista de Alunos para Chamada:
  - Avatar + nome
  - Toggle Presente/Ausente
  - Campo de observação
- [ ] Botão: 💾 Salvar Frequência
- [ ] Histórico de Frequência (30 chamadas):
  - Tabela: Data, Presentes, Ausentes
- [ ] ⚠️ Banner PRO: histórico ilimitado

**Dados:**
```jsx
{
  id: string,
  date: date,
  students: [{
    id: string,
    name: string,
    avatar: string,
    status: 'present' | 'absent',
    note: string
  }]
}
```

---

## 👥 6. ALUNOS (0/2 completas)

### 6.1 TeacherStudentsPage 📝
**Rota:** `/teacher/students`
**Prioridade:** ⭐⭐ MÉDIA

**Componentes Necessários:**
- [ ] Header com gradiente
- [ ] Stats Cards:
  - 👥 Total de Alunos
  - 📚 Turmas com Alunos
  - 📊 Média Geral
  - ⭐ Total de XP Distribuído
- [ ] Busca e Filtros:
  - SearchInput (por nome/email)
  - Filtro por turma
  - Ordenação (alfabética/média/XP)
- [ ] Grid de StudentCards:
  - Avatar + nome
  - Email
  - Turmas (badges)
  - Média geral
  - XP total + level
  - Botão "Ver Perfil Básico"

---

### 6.2 StudentDetailPage 📝
**Rota:** `/teacher/students/:studentId`
**Prioridade:** ⭐⭐ MÉDIA

**Componentes Necessários:**
- [ ] Header do Perfil:
  - Avatar grande
  - Nome completo
  - Email
  - Turmas (badges)
- [ ] Stats Cards:
  - 📊 Média Geral
  - ✅ Atividades Concluídas
  - ⏰ Atividades Pendentes
  - ⭐ XP Total
- [ ] Tabela de Histórico de Atividades:
  - Atividade, Turma, Data, Nota, Status
  - Ordenável
  - Paginação básica
- [ ] Seção de Frequência:
  - Taxa de presença (%)
  - Lista simples de faltas
- [ ] Seção de Gamificação:
  - Level atual + barra de progresso
  - Badges conquistados (grid visual)
- [ ] ⚠️ Banner PRO: gráficos de evolução

---

## 🏆 7. ANALYTICS E GAMIFICAÇÃO (0/1 completa)

### 7.1 TeacherRankingPage 📝
**Rota:** `/teacher/ranking`
**Prioridade:** ⭐ BAIXA

**Componentes Necessários:**
- [ ] Header com gradiente gold/yellow/orange
- [ ] Filtros:
  - Por turma (todas/específica)
  - Por período (semana/mês/semestre)
- [ ] Pódio (Top 3):
  - 🥇 1º lugar (ouro)
  - 🥈 2º lugar (prata)
  - 🥉 3º lugar (bronze)
  - Avatar + nome, XP total + level
- [ ] Tabela de Ranking (4º em diante):
  - Posição, Avatar + Nome, XP Total, Level
  - Paginação (20 por página)
- [ ] Stats gerais:
  - Total de alunos no ranking
  - XP total distribuído

---

## 🤖 8. CHATBOT E IA (0/3 completas)

### 8.1 TeacherChatbotPage 📝
**Rota:** `/teacher/chatbot`
**Prioridade:** ⭐ BAIXA (FASE 2)

**Componentes Necessários:**
- [ ] Header com gradiente
- [ ] Título: "Assistente IA para Turmas"
- [ ] Ícone: 🤖
- [ ] Stats Cards:
  - 🤖 Total de Chatbots Ativos
  - 💬 Conversas Totais (30 dias)
  - 👥 Alunos Atendidos
  - ⭐ Satisfação Média
- [ ] Grid de Cards de Turmas:
  - Nome + matéria
  - Cor personalizada
  - Status do Chatbot: Ativo/Pausado/Não Configurado
  - Stats: atividades treinadas, conversas, satisfação
  - Botões: Configurar, Editar, Ver Analytics, Pausar/Ativar
- [ ] EmptyState
- [ ] Seção de Ajuda

---

### 8.2 ChatbotConfigPage 📝
**Rota:** `/teacher/chatbot/:classId/config`
**Prioridade:** ⭐ BAIXA (FASE 2)

**Componentes Necessários:**
- [ ] Header da Turma
- [ ] Wizard em 3 Steps:
  - **STEP 1: Personalização Básica**
    - Nome do Bot
    - Avatar/Ícone
    - Personalidade
    - Tom de Voz
  - **STEP 2: Seleção de Conteúdo**
    - Atividades para Treinar (até 10 FREE)
    - Materiais Adicionais (até 3 FREE)
    - Preview do treinamento
  - **STEP 3: Configurações de Uso**
    - Permissões do bot
    - Horário de disponibilidade
    - Limite de mensagens (10/dia FREE)
    - Idioma
- [ ] Preview do Chatbot
- [ ] Botões: Voltar, Próximo, Salvar Rascunho, Ativar
- [ ] Processo de Treinamento:
  - Progress bar
  - Notificação quando concluir

---

### 8.3 ChatbotAnalyticsPage 📝
**Rota:** `/teacher/chatbot/:classId/analytics`
**Prioridade:** ⭐ BAIXA (FASE 2)

**Componentes Necessários:**
- [ ] Header com badge de status
- [ ] Período: últimos [7 dias ▼]
- [ ] Stats Cards:
  - 💬 Total de Conversas
  - 👥 Alunos Ativos
  - ⭐ Taxa de Satisfação
  - ⏱️ Tempo Médio de Resposta
- [ ] Gráfico de Uso (Line Chart)
- [ ] Gráfico de Horários (Bar Chart)
- [ ] Perguntas Mais Frequentes (Top 10)
- [ ] Tópicos Mais Difíceis
- [ ] Feedback dos Alunos
- [ ] Lista de Conversas Recentes
- [ ] Alertas e Insights
- [ ] Botões: Editar, Pausar, Exportar Relatório
- [ ] ⚠️ Banner PRO

---

## 📊 RESUMO DE PROGRESSO

| Categoria | Total | Completo | % |
|-----------|-------|----------|---|
| Dashboard | 1 | 1 | 100% |
| Turmas | 6 | 0 | 0% |
| Atividades | 3 | 0 | 0% |
| Correções | 3 | 0 | 0% |
| Materiais | 2 | 0 | 0% |
| Alunos | 2 | 0 | 0% |
| Analytics | 1 | 0 | 0% |
| Chatbot IA | 3 | 0 | 0% |
| **TOTAL** | **21** | **1** | **5%** |

---

## 🚀 PLANO DE EXECUÇÃO

### **FASE 1: CORE FEATURES (Semana 1-2)** ⭐⭐⭐
**Objetivo:** Funcionalidades essenciais para usar a plataforma

1. **TeacherClassroomsPage** - Listar e gerenciar turmas
2. **ClassDetailsPage** - Ver detalhes da turma (tabs básicas)
3. **TeacherClassMembersPage** - Gerenciar alunos
4. **TeacherActivitiesPage** - Listar atividades
5. **ActivitySubmissionsPage** - Ver submissões
6. **GradingPage** - Corrigir atividades

**Componentes Necessários:**
- SearchInput
- FilterBar
- DataTable
- SubmissionCard
- GradeForm
- InlineEdit
- ColorPicker
- CopyButton

---

### **FASE 2: SECONDARY FEATURES (Semana 3)** ⭐⭐
**Objetivo:** Funcionalidades importantes mas não críticas

1. **ClassActivitiesPage** - Atividades por turma
2. **EditClassPage** - Editar turma
3. **ClassGradingPage** - Correções por turma
4. **ClassGradesPage** - Visualizar notas
5. **TeacherStudentsPage** - Listar alunos
6. **StudentDetailPage** - Perfil do aluno
7. **ClassMaterialsPage** - Materiais da turma

**Componentes Necessários:**
- FileUpload
- DragAndDrop
- ProgressBar
- TabNavigation
- GradeTable

---

### **FASE 3: ENHANCED FEATURES (Semana 4)** ⭐
**Objetivo:** Funcionalidades que melhoram a experiência

1. **ClassDetailsPageNew (Mural)** - Feed de posts
2. **ClassSchedulePage** - Calendário
3. **ClassAttendancePage** - Frequência
4. **TeacherRankingPage** - Ranking gamificado

**Componentes Necessários:**
- Calendar
- FeedPost
- CommentThread
- AttendanceToggle
- PodiumDisplay

---

### **FASE 4: AI FEATURES (Opcional)** 🤖
**Objetivo:** Chatbot IA (pode ser adiado)

1. **TeacherChatbotPage** - Gerenciar chatbots
2. **ChatbotConfigPage** - Configurar bot
3. **ChatbotAnalyticsPage** - Analytics do bot

**Componentes Necessários:**
- ChatbotPreview
- WizardSteps
- AITrainingProgress
- ConversationViewer

---

## 📋 CHECKLIST DE COMPONENTES

### ✅ Já Existem:
- [x] StatsCard
- [x] DashboardHeader
- [x] EmptyState
- [x] ClassCard
- [x] ActivityCard

### 📝 Precisam Criar:
- [ ] SearchInput
- [ ] FilterBar
- [ ] DataTable
- [ ] SubmissionCard
- [ ] GradeForm
- [ ] InlineEdit
- [ ] ColorPicker
- [ ] CopyButton
- [ ] FileUpload
- [ ] DragAndDrop
- [ ] ProgressBar
- [ ] TabNavigation
- [ ] GradeTable
- [ ] Calendar
- [ ] FeedPost
- [ ] CommentThread
- [ ] AttendanceToggle
- [ ] PodiumDisplay
- [ ] ChatbotPreview
- [ ] WizardSteps
- [ ] AITrainingProgress
- [ ] ConversationViewer

---

## 🎯 PRÓXIMOS PASSOS IMEDIATOS

### **Esta Semana:**
1. Criar componentes base:
   - [ ] SearchInput
   - [ ] FilterBar
   - [ ] DataTable
   - [ ] SubmissionCard
   - [ ] GradeForm

2. Implementar primeira página:
   - [ ] TeacherClassroomsPage (completa)

### **Próxima Semana:**
1. [ ] ClassDetailsPage (estrutura + tabs)
2. [ ] TeacherClassMembersPage
3. [ ] TeacherActivitiesPage
4. [ ] ActivitySubmissionsPage

---

**Progresso Atual:** 5%
**Meta Fase 1:** 35%
**Meta Final:** 100%

*Última atualização: 22 de Outubro de 2025*
