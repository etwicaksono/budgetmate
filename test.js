// Simple test to verify components are working
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './src/App';

// Create a container div for testing
const container = document.createElement('div');
document.body.appendChild(container);

// Render the app
const root = createRoot(container);
root.render(<App />);