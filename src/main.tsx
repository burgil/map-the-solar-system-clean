import { createRoot } from 'react-dom/client'
import './index.css'
import Router from '@/Router';
import { LazyMotion, domAnimation } from "framer-motion"

const rootElement = document.getElementById('root')!;

console.time('⏱️ Total React Mount');
console.log('🚀 main.tsx: Starting app render (StrictMode DISABLED for debugging)');

createRoot(rootElement).render(
  // StrictMode disabled temporarily for debugging - causes double renders
  // <StrictMode>
  <LazyMotion features={domAnimation}>
    <Router />
  </LazyMotion>
  // </StrictMode>,
)

console.timeEnd('⏱️ Total React Mount');
