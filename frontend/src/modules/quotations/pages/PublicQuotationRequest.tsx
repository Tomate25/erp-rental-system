import React, { useState } from 'react';
import { submitPublicQuotation } from '../services/quotations.api';
import { Building2, Send, CheckCircle } from 'lucide-react';
import { EstadoCotizacionValues } from '../types/quotation.types';

export const PublicQuotationRequest: React.FC = () => {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    telefono: '',
    empresa: '',
    proyecto: '',
    detalles: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      // In a real scenario, this endpoint creates a lead or a quotation with a dummy client,
      // or directly ties to an existing client based on email.
      // We will send a basic quotation creation request.
      await submitPublicQuotation({
        atencion: formData.nombre,
        email: formData.email,
        telefono: formData.telefono,
        proyecto: formData.proyecto,
        condiciones: `Empresa: ${formData.empresa}\nDetalles: ${formData.detalles}`,
        estado: EstadoCotizacionValues.PENDIENTE,
        clienteId: '123e4567-e89b-12d3-a456-426614174000', // Mock/Default Guest Client ID
        subtotal: 0,
        iva: 0,
        total: 0,
        validezDias: 15,
        descuento: 0,
        items: [
          {
            descripcion: `Solicitud en línea: ${formData.detalles.substring(0, 50)}...`,
            cantidad: 1,
            dias: 1,
            precioUnitario: 0,
            descuento: 0,
            subtotal: 0,
          }
        ]
      });
      setIsSubmitted(true);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al enviar la solicitud. Por favor intenta de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 animate-fadeIn">
        <div className="max-w-md w-full bg-white p-8 rounded-3xl shadow-xl border border-slate-100 text-center space-y-4">
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto text-emerald-600 mb-6">
            <CheckCircle className="w-10 h-10" />
          </div>
          <h2 className="text-2xl font-black text-slate-900">¡Solicitud Recibida!</h2>
          <p className="text-slate-500 text-sm leading-relaxed">
            Hemos recibido tu solicitud de cotización exitosamente. Uno de nuestros asesores comerciales se pondrá en contacto contigo pronto.
          </p>
          <div className="pt-6">
            <a href="/" className="inline-block text-blue-600 font-bold text-sm hover:underline">Volver al inicio</a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 md:p-8 animate-fadeIn">
      <div className="max-w-4xl w-full bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row">
        
        {/* Left Side - Info */}
        <div className="w-full md:w-5/12 bg-blue-600 p-8 md:p-12 text-white flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-12">
              <Building2 className="w-8 h-8 text-blue-300" />
              <h1 className="text-2xl font-black tracking-tight">BM <span className="text-blue-300">CONSTRUCCIONES</span></h1>
            </div>
            <h2 className="text-3xl font-black mb-4">Solicita tu Cotización en Línea</h2>
            <p className="text-blue-100 text-sm leading-relaxed mb-8">
              Cuéntanos qué maquinaria o equipo necesitas para tu proyecto. Nuestro equipo te enviará un presupuesto detallado a la brevedad.
            </p>
          </div>
          
          <div className="space-y-4 text-xs font-medium text-blue-200">
            <p>✓ Respuesta en menos de 24 horas</p>
            <p>✓ Asesoría técnica especializada</p>
            <p>✓ Equipos de última generación</p>
          </div>
        </div>

        {/* Right Side - Form */}
        <div className="w-full md:w-7/12 p-8 md:p-12">
          {error && (
            <div className="mb-6 p-4 bg-red-50 text-red-700 text-sm font-bold rounded-xl border border-red-200">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Nombre Completo *</label>
                <input 
                  required type="text" name="nombre" value={formData.nombre} onChange={handleChange}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Empresa</label>
                <input 
                  type="text" name="empresa" value={formData.empresa} onChange={handleChange}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Email *</label>
                <input 
                  required type="email" name="email" value={formData.email} onChange={handleChange}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Teléfono *</label>
                <input 
                  required type="text" name="telefono" value={formData.telefono} onChange={handleChange}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Nombre del Proyecto o Ubicación</label>
              <input 
                type="text" name="proyecto" value={formData.proyecto} onChange={handleChange}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">¿Qué equipos necesitas? *</label>
              <textarea 
                required rows={4} name="detalles" value={formData.detalles} onChange={handleChange}
                placeholder="Por favor descríbenos qué equipos necesitas y por cuánto tiempo..."
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none resize-none"
              />
            </div>

            <button 
              type="submit" disabled={isLoading}
              className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-black text-sm rounded-xl shadow-lg shadow-blue-500/30 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <>
                  <Send className="w-5 h-5" /> Enviar Solicitud
                </>
              )}
            </button>
          </form>
        </div>

      </div>
    </div>
  );
};
