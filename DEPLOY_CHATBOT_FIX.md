# 🚀 DEPLOY URGENTE - CHATBOT FIX

## 🐛 PROBLEMA ATUAL

A edge function está retornando **500 Internal Server Error** porque:
- ❌ Edge function não foi deployada com as alterações
- ❌ Está usando versão antiga (sem validação flexível)

## ✅ SOLUÇÃO: FAZER DEPLOY

### **1. Deploy da Edge Function**

```bash
npx supabase functions deploy chatbot-query
```

**O que isso faz**:
- Envia código atualizado para o Supabase
- Aplica validação de escopo flexível
- Corrige erro 500

---

## 🔍 DIAGNÓSTICO DO ERRO

### **Logs do Console**:
```
POST https://.../chatbot-query 500 (Internal Server Error)
Edge function falhou, usando fallback
```

### **Causa Raiz**:
1. Edge function antiga não tem tratamento adequado de erros
2. Validação de escopo muito restritiva causando crashes
3. Código desatualizado no servidor

---

## 📊 DEPOIS DO DEPLOY

### **Comportamento Esperado**:

```javascript
// Aluno pergunta
"Quero saber como chego na resposta dessa atividade"

// Edge function valida (FLEXÍVEL agora)
✅ in_scope: true
reason: "Pergunta sobre como resolver atividade - aceita"

// Gera resposta socrática
"Ótima pergunta! Para resolver esta atividade, 
vamos pensar juntos. Primeiro, você já leu o 
enunciado completamente? Quais conceitos você 
acha que são necessários?"
```

### **Métricas Funcionando**:
```javascript
// Após deploy, métricas serão salvas:
- chatbot_conversations ✅
- chatbot_messages ✅
- chatbot_daily_analytics ✅
```

---

## 🧪 TESTE APÓS DEPLOY

### **1. Teste Básico**
```
Aluno: "Como faço essa atividade?"
Esperado: Resposta socrática guiando ✅
```

### **2. Teste de Escopo Flexível**
```
Aluno: "O que é um array?"
Esperado: Explicação de conceito básico ✅
```

### **3. Teste de Histórico**
```
Aluno: Múltiplas mensagens
Esperado: Contexto mantido ✅
```

---

## 🔧 SE CONTINUAR ERRO 500

### **Verificar Secrets**:
```bash
npx supabase secrets list
```

Confirme que existe:
- ✅ `VITE_OPENAI_API_KEY`
- ✅ `SUPABASE_SERVICE_ROLE_KEY`

### **Ver Logs da Edge Function**:
```bash
npx supabase functions logs chatbot-query
```

Isso mostrará o erro real da edge function.

### **Causas Comuns de Erro 500**:
1. ❌ OpenAI API Key inválida/expirada
2. ❌ Quota da OpenAI excedida
3. ❌ Tabelas do banco não criadas
4. ❌ RLS bloqueando service role

---

## 📝 CHECKLIST PÓS-DEPLOY

- [ ] Deploy executado sem erros
- [ ] Teste no chatbot (deve funcionar)
- [ ] Métricas sendo salvas no banco
- [ ] Feedback funcionando (👍👎)
- [ ] Conversas persistindo
- [ ] Analytics mostrando dados

---

## 🎯 RECOMENDAÇÕES IA - SEPARADO

O erro "gerar recomendações" é **outro problema diferente**:

### **Causa**:
Provavelmente também precisa de deploy de outra edge function:
```bash
npx supabase functions deploy generate-ai-recommendations
```

Ou essa feature ainda não foi implementada.

---

## ⚡ AÇÃO IMEDIATA

**RODE AGORA**:
```bash
cd c:\Users\SUPRIMENTOS\Documents\TamanduAI_V2\TamanduAI_V2
npx supabase functions deploy chatbot-query
```

**Aguarde**:
- Deploy leva ~30 segundos
- Verá mensagem de sucesso

**Teste**:
- Abra chatbot
- Faça pergunta
- Deve funcionar ✅

---

## 📊 MONITORAMENTO

### **Após Deploy, Monitorar**:

1. **Console do Navegador**:
```javascript
// Deve ver:
✅ "200 OK" ao invés de "500 Error"
✅ Resposta real ao invés de fallback
```

2. **Banco de Dados**:
```sql
-- Ver conversas sendo criadas
SELECT * FROM chatbot_conversations 
ORDER BY started_at DESC 
LIMIT 5;

-- Ver mensagens sendo salvas
SELECT * FROM chatbot_messages 
ORDER BY created_at DESC 
LIMIT 10;
```

3. **Analytics**:
```sql
-- Ver métricas sendo agregadas
SELECT * FROM chatbot_daily_analytics 
WHERE date = CURRENT_DATE;
```

---

## 🆘 SUPORTE

### **Se ainda não funcionar após deploy**:

1. **Verificar OpenAI API**:
   - Acesse: https://platform.openai.com/api-keys
   - Confirme que key está ativa
   - Verifique quota/billing

2. **Verificar Logs**:
   ```bash
   npx supabase functions logs chatbot-query --tail
   ```

3. **Verificar Tabelas**:
   ```sql
   -- Confirmar que tabelas existem
   SELECT table_name FROM information_schema.tables 
   WHERE table_schema = 'public' 
   AND table_name LIKE 'chatbot%';
   ```

---

## ✅ SUCESSO!

Quando funcionar, você verá:
- ✅ Respostas reais (não fallback)
- ✅ Histórico mantido
- ✅ Métricas no banco
- ✅ Professor vendo analytics

**Deploy é ESSENCIAL para funcionar!** 🚀
