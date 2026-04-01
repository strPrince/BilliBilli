import { useState, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { db } from '../../db/database';
import { useLiveQuery } from 'dexie-react-hooks';
import dayjs from 'dayjs';
import { Edit3, FileDown, Share2, CheckCircle, Edit2, Trash2, Plus, Calendar, MapPin, User, Phone, ChevronRight, ChevronDown, ChevronUp } from 'lucide-react';
import html2pdf from 'html2pdf.js';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function OrderReview() {
  const { id } = useParams();
  const navigate = useNavigate();
  const orderId = Number(id);

  const order = useLiveQuery(() => db.orders.get(orderId), [orderId]);
  const items = useLiveQuery(() => db.orderItems.where('orderId').equals(orderId).toArray(), [orderId]);
  const profile = useLiveQuery(() => db.businessProfile.get(1));

  const [isExporting, setIsExporting] = useState(false);
  const [collapsedSlots, setCollapsedSlots] = useState<Set<string>>(new Set());

  const handleDeleteItem = async (itemId: number, itemName: string) => {
    if (window.confirm(`શું તમે '${itemName}' કાઢી દેવા માંગો છો?`)) {
      await db.orderItems.delete(itemId);
    }
  };

  const toggleSlot = (slotId: string) => {
    const newSet = new Set(collapsedSlots);
    if (newSet.has(slotId)) newSet.delete(slotId);
    else newSet.add(slotId);
    setCollapsedSlots(newSet);
  };

  const handleComplete = async () => {
    await db.orders.update(orderId, { status: 'completed' });
    navigate('/');
  };

  const morning = useMemo(() => items?.filter(i => i.timeSlot === 'morning' && (i.kg > 0 || i.gram > 0)) || [], [items]);
  const afternoon = useMemo(() => items?.filter(i => i.timeSlot === 'afternoon' && (i.kg > 0 || i.gram > 0)) || [], [items]);
  const evening = useMemo(() => items?.filter(i => i.timeSlot === 'evening' && (i.kg > 0 || i.gram > 0)) || [], [items]);

  const generateHTML = () => {
    if (!order || !items || !profile) return '';

    // Filter items that have values
    const mItems = morning;
    const bItems = afternoon;
    const sItems = evening;

    const maxRows = Math.max(mItems.length, bItems.length, sItems.length);

    let tableRows = '';
    for (let i = 0; i < maxRows; i++) {
      const m = mItems[i];
      const b = bItems[i];
      const s = sItems[i];

      tableRows += `
        <tr style="height: 28px;">
          <!-- Morning Slot -->
          <td style="border: 1px solid #000; padding: 2px 5px; font-size: 13px; font-weight: bold; width: 180px;">${m ? m.itemNameGu : ''}</td>
          <td style="border: 1px solid #000; padding: 2px; font-size: 14px; text-align: center; width: 40px; font-weight: bold;">${m?.kg || ''}</td>
          <td style="border: 1px solid #000; padding: 2px; font-size: 14px; text-align: center; width: 40px; font-weight: bold;">${m?.gram || ''}</td>
          
          <!-- Afternoon Slot -->
          <td style="border: 1px solid #000; padding: 2px 5px; font-size: 13px; font-weight: bold; width: 180px;">${b ? b.itemNameGu : ''}</td>
          <td style="border: 1px solid #000; padding: 2px; font-size: 14px; text-align: center; width: 40px; font-weight: bold;">${b?.kg || ''}</td>
          <td style="border: 1px solid #000; padding: 2px; font-size: 14px; text-align: center; width: 40px; font-weight: bold;">${b?.gram || ''}</td>
          
          <!-- Evening Slot -->
          <td style="border: 1px solid #000; padding: 2px 5px; font-size: 13px; font-weight: bold; width: 180px;">${s ? s.itemNameGu : ''}</td>
          <td style="border: 1px solid #000; padding: 2px; font-size: 14px; text-align: center; width: 40px; font-weight: bold;">${s?.kg || ''}</td>
          <td style="border: 1px solid #000; padding: 2px; font-size: 14px; text-align: center; width: 40px; font-weight: bold;">${s?.gram || ''}</td>
        </tr>
      `;
    }

    return `
      <div style="font-family: 'Noto Sans Gujarati', sans-serif; padding: 20px; color: #000; background: #fff; width: 950px; margin: auto; border: 1px solid #eee;">
        
        <!-- Header Section -->
        <div style="text-align: center; margin-bottom: 10px; position: relative; border-bottom: 2px solid #C0392B; padding-bottom: 10px;">
          <div style="position: absolute; left: 0; top: 0; font-size: 10px; text-align: left;">
             ।। શ્રી ગણેશાય નમઃ ।।
          </div>
          <div style="position: absolute; right: 0; top: 0; font-size: 12px; text-align: right; line-height: 1.4;">
             <strong>${profile.ownerName}</strong> - મો. ${profile.phone1}<br/>
             ${profile.phone2 ? '<strong>બીજો નંબર</strong> - મો. ' + profile.phone2 : ''}
          </div>
          
          <h1 style="font-size: 48px; color: #C0392B; margin: 5px 0 0 0; font-weight: 900; letter-spacing: 2px;">${profile.name}</h1>
          <p style="margin: 2px 0; font-size: 16px; font-weight: bold;">${profile.tagline}</p>
          <p style="margin: 0; font-size: 18px; color: #C0392B; font-weight: bold;">(${profile.address || 'મેસવાણવાળા'})</p>
        </div>

        <!-- Order Info Section -->
        <div style="margin-bottom: 15px; font-size: 16px; line-height: 2;">
          <div style="display: flex; justify-content: space-between;">
            <div style="flex: 2;">ગ્રાહકનું નામ : <span style="border-bottom: 1px dotted #000; flex: 1; display: inline-block; min-width: 400px; font-weight: bold; padding-left: 10px;">${order.customerName}</span></div>
            <div style="flex: 1; text-align: right;">તારીખ : <span style="border-bottom: 1px dotted #000; display: inline-block; min-width: 150px; font-weight: bold; text-align: left; padding-left: 10px;">${dayjs(order.eventDate).format('DD/MM/YYYY')}</span></div>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <div style="flex: 1;">સરનામું : <span style="border-bottom: 1px dotted #000; display: inline-block; min-width: 400px; font-weight: bold; padding-left: 10px;">${order.customerAddress || '-'}</span></div>
            <div style="flex: 1; text-align: right;">પ્રસંગનું સ્થળ : <span style="border-bottom: 1px dotted #000; display: inline-block; min-width: 250px; font-weight: bold; text-align: left; padding-left: 10px;">${order.eventType || '-'}</span></div>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <div style="flex: 1;">ફોન નંબર : <span style="border-bottom: 1px dotted #000; display: inline-block; min-width: 300px; font-weight: bold; padding-left: 10px;">${order.customerPhone || '-'}</span></div>
            <div style="flex: 1; text-align: right;">મોબાઇલ નંબર : <span style="border-bottom: 1px dotted #000; display: inline-block; min-width: 250px; font-weight: bold; text-align: left; padding-left: 10px;"></span></div>
          </div>
        </div>

        <!-- Main Table Section -->
        <table style="width: 100%; border-collapse: collapse; border: 2px solid #000;">
          <thead>
            <!-- Top Header (Savar, Bapor, Sanj) -->
            <tr style="background: #f0f0f0;">
              <th colspan="3" style="border: 1.5px solid #000; padding: 8px; font-size: 18px; text-align: center; width: 33.33%;">સવારે</th>
              <th colspan="3" style="border: 1.5px solid #000; padding: 8px; font-size: 18px; text-align: center; width: 33.33%;">બપોરે</th>
              <th colspan="3" style="border: 1.5px solid #000; padding: 8px; font-size: 18px; text-align: center; width: 33.33%;">સાંજે</th>
            </tr>
            <!-- Sub Header (Vigat, KG, Gram) -->
            <tr style="background: #fafafa;">
              <!-- Morning -->
              <th style="border: 1px solid #000; padding: 5px; font-size: 14px; text-align: center;">વિગત</th>
              <th style="border: 1px solid #000; padding: 5px; font-size: 14px; text-align: center; width: 40px;">કિલો</th>
              <th style="border: 1px solid #000; padding: 5px; font-size: 14px; text-align: center; width: 40px;">ગ્રામ</th>
              <!-- Afternoon -->
              <th style="border: 1px solid #000; padding: 5px; font-size: 14px; text-align: center;">વિગત</th>
              <th style="border: 1px solid #000; padding: 5px; font-size: 14px; text-align: center; width: 40px;">કિલો</th>
              <th style="border: 1px solid #000; padding: 5px; font-size: 14px; text-align: center; width: 40px;">ગ્રામ</th>
              <!-- Evening -->
              <th style="border: 1px solid #000; padding: 5px; font-size: 14px; text-align: center;">વિગત</th>
              <th style="border: 1px solid #000; padding: 5px; font-size: 14px; text-align: center; width: 40px;">કિલો</th>
              <th style="border: 1px solid #000; padding: 5px; font-size: 14px; text-align: center; width: 40px;">ગ્રામ</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>

        <!-- Footer / Notes -->
        ${order.notes ? `
          <div style="margin-top: 15px; border: 1px solid #000; padding: 10px;">
            <strong>નોંધ :</strong> ${order.notes}
          </div>
        ` : ''}
        
        <div style="margin-top: 20px; text-align: center; font-size: 12px; color: #666; font-style: italic;">
          Generated via CaterBill Application
        </div>
      </div>
    `;
  };

  const exportPDF = async () => {
    setIsExporting(true);
    try {
      const html = generateHTML();
      const element = document.createElement('div');
      element.innerHTML = html;
      document.body.appendChild(element);

      const opt = {
        margin:       [5, 5, 5, 5],
        filename:     `${order?.customerName}_Bill.pdf`,
        image:        { type: 'jpeg', quality: 1 },
        html2canvas:  { scale: 2, useCORS: true, letterRendering: true },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'landscape' }
      };

      await html2pdf().set(opt).from(element).save();
      document.body.removeChild(element);
    } catch (error) {
      console.error('PDF Error:', error);
      alert('PDF Error');
    } finally {
      setIsExporting(false);
    }
  };

  const shareWhatsApp = async () => {
    if (!order || !items) return;

    const formatItems = (slotItems: typeof items) => 
      slotItems.map(i => `✅ *${i.itemNameGu}*: ${i.kg ? i.kg + ' કિલો' : ''} ${i.gram ? i.gram + ' ગ્રામ' : ''}`).join('\n');

    const text = `*📦 ઓર્ડર વિગત - ${profile?.name}*\n` +
      `━━━━━━━━━━━━━━━━━━\n` +
      `👤 *ગ્રાહક:* ${order.customerName}\n` +
      `📅 *તારીખ:* ${dayjs(order.eventDate).format('DD/MM/YYYY')}\n` +
      `🎉 *પ્રસંગ:* ${order.eventType}\n` +
      `━━━━━━━━━━━━━━━━━━\n\n` +
      (morning.length ? `*🌅 સવારે*\n${formatItems(morning)}\n\n` : '') +
      (afternoon.length ? `*☀️ બપોરે*\n${formatItems(afternoon)}\n\n` : '') +
      (evening.length ? `*🌙 સાંજે*\n${formatItems(evening)}\n\n` : '') +
      (order.notes ? `*📝 નોંધ:*\n${order.notes}\n\n` : '') +
      `_Generated via CaterBill_`;

    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  if (!order || !items) return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="w-8 h-8 border-4 border-red-100 border-t-[#C0392B] rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="flex flex-col bg-[#F8F9FA] min-h-full">
      <div className="p-4 space-y-6 pb-60">
        
        {/* Customer Header Card */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white p-6 rounded-[32px] shadow-sm border border-gray-100 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 p-4">
            <button 
              onClick={() => navigate(`/order/${orderId}/edit`)}
              className="p-3 bg-gray-50 text-gray-400 hover:text-[#C0392B] rounded-2xl active:scale-90 transition-all"
            >
              <Edit3 size={20} />
            </button>
          </div>

          <div className="flex items-center gap-4 mb-6">
            <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center">
              <User size={28} className="text-[#C0392B]" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-gray-900 leading-tight">{order.customerName}</h2>
              <p className="text-xs font-black text-[#C0392B] uppercase tracking-widest">{order.orderNumber}</p>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1">
                <Calendar size={10} /> તારીખ
              </span>
              <p className="font-bold text-gray-800">{dayjs(order.eventDate).format('DD MMM, YYYY')}</p>
            </div>
            <div className="space-y-1">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1">
                <CheckCircle size={10} /> પ્રસંગ
              </span>
              <p className="font-bold text-gray-800">{order.eventType}</p>
            </div>
            {order.customerPhone && (
              <div className="col-span-2 pt-2 border-t border-gray-50 flex items-center gap-3">
                <Phone size={14} className="text-gray-300" />
                <p className="font-bold text-gray-600">{order.customerPhone}</p>
              </div>
            )}
            {order.customerAddress && (
              <div className="col-span-2 pt-2 flex items-center gap-3">
                <MapPin size={14} className="text-gray-300" />
                <p className="font-medium text-gray-500 text-sm leading-snug">{order.customerAddress}</p>
              </div>
            )}
          </div>
        </motion.div>

        {/* Time Slots */}
        {[
          { title: 'સવારે', items: morning, icon: '🌅', color: 'text-orange-500', bg: 'bg-orange-50', id: 'morning' },
          { title: 'બપોરે', items: afternoon, icon: '☀️', color: 'text-blue-500', bg: 'bg-blue-50', id: 'afternoon' },
          { title: 'સાંજે', items: evening, icon: '🌙', color: 'text-purple-500', bg: 'bg-purple-50', id: 'evening' }
        ].map((slot, sIdx) => (
          <motion.div 
            key={slot.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: sIdx * 0.1 }}
            className="bg-white rounded-[28px] shadow-sm border border-gray-100 overflow-hidden"
          >
            <button 
              onClick={() => toggleSlot(slot.id)}
              className={cn("w-full px-5 py-4 flex items-center justify-between transition-colors text-left", slot.bg)}
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">{slot.icon}</span>
                <span className={cn("font-black uppercase tracking-widest text-sm", slot.color)}>{slot.title}</span>
                <span className="text-[10px] font-black bg-white px-2 py-1 rounded-full shadow-sm text-gray-400">
                  {slot.items.length} વસ્તુઓ
                </span>
              </div>
              {collapsedSlots.has(slot.id) ? <ChevronDown size={20} className="text-gray-400" /> : <ChevronUp size={20} className="text-gray-400" />}
            </button>
            
            <AnimatePresence initial={false}>
              {!collapsedSlots.has(slot.id) && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="divide-y divide-gray-50">
                    {slot.items.length === 0 ? (
                      <div className="p-8 text-center">
                        <p className="text-xs font-bold text-gray-300 uppercase tracking-widest">કોઈ વસ્તુ નથી</p>
                      </div>
                    ) : (
                      slot.items.map(item => (
                        <div key={item.id} className="p-4 px-5 flex justify-between items-center group active:bg-gray-50 transition-colors">
                          <div className="flex-1">
                            <p className="font-bold text-gray-800 text-lg leading-tight">{item.itemNameGu}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs font-black text-[#C0392B] bg-red-50 px-2 py-0.5 rounded-lg">
                                {item.kg > 0 && `${item.kg} કિલો `}
                                {item.gram > 0 && `${item.gram} ગ્રામ`}
                              </span>
                            </div>
                          </div>
                          <div className="flex gap-1">
                            <button
                              onClick={() => navigate(`/order/${orderId}/quantities`)}
                              className="p-2.5 text-blue-500 hover:bg-blue-50 rounded-xl transition-all"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button
                              onClick={() => handleDeleteItem(item.id!, item.itemNameGu)}
                              className="p-2.5 text-red-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ))}

        {/* Notes */}
        {order.notes && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-red-50/30 p-6 rounded-[28px] border border-dashed border-red-100"
          >
            <h3 className="text-xs font-black text-[#C0392B] uppercase tracking-widest mb-2">📝 નોંધ</h3>
            <p className="text-gray-700 font-medium leading-relaxed">{order.notes}</p>
          </motion.div>
        )}
      </div>

      {/* Action Footer */}
      <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white/80 backdrop-blur-md border-t border-gray-100 p-4 pb-10 z-40 shadow-[0_-10px_30px_rgba(0,0,0,0.08)] space-y-3">
        <div className="flex gap-3">
          <button 
            onClick={exportPDF}
            disabled={isExporting}
            className="flex-1 flex items-center justify-center gap-2 py-4 bg-gray-50 text-gray-700 rounded-2xl font-black text-sm active:scale-95 transition-all disabled:opacity-50"
          >
            {isExporting ? <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" /> : <FileDown size={18} />}
            PDF
          </button>
          <button 
            onClick={shareWhatsApp}
            className="flex-[1.5] flex items-center justify-center gap-2 py-4 bg-[#25D366] text-white rounded-2xl font-black text-sm shadow-lg shadow-green-900/10 active:scale-95 transition-all"
          >
            <Share2 size={18} /> WhatsApp
          </button>
          <button 
            onClick={() => navigate(`/order/${orderId}/items`)}
            className="p-4 bg-gray-100 text-gray-500 rounded-2xl active:scale-95 transition-all"
          >
            <Plus size={20} />
          </button>
        </div>
        
        <button 
          onClick={handleComplete}
          className="w-full flex items-center justify-center gap-3 bg-[#C0392B] text-white py-5 rounded-[24px] font-black text-lg shadow-xl shadow-red-900/20 active:scale-[0.98] transition-all"
        >
          <CheckCircle size={24} /> 
          {order.status === 'completed' ? 'હોમ પર પાછા ફરો' : 'ઓર્ડર પૂર્ણ કરો'}
        </button>
      </div>
    </div>
  );
}
