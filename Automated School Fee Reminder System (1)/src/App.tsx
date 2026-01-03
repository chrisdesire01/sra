import React, { useState, useEffect } from 'react';
import { projectId, publicAnonKey } from './utils/supabase/info';
import { LoginPage } from './components/LoginPage';
import { Dashboard } from './components/Dashboard';
import { ParentsPage } from './components/ParentsPage';
import { ElevesPage } from './components/ElevesPage';
import { FraisPage } from './components/FraisPage';
import { RappelsPage } from './components/RappelsPage';
import { ConfigPage } from './components/ConfigPage';
import { 
  LayoutDashboard, 
  Users, 
  GraduationCap, 
  Euro, 
  Bell, 
  Settings,
  LogOut
} from 'lucide-react';

interface Admin {
  id: string;
  name: string;
  email: string;
}

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing session
    const token = localStorage.getItem('sra_session_token');
    const adminData = localStorage.getItem('sra_admin');
    
    if (token && adminData) {
      setSessionToken(token);
      setAdmin(JSON.parse(adminData));
      setIsAuthenticated(true);
    }
    setLoading(false);
  }, []);

  const handleLogin = (token: string, adminData: Admin) => {
    localStorage.setItem('sra_session_token', token);
    localStorage.setItem('sra_admin', JSON.stringify(adminData));
    setSessionToken(token);
    setAdmin(adminData);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('sra_session_token');
    localStorage.removeItem('sra_admin');
    setSessionToken(null);
    setAdmin(null);
    setIsAuthenticated(false);
    setCurrentPage('dashboard');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage onLogin={handleLogin} />;
  }

  const menuItems = [
    { id: 'dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
    { id: 'parents', label: 'Parents', icon: Users },
    { id: 'eleves', label: 'Élèves', icon: GraduationCap },
    { id: 'frais', label: 'Frais & Paiements', icon: Euro },
    { id: 'rappels', label: 'Rappels', icon: Bell },
    { id: 'config', label: 'Configuration', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <div className="w-64 bg-white shadow-lg flex flex-col">
        <div className="p-6 border-b border-gray-200">
          <h1 className="text-xl text-indigo-600 mb-1">SRA - École</h1>
          <p className="text-sm text-gray-500">Système de Rappel Automatisé</p>
        </div>

        <nav className="flex-1 p-4">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setCurrentPage(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg mb-2 transition-colors ${
                  currentPage === item.id
                    ? 'bg-indigo-50 text-indigo-600'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-200">
          <div className="px-4 py-2 mb-2">
            <p className="text-sm text-gray-900">{admin?.name}</p>
            <p className="text-xs text-gray-500">{admin?.email}</p>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-red-600 hover:bg-red-50 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span>Déconnexion</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <div className="p-8">
          {currentPage === 'dashboard' && <Dashboard sessionToken={sessionToken!} />}
          {currentPage === 'parents' && <ParentsPage sessionToken={sessionToken!} />}
          {currentPage === 'eleves' && <ElevesPage sessionToken={sessionToken!} />}
          {currentPage === 'frais' && <FraisPage sessionToken={sessionToken!} />}
          {currentPage === 'rappels' && <RappelsPage sessionToken={sessionToken!} />}
          {currentPage === 'config' && <ConfigPage sessionToken={sessionToken!} />}
        </div>
      </div>
    </div>
  );
}
