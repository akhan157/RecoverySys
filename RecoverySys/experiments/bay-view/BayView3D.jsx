/* global ResizeObserver */
import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

export default function BayView3D({ geometry, activeCategory, onSelectCategory }) {
  const host = useRef(null)
  const actions = useRef({})
  const selection = useRef(activeCategory)
  const sceneSelection = useRef(null)
  useEffect(() => {
    selection.current = activeCategory
    sceneSelection.current?.(activeCategory)
  }, [activeCategory])
  const [error, setError] = useState('')
  useEffect(() => {
    const container = host.current
    let renderer
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false })
    } catch {
      setError('3D is unavailable on this device. Use the 2D view and dimension list.')
      return
    }
    setError('')
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    renderer.setClearColor(0x101a24)
    container.appendChild(renderer.domElement)
    renderer.domElement.setAttribute(
      'aria-label',
      'Rotatable 3D recovery bay; use camera buttons or drag to rotate, scroll to zoom'
    )
    const scene = new THREE.Scene()
    const extent = geometry.extent
    const bayX = -geometry.separation / 2
    const referenceX = geometry.separation / 2
    const camera = new THREE.PerspectiveCamera(40, 1, extent / 1000, extent * 100)
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.target.set(0, Math.max(geometry.length, geometry.reference?.length ?? 0) / 2, 0)
    controls.minDistance = extent * 0.1
    controls.maxDistance = extent * 12
    const render = () => renderer.render(scene, camera)
    const reset = () => {
      controls.target.set(0, Math.max(geometry.length, geometry.reference?.length ?? 0) / 2, 0)
      camera.position.set(extent * 1.3, extent * 1.1, extent * 1.7)
      controls.update()
      render()
    }
    scene.add(new THREE.HemisphereLight(0xffffff, 0x344458, 2.5))
    const light = new THREE.DirectionalLight(0xffffff, 3)
    light.position.set(extent, extent * 2, extent)
    scene.add(light)
    const grid = new THREE.GridHelper(extent * 2, 20, 0x66788a, 0x283a4a)
    scene.add(grid)
    const bay = new THREE.Mesh(
      new THREE.CylinderGeometry(
        geometry.diameter / 2,
        geometry.diameter / 2,
        geometry.length,
        48,
        1,
        true
      ),
      new THREE.MeshBasicMaterial({
        color: 0xb6d2df,
        side: THREE.BackSide,
        transparent: true,
        opacity: 0.12,
        depthWrite: false,
      })
    )
    bay.position.set(bayX, geometry.length / 2, 0)
    scene.add(bay)
    const outline = new THREE.LineSegments(
      new THREE.EdgesGeometry(bay.geometry, 20),
      new THREE.LineBasicMaterial({ color: 0x98b9c8, transparent: true, opacity: 0.65 })
    )
    outline.position.copy(bay.position)
    scene.add(outline)
    scene.add(new THREE.AxesHelper(geometry.diameter))
    const meshes = (geometry.reference ? [geometry.reference] : []).map((part) => {
      const mesh = new THREE.Mesh(
        part.rigid
          ? new THREE.BoxGeometry(part.width, part.length, part.depth)
          : new THREE.CylinderGeometry(part.width / 2, part.width / 2, part.length, 48),
        new THREE.MeshStandardMaterial({
          color: part.color,
          transparent: true,
          opacity: part.rigid ? 0.7 : 0.25,
          wireframe: !part.rigid,
          roughness: 0.7,
          metalness: 0.12,
          emissive: selection.current === part.category ? part.color : 0x000000,
          emissiveIntensity: 0.3,
        })
      )
      mesh.position.set(referenceX, part.length / 2, 0)
      if (part.range) {
        const minimum = new THREE.Mesh(
          new THREE.CylinderGeometry(
            part.range.widthMin / 2,
            part.range.widthMin / 2,
            part.range.lengthMin,
            32
          ),
          new THREE.MeshBasicMaterial({
            color: part.color,
            wireframe: true,
            transparent: true,
            opacity: 0.35,
          })
        )
        minimum.position.set(referenceX, part.range.lengthMin / 2, 0)
        scene.add(minimum)
      }
      mesh.userData.category = part.category
      scene.add(mesh)
      return mesh
    })
    sceneSelection.current = (category) => {
      for (const mesh of meshes)
        mesh.material.emissive.set(
          mesh.userData.category === category ? mesh.material.color : 0x000000
        )
      render()
    }
    controls.addEventListener('change', render)
    const resize = () => {
      const width = container.clientWidth || 340
      renderer.setSize(width, 340)
      camera.aspect = width / 340
      camera.updateProjectionMatrix()
      render()
    }
    const observer = new ResizeObserver(resize)
    observer.observe(container)
    const raycaster = new THREE.Raycaster()
    let down = null
    const onDown = (event) => {
      down = [event.clientX, event.clientY]
    }
    const pick = (event) => {
      if (!down || Math.hypot(event.clientX - down[0], event.clientY - down[1]) > 5) return
      const rect = renderer.domElement.getBoundingClientRect()
      raycaster.setFromCamera(
        new THREE.Vector2(
          ((event.clientX - rect.left) / rect.width) * 2 - 1,
          (-(event.clientY - rect.top) / rect.height) * 2 + 1
        ),
        camera
      )
      const hit = raycaster.intersectObjects(meshes)[0]
      if (hit) onSelectCategory(hit.object.userData.category)
    }
    const lost = (event) => {
      event.preventDefault()
      setError('3D graphics context was lost. Switch to 2D, then back to 3D to retry.')
    }
    renderer.domElement.addEventListener('pointerdown', onDown)
    renderer.domElement.addEventListener('pointerup', pick)
    renderer.domElement.addEventListener('webglcontextlost', lost)
    actions.current = {
      reset,
      rotate: () => {
        const offset = camera.position.clone().sub(controls.target)
        offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 8)
        camera.position.copy(controls.target).add(offset)
        controls.update()
        render()
      },
      zoom: (factor) => {
        const offset = camera.position.clone().sub(controls.target).multiplyScalar(factor)
        offset.clampLength(controls.minDistance, controls.maxDistance)
        camera.position.copy(controls.target).add(offset)
        controls.update()
        render()
      },
    }
    reset()
    resize()
    return () => {
      observer.disconnect()
      controls.dispose()
      renderer.domElement.removeEventListener('pointerdown', onDown)
      renderer.domElement.removeEventListener('pointerup', pick)
      renderer.domElement.removeEventListener('webglcontextlost', lost)
      scene.traverse((object) => {
        object.geometry?.dispose()
        if (Array.isArray(object.material))
          object.material.forEach((material) => material.dispose())
        else object.material?.dispose()
      })
      renderer.dispose()
      renderer.domElement.remove()
      actions.current = {}
      sceneSelection.current = null
    }
  }, [geometry, onSelectCategory])
  return (
    <div>
      {error && <p role="status">{error}</p>}
      <div ref={host} className="bay-view__canvas" hidden={!!error} />
      {!error && (
        <>
          <div className="bay-view__toolbar" role="group" aria-label="3D camera controls">
            <button type="button" onClick={() => actions.current.rotate?.()}>
              Rotate 3D
            </button>
            <button type="button" onClick={() => actions.current.zoom?.(0.8)}>
              Zoom in
            </button>
            <button type="button" onClick={() => actions.current.zoom?.(1.25)}>
              Zoom out
            </button>
            <button type="button" onClick={() => actions.current.reset?.()}>
              Reset view
            </button>
          </div>
          <p className="bay-view__note">
            Drag to orbit · scroll/pinch to zoom · right-drag to pan · select a part in the view or
            list.
          </p>
        </>
      )}
    </div>
  )
}
