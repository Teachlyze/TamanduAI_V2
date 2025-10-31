-- =====================================================
-- Migration: Fix Discussions and Materials FK
-- Description: Corrige FKs para apontar para profiles ao invés de auth.users
-- Author: TamanduAI Team  
-- Date: 2025-01-31
-- =====================================================

-- 1. DROPAR FK INCORRETA DE DISCUSSIONS
ALTER TABLE public.discussions 
DROP CONSTRAINT IF EXISTS discussions_created_by_fkey;

-- 2. CRIAR FK CORRETA APONTANDO PARA PROFILES
ALTER TABLE public.discussions
ADD CONSTRAINT discussions_created_by_fkey
FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 3. DROPAR FK INCORRETA DE CLASS_MATERIALS (SE EXISTIR)
ALTER TABLE public.class_materials 
DROP CONSTRAINT IF EXISTS class_materials_created_by_fkey;

-- 4. CRIAR FK CORRETA PARA CLASS_MATERIALS
ALTER TABLE public.class_materials
ADD CONSTRAINT class_materials_created_by_fkey
FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE CASCADE;
