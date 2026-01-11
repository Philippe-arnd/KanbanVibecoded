// src/AssistantDialogs.js

export const DIALOGS = {
    // Quand il ne se passe rien de spécial
    idle: [
      "On dirait que vous essayez d'organiser votre vie. Besoin d'aide ?",
      "Conseil pro : N'oubliez pas de défragmenter votre disque dur mental.",
      "C'est calme... trop calme. Vérifiez vos câbles SCSI.",
      "J'ai l'impression que vous me regardez au lieu de travailler.",
      "Un petit coup de 'Ctrl+Alt+Suppr' sur cette tâche ?",
    ],
    // Trop de tâches à faire (> 8)
    overwhelmed: [
      "Whoa ! Votre pile 'À faire' est plus haute que ma tour PC.",
      "Alerte : Buffer Overflow imminent. Vous devriez peut-être archiver des trucs.",
      "Tant de tâches, si peu de RAM...",
      "Il va nous falloir un processeur Pentium plus rapide pour gérer tout ça.",
    ],
    // Bonne productivité (beaucoup de tâches terminées aujourd'hui)
    productive: [
      "Productivité maximale détectée. Prenez un café, vous l'avez mérité.",
      "Regardez-vous aller ! C'est presque aussi satisfaisant que de décoller le plastique d'un écran neuf.",
      "Votre efficacité fait surchauffer mon ventilateur.",
    ],
    // Tard le soir (après 22h)
    lateNight: [
      "Il fait sombre. N'oubliez pas de sauvegarder sur disquette avant de dormir.",
      "Vos yeux deviennent carrés. Il est temps d'éteindre le moniteur.",
      "Même Windows 95 a besoin de redémarrer parfois. Allez au lit.",
    ],
  };
  
  // Petite fonction utilitaire pour choisir une phrase au hasard
  export const getRandomDialog = (category) => {
    const options = DIALOGS[category] || DIALOGS.idle;
    return options[Math.floor(Math.random() * options.length)];
  };