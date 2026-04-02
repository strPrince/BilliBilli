import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/database';
import { Link } from 'react-router-dom';
import dayjs from 'dayjs';
import { Search, Trash2, FileText, Calendar, User, ChevronRight, Clock } from 'lucide-react';
import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

export default function Home() {
  const [search, setSearch] = useState('');
  
  const orders = useLiveQuery(
    () => db.orders.orderBy('createdAt').reverse().toArray()
  );

  const filteredOrders = orders?.filter(o => 
    o.customerName.toLowerCase().includes(search.toLowerCase()) ||
    o.orderNumber.toLowerCase().includes(search.toLowerCase())
  );

  const handleDelete = async (id: number) => {
    if (window.confirm('શું તમે ખરેખર આ ઓર્ડર કાઢી નાખવા માંગો છો?')) {
      // Batch operations in a transaction for better performance
      await db.transaction('rw', db.orders, db.orderItems, async () => {
        await db.orders.delete(id);
        await db.orderItems.where('orderId').equals(id).delete();
      });
    }
  };

  return (
    <div className="p-4 space-y-6">
      {/* Search Header */}
      <div className="relative group">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#C0392B] transition-colors" size={20} />
        <input 
          type="text" 
          placeholder="ગ્રાહકનું નામ અથવા ઓર્ડર નંબર શોધો..." 
          className="w-full pl-12 pr-4 py-4 bg-white border border-gray-100 rounded-2xl shadow-sm focus:ring-2 focus:ring-[#C0392B]/20 focus:border-[#C0392B] outline-none transition-all text-base"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Orders List */}
      <div className="space-y-4">
        <AnimatePresence mode="popLayout">
          {filteredOrders === undefined ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-32 bg-gray-100 animate-pulse rounded-2xl" />
              ))}
            </div>
          ) : filteredOrders.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-20 text-gray-400 flex flex-col items-center"
            >
              <div className="bg-gray-50 p-6 rounded-full mb-4">
                <FileText size={64} className="opacity-20" />
              </div>
              <p className="text-xl font-bold text-gray-600">કોઈ ઓર્ડર મળ્યા નથી</p>
              <p className="text-sm mt-1">નવો ઓર્ડર બનાવવા માટે નીચેના + બટન પર ક્લિક કરો</p>
            </motion.div>
          ) : (
            filteredOrders.map((order, idx) => (
              <motion.div 
                key={order.id} 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: Math.min(idx * 0.03, 0.3) }}
                className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden active:scale-[0.98] transition-transform"
              >
                <Link to={`/order/${order.id}/review`} className="block p-5">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <div className="bg-red-50 p-2.5 rounded-xl">
                        <User size={20} className="text-[#C0392B]" />
                      </div>
                      <div>
                        <h3 className="font-bold text-lg leading-tight">{order.customerName}</h3>
                        <p className="text-xs font-mono text-gray-400 mt-0.5 uppercase tracking-wider">{order.orderNumber}</p>
                      </div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      order.status === 'completed' 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-orange-100 text-orange-700'
                    }`}>
                      {order.status === 'completed' ? 'પૂર્ણ' : 'ડ્રાફ્ટ'}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-2 text-sm text-gray-500 bg-gray-50 px-3 py-2 rounded-lg">
                      <Calendar size={14} />
                      <span className="font-medium">{dayjs(order.eventDate).format('DD MMM, YYYY')}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-500 bg-gray-50 px-3 py-2 rounded-lg">
                      <Clock size={14} />
                      <span className="font-medium truncate">{order.eventType}</span>
                    </div>
                  </div>
                </Link>

                <div className="px-5 py-3 bg-gray-50/50 flex justify-between items-center border-t border-gray-100">
                  <Link 
                    to={`/order/${order.id}/review`}
                    className="flex items-center gap-1 text-[#C0392B] font-bold text-sm"
                  >
                    વિગત જુઓ <ChevronRight size={16} />
                  </Link>
                  <button 
                    onClick={() => order.id && handleDelete(order.id)}
                    className="text-red-400 p-2 hover:bg-red-50 hover:text-red-600 rounded-xl transition-all"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
