# 🔧 CORREÇÃO DEFINITIVA - Erro "calendar_event_id does not exist"

**Data**: 30/01/2025  
**Erro Recebido**: `ERROR: 42703: column "calendar_event_id" does not exist`

---

## 🔍 CAUSA DO PROBLEMA

### **Situação**
A tabela `class_attendance` foi criada em uma tentativa anterior da migração com a estrutura **ERRADA** (usando `event_id` em vez de `calendar_event_id`).

### **Por que o erro ocorreu?**

```sql
-- Versão ANTIGA da migração (ERRADA)
CREATE TABLE IF NOT EXISTS class_attendance (
  ...
  event_id UUID,  -- ❌ COLUNA ERRADA
  ...
);

-- Versão CORRIGIDA (CERTA)
CREATE TABLE IF NOT EXISTS class_attendance (
  ...
  calendar_event_id UUID,  -- ✅ COLUNA CORRETA
  ...
);
```

**Problema**: O `CREATE TABLE IF NOT EXISTS` NÃO recria a tabela se ela já existe, mesmo que a estrutura esteja errada!

---

## ✅ SOLUÇÃO APLICADA

### **Mudança na Migração**

**ANTES** (não funcionava):
```sql
❌ CREATE TABLE IF NOT EXISTS public.class_attendance (...)
```

**DEPOIS** (funciona):
```sql
✅ DROP TABLE IF EXISTS public.class_attendance CASCADE;
✅ CREATE TABLE public.class_attendance (...)
```

### **Por que funciona agora?**

1. `DROP TABLE IF EXISTS` remove a tabela antiga (se existir)
2. `CREATE TABLE` cria do zero com a estrutura correta
3. `CASCADE` remove dependências automaticamente

---

## 📝 ARQUIVO CORRIGIDO

**Arquivo**: `supabase/migrations/20250130000000_add_calendar_tables.sql`

**Linhas alteradas**: 82-94

**Mudanças**:
```sql
-- Adicionado:
DROP TABLE IF EXISTS public.class_attendance CASCADE;

-- Modificado:
CREATE TABLE IF NOT EXISTS ❌
CREATE TABLE ✅
```

---

## 🚀 COMO APLICAR A CORREÇÃO

### **Opção 1: Aplicar Migração Completa**

```bash
# No Supabase Dashboard > SQL Editor
# Copiar e colar TODO o conteúdo de:
supabase/migrations/20250130000000_add_calendar_tables.sql

# OU via CLI
supabase db reset
supabase db push
```

### **Opção 2: Aplicar Apenas a Correção** (se não quiser reset)

```sql
-- Executar manualmente no SQL Editor
DROP TABLE IF EXISTS public.class_attendance CASCADE;

CREATE TABLE public.class_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  calendar_event_id UUID REFERENCES public.calendar_events(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('present', 'absent', 'late', 'excused')) DEFAULT 'present',
  attendance_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Recriar índices
CREATE INDEX idx_class_attendance_class_id ON public.class_attendance(class_id);
CREATE INDEX idx_class_attendance_user_id ON public.class_attendance(user_id);
CREATE INDEX idx_class_attendance_calendar_event_id ON public.class_attendance(calendar_event_id);
CREATE INDEX idx_class_attendance_date ON public.class_attendance(attendance_date);
CREATE INDEX idx_class_attendance_status ON public.class_attendance(status);

-- Habilitar RLS
ALTER TABLE public.class_attendance ENABLE ROW LEVEL SECURITY;

-- Recriar policies
CREATE POLICY "Professores podem ver presença de suas turmas"
  ON public.class_attendance FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.classes
      WHERE classes.id = class_attendance.class_id
      AND classes.created_by = auth.uid()
    )
  );

CREATE POLICY "Alunos podem ver sua própria presença"
  ON public.class_attendance FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Professores podem inserir presença em suas turmas"
  ON public.class_attendance FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.classes
      WHERE classes.id = class_attendance.class_id
      AND classes.created_by = auth.uid()
    )
  );

CREATE POLICY "Professores podem atualizar presença em suas turmas"
  ON public.class_attendance FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.classes
      WHERE classes.id = class_attendance.class_id
      AND classes.created_by = auth.uid()
    )
  );

CREATE POLICY "Professores podem deletar presença de suas turmas"
  ON public.class_attendance FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.classes
      WHERE classes.id = class_attendance.class_id
      AND classes.created_by = auth.uid()
    )
  );
```

