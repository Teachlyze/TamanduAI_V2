# 📚 Sistema de Atividades do Professor

## 📋 Visão Geral

Sistema completo de gerenciamento de atividades educacionais com duas páginas principais:

1. **TeacherActivitiesPage**: Banco/repositório de todas as atividades criadas
2. **TeacherActivityCreatePage**: Editor completo para criar e editar atividades

## 🗂️ Estrutura de Arquivos

```
Activities/
├── TeacherActivitiesPage.jsx          # Página principal - Banco de Atividades
├── TeacherActivityCreatePage.jsx     # Página de criação/edição
├── components/
│   ├── ActivityListItem.jsx          # Item de atividade em lista
│   ├── ActivityGridCard.jsx          # Card de atividade em grid
│   ├── PostActivityModal.jsx         # Modal para postar em turmas
│   ├── ActivityTypeSelector.jsx      # Seletor de tipo (Aberta/Fechada/Mista)
│   ├── OpenQuestions.jsx             # Editor de questões abertas
│   ├── ClosedQuestions.jsx           # Editor de questões fechadas
│   ├── MixedQuestions.jsx            # Editor de questões mistas
│   ├── AdvancedSettings.jsx          # Configurações avançadas
│   ├── ActivityPreview.jsx           # Prévia da atividade
│   └── ValidationChecklist.jsx       # Checklist de validação
└── README.md                          # Esta documentação
```

## 🎯 TeacherActivitiesPage - Funcionalidades

### Características Principais
- ✅ Visualização de todas as atividades criadas pelo professor
- ✅ Estatísticas rápidas (total, por tipo, mais usada, recentes)
- ✅ Tabs de organização (Todas, Abertas, Fechadas, Mistas, Rascunhos, Favoritas)
- ✅ Busca textual em tempo real
- ✅ Filtros avançados (tipo, status, disciplina, dificuldade)
- ✅ Ordenação múltipla (data, nome, uso, pontuação)
- ✅ Visualização em lista ou grid
- ✅ Preview expandido de atividades
- ✅ Seleção múltipla com ações em massa
- ✅ Sistema de favoritos
- ✅ Arquivamento de atividades

### Ações Disponíveis
- **Individual**: Editar, Duplicar, Ver Prévia, Exportar, Compartilhar, Arquivar, Excluir
- **Em Massa**: Postar em turmas, Exportar, Arquivar, Adicionar tags
- **Postar**: Modal completo com configurações (prazo, pontuação, antiplágio, etc)

### Estados Especiais
- Loading com skeleton
- Estado vazio com call-to-action
- Sem resultados de busca/filtro
- Avisos de atividades já utilizadas antes de excluir

## ✏️ TeacherActivityCreatePage - Funcionalidades

### Fluxo de Criação

#### 1. Seleção de Tipo
Três tipos disponíveis:
- **Aberta (Dissertativa)**: Respostas textuais, correção manual com rubricas
- **Fechada (Objetiva)**: Múltipla escolha, correção automática
- **Mista (Híbrida)**: Combinação de ambas

#### 2. Informações Básicas
- Título (obrigatório, max 200 caracteres)
- Descrição (obrigatório, max 2000 caracteres)
- Disciplina/Matéria
- Tags/Tópicos (múltiplos)
- Dificuldade (fácil, média, difícil, muito difícil)
- Tempo estimado (minutos)
- Pontuação máxima total

#### 3. Questões

##### Questões Abertas
- Enunciado rico com formatação
- Upload de imagens e anexos
- Pontuação individual
- Limite de linhas/caracteres (opcional)
- Sistema de rubricas:
  - Múltiplos critérios
  - Descrição e pontuação por critério
  - Soma automática
- Resposta esperada/gabarito (referência para correção)

##### Questões Fechadas
- Enunciado rico
- Alternativas (min 2, max 10)
- Marcação de resposta correta (obrigatório)
- Explicação da resposta correta
- Dica para alunos
- Embaralhamento de alternativas

##### Questões Mistas
- Adicionar ambos os tipos
- Visualização combinada
- Distribuição de pontuação
- Reordenação livre

#### 4. Configurações Avançadas

**Envio Atrasado**
- Permitir/bloquear
- Tipo de penalidade (% ou pontos fixos)
- Valor da penalidade
- Máximo de dias atrasados

**Múltiplas Tentativas** (fechadas/mistas)
- Permitir/bloquear
- Máximo de tentativas
- Considerar: melhor/última/média nota

**Tempo Limite**
- Definir tempo máximo em minutos
- Timer visível para aluno
- Submissão automática ao acabar

**Feedback e Gabarito**
- Mostrar nota imediatamente
- Mostrar gabarito após submissão
- Liberar gabarito após prazo

**Antiplágio** (abertas/mistas)
- Ativar/desativar
- Sensibilidade (baixa/média/alta)
- Originalidade mínima (%)

**Randomização** (fechadas/mistas)
- Embaralhar questões
- Embaralhar alternativas

#### 5. Preview e Validação

**Preview**
- Simula visualização do aluno
- Todas as questões e configurações
- Modo read-only

**Validação**
- Checklist visual
- Erros críticos (bloqueiam publicação)
- Avisos (não bloqueiam)
- Navegação para campos com erro

