import React, { useState, useEffect } from 'react';
import { projectId } from '../utils/supabase/info';
import { 
  Users, 
  GraduationCap, 
  Euro, 
  TrendingUp, 
  AlertTriangle,
  CheckCircle,
  Clock,
  Bell,
  RefreshCw
} from 'lucide-react';

interface DashboardProps {
  sessionToken: string;
}

interface Stats {
  total_parents: number;
  total_eleves: number;
  total_du: number;
  total_paye: number;
  total_impaye: number;
  echeances_en_attente: number;
  echeances_en_retard: number;
  echeances_paye: number;
  rappels_envoyes: number;
  rappels_dernier_mois: number;
}

export function Dashboard({ sessionToken }: DashboardProps) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-bc1abfbf/stats`,
        {
          headers: {
            'Authorization': `Bearer ${sessionToken}`
          }
        }
      );

      const data = await response.json();
      if (response.ok) {
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des statistiques:', error);
    } finally {
      setLoading(false);
    }
  };

  const processRappels = async () => {
    setProcessing(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-bc1abfbf/rappels/process`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${sessionToken}`
          }
        }
      );

      const data = await response.json();
      if (response.ok) {
        alert(`Traitement terminé! ${data.sent.length} rappel(s) envoyé(s).`);
        loadStats();
      } else {
        alert('Erreur lors du traitement des rappels: ' + data.error);
      }
    } catch (error) {
      console.error('Erreur lors du traitement des rappels:', error);
      alert('Erreur lors du traitement des rappels');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Impossible de charger les statistiques</p>
      </div>
    );
  }

  const tauxPaiement = stats.total_du > 0 
    ? (stats.total_paye / stats.total_du * 100).toFixed(1)
    : 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl text-gray-900 mb-2">Tableau de bord</h1>
          <p className="text-gray-600">Vue d'ensemble de la gestion des frais scolaires</p>
        </div>
        <button
          onClick={processRappels}
          disabled={processing}
          className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
        >
          {processing ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              Traitement...
            </>
          ) : (
            <>
              <RefreshCw className="w-5 h-5" />
              Traiter les rappels
            </>
          )}
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          icon={Users}
          label="Parents"
          value={stats.total_parents}
          color="blue"
        />
        <StatCard
          icon={GraduationCap}
          label="Élèves"
          value={stats.total_eleves}
          color="purple"
        />
        <StatCard
          icon={Bell}
          label="Rappels envoyés"
          value={stats.rappels_envoyes}
          color="indigo"
          subtitle={`${stats.rappels_dernier_mois} ce mois`}
        />
        <StatCard
          icon={TrendingUp}
          label="Taux de paiement"
          value={`${tauxPaiement}%`}
          color="green"
        />
      </div>

      {/* Financial Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Euro className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total dû</p>
              <p className="text-2xl text-gray-900">
                {stats.total_du.toLocaleString('fr-FR')} €
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-green-100 rounded-lg">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total payé</p>
              <p className="text-2xl text-gray-900">
                {stats.total_paye.toLocaleString('fr-FR')} €
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-red-100 rounded-lg">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total impayé</p>
              <p className="text-2xl text-gray-900">
                {stats.total_impaye.toLocaleString('fr-FR')} €
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Status */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
        <h2 className="text-xl text-gray-900 mb-6">État des échéances</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-100 rounded-lg">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Payées</p>
              <p className="text-2xl text-gray-900">{stats.echeances_paye}</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="p-3 bg-yellow-100 rounded-lg">
              <Clock className="w-8 h-8 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">En attente</p>
              <p className="text-2xl text-gray-900">{stats.echeances_en_attente}</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="p-3 bg-red-100 rounded-lg">
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">En retard</p>
              <p className="text-2xl text-gray-900">{stats.echeances_en_retard}</p>
            </div>
          </div>
        </div>

        {stats.echeances_en_retard > 0 && (
          <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-800">
              ⚠️ <strong>Attention:</strong> {stats.echeances_en_retard} échéance(s) en retard nécessitent votre attention.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

interface StatCardProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  color: 'blue' | 'purple' | 'indigo' | 'green';
  subtitle?: string;
}

function StatCard({ icon: Icon, label, value, color, subtitle }: StatCardProps) {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600',
    purple: 'bg-purple-100 text-purple-600',
    indigo: 'bg-indigo-100 text-indigo-600',
    green: 'bg-green-100 text-green-600'
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
      <div className="flex items-center gap-4">
        <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
          <Icon className="w-6 h-6" />
        </div>
        <div className="flex-1">
          <p className="text-sm text-gray-600">{label}</p>
          <p className="text-2xl text-gray-900">{value}</p>
          {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
        </div>
      </div>
    </div>
  );
}