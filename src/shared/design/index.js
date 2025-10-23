/**
 * 🎨 DESIGN SYSTEM - TamanduAI
 * Sistema centralizado de design para toda a aplicação
 */

// ============================================
// TOKENS
// ============================================
export * from './tokens';

// ============================================
// COMPONENTES
// ============================================
export { default as StatsCard } from './components/StatsCard';
export { default as DashboardHeader } from './components/DashboardHeader';
export { default as EmptyState } from './components/EmptyState';
export { default as ClassCard } from './components/ClassCard';
export { default as ActivityCard } from './components/ActivityCard';
export { default as SearchInput } from './components/SearchInput';
export { default as FilterBar } from './components/FilterBar';
export { default as CopyButton } from './components/CopyButton';
export { default as DataTable } from './components/DataTable';
export { default as SubmissionCard } from './components/SubmissionCard';
export { default as GradeForm } from './components/GradeForm';
export { default as InlineEdit } from './components/InlineEdit';
export { default as ColorPicker } from './components/ColorPicker';

// ============================================
// HOOKS (para futura expansão)
// ============================================
// export { useTheme } from './hooks/useTheme';
// export { useBreakpoint } from './hooks/useBreakpoint';

// ============================================
// UTILITÁRIOS
// ============================================
// Já exportados dos tokens:
// - cn (combinar classes)
// - valueOrEmpty (valor ou empty state)
// - formatNumber (formatar número)
// - getRoleGradient (pegar gradiente por role)
// - getStatusBadge (pegar badge por status)
