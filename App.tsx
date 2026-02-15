
import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useAppContext } from './context/AppContext';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { ProjectList } from './pages/ProjectList';
import { ProjectDetail } from './pages/ProjectDetail';
import { SubcategoryDetail } from './pages/SubcategoryDetail';
import { TaskDetail } from './pages/TaskDetail';
import { Members } from './pages/Members';

const PrivateRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { state } = useAppContext();
  return state.currentUser ? <>{children}</> : <Navigate to="/login" />;
};

const App: React.FC = () => {
  return (
    <AppProvider>
      <HashRouter>
        <Layout>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Login />} />
            <Route path="/forgot-password" element={<Login />} />
            <Route path="/" element={<PrivateRoute><ProjectList /></PrivateRoute>} />
            <Route path="/project/:id" element={<PrivateRoute><ProjectDetail /></PrivateRoute>} />
            <Route path="/subcategory/:id" element={<PrivateRoute><SubcategoryDetail /></PrivateRoute>} />
            <Route path="/task/:id" element={<PrivateRoute><TaskDetail /></PrivateRoute>} />
            <Route path="/members" element={<PrivateRoute><Members /></PrivateRoute>} />
          </Routes>
        </Layout>
      </HashRouter>
    </AppProvider>
  );
};

export default App;
