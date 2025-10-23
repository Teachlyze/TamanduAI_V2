import React, { useState } from 'react';
import { Check } from 'lucide-react';
import { Label } from '@/shared/components/ui/label';
import { colors as designColors } from '../tokens';

/**
 * ColorPicker - Seletor de cor com presets
 * 
 * @param {string} value - Cor selecionada
 * @param {function} onChange - Callback quando cor muda
 * @param {string} label - Label do picker
 * @param {Array} presets - Cores predefinidas
 * @param {boolean} allowCustom - Permitir cor customizada
 */
const ColorPicker = ({
  value = '#3B82F6',
  onChange,
  label = 'Cor',
  presets = null,
  allowCustom = true
}) => {
  const [customColor, setCustomColor] = useState(value);

  const defaultPresets = presets || [
    { name: 'Azul', color: '#3B82F6', gradient: 'from-blue-500 to-blue-600' },
    { name: 'Roxo', color: '#8B5CF6', gradient: 'from-purple-500 to-purple-600' },
    { name: 'Rosa', color: '#EC4899', gradient: 'from-pink-500 to-pink-600' },
    { name: 'Verde', color: '#10B981', gradient: 'from-green-500 to-green-600' },
    { name: 'Amarelo', color: '#F59E0B', gradient: 'from-amber-500 to-amber-600' },
    { name: 'Vermelho', color: '#EF4444', gradient: 'from-red-500 to-red-600' },
    { name: 'Indigo', color: '#6366F1', gradient: 'from-indigo-500 to-indigo-600' },
    { name: 'Teal', color: '#14B8A6', gradient: 'from-teal-500 to-teal-600' },
    { name: 'Laranja', color: '#F97316', gradient: 'from-orange-500 to-orange-600' },
    { name: 'Cyan', color: '#06B6D4', gradient: 'from-cyan-500 to-cyan-600' },
    { name: 'Lime', color: '#84CC16', gradient: 'from-lime-500 to-lime-600' },
    { name: 'Slate', color: '#64748B', gradient: 'from-slate-500 to-slate-600' }
  ];

  const handlePresetClick = (color) => {
    onChange(color);
  };

  const handleCustomChange = (e) => {
    const newColor = e.target.value;
    setCustomColor(newColor);
    onChange(newColor);
  };

  return (
    <div>
      {label && (
        <Label className="text-sm font-semibold mb-3 block">
          {label}
        </Label>
      )}

      {/* Preset Colors Grid */}
      <div className="grid grid-cols-6 gap-2 mb-4">
        {defaultPresets.map((preset) => (
          <button
            key={preset.color}
            type="button"
            onClick={() => handlePresetClick(preset.color)}
            className={`
              relative w-full aspect-square rounded-lg
              bg-gradient-to-br ${preset.gradient}
              hover:scale-110 transition-transform
              focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
              dark:focus:ring-offset-slate-900
            `}
            title={preset.name}
          >
            {value === preset.color && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-6 h-6 bg-white dark:bg-slate-900 rounded-full flex items-center justify-center shadow-lg">
                  <Check className="w-4 h-4 text-slate-900 dark:text-white" />
                </div>
              </div>
            )}
          </button>
        ))}
      </div>

      {/* Custom Color Picker */}
      {allowCustom && (
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <input
              type="color"
              value={customColor}
              onChange={handleCustomChange}
              className={`
                w-full h-10 rounded-lg cursor-pointer
                border-2 ${designColors.border.default}
                focus:ring-2 focus:ring-blue-500 focus:border-blue-500
              `}
            />
          </div>
          <div className={`
            flex-1 px-3 py-2 rounded-lg border ${designColors.border.default}
            bg-white dark:bg-slate-900 text-sm font-mono
            ${designColors.text.primary}
          `}>
            {customColor.toUpperCase()}
          </div>
        </div>
      )}

      {/* Current Color Preview */}
      <div className="mt-4 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-3">
          <div
            className="w-16 h-16 rounded-lg shadow-md"
            style={{ backgroundColor: value }}
          />
          <div>
            <p className="text-sm font-semibold text-slate-900 dark:text-white mb-1">
              Cor Selecionada
            </p>
            <p className="text-sm text-slate-600 dark:text-slate-400 font-mono">
              {value.toUpperCase()}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ColorPicker;
