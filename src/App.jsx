import React from 'react';
import { Routes, Route } from 'react-router-dom';
import AutoHideScrollbars from './components/AutoHideScrollbars';
import HomePage from './components/HomePage';
import Login from './components/Login';
import Register from './components/Register';
import Dashboard from './components/Dashboard';
import CreateLayout from './components/CreateLayout';
import ProtectedRoute from './components/ProtectedRoute';
import LayoutView from './components/LayoutView';
import EditLayout from './components/EditLayout';
import Library from './components/Library';
// Import other components as needed

function App() {
  return (
    <>
      <AutoHideScrollbars />
      <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/dashboard" element={
        <ProtectedRoute>
          <Dashboard />
        </ProtectedRoute>
      } />
      <Route path="/create-layout" element={
        <ProtectedRoute>
          <CreateLayout />
        </ProtectedRoute>
      } />
      <Route path="/layout/:layoutId" element={
        <ProtectedRoute>
          <LayoutView />
        </ProtectedRoute>
      } />
      <Route path="/layout/:layoutId/edit" element={
        <ProtectedRoute>
          <EditLayout />
        </ProtectedRoute>
      } />
      <Route path="/library" element={
        <ProtectedRoute>
          <Library />
        </ProtectedRoute>
      } />
      {/* Define other routes like Forgot Password, Profile, etc. */}
    </Routes>
    </>
  );
}

export default App;