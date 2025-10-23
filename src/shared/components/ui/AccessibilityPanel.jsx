// src/components/ui/AccessibilityPanel.jsx
import React, { useState } from 'react';
import { useAccessibilityAdvanced } from '@/shared/hooks/useAccessibilityAdvanced.jsx';
import { useAccessibility } from '@/shared/hooks/useAccessibility';
import { useWCAGValidator } from '@/shared/hooks/useWCAGValidator';
import { Button } from './button';
import { Settings, Eye, Palette, Monitor } from 'lucide-react';

/**
 * Painel completo de configurações de acessibilidade
 */
const AccessibilityPanel = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState('basic');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-base-100 rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-base-200">
          <h2 className="text-2xl font-bold">Configurações de Acessibilidade</h2>
          <button
            onClick={onClose}
            className="btn btn-ghost btn-sm"
            aria-label="Fechar painel"
          >
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-base-200">
          <button
            onClick={() => setActiveTab('basic')}
            className={`flex-1 px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'basic'
                ? 'border-primary text-primary'
                : 'border-transparent text-base-content/70 hover:text-base-content'
            }`}
          >
            <Settings className="w-4 h-4 inline mr-2" />
            Básico
          </button>
          <button
            onClick={() => setActiveTab('visual')}
            className={`flex-1 px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'visual'
                ? 'border-primary text-primary'
                : 'border-transparent text-base-content/70 hover:text-base-content'
            }`}
          >
            <Eye className="w-4 h-4 inline mr-2" />
            Visual
          </button>
          <button
            onClick={() => setActiveTab('themes')}
            className={`flex-1 px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'themes'
                ? 'border-primary text-primary'
                : 'border-transparent text-base-content/70 hover:text-base-content'
            }`}
          >
            <Palette className="w-4 h-4 inline mr-2" />
            Temas
          </button>
          <button
            onClick={() => setActiveTab('advanced')}
            className={`flex-1 px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'advanced'
                ? 'border-primary text-primary'
                : 'border-transparent text-base-content/70 hover:text-base-content'
            }`}
          >
            <Monitor className="w-4 h-4 inline mr-2" />
            Avançado
          </button>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[60vh] overflow-y-auto">
          {activeTab === 'basic' && <BasicAccessibilitySettings />}
          {activeTab === 'visual' && <VisualAccessibilitySettings />}
          {activeTab === 'themes' && <ThemeSettings />}
          {activeTab === 'advanced' && <AdvancedAccessibilitySettings />}
        </div>

        <div className="flex justify-end gap-3 p-6 border-t border-base-200">
          <button onClick={onClose} className="btn btn-outline">
            Cancelar
          </button>
          <button onClick={onClose} className="btn btn-primary">
            Aplicar Configurações
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * Configurações básicas de acessibilidade
 */
