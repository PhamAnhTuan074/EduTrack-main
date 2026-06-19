// Nguoi code: Phạm Anh Tuấn va Nguyễn Ngọc Phương. Pham vi: diem khoi chay React dung chung.

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
