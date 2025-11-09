-- Adicionar campos para tracking de envio de email
ALTER TABLE contact_messages 
ADD COLUMN IF NOT EXISTS email_sent_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS email_id TEXT;

-- Atualizar comentário da tabela
COMMENT ON TABLE contact_messages IS 'Mensagens de contato do formulário com tracking de envio de email';
COMMENT ON COLUMN contact_messages.email_sent_at IS 'Data/hora em que o email foi enviado';
COMMENT ON COLUMN contact_messages.email_id IS 'ID do email no serviço de envio (Resend)';
