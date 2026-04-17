// src/App.jsx
// Root component - RouterProvider + Toaster + global orb decorations

import { RouterProvider } from 'react-router-dom';
import { Toaster } from 'sonner';
import router from './router';

export default function App() {
  return (
    <div className="relative min-h-screen overflow-x-hidden">
      {/* Ambient orbs - fixed position, CSS animations defined in globals.css */}
      <div className="orb-1" aria-hidden="true" />
      <div className="orb-2" aria-hidden="true" />

      {/* Main app router */}
      <div className="relative z-10">
        <RouterProvider router={router} />
      </div>

      {/* Global toast notifications */}
      <Toaster
        position="bottom-right"
        theme="dark"
        richColors
        closeButton
        toastOptions={{
          style: {
            background: 'hsl(228 35% 10%)',
            border:     '1px solid rgba(255,255,255,0.08)',
            color:      'hsl(220 20% 95%)',
          },
        }}
      />
    </div>
  );
}
