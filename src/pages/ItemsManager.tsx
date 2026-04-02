import React, { useState, useMemo, useEffect } from 'react';
import { db } from '../db/database';
import { useLiveQuery } from 'dexie-react-hooks';
import { Plus, Edit2, Trash2, X, Search, Package, CheckCircle2 } from 'lucide-react';
import { MASTER_ITEMS, ItemCategory } from '../data/masterItems';
import { useCustomItems } from '../hooks/useCustomItems';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface Item {
  id?: number;
  key: string;
  nameGu: string;
  nameEn: string;
  category: ItemCategory;
  isCustom: boolean;
}

const CATEGORIES: ItemCategory[] = [
  'લોટ_અને_બેસન',
  'મસાલા',
  'કઠોળ_અને_દાળ',
  'શાકભાજી',
  'ફળ',
  'ડ્રાયફ્રૂટ',
  'ઘી_અને_તેલ',
  'ડેરી',
  'મીઠાઈ_સામગ્રી',
  'વાસણો',
  'ડીસ્પોઝેબલ',
  'અન્ય',
];

const CATEGORY_LABELS: Record<ItemCategory, string> = {
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

export default function ItemsManager() {
  const customItems = useCustomItems();
  
  const [selectedCategory, setSelectedCategory] = useState<ItemCategory>('લોટ_અને_બેસન');
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [formData, setFormData] = useState({
    nameGu: '',
    nameEn: '',
    category: 'લોટ_અને_બેસન' as ItemCategory,
  });

  // Combine master items and custom items
  const allItems = useMemo(() => {
    const customKeys = new Set((customItems || []).map(c => c.itemKey));
    const masterList = MASTER_ITEMS
      .filter(item => !customKeys.has(item.key)) // Filter out master items that have custom overrides
      .map(item => ({ ...item, isCustom: false }));
    const customList = (customItems || []).map(item => ({
      id: item.id,
      key: item.itemKey,
      nameGu: item.itemNameGu,
      nameEn: item.itemNameEn,
      category: item.category,
      isCustom: true,
    }));
    return [...masterList, ...customList];
  }, [customItems]);

  // Filter items by category and search
  const filteredItems = useMemo(() => {
    return allItems
      .filter(item => item.nameGu && item.nameEn) // Filter out deleted items (empty names)
      .filter(item => item.category === selectedCategory)
      .filter(item =>
        item.nameGu.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.nameEn.toLowerCase().includes(searchQuery.toLowerCase())
      )
      .sort((a, b) => {
        if (a.isCustom && !b.isCustom) return -1;
        if (!a.isCustom && b.isCustom) return 1;
        return a.nameGu.localeCompare(b.nameGu);
      });
  }, [allItems, selectedCategory, searchQuery]);

  const openAddModal = () => {
    setEditingItem(null);
    setFormData({
      nameGu: '',
      nameEn: '',
      category: selectedCategory,
    });
    setShowModal(true);
  };

  const openEditModal = (item: Item) => {
    // Allow editing both custom and master items
    setEditingItem({
      ...item,
      id: item.id || undefined, // Include id if it exists
    });
    setFormData({
      nameGu: item.nameGu,
      nameEn: item.nameEn,
      category: item.category,
    });
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nameGu.trim() || !formData.nameEn.trim()) return;

    try {
      if (editingItem && editingItem.id) {
        // Update existing custom item
        await db.customItems.update(editingItem.id, {
          itemNameGu: formData.nameGu,
          itemNameEn: formData.nameEn,
          category: formData.category,
        });
      } else if (editingItem && !editingItem.id) {
        // Editing a master item - create/update a custom override with the same key
        const existingCustom = (customItems || []).find(c => c.itemKey === editingItem.key);
        if (existingCustom) {
          // Update existing override
          await db.customItems.update(existingCustom.id, {
            itemNameGu: formData.nameGu,
            itemNameEn: formData.nameEn,
            category: formData.category,
          });
        } else {
          // Create new override with the same key as the master item
          await db.customItems.add({
            itemKey: editingItem.key,
            itemNameGu: formData.nameGu,
            itemNameEn: formData.nameEn,
            category: formData.category,
            createdAt: new Date().toISOString(),
          });
        }
      } else {
        // Adding a new item
        const newKey = `custom_${Date.now()}`;
        await db.customItems.add({
          itemKey: newKey,
          itemNameGu: formData.nameGu,
          itemNameEn: formData.nameEn,
          category: formData.category,
          createdAt: new Date().toISOString(),
        });
      }
      setShowModal(false);
      setEditingItem(null);
    } catch (error) {
      console.error('Error saving item:', error);
    }
  };

  const handleDelete = async (item: Item) => {
    if (window.confirm(`શું તમે '${item.nameGu}' કાઢી દેવા છો?`)) {
      try {
        if (item.isCustom && item.id) {
          // Delete custom item
          await db.customItems.delete(item.id);
        } else if (!item.isCustom) {
          // For master items, create a custom delete marker (empty names)
          const existingCustom = (customItems || []).find(c => c.itemKey === item.key);
          if (existingCustom) {
            // Delete the override if it exists
            await db.customItems.delete(existingCustom.id);
          } else {
            // Create a delete marker (empty custom item)
            await db.customItems.add({
              itemKey: item.key,
              itemNameGu: '',
              itemNameEn: '',
              category: item.category,
              createdAt: new Date().toISOString(),
            });
          }
        }
      } catch (error) {
        console.error('Error deleting item:', error);
      }
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#F8F9FA]">
      {/* Category Tabs - Scrollable */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-20">
        <div className="flex overflow-x-auto no-scrollbar px-4 py-3 gap-2">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={cn(
                "px-4 py-2 rounded-xl whitespace-nowrap text-sm font-bold transition-all relative",
                selectedCategory === cat ? "text-white" : "text-gray-500 bg-gray-50 hover:bg-gray-100"
              )}
            >
              {selectedCategory === cat && (
                <motion.div 
                  layoutId="active-cat"
                  className="absolute inset-0 bg-[#C0392B] rounded-xl -z-10 shadow-lg shadow-red-900/10"
                />
              )}
              {CATEGORY_LABELS[cat]}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Search Bar */}
        <div className="relative group">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#C0392B] transition-colors" />
          <input
            type="text"
            placeholder="શોધો... ઉદા: રવો"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-3.5 bg-white border border-gray-100 rounded-2xl shadow-sm focus:ring-2 focus:ring-[#C0392B]/20 outline-none text-base"
          />
        </div>

        {/* Action Button */}
        <button
          onClick={openAddModal}
          className="w-full bg-[#C0392B] text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-[#A93226] active:scale-[0.98] transition-all shadow-md"
        >
          <Plus size={22} />
          નવું આઇટમ ઉમેરો
        </button>

        {/* Stats Summary */}
        <div className="flex items-center gap-3 px-1 py-1">
          <div className="text-xs font-bold text-gray-400 uppercase tracking-widest">
            {CATEGORY_LABELS[selectedCategory]} ({filteredItems.length})
          </div>
          <div className="h-px bg-gray-100 flex-1" />
        </div>

        {/* Items Grid/List */}
        <div className="grid gap-3">
          <AnimatePresence initial={false}>
            {filteredItems.map((item, idx) => (
              <motion.div
                key={`${item.key}-${idx}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.1, delay: Math.min(idx * 0.01, 0.1) }}
                className={cn(
                  "p-4 rounded-2xl border flex items-center justify-between transition-all shadow-sm",
                  item.isCustom
                    ? "bg-blue-50/50 border-blue-100"
                    : "bg-white border-gray-50"
                )}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[#2C3E50] text-lg">{item.nameGu}</span>
                  {!item.isCustom && <CheckCircle2 size={14} className="text-blue-500" title="માસ્ટર આઇટમ" />}
                  </div>
                  <div className="text-sm text-gray-400 font-medium">{item.nameEn}</div>
                  {item.isCustom && (
                    <span className="inline-block text-[10px] text-blue-600 font-bold bg-blue-100/50 px-2 py-0.5 rounded-full mt-1 uppercase tracking-wider">
                      કસ્ટમ
                    </span>
                  )}
                </div>
                <div className="flex gap-1 ml-3">
                  <button
                    onClick={() => openEditModal(item)}
                    title="આઇટમ સંપાદિત કરો"
                    className="p-2.5 text-blue-600 bg-white rounded-xl active:scale-90 hover:bg-blue-50 transition-all"
                  >
                    <Edit2 size={18} />
                  </button>
                  <button
                    onClick={() => handleDelete(item)}
                    title="આઇટમ કાઢી દો"
                    className="p-2.5 text-red-400 bg-white rounded-xl active:scale-90 hover:bg-red-50 transition-all"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          
          {filteredItems.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              <Package size={48} className="mx-auto mb-3 opacity-20" />
              <p className="font-bold">આ શ્રેણીમાં કોઈ આઇટમ નથી</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal / Bottom Sheet */}
      <AnimatePresence>
        {showModal && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowModal(false)}
              className="fixed inset-0 bg-black/40 z-50"
            />
            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed inset-x-0 bottom-0 bg-white rounded-t-[32px] p-6 pt-2 z-50 shadow-2xl safe-bottom max-h-[90vh] overflow-y-auto"
            >
              <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto my-4" />
              
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-900">
                  {editingItem ? 'આઇટમ સંપાદિત કરો' : 'નવું આઇટમ ઉમેરો'}
                </h3>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-2 rounded-full bg-gray-100 text-gray-500 active:scale-90 transition-all"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSave} className="space-y-6 pb-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-gray-500 ml-1">શ્રેણી</label>
                  <select
                    value={formData.category}
                    onChange={e => setFormData({ ...formData, category: e.target.value as ItemCategory })}
                    className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-[#C0392B]/20 outline-none text-base appearance-none"
                  >
                    {CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{CATEGORY_LABELS[cat]}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-gray-500 ml-1">આઇટમ નામ (ગુજરાતી)</label>
                  <input
                    type="text"
                    required
                    value={formData.nameGu}
                    onChange={e => setFormData({ ...formData, nameGu: e.target.value })}
                    placeholder="જેમ: રવો"
                    className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-[#C0392B]/20 outline-none font-bold"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-gray-500 ml-1">આઇટમ નામ (અંગ્રેજી)</label>
                  <input
                    type="text"
                    required
                    value={formData.nameEn}
                    onChange={e => setFormData({ ...formData, nameEn: e.target.value })}
                    placeholder="e.g: Semolina"
                    className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-[#C0392B]/20 outline-none"
                  />
                </div>

                <div className="flex gap-4 pt-2">
                  {editingItem && (
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm(`શું તમે '${editingItem.nameGu}' કાઢી દેવા છો?`)) {
                          handleDelete(editingItem);
                          setShowModal(false);
                        }
                      }}
                      className="flex-1 py-4 px-6 bg-red-50 text-red-600 rounded-2xl font-bold border border-red-100 active:scale-95 transition-all"
                    >
                      <Trash2 size={18} className="inline mr-2" />
                      કાઢી દો
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="flex-1 py-4 px-6 bg-gray-100 text-gray-600 rounded-2xl font-bold active:scale-95 transition-all"
                  >
                    રદ કરો
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-4 px-6 bg-[#C0392B] text-white rounded-2xl font-bold shadow-lg shadow-red-900/20 active:scale-95 transition-all"
                  >
                    સાચવો
                  </button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
