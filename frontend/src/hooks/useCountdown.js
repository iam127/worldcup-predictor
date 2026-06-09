import { useState, useEffect } from 'react'

function calc(target) {
  const diff = new Date(target) - Date.now()
  if (diff <= 0) return null
  return {
    days:    Math.floor(diff / 86400000),
    hours:   Math.floor((diff % 86400000) / 3600000),
    minutes: Math.floor((diff % 3600000) / 60000),
    seconds: Math.floor((diff % 60000) / 1000),
  }
}

export function useCountdown(targetDate) {
  const [left, setLeft] = useState(() => calc(targetDate))

  useEffect(() => {
    const id = setInterval(() => setLeft(calc(targetDate)), 1000)
    return () => clearInterval(id)
  }, [targetDate])

  return left
}
