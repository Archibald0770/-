import React from 'react';
import { Drug } from '../types';

interface InventorySidebarProps {
  inventory: Drug[];
}

export const InventorySidebar: React.FC<InventorySidebarProps> = ({ inventory }) => {
  // Sort alphabetically
  const sortedInventory = [...inventory].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="bg-white rounded-lg shadow border border-slate-200 overflow-hidden h-fit sticky top-4">
      <div className="bg-slate-50 px-4 py-3 border-b border-slate-200">
        <h2 className="text-lg font-semibold text-slate-800">Склад аптеки</h2>
        <p className="text-xs text-slate-500">Текущие остатки и требования</p>
      </div>
      <div className="divide-y divide-slate-100 max-h-[calc(100vh-12rem)] overflow-y-auto">
        {sortedInventory.map((drug) => (
          <div key={drug.id} className="p-3 hover:bg-slate-50 transition-colors">
            <div className="flex justify-between items-start mb-1">
              <span className="font-medium text-slate-700">{drug.name}</span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                drug.stock < 10 ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'
              }`}>
                {drug.stock} шт.
              </span>
            </div>
            <div className="flex items-center gap-2">
              {drug.requiresPrescription ? (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-100 text-amber-800 border border-amber-200">
                  По рецепту
                </span>
              ) : (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                  Без рецепта
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};