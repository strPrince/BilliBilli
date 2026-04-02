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
    pdfColor: '#8B0000',
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
        pdfColor: profile.pdfColor || '#8B0000',
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
    try {
      const allOrders = await db.orders.toArray();
      const allItems = await db.orderItems.toArray();
      const allCustomItems = await db.customItems.toArray();
      const allCustomCategories = await db.customCategories.toArray();
      const profileData = await db.businessProfile.get(1);

      const backup = {
        exportedAt: new Date().toISOString(),
        appVersion: '1.0',
        dataSnapshot: {
          profile: profileData,
          orders: allOrders,
          items: allItems,
          customItems: allCustomItems,
          customCategories: allCustomCategories,
        },
        summary: {
          totalOrders: allOrders.length,
          totalOrderItems: allItems.length,
          totalCustomItems: allCustomItems.length,
          totalCustomCategories: allCustomCategories.filter(c => !c.isBuiltIn).length,
          businessName: profileData?.name || 'Backup',
        }
      };

      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `caterbill_backup_${backup.summary.businessName}_${dayjs().format('DD_MM_YYYY_HH_mm_ss')}.json`;
      a.click();
      URL.revokeObjectURL(url);
      
      // Show success message
      alert(`✓ બેકઅપ સફળ!\n\nઓર્ડર્સ: ${backup.summary.totalOrders}\nઆઇટમ્સ: ${backup.summary.totalOrderItems}\nકસ્ટમ આઇટમ્સ: ${backup.summary.totalCustomItems}\nકસ્ટમ શ્રેણી: ${backup.summary.totalCustomCategories}`);
    } catch (error) {
      console.error('Export Error:', error);
      alert('બેકઅપ નિર્માણમાં ભૂલ. કૃપા પછીથી પ્રયાસ કરો.');
    }
  };

  const importData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const backupData = JSON.parse(event.target?.result as string);
        
        // Validate backup structure
        const data = backupData.dataSnapshot || backupData; // Support both old and new format
        
        if (!data.orders || !data.items) {
          alert('અમાન્ય બેકઅપ ફાઈલ. કૃપા સાચી ફાઈલ પસંદ કરો.');
          return;
        }

        const customCategoriesCount = data.customCategories?.filter((c: any) => !c.isBuiltIn)?.length || 0;
        const importSummary = {
          orders: data.orders?.length || 0,
          items: data.items?.length || 0,
          customItems: data.customItems?.length || 0,
          customCategories: customCategoriesCount,
          profile: data.profile?.name || 'Unknown'
        };

        const confirmMsg = `બેકઅપ રિસ્ટોર કરવો??\n\n📦 ઓર્ડર્સ: ${importSummary.orders}\n📋 આઇટમ્સ: ${importSummary.items}\n✨ કસ્ટમ આઇટમ્સ: ${importSummary.customItems}\n📂 કસ્ટમ શ્રેણી: ${importSummary.customCategories}\n\nⓘ હાલના બધા ડેટા બદલાશે`;

        if (window.confirm(confirmMsg)) {
          await db.transaction('rw', db.orders, db.orderItems, db.customItems, db.customCategories, db.businessProfile, async () => {
            // Clear existing data (keep built-in categories, remove custom ones)
            await db.orders.clear();
            await db.orderItems.clear();
            await db.customItems.clear();
            
            // Clear custom categories but keep built-in ones
            const allCategories = await db.customCategories.toArray();
            for (const category of allCategories) {
              if (!category.isBuiltIn) {
                await db.customCategories.delete(category.id!);
              }
            }

            // Restore data in order
            if (data.profile) {
              await db.businessProfile.put(data.profile);
            }
            if (data.orders?.length > 0) {
              await db.orders.bulkAdd(data.orders);
            }
            if (data.items?.length > 0) {
              await db.orderItems.bulkAdd(data.items);
            }
            if (data.customItems?.length > 0) {
              await db.customItems.bulkAdd(data.customItems);
            }
            if (data.customCategories?.length > 0) {
              // Only restore custom categories, not built-in ones
              const customCategoriesToRestore = data.customCategories.filter((c: any) => !c.isBuiltIn);
              if (customCategoriesToRestore.length > 0) {
                await db.customCategories.bulkAdd(customCategoriesToRestore);
              }
            }
          });

          alert(`✓ બેકઅપ સફળતાપૂર્વક રિસ્ટોર!\n\n📦 ઓર્ડર્સ: ${importSummary.orders}\n📋 આઇટમ્સ: ${importSummary.items}\n✨ કસ્ટમ આઇટમ્સ: ${importSummary.customItems}\n📂 કસ્ટમ શ્રેણી: ${importSummary.customCategories}\n\n૨ સેકન્ડમાં એપ રીફ્રેશ થશે...`);
          
          // Refresh page after 2 seconds to reload data
          setTimeout(() => {
            window.location.reload();
          }, 2000);
        }
      } catch (error) {
        console.error('Import Error:', error);
        alert(`બેકઅપ આયાતમાં ભૂલ:\n${error instanceof Error ? error.message : 'અજ્ઞાત ભૂલ'}`);
      }
    };
    reader.readAsText(file);
  };

  const cleanupDuplicateCategories = async () => {
    if (!window.confirm('શું તમે ડુપ્લિકેટ શ્રેણી સાફ કરવા માંગો છો? આ અપરિવર્તનીય છે.')) {
      return;
    }

    try {
      const allCategories = await db.customCategories.toArray();
      
      // Find and delete duplicate built-in categories, keeping only one of each
      const seenKeys: { [key: string]: boolean } = {};
      const duplicateIds: number[] = [];

      for (const category of allCategories) {
        if (category.isBuiltIn) {
          if (seenKeys[category.categoryKeyGu]) {
            // This is a duplicate - mark for deletion
            if (category.id) {
              duplicateIds.push(category.id);
            }
          } else {
            seenKeys[category.categoryKeyGu] = true;
          }
        }
      }

      // Delete duplicate entries
      for (const id of duplicateIds) {
        await db.customCategories.delete(id);
      }

      alert(`✓ સાફ કરવું સંપન્ન!\n\nડુપ્લિકેટ હટાવવામાં આવ્યું: ${duplicateIds.length}\n\nપૃષ્ઠ તાજું કરવામાં આવશે...`);
      window.location.reload();
    } catch (error) {
      console.error('Cleanup Error:', error);
      alert('સાફ કરવામાં ભૂલ');
    }
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

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">PDF હેડર રંગ</label>
              <div className="flex items-center gap-3">
                <div className="relative flex-1">
                  <input 
                    type="color" 
                    value={formData.pdfColor}
                    onChange={e => setFormData({...formData, pdfColor: e.target.value})}
                    className="w-full h-12 bg-gray-50 border border-transparent rounded-2xl focus:bg-white focus:border-[#C0392B] focus:ring-4 focus:ring-[#C0392B]/5 outline-none cursor-pointer transition-all"
                  />
                </div>
                <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 border border-transparent rounded-2xl min-w-max">
                  <div 
                    className="w-8 h-8 rounded-lg border-2 border-gray-200 shadow-sm"
                    style={{ backgroundColor: formData.pdfColor }}
                  />
                  <span className="text-xs font-bold text-gray-600 font-mono">{formData.pdfColor.toUpperCase()}</span>
                </div>
              </div>
              <p className="text-xs text-gray-400 mt-1.5 ml-1">PDF નોટ્સ વિસ્તારમાં રંગ બદલતું હોય છે</p>
            </div>
          </div>
          
          <button 
            type="submit" 
            disabled={saveSuccess}
            className={cn(
              "w-full flex items-center justify-center gap-2 rounded-2xl font-black text-lg shadow-xl transition-all active:scale-[0.98] h-16",
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
              "w-full px-6 rounded-2xl font-black flex items-center justify-center gap-2 active:scale-95 transition-all shadow-lg h-12",
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

        <button
          onClick={cleanupDuplicateCategories}
          className="w-full px-4 py-3 text-sm font-bold text-orange-600 bg-orange-50 border border-orange-100 rounded-2xl hover:bg-orange-100 active:scale-95 transition-all"
        >
          🧹 ડુપ્લિકેટ શ્રેણી સાફ કરો
        </button>
      </div>

      <div className="flex flex-col items-center gap-2 pt-4 opacity-30">
        <ShieldCheck size={24} className="text-gray-400" />
        <p className="text-[10px] font-black text-gray-500 uppercase tracking-[4px]">Secure Database</p>
        <p className="text-[10px] font-semibold text-gray-500">Made with {'\u2764'} by Prince Chaniyara</p>
      </div>
    </div>
  );
}
