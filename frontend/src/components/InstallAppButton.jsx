import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Download } from 'lucide-react';

const InstallAppButton = ({ className = '', fullWidth = false }) => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showManualHint, setShowManualHint] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [showInstalledToast, setShowInstalledToast] = useState(false);

  useEffect(() => {
    const checkInstalled = () => {
      const inStandaloneMode = window.matchMedia('(display-mode: standalone)').matches;
      const iosStandalone = window.navigator.standalone === true;
      if (inStandaloneMode || iosStandalone) {
        setIsInstalled(true);
      }
    };

    const handleBeforeInstallPrompt = (event) => {
      event.preventDefault();
      setDeferredPrompt(event);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      setShowManualHint(false);
      setShowInstalledToast(true);
    };

    checkInstalled();
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  useEffect(() => {
    if (!showInstalledToast) {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      setShowInstalledToast(false);
    }, 2600);

    return () => window.clearTimeout(timer);
  }, [showInstalledToast]);

  const hintText = useMemo(() => {
    const ua = window.navigator.userAgent || '';
    const isIOS = /iPad|iPhone|iPod/.test(ua);
    if (isIOS) {
      return 'To install on iPhone: tap Share and then Add to Home Screen.';
    }
    return 'Use your browser menu and click Install app or Add to home screen.';
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) {
      setShowManualHint(true);
      return;
    }

    setInstalling(true);
    deferredPrompt.prompt();
    const result = await deferredPrompt.userChoice;

    if (result?.outcome === 'accepted') {
      setDeferredPrompt(null);
      setShowManualHint(false);
    }

    setInstalling(false);
  };

  if (isInstalled && !showInstalledToast) {
    return null;
  }

  return (
    <>
      {!isInstalled && (
        <div className={fullWidth ? 'w-full' : ''}>
          <button
            type="button"
            onClick={handleInstall}
            disabled={installing}
            className={`btn-secondary ${fullWidth ? 'w-full' : ''} ${className}`.trim()}
          >
            <span className="inline-flex items-center justify-center">
              <Download className="w-4 h-4 mr-2" />
              {installing ? 'Preparing...' : 'Install App'}
            </span>
          </button>
          {showManualHint && (
            <p className="mt-2 text-xs text-slate-400">{hintText}</p>
          )}
        </div>
      )}

      {showInstalledToast && (
        <div className="fixed bottom-5 right-5 z-[80] animate-scale-in rounded-xl border border-emerald-500/30 bg-emerald-500/12 px-4 py-3 text-sm text-emerald-100 backdrop-blur-md">
          <span className="inline-flex items-center font-medium">
            <CheckCircle2 className="w-4 h-4 mr-2 text-emerald-300" />
            Installed successfully. You can open it like an app now.
          </span>
        </div>
      )}
    </>
  );
};

export default InstallAppButton;
