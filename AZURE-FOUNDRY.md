# Azure AI Foundry Agent Integration

Documentation de l'intégration de l'agent Azure AI Foundry dans le portfolio.

## Vue d'ensemble

Cette intégration remplace l'ancien service d'agent externe (localhost:888) par un agent Azure AI Foundry, permettant un déploiement serverless sur Vercel sans dépendance à un serveur externe.

## Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────────┐
│  Frontend       │────▶│  Next.js API     │────▶│  Azure AI Foundry   │
│  (Chat UI)      │     │  /api/agent      │     │  (Agents Service)   │
└─────────────────┘     └──────────────────┘     └─────────────────────┘
```

## Fichiers clés

### Backend

| Fichier | Description |
|---------|-------------|
| `app/lib/agent/azure-agent.ts` | Service principal Azure - gestion des conversations |
| `app/lib/agent/types.ts` | Types TypeScript partagés |
| `app/api/agent/route.ts` | API route principale pour le chat |
| `app/api/agent/health/route.ts` | Endpoint de health check |
| `app/api/agent/stream/route.ts` | Endpoint SSE pour le streaming (expérimental) |

### Frontend

| Fichier | Description |
|---------|-------------|
| `components/ui/AgentChatButton.tsx` | Composant principal du chat |
| `components/ui/ServiceStatusHeader.tsx` | Indicateur de statut du service |
| `app/lib/store/serviceStatusStore.ts` | Store Zustand pour le statut |

## Configuration

### Variables d'environnement requises

```env
# Obligatoires
AZURE_EXISTING_AIPROJECT_ENDPOINT="https://xxx.services.ai.azure.com/api/projects/xxx"
AZURE_EXISTING_AGENT_ID="portfolio-agent:2"

# Pour l'authentification (Vercel/Production)
AZURE_CLIENT_ID="xxx"
AZURE_CLIENT_SECRET="xxx"
AZURE_TENANT_ID="xxx"
```

### Authentification

Le SDK Azure utilise `DefaultAzureCredential` qui supporte plusieurs méthodes :

| Environnement | Méthode |
|---------------|---------|
| Local (dev) | Azure CLI (`az login`) |
| Vercel/Production | Service Principal (variables AZURE_CLIENT_*) |
| Azure App Service | Managed Identity |

## Fonctionnalités implémentées

### 1. Chat avec l'agent

```typescript
// Nouvelle conversation
const response = await startAzureAgentChat(message, agentType);

// Continuer une conversation existante
const response = await continueAzureAgentChat(message, agentType, threadId);
```

**Caractéristiques :**
- Création automatique de threads Azure
- Gestion du contexte de conversation via `threadId`
- Fallback automatique vers nouveau thread si erreur
- Nettoyage des citations Azure (`【4:2†filename.pdf】`)

### 2. Health Check

```typescript
const health = await checkAzureHealth();
// { isOnline: true, responseTime: 234 }
```

### 3. Gestion des erreurs

Le système gère automatiquement :
- Threads expirés ou invalides → création d'un nouveau thread
- Erreurs d'authentification → message d'erreur approprié
- Rate limiting → retry avec backoff

## Déploiement sur Vercel

### 1. Créer un Service Principal Azure

```bash
az ad sp create-for-rbac \
  --name "devfolio-vercel" \
  --role "Cognitive Services User" \
  --scopes "/subscriptions/{SUBSCRIPTION_ID}/resourceGroups/{RESOURCE_GROUP}"
```

### 2. Configurer les variables Vercel

Dans Vercel Dashboard → Settings → Environment Variables :

| Variable | Valeur |
|----------|--------|
| `AZURE_CLIENT_ID` | `appId` du Service Principal |
| `AZURE_CLIENT_SECRET` | `password` du Service Principal |
| `AZURE_TENANT_ID` | `tenant` du Service Principal |
| `AZURE_EXISTING_AGENT_ID` | `portfolio-agent:2` |
| `AZURE_EXISTING_AIPROJECT_ENDPOINT` | URL de votre projet AI |

### 3. Déployer

```bash
git push origin main
# ou
vercel --prod
```

## API Reference

### POST /api/agent

Envoie un message à l'agent.

**Request:**
```json
{
  "message": "Qui est Salim ?",
  "agentType": "portfolio",
  "threadId": "thread_abc123"  // optionnel
}
```

**Response:**
```json
{
  "message": "Salim Laimeche est un expert en IA...",
  "threadId": "thread_abc123",
  "agentType": "portfolio",
  "suggestions": [],
  "conversationHistory": [...]
}
```

### GET /api/agent/health

Vérifie le statut du service.

**Response:**
```json
{
  "isOnline": true,
  "responseTime": 234
}
```

## Dépendances

```json
{
  "@azure/ai-projects": "^1.0.1",
  "@azure/identity": "^4.13.0"
}
```

## Limites connues

1. **Streaming** : L'implémentation SSE est expérimentale et peut avoir des problèmes de buffering
2. **Cold starts** : Premier appel peut prendre 5-10s sur Vercel (serverless)
3. **Threads** : Les threads Azure expirent après un certain temps d'inactivité

## Troubleshooting

### Erreur "Agent not found"

Vérifiez que `AZURE_EXISTING_AGENT_ID` correspond au nom exact de l'agent dans Azure AI Foundry.

### Erreur "Authentication failed"

1. Vérifiez les variables `AZURE_CLIENT_*`
2. Assurez-vous que le Service Principal a le rôle "Cognitive Services User"

### Erreur "Sorry, something went wrong"

L'agent Azure a rencontré une erreur interne. Le système crée automatiquement un nouveau thread.

