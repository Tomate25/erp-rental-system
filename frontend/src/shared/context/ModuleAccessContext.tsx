import React, { createContext, useContext } from 'react';
import type { ModuleAccessLevel } from '../constants/modules';

interface ModuleAccessContextValue {
  moduleId: string | null;
  level: ModuleAccessLevel;
  canRead: boolean;
  canWrite: boolean;
  isReadOnly: boolean;
}

const ModuleAccessContext = createContext<ModuleAccessContextValue>({
  moduleId: null,
  level: 'ESCRITURA',
  canRead: true,
  canWrite: true,
  isReadOnly: false,
});

export const ModuleAccessProvider: React.FC<{
  moduleId: string | null;
  level: ModuleAccessLevel;
  children: React.ReactNode;
}> = ({ moduleId, level, children }) => {
  const value: ModuleAccessContextValue = {
    moduleId,
    level,
    canRead: level === 'LECTURA' || level === 'ESCRITURA',
    canWrite: level === 'ESCRITURA',
    isReadOnly: level === 'LECTURA',
  };

  return (
    <ModuleAccessContext.Provider value={value}>
      {children}
    </ModuleAccessContext.Provider>
  );
};

export function useModuleAccess(): ModuleAccessContextValue {
  return useContext(ModuleAccessContext);
}
