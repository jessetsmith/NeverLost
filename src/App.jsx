import React, { Suspense, lazy } from 'react';
import { Routes, Route } from 'react-router-dom';
import AutoHideScrollbars from './components/AutoHideScrollbars';
import HomePage from './components/HomePage';
import Login from './components/Login';
import Register from './components/Register';
import ProtectedRoute from './components/ProtectedRoute';
import RouteLoadingFallback from './components/RouteLoadingFallback';

const Dashboard = lazy(() => import('./components/Dashboard'));
const CreateLayout = lazy(() => import('./components/CreateLayout'));
const LayoutView = lazy(() => import('./components/LayoutView'));
const EditLayout = lazy(() => import('./components/EditLayout'));
const Library = lazy(() => import('./components/Library'));

function LazyRoute({ children, label }) {
  return (
    <Suspense fallback={<RouteLoadingFallback label={label} />}>
      {children}
    </Suspense>
  );
}

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
            <LazyRoute label="Loading dashboard…">
              <Dashboard />
            </LazyRoute>
          </ProtectedRoute>
        } />
        <Route path="/create-layout" element={
          <ProtectedRoute>
            <LazyRoute label="Loading editor…">
              <CreateLayout />
            </LazyRoute>
          </ProtectedRoute>
        } />
        <Route path="/layout/:layoutId" element={
          <ProtectedRoute>
            <LazyRoute label="Loading layout…">
              <LayoutView />
            </LazyRoute>
          </ProtectedRoute>
        } />
        <Route path="/layout/:layoutId/edit" element={
          <ProtectedRoute>
            <LazyRoute label="Loading editor…">
              <EditLayout />
            </LazyRoute>
          </ProtectedRoute>
        } />
        <Route path="/library" element={
          <ProtectedRoute>
            <LazyRoute label="Loading library…">
              <Library />
            </LazyRoute>
          </ProtectedRoute>
        } />
      </Routes>
    </>
  );
}

export default App;
