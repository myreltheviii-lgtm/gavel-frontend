'use client'

import { useEffect, useRef } from 'react'

/**
 * Hero background: gold particles slowly drifting. They are gently attracted
 * toward the outline of a pair of scales of justice, forming and dissolving.
 * Continuous — never stops, never resets.
 */
export function ParticleField() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let raf = 0
    let w = 0
    let h = 0
    const dpr = Math.min(window.devicePixelRatio || 1, 2)

    const resize = () => {
      w = canvas.clientWidth
      h = canvas.clientHeight
      canvas.width = w * dpr
      canvas.height = h * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      buildTargets()
    }

    // Build target points along a "scales of justice" silhouette.
    let targets: { x: number; y: number }[] = []
    const buildTargets = () => {
      targets = []
      const cx = w / 2
      const cy = h / 2
      const s = Math.min(w, h) / 2.6
      const add = (x: number, y: number) => targets.push({ x: cx + x, y: cy + y })
      // central column
      for (let i = -1; i <= 1; i += 0.06) add(0, i * s)
      // top beam
      for (let i = -1; i <= 1; i += 0.04) add(i * s, -s)
      // hanging strings + pans (two sides)
      for (const dir of [-1, 1]) {
        for (let i = 0; i <= 1; i += 0.12) add(dir * s, -s + i * s * 0.55)
        // pan arc
        for (let a = 0; a <= Math.PI; a += 0.2) {
          add(dir * s + Math.cos(a) * s * 0.42, -s + s * 0.55 + Math.sin(a) * s * 0.22)
        }
      }
      // base
      for (let i = -0.4; i <= 0.4; i += 0.05) add(i * s, s)
    }

    type P = { x: number; y: number; vx: number; vy: number; t: number; size: number; phase: number }
    const COUNT = 150
    const particles: P[] = []
    const init = () => {
      particles.length = 0
      for (let i = 0; i < COUNT; i++) {
        particles.push({
          x: Math.random() * w,
          y: Math.random() * h,
          vx: (Math.random() - 0.5) * 0.2,
          vy: (Math.random() - 0.5) * 0.2,
          t: Math.floor(Math.random() * 9999),
          size: 0.6 + Math.random() * 1.8,
          phase: Math.random() * Math.PI * 2,
        })
      }
    }

    let frame = 0
    const draw = () => {
      ctx.clearRect(0, 0, w, h)
      frame++
      // forming/dissolving cycle (~14s)
      const cycle = (Math.sin(frame / 320) + 1) / 2 // 0..1
      const attract = cycle * 0.012

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i]
        const target = targets[i % targets.length]
        if (target) {
          p.vx += (target.x - p.x) * attract
          p.vy += (target.y - p.y) * attract
        }
        // gentle drift
        p.vx += Math.cos(frame / 90 + p.phase) * 0.004
        p.vy += Math.sin(frame / 110 + p.phase) * 0.004
        p.vx *= 0.94
        p.vy *= 0.94
        p.x += p.vx
        p.y += p.vy
        if (p.x < 0) p.x = w
        if (p.x > w) p.x = 0
        if (p.y < 0) p.y = h
        if (p.y > h) p.y = 0

        const alpha = 0.25 + cycle * 0.5
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(232,196,74,${alpha})`
        ctx.shadowColor = 'rgba(232,196,74,0.7)'
        ctx.shadowBlur = 6
        ctx.fill()
      }
      ctx.shadowBlur = 0
      raf = requestAnimationFrame(draw)
    }

    resize()
    init()
    draw()
    window.addEventListener('resize', resize)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" aria-hidden="true" />
}
