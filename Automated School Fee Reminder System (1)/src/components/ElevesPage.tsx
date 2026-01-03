import React, { useState, useEffect } from 'react';
import { projectId } from '../utils/supabase/info';
import { Plus, Search, Edit2, Trash2, X, User } from 'lucide-react';

interface ElevesPageProps {
  sessionToken: string;
}

interface Eleve {
  id: string;
  nom: string;
  prenom: string;
  classe: string;
  parent_id: string;
  created_at: string;
}

interface Parent {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  tel: string;
}

export function ElevesPage({ sessionToken }: ElevesPageProps) {
  const [eleves, setEleves] = useState<Eleve[]>([]);
  const [parents, setParents] = useState<Parent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingEleve, setEditingEleve] = useState<Eleve | null>(null);
  const [formData, setFormData] = useState({
    nom: '',
    prenom: '',
    classe: '',
    parent_id: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [elevesRes, parentsRes] = await Promise.all([
        fetch(`https://${projectId}.supabase.co/functions/v1/make-server-bc1abfbf/eleves`, {
          headers: { 'Authorization': `Bearer ${sessionToken}` }
        }),
        fetch(`https://${projectId}.supabase.co/functions/v1/make-server-bc1abfbf/parents`, {
          headers: { 'Authorization': `Bearer ${sessionToken}` }
        })
      ]);

      const elevesData = await elevesRes.json();
      const parentsData = await parentsRes.json();

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
      const url = editingEleve
        ? `https://${projectId}.supabase.co/functions/v1/make-server-bc1abfbf/eleves/${editingEleve.id}`
        : `https://${projectId}.supabase.co/functions/v1/make-server-bc1abfbf/eleves`;

      const response = await fetch(url, {
        method: editingEleve ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionToken}`
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();
      
      if (response.ok) {
        loadData();
        closeModal();
      } else {
        alert('Erreur: ' + data.error);
      }
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      alert('Erreur lors de la sauvegarde');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet élève ?')) return;

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-bc1abfbf/eleves/${id}`,
        {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${sessionToken}` }
        }
      );

      const data = await response.json();
      
      if (response.ok) {
        loadData();
      } else {
        alert('Erreur: ' + data.error);
      }
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      alert('Erreur lors de la suppression');
    }
  };

  const openModal = (eleve?: Eleve) => {
    if (eleve) {
      setEditingEleve(eleve);
      setFormData({
        nom: eleve.nom,
        prenom: eleve.prenom,
        classe: eleve.classe,
        parent_id: eleve.parent_id
      });
    } else {
      setEditingEleve(null);
      setFormData({ nom: '', prenom: '', classe: '', parent_id: '' });
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingEleve(null);
    setFormData({ nom: '', prenom: '', classe: '', parent_id: '' });
  };

  const getParentName = (parentId: string) => {
    const parent = parents.find(p => p.id === parentId);
    return parent ? `${parent.prenom} ${parent.nom}` : 'Parent inconnu';
  };

  const filteredEleves = eleves.filter(eleve => {
    const parentName = getParentName(eleve.parent_id);
    return `${eleve.nom} ${eleve.prenom} ${eleve.classe} ${parentName}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl text-gray-900 mb-2">Gestion des Élèves</h1>
          <p className="text-gray-600">{eleves.length} élève(s) enregistré(s)</p>
        </div>
        <button
          onClick={() => openModal()}
          disabled={parents.length === 0}
          className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title={parents.length === 0 ? 'Ajoutez d\'abord un parent' : ''}
        >
          <Plus className="w-5 h-5" />
          Ajouter un élève
        </button>
      </div>

      {parents.length === 0 && (
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800">
            ⚠️ Vous devez d'abord ajouter des parents avant de pouvoir créer des élèves.
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
            placeholder="Rechercher un élève..."
            className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Eleves Table */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      ) : filteredEleves.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center border border-gray-200">
          <p className="text-gray-500">
            {searchTerm ? 'Aucun élève trouvé' : 'Aucun élève enregistré'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-sm text-gray-600">Nom</th>
                <th className="px-6 py-4 text-left text-sm text-gray-600">Prénom</th>
                <th className="px-6 py-4 text-left text-sm text-gray-600">Classe</th>
                <th className="px-6 py-4 text-left text-sm text-gray-600">Parent</th>
                <th className="px-6 py-4 text-right text-sm text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredEleves.map((eleve) => (
                <tr key={eleve.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 text-gray-900">{eleve.nom}</td>
                  <td className="px-6 py-4 text-gray-900">{eleve.prenom}</td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm">
                      {eleve.classe}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-gray-600">
                      <User className="w-4 h-4" />
                      {getParentName(eleve.parent_id)}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openModal(eleve)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Modifier"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(eleve.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Supprimer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl text-gray-900">
                {editingEleve ? 'Modifier l\'élève' : 'Nouvel élève'}
              </h2>
              <button
                onClick={closeModal}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-700 mb-2">
                  Nom *
                </label>
                <input
                  type="text"
                  value={formData.nom}
                  onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm text-gray-700 mb-2">
                  Prénom *
                </label>
                <input
                  type="text"
                  value={formData.prenom}
                  onChange={(e) => setFormData({ ...formData, prenom: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm text-gray-700 mb-2">
                  Classe *
                </label>
                <input
                  type="text"
                  value={formData.classe}
                  onChange={(e) => setFormData({ ...formData, classe: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="6ème A, CM2, etc."
                  required
                />
              </div>

              <div>
                <label className="block text-sm text-gray-700 mb-2">
                  Parent *
                </label>
                <select
                  value={formData.parent_id}
                  onChange={(e) => setFormData({ ...formData, parent_id: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  required
                >
                  <option value="">Sélectionner un parent</option>
                  {parents.map((parent) => (
                    <option key={parent.id} value={parent.id}>
                      {parent.prenom} {parent.nom}
                    </option>
                  ))}
                </select>
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
                  {editingEleve ? 'Modifier' : 'Créer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}