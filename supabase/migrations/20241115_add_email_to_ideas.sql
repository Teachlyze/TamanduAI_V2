-- Adicionar campo email à tabela public_ideas
ALTER TABLE public_ideas 
ADD COLUMN IF NOT EXISTS email TEXT CHECK (
  email IS NULL OR 
  (char_length(email) >= 5 AND char_length(email) <= 100 AND email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- Adicionar comentário
COMMENT ON COLUMN public_ideas.email IS 'Email opcional para contato sobre a ideia';

-- Atualizar constraint de identificação para ser obrigatória
ALTER TABLE public_ideas 
DROP CONSTRAINT IF EXISTS public_ideas_identification_check;

ALTER TABLE public_ideas 
ADD CONSTRAINT public_ideas_identification_check 
CHECK (char_length(identification) >= 3 AND char_length(identification) <= 100);

-- Tornar identificação NOT NULL
ALTER TABLE public_ideas 
ALTER COLUMN identification SET NOT NULL;
