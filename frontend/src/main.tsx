import React from 'react';
import ReactDOM from 'react-dom/client';
import { ConfigProvider, setDefaultConfig } from 'antd-mobile';
import App from './App';
import ukUA from './locales/ukUA';
import './styles.css';

setDefaultConfig({ locale: ukUA });

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ConfigProvider locale={ukUA}>
      <App />
    </ConfigProvider>
  </React.StrictMode>
);
