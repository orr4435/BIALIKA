import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './styles.css';
import { applySkin, getSkinId, applyMode, getMode } from './lib/skins.js';

const urlSkin = new URLSearchParams(location.search).get('skin');
applySkin(urlSkin || getSkinId());
applyMode(getMode());

createRoot(document.getElementById('root')).render(<App />);
