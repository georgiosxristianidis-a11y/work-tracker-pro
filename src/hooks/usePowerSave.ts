import { useState, useEffect } from 'react';
import { AppSettings } from '../constants';

interface BatteryManager extends EventTarget {
  level: number;
  charging: boolean;
  savePower?: boolean;
  addEventListener(type: string, listener: EventListenerOrEventListenerObject): void;
  removeEventListener(type: string, listener: EventListenerOrEventListenerObject): void;
}

interface NavigatorWithBattery extends Navigator {
  getBattery?: () => Promise<BatteryManager>;
}

export function usePowerSave(settings: AppSettings) {
  const [isLowBattery, setIsLowBattery] = useState(false);

  useEffect(() => {
    let battery: BatteryManager | null = null;
    
    const updateBatteryStatus = () => {
      if (battery) {
        setIsLowBattery(battery.level <= 0.2 || battery.savePower === true);
      }
    };

    const nav = navigator as NavigatorWithBattery;
    if (typeof nav.getBattery === 'function') {
      nav.getBattery().then((b: BatteryManager) => {
        battery = b;
        updateBatteryStatus();
        battery.addEventListener('levelchange', updateBatteryStatus);
        battery.addEventListener('chargingchange', updateBatteryStatus);
      });
    }

    return () => {
      if (battery) {
        battery.removeEventListener('levelchange', updateBatteryStatus);
        battery.removeEventListener('chargingchange', updateBatteryStatus);
      }
    };
  }, []);

  const isPowerSaveMode = settings.powerSaveMode || isLowBattery;

  return { isPowerSaveMode };
}
