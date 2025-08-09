import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Auth from './components/Auth';
import HomePage from './pages/HomePage';
import BoardPage from './pages/BoardPage';
import './index.css'; // Ensure this path is correct for your CSS setup

function App() {
  const { user } = useAuth();

  return (
    <Router>
      <Routes>
        <Route path="/auth" element={user ? <Navigate to="/" /> : <Auth />} />
        <Route
          path="/"
          element={user ? <HomePage /> : <Navigate to="/auth" />}
        />
        <Route
          path="/board/:boardId"
          element={user ? <BoardPage /> : <Navigate to="/auth" />}
        />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}

export default App;