import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Upload, File, Download, Trash2, Eye, FileText, Film, Link as LinkIcon } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Card } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import {
  DashboardHeader,
  StatsCard,
  SearchInput,
  FilterBar,
  EmptyState,
  gradients
} from '@/shared/design';
import LoadingSpinner from '@/shared/components/ui/LoadingSpinner';
import { supabase } from '@/shared/services/supabaseClient';
import { ClassService } from '@/shared/services/classService';

const ClassMaterialsPage = () => {
  const { classId } = useParams();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [classData, setClassData] = useState(null);
  const [materials, setMaterials] = useState([]);
  const [filteredMaterials, setFilteredMaterials] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({ category: null });
  const [stats, setStats] = useState({
    total: 0,
    downloads: 0,
    storageUsed: 0
  });

  useEffect(() => {
    loadData();
  }, [classId]);

  useEffect(() => {
    applyFiltersAndSearch();
  }, [materials, searchQuery, filters]);

  const loadData = async () => {
    try {
      setLoading(true);

      const classInfo = await ClassService.getClassById(classId);
      setClassData(classInfo);

      // Mock materials (implementar quando houver tabela materials)
      const mockMaterials = [
        {
          id: '1',
          title: 'Apostila - Capítulo 1',
          description: 'Material de apoio para primeira unidade',
          category: 'pdf',
          fileSize: 2500000,
          downloads: 45,
          uploadedAt: new Date().toISOString(),
          fileUrl: '#'
        },
        {
          id: '2',
          title: 'Slides - Aula 01',
          description: 'Slides da primeira aula',
          category: 'presentation',
          fileSize: 5000000,
          downloads: 38,
          uploadedAt: new Date().toISOString(),
          fileUrl: '#'
        }
      ];

      setMaterials(mockMaterials);

      // Calculate stats
      const totalStorage = mockMaterials.reduce((sum, m) => sum + m.fileSize, 0);
      const totalDownloads = mockMaterials.reduce((sum, m) => sum + m.downloads, 0);

      setStats({
        total: mockMaterials.length,
        downloads: totalDownloads,
        storageUsed: totalStorage
      });

    } catch (error) {
      console.error('Erro:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFiltersAndSearch = () => {
    let result = [...materials];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(m =>
        m.title?.toLowerCase().includes(query) ||
        m.description?.toLowerCase().includes(query)
      );
    }

    if (filters.category) {
      result = result.filter(m => m.category === filters.category);
    }

    setFilteredMaterials(result);
  };

  const getCategoryIcon = (category) => {
    const icons = {
      pdf: FileText,
      video: Film,
      presentation: File,
      link: LinkIcon,
      other: File
    };
    return icons[category] || File;
  };

  const getCategoryColor = (category) => {
    const colors = {
      pdf: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
      video: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
      presentation: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300',
      link: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
      other: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
    };
    return colors[category] || colors.other;
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-6">
      <Button
        variant="ghost"
        onClick={() => navigate(`/dashboard/classes/${classId}`)}
        className="mb-4"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Voltar
      </Button>

      <DashboardHeader
        title={`Materiais - ${classData?.name || 'Turma'}`}
        subtitle="Gerencie os materiais de apoio"
        role="teacher"
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <StatsCard
          title="Total de Materiais"
          value={stats.total}
          icon={File}
          gradient={gradients.stats.activities}
          delay={0}
        />
        <StatsCard
          title="Downloads Totais"
          value={stats.downloads}
          icon={Download}
          gradient={gradients.success}
          delay={0.1}
        />
        <StatsCard
          title="Armazenamento"
          value={`${formatFileSize(stats.storageUsed)} / 500MB`}
          icon={Upload}
          gradient="from-blue-500 to-cyan-500"
          format="text"
          delay={0.2}
        />
      </div>

      {/* Banner FREE */}
      <Card className="p-6 bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 mb-8">
        <p className="text-amber-800 dark:text-amber-200 text-sm">
          ⚠️ <strong>Versão FREE:</strong> Limite de 500MB e arquivos de até 50MB.
          <br />
          💎 <strong>PRO:</strong> 10GB de armazenamento e arquivos de até 500MB.
        </p>
      </Card>

      <div className="flex flex-col md:flex-row gap-4 mb-8">
        <div className="flex-1">
          <SearchInput
            placeholder="Buscar material..."
            value={searchQuery}
            onChange={setSearchQuery}
          />
        </div>
        
        <FilterBar
          filters={[
            {
              key: 'category',
              label: 'Categoria',
              options: [
                { value: 'pdf', label: 'PDFs' },
                { value: 'video', label: 'Vídeos' },
                { value: 'presentation', label: 'Apresentações' },
                { value: 'link', label: 'Links' },
                { value: 'other', label: 'Outros' }
              ]
            }
          ]}
          activeFilters={filters}
          onFilterChange={(key, value) => setFilters(prev => ({ ...prev, [key]: value }))}
          onClearAll={() => {
            setFilters({ category: null });
            setSearchQuery('');
          }}
        />
        
        <Button className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white">
          <Upload className="w-4 h-4 mr-2" />
          Upload Material
        </Button>
      </div>

      {filteredMaterials.length > 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {filteredMaterials.map((material, index) => {
            const Icon = getCategoryIcon(material.category);
            
            return (
              <motion.div
                key={material.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className="p-6 hover:shadow-lg transition-shadow bg-white dark:bg-slate-900">
                  <div className="flex items-start justify-between mb-4">
                    <div className={`p-3 rounded-lg ${getCategoryColor(material.category)}`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <Badge className={getCategoryColor(material.category)}>
                      {material.category.toUpperCase()}
                    </Badge>
                  </div>

                  <h3 className="font-bold text-slate-900 dark:text-white mb-2">
                    {material.title}
                  </h3>
                  
                  {material.description && (
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                      {material.description}
                    </p>
                  )}

                  <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-500 mb-4">
                    <span>{formatFileSize(material.fileSize)}</span>
                    <span>•</span>
                    <span>{material.downloads} downloads</span>
                  </div>

                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1">
                      <Eye className="w-4 h-4 mr-2" />
                      Visualizar
                    </Button>
                    <Button variant="outline" size="sm">
                      <Download className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="sm" className="text-red-600">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </motion.div>
      ) : (
        <EmptyState
          icon={File}
          title={searchQuery || filters.category ? 'Nenhum material encontrado' : 'Nenhum material ainda'}
          description={searchQuery || filters.category ? 'Ajuste os filtros.' : 'Faça upload do primeiro material.'}
          actionLabel="Upload Material"
          actionIcon={Upload}
          action={() => {}}
        />
      )}
    </div>
  );
};

export default ClassMaterialsPage;