const BasicAccessibilitySettings = () => {
  const { preferences, savePreferences } = useAccessibility();

  return (
    <div className="space-y-6">
      <div className="prose max-w-none">
        <h3>Configurações Básicas</h3>
        <p>Configure as opções essenciais de acessibilidade para sua experiência.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Tema */}
        <div className="space-y-3">
          <h4 className="font-semibold">Tema de Cores</h4>
          <div className="grid grid-cols-3 gap-2">
            {[
              { value: 'light', label: 'Claro' },
              { value: 'dark', label: 'Escuro' },
              { value: 'auto', label: 'Automático' },
            ].map((option) => (
              <button
                key={option.value}
                onClick={() => savePreferences({ colorScheme: option.value })}
                className={`btn btn-sm capitalize ${
                  preferences.colorScheme === option.value ? 'btn-primary' : 'btn-outline'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* Alto contraste */}
        <div className="flex items-center justify-between p-4 bg-base-200 rounded-lg">
          <div>
            <h4 className="font-semibold">Alto Contraste</h4>
            <p className="text-sm text-base-content/70">
              Aumenta o contraste para melhor legibilidade
            </p>
          </div>
          <input
            type="checkbox"
            className="toggle toggle-primary"
            checked={preferences.highContrast}
            onChange={(e) => savePreferences({ highContrast: e.target.checked })}
          />
        </div>

        {/* Texto grande */}
        <div className="flex items-center justify-between p-4 bg-base-200 rounded-lg">
          <div>
            <h4 className="font-semibold">Texto Grande</h4>
            <p className="text-sm text-base-content/70">
              Aumenta o tamanho do texto em toda a interface
            </p>
          </div>
          <input
            type="checkbox"
            className="toggle toggle-primary"
            checked={preferences.largeText}
            onChange={(e) => savePreferences({ largeText: e.target.checked })}
          />
        </div>

        {/* Movimento reduzido */}
        <div className="flex items-center justify-between p-4 bg-base-200 rounded-lg">
          <div>
            <h4 className="font-semibold">Movimento Reduzido</h4>
            <p className="text-sm text-base-content/70">
              Remove animações que podem causar desconforto
            </p>
          </div>
          <input
            type="checkbox"
            className="toggle toggle-primary"
            checked={preferences.reducedMotion}
            onChange={(e) => savePreferences({ reducedMotion: e.target.checked })}
          />
        </div>
      </div>
    </div>
  );
};

/**
 * Configurações visuais
 */
const VisualAccessibilitySettings = () => {
  const { advancedPreferences, saveAdvancedPreferences } = useAccessibilityAdvanced();

  return (
    <div className="space-y-6">
      <div className="prose max-w-none">
        <h3>Ajustes Visuais</h3>
        <p>Personalize a aparência visual da interface para suas necessidades.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Família de fonte */}
        <div className="space-y-3">
          <h4 className="font-semibold">Família de Fonte</h4>
          <div className="grid grid-cols-1 gap-2">
            {[
              { value: 'inter', label: 'Inter (Padrão)' },
              { value: 'dyslexia', label: 'Fonte para Dislexia' },
              { value: 'system', label: 'Fonte do Sistema' },
            ].map((font) => (
              <button
                key={font.value}
                onClick={() => saveAdvancedPreferences({ fontFamily: font.value })}
                className={`btn btn-sm justify-start ${
                  advancedPreferences.fontFamily === font.value ? 'btn-primary' : 'btn-outline'
                }`}
              >
                {font.label}
              </button>
            ))}
          </div>
        </div>

        {/* Altura da linha */}
        <div className="space-y-3">
          <h4 className="font-semibold">Altura da Linha</h4>
          <select
            className="select select-bordered w-full"
            value={advancedPreferences.lineHeight}
            onChange={(e) => saveAdvancedPreferences({ lineHeight: e.target.value })}
          >
            <option value="tight">Apertada (1.2)</option>
            <option value="normal">Normal (1.6)</option>
            <option value="relaxed">Relaxada (1.8)</option>
          </select>
        </div>

        {/* Espaçamento entre letras */}
        <div className="space-y-3">
          <h4 className="font-semibold">Espaçamento de Letras</h4>
          <select
            className="select select-bordered w-full"
            value={advancedPreferences.letterSpacing}
            onChange={(e) => saveAdvancedPreferences({ letterSpacing: e.target.value })}
          >
            <option value="tight">Apertado</option>
            <option value="normal">Normal</option>
            <option value="wide">Largo</option>
          </select>
        </div>

        {/* Ajustes visuais */}
        <div className="space-y-3">
          <h4 className="font-semibold">Ajustes de Cor</h4>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-2">Saturação</label>
              <select
                className="select select-bordered w-full select-sm"
                value={advancedPreferences.saturation}
                onChange={(e) => saveAdvancedPreferences({ saturation: e.target.value })}
              >
                <option value="low">Baixa</option>
                <option value="normal">Normal</option>
                <option value="high">Alta</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Brilho</label>
              <select
                className="select select-bordered w-full select-sm"
                value={advancedPreferences.brightness}
                onChange={(e) => saveAdvancedPreferences({ brightness: e.target.value })}
              >
                <option value="low">Baixo</option>
                <option value="normal">Normal</option>
                <option value="high">Alto</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Preview visual */}
      <div className="p-4 bg-base-200 rounded-lg">
        <h4 className="font-semibold mb-2">Preview</h4>
        <p className="text-sm">
          Esta é uma prévia de como o texto aparece com suas configurações atuais.
          Você pode ajustar as opções acima para ver as mudanças em tempo real.
        </p>
      </div>
    </div>
  );
};

/**
 * Configurações de tema
 */
const ThemeSettings = () => {
  return (
    <div className="space-y-6">
      <AdvancedThemeSelector />
    </div>
  );
};

/**
 * Configurações avançadas
 */
const AdvancedAccessibilitySettings = () => {
  const { validateWCAG, violations, isValidating } = useWCAGValidator();

  return (
    <div className="space-y-6">
      <div className="prose max-w-none">
        <h3>Configurações Avançadas</h3>
        <p>
          Ferramentas avançadas para desenvolvedores e usuários que precisam de
          controle fino sobre acessibilidade.
        </p>
      </div>

      {/* Validação WCAG */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="font-semibold">Validação WCAG 2.1</h4>
          <button
            onClick={validateWCAG}
            disabled={isValidating}
            className="btn btn-primary btn-sm"
          >
            {isValidating ? 'Verificando...' : 'Verificar Página'}
          </button>
        </div>

        {violations.length > 0 && (
          <div className="space-y-2">
            <h5 className="font-medium">Problemas Encontrados:</h5>
            <div className="max-h-48 overflow-y-auto space-y-2">
              {violations.map((violation, index) => (
                <div
                  key={index}
                  className={`p-3 rounded-lg border ${
                    violation.severity === 'error'
                      ? 'bg-error/10 border-error text-error'
                      : 'bg-warning/10 border-warning text-warning'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <p className="font-medium text-sm">{violation.message}</p>
                      <p className="text-xs opacity-75">
                        WCAG {violation.wcag} • {violation.severity}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Informações técnicas */}
      <div className="p-4 bg-base-200 rounded-lg">
        <h4 className="font-semibold mb-2">Informações Técnicas</h4>
        <div className="text-sm space-y-1">
          <p><strong>Contraste atual:</strong> Aplicado automaticamente</p>
          <p><strong>Movimento reduzido:</strong> Aplicado via CSS</p>
          <p><strong>Focus visível:</strong> Indicadores aprimorados</p>
          <p><strong>Screen reader:</strong> Suporte completo</p>
        </div>
      </div>
    </div>
  );
};

export default AccessibilityPanel;
