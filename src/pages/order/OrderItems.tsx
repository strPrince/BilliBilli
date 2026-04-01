import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { db } from '../../db/database';
import { MASTER_ITEMS, ItemCategory } from '../../data/masterItems';
import { useLiveQuery } from 'dexie-react-hooks';
import { Search, CheckCircle2, Circle, Plus, X, Package, ChevronRight, CheckSquare, Square } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const CATEGORIES: ItemCategory[] = [
  'લોટ_અને_બેસન', 'મસાલા', 'કઠોળ_અને_દાળ', 'શાકભાજી', 'ફળ', 'ડ્રાયફ્રૂટ', 'ઘી_અને_તેલ', 'ડેરી', 'મીઠાઈ_સામગ્રી', 'વાસણો', 'ડીસ્પોઝેબલ', 'અન્ય'
];

const CATEGORY_LABELS: Record<string, string> = {
  'લોટ_અને_બેસન': 'લોટ અને બેસન',
  'મસાલા': 'મસાલા',
  'કઠોળ_અને_દાળ': 'કઠોળ અને દાળ',
  'શાકભાજી': 'શાકભાજી',
  'ફળ': 'ફળ',
  'ડ્રાયફ્રૂટ': 'ડ્રાયફ્રૂટ',
  'ઘી_અને_તેલ': 'ઘી અને તેલ',
  'ડેરી': 'ડેરી',
  'મીઠાઈ_સામગ્રી': 'મીઠાઈ સામગ્રી',
  'વાસણો': 'વાસણો',
  'ડીસ્પોઝેબલ': 'ડીસ્પોઝેબલ',
  'અન્ય': 'અન્ય',
};

