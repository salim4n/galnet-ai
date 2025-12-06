# Déployer une app Next.js avec Azure AI Foundry sur Vercel

Ce guide explique comment déployer une application Next.js qui utilise Azure AI Foundry (agents IA) sur Vercel, en configurant l'authentification via un Service Principal Azure.

## Table des matières

1. [Pourquoi un Service Principal ?](#pourquoi-un-service-principal-)
2. [Prérequis](#prérequis)
3. [Étape 1 : Récupérer les informations Azure](#étape-1--récupérer-les-informations-azure)
4. [Étape 2 : Créer le Service Principal](#étape-2--créer-le-service-principal)
5. [Étape 3 : Configurer Vercel](#étape-3--configurer-vercel)
6. [Étape 4 : Configuration Next.js pour le streaming](#étape-4--configuration-nextjs-pour-le-streaming)
7. [Étape 5 : Déployer](#étape-5--déployer)
8. [Comment ça marche ?](#comment-ça-marche-)
9. [Troubleshooting](#troubleshooting)

---

## Pourquoi un Service Principal ?

### Le problème

En local, tu utilises `az login` pour t'authentifier. Le SDK Azure (`DefaultAzureCredential`) détecte automatiquement tes credentials via Azure CLI.

```
Local : Toi → az login → Azure CLI → SDK Azure → Azure AI Foundry ✅
```

Mais sur Vercel (ou tout serveur), il n'y a pas d'Azure CLI connecté !

```
Vercel : ??? → SDK Azure → Azure AI Foundry ❌
```

### La solution : Service Principal

Un **Service Principal** est comme un "compte de service" - une identité Azure dédiée à ton application.

```
Vercel : Variables d'env → SDK Azure → Service Principal → Azure AI Foundry ✅
```

C'est la méthode recommandée pour les déploiements serverless (Vercel, AWS Lambda, etc.).

---

## Prérequis

- [Azure CLI](https://docs.microsoft.com/fr-fr/cli/azure/install-azure-cli) installé
- Être connecté à Azure : `az login`
- Un projet Azure AI Foundry existant
- Un compte Vercel

---

## Étape 1 : Récupérer les informations Azure

### 1.1 Subscription ID

C'est l'identifiant de ton abonnement Azure.

```bash
az account show --query id -o tsv
```

Exemple de résultat :
```
f2e9e177-5c2e-40c4-8733-182c03040343
```

### 1.2 Resource Group

C'est le groupe de ressources contenant ton projet AI Foundry.

```bash
az group list --query "[].name" -o tsv
```

Exemple de résultat :
```
rg-nutricoach
rg-portfolio
rg-genailabs
```

Choisis celui qui contient ton projet AI Foundry.

---

## Étape 2 : Créer le Service Principal

### 2.1 Exécuter la commande

Remplace les valeurs par les tiennes :

```bash
az ad sp create-for-rbac \
  --name "mon-app-vercel" \
  --role "Cognitive Services User" \
  --scopes "/subscriptions/{SUBSCRIPTION_ID}/resourceGroups/{RESOURCE_GROUP}"
```

**Exemple concret :**

```bash
az ad sp create-for-rbac \
  --name "galnet-vercel" \
  --role "Cognitive Services User" \
  --scopes "/subscriptions/f2e9e177-5c2e-40c4-8733-182c03040343/resourceGroups/rg-nutricoach"
```

### 2.2 Résultat

La commande retourne un JSON avec tes credentials :

```json
{
  "appId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "displayName": "mon-app-vercel",
  "password": "xxxxxx~xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "tenant": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
}
```

### 2.3 Correspondance avec les variables d'environnement

| Champ JSON | Variable d'environnement | Description |
|------------|--------------------------|-------------|
| `appId` | `AZURE_CLIENT_ID` | Identifiant unique du Service Principal |
| `password` | `AZURE_CLIENT_SECRET` | Mot de passe (secret) - **à garder précieusement !** |
| `tenant` | `AZURE_TENANT_ID` | Identifiant de ton organisation Azure AD |

> **IMPORTANT** : Le `password` n'est affiché qu'une seule fois. Note-le immédiatement !

---

## Étape 3 : Configurer Vercel

### 3.1 Accéder aux variables d'environnement

1. Va sur [vercel.com](https://vercel.com)
2. Sélectionne ton projet
3. **Settings** → **Environment Variables**

### 3.2 Ajouter les variables

Ajoute ces variables pour **Production**, **Preview**, et **Development** :

| Variable | Valeur | Description |
|----------|--------|-------------|
| `AZURE_CLIENT_ID` | `appId` du JSON | ID du Service Principal |
| `AZURE_CLIENT_SECRET` | `password` du JSON | Secret (sensible !) |
| `AZURE_TENANT_ID` | `tenant` du JSON | ID du tenant Azure AD |
| `AZURE_EXISTING_AIPROJECT_ENDPOINT` | URL de ton projet AI | Ex: `https://xxx.services.ai.azure.com/api/projects/xxx` |
| `AZURE_EXISTING_AGENT_ID` | Nom de ton agent | Ex: `galnet-agent:1` |

### 3.3 Variables optionnelles

| Variable | Description |
|----------|-------------|
| `APPLICATIONINSIGHTS_CONNECTION_STRING` | Pour le tracing Azure Application Insights |

---

## Étape 4 : Configuration Next.js pour le streaming

Les fonctions serverless Vercel ont un timeout par défaut de 10 secondes. Pour le streaming SSE avec Azure AI Foundry, tu as besoin de plus de temps.

### 4.1 Créer `vercel.json`

À la racine du projet :

```json
{
  "functions": {
    "app/api/agent/stream/route.ts": {
      "maxDuration": 60
    },
    "app/api/agent/route.ts": {
      "maxDuration": 30
    }
  }
}
```

### 4.2 Limites selon le plan Vercel

| Plan | maxDuration max |
|------|-----------------|
| Hobby (gratuit) | 10 secondes |
| Pro | 60 secondes |
| Enterprise | 900 secondes |

> Si tu es sur le plan gratuit, le streaming long peut échouer. Envisage le plan Pro pour les apps de chat IA.

---

## Étape 5 : Déployer

### Option A : Via Git

```bash
git add .
git commit -m "feat: configure Vercel deployment"
git push origin main
```

Vercel déploie automatiquement à chaque push.

### Option B : Via CLI

```bash
# Installation (si pas déjà fait)
npm i -g vercel

# Déploiement
vercel --prod
```

---

## Comment ça marche ?

### Flux d'authentification

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              VERCEL                                      │
│  ┌─────────────┐    ┌──────────────────┐    ┌─────────────────────────┐ │
│  │ Environment │───▶│ DefaultAzure     │───▶│ EnvironmentCredential   │ │
│  │ Variables   │    │ Credential       │    │ (détecte AZURE_CLIENT_*)│ │
│  └─────────────┘    └──────────────────┘    └───────────┬─────────────┘ │
└─────────────────────────────────────────────────────────┼───────────────┘
                                                          │
                                                          ▼
                                              ┌───────────────────────┐
                                              │   Azure AD            │
                                              │   (authentification)  │
                                              └───────────┬───────────┘
                                                          │
                                                          ▼
                                              ┌───────────────────────┐
                                              │   Azure AI Foundry    │
                                              │   (ton agent IA)      │
                                              └───────────────────────┘
```

### DefaultAzureCredential - Ordre de détection

Le SDK Azure essaie plusieurs méthodes dans cet ordre :

1. **EnvironmentCredential** - Variables `AZURE_CLIENT_*` ✅ (utilisé sur Vercel)
2. **ManagedIdentityCredential** - Azure App Service/Functions
3. **AzureCliCredential** - `az login` ✅ (utilisé en local)
4. **AzurePowerShellCredential** - PowerShell
5. **AzureDeveloperCliCredential** - `azd login`

C'est pour ça que le même code fonctionne en local ET sur Vercel !

---

## Troubleshooting

### Erreur : "Authentication failed"

**Causes possibles :**

1. Variables d'environnement mal configurées dans Vercel
2. Service Principal n'a pas les bons droits

**Solution :**

Vérifie les droits du Service Principal :

```bash
az role assignment list --assignee {AZURE_CLIENT_ID} --output table
```

### Erreur : "Agent not found"

**Cause :** L'agent ID ne correspond pas.

**Solution :**

Vérifie `AZURE_EXISTING_AGENT_ID` dans Azure AI Foundry Studio.

### Erreur : "Function timeout"

**Cause :** La réponse de l'agent prend trop de temps.

**Solutions :**

1. Augmente `maxDuration` dans `vercel.json`
2. Passe au plan Vercel Pro (60s max) ou Enterprise (900s max)
3. Optimise les prompts pour des réponses plus courtes

### Erreur : "CORS"

**Cause :** L'appel API est fait côté client.

**Solution :**

Les appels à Azure AI Foundry doivent passer par ton API Next.js (route handlers), pas directement depuis le navigateur.

```
✅ Frontend → /api/agent → Azure AI Foundry
❌ Frontend → Azure AI Foundry (CORS bloqué)
```

---

## Ressources

- [Documentation Azure Service Principal](https://learn.microsoft.com/fr-fr/cli/azure/create-an-azure-service-principal-azure-cli)
- [DefaultAzureCredential](https://learn.microsoft.com/fr-fr/azure/developer/javascript/sdk/authentication/credential-chains)
- [Vercel Functions Configuration](https://vercel.com/docs/functions/configuring-functions/duration)
- [Azure AI Foundry](https://learn.microsoft.com/fr-fr/azure/ai-studio/)

---

## Récapitulatif des commandes

```bash
# 1. Récupérer Subscription ID
az account show --query id -o tsv

# 2. Lister les Resource Groups
az group list --query "[].name" -o tsv

# 3. Créer le Service Principal
az ad sp create-for-rbac \
  --name "mon-app-vercel" \
  --role "Cognitive Services User" \
  --scopes "/subscriptions/{SUBSCRIPTION_ID}/resourceGroups/{RESOURCE_GROUP}"

# 4. Déployer sur Vercel
vercel --prod
```

---

*Document créé le 6 décembre 2025*