### Sistema de Auto-save
- Salvamento automático a cada 60 segundos
- Indicador de última salvamento
- Recuperação de rascunho
- Previne perda de dados

## 🗄️ Integração com Banco de Dados

### Tabela: activities
```sql
- id (UUID)
- title (TEXT)
- description (TEXT)
- type (TEXT): 'open'/'closed'/'mixed'
- status (TEXT): 'draft'/'published'/'archived'
- max_score (NUMERIC)
- content (JSONB): {
    subject,
    tags,
    difficulty,
    estimated_time,
    questions: [{
      id,
      type,
      text,
      points,
      // Campos específicos por tipo
    }],
    advanced_settings: { ... }
  }
- created_by (UUID)
- is_favorite (BOOLEAN)
```

### Tabela: activity_class_assignments
```sql
- id (UUID)
- activity_id (UUID)
- class_id (UUID)
- assigned_at (TIMESTAMP)
```

### Relacionamentos
- Uma atividade pode estar em múltiplas turmas
- Histórico de uso mantido
- Submissões vinculadas à atividade (não afetadas por exclusão)

## 🎨 Design e UX

### Paleta de Cores
- **Abertas**: Verde (green-500 to emerald-600)
- **Fechadas**: Azul (blue-500 to cyan-600)
- **Mistas**: Roxo (purple-500 to pink-600)

### Navegação
- Sidebar fixa com seções
- Scroll suave
- Highlight da seção atual
- Breadcrumbs visuais

### Feedback
- Toasts para ações
- Loading states
- Validações inline
- Confirmações para ações destrutivas

### Responsividade
- Desktop: Layout completo com sidebar
- Tablet: Sidebar colapsável, grid 2 colunas
- Mobile: Stack vertical, 1 coluna

## 🔒 Segurança e Validações

### Client-Side
- Campos obrigatórios
- Formatos válidos
- Pontuações > 0
- Pelo menos uma alternativa correta
- Soma de rubricas = pontos da questão

### Server-Side (Supabase RLS)
- Professor só vê/edita suas atividades
- Validação de ownership
- Sanitização de inputs
- Proteção contra XSS

### Restrições em Edição
- Atividades já postadas: aviso antes de editar
- Não pode mudar tipo após salvar
- Não pode remover questões se há submissões
- Versionamento recomendado para histórico

## 📊 Métricas e Estatísticas

### Por Atividade
- Vezes usada (quantidade de turmas)
- Total de submissões
- Média de notas
- Taxa de conclusão
- Questões mais erradas (objetivas)

### Globais
- Total de atividades
- Breakdown por tipo
- Atividade mais usada
- Criadas recentemente (último mês)

## 🚀 Como Usar

### Criar Nova Atividade
1. Acesse "Banco de Atividades"
2. Clique em "Nova Atividade"
3. Selecione o tipo
4. Preencha informações básicas
5. Adicione questões
6. Configure opções avançadas
7. Valide e publique

### Postar em Turma
1. No banco de atividades, clique "Postar"
2. Selecione uma ou mais turmas
3. Defina prazo de entrega
4. Configure pontuação e peso
5. Ative opções (antiplágio, notificações)
6. Confirme postagem

### Editar Existente
1. Clique na atividade
2. Clique em "Editar"
3. Faça alterações
4. Valide e salve

### Duplicar
1. Clique no menu "..." da atividade
2. Selecione "Duplicar"
3. Nova cópia criada em modo edição
4. Altere título e salve

## 🐛 Tratamento de Erros

### Cenários Comuns
- Atividade não encontrada → Redirect para banco
- Erro ao salvar → Toast de erro + retry
- Perda de conexão → Auto-save em localStorage
- Validação falhou → Lista de erros com navegação

## 📝 Próximos Passos (Melhorias Futuras)

- [ ] Editor de texto rico com LaTeX
- [ ] Importação de atividades (Word, PDF, Google Forms)
- [ ] Banco colaborativo público
- [ ] Geração de questões com IA
- [ ] Análise estatística avançada
- [ ] Calibração de dificuldade automática
- [ ] Questões adaptativas
- [ ] Versionamento com diff visual
- [ ] Tradução automática
- [ ] Templates por disciplina

## 🔗 Rotas

```javascript
/teacher/activities              // Banco de atividades
/teacher/activities/create       // Criar nova
/teacher/activities/:id          // Visualizar (redireciona para editar)
/teacher/activities/:id/edit     // Editar existente
```

## 📦 Dependências Principais

```json
{
  "react": "^18.x",
  "react-router-dom": "^6.x",
  "framer-motion": "^10.x",
  "lucide-react": "^0.x",
  "@supabase/supabase-js": "^2.x",
  "date-fns": "^2.x"
}
```

## 💡 Notas de Implementação

- Auto-save implementado com debounce de 60s
- Queries otimizadas com select específicos
- Loading states em todas as ações assíncronas
- Preview não afeta banco de dados
- Validações rodam antes de cada save
- Confirmações duplas para ações destrutivas
- Soft delete preferido (deleted_at)

## 🎓 Contexto Pedagógico

Este sistema foi projetado para:
- Facilitar reutilização de atividades
- Padronizar avaliações
- Reduzir tempo de criação
- Aumentar qualidade pedagógica
- Permitir análise de desempenho
- Promover compartilhamento entre professores
