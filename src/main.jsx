import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ConvexProvider, ConvexReactClient } from 'convex/react';
import './index.css';
import App from './App.jsx';

const convexUrl = import.meta.env.VITE_CONVEX_URL;
const convex = convexUrl ? new ConvexReactClient(convexUrl) : null;

const root = createRoot(document.getElementById('root'));

if (convex) {
  root.render(
    <StrictMode>
      <ConvexProvider client={convex}>
        <App />
      </ConvexProvider>
    </StrictMode>,
  );
} else {
  root.render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
