import React, { Suspense, lazy } from 'react';
import { Navigate, Routes, Route } from 'react-router-dom';
import AutoHideScrollbars from './components/AutoHideScrollbars';
import HomePage from './components/HomePage';
import Login from './components/Login';
import Register from './components/Register';
import ProtectedRoute from './components/ProtectedRoute';
import RouteLoadingFallback from './components/RouteLoadingFallback';
import InviteAcceptModal from './components/InviteAcceptModal';
import ConnectionRequestModal from './components/ConnectionRequestModal';

const Home = lazy(() => import('./components/Home'));
const CreateLayout = lazy(() => import('./components/CreateLayout'));
const LayoutView = lazy(() => import('./components/LayoutView'));
const EditLayout = lazy(() => import('./components/EditLayout'));
const Library = lazy(() => import('./components/Library'));
const Settings = lazy(() => import('./components/Settings'));
const Explore = lazy(() => import('./components/Explore'));
const Messages = lazy(() => import('./components/Messages'));
const Profile = lazy(() => import('./components/Profile'));

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
      <InviteAcceptModal />
      <ConnectionRequestModal />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/home" element={
          <ProtectedRoute>
            <LazyRoute label="Loading home…">
              <Home />
            </LazyRoute>
          </ProtectedRoute>
        } />
        <Route path="/dashboard" element={<Navigate to="/home" replace />} />
        <Route path="/explore" element={
          <ProtectedRoute>
            <LazyRoute label="Loading explore…">
              <Explore />
            </LazyRoute>
          </ProtectedRoute>
        } />
        <Route path="/messages" element={
          <ProtectedRoute>
            <LazyRoute label="Loading messages…">
              <Messages />
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
        <Route path="/settings" element={
          <ProtectedRoute>
            <LazyRoute label="Loading settings…">
              <Settings />
            </LazyRoute>
          </ProtectedRoute>
        } />
        <Route path="/profile/:userId" element={
          <ProtectedRoute>
            <LazyRoute label="Loading profile…">
              <Profile />
            </LazyRoute>
          </ProtectedRoute>
        } />
      </Routes>
    </>
  );
}

export default App;
