import React from 'react';
import { Minus, Plus } from 'lucide-react';

interface QuantitySelectorProps {
  value: number;
  onChange: (value: number) => void;
  unit: 'UNIDADE' | 'KG';
  minQty: number;
  step: number;
}

export function QuantitySelector({ value, onChange, unit, minQty, step }: QuantitySelectorProps) {
  // Regra: se for KG, segue o step (múltiplos). Se for UNIDADE, o step é fixo em 1 após o mínimo.
  const actualStep = unit === 'KG' ? step : 1;

  const handleIncrease = () => onChange(value + actualStep);
  const handleDecrease = () => {
    if (value > minQty) {
      onChange(Math.max(minQty, value - actualStep));
    }
  };

  // Se for KG (Torta), vamos usar um estilo diferente, talvez botões de sugestão
  if (unit === 'KG') {
    // Sugestões baseadas no step para Tortas
    const suggestions = [step, step * 2, step * 3, step * 4, step * 5, step * 6];
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {suggestions.map((sug) => (
            <button
              key={sug}
              onClick={() => onChange(sug)}
              className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${
                value === sug 
                  ? 'bg-[var(--primary-paprica)] text-white border-[var(--primary-paprica)]'
                  : 'bg-white text-gray-400 border-orange-100 hover:border-orange-200'
              }`}
            >
              {sug < 1000 ? `${sug}g` : `${sug / 1000}kg`}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-4 bg-orange-50 p-4 rounded-xl border border-orange-100">
           <span className="text-xs font-bold uppercase tracking-widest text-orange-900/40 flex-1">Peso Total</span>
           <div className="flex items-center gap-4">
              <button 
                onClick={handleDecrease}
                className="w-8 h-8 rounded-full bg-white border border-orange-200 flex items-center justify-center text-[var(--primary-paprica)] shadow-sm"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="text-lg font-black text-[var(--primary-dark)] min-w-[60px] text-center">
                {value < 1000 ? `${value}g` : `${value / 1000}kg`}
              </span>
              <button 
                onClick={handleIncrease}
                className="w-8 h-8 rounded-full bg-white border border-orange-200 flex items-center justify-center text-[var(--primary-paprica)] shadow-sm"
              >
                <Plus className="w-4 h-4" />
              </button>
           </div>
        </div>
      </div>
    );
  }

  // Se for UNIDADE (Salgados/Doces)
  return (
    <div className="flex items-center gap-4 bg-orange-50 p-4 rounded-xl border border-orange-100">
      <div className="flex-1">
        <span className="text-xs font-bold uppercase tracking-widest text-orange-900/40 block mb-1">Quantidade</span>
        <span className="text-[10px] font-bold text-orange-800">Mínimo: {minQty} unid</span>
      </div>
      <div className="flex items-center gap-4">
        <button 
          onClick={handleDecrease}
          disabled={value <= minQty}
          className="w-10 h-10 rounded-full bg-white border border-orange-200 flex items-center justify-center text-[var(--primary-paprica)] shadow-sm disabled:opacity-30 disabled:grayscale transition-all"
        >
          <Minus className="w-5 h-5" />
        </button>
        <span className="text-xl font-black text-[var(--primary-dark)] min-w-[40px] text-center">
          {value}
        </span>
        <button 
          onClick={handleIncrease}
          className="w-10 h-10 rounded-full bg-white border border-orange-200 flex items-center justify-center text-[var(--primary-paprica)] shadow-sm active:scale-90"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
