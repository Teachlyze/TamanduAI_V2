import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { Logger } from '@/shared/services/logger';

const ClassContext = createContext();

export const useClass = () => {
  const context = useContext(ClassContext);
  if (context === undefined) {
    return {
      selectedClass: null,
      selectClass: () => {},
      clearSelection: () => {},
      materials: [],
      addMaterial: () => {},
      removeMaterial: () => {},
      setTrainingMaterials: () => {},
      trainingMaterials: [],
    };
  }
  return context;
};

export const ClassProvider = ({ children }) => {
  const [selectedClass, setSelectedClass] = useState(null);
  const [materials, setMaterials] = useState({});
  const [trainingMaterials, setTrainingMaterials] = useState({});

  const selectClass = useCallback((classData) => {
    setSelectedClass(classData);
    Logger.info('Turma selecionada para contexto', {
      classId: classData?.id,
      className: classData?.name
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedClass(null);
    Logger.info('Seleção de turma limpa');
  }, []);

  const addMaterial = useCallback((classId, material) => {
    setMaterials(prev => ({
      ...prev,
      [classId]: [...(prev[classId] || []), material]
    }));
    Logger.info('Material adicionado à turma', {
      classId,
      materialName: material.name
    });
  }, []);

  const removeMaterial = useCallback((classId, materialId) => {
    setMaterials(prev => ({
      ...prev,
      [classId]: (prev[classId] || []).filter(m => m.id !== materialId)
    }));
    Logger.info('Material removido da turma', {
      classId,
      materialId
    });
  }, []);

  const value = useMemo(() => ({
    selectedClass,
    selectClass,
    clearSelection,
    materials,
    addMaterial,
    removeMaterial,
    trainingMaterials,
    setTrainingMaterials,
  }), [
    selectedClass,
    selectClass,
    clearSelection,
    materials,
    addMaterial,
    removeMaterial,
    trainingMaterials,
    setTrainingMaterials,
  ]);

  return (
    <ClassContext.Provider value={value}>
      {children}
    </ClassContext.Provider>
  );
};

export default ClassContext;
