import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { db } from '../../db/database';
import { MASTER_ITEMS, ItemCategory } from '../../data/masterItems';
import { useLiveQuery } from 'dexie-react-hooks';
import { useCustomItems } from '../../hooks/useCustomItems';
import { Search, CheckCircle2, Circle, Plus, X, Package, ChevronRight, CheckSquare, Square, Trash2 } from 'lucide-react';
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

interface SelectedItemData {
  key: string;
  nameGu: string;
  nameEn: string;
  category: ItemCategory;
  isCustom: number;
  kg: number;
  gram: number;
}

export default function OrderItems() {
  const { id } = useParams();
  const navigate = useNavigate();
  const orderId = Number(id);

  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<ItemCategory>('લોટ_અને_બેસન');
  const [selectedItemsData, setSelectedItemsData] = useState<Map<string, SelectedItemData>>(new Map());
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [customItem, setCustomItem] = useState({ nameGu: '', nameEn: '', category: 'અન્ય' as ItemCategory });
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const customItems = useCustomItems();
  const existingOrderItems = useLiveQuery(() => db.orderItems.where('orderId').equals(orderId).toArray());

  useEffect(() => {
    if (existingOrderItems && existingOrderItems.length > 0) {
      const itemsMap = new Map<string, SelectedItemData>();
      const itemsByKey = new Map<string, typeof existingOrderItems>();
      
      existingOrderItems.forEach(item => {
        if (!itemsByKey.has(item.itemKey)) {
          itemsByKey.set(item.itemKey, []);
        }
        itemsByKey.get(item.itemKey)!.push(item);
      });

      itemsByKey.forEach((items, key) => {
        const first = items[0];
        itemsMap.set(key, {
          key,
          nameGu: first.itemNameGu,
          nameEn: first.itemNameEn,
          category: first.category,
          isCustom: first.isCustom,
          kg: first.kg,
          gram: first.gram
        });
      });

      setSelectedItemsData(itemsMap);
      setExpandedItems(new Set(itemsMap.keys()));
    } else {
      setSelectedItemsData(new Map());
    }
  }, [existingOrderItems]);

  const allItems = useMemo(() => {
    // Deduplicate custom items by key (latest entry wins), then let custom override master.
    const customByKey = new Map<string, (typeof customItems)[number]>();
    customItems.forEach((item) => {
      customByKey.set(item.itemKey, item);
    });

    const overriddenKeys = new Set(customByKey.keys());

    const masterList = MASTER_ITEMS
      .filter((item) => !overriddenKeys.has(item.key))
      .map((item) => ({
        key: item.key,
        nameGu: item.nameGu,
        nameEn: item.nameEn,
        category: item.category,
        isCustom: 0,
      }));

    const customList = Array.from(customByKey.values()).map((item) => ({
      key: item.itemKey,
      nameGu: item.itemNameGu,
      nameEn: item.itemNameEn,
      category: item.category,
      isCustom: 1,
    }));

    return [...masterList, ...customList];
  }, [customItems]);

  const filteredItems = useMemo(() => allItems.filter((item: any) => {
    const matchesSearch = item.nameGu.includes(search) || item.nameEn.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = search ? true : item.category === activeCategory;
    return matchesSearch && matchesCategory;
  }), [allItems, search, activeCategory]);

  const toggleItem = (key: string, itemDef: (typeof allItems)[0]) => {
    const newMap = new Map(selectedItemsData);
    if (newMap.has(key)) {
      newMap.delete(key);
    } else {
      newMap.set(key, {
        key,
        nameGu: itemDef.nameGu,
        nameEn: itemDef.nameEn,
        category: itemDef.category,
        isCustom: itemDef.isCustom,
        kg: 0,
        gram: 0
      });
    }
    setSelectedItemsData(newMap);
  };

  const updateQuantity = (itemKey: string, type: 'kg' | 'gram', value: number) => {
    const newMap = new Map(selectedItemsData);
    const item = newMap.get(itemKey);
    if (item) {
      item[type] = value;
      setSelectedItemsData(newMap);
    }
  };

  const toggleSelectAll = () => {
    const currentKeys = filteredItems.map((i: any) => i.key);
    const allSelected = currentKeys.every((k: string) => selectedItemsData.has(k));
    
    const newMap = new Map(selectedItemsData);
    if (allSelected) {
      currentKeys.forEach((k: string) => newMap.delete(k));
    } else {
      currentKeys.forEach((k: string) => {
        if (!newMap.has(k)) {
          const item = filteredItems.find((i: any) => i.key === k)!;
          newMap.set(k, {
            key: k,
            nameGu: item.nameGu,
            nameEn: item.nameEn,
            category: item.category,
            isCustom: item.isCustom,
            kg: 0,
            gram: 0
          });
        }
      });
    }
    setSelectedItemsData(newMap);
  };

  const handleSave = async () => {
    await db.orderItems.where('orderId').equals(orderId).delete();
    const itemsToInsert: any[] = [];

    selectedItemsData.forEach((itemData: SelectedItemData) => {
      itemsToInsert.push({
        orderId,
        itemKey: itemData.key,
        itemNameGu: itemData.nameGu,
        itemNameEn: itemData.nameEn,
        category: itemData.category,
        timeSlot: 'morning',
        kg: itemData.kg,
        gram: itemData.gram,
        isCustom: itemData.isCustom,
        sortOrder: 0
      });
    });

    if (itemsToInsert.length > 0) {
      await db.orderItems.bulkAdd(itemsToInsert);
    }
    navigate(`/order/${orderId}/review`);
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
    
    const newMap = new Map(selectedItemsData);
    newMap.set(key, {
      key,
      nameGu: customItem.nameGu,
      nameEn: customItem.nameEn,
      category: customItem.category as ItemCategory,
      isCustom: 1,
      kg: 0,
      gram: 0
    });
    setSelectedItemsData(newMap);
    setExpandedItems(new Set(newMap.keys()));
    setShowCustomModal(false);
    setCustomItem({ nameGu: '', nameEn: '', category: 'અન્ય' });
  };

  const allFilteredSelected = filteredItems.length > 0 && filteredItems.every((i: any) => selectedItemsData.has(i.key));

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
              onChange={(e: any) => setSearch(e.target.value)}
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
          {filteredItems.map((item: any, idx: number) => {
            const isSelected = selectedItemsData.has(item.key);
            return (
              <motion.div 
                key={item.key}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.1, delay: Math.min(idx * 0.01, 0.1) }}
                className={cn(
                  "rounded-2xl border-2 transition-all",
                  isSelected 
                    ? "border-[#C0392B] bg-white shadow-md shadow-red-900/5" 
                    : "border-gray-100 bg-white"
                )}
              >
                <button 
                  onClick={() => toggleItem(item.key, item)}
                  className="w-full flex items-center gap-3 p-4 select-none"
                >
                  <div className={cn(
                    "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all flex-shrink-0",
                    isSelected ? "bg-[#C0392B] border-[#C0392B]" : "bg-white border-gray-200"
                  )}>
                    {isSelected && <CheckCircle2 size={16} className="text-white" />}
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <p className={cn("font-bold text-base leading-tight transition-colors", isSelected ? "text-[#C0392B]" : "text-gray-800")}>
                      {item.nameGu}
                    </p>
                    <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">{item.nameEn}</p>
                  </div>

                  {/* Inline Quantity Inputs */}
                  {isSelected && (
                    <div className="flex items-end gap-2 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                      <div className="w-16">
                        <input
                          type="number"
                          min="0"
                          step="0.1"
                          placeholder="0"
                          value={selectedItemsData.get(item.key)?.kg || ''}
                          onChange={(e) => updateQuantity(item.key, 'kg', parseFloat(e.target.value) || 0)}
                          className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:border-[#C0392B] focus:ring-1 focus:ring-[#C0392B]/20 outline-none text-center font-bold text-sm text-gray-900 transition-all"
                        />
                        <span className="text-[7px] font-black text-gray-400 block text-center mt-0.5">કિલો</span>
                      </div>
                      <div className="w-16">
                        <input
                          type="number"
                          min="0"
                          step="50"
                          placeholder="0"
                          value={selectedItemsData.get(item.key)?.gram || ''}
                          onChange={(e) => updateQuantity(item.key, 'gram', parseFloat(e.target.value) || 0)}
                          className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:border-[#C0392B] focus:ring-1 focus:ring-[#C0392B]/20 outline-none text-center font-bold text-sm text-gray-900 transition-all"
                        />
                        <span className="text-[7px] font-black text-gray-400 block text-center mt-0.5">ગ્રામ</span>
                      </div>
                    </div>
                  )}
                </button>
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

      {/* Selected Items Summary */}
      {selectedItemsData.size > 0 && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white border-t border-gray-100 p-4 space-y-3"
        >
          <h3 className="text-xs font-black text-gray-500 uppercase tracking-wider px-2">પસંદ કરેલી વસ્તુઓ</h3>
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {Array.from(selectedItemsData.values()).map(item => (
              <div key={item.key} className="flex items-center justify-between bg-gray-50 p-3 rounded-xl">
                <div className="flex-1">
                  <p className="text-sm font-bold text-gray-900">{item.nameGu}</p>
                  <p className="text-xs text-gray-400">{item.nameEn}</p>
                </div>
                <button 
                  onClick={() => toggleItem(item.key, item)}
                  className="p-2 text-gray-400 hover:text-red-500 active:scale-90 transition-all"
                >
                  <X size={18} />
                </button>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Footer Actions */}
      <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white border-t border-gray-100 p-4 pb-10 z-30 shadow-[0_-10px_20px_rgba(0,0,0,0.05)]">
        <div className="flex justify-between items-center mb-4 px-2">
          <div className="flex flex-col">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">પસંદ કરેલ</span>
            <span className="text-lg font-black text-[#C0392B]">{selectedItemsData.size} વસ્તુઓ</span>
          </div>
          <button 
            onClick={() => setShowCustomModal(true)}
            className="bg-gray-100 text-gray-700 px-4 py-3 rounded-xl font-bold text-sm flex items-center gap-1 active:scale-95 transition-all h-12"
          >
            <Plus size={20} /> નવી વસ્તુ
          </button>
        </div>
        <button 
          onClick={handleSave}
          disabled={selectedItemsData.size === 0}
          className="w-full bg-[#C0392B] disabled:bg-gray-200 disabled:text-gray-400 text-white py-5 rounded-2xl font-black text-lg shadow-xl shadow-red-900/20 flex items-center justify-center gap-2 active:scale-[0.98] transition-all h-16"
        >
          રિવ્યૂ કરો <ChevronRight size={24} />
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
