import { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function PWAInstallPrompt() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if app is already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    // Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
      setShowPrompt(true);
    };

    // Listen for app installed
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setShowPrompt(false);
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
      
      if (outcome === 'accepted') {
        setIsInstalled(true);
      }
      setShowPrompt(false);
    } catch (error) {
      console.error('Installation failed:', error);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
  };

  if (!showPrompt || isInstalled || !installPrompt) {
    return null;
  }

  return (
    <div className="fixed top-0 left-0 right-0 max-w-md mx-auto bg-gradient-to-r from-[#C0392B] to-[#A93226] text-white p-4 shadow-lg z-50 animate-slideDown">
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1 flex items-center gap-3">
          <Download size={20} className="flex-shrink-0" />
          <div className="text-sm">
            <div className="font-bold">કેટર બિલ ઇન્સ્ટોલ કરો</div>
            <div className="text-xs opacity-90">Android પર તરત ઍક્સેસ માટે</div>
          </div>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <button
            onClick={handleInstall}
            className="px-3 py-2 bg-white text-[#C0392B] rounded-full font-bold hover:bg-gray-100 transition-colors text-sm"
          >
            ઇન્સ્ટોલ
          </button>
          <button
            onClick={handleDismiss}
            className="p-1 hover:bg-white/20 rounded-full transition-colors"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      <style>{`
        @keyframes slideDown {
          from {
            transform: translateY(-100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        .animate-slideDown {
          animation: slideDown 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
