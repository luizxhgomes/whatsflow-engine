'use client'

import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { Pause, Play } from 'lucide-react'
import styles from './login.module.css'

/** Decorative, isolated from authentication; Three is requested only after the form can render. */
export default function LoginScene() {
  const hostRef = useRef<HTMLDivElement>(null)
  const pausedRef = useRef(false)
  const syncRef = useRef<() => void>(() => {})
  const [paused, setPaused] = useState(false)
  const [ready, setReady] = useState(false)
  const [reducedMotion, setReducedMotion] = useState<boolean | null>(null)

  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReducedMotion(preference.matches)
    update()
    preference.addEventListener('change', update)
    return () => preference.removeEventListener('change', update)
  }, [])

  useEffect(() => {
    const host = hostRef.current
    if (!host || reducedMotion !== false) return
    let cancelled = false
    let release = () => {}
    let idle: number | undefined
    let timeout: number | undefined

    const start = async () => {
      try {
        const THREE = await import('three')
        if (cancelled) return
        const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' })
        const scene = new THREE.Scene()
        const camera = new THREE.OrthographicCamera(0, 1, 0, 1, 0.1, 40)
        camera.position.z = 9
        const geometry = new THREE.BufferGeometry()
        const material = new THREE.ShaderMaterial({
          transparent: true, depthWrite: false,
          uniforms: { uTime: { value: 0 }, uColor: { value: new THREE.Color('#156f58') }, uOpacity: { value: 0.34 } },
          vertexShader: `attribute float aStage; varying float vStage;
            void main() { vStage = aStage; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
          fragmentShader: `uniform vec3 uColor; uniform float uOpacity; uniform float uTime; varying float vStage;
            void main() { float light = pow(0.5 + 0.5 * cos(uTime * 1.15 - vStage * 1.2), 4.0);
              float progression = 0.35 + vStage * 0.18;
              gl_FragColor = vec4(uColor, uOpacity * progression * (0.5 + 0.5 * light));
              #include <colorspace_fragment>
            }`,
        })
        const lines = new THREE.LineSegments(geometry, material)
        lines.frustumCulled = false
        scene.add(lines)
        const timer = new THREE.Timer()
        timer.connect(document)
        let visible = true
        let lost = false
        let lastFrame = -Infinity
        const frame = (timestamp: number) => {
          if (timestamp - lastFrame < 32) return
          lastFrame = timestamp
          timer.update(timestamp)
          material.uniforms.uTime.value = timer.getElapsed()
          renderer.render(scene, camera)
        }
        const sync = () => {
          const running = !document.hidden && visible && !pausedRef.current && !lost
          timer.reset()
          renderer.setAnimationLoop(running ? frame : null)
        }
        syncRef.current = sync
        const resize = () => {
          const { width, height } = host.getBoundingClientRect()
          if (!width || !height) return
          renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, width < 600 ? 1.25 : 1.5))
          renderer.setSize(width, height)
          camera.right = width
          camera.bottom = height
          camera.updateProjectionMatrix()
          const compact = width < 768
          const count = compact ? 3 : 4
          const trackX = compact ? Math.max(12, width * 0.055) : Math.max(28, (width - 440) * 0.28)
          const positions: number[] = []
          const stages: number[] = []
          // Fixed, mirrored tracks: only the light advances, never the groups.
          for (let stage = 0; stage < count; stage++) {
            const half = compact ? 5 + stage * 2 : 16 + stage * 5
            const centerY = height * (0.18 + stage * (compact ? 0.29 : 0.205))
            for (const x of [trackX, width - trackX]) {
              for (let stroke = 0; stroke < 3; stroke++) {
                const y = centerY - half * 0.9 + stroke * half * 0.6
                positions.push(x - half, y, 0, x, y + half * 0.6, 0, x, y + half * 0.6, 0, x + half, y, 0)
                stages.push(stage, stage, stage, stage)
              }
            }
          }
          geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
          geometry.setAttribute('aStage', new THREE.Float32BufferAttribute(stages, 1))
          if (!lost) renderer.render(scene, camera)
        }
        const theme = () => {
          const dark = document.documentElement.classList.contains('dark')
          material.uniforms.uColor.value.set(dark ? '#8ce4a6' : '#156f58')
          material.uniforms.uOpacity.value = dark ? 0.6 : 0.5
          if (!lost) renderer.render(scene, camera)
        }
        const onContextLost = () => { lost = true; renderer.setAnimationLoop(null); renderer.domElement.hidden = true; setReady(false) }
        const resizeObserver = new ResizeObserver(resize)
        const intersection = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; sync() })
        const themeObserver = new MutationObserver(theme)
        release = () => {
          renderer.setAnimationLoop(null)
          resizeObserver.disconnect()
          intersection.disconnect()
          themeObserver.disconnect()
          document.removeEventListener('visibilitychange', sync)
          renderer.domElement.removeEventListener('webglcontextlost', onContextLost)
          timer.dispose()
          geometry.dispose()
          material.dispose()
          renderer.dispose()
          renderer.forceContextLoss()
          renderer.domElement.remove()
          syncRef.current = () => {}
        }
        renderer.domElement.setAttribute('aria-hidden', 'true')
        host.appendChild(renderer.domElement)
        resizeObserver.observe(host)
        intersection.observe(host)
        themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
        document.addEventListener('visibilitychange', sync)
        renderer.domElement.addEventListener('webglcontextlost', onContextLost)
        resize()
        theme()
        sync()
        setReady(true)
      } catch {
        release()
        if (!cancelled) setReady(false)
        // The static CSS composition remains available without WebGL or a downloaded chunk.
      }
    }
    if (typeof window.requestIdleCallback === 'function') idle = window.requestIdleCallback(() => void start(), { timeout: 1200 })
    else timeout = window.setTimeout(() => void start(), 200)
    return () => {
      cancelled = true
      if (idle !== undefined) window.cancelIdleCallback(idle)
      if (timeout !== undefined) window.clearTimeout(timeout)
      release()
      setReady(false)
    }
  }, [reducedMotion])

  return <>
    <div className={styles.scene} aria-hidden="true">
      <div className={styles.staticTracks} hidden={ready && !reducedMotion}>
        {[-1, 1].map(side => <div key={side} className={side < 0 ? styles.trackLeft : styles.trackRight}>
          {[0, 1, 2, 3].map(stage => <svg key={stage} className={styles.staticStage}
            style={{ '--stage': stage } as CSSProperties} viewBox="0 0 60 54" fill="none">
            <path d="M0 0 30 18 60 0 M0 18 30 36 60 18 M0 36 30 54 60 36"
              stroke="currentColor" strokeWidth="1" vectorEffect="non-scaling-stroke" />
          </svg>)}
        </div>)}
      </div>
      <div ref={hostRef} className={styles.canvas} />
    </div>
    {ready && !reducedMotion && <button type="button" className={styles.motionControl}
      aria-label={paused ? 'Retomar animação' : 'Pausar animação'} aria-pressed={paused}
      onClick={() => { pausedRef.current = !paused; setPaused(!paused); syncRef.current() }}>
      {paused ? <Play size={16} aria-hidden="true" /> : <Pause size={16} aria-hidden="true" />}
    </button>}
  </>
}
