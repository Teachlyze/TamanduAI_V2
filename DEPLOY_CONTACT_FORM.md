# 🚀 Deploy do Formulário de Contato - GUIA COMPLETO

## ✅ O QUE FOI IMPLEMENTADO

### 1. **Edge Function `send-contact-email`**
- ✅ Salva mensagem no banco de dados
- ✅ Envia email formatado via Resend
- ✅ Email com design premium (HTML)
- ✅ Atualiza status no banco após envio
- ✅ Fallback em caso de erro no email

### 2. **Frontend `ContactPage.jsx`**
- ✅ Validações regex robustas
- ✅ Contador de caracteres visual
- ✅ Integração com Edge Function
- ✅ Visual premium com gradientes
- ✅ Logs detalhados para debug

### 3. **Banco de Dados**
- ✅ Tabela `contact_messages` criada
- ✅ Campos adicionais: `email_sent_at`, `email_id`
- ✅ RLS configurado para permitir inserção pública

---

## 📋 PASSOS PARA ATIVAR (5 MINUTOS)

### Passo 1: Aplicar Migration no Banco
```sql
-- Execute no Supabase SQL Editor
ALTER TABLE contact_messages 
ADD COLUMN IF NOT EXISTS email_sent_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS email_id TEXT;
```

### Passo 2: Deploy da Edge Function
```bash
# No terminal do projeto
cd supabase
supabase functions deploy send-contact-email
```

### Passo 3: Configurar Variáveis de Ambiente (Opcional)
```bash
# Se quiser usar email diferente do padrão
supabase secrets set ADMIN_EMAIL="seu-email@exemplo.com"

# A chave do Resend já está configurada no código
# Mas você pode sobrescrever se quiser
supabase secrets set RESEND_API_KEY="re_sua_chave_aqui"
```

### Passo 4: Configurar Domínio no Resend
1. Acesse: https://resend.com/domains
2. Adicione o domínio: `tamanduai.com`
3. Configure os registros DNS (MX, TXT, CNAME)
4. Aguarde verificação (pode levar até 24h)

**OU use o domínio de teste do Resend:**
- Emails chegarão em: `delivered@resend.dev`
- Bom para testes iniciais

### Passo 5: Testar!
1. Abra: http://localhost:3000/contact
2. Preencha o formulário
3. Veja os logs no console
4. Verifique o email em `contato@tamanduai.com`

---

## 🔍 VERIFICAÇÃO

### ✅ Como saber se funcionou:

**Console do Navegador:**
```
✅ Validação OK, enviando...
✅ Mensagem enviada com sucesso: {success: true, ...}
```

**Supabase Logs:**
```
✅ Mensagem salva no banco: {...}
📨 Enviando email via Resend...
✅ Email enviado com sucesso! ID: xxx
```

**Email Recebido:**
- Assunto: `[TamanduAI] Suporte Técnico - Nome da Pessoa`
- HTML formatado com gradientes
- Informações completas do contato

---

## 🐛 TROUBLESHOOTING

### Erro: "Edge Function not found"
```bash
# Deploy novamente
supabase functions deploy send-contact-email
```

### Erro: "Could not find table"
```sql
-- Verifique se a tabela existe
SELECT * FROM contact_messages LIMIT 1;

-- Se não existir, crie:
CREATE TABLE contact_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  user_type TEXT NOT NULL,
  subject TEXT NOT NULL,
  company TEXT,
  message TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  email_sent_at TIMESTAMP,
  email_id TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Erro no envio de email (Resend)
```bash
# Verifique a chave API
supabase secrets list

# Se não tiver, configure:
supabase secrets set RESEND_API_KEY="re_cEXFTxaH_CVyoV1cGc2N1HVTD8x9yrG9x"
```

### Email não chega
1. ✅ Verifique spam/lixo eletrônico
2. ✅ Confirme que o domínio está verificado no Resend
3. ✅ Use `delivered@resend.dev` para testes
4. ✅ Veja logs da Edge Function no Supabase Dashboard

---

## 📧 FORMATO DO EMAIL ENVIADO

**Assunto:** `[TamanduAI] Suporte Técnico - Pedro Silva`

**HTML:** Design premium com:
- Header com gradiente azul
- Tabela de informações formatada
- Mensagem em card cinza
- Rodapé com timestamp
- Botão reply-to configurado

---

## 🎯 FUNCIONALIDADES ATIVAS

- ✅ Salvamento no banco de dados
- ✅ Envio de email via Resend
- ✅ Email formatado em HTML
- ✅ Reply-to configurado (responder direto ao usuário)
- ✅ Status tracking (pending → sent)
- ✅ Validações completas
- ✅ Visual premium
- ✅ Contador de caracteres
- ✅ Anti-spam (honeypot)

---

## 🚀 DEPLOY EM PRODUÇÃO

1. **Frontend (Netlify/Vercel):**
```bash
npm run build
netlify deploy --prod
```

2. **Edge Functions (Supabase):**
```bash
supabase functions deploy send-contact-email
```

3. **Configurar DNS no Resend:**
- Domínio verificado
- Registros DNS configurados

4. **Testar em produção:**
- Formulário público funcionando
- Emails chegando

---

## ✅ CHECKLIST FINAL

- [ ] Tabela `contact_messages` criada
- [ ] Migration de campos aplicada
- [ ] Edge Function deployada
- [ ] Chave Resend configurada
- [ ] Domínio verificado no Resend
- [ ] Teste de envio realizado
- [ ] Email recebido com sucesso
- [ ] Logs sem erros

**Quando todos os itens estiverem ✅, o formulário está 100% funcional!**
