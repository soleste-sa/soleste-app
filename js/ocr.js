// ============================================================
// SOLESTE — Module OCR via API Claude (Anthropic)
// ============================================================

const ANTHROPIC_MODEL = 'claude-sonnet-4-20250514';

// ── Analyse d'une image de bon de livraison ─────────────────
// input : File (image ou PDF converti en base64)
// retourne : { articles: [{nom, prixUc, uc, fournisseur, codeArticle, status}] }
export async function analyzeDeliveryNote(file, existingArticles = []) {
  const base64 = await fileToBase64(file);
  const mediaType = file.type || 'image/jpeg';

  const existingNames = existingArticles.map(a => a.nom.toLowerCase());

  const systemPrompt = `Tu es un assistant spécialisé dans la lecture de bons de livraison et factures pour la restauration belge.
Tu extrais les articles présents sur le document et retournes UNIQUEMENT un JSON valide, sans aucun texte avant ou après.
Format de réponse strict :
{
  "fournisseur": "Nom du fournisseur si visible",
  "dateDocument": "date si visible (format DD/MM/YYYY)",
  "articles": [
    {
      "nom": "nom de l'article",
      "reference": "code article/référence fournisseur si présent",
      "uc": "unité de commande (ex: carton, caisse, pièce, kg, L)",
      "quantite": 0,
      "prixUc": 0.00,
      "codeBarres": ""
    }
  ]
}
Règles :
- Extrais TOUS les articles visibles sur le document
- Pour les prix, utilise le prix unitaire HTVA si disponible
- Si un champ n'est pas visible, laisse une chaîne vide "" ou 0
- Retourne toujours un JSON valide et complet`;

  const userPrompt = `Analyse ce bon de livraison/facture et extrait tous les articles.
Articles déjà connus dans notre base : ${existingNames.slice(0, 20).join(', ')}${existingNames.length > 20 ? '…' : ''}

Indique pour chaque article s'il est "nouveau" ou "existant" dans notre base en ajoutant un champ "status": "new" ou "status": "exists".`;

  const apiKey = localStorage.getItem('soleste_anthropic_key') || '';
  if (!apiKey) throw new Error('Clé API Anthropic non configurée. Allez dans Réglages pour la saisir.');

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: 2000,
      system: systemPrompt,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: mediaType,
              data: base64
            }
          },
          {
            type: 'text',
            text: userPrompt
          }
        ]
      }]
    })
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || `Erreur API ${response.status}`);
  }

  const data = await response.json();
  const text = data.content?.find(b => b.type === 'text')?.text || '';

  let parsed;
  try {
    // Nettoyer le JSON si entouré de ```
    const clean = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    parsed = JSON.parse(clean);
  } catch (e) {
    throw new Error('Impossible de parser la réponse de l\'IA. Réessayez avec une image plus nette.');
  }

  // Enrichir avec statut
  const existingSet = new Set(existingNames);
  const articles = (parsed.articles || []).map(art => ({
    ...art,
    prixUc:  parseFloat(art.prixUc)  || 0,
    quantite: parseFloat(art.quantite) || 0,
    status:  existingSet.has(art.nom?.toLowerCase()) ? 'exists' : 'new',
    selected: true,  // sélectionné par défaut pour validation
  }));

  return {
    fournisseur:   parsed.fournisseur   || '',
    dateDocument:  parsed.dateDocument  || '',
    articles
  };
}

// ── Convertir File en base64 ────────────────────────────────
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve(reader.result.split(',')[1]);
    reader.onerror = () => reject(new Error('Erreur de lecture du fichier'));
    reader.readAsDataURL(file);
  });
}

// ── Types de fichiers acceptés pour OCR ────────────────────
export const OCR_ACCEPT = 'image/jpeg,image/png,image/webp,image/gif';

export function isValidOcrFile(file) {
  return file && ['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type);
}
