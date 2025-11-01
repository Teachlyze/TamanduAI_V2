import React from 'react';
import { FileText } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/shared/components/ui/dropdown-menu';

const FeedbackTemplatesSelector = ({ templates, onSelect }) => {
  if (!templates || templates.length === 0) {
    return null;
  }

  const grouped = templates.reduce((acc, template) => {
    const category = template.category || 'general';
    if (!acc[category]) acc[category] = [];
    acc[category].push(template);
    return acc;
  }, {});

  const categoryLabels = {
    positive: 'Positivos',
    constructive: 'Construtivos',
    critical: 'Críticos',
    general: 'Gerais'
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <FileText className="w-4 h-4 mr-2" />
          Templates
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        {Object.entries(grouped).map(([category, items], idx) => (
          <div key={category}>
            {idx > 0 && <DropdownMenuSeparator />}
            <div className="px-2 py-1.5 text-sm font-semibold text-gray-500">
              {categoryLabels[category] || category}
            </div>
            {items.map((template) => (
              <DropdownMenuItem
                key={template.id}
                onClick={() => onSelect(template)}
                className="cursor-pointer"
              >
                <div className="flex-1">
                  <div className="text-sm line-clamp-2">
                    {template.template_text}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Usado {template.usage_count || 0}x
                  </div>
                </div>
              </DropdownMenuItem>
            ))}
          </div>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default FeedbackTemplatesSelector;
