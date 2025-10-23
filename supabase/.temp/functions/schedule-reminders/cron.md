# Configuração Cron para Schedule Reminders

## Configuração no Supabase

Para executar esta Edge Function automaticamente a cada 5 minutos:

1. **Via Supabase CLI:**
```bash
supabase functions schedule schedule-reminders --cron "*/5 * * * *"
```

2. **Via Dashboard:**
- Vá em Functions > schedule-reminders
- Configure "Cron Expression": `*/5 * * * *`
- Salvar

## Cron Expression

`*/5 * * * *` = A cada 5 minutos

Outras opções:
- `* * * * *` = A cada minuto (não recomendado - muito frequente)
- `*/10 * * * *` = A cada 10 minutos
- `0 * * * *` = A cada hora (hora cheia)

## Alternativa: PG_CRON (PostgreSQL)

Se preferir usar pg_cron direto no PostgreSQL:

```sql
-- Instalar extensão
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Agendar job
SELECT cron.schedule(
  'send-reminders',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://YOUR_PROJECT.supabase.co/functions/v1/schedule-reminders',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb
  )
  $$
);
```

## Monitoramento

Ver logs da execução:
```bash
supabase functions logs schedule-reminders
```

## Variáveis de Ambiente Necessárias

Certifique-se de configurar:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `APP_URL` (ex: https://tamanduai.com)

## Testes Locais

```bash
# Executar manualmente
supabase functions serve schedule-reminders

# Testar
curl -X POST http://localhost:54321/functions/v1/schedule-reminders \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```
