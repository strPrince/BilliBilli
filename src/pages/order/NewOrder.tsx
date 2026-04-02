import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { db } from '../../db/database';
import dayjs from 'dayjs';
import { User, Phone, MapPin, Calendar, BookOpen, ChevronRight } from 'lucide-react';
import { motion } from 'motion/react';

export default function NewOrder() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;

  const [formData, setFormData] = useState({
    customerName: '',
    customerPhone: '',
    customerAddress: '',
    eventType: 'લગ્ન',
    eventDate: dayjs().format('YYYY-MM-DD'),
    notes: '',
  });

  useEffect(() => {
    if (isEdit) {
      db.orders.get(Number(id)).then(order => {
        if (order) {
          setFormData({
            customerName: order.customerName,
            customerPhone: order.customerPhone,
            customerAddress: order.customerAddress,
            eventType: order.eventType,
            eventDate: order.eventDate,
            notes: order.notes,
          });
        }
      });
    }
  }, [id, isEdit]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.customerName) return;

    if (isEdit) {
      await db.orders.update(Number(id), {
        ...formData,
        updatedAt: new Date().toISOString(),
      });
      navigate(`/order/${id}/review`);
    } else {
      const today = dayjs().format('YYYYMMDD');
      const count = await db.orders.where('createdAt').startsWith(dayjs().format('YYYY-MM-DD')).count();
      const orderNumber = `ORD-${today}-${String(count + 1).padStart(3, '0')}`;

      const newId = await db.orders.add({
        ...formData,
        orderNumber,
        status: 'draft',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      navigate(`/order/${newId}/items`);
    }
  };

  return (
    <div className="p-6">
      <motion.div 
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="space-y-8"
      >
        <div className="space-y-1">
          <h2 className="text-2xl font-black text-gray-900">
            {isEdit ? 'ઓર્ડર સુધારો' : 'ગ્રાહકની વિગત'}
          </h2>
          <p className="text-gray-500 font-medium">બધી માહિતી કાળજીપૂર્વક ભરો</p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-5">
            {/* Customer Name */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-bold text-gray-600 ml-1">
                <User size={16} className="text-[#C0392B]" />
                ગ્રાહકનું નામ *
              </label>
              <input 
                type="text" 
                required
                placeholder="ઉદા: નરેશભાઈ પટેલ"
                className="w-full p-4 bg-white border border-gray-100 rounded-2xl shadow-sm focus:ring-2 focus:ring-[#C0392B]/20 focus:border-[#C0392B] outline-none transition-all font-bold text-gray-900"
                value={formData.customerName}
                onChange={e => setFormData({...formData, customerName: e.target.value})}
              />
            </div>

            {/* Phone Number */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-bold text-gray-600 ml-1">
                <Phone size={16} className="text-[#C0392B]" />
                ફોન નંબર
              </label>
              <input 
                type="tel" 
                placeholder="00000 00000"
                className="w-full p-4 bg-white border border-gray-100 rounded-2xl shadow-sm focus:ring-2 focus:ring-[#C0392B]/20 focus:border-[#C0392B] outline-none transition-all font-bold text-gray-900"
                value={formData.customerPhone}
                onChange={e => setFormData({...formData, customerPhone: e.target.value})}
              />
            </div>

            {/* Address */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-bold text-gray-600 ml-1">
                <MapPin size={16} className="text-[#C0392B]" />
                સરનામું
              </label>
              <textarea 
                placeholder="પૂરું સરનામું લખો..."
                className="w-full p-4 bg-white border border-gray-100 rounded-2xl shadow-sm focus:ring-2 focus:ring-[#C0392B]/20 focus:border-[#C0392B] outline-none transition-all font-medium text-gray-900"
                rows={2}
                value={formData.customerAddress}
                onChange={e => setFormData({...formData, customerAddress: e.target.value})}
              />
            </div>

            {/* Event Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-bold text-gray-600 ml-1">
                  <BookOpen size={16} className="text-[#C0392B]" />
                  પ્રસંગ પ્રકાર
                </label>
                <select 
                  className="w-full p-4 bg-white border border-gray-100 rounded-2xl shadow-sm focus:ring-2 focus:ring-[#C0392B]/20 focus:border-[#C0392B] outline-none transition-all font-bold text-gray-900 appearance-none"
                  value={formData.eventType}
                  onChange={e => setFormData({...formData, eventType: e.target.value})}
                >
                  <option value="લગ્ન">લગ્ન</option>
                  <option value="સગાઈ">સગાઈ</option>
                  <option value="સીમંત">સીમંત</option>
                  <option value="વાસ્તુ">વાસ્તુ</option>
                  <option value="અન્ય">અન્ય</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-bold text-gray-600 ml-1">
                  <Calendar size={16} className="text-[#C0392B]" />
                  તારીખ
                </label>
                <input 
                  type="date" 
                  className="w-full p-4 bg-white border border-gray-100 rounded-2xl shadow-sm focus:ring-2 focus:ring-[#C0392B]/20 focus:border-[#C0392B] outline-none transition-all font-bold text-gray-900"
                  value={formData.eventDate}
                  onChange={e => setFormData({...formData, eventDate: e.target.value})}
                />
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-bold text-gray-600 ml-1">
                નોંધ (વધારાની માહિતી)
              </label>
              <textarea 
                placeholder="કોઈ ખાસ સૂચના હોય તો અહીં લખો..."
                className="w-full p-4 bg-white border border-gray-100 rounded-2xl shadow-sm focus:ring-2 focus:ring-[#C0392B]/20 focus:border-[#C0392B] outline-none transition-all font-medium text-gray-900"
                rows={3}
                value={formData.notes}
                onChange={e => setFormData({...formData, notes: e.target.value})}
              />
            </div>
          </div>

          <button 
            type="submit" 
            className="w-full bg-[#C0392B] text-white py-5 rounded-2xl font-black text-lg mt-4 flex items-center justify-center gap-2 shadow-xl shadow-red-900/20 active:scale-[0.98] transition-all"
          >
            {isEdit ? 'સાચવો' : 'આગળ વધો'}
            {!isEdit && <ChevronRight size={24} />}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
