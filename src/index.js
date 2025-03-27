import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

const getTodayDate = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
    <input
      type="date"
      defaultValue={getTodayDate()}
      style={{
        fontSize: '11px',
        boxShadow: 'none',
        outline: 'none',
        border: 'none',
        backgroundColor: 'white',
        appearance: 'none', // Nasconde l'indicatore del calendario
        WebkitAppearance: 'none', // Per browser basati su WebKit
        MozAppearance: 'textfield' // Per Firefox
      }}
    />
  </React.StrictMode>
);