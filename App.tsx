import React, { useState, useEffect, useCallback } from 'react';
import { Drug, Order } from './types';
import { InventorySidebar } from './components/InventorySidebar';
import { OrderCard } from './components/OrderCard';
import { Button } from './components/Button';

// Helper for unique IDs
const generateId = () => Math.random().toString(36).substr(2, 9);
const API_URL = 'http://localhost:3001/api';

const App: React.FC = () => {
  // --- State ---
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [inventory, setInventory] = useState<Drug[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // New Order Form State
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);
  const [newOrderCustomer, setNewOrderCustomer] = useState('');
  const [newOrderDate, setNewOrderDate] = useState('');
  
  // Prescription Logic State
  const [hasPrescription, setHasPrescription] = useState(false);
  const [newOrderRxIds, setNewOrderRxIds] = useState<string[]>([]);
  const [rxSearchQuery, setRxSearchQuery] = useState('');
  const [isRxDropdownOpen, setIsRxDropdownOpen] = useState(false);
  
  // --- Effects ---

  const fetchData = useCallback(async () => {
    try {
      const [inventoryRes, ordersRes] = await Promise.all([
        fetch(`${API_URL}/inventory`),
        fetch(`${API_URL}/orders`)
      ]);
      const inventoryData = await inventoryRes.json();
      const ordersData = await ordersRes.json();
      
      setInventory(inventoryData);
      setOrders(ordersData);
      setIsLoading(false);
    } catch (error) {
      console.error("Failed to fetch data:", error);
      alert("Ошибка подключения к серверу. Убедитесь, что сервер запущен (node server.js)");
    }
  }, []);

  // On Mount: Load initial logic
  useEffect(() => {
    const today = new Date();
    today.setHours(0,0,0,0);
    setCurrentDate(today);
    fetchData();
  }, [fetchData]);

  // --- Logic Helpers ---

  // Calculate local date string (YYYY-MM-DD)
  const getLocalDateString = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Simulate Next Day
  const handleNextDay = async () => {
    try {
      const nextDay = new Date(currentDate);
      nextDay.setDate(nextDay.getDate() + 1);
      
      const nextDayStr = getLocalDateString(nextDay);
      
      await fetch(`${API_URL}/simulation/next-day`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentDateStr: nextDayStr })
      });

      // Update local date
      setCurrentDate(nextDay);
      
      // Refresh data
      fetchData();
    } catch (e) {
      alert("Ошибка симуляции");
    }
  };

  // Add Order
  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const selectedDate = new Date(newOrderDate);
    selectedDate.setHours(0,0,0,0);
    const today = new Date(currentDate);
    today.setHours(0,0,0,0);

    // Validation: Date cannot be less than current date
    if (selectedDate.getTime() < today.getTime()) {
      alert("Ошибка: Дата заказа не может быть в прошлом.");
      return;
    }

    const finalRxIds = hasPrescription ? newOrderRxIds : [];
    const newOrder = {
      id: generateId(),
      customerName: newOrderCustomer,
      orderDate: newOrderDate,
      prescriptionForDrugIds: finalRxIds,
    };

    try {
      const res = await fetch(`${API_URL}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newOrder)
      });
      
      if (res.ok) {
        setIsCreatingOrder(false);
        setNewOrderCustomer('');
        setNewOrderDate('');
        setNewOrderRxIds([]);
        setHasPrescription(false);
        setRxSearchQuery('');
        fetchData();
      }
    } catch (e) {
      alert("Ошибка создания заказа");
    }
  };

  // Delete Order
  const handleDeleteOrder = async (orderId: string) => {
    try {
      await fetch(`${API_URL}/orders/${orderId}`, { method: 'DELETE' });
      fetchData();
    } catch (e) {
      alert("Ошибка удаления");
    }
  };

  // Add Item to Order
  const handleAddItem = async (orderId: string, drugId: string, quantity: number): Promise<boolean> => {
    try {
      const res = await fetch(`${API_URL}/orders/${orderId}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ drugId, quantity })
      });

      const data = await res.json();
      
      if (!res.ok) {
        alert(data.error || "Ошибка добавления товара");
        return false;
      }

      fetchData();
      return true;
    } catch (e) {
      alert("Ошибка сети");
      return false;
    }
  };

  // Update Item Quantity (+ or -)
  const handleUpdateQuantity = async (orderId: string, itemId: string, delta: number) => {
    try {
      const res = await fetch(`${API_URL}/orders/${orderId}/items/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ delta })
      });
      
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Ошибка обновления количества");
      }
      fetchData();
    } catch(e) {
      alert("Ошибка сети");
    }
  };

  // Remove Item from Order
  const handleRemoveItem = async (orderId: string, itemId: string) => {
    try {
      await fetch(`${API_URL}/orders/${orderId}/items/${itemId}`, { method: 'DELETE' });
      fetchData();
    } catch (e) {
      alert("Ошибка удаления товара");
    }
  };

  // Move Item
  const handleMoveItem = async (itemId: string, sourceOrderId: string, targetOrderId: string) => {
    try {
      const res = await fetch(`${API_URL}/move-item`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId, sourceOrderId, targetOrderId })
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Ошибка перемещения");
        return;
      }
      fetchData();
    } catch (e) {
      alert("Ошибка сети");
    }
  };

  const dateInputString = getLocalDateString(currentDate);

  const toggleRxSelection = (id: string) => {
    if (newOrderRxIds.includes(id)) {
      setNewOrderRxIds(newOrderRxIds.filter(rxId => rxId !== id));
    } else {
      setNewOrderRxIds([...newOrderRxIds, id]);
    }
  };

  const handlePrescriptionToggle = () => {
    const newState = !hasPrescription;
    setHasPrescription(newState);
    if (!newState) {
      setNewOrderRxIds([]);
      setRxSearchQuery('');
      setIsRxDropdownOpen(false);
    }
  };

  const filteredRxDrugs = inventory
    .filter(d => d.requiresPrescription)
    .filter(d => d.name.toLowerCase().includes(rxSearchQuery.toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name));

  const getDrugName = (id: string) => inventory.find(d => d.id === id)?.name;

  if (isLoading && inventory.length === 0) {
    return <div className="min-h-screen flex items-center justify-center text-slate-500">Загрузка данных с сервера...</div>;
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top Bar */}
      <header className="bg-emerald-700 text-white shadow-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            {/* White Circle with Green Plus */}
            <div className="bg-white rounded-full w-10 h-10 flex items-center justify-center shadow-sm">
               <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" />
               </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">Алгоритм-λ</h1>
              <p className="text-emerald-200 text-xs">Система управления заказами</p>
            </div>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="text-right">
              <p className="text-xs text-emerald-200 uppercase font-semibold">Текущая дата симуляции</p>
              <p className="text-lg font-mono font-bold">{currentDate.toLocaleDateString('ru-RU')}</p>
            </div>
            <button 
              onClick={handleNextDay}
              className="bg-white text-slate-900 hover:bg-emerald-50 px-4 py-2 rounded-lg font-semibold shadow transition-all active:scale-95 flex items-center gap-2"
            >
              <span>Следующий день</span>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow max-w-7xl mx-auto w-full px-4 py-8 grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* Left: Inventory */}
        <aside className="lg:col-span-1">
          <InventorySidebar inventory={inventory} />
        </aside>

        {/* Right: Orders */}
        <section className="lg:col-span-3 space-y-6">
          <div className="flex justify-between items-center bg-white p-4 rounded-lg shadow-sm border border-slate-200">
            <h2 className="text-xl font-bold text-slate-800">Активные заказы</h2>
            <Button onClick={() => setIsCreatingOrder(true)}>+ Новый заказ</Button>
          </div>

          {/* New Order Form (Collapsible) */}
          {isCreatingOrder && (
            <div className="bg-white p-6 rounded-lg shadow border-l-4 border-emerald-500 animate-fade-in relative z-10">
              <h3 className="text-lg font-semibold mb-4 text-slate-800">Создать новый заказ</h3>
              <form onSubmit={handleCreateOrder} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">ФИО клиента</label>
                  <input
                    required
                    type="text"
                    value={newOrderCustomer}
                    onChange={(e) => setNewOrderCustomer(e.target.value)}
                    className="w-full bg-white text-slate-900 border-slate-300 rounded-md shadow-sm focus:border-emerald-500 focus:ring-emerald-500 p-2 border"
                    placeholder="Введите полное имя"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Дата заказа</label>
                  <input
                    required
                    type="date"
                    min={dateInputString}
                    value={newOrderDate}
                    onChange={(e) => setNewOrderDate(e.target.value)}
                    className="w-full bg-white text-slate-900 border-slate-300 rounded-md shadow-sm focus:border-emerald-500 focus:ring-emerald-500 p-2 border [color-scheme:light] cursor-pointer"
                  />
                  <p className="text-xs text-slate-500 mt-1">Должна быть {currentDate.toLocaleDateString('ru-RU')} или позже.</p>
                </div>
                
                {/* Prescription Section */}
                <div className="md:col-span-2 border-t border-slate-100 pt-4 mt-2">
                   <div className="flex items-center justify-between mb-3">
                     <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                       <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-emerald-600" viewBox="0 0 20 20" fill="currentColor">
                         <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
                       </svg>
                       Предоставлен рецепт?
                     </label>
                     <button
                        type="button"
                        onClick={handlePrescriptionToggle}
                        className={`${hasPrescription ? 'bg-emerald-600' : 'bg-slate-200'} relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2`}
                      >
                        <span className={`${hasPrescription ? 'translate-x-5' : 'translate-x-0'} pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`} />
                      </button>
                   </div>

                   {!hasPrescription ? (
                     <div className="bg-red-50 border border-red-200 rounded-md p-3 flex items-start gap-3">
                       <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-600 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                         <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                       </svg>
                       <div>
                         <p className="text-sm font-bold text-red-800">Продажа рецептурных препаратов запрещена!</p>
                         <p className="text-xs text-red-600 mt-0.5">Без подтвержденного рецепта вы не сможете добавить рецептурные препараты в этот заказ.</p>
                       </div>
                     </div>
                   ) : (
                     <div className="relative">
                       <label className="block text-xs font-medium text-slate-700 mb-1">Выберите препараты из рецепта</label>
                       
                       {/* Search Input */}
                       <div className="relative">
                         <input
                           type="text"
                           value={rxSearchQuery}
                           onChange={(e) => setRxSearchQuery(e.target.value)}
                           onFocus={() => setIsRxDropdownOpen(true)}
                           placeholder="Поиск по названию (нажмите для выбора)..."
                           className="w-full bg-white text-slate-900 border-slate-300 rounded-md shadow-sm focus:border-emerald-500 focus:ring-emerald-500 p-2 pl-9 border"
                         />
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-400 absolute left-2 top-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                         </svg>
                       </div>

                       {/* Tags for selected items */}
                       {newOrderRxIds.length > 0 && (
                         <div className="flex flex-wrap gap-2 mt-2 mb-1">
                           {newOrderRxIds.map(id => (
                             <span key={id} className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-emerald-100 text-emerald-800">
                               {getDrugName(id)}
                               <button 
                                 type="button" 
                                 onClick={() => toggleRxSelection(id)}
                                 className="ml-1.5 hover:text-emerald-900"
                               >
                                 &times;
                               </button>
                             </span>
                           ))}
                         </div>
                       )}

                       {/* Dropdown List */}
                       {isRxDropdownOpen && (
                         <>
                           <div className="fixed inset-0 z-10" onClick={() => setIsRxDropdownOpen(false)}></div>
                           <div className="absolute z-20 mt-1 w-full bg-white shadow-xl rounded-md border border-slate-200 max-h-60 overflow-y-auto">
                             {filteredRxDrugs.length === 0 ? (
                               <div className="p-3 text-sm text-slate-500 text-center">Препараты не найдены</div>
                             ) : (
                               filteredRxDrugs.map(d => (
                                 <label key={d.id} className="flex items-center gap-3 px-4 py-2 hover:bg-slate-50 cursor-pointer border-b border-slate-50 last:border-none">
                                   <input
                                     type="checkbox"
                                     checked={newOrderRxIds.includes(d.id)}
                                     onChange={() => toggleRxSelection(d.id)}
                                     className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-slate-300 rounded"
                                   />
                                   <div>
                                     <div className="text-sm font-medium text-slate-900">{d.name}</div>
                                     <div className="text-xs text-slate-500">Остаток: {d.stock}</div>
                                   </div>
                                 </label>
                               ))
                             )}
                           </div>
                         </>
                       )}
                     </div>
                   )}
                </div>

                <div className="md:col-span-2 flex justify-end gap-3 mt-4">
                  <Button type="button" variant="outline" onClick={() => setIsCreatingOrder(false)}>Отмена</Button>
                  <Button type="submit">Создать заказ</Button>
                </div>
              </form>
            </div>
          )}

          {/* Orders Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {orders.length === 0 ? (
              <div className="col-span-full text-center py-12 bg-white rounded-lg border border-dashed border-slate-300">
                <p className="text-slate-400">Активных заказов нет.</p>
                <p className="text-slate-400 text-sm mt-1">Создайте заказ, чтобы начать работу.</p>
              </div>
            ) : (
              orders.map(order => (
                <OrderCard 
                  key={order.id}
                  order={order}
                  inventory={inventory}
                  otherOrders={orders.filter(o => o.id !== order.id)}
                  onDeleteOrder={handleDeleteOrder}
                  onAddItem={handleAddItem}
                  onRemoveItem={handleRemoveItem}
                  onMoveItem={handleMoveItem}
                  onUpdateQuantity={handleUpdateQuantity}
                />
              ))
            )}
          </div>
        </section>
      </main>
    </div>
  );
};

export default App;