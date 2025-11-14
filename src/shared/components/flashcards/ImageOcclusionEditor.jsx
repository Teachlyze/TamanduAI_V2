/**
 * Image Occlusion Editor
 * Draw rectangles over images to create multiple cards
 */

import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Upload, Trash2, Plus, Square, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Card } from '@/shared/components/ui/card';
import { Label } from '@/shared/components/ui/label';
import { Badge } from '@/shared/components/ui/badge';
import { useToast } from '@/shared/components/ui/use-toast';

const ImageOcclusionEditor = ({ value, onChange }) => {
  const { toast } = useToast();
  const canvasRef = useRef(null);
  const imageRef = useRef(null);
  const fileInputRef = useRef(null);

  const [imageUrl, setImageUrl] = useState(value?.imageUrl || null);
  const [occlusions, setOcclusions] = useState(value?.occlusions || []);
  const [drawing, setDrawing] = useState(false);
  const [currentRect, setCurrentRect] = useState(null);
  const [showAll, setShowAll] = useState(true);

  useEffect(() => {
    onChange({ imageUrl, occlusions });
  }, [imageUrl, occlusions]);

  useEffect(() => {
    if (imageUrl && canvasRef.current) {
      drawCanvas();
    }
  }, [imageUrl, occlusions, showAll]);

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Arquivo inválido',
        description: 'Apenas imagens são permitidas.',
        variant: 'destructive',
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'Arquivo muito grande',
        description: 'Imagem deve ter no máximo 5MB.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const reader = new FileReader();
      reader.onload = (e) => {
        setImageUrl(e.target.result);
        setOcclusions([]);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      toast({
        title: 'Erro ao carregar imagem',
        description: 'Tente novamente.',
        variant: 'destructive',
      });
    }
  };

  const drawCanvas = () => {
    const canvas = canvasRef.current;
    const image = imageRef.current;
    if (!canvas || !image) return;

    const ctx = canvas.getContext('2d');
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;

    // Draw image
    ctx.drawImage(image, 0, 0);

    // Draw occlusions
    occlusions.forEach((occlusion, index) => {
      if (showAll || currentRect?.index === index) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(occlusion.x, occlusion.y, occlusion.width, occlusion.height);

        // Draw label
        ctx.fillStyle = 'white';
        ctx.font = '20px Arial';
        ctx.fillText(
          `${index + 1}`,
          occlusion.x + occlusion.width / 2 - 10,
          occlusion.y + occlusion.height / 2 + 7
        );
      }

      // Draw border
      ctx.strokeStyle = showAll || currentRect?.index === index ? '#3B82F6' : '#E5E7EB';
      ctx.lineWidth = 2;
      ctx.strokeRect(occlusion.x, occlusion.y, occlusion.width, occlusion.height);
    });

    // Draw current rectangle being drawn
    if (currentRect && !currentRect.index) {
      ctx.strokeStyle = '#EF4444';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.strokeRect(currentRect.x, currentRect.y, currentRect.width, currentRect.height);
      ctx.setLineDash([]);
    }
  };

  const handleMouseDown = (e) => {
    if (!imageUrl) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    setDrawing(true);
    setCurrentRect({ x, y, width: 0, height: 0 });
  };

  const handleMouseMove = (e) => {
    if (!drawing || !currentRect) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const currentX = (e.clientX - rect.left) * scaleX;
    const currentY = (e.clientY - rect.top) * scaleY;

    setCurrentRect({
      ...currentRect,
      width: currentX - currentRect.x,
      height: currentY - currentRect.y,
    });
  };

  const handleMouseUp = () => {
    if (!drawing || !currentRect) return;

    if (Math.abs(currentRect.width) > 10 && Math.abs(currentRect.height) > 10) {
      // Normalize rectangle (handle negative width/height)
      const normalizedRect = {
        x: currentRect.width < 0 ? currentRect.x + currentRect.width : currentRect.x,
        y: currentRect.height < 0 ? currentRect.y + currentRect.height : currentRect.y,
        width: Math.abs(currentRect.width),
        height: Math.abs(currentRect.height),
      };

      setOcclusions([...occlusions, normalizedRect]);
    }

    setDrawing(false);
    setCurrentRect(null);
  };

  const handleRemoveOcclusion = (index) => {
    setOcclusions(occlusions.filter((_, i) => i !== index));
  };

  const handleClearAll = () => {
    setOcclusions([]);
  };

  return (
    <div className="space-y-4">
      {/* Upload */}
      {!imageUrl && (
        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-lg p-12 text-center cursor-pointer hover:border-blue-400 transition-colors"
        >
          <Upload className="w-12 h-12 mx-auto mb-4 text-slate-400" />
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
            Clique para fazer upload de uma imagem
          </p>
          <p className="text-xs text-slate-500">PNG, JPG até 5MB</p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="hidden"
          />
        </div>
      )}

      {/* Canvas */}
      {imageUrl && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Desenhe retângulos sobre a imagem</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setShowAll(!showAll)}
              >
                {showAll ? <Eye className="w-4 h-4 mr-2" /> : <EyeOff className="w-4 h-4 mr-2" />}
                {showAll ? 'Ocultar Todas' : 'Mostrar Todas'}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleClearAll}
                disabled={occlusions.length === 0}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Limpar
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  setImageUrl(null);
                  setOcclusions([]);
                }}
              >
                Nova Imagem
              </Button>
            </div>
          </div>

          <div className="relative border-2 border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
            <img
              ref={imageRef}
              src={imageUrl}
              alt="Occlusion"
              className="hidden"
              onLoad={drawCanvas}
            />
            <canvas
              ref={canvasRef}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              className="w-full h-auto cursor-crosshair"
            />
          </div>

          {/* Occlusions List */}
          {occlusions.length > 0 && (
            <div>
              <Label className="mb-2 block">
                Oclusões Criadas ({occlusions.length})
              </Label>
              <div className="space-y-2">
                {occlusions.map((occlusion, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-900 rounded"
                  >
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{index + 1}</Badge>
                      <span className="text-sm">
                        {Math.round(occlusion.width)} × {Math.round(occlusion.height)}px
                      </span>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => handleRemoveOcclusion(index)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-2">
                Cada oclusão criará um card separado
              </p>
            </div>
          )}

          {occlusions.length === 0 && (
            <Card className="p-4 bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800">
              <p className="text-sm text-blue-900 dark:text-blue-100">
                💡 Clique e arraste para desenhar retângulos sobre as áreas que deseja ocultar.
                Cada retângulo gerará um card separado.
              </p>
            </Card>
          )}
        </div>
      )}
    </div>
  );
};

export default ImageOcclusionEditor;
