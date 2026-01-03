import React, { useState, useEffect } from 'react';
import { projectId } from '../utils/supabase/info';
import { Plus, Search, Euro, CheckCircle, AlertTriangle, Clock, X, Trash2 } from 'lucide-react';

interface FraisPageProps {
  sessionToken: string;
}

interface Echeance {
  id: string;
  date: string;
  montant: number;
  statut: 'en_attente' | 'paye' | 'en_retard';
  date_paiement?: string;
}

interface Frais {
  id: string;
  eleve_id: string;
  annee_scolaire: string;
  montant_total: number;
  montant_verse: number;
  echeances: Echeance[];
  created_at: string;
}

interface Eleve {
  id: string;
  nom: string;
  prenom: string;
  classe: string;
  parent_id: string;
}

interface Parent {
  id: string;
  nom: string;
  prenom: string;
}

export function FraisPage({ sessionToken }: FraisPageProps) {
  const [frais, setFrais] = useState<Frais[]>([]);
  const [eleves, setEleves] = useState<Eleve[]>([]);
  const [parents, setParents] = useState<Parent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showPaiementModal, setShowPaiementModal] = useState(false);
  const [selectedFrais, setSelectedFrais] = useState<Frais | null>(null);
  const [selectedEcheance, setSelectedEcheance] = useState<Echeance | null>(null);
  const [formData, setFormData] = useState({
    eleve_id: '',
    annee_scolaire: '2025-2026',
    montant_total: '',
    nb_echeances: '3',
    date_premiere_echeance: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [fraisRes, elevesRes, parentsRes] = await Promise.all([
        fetch(`https://${projectId}.supabase.co/functions/v1/make-server-bc1abfbf/frais`, {
          headers: { 'Authorization': `Bearer ${sessionToken}` }
        }),
        fetch(`https://${projectId}.supabase.co/functions/v1/make-server-bc1abfbf/eleves`, {
          headers: { 'Authorization': `Bearer ${sessionToken}` }
        }),
        fetch(`https://${projectId}.supabase.co/functions/v1/make-server-bc1abfbf/parents`, {
          headers: { 'Authorization': `Bearer ${sessionToken}` }
        })
      ]);

      const fraisData = await fraisRes.json();
      const elevesData = await elevesRes.json();
      const parentsData = await parentsRes.json();

      if (fraisRes.ok) setFrais(fraisData.frais || []);
      if (elevesRes.ok) setEleves(elevesData.eleves || []);
      if (parentsRes.ok) setParents(parentsData.parents || []);
    } catch (error) {
      console.error('Erreur lors du chargement:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const montantTotal = parseFloat(formData.montant_total);
      const nbEcheances = parseInt(formData.nb_echeances);
      const montantParEcheance = montantTotal / nbEcheances;
      
      const premiereDateDate = new Date(formData.date_premiere_echeance);
      const echeances = [];
      
      for (let i = 0; i < nbEcheances; i++) {
        const dateEcheance = new Date(premiereDateDate);
        dateEcheance.setMonth(dateEcheance.getMonth() + i);
        
        echeances.push({
          date: dateEcheance.toISOString().split('T')[0],
          montant: montantParEcheance
        });
      }

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-bc1abfbf/frais`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${sessionToken}`
          },
          body: JSON.stringify({
            eleve_id: formData.eleve_id,
            annee_scolaire: formData.annee_scolaire,
            montant_total: montantTotal,
            echeances
          })
        }
      );

      const data = await response.json();
      
      if (response.ok) {
        loadData();
        closeModal();
      } else {
        alert('Erreur: ' + data.error);
      }
    } catch (error) {
      console.error('Erreur lors de la création:', error);
      alert('Erreur lors de la création');
    }
  };

  const handlePaiement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFrais || !selectedEcheance) return;

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-bc1abfbf/frais/${selectedFrais.id}/paiement`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${sessionToken}`
          },
          body: JSON.stringify({
            echeance_id: selectedEcheance.id,
            montant: selectedEcheance.montant
          })
        }
      );

      const data = await response.json();
      
      if (response.ok) {
        loadData();
        closePaiementModal();
      } else {
        alert('Erreur: ' + data.error);
      }
    } catch (error) {
      console.error('Erreur lors du paiement:', error);
      alert('Erreur lors du paiement');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ces frais ?')) return;

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-bc1abfbf/frais/${id}`,
        {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${sessionToken}` }
        }
      );

      if (response.ok) {
        loadData();
      }
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
    }
  };

  const openModal = () => {
    setFormData({
      eleve_id: '',
      annee_scolaire: '2025-2026',
      montant_total: '',
      nb_echeances: '3',
      date_premiere_echeance: ''
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
  };

  const openPaiementModal = (frais: Frais, echeance: Echeance) => {
    setSelectedFrais(frais);
    setSelectedEcheance(echeance);
    setShowPaiementModal(true);
  };

  const closePaiementModal = () => {
    setShowPaiementModal(false);
    setSelectedFrais(null);
    setSelectedEcheance(null);
  };

  const getEleveInfo = (eleveId: string) => {
    const eleve = eleves.find(e => e.id === eleveId);
    if (!eleve) return { nom: 'Inconnu', parent: 'Inconnu' };
    
    const parent = parents.find(p => p.id === eleve.parent_id);
    return {
      nom: `${eleve.prenom} ${eleve.nom}`,
      classe: eleve.classe,
      parent: parent ? `${parent.prenom} ${parent.nom}` : 'Inconnu'
    };
  };

  const getStatusBadge = (echeance: Echeance) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const echeanceDate = new Date(echeance.date);
    echeanceDate.setHours(0, 0, 0, 0);

    if (echeance.statut === 'paye') {
      return (
        <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">
          <CheckCircle className="w-4 h-4" />
          Payé
        </span>
      );
    } else if (echeanceDate < today) {
      return (
        <span className="inline-flex items-center gap-1 px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm">
          <AlertTriangle className="w-4 h-4" />
          En retard
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center gap-1 px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-sm">
          <Clock className="w-4 h-4" />
          En attente
        </span>
      );
    }
  };

  const filteredFrais = frais.filter(f => {
    const info = getEleveInfo(f.eleve_id);
    return `${info.nom} ${info.classe} ${info.parent} ${f.annee_scolaire}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl text-gray-900 mb-2">Frais & Paiements</h1>
          <p className="text-gray-600">{frais.length} dossier(s) de frais</p>
        </div>
        <button
          onClick={openModal}
          disabled={eleves.length === 0}
          className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title={eleves.length === 0 ? 'Ajoutez d\'abord des élèves' : ''}
        >
          <Plus className="w-5 h-5" />
          Créer des frais
        </button>
      </div>

      {eleves.length === 0 && (
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800">
            ⚠️ Vous devez d'abord ajouter des élèves avant de créer des frais.
          </p>
        </div>
      )}

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Rechercher des frais..."
            className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Frais List */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      ) : filteredFrais.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center border border-gray-200">
          <p className="text-gray-500">
            {searchTerm ? 'Aucun frais trouvé' : 'Aucun frais enregistré'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredFrais.map((f) => {
            const info = getEleveInfo(f.eleve_id);
            const solde = f.montant_total - f.montant_verse;
            
            return (
              <div key={f.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-xl text-gray-900 mb-1">
                      {info.nom} - {info.classe}
                    </h3>
                    <p className="text-sm text-gray-500">Parent: {info.parent}</p>
                    <p className="text-sm text-gray-500">Année: {f.annee_scolaire}</p>
                  </div>
                  <button
                    onClick={() => handleDelete(f.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Supprimer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-4 mb-4 p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Total</p>
                    <p className="text-xl text-gray-900">{f.montant_total.toFixed(2)} €</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Versé</p>
                    <p className="text-xl text-green-600">{f.montant_verse.toFixed(2)} €</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Solde</p>
                    <p className={`text-xl ${solde > 0 ? 'text-red-600' : 'text-gray-900'}`}>
                      {solde.toFixed(2)} €
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-sm text-gray-700 mb-2">Échéances:</p>
                  {f.echeances.map((echeance) => (
                    <div key={echeance.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-4">
                        <Euro className="w-5 h-5 text-gray-400" />
                        <div>
                          <p className="text-sm text-gray-900">
                            {new Date(echeance.date).toLocaleDateString('fr-FR')}
                          </p>
                          <p className="text-xs text-gray-500">
                            {echeance.montant.toFixed(2)} €
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {getStatusBadge(echeance)}
                        {echeance.statut !== 'paye' && (
                          <button
                            onClick={() => openPaiementModal(f, echeance)}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                          >
                            Marquer payé
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl text-gray-900">Créer des frais</h2>
              <button onClick={closeModal} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-700 mb-2">Élève *</label>
                <select
                  value={formData.eleve_id}
                  onChange={(e) => setFormData({ ...formData, eleve_id: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  required
                >
                  <option value="">Sélectionner un élève</option>
                  {eleves.map((eleve) => (
                    <option key={eleve.id} value={eleve.id}>
                      {eleve.prenom} {eleve.nom} - {eleve.classe}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm text-gray-700 mb-2">Année scolaire *</label>
                <input
                  type="text"
                  value={formData.annee_scolaire}
                  onChange={(e) => setFormData({ ...formData, annee_scolaire: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm text-gray-700 mb-2">Montant total (€) *</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.montant_total}
                  onChange={(e) => setFormData({ ...formData, montant_total: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm text-gray-700 mb-2">Nombre d'échéances *</label>
                <select
                  value={formData.nb_echeances}
                  onChange={(e) => setFormData({ ...formData, nb_echeances: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  required
                >
                  <option value="1">1 échéance</option>
                  <option value="2">2 échéances</option>
                  <option value="3">3 échéances</option>
                  <option value="4">4 échéances</option>
                  <option value="6">6 échéances</option>
                  <option value="10">10 échéances</option>
                </select>
              </div>

              <div>
                <label className="block text-sm text-gray-700 mb-2">Date première échéance *</label>
                <input
                  type="date"
                  value={formData.date_premiere_echeance}
                  onChange={(e) => setFormData({ ...formData, date_premiere_echeance: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  required
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  Créer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Paiement Modal */}
      {showPaiementModal && selectedFrais && selectedEcheance && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl text-gray-900">Confirmer le paiement</h2>
              <button onClick={closePaiementModal} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handlePaiement} className="space-y-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-gray-700 mb-2">
                  <strong>Élève:</strong> {getEleveInfo(selectedFrais.eleve_id).nom}
                </p>
                <p className="text-sm text-gray-700 mb-2">
                  <strong>Date échéance:</strong> {new Date(selectedEcheance.date).toLocaleDateString('fr-FR')}
                </p>
                <p className="text-sm text-gray-700">
                  <strong>Montant:</strong> {selectedEcheance.montant.toFixed(2)} €
                </p>
              </div>

              <p className="text-sm text-gray-600">
                Confirmez-vous que ce paiement a été reçu ?
              </p>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={closePaiementModal}
                  className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  Confirmer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}