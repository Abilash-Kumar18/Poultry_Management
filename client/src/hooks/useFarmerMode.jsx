import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const FarmerModeContext = createContext(null);

export function FarmerModeProvider({ children }) {
  const [isFarmerMode, setIsFarmerMode] = useState(() => {
    try {
      const stored = localStorage.getItem('farm_mode');
      return stored === 'true';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('farm_mode', isFarmerMode ? 'true' : 'false');
      if (isFarmerMode) {
        document.documentElement.classList.add('farmer-mode');
      } else {
        document.documentElement.classList.remove('farmer-mode');
      }
    } catch (err) {
      console.error('Failed to update localStorage or document class for farmer-mode:', err);
    }
  }, [isFarmerMode]);

  const toggleFarmerMode = useCallback(() => {
    setIsFarmerMode(prev => !prev);
  }, []);

  return (
    <FarmerModeContext.Provider value={{ isFarmerMode, toggleFarmerMode, setIsFarmerMode }}>
      {children}
    </FarmerModeContext.Provider>
  );
}

export const useFarmerMode = () => {
  const ctx = useContext(FarmerModeContext);
  if (!ctx) throw new Error('useFarmerMode must be used within FarmerModeProvider');
  return ctx;
};