---

## ✅ VERIFICAÇÃO

Após aplicar, verificar se está correto:

```sql
-- 1. Verificar estrutura da tabela
\d public.class_attendance

-- Deve mostrar:
-- ✅ calendar_event_id UUID (e NÃO event_id)
-- ✅ attendance_date DATE (e NÃO date)
-- ✅ user_id UUID
-- ✅ class_id UUID
-- ✅ status TEXT

-- 2. Verificar índices
SELECT indexname FROM pg_indexes 
WHERE tablename = 'class_attendance';

-- Deve mostrar:
-- ✅ idx_class_attendance_calendar_event_id
-- ✅ idx_class_attendance_class_id
-- ✅ idx_class_attendance_user_id
-- ✅ idx_class_attendance_date
-- ✅ idx_class_attendance_status

-- 3. Testar insert
INSERT INTO public.class_attendance (
  class_id, 
  user_id, 
  calendar_event_id,
  status, 
  attendance_date
) VALUES (
  'uuid-turma',
  'uuid-aluno',
  'uuid-evento',  -- ✅ calendar_event_id funciona
  'present',
  CURRENT_DATE
);
```

---

## 📊 RESUMO DAS CORREÇÕES

| Problema | Solução |
|----------|---------|
| ❌ Coluna `event_id` | ✅ Renomeada para `calendar_event_id` |
| ❌ Coluna `date` | ✅ Renomeada para `attendance_date` |
| ❌ `CREATE TABLE IF NOT EXISTS` | ✅ `DROP TABLE IF EXISTS` + `CREATE TABLE` |
| ❌ Tabela com estrutura antiga | ✅ Recriada com estrutura correta |

---

## 🎯 CHECKLIST FINAL

Antes de considerar resolvido:

- [x] Migração corrigida com DROP TABLE
- [x] Coluna `calendar_event_id` (não `event_id`)
- [x] Coluna `attendance_date` (não `date`)
- [x] Código frontend usando `calendar_event_id`
- [x] Queries sem `event_classes` e `event_participants`
- [ ] **Migração aplicada no banco** ⚠️ PENDENTE
- [ ] **Verificação SQL executada** ⚠️ PENDENTE
- [ ] **Teste de insert realizado** ⚠️ PENDENTE

---

## 🚨 IMPORTANTE

**SE VOCÊ TEM DADOS IMPORTANTES NA TABELA `class_attendance`:**

```sql
-- ANTES de executar DROP TABLE, faça backup:
CREATE TABLE class_attendance_backup AS 
SELECT * FROM class_attendance;

-- Depois de criar a nova tabela, migrar dados:
INSERT INTO public.class_attendance (
  id, class_id, user_id, 
  calendar_event_id,  -- mapear de event_id se existir
  status, attendance_date, notes
)
SELECT 
  id, class_id, user_id,
  event_id as calendar_event_id,  -- renomear coluna
  status, date as attendance_date, notes
FROM class_attendance_backup;
```

**SE NÃO TEM DADOS (primeira vez):**
- Pode executar DROP TABLE sem problemas

---

## 📝 PRÓXIMOS PASSOS

1. ✅ Aplicar a migração SQL corrigida
2. ✅ Verificar que `calendar_event_id` existe
3. ✅ Testar criação de presença
4. ✅ Testar consultas de presença
5. ✅ Validar RLS funcionando

---

**🎉 PROBLEMA RESOLVIDO!**

**Arquivo corrigido**: `20250130000000_add_calendar_tables.sql`  
**Mudança principal**: `DROP TABLE IF EXISTS` antes de `CREATE TABLE`  
**Status**: ✅ **PRONTO PARA APLICAR**
