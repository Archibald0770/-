import React, { useState } from 'react';
import { Order, OrderItem, Drug } from '../types';
import { Button } from './Button';

interface OrderCardProps {
  order: Order;
  inventory: Drug[];
  otherOrders: Order[]; // For moving items
  onDeleteOrder: (orderId: string) => void;
  onAddItem: (orderId: string, drugId: string, quantity: number) => Promise<boolean>; // Returns success
  onRemoveItem: (orderId: string, itemId: string) => void;
  onMoveItem: (itemId: string, sourceOrderId: string, targetOrderId: string) => void;
  onUpdateQuantity: (orderId: string, itemId: string, delta: number) => void;
}

export const OrderCard: React.FC<OrderCardProps> = ({
  order,
  inventory,
  otherOrders,
  onDeleteOrder,
  onAddItem,
  onRemoveItem,
  onMoveItem,
  onUpdateQuantity,
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [selectedDrug, setSelectedDrug] = useState(inventory[0]?.id || '');
  const [quantity, setQuantity] = useState(1);
  const [error, setError] = useState<string | null>(null);

  const getDrugName = (id: string) => inventory.find(d => d.id === id)?.name || 'Неизвестный препарат';

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const success = await onAddItem(order.id, selectedDrug, quantity);
    if (success) {
      setIsAdding(false);
      setQuantity(1);
    }
  };

  const hasRx = order.prescriptionForDrugIds && order.prescriptionForDrugIds.length > 0;

  return (
    <div className="bg-white rounded-lg shadow border border-slate-200 flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-slate-100 bg-slate-50 rounded-t-lg">
        <div className="flex justify-between items-start mb-2">
          <div>
            <h3 className="font-bold text-slate-800 text-lg">{order.customerName}</h3>
            <p className="text-xs text-slate-500 font-mono">ID: {order.id}</p>
          </div>
          <div className="text-right">
             <div className="text-sm font-medium text-slate-700 bg-white border px-2 py-1 rounded">
               {new Date(order.orderDate).toLocaleDateString('ru-RU')}
             </div>
          </div>
        </div>
        
        {/* Prescription Status */}
        <div className="mt-2 text-sm">
          <span className="text-slate-500 block mb-1">Рецепты: </span>
          {hasRx ? (
            <div className="flex flex-wrap gap-1">
              {order.prescriptionForDrugIds.map(rxId => (
                <span key={rxId} className="font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100 text-xs">
                  {getDrugName(rxId)}
                </span>
              ))}
            </div>
          ) : (
            <span className="font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 text-xs">
              Не предоставлены
            </span>
          )}
        </div>
      </div>

      {/* Items List */}
      <div className="p-4 flex-grow space-y-3">
        {order.items.length === 0 ? (
          <p className="text-sm text-slate-400 italic text-center py-4">Нет позиций в заказе.</p>
        ) : (
          order.items.map((item) => (
            <div key={item.id} className="flex flex-col sm:flex-row sm:items-center justify-between bg-slate-50 p-2 rounded border border-slate-100 gap-2">
              <div className="flex-1">
                <div className="font-medium text-sm text-slate-700">{getDrugName(item.drugId)}</div>
                <div className="text-xs text-slate-500 flex items-center gap-2 mt-1">
                   <span>Кол-во: {item.quantity}</span>
                   <div className="flex gap-1">
                     <button 
                       onClick={() => onUpdateQuantity(order.id, item.id, -1)}
                       className="w-5 h-5 flex items-center justify-center bg-white border border-slate-300 rounded hover:bg-slate-100 text-slate-600 font-bold"
                     >
                       -
                     </button>
                     <button 
                       onClick={() => onUpdateQuantity(order.id, item.id, 1)}
                       className="w-5 h-5 flex items-center justify-center bg-white border border-slate-300 rounded hover:bg-slate-100 text-slate-600 font-bold"
                     >
                       +
                     </button>
                   </div>
                </div>
              </div>
              
              <div className="flex items-center gap-1">
                {otherOrders.length > 0 && (
                  <select 
                    className="text-[10px] border border-slate-300 rounded bg-white text-slate-900 py-1 px-1 w-28"
                    onChange={(e) => {
                      if(e.target.value) {
                        onMoveItem(item.id, order.id, e.target.value);
                        e.target.value = ""; // Reset
                      }
                    }}
                    value=""
                  >
                    <option value="" disabled>Переместить...</option>
                    {otherOrders.map(o => (
                      <option key={o.id} value={o.id}>{o.customerName}</option>
                    ))}
                  </select>
                )}
                <button 
                  onClick={() => onRemoveItem(order.id, item.id)}
                  className="text-red-500 hover:text-red-700 p-1"
                  title="Удалить позицию"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Item Form */}
      {isAdding ? (
        <form onSubmit={handleAddSubmit} className="p-4 bg-slate-50 border-t border-slate-200">
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Препарат</label>
              <select 
                value={selectedDrug}
                onChange={(e) => setSelectedDrug(e.target.value)}
                className="w-full text-sm bg-white text-slate-900 border-slate-300 rounded-md shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
              >
                {[...inventory].sort((a,b) => a.name.localeCompare(b.name)).map(d => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.stock} на складе)
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Количество</label>
              <input 
                type="number" 
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value))}
                className="w-full text-sm bg-white text-slate-900 border-slate-300 rounded-md shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsAdding(false)}>Отмена</Button>
              <Button type="submit" size="sm">Добавить</Button>
            </div>
          </div>
        </form>
      ) : (
        <div className="p-4 pt-2 flex gap-2 border-t border-slate-100">
          <Button onClick={() => setIsAdding(true)} variant="secondary" size="sm" className="flex-1">
            + Добавить
          </Button>
          <Button onClick={() => onDeleteOrder(order.id)} variant="danger" size="sm">
            Удалить
          </Button>
        </div>
      )}
    </div>
  );
};