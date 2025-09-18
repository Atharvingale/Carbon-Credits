// Performance optimization utilities for Blue Carbon MRV

// Debounce function for search inputs and API calls
export const debounce = (func, wait, immediate) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      timeout = null;
      if (!immediate) func(...args);
    };
    const callNow = immediate && !timeout;
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    if (callNow) func(...args);
  };
};

// Throttle function for scroll events and resize handlers
export const throttle = (func, limit) => {
  let inThrottle;
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  }
};

// Memoization for expensive calculations
export const memoize = (fn) => {
  const cache = new Map();
  return (...args) => {
    const key = JSON.stringify(args);
    if (cache.has(key)) {
      return cache.get(key);
    }
    const result = fn(...args);
    cache.set(key, result);
    return result;
  };
};

// Lazy loading intersection observer setup
export const createIntersectionObserver = (callback, options = {}) => {
  const defaultOptions = {
    root: null,
    rootMargin: '50px',
    threshold: 0.1
  };

  const observerOptions = { ...defaultOptions, ...options };
  
  if (typeof IntersectionObserver !== 'undefined') {
    return new IntersectionObserver(callback, observerOptions);
  }
  
  // Fallback for browsers without IntersectionObserver
  return null;
};

// Performance monitoring utilities
export const performanceMonitor = {
  // Mark the start of a performance measurement
  mark: (name) => {
    if (typeof performance !== 'undefined' && performance.mark) {
      performance.mark(`${name}-start`);
    }
  },

  // Mark the end and measure performance
  measure: (name) => {
    if (typeof performance !== 'undefined' && performance.mark && performance.measure) {
      performance.mark(`${name}-end`);
      performance.measure(name, `${name}-start`, `${name}-end`);
      
      const entries = performance.getEntriesByName(name);
      if (entries.length > 0) {
        const duration = entries[entries.length - 1].duration;
        console.log(`🔍 Performance: ${name} took ${duration.toFixed(2)}ms`);
        return duration;
      }
    }
    return 0;
  },

  // Clear performance marks and measures
  clear: (name) => {
    if (typeof performance !== 'undefined') {
      if (performance.clearMarks) {
        performance.clearMarks(`${name}-start`);
        performance.clearMarks(`${name}-end`);
      }
      if (performance.clearMeasures) {
        performance.clearMeasures(name);
      }
    }
  }
};

// Image lazy loading utility
export const lazyLoadImage = (imageSrc, placeholder = '/placeholder.svg') => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(imageSrc);
    img.onerror = () => resolve(placeholder); // Fallback to placeholder
    img.src = imageSrc;
  });
};

// Bundle splitting recommendations
export const bundleOptimizations = {
  // Check if a component should be lazy loaded
  shouldLazyLoad: (componentName, priority = 'normal') => {
    const lazyComponents = [
      'AdminDashboard',
      'ProjectSubmission', 
      'CarbonCreditCalculator',
      'TokenList',
      'FileUpload'
    ];
    
    if (priority === 'critical') return false;
    return lazyComponents.includes(componentName);
  },

  // Preload critical resources
  preloadResource: (href, as = 'script') => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = as;
    link.href = href;
    document.head.appendChild(link);
  },

  // Resource hints for better performance
  addResourceHints: () => {
    // DNS prefetch for external resources
    const dnsPrefetchUrls = [
      'https://fonts.googleapis.com',
      'https://api.devnet.solana.com',
      'https://supabase.co'
    ];

    dnsPrefetchUrls.forEach(url => {
      const link = document.createElement('link');
      link.rel = 'dns-prefetch';
      link.href = url;
      document.head.appendChild(link);
    });
  }
};

// Memory management utilities
export const memoryManagement = {
  // Clean up component references
  cleanup: (refs = []) => {
    refs.forEach(ref => {
      if (ref && ref.current) {
        ref.current = null;
      }
    });
  },

  // Weak map for storing component data
  createWeakCache: () => new WeakMap(),

  // Check memory usage (development only)
  logMemoryUsage: () => {
    if (process.env.NODE_ENV === 'development' && typeof performance !== 'undefined' && performance.memory) {
      const memory = performance.memory;
      console.log('🧠 Memory Usage:', {
        used: `${(memory.usedJSHeapSize / 1048576).toFixed(2)} MB`,
        total: `${(memory.totalJSHeapSize / 1048576).toFixed(2)} MB`,
        limit: `${(memory.jsHeapSizeLimit / 1048576).toFixed(2)} MB`
      });
    }
  }
};

// Export all utilities
export default {
  debounce,
  throttle,
  memoize,
  createIntersectionObserver,
  performanceMonitor,
  lazyLoadImage,
  bundleOptimizations,
  memoryManagement
};