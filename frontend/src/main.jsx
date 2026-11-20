import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import '@fontsource/merriweather/400.css';
import '@fontsource/merriweather/700.css';
import './styles.css';

createRoot(document.getElementById('root')).render(<App />);
