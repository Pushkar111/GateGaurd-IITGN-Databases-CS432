// src/lib/motion.js
// All Framer Motion animation variants used throughout the app.
// Import individual variants in components - keep animation logic centralised here.

// 
// Page transition - fade + slide up + blur on enter, reverse on exit
// 
export const pageVariants = {
  initial: {
    opacity: 0,
    y: 20,
    filter: 'blur(8px)',
  },
  animate: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: {
      duration: 0.35,
      ease: [0.25, 0.46, 0.45, 0.94],
    },
  },
  exit: {
    opacity: 0,
    y: -10,
    filter: 'blur(4px)',
    transition: {
      duration: 0.2,
      ease: 'easeIn',
    },
  },
};

// 
// Stagger container + item (for lists of cards)
// 
export const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.06,
      delayChildren:   0.1,
    },
  },
};

export const staggerItem = {
  initial: {
    opacity: 0,
    y: 24,
    scale: 0.97,
  },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: 'spring',
      stiffness: 400,
      damping: 25,
    },
  },
};

// 
// Sidebar - spring between 64px icon-only and 280px expanded
// 
export const sidebarVariants = {
  collapsed: {
    width: 64,
    transition: { type: 'spring', stiffness: 400, damping: 35 },
  },
  expanded: {
    width: 280,
    transition: { type: 'spring', stiffness: 400, damping: 35 },
  },
};

// 
// Card hover - subtle scale + lift
// 
export const cardHover = {
  rest:  { scale: 1,    y: 0,   transition: { type: 'spring', stiffness: 400, damping: 30 } },
  hover: { scale: 1.02, y: -2,  transition: { type: 'spring', stiffness: 400, damping: 20 } },
};

// 
// Counter pop - bouncy mount animation for stat numbers
// 
export const counterPop = {
  initial: { scale: 0.5, opacity: 0 },
  animate: {
    scale: 1,
    opacity: 1,
    transition: {
      type: 'spring',
      stiffness: 500,
      damping: 20,
      delay: 0.1,
    },
  },
};

// 
// Panel slide - side sheet drawer from the right
// 
export const panelSlide = {
  initial: { x: 300, opacity: 0 },
  animate: {
    x: 0,
    opacity: 1,
    transition: { type: 'spring', stiffness: 350, damping: 30 },
  },
  exit: {
    x: 300,
    opacity: 0,
    transition: { duration: 0.2, ease: 'easeIn' },
  },
};

// 
// Slide in from right (same spring but named for clarity)
// 
export const slideInRight = panelSlide;

// 
// Bell shake - notification bell animation
// 
export const bellShake = {
  animate: {
    rotate: [0, -10, 10, -10, 10, 0],
    transition: {
      duration: 0.5,
      ease: 'easeInOut',
    },
  },
};

// 
// Fade in up - generic entrance
// 
export const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] },
  },
  exit: {
    opacity: 0,
    y: 10,
    transition: { duration: 0.2 },
  },
};

// 
// Scale in - for modals and dialogs
// 
export const scaleIn = {
  initial: { scale: 0.9, opacity: 0 },
  animate: {
    scale: 1,
    opacity: 1,
    transition: { type: 'spring', stiffness: 350, damping: 25 },
  },
  exit: {
    scale: 0.95,
    opacity: 0,
    transition: { duration: 0.15 },
  },
};

// 
// Overlay backdrop fade
// 
export const backdropVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.2 } },
  exit:    { opacity: 0, transition: { duration: 0.2 } },
};
