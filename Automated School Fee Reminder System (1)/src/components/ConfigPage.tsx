import React, { useState, useEffect } from 'react';
import { projectId } from '../utils/supabase/info';
import { Settings, Save, AlertCircle, CheckCircle } from 'lucide-react';

interface ConfigPageProps {
  sessionToken: string;
}

interface Config {
  preventif: number;
  jour_j: number;
  retard_3: number;
  retard_7: number;
}

export function ConfigPage({ sessionToken }: ConfigPageProps) {
  const [config, setConfig] = useState<Config>({
    preventif: -10,
    jour_j: 0,
    retard_3: 3,
    retard_7: 7
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-bc1abfbf/config/regles`,
        {
          headers: { 'Authorization': `Bearer ${sessionToken}` }
        }
      );

      const data = await response.json();
      if (response.ok && data.config) {
        setConfig(data.config);
      }
    } catch (error) {
      console.error('Erreur lors du chargement de la configuration:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-bc1abfbf/config/regles`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${sessionToken}`
          },
          body: JSON.stringify(config)
        }
      );

      const data = await response.json();
      
      if (response.ok) {
        setMessage({ type: 'success', text: 'Configuration enregistrée avec succès!' });
        setTimeout(() => setMessage(null), 3000);
      } else {
        setMessage({ type: 'error', text: 'Erreur lors de l\'enregistrement: ' + data.error });
      }
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      setMessage({ type: 'error', text: 'Erreur lors de l\'enregistrement' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl text-gray-900 mb-2">Configuration des Rappels</h1>
        <p className="text-gray-600">Définissez les règles d'envoi automatique des rappels</p>
      </div>

      <div className="max-w-3xl">
        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          <div className="flex items-center gap-3 mb-6 pb-6 border-b border-gray-200">
            <div className="p-3 bg-indigo-100 rounded-lg">
              <Settings className="w-6 h-6 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-xl text-gray-900">Règles de Rappel</h2>
              <p className="text-sm text-gray-600">
                Configurez les délais d'envoi des rappels par rapport aux échéances
              </p>
            </div>
          </div>

          <div className="space-y-6">
            {/* Rappel Préventif */}
            <div className="p-5 border-2 border-blue-200 bg-blue-50 rounded-lg">
              <label className="block text-sm text-gray-900 mb-2">
                <strong>Rappel Préventif</strong>
              </label>
              <p className="text-sm text-gray-600 mb-3">
                Nombre de jours <strong>avant</strong> l'échéance pour envoyer un rappel préventif
              </p>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  value={Math.abs(config.preventif)}
                  onChange={(e) => setConfig({ ...config, preventif: -Math.abs(parseInt(e.target.value)) })}
                  className="w-32 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  min="1"
                  max="30"
                  required
                />
                <span className="text-gray-700">jours avant l'échéance</span>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Exemple: 10 jours = rappel envoyé le {new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toLocaleDateString('fr-FR')} 
                pour une échéance du {new Date().toLocaleDateString('fr-FR')}
              </p>
            </div>

            {/* Rappel Jour J */}
            <div className="p-5 border-2 border-yellow-200 bg-yellow-50 rounded-lg">
              <label className="block text-sm text-gray-900 mb-2">
                <strong>Rappel Jour J</strong>
              </label>
              <p className="text-sm text-gray-600 mb-3">
                Rappel envoyé le jour même de l'échéance
              </p>
              <div className="flex items-center gap-3">
                <div className="px-4 py-3 bg-gray-100 rounded-lg">
                  <span className="text-gray-700">Le jour de l'échéance</span>
                </div>
                <span className="text-gray-500">(jour 0)</span>
              </div>
            </div>

            {/* Rappel Retard 3 jours */}
            <div className="p-5 border-2 border-orange-200 bg-orange-50 rounded-lg">
              <label className="block text-sm text-gray-900 mb-2">
                <strong>Rappel de Retard (1er niveau)</strong>
              </label>
              <p className="text-sm text-gray-600 mb-3">
                Nombre de jours <strong>après</strong> l'échéance pour le 1er rappel de retard
              </p>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  value={config.retard_3}
                  onChange={(e) => setConfig({ ...config, retard_3: parseInt(e.target.value) })}
                  className="w-32 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  min="1"
                  max="30"
                  required
                />
                <span className="text-gray-700">jours après l'échéance</span>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Exemple: 3 jours = rappel envoyé le {new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toLocaleDateString('fr-FR')} 
                pour une échéance du {new Date().toLocaleDateString('fr-FR')}
              </p>
            </div>

            {/* Rappel Retard 7 jours */}
            <div className="p-5 border-2 border-red-200 bg-red-50 rounded-lg">
              <label className="block text-sm text-gray-900 mb-2">
                <strong>Avertissement (2ème niveau)</strong>
              </label>
              <p className="text-sm text-gray-600 mb-3">
                Nombre de jours <strong>après</strong> l'échéance pour l'avertissement
              </p>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  value={config.retard_7}
                  onChange={(e) => setConfig({ ...config, retard_7: parseInt(e.target.value) })}
                  className="w-32 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  min="1"
                  max="30"
                  required
                />
                <span className="text-gray-700">jours après l'échéance</span>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Exemple: 7 jours = avertissement envoyé le {new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString('fr-FR')} 
                pour une échéance du {new Date().toLocaleDateString('fr-FR')}
              </p>
            </div>
          </div>

          {/* Message */}
          {message && (
            <div className={`mt-6 p-4 rounded-lg flex items-center gap-3 ${
              message.type === 'success' 
                ? 'bg-green-50 border border-green-200' 
                : 'bg-red-50 border border-red-200'
            }`}>
              {message.type === 'success' ? (
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
              )}
              <p className={`text-sm ${message.type === 'success' ? 'text-green-800' : 'text-red-800'}`}>
                {message.text}
              </p>
            </div>
          )}

          {/* Submit Button */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-8 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Enregistrement...
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  Enregistrer la configuration
                </>
              )}
            </button>
          </div>
        </form>

        {/* Info Panel */}
        <div className="mt-6 p-6 bg-blue-50 border border-blue-200 rounded-xl">
          <h3 className="text-lg text-gray-900 mb-3">ℹ️ Comment ça fonctionne ?</h3>
          <ul className="space-y-2 text-sm text-gray-700">
            <li className="flex gap-2">
              <span className="text-blue-600">•</span>
              <span>
                Les rappels sont envoyés automatiquement selon les règles configurées ci-dessus
              </span>
            </li>
            <li className="flex gap-2">
              <span className="text-blue-600">•</span>
              <span>
                Cliquez sur "Traiter les rappels" dans le tableau de bord pour vérifier et envoyer les rappels du jour
              </span>
            </li>
            <li className="flex gap-2">
              <span className="text-blue-600">•</span>
              <span>
                Les rappels sont envoyés par email (si renseigné) et SMS (si renseigné)
              </span>
            </li>
            <li className="flex gap-2">
              <span className="text-blue-600">•</span>
              <span>
                Un même rappel n'est envoyé qu'une seule fois par jour pour chaque échéance
              </span>
            </li>
            <li className="flex gap-2">
              <span className="text-blue-600">•</span>
              <span>
                Les rappels déjà payés ne sont pas envoyés
              </span>
            </li>
          </ul>
        </div>

        {/* Warning Panel */}
        <div className="mt-6 p-6 bg-yellow-50 border border-yellow-200 rounded-xl">
          <h3 className="text-lg text-gray-900 mb-3">⚠️ Important - Environnement de Prototype</h3>
          <p className="text-sm text-gray-700 mb-3">
            Cette application est un prototype. Les emails et SMS ne sont <strong>pas réellement envoyés</strong>. 
          </p>
          <p className="text-sm text-gray-700">
            Pour une mise en production, vous devrez intégrer des services tiers comme:
          </p>
          <ul className="mt-2 space-y-1 text-sm text-gray-700 ml-4">
            <li>• <strong>Email:</strong> SendGrid, Mailgun, AWS SES, Brevo (ex-Sendinblue)</li>
            <li>• <strong>SMS:</strong> Twilio, Vonage (ex-Nexmo), OVH SMS</li>
          </ul>
        </div>
      </div>
    </div>
  );
}