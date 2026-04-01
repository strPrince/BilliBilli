import { useEffect, useState, useMemo } from 'react';
import { BrowserRouter, Routes, Route, Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { initDb } from './db/database';
import { Settings, Plus, ChevronLeft, Home as HomeIcon, Package, UserCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

import Home from './pages/Home';
import NewOrder from './pages/order/NewOrder';
import OrderItems from './pages/order/OrderItems';
import OrderQuantities from './pages/order/OrderQuantities';
import OrderReview from './pages/order/OrderReview';
import SettingsPage from './pages/Settings';
import ItemsManager from './pages/ItemsManager';
import PWAInstallPrompt from './components/PWAInstallPrompt';

/** Utility for Tailwind class merging */
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  
  const isHome = location.pathname === '/';
  const isSettings = location.pathname === '/settings';
  const isItems = location.pathname === '/items';
  
  const showBottomNav = useMemo(() => {
    return isHome || isSettings || isItems;
  }, [isHome, isSettings, isItems]);

  const getTitle = () => {
    if (isHome) return 'કેટર બિલ';
    if (isSettings) return 'સેટિંગ્સ';
    if (isItems) return 'આઇટમ્સ વ્યવસ્થાપન';
    if (location.pathname.includes('/order/new')) return 'નવો ઓર્ડર';
    if (location.pathname.includes('/edit')) return 'ઓર્ડર સુધારો';
    if (location.pathname.includes('/items')) return 'આઇટમ પસંદગી';
    if (location.pathname.includes('/quantities')) return 'જથ્થો નક્કી કરો';
    if (location.pathname.includes('/review')) return 'ઓર્ડર રિવ્યુ';
    return 'ઓર્ડર વિગત';
  };

  const navItems = [
    { icon: HomeIcon, label: 'હોમ', path: '/', active: isHome },
    { icon: Package, label: 'આઇટમ્સ', path: '/items', active: isItems },
    { icon: Settings, label: 'સેટિંગ્સ', path: '/settings', active: isSettings },
  ];

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#2C3E50] font-sans flex flex-col overflow-x-hidden">
      {/* Dynamic Header */}
      <header className="bg-white border-b border-gray-100 px-4 py-3 sticky top-0 z-30 flex items-center justify-between safe-top">
        <div className="flex items-center gap-3">
          {!isHome && (
            <button 
              onClick={() => navigate(-1)} 
              className="p-2 -ml-2 rounded-full active:bg-gray-100 transition-colors"
            >
              <ChevronLeft size={24} />
            </button>
          )}
          <h1 className="text-xl font-bold tracking-tight">
            {getTitle()}
          </h1>
        </div>
        {!isHome && !isSettings && (
          <Link to="/" className="p-2 rounded-full active:bg-gray-100 transition-colors">
            <HomeIcon size={20} className="text-gray-400" />
          </Link>
        )}
      </header>
      
      {/* Main Content - Simplified Transition */}
      <main className={cn(
        "flex-1 w-full max-w-md mx-auto relative",
        showBottomNav ? "pb-24" : "pb-6"
      )}>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>
      
      {/* FAB - Simplified */}
      {isHome && (
        <div className="fixed bottom-24 right-6 z-40">
          <Link 
            to="/order/new" 
            className="flex items-center justify-center bg-[#C0392B] text-white w-14 h-14 rounded-2xl shadow-xl hover:bg-[#A93226] active:scale-95 transition-all"
          >
            <Plus size={32} strokeWidth={2.5} />
          </Link>
        </div>
      )}

      {/* Modern Bottom Navigation - Simplified */}
      {showBottomNav && (
        <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-6 py-3 flex justify-between items-center z-40 safe-bottom">
          {navItems.map((item) => (
            <Link 
              key={item.path}
              to={item.path}
              className={cn(
                "flex flex-col items-center gap-1 transition-all relative px-4 py-1 rounded-xl",
                item.active ? "text-[#C0392B]" : "text-gray-400"
              )}
            >
              {item.active && (
                <div className="absolute inset-0 bg-red-50 rounded-xl -z-10" />
              )}
              <item.icon size={22} strokeWidth={item.active ? 2.5 : 2} />
              <span className="text-[10px] font-bold uppercase tracking-wider">{item.label}</span>
            </Link>
          ))}
        </nav>
      )}
    </div>
  );
}

export default function App() {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    initDb().then(() => setIsReady(true));
  }, []);

  if (!isReady) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white">
        <div className="w-12 h-12 border-4 border-red-100 border-t-[#C0392B] rounded-full animate-spin mb-4" />
        <p className="text-gray-500 font-medium animate-pulse">તૈયાર થઈ રહ્યું છે...</p>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <PWAInstallPrompt />
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="items" element={<ItemsManager />} />
          <Route path="order/new" element={<NewOrder />} />
          <Route path="order/:id/edit" element={<NewOrder />} />
          <Route path="order/:id/items" element={<OrderItems />} />
          <Route path="order/:id/quantities" element={<OrderQuantities />} />
          <Route path="order/:id/review" element={<OrderReview />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
