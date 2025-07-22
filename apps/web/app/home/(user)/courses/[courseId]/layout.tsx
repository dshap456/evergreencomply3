'use client';

import { useEffect } from 'react';

export default function CourseLayout({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Just hide the main sidebar completely
    const sidebar = document.querySelector('[data-sidebar="sidebar"]');
    if (sidebar) {
      (sidebar as HTMLElement).style.display = 'none';
    }
    
    // Adjust main content to use full width
    const main = document.querySelector('main');
    if (main) {
      (main as HTMLElement).style.marginLeft = '0';
    }
    
    return () => {
      // Restore on unmount
      if (sidebar) {
        (sidebar as HTMLElement).style.display = '';
      }
      if (main) {
        (main as HTMLElement).style.marginLeft = '';
      }
    };
  }, []);

  return <>{children}</>;
}