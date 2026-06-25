import { Routes, Route } from 'react-router-dom'
import Home from './pages/Home.jsx'
import TribeLogin from './pages/TribeLogin.jsx'
import Quiz from './pages/Quiz.jsx'
import SageLogin from './pages/SageLogin.jsx'
import SageDashboard from './pages/SageDashboard.jsx'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/tribu/:tribeId" element={<TribeLogin />} />
      <Route path="/responder/:tribeId/:participantId" element={<Quiz />} />
      <Route path="/sabio" element={<SageLogin />} />
      <Route path="/sabio/panel" element={<SageDashboard />} />
      <Route path="*" element={<Home />} />
    </Routes>
  )
}
