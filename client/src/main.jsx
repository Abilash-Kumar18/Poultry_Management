import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import App from './App.jsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            borderRadius: '10px',
            fontFamily: 'Inter, sans-serif',
            fontSize: '14px',
          },
          success: {
            style: { background: '#065f46', color: '#ecfdf5' },
            iconTheme: { primary: '#10b981', secondary: '#ecfdf5' },
          },
          error: {
            style: { background: '#7f1d1d', color: '#fef2f2' },
            iconTheme: { primary: '#ef4444', secondary: '#fef2f2' },
          },
        }}
      />
    </BrowserRouter>
  </React.StrictMode>
);
