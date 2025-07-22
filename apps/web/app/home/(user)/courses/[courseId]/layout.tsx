'use client';

import { useSidebar } from '@kit/ui/shadcn-sidebar';
import { useEffect } from 'react';

export default function CourseLayout({ children }: { children: React.ReactNode }) {
  const sidebar = useSidebar();
  
  // Auto-collapse sidebar when viewing courses
  useEffect(() => {
    // Set sidebar to collapsed state
    sidebar?.setOpen(false);
  }, [sidebar]);

  // Add CSS to override sidebar width and maximize content area
  useEffect(() => {
    // Add a class to the body when in course view
    document.body.classList.add('course-view-active');
    
    return () => {
      document.body.classList.remove('course-view-active');
    };
  }, []);

  return (
    <>
      <style jsx global>{`
        /* When in course view, minimize the main navigation sidebar */
        .course-view-active [data-sidebar="sidebar"] {
          width: 3rem !important;
          min-width: 3rem !important;
        }
        
        /* Hide sidebar text when collapsed in course view */
        .course-view-active [data-sidebar="sidebar"] span,
        .course-view-active [data-sidebar="sidebar"] p,
        .course-view-active [data-sidebar="sidebar"] h2,
        .course-view-active [data-sidebar="sidebar"] h3 {
          display: none;
        }
        
        /* Keep icons visible and centered */
        .course-view-active [data-sidebar="sidebar"] svg {
          margin: 0 auto;
        }
        
        /* Adjust main content area to use more space */
        .course-view-active main {
          margin-left: 3rem !important;
        }
        
        /* Aggressively disable ALL hover/active states on collapsed sidebar */
        .course-view-active [data-sidebar="sidebar"] * {
          --sidebar-accent: transparent !important;
          --sidebar-accent-foreground: currentColor !important;
        }
        
        /* Force remove all backgrounds on interactive elements */
        .course-view-active [data-sidebar="sidebar"] button,
        .course-view-active [data-sidebar="sidebar"] a,
        .course-view-active [data-sidebar="sidebar"] [role="button"],
        .course-view-active [data-sidebar="sidebar"] [data-sidebar-menu-button] {
          background: transparent !important;
          background-color: transparent !important;
        }
        
        /* Override any hover state */
        .course-view-active [data-sidebar="sidebar"] button:hover,
        .course-view-active [data-sidebar="sidebar"] a:hover,
        .course-view-active [data-sidebar="sidebar"] [role="button"]:hover,
        .course-view-active [data-sidebar="sidebar"] [data-sidebar-menu-button]:hover {
          background: transparent !important;
          background-color: transparent !important;
          box-shadow: none !important;
        }
        
        /* Simple icon hover - just opacity */
        .course-view-active [data-sidebar="sidebar"] svg {
          transition: opacity 0.2s ease;
        }
        
        .course-view-active [data-sidebar="sidebar"] button:hover svg,
        .course-view-active [data-sidebar="sidebar"] a:hover svg {
          opacity: 0.6;
        }
      `}</style>
      {children}
    </>
  );
}