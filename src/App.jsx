import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar'
import FormPage from './pages/FormPage'
import HistoricoPage from './pages/HistoricoPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<FormPage />} />
        <Route path="/historico" element={<HistoricoPage />} />
      </Routes>
      <Navbar />
    </BrowserRouter>
  )
}