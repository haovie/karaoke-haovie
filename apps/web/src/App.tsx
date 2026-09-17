import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import HomePage from './components/HomePage';
import TVPage from './components/tv/TVPage';
import RemotePage from './components/remote/RemotePage';
import { ToastContainer } from './components/shared/Toast';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/room/:roomCode" element={<TVPage />} />
        <Route path="/r/:roomCode" element={<RemotePage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <ToastContainer />
    </BrowserRouter>
  );
}