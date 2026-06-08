import { useEffect, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';

interface LockSettings {
  isLocked: boolean;
  lockTime: number;
  unlockTime: number;
}

const LOCK_TIMEOUT = 5 * 60 * 1000; // 5 分鐘

export function useAppLock() {
  const [lockSettings, setLockSettings] = useState<LockSettings>({
    isLocked: false,
    lockTime: 0,
    unlockTime: 0,
  });

  useEffect(() => {
    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
    };
  }, [lockSettings]);

  const handleAppStateChange = (state: AppStateStatus) => {
    if (state === 'background') {
      setLockSettings({
        ...lockSettings,
        isLocked: true,
        lockTime: Date.now(),
        unlockTime: Date.now() + LOCK_TIMEOUT,
      });
    } else if (state === 'active') {
      if (lockSettings.isLocked && Date.now() > lockSettings.unlockTime) {
        // 鎖定已過期，需要重新認證
        setLockSettings({ ...lockSettings, isLocked: true });
      } else {
        setLockSettings({ ...lockSettings, isLocked: false });
      }
    }
  };

  return lockSettings;
}
