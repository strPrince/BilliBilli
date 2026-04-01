import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import dayjs from 'dayjs';
import { db } from '../db/database';
import { useLiveQuery } from 'dexie-react-hooks';
import { Save, Download, Upload, Package, Smartphone, Building2, Database, ShieldCheck, ChevronRight, CheckCircle2 } from 'lucide-react';
import { motion } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function SettingsPage() {
  const profile = useLiveQuery(() => db.businessProfile.get(1));
  
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    tagline: '',
    ownerName: '',
    phone1: '',
    phone2: '',
    address: '',
  });

  useEffect(() => {
    if (profile) {
      setFormData({
        name: profile.name,
        tagline: profile.tagline,
        ownerName: profile.ownerName,
        phone1: profile.phone1,
        phone2: profile.phone2,
        address: profile.address,
      });
    }
  }, [profile]);

  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setInstallPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (!installPrompt) return;
    try {
      await installPrompt.prompt();
      const { outcome } = await installPrompt.userChoice;
      if (outcome === 'accepted') setIsInstalled(true);
      setInstallPrompt(null);
    } catch (error) {
      console.error('Installation failed:', error);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await db.businessProfile.update(1, formData);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const exportData = async () => {
    const allOrders = await db.orders.toArray();
    const allItems = await db.orderItems.toArray();
    const allCustomItems = await db.customItems.toArray();
    const profileData = await db.businessProfile.get(1);

    const backup = {
      exportedAt: new Date().toISOString(),
      profile: profileData,
      orders: allOrders,
      items: allItems,
      customItems: allCustomItems,
    };

    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `caterbill_backup_${dayjs().format('DD_MM_YYYY')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (data.orders && data.items) {
          if (window.confirm('શું તમે ખરેખર બેકઅપ રિસ્ટોર કરવા માંગો છો? આ હાલનો ડેટા ભૂંસી નાખશે.')) {
            await db.transaction('rw', db.orders, db.orderItems, db.customItems, db.businessProfile, async () => {
              await db.orders.clear();
              await db.orderItems.clear();
              await db.customItems.clear();
              if (data.profile) await db.businessProfile.put(data.profile);
              if (data.orders.length) await db.orders.bulkAdd(data.orders);
              if (data.items.length) await db.orderItems.bulkAdd(data.items);
              if (data.customItems?.length) await db.customItems.bulkAdd(data.customItems);
            });
            alert('ડેટા સફળતાપૂર્વક રિસ્ટોર કરવામાં આવ્યો છે');
          }
        }
      } catch (error) {
        console.error('Import Error:', error);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="p-6 space-y-8 pb-32">
      {/* Business Details Section */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white p-6 rounded-[32px] shadow-sm border border-gray-100 space-y-6"
      >
        <div className="flex items-center gap-3">
          <div className="p-3 bg-red-50 rounded-2xl">
            <Building2 size={24} className="text-[#C0392B]" />
          </div>
          <h2 className="text-xl font-black text-gray-900">વ્યવસાયની વિગત</h2>
        </div>

        <form onSubmit={handleSave} className="space-y-5">
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">વ્યવસાયનું નામ</label>
              <input 
                type="text" 
                className="w-full p-4 bg-gray-50 border border-transparent rounded-2xl focus:bg-white focus:border-[#C0392B] focus:ring-4 focus:ring-[#C0392B]/5 outline-none font-bold text-gray-900 transition-all"
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">ટેગલાઇન</label>
              <input 
                type="text" 
                className="w-full p-4 bg-gray-50 border border-transparent rounded-2xl focus:bg-white focus:border-[#C0392B] focus:ring-4 focus:ring-[#C0392B]/5 outline-none font-medium text-gray-700 transition-all"
                value={formData.tagline}
                onChange={e => setFormData({...formData, tagline: e.target.value})}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">માલિકનું નામ</label>
              <input 
                type="text" 
                className="w-full p-4 bg-gray-50 border border-transparent rounded-2xl focus:bg-white focus:border-[#C0392B] focus:ring-4 focus:ring-[#C0392B]/5 outline-none font-bold text-gray-900 transition-all"
                value={formData.ownerName}
                onChange={e => setFormData({...formData, ownerName: e.target.value})}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">મોબાઈલ ૧</label>
                <input 
                  type="tel" 
                  className="w-full p-4 bg-gray-50 border border-transparent rounded-2xl focus:bg-white focus:border-[#C0392B] focus:ring-4 focus:ring-[#C0392B]/5 outline-none font-bold text-gray-900 transition-all"
                  value={formData.phone1}
                  onChange={e => setFormData({...formData, phone1: e.target.value})}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">મોબાઈલ ૨</label>
                <input 
                  type="tel" 
                  className="w-full p-4 bg-gray-50 border border-transparent rounded-2xl focus:bg-white focus:border-[#C0392B] focus:ring-4 focus:ring-[#C0392B]/5 outline-none font-bold text-gray-900 transition-all"
                  value={formData.phone2}
                  onChange={e => setFormData({...formData, phone2: e.target.value})}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">સરનામું</label>
              <textarea 
                className="w-full p-4 bg-gray-50 border border-transparent rounded-2xl focus:bg-white focus:border-[#C0392B] focus:ring-4 focus:ring-[#C0392B]/5 outline-none font-medium text-gray-700 transition-all"
                rows={2}
                value={formData.address}
                onChange={e => setFormData({...formData, address: e.target.value})}
              />
            </div>
          </div>
          
          <button 
            type="submit" 
            disabled={saveSuccess}
            className={cn(
              "w-full flex items-center justify-center gap-2 py-5 rounded-2xl font-black text-lg shadow-xl transition-all active:scale-[0.98]",
              saveSuccess 
                ? "bg-green-500 text-white shadow-green-900/10" 
                : "bg-[#C0392B] text-white shadow-red-900/20"
            )}
          >
            {saveSuccess ? <CheckCircle2 size={24} /> : <Save size={24} />}
            {saveSuccess ? 'સાચવવામાં આવ્યું' : 'સાચવો'}
          </button>
        </form>
      </motion.div>

      {/* App Installation */}
      {!isInstalled && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-gradient-to-br from-blue-600 to-indigo-700 p-6 rounded-[32px] shadow-xl shadow-blue-900/20 text-white space-y-6"
        >
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/20 backdrop-blur-md rounded-2xl">
              <Smartphone size={28} />
            </div>
            <div>
              <h2 className="text-xl font-black">ઍપ ઇન્સ્ટોલ કરો</h2>
              <p className="text-sm font-medium text-blue-100">સરળ ઍક્સેસ અને ઓફલાઇન ઉપયોગ</p>
            </div>
          </div>
          <button
            onClick={handleInstall}
            disabled={!installPrompt}
            className={cn(
              "w-full py-4 px-6 rounded-2xl font-black flex items-center justify-center gap-2 active:scale-95 transition-all shadow-lg",
              installPrompt
                ? "bg-white text-blue-700 enabled:active:scale-95"
                : "bg-white/50 text-white cursor-not-allowed opacity-75"
            )}
          >
            <Download size={20} strokeWidth={3} /> {installPrompt ? 'હમણાં જ ઇન્સ્ટોલ કરો' : 'ઇન્સ્ટોલ કરવાનો પ્રયાસ કરો'}
          </button>
          {!installPrompt && (
            <p className="text-xs font-medium text-blue-100 text-center leading-relaxed">
              If install is unavailable, open the Chrome menu and choose Install app or Add to Home screen.
            </p>
          )}
        </motion.div>
      )}

      {/* Items Management Link */}
      <Link
        to="/items"
        className="block bg-white p-6 rounded-[32px] shadow-sm border border-gray-100 group active:scale-[0.98] transition-all"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-orange-50 rounded-2xl">
              <Package size={24} className="text-orange-600" />
            </div>
            <div>
              <h2 className="text-lg font-black text-gray-900">આઇટમ્સ વ્યવસ્થાપન</h2>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-0.5">લિસ્ટમાં ફેરફાર કરો</p>
            </div>
          </div>
          <div className="p-2 bg-gray-50 rounded-xl group-hover:bg-orange-50 group-hover:text-orange-600 transition-all">
            <ChevronRight size={20} />
          </div>
        </div>
      </Link>

      {/* Data Backup Section */}
      <div className="bg-white p-6 rounded-[32px] shadow-sm border border-gray-100 space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-50 rounded-2xl">
            <Database size={24} className="text-blue-600" />
          </div>
          <h2 className="text-xl font-black text-gray-900">ડેટા બેકઅપ</h2>
        </div>
        
        <p className="text-sm font-medium text-gray-400 px-1 leading-relaxed">તમારો ડેટા સુરક્ષિત રાખવા માટે નિયમિત બેકઅપ લો. નવું ફોન લેતી વખતે આ ઉપયોગી થશે.</p>
        
        <div className="grid grid-cols-2 gap-4 pt-2">
          <button 
            onClick={exportData}
            className="flex flex-col items-center gap-3 p-5 bg-blue-50/50 rounded-3xl border border-blue-100 text-blue-700 hover:bg-blue-50 active:scale-95 transition-all"
          >
            <Download size={24} />
            <span className="text-xs font-black uppercase tracking-widest">બેકઅપ લો</span>
          </button>
          
          <label className="flex flex-col items-center gap-3 p-5 bg-green-50/50 rounded-3xl border border-green-100 text-green-700 hover:bg-green-50 active:scale-95 transition-all cursor-pointer">
            <Upload size={24} />
            <span className="text-xs font-black uppercase tracking-widest">રિસ્ટોર કરો</span>
            <input type="file" accept=".json" onChange={importData} className="hidden" />
          </label>
        </div>
      </div>

      <div className="flex flex-col items-center gap-2 pt-4 opacity-30">
        <ShieldCheck size={24} className="text-gray-400" />
        <p className="text-[10px] font-black text-gray-500 uppercase tracking-[4px]">Secure Database</p>
      </div>
    </div>
  );
}

