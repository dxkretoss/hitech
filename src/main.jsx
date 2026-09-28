import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

// Disable mouse wheel value change on all number inputs globally across the application
document.addEventListener(
  'wheel',
  () => {
    if (document.activeElement && document.activeElement.type === 'number') {
      document.activeElement.blur();
    }
  },
  { passive: true }
);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
