"use client"

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Rocket, Globe, Zap, Database, MessageSquare } from "lucide-react"

interface AboutModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AboutModal({ open, onOpenChange }: AboutModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] bg-black/95 border-orange-500/30 text-orange-200 backdrop-blur-sm p-0">
        <div className="p-6 pb-0">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-orange-400 tracking-wider flex items-center gap-2">
              <Rocket className="w-6 h-6" />
              GALNET Intelligence Interface
            </DialogTitle>
            <DialogDescription className="text-orange-300">
              Une interface de chat futuriste inspirée de l'univers Elite Dangerous
            </DialogDescription>
          </DialogHeader>
        </div>

        <ScrollArea className="max-h-[calc(90vh-120px)] px-6">
          <div className="space-y-6 py-4">
          {/* Elite Dangerous Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Globe className="w-5 h-5 text-amber-400" />
              <h3 className="text-lg font-semibold text-amber-400">Qu'est-ce qu'Elite Dangerous ?</h3>
            </div>
            <p className="text-sm text-orange-300 leading-relaxed">
              Elite Dangerous est un jeu de simulation spatiale massivement multijoueur qui se déroule dans une réplique
              1:1 de notre galaxie, la Voie Lactée. Les joueurs incarnent des pilotes de vaisseaux spatiaux dans un
              futur lointain (3309) et peuvent explorer, commercer, combattre et découvrir les mystères de l'espace.
            </p>
          </div>

          <Separator className="bg-orange-500/20" />

          {/* GALNET Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-amber-400" />
              <h3 className="text-lg font-semibold text-amber-400">Qu'est-ce que GALNET ?</h3>
            </div>
            <p className="text-sm text-orange-300 leading-relaxed">
              GALNET (Galactic Network) est le système de nouvelles intergalactiques d'Elite Dangerous. Il fournit des
              actualités sur les événements politiques, économiques, militaires et scientifiques qui se déroulent dans
              la galaxie. C'est la source d'information principale pour les commandants.
            </p>
          </div>

          <Separator className="bg-orange-500/20" />

          {/* App Purpose Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-400" />
              <h3 className="text-lg font-semibold text-amber-400">Cette Application</h3>
            </div>
            <p className="text-sm text-orange-300 leading-relaxed">
              Cette interface de chat simule un agent IA connecté aux archives GALNET. Elle utilise un système RAG
              (Retrieval-Augmented Generation) pour répondre aux questions sur l'univers d'Elite Dangerous, les
              actualités galactiques, les systèmes stellaires, les factions, et bien plus encore.
            </p>
          </div>

          <Separator className="bg-orange-500/20" />

          {/* Features Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Database className="w-5 h-5 text-amber-400" />
              <h3 className="text-lg font-semibold text-amber-400">Fonctionnalités</h3>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Badge variant="outline" className="border-orange-500/30 text-orange-300 justify-start">
                🚀 Interface HUD futuriste
              </Badge>
              <Badge variant="outline" className="border-orange-500/30 text-orange-300 justify-start">
                🤖 Agent IA GALNET
              </Badge>
              <Badge variant="outline" className="border-orange-500/30 text-orange-300 justify-start">
                📰 Archives des actualités
              </Badge>
              <Badge variant="outline" className="border-orange-500/30 text-orange-300 justify-start">
                🌌 Base de données galactique
              </Badge>
              <Badge variant="outline" className="border-orange-500/30 text-orange-300 justify-start">
                ⚡ Réponses en temps réel
              </Badge>
              <Badge variant="outline" className="border-orange-500/30 text-orange-300 justify-start">
                🎨 Thème Elite Dangerous
              </Badge>
            </div>
          </div>

          {/* Usage Examples */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-amber-400">Exemples de questions :</h4>
            <div className="space-y-1 text-xs text-orange-400 font-mono">
              <div className="bg-orange-500/10 p-2 rounded border border-orange-500/20">
                "Quelles sont les dernières nouvelles de la guerre Thargoid ?"
              </div>
              <div className="bg-orange-500/10 p-2 rounded border border-orange-500/20">
                "Où puis-je trouver des matériaux rares dans le système Sol ?"
              </div>
              <div className="bg-orange-500/10 p-2 rounded border border-orange-500/20">
                "Raconte-moi l'histoire de l'Alliance des Pilotes ?"
              </div>
            </div>
            </div>
          </div>
        </ScrollArea>

        <div className="flex justify-center p-6 pt-4 border-t border-orange-500/20">
          <p className="text-xs text-orange-600">Développé avec ❤️ pour la communauté Elite Dangerous</p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
