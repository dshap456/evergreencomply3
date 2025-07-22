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
        
        /* Override hover effects on collapsed sidebar */
        .course-view-active [data-sidebar="sidebar"] button[data-sidebar-menu-button]:hover {
          background-color: transparent !important;
        }
        
        .course-view-active [data-sidebar="sidebar"] a[data-sidebar-menu-button]:hover {
          background-color: transparent !important;
        }
        
        /* Target the specific hover classes used by shadcn sidebar */
        .course-view-active [data-sidebar="sidebar"] .hover\\:bg-sidebar-accent:hover {
          background-color: transparent !important;
        }
        
        .course-view-active [data-sidebar="sidebar"] .hover\\:text-sidebar-accent-foreground:hover {
          color: inherit !important;
        }
        
        /* Remove active state background in collapsed mode */
        .course-view-active [data-sidebar="sidebar"] [data-active="true"] {
          background-color: transparent !important;
        }
        
        /* Simple icon-only hover effect */
        .course-view-active [data-sidebar="sidebar"] button:hover svg,
        .course-view-active [data-sidebar="sidebar"] a:hover svg {
          opacity: 0.7;
          transition: opacity 0.2s ease;
        }
      `}</style>
      {children}
    </>
  );
}