# 📅 TeacherCalendarPage - Calendário do Professor

## 📋 Visão Geral

Página completa de gerenciamento de agenda para professores, permitindo criar, visualizar, editar e excluir eventos como aulas, reuniões, provas e eventos pessoais.

## ✅ Funcionalidades Implementadas

### 1. **Visualização do Calendário**
- ✅ Grade mensal com todos os dias do mês
- ✅ Dia atual destacado visualmente
- ✅ Eventos exibidos em cada dia
- ✅ Máximo de 3 eventos visíveis por dia (restante com "+X mais")
- ✅ Navegação entre meses (anterior/próximo)
- ✅ Botão "Hoje" para voltar ao mês atual
- ✅ Cores diferentes por tipo de evento

### 2. **Tipos de Eventos**
- ✅ **Aula** (azul) - Para turmas específicas
- ✅ **Prova/Exame** (vermelho) - Para turmas específicas
- ✅ **Reunião** (roxo) - Individual ou em grupo
- ✅ **Pessoal** (cinza) - Organização do professor

### 3. **Criação de Eventos**
- ✅ Modal completo de criação
- ✅ Seleção de tipo de evento
- ✅ Informações básicas (título, descrição)
- ✅ Data e horários (início/fim)
- ✅ Seleção de turmas (para aulas/provas)
- ✅ Modalidade (online/presencial)
- ✅ Link da reunião (online)
- ✅ Local/endereço (presencial)
- ✅ Validações de formulário

### 4. **Detalhes do Evento**
- ✅ Modal de visualização completa
- ✅ Todas as informações do evento
- ✅ Cálculo automático de duração
- ✅ Lista de turmas associadas
- ✅ Link clicável para reuniões online

### 5. **Edição e Exclusão**
- ✅ Botão de editar evento
- ✅ Botão de excluir com confirmação
- ✅ Botão de duplicar (placeholder)
- ✅ Exclusão de eventos e relacionamentos

### 6. **Filtros Laterais**
- ✅ Filtro por tipo de evento
- ✅ Filtro por turma
- ✅ Filtro por modalidade (online/presencial)
- ✅ Botão limpar filtros
- ✅ Indicador visual de filtros ativos

## 🗄️ Estrutura do Banco de Dados

### Tabelas Criadas

#### `event_classes`
Relacionamento N:N entre eventos e turmas.
```sql
- id (UUID)
- event_id (FK → calendar_events)
- class_id (FK → classes)
- created_at (TIMESTAMP)
```

#### `event_participants`
Participantes (alunos/professores) de eventos.
```sql
- id (UUID)
- event_id (FK → calendar_events)
- user_id (FK → profiles)
- participant_type ('student' | 'teacher')
- created_at (TIMESTAMP)
```

#### `class_attendance`
Registro de presença dos alunos.
```sql
- id (UUID)
- class_id (FK → classes)
- event_id (FK → calendar_events)
- student_id (FK → profiles)
- status ('present' | 'absent' | 'late' | 'excused')
- date (DATE)
- notes (TEXT)
```

### Campos Adicionados ao `calendar_events`
- `modality` - 'online' ou 'presential'
- `meeting_link` - URL da reunião online
- `color` - Cor do evento (hex)
- `summary` - Resumo da aula (preenchido após)
- `notes` - Observações adicionais
- `is_registered` - Se já foi registrado presença
- `is_cancelled` - Se evento foi cancelado

## 📁 Estrutura de Arquivos

```
src/modules/teacher/pages/Calendar/
├── TeacherCalendarPage.jsx          # Página principal
├── components/
│   ├── CreateEventModal.jsx         # Modal de criação
│   ├── EventDetailsModal.jsx        # Modal de detalhes
│   └── CalendarFilters.jsx          # Filtros laterais
└── README.md                         # Esta documentação
```

## 🎨 Design

### Paleta de Cores
- **Header**: Gradiente azul-cyan (`from-blue-600 to-cyan-500`)
- **Dia atual**: Borda azul (`border-blue-600`)
- **Aula**: Azul (`bg-blue-100 text-blue-700`)
- **Prova**: Vermelho (`bg-red-100 text-red-700`)
- **Reunião**: Roxo (`bg-purple-100 text-purple-700`)
- **Pessoal**: Cinza (`bg-gray-100 text-gray-700`)

### Responsividade
- ✅ Grid 7 colunas (desktop)
- ✅ Sidebar collapse em mobile
- ✅ Modais responsivos
- ✅ Botões adaptáveis

## 🔐 Segurança (RLS)

### Políticas Implementadas

**event_classes:**
- Professores veem apenas event_classes de seus eventos
- Professores podem inserir/deletar em seus eventos

**event_participants:**
- Usuários veem participantes de seus eventos ou onde são participantes
- Professores gerenciam participantes de seus eventos

**class_attendance:**
- Professores veem presença de suas turmas
- Alunos veem apenas sua própria presença
- Professores inserem/atualizam presença em suas turmas

## 🚀 Como Usar

### 1. Aplicar Migração
```bash
# No Supabase
psql -h [HOST] -U postgres -d postgres -f supabase/migrations/20250130000000_add_calendar_tables.sql
```

### 2. Acessar a Página
```
/dashboard/calendar
```

### 3. Criar Evento
1. Clique em "Novo Evento" no header
2. Ou clique em um dia vazio no calendário
3. Preencha o formulário
4. Selecione turmas (se aula/prova)
5. Configure modalidade
6. Salve

### 4. Visualizar Evento
1. Clique em um evento no calendário
2. Veja todos os detalhes
3. Edite, duplique ou exclua

## 📝 Funcionalidades Futuras (Não Implementadas)

### Registro de Aula
- Modal de registro de presença
- Campo de resumo da aula
- Sugestão de resumo com IA (Claude)
- Marcação de ausências
- Observações sobre a aula

### Recorrência de Eventos
- Eventos que se repetem
- Padrões: diário, semanal, mensal
- Edição de série ou evento único

### Visualizações Adicionais
- Visualização semanal
- Visualização diária
- Visualização em lista

### Notificações
- Notificar participantes ao criar evento
- Lembretes automáticos
- Avisos de mudanças/cancelamentos

### Integração Externa
- Exportar para Google Calendar (.ics)
- Sincronização com calendários externos
- Geração automática de links de reunião

## 🐛 Troubleshooting

### Eventos não aparecem
- Verifique se as tabelas foram criadas
- Confirme que o RLS está configurado
- Verifique se o usuário tem role 'teacher'

### Erro ao criar evento
- Valide campos obrigatórios
- Confirme que turmas selecionadas existem
- Verifique permissões do usuário

### Filtros não funcionam
- Limpe filtros e tente novamente
- Verifique se há eventos no período
- Recarregue a página

## 📊 Métricas de Performance

- **Queries otimizadas**: Carrega apenas mês visível
- **Filtros eficientes**: Aplicados no frontend
- **Lazy loading**: Componentes carregados sob demanda
- **Índices**: Criados em todas as foreign keys

## 🎯 Próximos Passos

1. **Implementar registro de presença**
2. **Adicionar recorrência de eventos**
3. **Criar visualização semanal/diária**
4. **Integrar notificações push**
5. **Adicionar exportação para .ics**
6. **Implementar sugestão de IA para resumo de aula**

## 📚 Referências

- [date-fns](https://date-fns.org/) - Manipulação de datas
- [Framer Motion](https://www.framer.com/motion/) - Animações
- [Lucide Icons](https://lucide.dev/) - Ícones

---

**Implementado por**: AI Assistant  
**Data**: Janeiro 2025  
**Versão**: 1.0.0
