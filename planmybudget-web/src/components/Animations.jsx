import { useState, useEffect, useRef } from 'react'

export function AnimatedCounter({ value, duration = 1000, prefix = '', suffix = '' }) {
  const [displayValue, setDisplayValue] = useState(0)
  const [hasAnimated, setHasAnimated] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (hasAnimated) return
    
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setHasAnimated(true)
          animateValue()
        }
      },
      { threshold: 0.5 }
    )

    if (ref.current) {
      observer.observe(ref.current)
    }

    return () => observer.disconnect()
  }, [hasAnimated])

  const animateValue = () => {
    const start = 0
    const end = typeof value === 'number' ? value : parseFloat(value.replace(/[^0.-]/g, ''))
    const startTime = performance.now()

    const animate = (currentTime) => {
      const elapsed = currentTime - startTime
      const progress = Math.min(elapsed / duration, 1)
      const easeOut = 1 - Math.pow(1 - progress, 3)
      const current = start + (end - start) * easeOut

      setDisplayValue(current)

      if (progress < 1) {
        requestAnimationFrame(animate)
      }
    }

    requestAnimationFrame(animate)
  }

  const formatValue = (val) => {
    if (typeof value === 'string' && value.includes(',')) {
      return val.toLocaleString(undefined, { maximumFractionDigits: 2 })
    }
    return Math.round(val).toLocaleString()
  }

  return (
    <span ref={ref} className="counter-animated">
      {prefix}{formatValue(displayValue)}{suffix}
    </span>
  )
}

export function AnimatedList({ children, delay = 50, className = '' }) {
  return (
    <div className={className}>
      {Array.isArray(children) 
        ? children.map((child, index) => (
            <div
              key={child?.key || index}
              className={`list-item ${child?.props?.className || ''}`}
              style={{ animationDelay: `${index * delay}ms` }}
            >
              {child}
            </div>
          ))
        : children
      }
    </div>
  )
}

export function usePageTransition() {
  const [key, setKey] = useState(0)

  const refresh = () => {
    setKey(prev => prev + 1)
  }

  return { key, refresh }
}
