import { useWindowDimensions } from 'react-native';

// Centralized responsive breakpoints and helpers
// Usage: const { isMobile, isTablet, isDesktop } = useResponsive();
export function useResponsive() {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const isTablet = width >= 768 && width < 1024;
  const isDesktop = width >= 1024;
  return { isMobile, isTablet, isDesktop };
}
