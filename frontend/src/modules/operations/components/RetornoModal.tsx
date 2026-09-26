import React from 'react';
import type { Contract } from '../services/operations.api';
import { RetornoForm } from './RetornoForm';

interface RetornoModalProps {
  contract: Contract;
  onClose: () => void;
  onSuccess: (createdRetorno?: any) => void;
}

export const RetornoModal: React.FC<RetornoModalProps> = ({ contract, onClose, onSuccess }) => (
  <div className="fixed inset-0 z-50 bg-[#37474F]/60 p-4 overflow-y-auto" role="dialog" aria-modal="true" aria-label="Recepción de equipos">
    <RetornoForm contract={contract} onBack={onClose} onSuccess={onSuccess} />
  </div>
);
