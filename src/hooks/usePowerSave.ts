import { useState, useEffect } from 'react';
import { AppSettings } from '../constants';

export function usePowerSave(settings: AppSettings) {
  const [isLowBattery, setIsLowBattery] = useState(false);

  useEffect(() => {
    let battery: any = null;
    
    const updateBatteryStatus = () => {
      if (battery) {
        setIsLowBattery(battery.level <= 0.2 || battery.savePower === true);
      }
    };

    if ('getBattery' in navigator) {
      (navigator as any).getBattery().then((b: any) => {
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