export default function OrderItems() {
  const { id } = useParams();
  const navigate = useNavigate();
  const orderId = Number(id);

  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<ItemCategory>('લોટ_અને_બેસન');
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [customItem, setCustomItem] = useState({ nameGu: '', nameEn: '', category: 'અન્ય' as ItemCategory });

  const customItems = useLiveQuery(() => db.customItems.toArray()) || [];
  const existingOrderItems = useLiveQuery(() => db.orderItems.where('orderId').equals(orderId).toArray());

  useEffect(() => {
    if (existingOrderItems && existingOrderItems.length > 0) {
      setSelectedItems(new Set(existingOrderItems.map(i => i.itemKey)));
    } else {
      setSelectedItems(new Set());
    }
  }, [existingOrderItems]);

  const allItems = useMemo(() => [
    ...MASTER_ITEMS, 
    ...customItems.map(c => ({
      key: c.itemKey,
      nameGu: c.itemNameGu,
      nameEn: c.itemNameEn,
      category: c.category,
      isCustom: 1
    }))
  ], [customItems]);

  const filteredItems = useMemo(() => allItems.filter(item => {
    const matchesSearch = item.nameGu.includes(search) || item.nameEn.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = search ? true : item.category === activeCategory;
    return matchesSearch && matchesCategory;
  }), [allItems, search, activeCategory]);

  const toggleItem = (key: string) => {
    const newSet = new Set(selectedItems);
    if (newSet.has(key)) {
      newSet.delete(key);
    } else {
      newSet.add(key);
    }
    setSelectedItems(newSet);
  };

  const toggleSelectAll = () => {
    const currentKeys = filteredItems.map(i => i.key);
    const allSelected = currentKeys.every(k => selectedItems.has(k));
    
    const newSet = new Set(selectedItems);
    if (allSelected) {
      currentKeys.forEach(k => newSet.delete(k));
    } else {
      currentKeys.forEach(k => newSet.add(k));
    }
    setSelectedItems(newSet);
  };

  const handleSave = async () => {
    await db.orderItems.where('orderId').equals(orderId).delete();
    const itemsToInsert = Array.from(selectedItems).flatMap(key => {
      const itemDef = allItems.find(i => i.key === key);
      if (!itemDef) return [];

      return ['morning', 'afternoon', 'evening'].map(slot => ({
        orderId,
        itemKey: key as string,
        itemNameGu: itemDef.nameGu,
        itemNameEn: itemDef.nameEn,
        category: itemDef.category,
        timeSlot: slot as any,
        kg: 0,
        gram: 0,
        isCustom: (itemDef as any).isCustom ? 1 : 0,
        sortOrder: 0
      }));
    });

    await db.orderItems.bulkAdd(itemsToInsert);
    navigate(`/order/${orderId}/quantities`);
  };

  const handleAddCustom = async () => {
    if (!customItem.nameGu) return;
    const key = `custom_${Date.now()}`;
    await db.customItems.add({
      itemKey: key,
      itemNameGu: customItem.nameGu,
      itemNameEn: customItem.nameEn,
      category: customItem.category,
      createdAt: new Date().toISOString()
    });
    setSelectedItems(prev => new Set(prev).add(key));
    setShowCustomModal(false);
    setCustomItem({ nameGu: '', nameEn: '', category: 'અન્ય' });
  };

  const allFilteredSelected = filteredItems.length > 0 && filteredItems.every(i => selectedItems.has(i.key));

  return (
    <div className="flex flex-col bg-[#F8F9FA] min-h-full">
      {/* Sticky Header Section */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-20">
        <div className="p-4 space-y-4">
          {/* Search */}
          <div className="relative group">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#C0392B] transition-colors" />
            <input
              type="text"
              placeholder="શોધો... ઉદા: રવો"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-transparent rounded-2xl focus:bg-white focus:border-[#C0392B] focus:ring-2 focus:ring-[#C0392B]/10 outline-none transition-all text-base"
            />
          </div>

          {/* Categories */}
          {!search && (
            <div className="flex overflow-x-auto no-scrollbar -mx-4 px-4 gap-2">
              {CATEGORIES.map(cat => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={cn(
                    "px-4 py-2 rounded-xl whitespace-nowrap text-sm font-bold transition-all relative",
                    activeCategory === cat ? "text-white" : "text-gray-500 bg-gray-50 hover:bg-gray-100"
                  )}
                >
                  {activeCategory === cat && (
                    <motion.div 
                      layoutId="active-cat-order"
                      className="absolute inset-0 bg-[#C0392B] rounded-xl -z-10 shadow-lg shadow-red-900/10"
                    />
                  )}
                  {CATEGORY_LABELS[cat] || cat}
                </button>
              ))}
            </div>
          )}

          {/* Selection Controls */}
          <div className="flex items-center justify-between px-1">
            <button 
              onClick={toggleSelectAll}
              className="flex items-center gap-2 text-xs font-black text-[#C0392B] uppercase tracking-wider bg-red-50 px-3 py-1.5 rounded-full active:scale-95 transition-all"
            >
              {allFilteredSelected ? <CheckSquare size={14} /> : <Square size={14} />}
              {allFilteredSelected ? 'બધા કાઢી નાખો' : 'બધા પસંદ કરો'}
            </button>
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
              કુલ: {filteredItems.length} આઇટમ્સ
            </span>
          </div>
        </div>
      </div>

      {/* Items List */}
      <div className="p-4 space-y-3 pb-40">
        <AnimatePresence initial={false}>
          {filteredItems.map((item, idx) => {
            const isSelected = selectedItems.has(item.key);
            return (
              <motion.div 
                key={item.key}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.1, delay: Math.min(idx * 0.01, 0.1) }}
                onClick={() => toggleItem(item.key)}
                className={cn(
                  "flex items-center gap-4 p-4 rounded-2xl border-2 transition-all cursor-pointer select-none",
                  isSelected 
                    ? "border-[#C0392B] bg-white shadow-md shadow-red-900/5" 
                    : "border-gray-100 bg-white"
                )}
              >
                <div className={cn(
                  "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all",
                  isSelected ? "bg-[#C0392B] border-[#C0392B]" : "bg-white border-gray-200"
                )}>
                  {isSelected && <CheckCircle2 size={16} className="text-white" />}
                </div>
                <div className="flex-1">
                  <p className={cn("font-bold text-lg leading-tight transition-colors", isSelected ? "text-[#C0392B]" : "text-gray-800")}>
                    {item.nameGu}
                  </p>
                  <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">{item.nameEn}</p>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {filteredItems.length === 0 && (
          <div className="text-center py-20 text-gray-400">
            <Package size={48} className="mx-auto mb-3 opacity-20" />
            <p className="font-bold">કોઈ વસ્તુ મળી નથી</p>
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white border-t border-gray-100 p-4 pb-10 z-30 shadow-[0_-10px_20px_rgba(0,0,0,0.05)]">
        <div className="flex justify-between items-center mb-4 px-2">
          <div className="flex flex-col">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">પસંદ કરેલ</span>
            <span className="text-lg font-black text-[#C0392B]">{selectedItems.size} વસ્તુઓ</span>
          </div>
          <button 
            onClick={() => setShowCustomModal(true)}
            className="bg-gray-100 text-gray-700 px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-1 active:scale-95 transition-all"
          >
            <Plus size={18} /> નવી વસ્તુ
          </button>
        </div>
        <button 
          onClick={handleSave}
          disabled={selectedItems.size === 0}
          className="w-full bg-[#C0392B] disabled:bg-gray-200 disabled:text-gray-400 text-white py-5 rounded-2xl font-black text-lg shadow-xl shadow-red-900/20 flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
        >
          જથ્થો નક્કી કરો <ChevronRight size={24} />
        </button>
      </div>

      {/* Custom Item Bottom Sheet */}
      <AnimatePresence>
        {showCustomModal && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCustomModal(false)}
              className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-50"
            />
            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed inset-x-0 bottom-0 bg-white rounded-t-[32px] p-6 pt-2 z-50 shadow-2xl safe-bottom max-h-[90vh] overflow-y-auto"
            >
              <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto my-4" />
              
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-900">નવી વસ્તુ ઉમેરો</h3>
                <button
                  onClick={() => setShowCustomModal(false)}
                  className="p-2 rounded-full bg-gray-100 text-gray-500 active:scale-90 transition-all"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-6 pb-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-gray-500 ml-1">શ્રેણી</label>
                  <select 
                    className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-[#C0392B]/20 outline-none text-base appearance-none"
                    value={customItem.category}
                    onChange={e => setCustomItem({...customItem, category: e.target.value as ItemCategory})}
                  >
                    {CATEGORIES.map(c => <option key={c} value={c}>{CATEGORY_LABELS[c] || c}</option>)}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-gray-500 ml-1">ગુજરાતી નામ *</label>
                  <input 
                    type="text" 
                    placeholder="જેમ: રવો"
                    className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-[#C0392B]/20 outline-none font-bold"
                    value={customItem.nameGu}
                    onChange={e => setCustomItem({...customItem, nameGu: e.target.value})}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-gray-500 ml-1">અંગ્રેજી નામ</label>
                  <input 
                    type="text" 
                    placeholder="e.g: Semolina"
                    className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-[#C0392B]/20 outline-none"
                    value={customItem.nameEn}
                    onChange={e => setCustomItem({...customItem, nameEn: e.target.value})}
                  />
                </div>

                <div className="flex gap-4 pt-2">
                  <button 
                    onClick={() => setShowCustomModal(false)}
                    className="flex-1 py-4 bg-gray-100 text-gray-600 rounded-2xl font-bold active:scale-95 transition-all"
                  >
                    રદ કરો
                  </button>
                  <button 
                    onClick={handleAddCustom}
                    className="flex-1 py-4 bg-[#C0392B] text-white rounded-2xl font-bold shadow-lg shadow-red-900/20 active:scale-95 transition-all"
                  >
                    ઉમેરો
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
