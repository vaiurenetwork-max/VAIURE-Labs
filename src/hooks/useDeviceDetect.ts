import { useState, useEffect } from 'react';

export type DeviceType = 'mobile' | 'tablet' | 'desktop' | 'ultrawide';

export interface DeviceInfo {
  width: number;
  height: number;
  deviceType: DeviceType;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isUltrawide: boolean;
  isTouch: boolean;
  pixelRatio: number; // DPI multiplier (e.g. 1x, 2x Retina, 3x Super Retina)
  isHighDpi: boolean; // High DPI / Retina display
  orientation: 'portrait' | 'landscape';
}

export function useDeviceDetect(): DeviceInfo {
  const getDeviceInfo = (): DeviceInfo => {
    if (typeof window === 'undefined') {
      return {
        width: 1200,
        height: 800,
        deviceType: 'desktop',
        isMobile: false,
        isTablet: false,
        isDesktop: true,
        isUltrawide: false,
        isTouch: false,
        pixelRatio: 1,
        isHighDpi: false,
        orientation: 'landscape',
      };
    }

    const width = window.innerWidth;
    const height = window.innerHeight;
    const pixelRatio = window.devicePixelRatio || 1;
    const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

    let deviceType: DeviceType = 'desktop';
    if (width < 640) {
      deviceType = 'mobile';
    } else if (width >= 640 && width < 1024) {
      deviceType = 'tablet';
    } else if (width >= 1024 && width < 1920) {
      deviceType = 'desktop';
    } else {
      deviceType = 'ultrawide';
    }

    return {
      width,
      height,
      deviceType,
      isMobile: deviceType === 'mobile',
      isTablet: deviceType === 'tablet',
      isDesktop: deviceType === 'desktop',
      isUltrawide: deviceType === 'ultrawide',
      isTouch,
      pixelRatio,
      isHighDpi: pixelRatio >= 1.5,
      orientation: height > width ? 'portrait' : 'landscape',
    };
  };

  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo>(getDeviceInfo());

  useEffect(() => {
    const handleResize = () => {
      setDeviceInfo(getDeviceInfo());
    };

    window.addEventListener('resize', handleResize, { passive: true });
    window.addEventListener('orientationchange', handleResize, { passive: true });

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  return deviceInfo;
}
