import { Hono } from 'npm:hono';
import { cors } from 'npm:hono/cors';
import { logger } from 'npm:hono/logger';
import { createClient } from 'npm:@supabase/supabase-js@2';
import * as kv from './kv_store.tsx';

const app = new Hono();

app.use('*', cors());
app.use('*', logger(console.log));

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

// Utility function to hash passwords (simple implementation)
async function hashPassword(password: string): Promise<string> {
  const msgUint8 = new TextEncoder().encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

// ==================== AUTHENTICATION ====================

// Sign up admin (initial setup)
app.post('/make-server-bc1abfbf/auth/signup', async (c) => {
  try {
    const { email, password, name } = await c.req.json();
    
    if (!email || !password || !name) {
      return c.json({ error: 'Email, password et nom requis' }, 400);
    }

    // Check if admin already exists
    const existingAdmins = await kv.getByPrefix('admin:');
    const adminExists = existingAdmins.some((admin: any) => admin.email === email);
    
    if (adminExists) {
      return c.json({ error: 'Cet email existe déjà' }, 400);
    }

    const adminId = crypto.randomUUID();
    const passwordHash = await hashPassword(password);
    
    await kv.set(`admin:${adminId}`, {
      id: adminId,
      email,
      password_hash: passwordHash,
      name,
      created_at: new Date().toISOString()
    });

    return c.json({ 
      success: true, 
      adminId,
      message: 'Administrateur créé avec succès' 
    });
  } catch (error) {
    console.error('Erreur lors de la création admin:', error);
    return c.json({ error: 'Erreur serveur lors de la création' }, 500);
  }
});

// Sign in admin
app.post('/make-server-bc1abfbf/auth/signin', async (c) => {
  try {
    const { email, password } = await c.req.json();
    
    if (!email || !password) {
      return c.json({ error: 'Email et mot de passe requis' }, 400);
    }

    const passwordHash = await hashPassword(password);
    const admins = await kv.getByPrefix('admin:');
    const admin = admins.find((a: any) => a.email === email && a.password_hash === passwordHash);

    if (!admin) {
      return c.json({ error: 'Email ou mot de passe incorrect' }, 401);
    }

    // Create session token
    const sessionToken = crypto.randomUUID();
    await kv.set(`session:${sessionToken}`, {
      admin_id: admin.id,
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24h
    });

    return c.json({ 
      success: true, 
      token: sessionToken,
      admin: { id: admin.id, name: admin.name, email: admin.email }
    });
  } catch (error) {
    console.error('Erreur lors de la connexion:', error);
    return c.json({ error: 'Erreur serveur lors de la connexion' }, 500);
  }
});

// Middleware to verify session
async function verifySession(token: string | null) {
  if (!token) return null;
  
  const session = await kv.get(`session:${token}`);
  if (!session) return null;
  
  // Check expiration
  if (new Date(session.expires_at) < new Date()) {
    await kv.del(`session:${token}`);
    return null;
  }
  
  const admin = await kv.get(`admin:${session.admin_id}`);
  return admin;
}

// ==================== PARENTS ====================

app.get('/make-server-bc1abfbf/parents', async (c) => {
  try {
    const token = c.req.header('Authorization')?.split(' ')[1];
    const admin = await verifySession(token);
    if (!admin) return c.json({ error: 'Non autorisé' }, 401);

    const parents = await kv.getByPrefix('parent:');
    return c.json({ parents: parents.sort((a: any, b: any) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    ) });
  } catch (error) {
    console.error('Erreur lors de la récupération des parents:', error);
    return c.json({ error: 'Erreur serveur' }, 500);
  }
});

app.post('/make-server-bc1abfbf/parents', async (c) => {
  try {
    const token = c.req.header('Authorization')?.split(' ')[1];
    const admin = await verifySession(token);
    if (!admin) return c.json({ error: 'Non autorisé' }, 401);

    const { nom, prenom, tel, email } = await c.req.json();
    
    if (!nom || !prenom) {
      return c.json({ error: 'Nom et prénom requis' }, 400);
    }

    const parentId = crypto.randomUUID();
    const parent = {
      id: parentId,
      nom,
      prenom,
      tel: tel || '',
      email: email || '',
      created_at: new Date().toISOString()
    };
    
    await kv.set(`parent:${parentId}`, parent);
    return c.json({ success: true, parent });
  } catch (error) {
    console.error('Erreur lors de la création du parent:', error);
    return c.json({ error: 'Erreur serveur' }, 500);
  }
});

app.put('/make-server-bc1abfbf/parents/:id', async (c) => {
  try {
    const token = c.req.header('Authorization')?.split(' ')[1];
    const admin = await verifySession(token);
    if (!admin) return c.json({ error: 'Non autorisé' }, 401);

    const id = c.req.param('id');
    const { nom, prenom, tel, email } = await c.req.json();
    
    const existing = await kv.get(`parent:${id}`);
    if (!existing) {
      return c.json({ error: 'Parent non trouvé' }, 404);
    }

    const parent = {
      ...existing,
      nom,
      prenom,
      tel: tel || '',
      email: email || '',
      updated_at: new Date().toISOString()
    };
    
    await kv.set(`parent:${id}`, parent);
    return c.json({ success: true, parent });
  } catch (error) {
    console.error('Erreur lors de la mise à jour du parent:', error);
    return c.json({ error: 'Erreur serveur' }, 500);
  }
});

app.delete('/make-server-bc1abfbf/parents/:id', async (c) => {
  try {
    const token = c.req.header('Authorization')?.split(' ')[1];
    const admin = await verifySession(token);
    if (!admin) return c.json({ error: 'Non autorisé' }, 401);

    const id = c.req.param('id');
    
    // Check if parent has students
    const eleves = await kv.getByPrefix('eleve:');
    const hasEleves = eleves.some((e: any) => e.parent_id === id);
    
    if (hasEleves) {
      return c.json({ error: 'Impossible de supprimer: ce parent a des élèves associés' }, 400);
    }
    
    await kv.del(`parent:${id}`);
    return c.json({ success: true });
  } catch (error) {
    console.error('Erreur lors de la suppression du parent:', error);
    return c.json({ error: 'Erreur serveur' }, 500);
  }
});

// ==================== ÉLÈVES ====================

app.get('/make-server-bc1abfbf/eleves', async (c) => {
  try {
    const token = c.req.header('Authorization')?.split(' ')[1];
    const admin = await verifySession(token);
    if (!admin) return c.json({ error: 'Non autorisé' }, 401);

    const eleves = await kv.getByPrefix('eleve:');
    return c.json({ eleves: eleves.sort((a: any, b: any) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    ) });
  } catch (error) {
    console.error('Erreur lors de la récupération des élèves:', error);
    return c.json({ error: 'Erreur serveur' }, 500);
  }
});

app.post('/make-server-bc1abfbf/eleves', async (c) => {
  try {
    const token = c.req.header('Authorization')?.split(' ')[1];
    const admin = await verifySession(token);
    if (!admin) return c.json({ error: 'Non autorisé' }, 401);

    const { nom, prenom, classe, parent_id } = await c.req.json();
    
    if (!nom || !prenom || !classe || !parent_id) {
      return c.json({ error: 'Tous les champs sont requis' }, 400);
    }

    // Verify parent exists
    const parent = await kv.get(`parent:${parent_id}`);
    if (!parent) {
      return c.json({ error: 'Parent non trouvé' }, 404);
    }

    const eleveId = crypto.randomUUID();
    const eleve = {
      id: eleveId,
      nom,
      prenom,
      classe,
      parent_id,
      created_at: new Date().toISOString()
    };
    
    await kv.set(`eleve:${eleveId}`, eleve);
    return c.json({ success: true, eleve });
  } catch (error) {
    console.error('Erreur lors de la création de l\'élève:', error);
    return c.json({ error: 'Erreur serveur' }, 500);
  }
});

app.put('/make-server-bc1abfbf/eleves/:id', async (c) => {
  try {
    const token = c.req.header('Authorization')?.split(' ')[1];
    const admin = await verifySession(token);
    if (!admin) return c.json({ error: 'Non autorisé' }, 401);

    const id = c.req.param('id');
    const { nom, prenom, classe, parent_id } = await c.req.json();
    
    const existing = await kv.get(`eleve:${id}`);
    if (!existing) {
      return c.json({ error: 'Élève non trouvé' }, 404);
    }

    const eleve = {
      ...existing,
      nom,
      prenom,
      classe,
      parent_id,
      updated_at: new Date().toISOString()
    };
    
    await kv.set(`eleve:${id}`, eleve);
    return c.json({ success: true, eleve });
  } catch (error) {
    console.error('Erreur lors de la mise à jour de l\'élève:', error);
    return c.json({ error: 'Erreur serveur' }, 500);
  }
});

app.delete('/make-server-bc1abfbf/eleves/:id', async (c) => {
  try {
    const token = c.req.header('Authorization')?.split(' ')[1];
    const admin = await verifySession(token);
    if (!admin) return c.json({ error: 'Non autorisé' }, 401);

    const id = c.req.param('id');
    
    // Check if eleve has frais
    const frais = await kv.getByPrefix('frais:');
    const hasFrais = frais.some((f: any) => f.eleve_id === id);
    
    if (hasFrais) {
      return c.json({ error: 'Impossible de supprimer: cet élève a des frais associés' }, 400);
    }
    
    await kv.del(`eleve:${id}`);
    return c.json({ success: true });
  } catch (error) {
    console.error('Erreur lors de la suppression de l\'élève:', error);
    return c.json({ error: 'Erreur serveur' }, 500);
  }
});

// ==================== FRAIS ====================

app.get('/make-server-bc1abfbf/frais', async (c) => {
  try {
    const token = c.req.header('Authorization')?.split(' ')[1];
    const admin = await verifySession(token);
    if (!admin) return c.json({ error: 'Non autorisé' }, 401);

    const frais = await kv.getByPrefix('frais:');
    return c.json({ frais: frais.sort((a: any, b: any) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    ) });
  } catch (error) {
    console.error('Erreur lors de la récupération des frais:', error);
    return c.json({ error: 'Erreur serveur' }, 500);
  }
});

app.post('/make-server-bc1abfbf/frais', async (c) => {
  try {
    const token = c.req.header('Authorization')?.split(' ')[1];
    const admin = await verifySession(token);
    if (!admin) return c.json({ error: 'Non autorisé' }, 401);

    const { eleve_id, annee_scolaire, montant_total, echeances } = await c.req.json();
    
    if (!eleve_id || !annee_scolaire || !montant_total || !echeances || !Array.isArray(echeances)) {
      return c.json({ error: 'Tous les champs sont requis' }, 400);
    }

    // Verify eleve exists
    const eleve = await kv.get(`eleve:${eleve_id}`);
    if (!eleve) {
      return c.json({ error: 'Élève non trouvé' }, 404);
    }

    const fraisId = crypto.randomUUID();
    const fraisData = {
      id: fraisId,
      eleve_id,
      annee_scolaire,
      montant_total: parseFloat(montant_total),
      montant_verse: 0,
      echeances: echeances.map((e: any) => ({
        id: crypto.randomUUID(),
        date: e.date,
        montant: parseFloat(e.montant),
        statut: 'en_attente' // en_attente, paye, en_retard
      })),
      created_at: new Date().toISOString()
    };
    
    await kv.set(`frais:${fraisId}`, fraisData);
    return c.json({ success: true, frais: fraisData });
  } catch (error) {
    console.error('Erreur lors de la création des frais:', error);
    return c.json({ error: 'Erreur serveur' }, 500);
  }
});

app.post('/make-server-bc1abfbf/frais/:id/paiement', async (c) => {
  try {
    const token = c.req.header('Authorization')?.split(' ')[1];
    const admin = await verifySession(token);
    if (!admin) return c.json({ error: 'Non autorisé' }, 401);

    const id = c.req.param('id');
    const { echeance_id, montant } = await c.req.json();
    
    const frais = await kv.get(`frais:${id}`);
    if (!frais) {
      return c.json({ error: 'Frais non trouvés' }, 404);
    }

    // Update echeance status
    const updatedEcheances = frais.echeances.map((e: any) => {
      if (e.id === echeance_id) {
        return { ...e, statut: 'paye', date_paiement: new Date().toISOString() };
      }
      return e;
    });

    const updatedFrais = {
      ...frais,
      montant_verse: frais.montant_verse + parseFloat(montant),
      echeances: updatedEcheances,
      updated_at: new Date().toISOString()
    };
    
    await kv.set(`frais:${id}`, updatedFrais);
    return c.json({ success: true, frais: updatedFrais });
  } catch (error) {
    console.error('Erreur lors de l\'enregistrement du paiement:', error);
    return c.json({ error: 'Erreur serveur' }, 500);
  }
});

app.delete('/make-server-bc1abfbf/frais/:id', async (c) => {
  try {
    const token = c.req.header('Authorization')?.split(' ')[1];
    const admin = await verifySession(token);
    if (!admin) return c.json({ error: 'Non autorisé' }, 401);

    const id = c.req.param('id');
    await kv.del(`frais:${id}`);
    return c.json({ success: true });
  } catch (error) {
    console.error('Erreur lors de la suppression des frais:', error);
    return c.json({ error: 'Erreur serveur' }, 500);
  }
});

// ==================== RAPPELS ====================

app.get('/make-server-bc1abfbf/rappels', async (c) => {
  try {
    const token = c.req.header('Authorization')?.split(' ')[1];
    const admin = await verifySession(token);
    if (!admin) return c.json({ error: 'Non autorisé' }, 401);

    const rappels = await kv.getByPrefix('rappel:');
    return c.json({ rappels: rappels.sort((a: any, b: any) => 
      new Date(b.date_envoi).getTime() - new Date(a.date_envoi).getTime()
    ) });
  } catch (error) {
    console.error('Erreur lors de la récupération des rappels:', error);
    return c.json({ error: 'Erreur serveur' }, 500);
  }
});

// Process automatic reminders (to be called by a cron job or manually)
app.post('/make-server-bc1abfbf/rappels/process', async (c) => {
  try {
    const token = c.req.header('Authorization')?.split(' ')[1];
    const admin = await verifySession(token);
    if (!admin) return c.json({ error: 'Non autorisé' }, 401);

    const config = await kv.get('config:regles_rappel') || {
      preventif: -10,
      jour_j: 0,
      retard_3: 3,
      retard_7: 7
    };

    const allFrais = await kv.getByPrefix('frais:');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const rappelsToSend = [];

    for (const frais of allFrais) {
      const eleve = await kv.get(`eleve:${frais.eleve_id}`);
      if (!eleve) continue;
      
      const parent = await kv.get(`parent:${eleve.parent_id}`);
      if (!parent) continue;

      for (const echeance of frais.echeances) {
        if (echeance.statut === 'paye') continue;

        const echeanceDate = new Date(echeance.date);
        echeanceDate.setHours(0, 0, 0, 0);
        
        const diffDays = Math.floor((echeanceDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        let rappelType = null;
        
        if (diffDays === config.preventif) {
          rappelType = 'preventif';
        } else if (diffDays === config.jour_j) {
          rappelType = 'jour_j';
        } else if (diffDays === -config.retard_3) {
          rappelType = 'retard_3';
        } else if (diffDays === -config.retard_7) {
          rappelType = 'retard_7';
        }

        if (rappelType) {
          // Check if reminder already sent today
          const existingRappels = await kv.getByPrefix('rappel:');
          const alreadySent = existingRappels.some((r: any) => 
            r.frais_id === frais.id && 
            r.echeance_id === echeance.id &&
            r.type === rappelType &&
            new Date(r.date_envoi).toDateString() === today.toDateString()
          );

          if (!alreadySent) {
            rappelsToSend.push({
              frais,
              eleve,
              parent,
              echeance,
              type: rappelType
            });
          }
        }
      }
    }

    // Send reminders (simulation)
    const sentRappels = [];
    for (const rappel of rappelsToSend) {
      const rappelId = crypto.randomUUID();
      const rappelData = {
        id: rappelId,
        frais_id: rappel.frais.id,
        echeance_id: rappel.echeance.id,
        eleve_id: rappel.eleve.id,
        parent_id: rappel.parent.id,
        type: rappel.type,
        date_envoi: new Date().toISOString(),
        canaux: [],
        statut: 'envoye'
      };

      // Simulate email sending
      if (rappel.parent.email) {
        rappelData.canaux.push({
          type: 'email',
          destinataire: rappel.parent.email,
          statut: 'envoye',
          sujet: getEmailSubject(rappel.type),
          contenu: getEmailContent(rappel)
        });
      }

      // Simulate SMS sending
      if (rappel.parent.tel) {
        rappelData.canaux.push({
          type: 'sms',
          destinataire: rappel.parent.tel,
          statut: 'envoye',
          contenu: getSMSContent(rappel)
        });
      }

      await kv.set(`rappel:${rappelId}`, rappelData);
      sentRappels.push(rappelData);
    }

    return c.json({ 
      success: true, 
      processed: rappelsToSend.length,
      sent: sentRappels 
    });
  } catch (error) {
    console.error('Erreur lors du traitement des rappels:', error);
    return c.json({ error: 'Erreur serveur' }, 500);
  }
});

// Helper functions for reminder content
function getEmailSubject(type: string): string {
  const subjects = {
    preventif: 'Rappel: Échéance de paiement à venir',
    jour_j: 'Rappel: Échéance de paiement aujourd\'hui',
    retard_3: 'Rappel: Paiement en retard',
    retard_7: 'Avertissement: Paiement en retard'
  };
  return subjects[type] || 'Rappel de paiement';
}

function getEmailContent(rappel: any): string {
  const { parent, eleve, echeance, type } = rappel;
  const formattedDate = new Date(echeance.date).toLocaleDateString('fr-FR');
  const montant = echeance.montant.toFixed(2);

  const messages = {
    preventif: `Bonjour ${parent.prenom} ${parent.nom},

Ceci est un rappel amical concernant le paiement des frais scolaires de ${eleve.prenom} ${eleve.nom} (${eleve.classe}).

Échéance à venir: ${formattedDate}
Montant: ${montant} €

Merci de bien vouloir effectuer ce paiement avant la date d'échéance.

Cordialement,
L'administration`,

    jour_j: `Bonjour ${parent.prenom} ${parent.nom},

L'échéance de paiement pour les frais scolaires de ${eleve.prenom} ${eleve.nom} (${eleve.classe}) est aujourd'hui.

Date d'échéance: ${formattedDate}
Montant: ${montant} €

Merci de procéder au paiement dès que possible.

Cordialement,
L'administration`,

    retard_3: `Bonjour ${parent.prenom} ${parent.nom},

Nous constatons que le paiement des frais scolaires de ${eleve.prenom} ${eleve.nom} (${eleve.classe}) n'a pas été effectué.

Date d'échéance dépassée: ${formattedDate}
Montant dû: ${montant} €

Merci de régulariser cette situation dans les plus brefs délais.

Cordialement,
L'administration`,

    retard_7: `Bonjour ${parent.prenom} ${parent.nom},

AVERTISSEMENT: Le paiement des frais scolaires de ${eleve.prenom} ${eleve.nom} (${eleve.classe}) est en retard depuis plus d'une semaine.

Date d'échéance dépassée: ${formattedDate}
Montant dû: ${montant} €

Merci de procéder au paiement de toute urgence pour éviter toute mesure complémentaire.

Cordialement,
L'administration`
  };

  return messages[type] || '';
}

function getSMSContent(rappel: any): string {
  const { parent, eleve, echeance, type } = rappel;
  const formattedDate = new Date(echeance.date).toLocaleDateString('fr-FR');
  const montant = echeance.montant.toFixed(2);

  const messages = {
    preventif: `Rappel: Frais ${eleve.prenom} ${eleve.nom} - Échéance ${formattedDate} - ${montant}€`,
    jour_j: `AUJOURD'HUI: Frais ${eleve.prenom} ${eleve.nom} - ${montant}€ à payer`,
    retard_3: `RETARD: Frais ${eleve.prenom} ${eleve.nom} - ${montant}€ - Échéance ${formattedDate}`,
    retard_7: `URGENT: Frais ${eleve.prenom} ${eleve.nom} - ${montant}€ en retard depuis le ${formattedDate}`
  };

  return messages[type] || '';
}

// ==================== CONFIGURATION ====================

app.get('/make-server-bc1abfbf/config/regles', async (c) => {
  try {
    const token = c.req.header('Authorization')?.split(' ')[1];
    const admin = await verifySession(token);
    if (!admin) return c.json({ error: 'Non autorisé' }, 401);

    const config = await kv.get('config:regles_rappel') || {
      preventif: -10,
      jour_j: 0,
      retard_3: 3,
      retard_7: 7
    };

    return c.json({ config });
  } catch (error) {
    console.error('Erreur lors de la récupération de la configuration:', error);
    return c.json({ error: 'Erreur serveur' }, 500);
  }
});

app.put('/make-server-bc1abfbf/config/regles', async (c) => {
  try {
    const token = c.req.header('Authorization')?.split(' ')[1];
    const admin = await verifySession(token);
    if (!admin) return c.json({ error: 'Non autorisé' }, 401);

    const config = await c.req.json();
    await kv.set('config:regles_rappel', config);

    return c.json({ success: true, config });
  } catch (error) {
    console.error('Erreur lors de la mise à jour de la configuration:', error);
    return c.json({ error: 'Erreur serveur' }, 500);
  }
});

// ==================== STATISTIQUES ====================

app.get('/make-server-bc1abfbf/stats', async (c) => {
  try {
    const token = c.req.header('Authorization')?.split(' ')[1];
    const admin = await verifySession(token);
    if (!admin) return c.json({ error: 'Non autorisé' }, 401);

    const parents = await kv.getByPrefix('parent:');
    const eleves = await kv.getByPrefix('eleve:');
    const allFrais = await kv.getByPrefix('frais:');
    const rappels = await kv.getByPrefix('rappel:');

    let totalDu = 0;
    let totalPaye = 0;
    let echeancesEnAttente = 0;
    let echeancesEnRetard = 0;
    let echeancesPaye = 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const frais of allFrais) {
      totalDu += frais.montant_total;
      totalPaye += frais.montant_verse;

      for (const echeance of frais.echeances) {
        const echeanceDate = new Date(echeance.date);
        echeanceDate.setHours(0, 0, 0, 0);

        if (echeance.statut === 'paye') {
          echeancesPaye++;
        } else if (echeanceDate < today) {
          echeancesEnRetard++;
        } else {
          echeancesEnAttente++;
        }
      }
    }

    // Rappels du dernier mois
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    const rappelsLastMonth = rappels.filter((r: any) => 
      new Date(r.date_envoi) > lastMonth
    );

    return c.json({
      stats: {
        total_parents: parents.length,
        total_eleves: eleves.length,
        total_du: totalDu,
        total_paye: totalPaye,
        total_impaye: totalDu - totalPaye,
        echeances_en_attente: echeancesEnAttente,
        echeances_en_retard: echeancesEnRetard,
        echeances_paye: echeancesPaye,
        rappels_envoyes: rappels.length,
        rappels_dernier_mois: rappelsLastMonth.length
      }
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des statistiques:', error);
    return c.json({ error: 'Erreur serveur' }, 500);
  }
});

Deno.serve(app.fetch);
