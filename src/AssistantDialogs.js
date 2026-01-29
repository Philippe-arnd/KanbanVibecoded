// src/AssistantDialogs.js

export const DIALOGS = {
    // When nothing special is happening
    idle: [
      "Looks like you're trying to organize your life. Need help?",
      "Pro tip: Don't forget to defragment your mental hard drive.",
      "It's quiet... too quiet. Check your SCSI cables.",
      "I feel like you're looking at me instead of working.",
      "How about a little 'Ctrl+Alt+Del' on this task?",
    ],
    // Too many tasks (> 8)
    overwhelmed: [
      "Whoa! Your 'To Do' stack is taller than my PC tower.",
      "Alert: Buffer Overflow imminent. You might want to archive some stuff.",
      "So many tasks, so little RAM...",
      "We're going to need a faster Pentium processor to handle all this.",
    ],
    // Good productivity (many tasks completed today)
    productive: [
      "Maximum productivity detected. Grab a coffee, you earned it.",
      "Look at you go! It's almost as satisfying as peeling the plastic off a new screen.",
      "Your efficiency is overheating my fan.",
    ],
    // Late at night (after 10 PM)
    lateNight: [
      "It's dark. Don't forget to save to floppy before sleeping.",
      "Your eyes are turning square. Time to turn off the monitor.",
      "Even Windows 95 needs to reboot sometimes. Go to bed.",
    ],
  };
  
  // Little utility function to pick a random phrase
  export const getRandomDialog = (category) => {
    const options = DIALOGS[category] || DIALOGS.idle;
    return options[Math.floor(Math.random() * options.length)];
  };
