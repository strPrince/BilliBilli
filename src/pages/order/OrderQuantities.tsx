import { useState, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { db } from '../../db/database';
import { useLiveQuery } from 'dexie-react-hooks';
import { Trash2, ChevronLeft, ChevronRight, Package, Scale, Search, CheckCircle2, ListFilter, ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type TimeSlot = 'morning' | 'afternoon' | 'evening';
type FilterStatus = 'all' | 'pending' | 'completed';

const SLOT_CONFIG = [
  { id: 'morning', label: 'સવારે', icon: '🌅' },
  { id: 'afternoon', label: 'બપોરે', icon: '☀️' },
  { id: 'evening', label: 'સાંજે', icon: '🌙' }
];

const CATEGORY_LABELS: Record<string, string> = {
  'લોટ_અને_બેસન': 'લોટ અને બેસન',
  'મસાલા': 'મસાલા',
  'કઠોળ_અને_દાળ': 'કઠોળ અને દાળ',
  'શાકભાજી': 'શાકભાજી',
  'ડ્રાયફ્રૂટ': 'ડ્રાયફ્રૂટ',
  'ઘી_અને_તેલ': 'ઘી અને તેલ',
  'ડેરી': 'ડેરી',
  'મીઠાઈ_સામગ્રી': 'મીઠાઈ સામગ્રી',
  'વાસણો': 'વાસણો',
  'ડીસ્પોઝેબલ': 'ડીસ્પોઝેબલ',
  'અન્ય': 'અન્ય',
};

export default function OrderQuantities() {
  const { id } = useParams();
  const navigate = useNavigate();
  const orderId = Number(id);

  const [activeTab, setActiveTab] = useState<TimeSlot>('morning');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());

  const allItems = useLiveQuery(
    () => db.orderItems.where({ orderId, timeSlot: activeTab }).toArray(),
    [orderId, activeTab]
  );

  const stats = useMemo(() => {
    if (!allItems) return { total: 0, completed: 0, percent: 0 };
    const total = allItems.length;
    const completed = allItems.filter(i => (i.kg > 0 || i.gram > 0)).length;
    return {
      total,
      completed,
      percent: total > 0 ? Math.round((completed / total) * 100) : 0
    };
  }, [allItems]);

  const groupedItems = useMemo(() => {
    if (!allItems) return {};
    
    const filtered = allItems.filter(item => {
      const matchesSearch = item.itemNameGu.includes(searchQuery) || item.itemNameEn.toLowerCase().includes(searchQuery.toLowerCase());
      const isFilled = item.kg > 0 || item.gram > 0;
      
      if (filterStatus === 'pending') return matchesSearch && !isFilled;
      if (filterStatus === 'completed') return matchesSearch && isFilled;
      return matchesSearch;
    });

    const groups: Record<string, typeof allItems> = {};
    filtered.forEach(item => {
      const cat = item.category || 'અન્ય';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(item);
    });
    return groups;
  }, [allItems, searchQuery, filterStatus]);

  const handleUpdate = async (itemId: number, field: 'kg' | 'gram', value: string) => {
    const numValue = parseFloat(value) || 0;
    await db.orderItems.update(itemId, { [field]: numValue });
  };

  const toggleCategory = (cat: string) => {
    const newSet = new Set(collapsedCategories);
    if (newSet.has(cat)) newSet.delete(cat);
    else newSet.add(cat);
    setCollapsedCategories(newSet);
  };

  return (
    <div className="flex flex-col bg-[#F8F9FA] min-h-full">
      {/* Dynamic Progress Header */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-20">
        <div className="flex p-2 gap-1 border-b border-gray-50">
          {SLOT_CONFIG.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TimeSlot)}
              className={cn(
                "flex-1 py-3 px-2 rounded-xl flex flex-col items-center gap-1 transition-all relative",
                activeTab === tab.id ? "text-[#C0392B]" : "text-gray-400"
              )}
            >
              {activeTab === tab.id && (
                <motion.div layoutId="active-slot" className="absolute inset-0 bg-red-50 -z-10 rounded-xl" />
              )}
              <span className="text-xl">{tab.icon}</span>
              <span className="text-[10px] font-black uppercase tracking-widest">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Progress and Search Bar */}
        <div className="p-4 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${stats.percent}%` }}
                className="h-full bg-green-500"
              />
            </div>
            <span className="text-[10px] font-black text-gray-400 whitespace-nowrap uppercase tracking-widest">
              {stats.completed} / {stats.total} પૂર્ણ
            </span>
          </div>

          <div className="relative group">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#C0392B]" />
            <input
              type="text"
              placeholder="વસ્તુ શોધો..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-[#C0392B]/10 outline-none text-sm transition-all"
            />
          </div>

          {/* Status Filters */}
          <div className="flex gap-2">
            {(['all', 'pending', 'completed'] as FilterStatus[]).map(status => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={cn(
                  "flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all",
                  filterStatus === status 
                    ? "bg-gray-900 text-white border-gray-900 shadow-lg shadow-gray-900/10" 
                    : "bg-white text-gray-400 border-gray-100"
                )}
              >
                {status === 'all' ? 'બધી' : status === 'pending' ? 'બાકી' : 'ભરેલી'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Grouped Items List */}
      <div className="p-4 space-y-6 pb-40">
        {Object.entries(groupedItems).map(([category, catItems]) => (
          <div key={category} className="space-y-3">
            <button 
              onClick={() => toggleCategory(category)}
              className="w-full flex items-center justify-between px-2 py-1 group"
            >
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-[#C0392B]" />
                <span className="text-xs font-black text-gray-900 uppercase tracking-widest">
                  {CATEGORY_LABELS[category] || category} ({catItems.length})
                </span>
              </div>
              {collapsedCategories.has(category) ? <ChevronDown size={16} className="text-gray-400" /> : <ChevronUp size={16} className="text-gray-400" />}
            </button>

            {!collapsedCategories.has(category) && (
              <div className="space-y-3">
                {catItems.map((item) => (
                  <motion.div 
                    key={item.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className={cn(
                      "bg-white p-4 rounded-[24px] shadow-sm border transition-all",
                      (item.kg > 0 || item.gram > 0) ? "border-green-100 bg-green-50/10" : "border-gray-50"
                    )}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        {(item.kg > 0 || item.gram > 0) && <CheckCircle2 size={16} className="text-green-500" />}
                        <div>
                          <h3 className="font-bold text-gray-900 leading-tight">{item.itemNameGu}</h3>
                          <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">{item.itemNameEn}</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div className="relative group">
                        <input
                          type="number"
                          min="0"
                          step="0.1"
                          placeholder="0"
                          defaultValue={item.kg || ''}
                          onBlur={(e) => handleUpdate(item.id!, 'kg', e.target.value)}
                          className="w-full p-3 bg-gray-50 border-none rounded-xl focus:bg-white focus:ring-2 focus:ring-[#C0392B]/10 outline-none text-center font-black text-lg text-gray-900 transition-all"
                        />
                        <span className="absolute -top-2 left-3 bg-white px-1 text-[8px] font-black text-gray-300 uppercase tracking-widest">કિલો</span>
                      </div>
                      <div className="relative group">
                        <input
                          type="number"
                          min="0"
                          step="50"
                          placeholder="0"
                          defaultValue={item.gram || ''}
                          onBlur={(e) => handleUpdate(item.id!, 'gram', e.target.value)}
                          className="w-full p-3 bg-gray-50 border-none rounded-xl focus:bg-white focus:ring-2 focus:ring-[#C0392B]/10 outline-none text-center font-black text-lg text-gray-900 transition-all"
                        />
                        <span className="absolute -top-2 left-3 bg-white px-1 text-[8px] font-black text-gray-300 uppercase tracking-widest">ગ્રામ</span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        ))}

        {Object.keys(groupedItems).length === 0 && (
          <div className="text-center py-20 text-gray-400 bg-white rounded-[32px] border border-dashed border-gray-200">
            <ListFilter size={48} className="mx-auto mb-3 opacity-10" />
            <p className="font-bold">કોઈ વસ્તુ મળી નથી</p>
          </div>
        )}
      </div>

      {/* Navigation Footer */}
      <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white border-t border-gray-100 p-4 pb-10 z-30 shadow-[0_-10px_30px_rgba(0,0,0,0.05)] flex gap-3">
        <button 
          onClick={() => navigate(`/order/${orderId}/items`)}
          className="flex-1 py-4 bg-gray-100 text-gray-600 rounded-2xl font-black text-sm flex items-center justify-center gap-2 active:scale-95 transition-all"
        >
          <ChevronLeft size={20} /> પાછા
        </button>
        <button 
          onClick={() => navigate(`/order/${orderId}/review`)}
          className="flex-[2] bg-[#C0392B] text-white py-4 rounded-2xl font-black text-lg shadow-xl shadow-red-900/20 flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
        >
          રિવ્યૂ કરો <ChevronRight size={24} />
        </button>
      </div>
    </div>
  );
}
