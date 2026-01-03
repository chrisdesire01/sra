import React, { useState, useEffect } from 'react';
import { projectId } from '../utils/supabase/info';
import { Mail, MessageSquare, Filter, Calendar, User } from 'lucide-react';

interface RappelsPageProps {
  sessionToken: string;
}

interface Rappel {
  id: string;
  frais_id: string;
  echeance_id: string;
  eleve_id: string;
  parent_id: string;
  type: 'preventif' | 'jour_j' | 'retard_3' | 'retard_7';
  date_envoi: string;
  canaux: Array<{
    type: 'email' | 'sms';
    destinataire: string;
    statut: string;
    sujet?: string;
    contenu: string;
  }>;
  statut: string;
}

interface Eleve {
  id: string;
  nom: string;
  prenom: string;
  classe: string;
}

interface Parent {
  id: string;
  nom: string;
  prenom: string;
}

export function RappelsPage({ sessionToken }: RappelsPageProps) {
  const [rappels, setRappels] = useState<Rappel[]>([]);
  const [eleves, setEleves] = useState<Eleve[]>([]);
  const [parents, setParents] = useState<Parent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>('all');
  const [selectedRappel, setSelectedRappel] = useState<Rappel | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [rappelsRes, elevesRes, parentsRes] = await Promise.all([
        fetch(`https://${projectId}.supabase.co/functions/v1/make-server-bc1abfbf/rappels`, {
          headers: { 'Authorization': `Bearer ${sessionToken}` }
        }),
        fetch(`https://${projectId}.supabase.co/functions/v1/make-server-bc1abfbf/eleves`, {
          headers: { 'Authorization': `Bearer ${sessionToken}` }
        }),
        fetch(`https://${projectId}.supabase.co/functions/v1/make-server-bc1abfbf/parents`, {
          headers: { 'Authorization': `Bearer ${sessionToken}` }
        })
      ]);

      const rappelsData = await rappelsRes.json();
      const elevesData = await elevesRes.json();
      const parentsData = await parentsRes.json();

      if (rappelsRes.ok) setRappels(rappelsData.rappels || []);
      if (elevesRes.ok) setEleves(elevesData.eleves || []);
      if (parentsRes.ok) setParents(parentsData.parents || []);
    } catch (error) {
      console.error('Erreur lors du chargement:', error);
    } finally {
      setLoading(false);
    }
  };

  const getEleveName = (eleveId: string) => {
    const eleve = eleves.find(e => e.id === eleveId);
    return eleve ? `${eleve.prenom} ${eleve.nom}` : 'Inconnu';
  };

  const getParentName = (parentId: string) => {
    const parent = parents.find(p => p.id === parentId);
    return parent ? `${parent.prenom} ${parent.nom}` : 'Inconnu';
  };

  const getTypeLabel = (type: string) => {
    const labels = {
      preventif: 'Préventif (J-10)',
      jour_j: 'Jour J',
      retard_3: 'Retard 3j',
      retard_7: 'Avertissement 7j'
    };
    return labels[type] || type;
  };

  const getTypeColor = (type: string) => {
    const colors = {
      preventif: 'bg-blue-100 text-blue-700',
      jour_j: 'bg-yellow-100 text-yellow-700',
      retard_3: 'bg-orange-100 text-orange-700',
      retard_7: 'bg-red-100 text-red-700'
    };
    return colors[type] || 'bg-gray-100 text-gray-700';
  };

  const filteredRappels = rappels.filter(r => 
    filterType === 'all' || r.type === filterType
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl text-gray-900 mb-2">Journal des Rappels</h1>
          <p className="text-gray-600">{rappels.length} rappel(s) envoyé(s)</p>
        </div>
      </div>

      {/* Filter */}
      <div className="mb-6 flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-gray-500" />
          <span className="text-sm text-gray-700">Filtrer par type:</span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setFilterType('all')}
            className={`px-4 py-2 rounded-lg text-sm transition-colors ${
              filterType === 'all'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Tous
          </button>
          <button
            onClick={() => setFilterType('preventif')}
            className={`px-4 py-2 rounded-lg text-sm transition-colors ${
              filterType === 'preventif'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Préventif
          </button>
          <button
            onClick={() => setFilterType('jour_j')}
            className={`px-4 py-2 rounded-lg text-sm transition-colors ${
              filterType === 'jour_j'
                ? 'bg-yellow-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Jour J
          </button>
          <button
            onClick={() => setFilterType('retard_3')}
            className={`px-4 py-2 rounded-lg text-sm transition-colors ${
              filterType === 'retard_3'
                ? 'bg-orange-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Retard 3j
          </button>
          <button
            onClick={() => setFilterType('retard_7')}
            className={`px-4 py-2 rounded-lg text-sm transition-colors ${
              filterType === 'retard_7'
                ? 'bg-red-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Avertissement
          </button>
        </div>
      </div>

      {/* Rappels List */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      ) : filteredRappels.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center border border-gray-200">
          <p className="text-gray-500">
            {filterType === 'all' 
              ? 'Aucun rappel envoyé' 
              : `Aucun rappel de type "${getTypeLabel(filterType)}"`}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredRappels.map((rappel) => (
            <div key={rappel.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm ${getTypeColor(rappel.type)}`}>
                      {getTypeLabel(rappel.type)}
                    </span>
                    <span className="text-sm text-gray-500">
                      <Calendar className="w-4 h-4 inline mr-1" />
                      {new Date(rappel.date_envoi).toLocaleString('fr-FR')}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <User className="w-4 h-4" />
                      <span>Élève: {getEleveName(rappel.eleve_id)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <User className="w-4 h-4" />
                      <span>Parent: {getParentName(rappel.parent_id)}</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedRappel(selectedRappel?.id === rappel.id ? null : rappel)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
                >
                  {selectedRappel?.id === rappel.id ? 'Masquer' : 'Détails'}
                </button>
              </div>

              {/* Canaux */}
              <div className="flex gap-3">
                {rappel.canaux.map((canal, idx) => (
                  <div key={idx} className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg">
                    {canal.type === 'email' ? (
                      <Mail className="w-4 h-4 text-blue-600" />
                    ) : (
                      <MessageSquare className="w-4 h-4 text-green-600" />
                    )}
                    <span className="text-sm text-gray-700">
                      {canal.type === 'email' ? 'Email' : 'SMS'}: {canal.destinataire}
                    </span>
                  </div>
                ))}
              </div>

              {/* Details */}
              {selectedRappel?.id === rappel.id && (
                <div className="mt-4 pt-4 border-t border-gray-200 space-y-4">
                  {rappel.canaux.map((canal, idx) => (
                    <div key={idx} className="p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        {canal.type === 'email' ? (
                          <Mail className="w-5 h-5 text-blue-600" />
                        ) : (
                          <MessageSquare className="w-5 h-5 text-green-600" />
                        )}
                        <h4 className="text-sm text-gray-900">
                          {canal.type === 'email' ? 'Email' : 'SMS'}
                        </h4>
                      </div>
                      
                      <p className="text-xs text-gray-600 mb-2">
                        Destinataire: {canal.destinataire}
                      </p>
                      
                      {canal.sujet && (
                        <p className="text-sm text-gray-900 mb-2">
                          <strong>Sujet:</strong> {canal.sujet}
                        </p>
                      )}
                      
                      <div className="p-3 bg-white rounded border border-gray-200">
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">
                          {canal.contenu}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {rappels.length > 0 && (
        <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            💡 <strong>Note:</strong> Les rappels sont envoyés automatiquement selon les règles configurées. 
            Vous pouvez ajuster ces règles dans la section Configuration.
          </p>
        </div>
      )}
    </div>
  );
}