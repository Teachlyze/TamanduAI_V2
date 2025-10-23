import React, { useEffect, useState } from 'react';
import { LoadingScreen } from '@/shared/components/ui/LoadingScreen';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Label } from '@/shared/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { toast } from '@/shared/components/ui/use-toast';
import {
  Sun,
  Moon,
  Eye,
  Type,
  RotateCcw,
  Globe,
  Accessibility,
  CheckCircle2
} from 'lucide-react';
import { useLanguageDetection } from '@/shared/hooks/useLanguageDetection';
import useTheme from '@/shared/hooks/useTheme';

export const [loading, setLoading] = useState(true);
  const AccessibilitySettings = () => {
  const { toggleTheme, isDark } = useTheme();
  const { currentLanguage, setLanguage, supportedLanguages } = useLanguageDetection();

  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem('accessibility-settings');
    return saved ? JSON.parse(saved) : {
      fontSize: 16,
      highContrast: false,
      lineSpacing: 1.5,
      letterSpacing: 0,
    };
  });

  // Aplicar configurações
  useEffect(() => {
    const applySettings = () => {
      const root = document.documentElement;

      // Font size
      root.style.fontSize = `${settings.fontSize}px`;
      
      // Line spacing
      root.style.lineHeight = settings.lineSpacing.toString();
      
      // Letter spacing
      root.style.letterSpacing = `${settings.letterSpacing}px`;

      // High contrast
      if (settings.highContrast) {
        root.classList.add('high-contrast');
      } else {
        root.classList.remove('high-contrast');
      }
    };

    applySettings();
    localStorage.setItem('accessibility-settings', JSON.stringify(settings));

    // Dispatch event
    window.dispatchEvent(new CustomEvent('accessibilitySettingsChanged', {
      detail: settings
    }));
  }, [settings]);

  const handleLanguageChange = async (langCode) => {
    try {
      await setLanguage(langCode);
      window.dispatchEvent(new CustomEvent('languageChanged', { detail: langCode }));
      toast({
        title: 'Idioma alterado',
        description: 'As configurações de idioma foram atualizadas.',
      });
    } catch (error) {
      console.error('Erro ao alterar idioma:', error);
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Não foi possível alterar o idioma.',
      });
    }
  };

  const handleReset = () => {
    setSettings({
      fontSize: 16,
      highContrast: false,
      lineSpacing: 1.5,
      letterSpacing: 0,
    });
    toast({
      title: 'Configurações resetadas',
      description: 'As configurações de acessibilidade foram restauradas aos padrões.',
    });
  };
  return (
    <div className="grid gap-6">
      {/* Tema */}
      <Card className="rounded-2xl border border-gray-200 dark:border-gray-700 shadow-lg">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-r from-amber-500 to-orange-500 rounded-xl flex items-center justify-center text-white hover:opacity-90">
              {isDark ? <Moon className="w-5 h-5 text-white" /> : <Sun className="w-5 h-5 text-white" />}
            </div>
            Tema Visual
          </CardTitle>
          <CardDescription>
            Escolha entre modo claro ou escuro para melhor conforto visual.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-xl border-2 border-amber-200 dark:border-amber-800">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center shadow-lg">
                {isDark ? <Moon className="w-6 h-6 text-white" /> : <Sun className="w-6 h-6 text-white" />}
              </div>
              <div>
                <h4 className="text-sm font-bold text-amber-900 dark:text-amber-200">
                  {isDark ? 'Modo Escuro' : 'Modo Claro'}
                </h4>
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  {isDark ? 'Reduz brilho da tela' : 'Aumenta legibilidade'}
                </p>
              </div>
            </div>
            <button
              onClick={toggleTheme}
              className="w-16 h-9 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 dark:from-blue-500 dark:to-indigo-600 relative shadow-lg hover:shadow-xl transition-all duration-300 flex items-center text-white hover:opacity-90"
            >
              <div className={`absolute w-7 h-7 bg-white rounded-full shadow-md transition-all duration-300 flex items-center justify-center ${
                isDark ? 'right-1' : 'left-1'
              }`}>
                {isDark ? <Moon className="w-3.5 h-3.5 text-blue-600" /> : <Sun className="w-3.5 h-3.5 text-orange-600" />}
              </div>
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Alto Contraste */}
      <Card className="rounded-2xl border border-gray-200 dark:border-gray-700 shadow-lg">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-r from-gray-500 to-gray-700 rounded-xl flex items-center justify-center text-white hover:opacity-90">
              <Eye className="w-5 h-5 text-white" />
            </div>
            Alto Contraste
          </CardTitle>
          <CardDescription>
            Melhora a visibilidade aumentando o contraste entre texto e fundo.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                <Eye className="w-5 h-5 text-gray-700 dark:text-gray-300" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                  {settings.highContrast ? 'Ativado' : 'Desativado'}
                </h4>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Melhor visibilidade
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSettings(prev => ({ ...prev, highContrast: !prev.highContrast }))}
              className={`relative inline-flex h-9 w-16 items-center rounded-full transition-all duration-300 ${
                settings.highContrast
                  ? 'bg-blue-600'
                  : 'bg-gray-300 dark:bg-gray-600'
              }`}
            >
              <span
                className={`inline-block h-7 w-7 transform rounded-full bg-white shadow-md transition-all duration-300 ${
                  settings.highContrast ? 'translate-x-8' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Tamanho do Texto */}
      <Card className="rounded-2xl border border-gray-200 dark:border-gray-700 shadow-lg">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center text-white hover:opacity-90">
              <Type className="w-5 h-5 text-white" />
            </div>
            Tamanho do Texto
          </CardTitle>
          <CardDescription>
            Ajuste o tamanho da fonte para melhor legibilidade.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Label className="text-sm font-medium">Tamanho: {settings.fontSize}px</Label>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSettings(prev => ({ ...prev, fontSize: Math.max(12, prev.fontSize - 2) }))}
                disabled={settings.fontSize <= 12}
                className="w-12 h-12 rounded-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 dark:disabled:bg-gray-600 disabled:cursor-not-allowed shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center"
              >
                <span className="text-2xl font-bold text-white">−</span>
              </button>
              <div className="flex-1 text-center">
                <span className="text-4xl font-bold text-gray-900 dark:text-white">{settings.fontSize}</span>
                <span className="text-sm text-gray-500 ml-2">px</span>
              </div>
              <button
                onClick={() => setSettings(prev => ({ ...prev, fontSize: Math.min(24, prev.fontSize + 2) }))}
                disabled={settings.fontSize >= 24}
                className="w-12 h-12 rounded-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 dark:disabled:bg-gray-600 disabled:cursor-not-allowed shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center"
              >
                <span className="text-2xl font-bold text-white">+</span>
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Espaçamento entre Linhas */}
      <Card className="rounded-2xl border border-gray-200 dark:border-gray-700 shadow-lg">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center text-white hover:opacity-90">
              <Type className="w-5 h-5 text-white" />
            </div>
            Espaçamento entre Linhas
          </CardTitle>
          <CardDescription>
            Ajuste o espaçamento entre as linhas de texto.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Label className="text-sm font-medium">Espaçamento: {settings.lineSpacing.toFixed(1)}</Label>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSettings(prev => ({ ...prev, lineSpacing: Math.max(1.0, prev.lineSpacing - 0.2) }))}
                disabled={settings.lineSpacing <= 1.0}
                className="w-12 h-12 rounded-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300 dark:disabled:bg-gray-600 disabled:cursor-not-allowed shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center"
              >
                <span className="text-2xl font-bold text-white">−</span>
              </button>
              <div className="flex-1 text-center">
                <span className="text-4xl font-bold text-gray-900 dark:text-white">{settings.lineSpacing.toFixed(1)}</span>
              </div>
              <button
                onClick={() => setSettings(prev => ({ ...prev, lineSpacing: Math.min(2.5, prev.lineSpacing + 0.2) }))}
                disabled={settings.lineSpacing >= 2.5}
                className="w-12 h-12 rounded-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300 dark:disabled:bg-gray-600 disabled:cursor-not-allowed shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center"
              >
                <span className="text-2xl font-bold text-white">+</span>
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Espaçamento entre Letras */}
      <Card className="rounded-2xl border border-gray-200 dark:border-gray-700 shadow-lg">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl flex items-center justify-center text-white hover:opacity-90">
              <Type className="w-5 h-5 text-white" />
            </div>
            Espaçamento entre Letras
          </CardTitle>
          <CardDescription>
            Ajuste o espaçamento entre as letras do texto.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Label className="text-sm font-medium">Espaçamento: {settings.letterSpacing}px</Label>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSettings(prev => ({ ...prev, letterSpacing: Math.max(0, prev.letterSpacing - 0.5) }))}
                disabled={settings.letterSpacing <= 0}
                className="w-12 h-12 rounded-full bg-green-600 hover:bg-green-700 disabled:bg-gray-300 dark:disabled:bg-gray-600 disabled:cursor-not-allowed shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center"
              >
                <span className="text-2xl font-bold text-white">−</span>
              </button>
              <div className="flex-1 text-center">
                <span className="text-4xl font-bold text-gray-900 dark:text-white">{settings.letterSpacing}</span>
                <span className="text-sm text-gray-500 ml-2">px</span>
              </div>
              <button
                onClick={() => setSettings(prev => ({ ...prev, letterSpacing: Math.min(3, prev.letterSpacing + 0.5) }))}
                disabled={settings.letterSpacing >= 3}
                className="w-12 h-12 rounded-full bg-green-600 hover:bg-green-700 disabled:bg-gray-300 dark:disabled:bg-gray-600 disabled:cursor-not-allowed shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center"
              >
                <span className="text-2xl font-bold text-white">+</span>
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Idioma */}
      <Card className="rounded-2xl border border-gray-200 dark:border-gray-700 shadow-lg">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-xl flex items-center justify-center text-white hover:opacity-90">
              <Globe className="w-5 h-5 text-white" />
            </div>
            Idioma da Interface
          </CardTitle>
          <CardDescription>
            Selecione o idioma preferido para a interface.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Label className="text-sm font-medium">
              Idioma atual: {currentLanguage?.nativeName || 'Português'}
            </Label>
            <div className="grid grid-cols-3 gap-3">
              {supportedLanguages.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => handleLanguageChange(lang.code)}
                  className={`h-20 rounded-xl flex flex-col items-center justify-center gap-2 transition-all duration-200 ${
                    currentLanguage.code === lang.code
                      ? 'bg-indigo-600 text-white shadow-lg'
                      : 'bg-white dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 hover:border-indigo-500 dark:hover:border-indigo-500'
                  }`}
                >
                  <span className="text-3xl">{lang.flag}</span>
                  <span className="text-xs font-semibold">{lang.code.toUpperCase()}</span>
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Ações */}
      <Card className="rounded-2xl border border-gray-200 dark:border-gray-700 shadow-lg">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={handleReset}
              className="bg-white dark:bg-slate-900 text-foreground border-border flex-1 h-12 rounded-xl border-2"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Restaurar Padrões
            </Button>
            <Button
              onClick={() => {
                toast({
                  title: 'Configurações salvas',
                  description: 'Suas preferências de acessibilidade foram salvas automaticamente.',
                });
              }}
              className="flex-1 h-12 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white hover:opacity-90"
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Salvar Configurações
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AccessibilitySettings;
