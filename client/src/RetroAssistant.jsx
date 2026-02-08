// src/RetroAssistant.jsx
import React, { useState, useEffect } from 'react'
import { getRandomDialog } from './AssistantDialogs'

// Le petit "K" en Pixel Art SVG
const PixelKIcon = () => (
  <svg
    width="60"
    height="60"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="drop-shadow-[4px_4px_0px_rgba(0,0,0,1)]"
  >
    {/* Corps du K en pixels */}
    <path
      d="M4 2H8V10H10V8H12V6H14V4H18V8H16V10H14V12H12V14H14V16H16V18H18V22H14V20H12V18H10V16H8V22H4V2ZM18 6H16V8H18V6Z"
      fill="#89CFF0"
      stroke="black"
      strokeWidth="1"
    />
    {/* Oeil gauche */}
    <rect x="5" y="5" width="2" height="2" fill="white" />
    <rect x="6" y="6" width="1" height="1" fill="black" />
    {/* Oeil droit (légèrement plus grand pour l'air goofy) */}
    <rect x="13" y="5" width="3" height="3" fill="white" />
    <rect x="14" y="6" width="1" height="2" fill="black" />
    {/* Sourcil interrogateur */}
    <rect x="13" y="3" width="3" height="1" fill="black" />
  </svg>
)

export default function RetroAssistant({ tasks }) {
  const [message, setMessage] = useState('')
  const [isVisible, setIsVisible] = useState(false)

  // Le cerveau de l'assistant
  useEffect(() => {
    const analyzeAndSpeak = () => {
      const now = new Date()
      const hour = now.getHours()
      const todoCount = tasks.filter(
        (t) => !t.completed && (t.columnId === 'today' || t.columnId === 'week')
      ).length
      const doneCount = tasks.filter((t) => t.completed).length

      let category = 'idle'

      if (hour >= 22 || hour < 5) {
        category = 'lateNight'
      } else if (todoCount > 8) {
        category = 'overwhelmed'
      } else if (doneCount > 5 && todoCount < 3) {
        category = 'productive'
      }

      setMessage(getRandomDialog(category))
      setIsVisible(true)

      // Faire disparaître la bulle après 10 secondes
      setTimeout(() => setIsVisible(false), 10000)
    }

    // Première analyse après 2 secondes
    const initialTimer = setTimeout(analyzeAndSpeak, 2000)

    // Puis analyse toutes les 45 secondes
    const intervalTimer = setInterval(analyzeAndSpeak, 45000)

    return () => {
      clearTimeout(initialTimer)
      clearInterval(intervalTimer)
    }
  }, [tasks]) // Se relance si les tâches changent significativement

  return (
    // hidden md:flex -> CACHÉ SUR MOBILE, visible sur Desktop
    <div className="fixed bottom-8 right-8 hidden md:flex flex-col items-end z-50 pointer-events-none">
      {/* La bulle de dialogue rétro (style tooltip jaune) */}
      {isVisible && message && (
        <div className="mb-4 relative bg-[#FFFFE1] border-2 border-black shadow-[4px_4px_0px_0px_black] p-4 max-w-xs animate-bounce-in origin-bottom-right font-mono text-sm pointer-events-auto">
          {message}
          {/* Le petit triangle de la bulle */}
          <div
            className="absolute bottom-[-10px] right-6 w-0 h-0 
              border-l-[10px] border-l-transparent
              border-r-[10px] border-r-transparent
              border-t-[10px] border-t-black"
          ></div>
          <div
            className="absolute bottom-[-7px] right-[26px] w-0 h-0 z-10
              border-l-[8px] border-l-transparent
              border-r-[8px] border-r-transparent
              border-t-[8px] border-t-[#FFFFE1]"
          ></div>
        </div>
      )}

      {/* Le Personnage */}
      <div className="hover:animate-wiggle pointer-events-auto cursor-help transition-transform hover:scale-110">
        <PixelKIcon />
      </div>
    </div>
  )
}
