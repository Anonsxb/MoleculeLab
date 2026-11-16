"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import * as THREE from "three";
import styles from "./studio.module.css";

export interface StudioAtom {
  index: number;
  symbol: string;
  atomic_number: number;
  x: number;
  y: number;
  z: number;
  vdw_radius: number;
  covalent_radius: number;
  gasteiger_charge: number;
  formal_charge: number;
  is_aromatic: boolean;
  hybridization: string;
  color: string;
  is_hydrogen: boolean;
}

export interface StudioBond {
  atom1: number;
  atom2: number;
  order: number;
  is_aromatic: boolean;
  length: number;
}

export interface StudioData {
  formula: string;
  force_field?: string;
  initial_energy_kcal_mol?: number | null;
  final_energy_kcal_mol?: number | null;
  energy_delta_kcal_mol?: number | null;
  converged?: boolean | null;
  atoms: StudioAtom[];
  bonds: StudioBond[];
  formats?: {
    pdb?: string;
    xyz?: string;
    mol?: string;
  };
}

interface ViewerProps {
  data: StudioData;
  mode: "ball_stick" | "spacefill" | "stick" | "charge";
  showHydrogens: boolean;
  showLabels?: boolean;
  autoRotate: boolean;
  onSelectAtom: (atom: StudioAtom | null) => void;
  onMeasurementChange: (measurement: { type: string; atoms: number[]; value: string } | null) => void;
  // Editor integration props
  editorMode?: "select" | "add_atom" | "draw_bond" | "delete" | "measure";
  elementToAdd?: string;
  bondOrderToAdd?: number;
  selectedEditorAtom?: number;
  onEditorAction?: (action: any) => void;
}

// Convert Gasteiger charge [-0.5, +0.5] to RGB color (red = neg, white = 0, blue = pos)
function chargeToColor(charge: number): THREE.Color {
  const clamped = Math.max(-0.6, Math.min(0.6, charge));
  const norm = clamped / 0.6; // -1 to +1
  if (norm < 0) {
    // Red to White
    const t = 1 + norm; // 0 (pure red) to 1 (white)
    return new THREE.Color(1.0, t, t);
  } else {
    // White to Blue
    const t = 1 - norm; // 1 (white) to 0 (pure blue)
    return new THREE.Color(t, t, 1.0);
  }
}

export default function StudioViewer({
  data,
  mode,
  showHydrogens,
  autoRotate,
  onSelectAtom,
  onMeasurementChange,
  editorMode = "select",
  elementToAdd,
  bondOrderToAdd,
  selectedEditorAtom,
  onEditorAction,
}: ViewerProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const groupRef = useRef<THREE.Group | null>(null);
  const atomMeshesRef = useRef<Map<number, THREE.Mesh>>(new Map());
  const hoveredAtomRef = useRef<THREE.Mesh | null>(null);

  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);

  // Orbit control interaction state
  const isDraggingRef = useRef(false);
  const isPanningRef = useRef(false);
  const prevMouseRef = useRef({ x: 0, y: 0 });

  // Store editor props in refs so the click handler always sees current values
  const editorModeRef = useRef(editorMode);
  const elementToAddRef = useRef(elementToAdd);
  const bondOrderToAddRef = useRef(bondOrderToAdd);
  const selectedEditorAtomRef = useRef(selectedEditorAtom);
  const onEditorActionRef = useRef(onEditorAction);

  useEffect(() => { editorModeRef.current = editorMode; }, [editorMode]);
  useEffect(() => { elementToAddRef.current = elementToAdd; }, [elementToAdd]);
  useEffect(() => { bondOrderToAddRef.current = bondOrderToAdd; }, [bondOrderToAdd]);
  useEffect(() => { selectedEditorAtomRef.current = selectedEditorAtom; }, [selectedEditorAtom]);
  useEffect(() => { onEditorActionRef.current = onEditorAction; }, [onEditorAction]);

  // Calculate geometry measurements
  const updateMeasurements = useCallback((indices: number[]) => {
    if (indices.length < 2) {
      onMeasurementChange(null);
      return;
    }

    const atomList = data.atoms;
    const a1 = atomList[indices[0]];
    const a2 = atomList[indices[1]];

    if (!a1 || !a2) {
      onMeasurementChange(null);
      return;
    }

    if (indices.length === 2) {
      const dx = a1.x - a2.x;
      const dy = a1.y - a2.y;
      const dz = a1.z - a2.z;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
      onMeasurementChange({
        type: `Distance (${a1.symbol}${a1.index + 1} — ${a2.symbol}${a2.index + 1})`,
        atoms: indices,
        value: `${dist.toFixed(3)} Å`,
      });
    } else if (indices.length === 3) {
      const a3 = atomList[indices[2]];
      if (!a3) return;
      const v1 = new THREE.Vector3(a1.x - a2.x, a1.y - a2.y, a1.z - a2.z).normalize();
      const v2 = new THREE.Vector3(a3.x - a2.x, a3.y - a2.y, a3.z - a2.z).normalize();
      const dot = Math.max(-1, Math.min(1, v1.dot(v2)));
      const angleDeg = (Math.acos(dot) * 180) / Math.PI;
      onMeasurementChange({
        type: `Bond Angle (${a1.symbol}${a1.index + 1} — ${a2.symbol}${a2.index + 1} — ${a3.symbol}${a3.index + 1})`,
        atoms: indices,
        value: `${angleDeg.toFixed(2)}°`,
      });
    } else if (indices.length === 4) {
      const a3 = atomList[indices[2]];
      const a4 = atomList[indices[3]];
      if (!a3 || !a4) return;
      const p1 = new THREE.Vector3(a1.x, a1.y, a1.z);
      const p2 = new THREE.Vector3(a2.x, a2.y, a2.z);
      const p3 = new THREE.Vector3(a3.x, a3.y, a3.z);
      const p4 = new THREE.Vector3(a4.x, a4.y, a4.z);

      const b1 = new THREE.Vector3().subVectors(p2, p1);
      const b2 = new THREE.Vector3().subVectors(p3, p2);
      const b3 = new THREE.Vector3().subVectors(p4, p3);

      const n1 = new THREE.Vector3().crossVectors(b1, b2).normalize();
      const n2 = new THREE.Vector3().crossVectors(b2, b3).normalize();
      const m1 = new THREE.Vector3().crossVectors(n1, b2.clone().normalize());

      const x = n1.dot(n2);
      const y = m1.dot(n2);
      const dihedralDeg = (Math.atan2(y, x) * 180) / Math.PI;
      onMeasurementChange({
        type: `Dihedral Angle (${a1.symbol}${a1.index + 1} — ${a2.symbol}${a2.index + 1} — ${a3.symbol}${a3.index + 1} — ${a4.symbol}${a4.index + 1})`,
        atoms: indices,
        value: `${dihedralDeg.toFixed(2)}°`,
      });
    }
  }, [data.atoms, onMeasurementChange]);

  // Build Three.js scene
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Camera
    const width = container.clientWidth;
    const height = container.clientHeight;
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 1000);
    camera.position.set(0, 0, 18);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: true,
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    rendererRef.current = renderer;
    container.innerHTML = "";
    container.appendChild(renderer.domElement);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xffffff, 1.8);
    dirLight1.position.set(15, 20, 20);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0x38bdf8, 0.8);
    dirLight2.position.set(-15, -10, -10);
    scene.add(dirLight2);

    // Group for molecule
    const molGroup = new THREE.Group();
    groupRef.current = molGroup;
    scene.add(molGroup);

    // Resize handler
    const handleResize = () => {
      if (!container || !renderer || !camera) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", handleResize);

    // Mouse Controls
    const dom = renderer.domElement;

    const handleMouseDown = (e: MouseEvent) => {
      prevMouseRef.current = { x: e.clientX, y: e.clientY };
      if (e.button === 2 || e.shiftKey) {
        isPanningRef.current = true;
      } else if (e.button === 0) {
        isDraggingRef.current = true;
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      const dx = e.clientX - prevMouseRef.current.x;
      const dy = e.clientY - prevMouseRef.current.y;
      prevMouseRef.current = { x: e.clientX, y: e.clientY };

      if (isDraggingRef.current && molGroup) {
        molGroup.rotation.y += dx * 0.008;
        molGroup.rotation.x += dy * 0.008;
      } else if (isPanningRef.current && camera) {
        camera.position.x -= dx * 0.02;
        camera.position.y += dy * 0.02;
      } else {
        // Raycasting for hover
        const rect = dom.getBoundingClientRect();
        const mouse = new THREE.Vector2(
          ((e.clientX - rect.left) / rect.width) * 2 - 1,
          -((e.clientY - rect.top) / rect.height) * 2 + 1
        );
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(Array.from(atomMeshesRef.current.values()));

        if (intersects.length > 0) {
          const hit = intersects[0].object as THREE.Mesh;
          if (hoveredAtomRef.current && hoveredAtomRef.current !== hit) {
            (hoveredAtomRef.current.material as THREE.MeshStandardMaterial).emissive.setHex(0x000000);
          }
          hoveredAtomRef.current = hit;
          (hit.material as THREE.MeshStandardMaterial).emissive.setHex(0x38bdf8);
          dom.style.cursor = "pointer";
        } else {
          if (hoveredAtomRef.current) {
            (hoveredAtomRef.current.material as THREE.MeshStandardMaterial).emissive.setHex(0x000000);
            hoveredAtomRef.current = null;
          }
          dom.style.cursor = "grab";
        }
      }
    };

    const handleMouseUp = () => {
      isDraggingRef.current = false;
      isPanningRef.current = false;
    };

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (!camera) return;
      camera.position.z = Math.max(4, Math.min(60, camera.position.z + e.deltaY * 0.015));
    };

    const handleClick = (e: MouseEvent) => {
      const rect = dom.getBoundingClientRect();
      const mouse = new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1
      );
      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(Array.from(atomMeshesRef.current.values()));

      const currentEditorMode = editorModeRef.current;
      const currentOnEditorAction = onEditorActionRef.current;

      // Editor mode handling
      if (currentEditorMode === "add_atom" && currentOnEditorAction) {
        const dir = raycaster.ray.direction.clone().normalize();
        const pos = camera.position.clone().add(dir.multiplyScalar(18));
        const symbol = elementToAddRef.current || "C";
        const atomicNumberMap: Record<string, number> = { H: 1, C: 6, N: 7, O: 8, F: 9, P: 15, S: 16, Cl: 17, Br: 35, I: 53 };
        const atomicNum = atomicNumberMap[symbol] ?? 6;
        currentOnEditorAction({
          type: "ADD_ATOM",
          payload: {
            index: Date.now(),
            symbol,
            atomic_number: atomicNum,
            x: pos.x,
            y: pos.y,
            z: pos.z,
            is_hydrogen: symbol === "H",
          },
        });
        return;
      }

      if (currentEditorMode === "delete" && currentOnEditorAction) {
        if (intersects.length > 0) {
          const hit = intersects[0].object as THREE.Mesh;
          const atomIdx = hit.userData.atomIndex as number;
          currentOnEditorAction({ type: "DELETE_ATOM", payload: atomIdx });
        }
        return;
      }

      if (currentEditorMode === "draw_bond" && currentOnEditorAction) {
        if (intersects.length > 0) {
          const hit = intersects[0].object as THREE.Mesh;
          const atomIdx = hit.userData.atomIndex as number;
          const selAtom = selectedEditorAtomRef.current;
          if (selAtom != null && selAtom !== atomIdx) {
            currentOnEditorAction({
              type: "ADD_BOND",
              payload: {
                atom1: selAtom,
                atom2: atomIdx,
                order: bondOrderToAddRef.current ?? 1,
                is_aromatic: false,
              },
            });
          } else {
            currentOnEditorAction({ type: "SET_SELECTED_ATOM", payload: atomIdx });
          }
        }
        return;
      }

      // Default selection behavior (select mode or measurement)
      if (intersects.length > 0) {
        const hit = intersects[0].object as THREE.Mesh;
        const atomIdx = hit.userData.atomIndex as number;
        const selectedAtom = data.atoms.find((a) => a.index === atomIdx) || null;
        onSelectAtom(selectedAtom);

        setSelectedIndices((prev) => {
          let next: number[];
          if (prev.includes(atomIdx)) {
            next = prev.filter((i) => i !== atomIdx);
          } else {
            next = [...prev, atomIdx].slice(-4); // max 4 atoms for dihedral
          }
          updateMeasurements(next);
          return next;
        });
      } else {
        // clicked background: clear selection
        setSelectedIndices([]);
        onSelectAtom(null);
        updateMeasurements([]);
      }
    };

    const preventContextMenu = (e: MouseEvent) => e.preventDefault();

    dom.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    dom.addEventListener("wheel", handleWheel, { passive: false });
    dom.addEventListener("click", handleClick);
    dom.addEventListener("contextmenu", preventContextMenu);

    // Animation Loop
    let animId: number;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      if (autoRotate && molGroup && !isDraggingRef.current) {
        molGroup.rotation.y += 0.005;
      }
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", handleResize);
      dom.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      dom.removeEventListener("wheel", handleWheel);
      dom.removeEventListener("click", handleClick);
      dom.removeEventListener("contextmenu", preventContextMenu);
      renderer.dispose();
      if (container) container.innerHTML = "";
    };
  }, [autoRotate, data.atoms, onSelectAtom, updateMeasurements]);

  // Rebuild 3D objects when data, mode, or showHydrogens changes
  useEffect(() => {
    const group = groupRef.current;
    if (!group) return;

    // Clear old meshes
    while (group.children.length > 0) {
      const obj = group.children[0];
      group.remove(obj);
      if ((obj as THREE.Mesh).geometry) (obj as THREE.Mesh).geometry.dispose();
    }
    atomMeshesRef.current.clear();

    const atoms = data.atoms;
    const bonds = data.bonds;
    if (!atoms || atoms.length === 0) return;

    // Compute center of mass to center molecule
    let cx = 0, cy = 0, cz = 0;
    let visibleCount = 0;
    atoms.forEach((a) => {
      if (!showHydrogens && a.is_hydrogen) return;
      cx += a.x;
      cy += a.y;
      cz += a.z;
      visibleCount++;
    });
    if (visibleCount > 0) {
      cx /= visibleCount;
      cy /= visibleCount;
      cz /= visibleCount;
    }

    // Sphere geometry cache
    const sphereGeom = new THREE.SphereGeometry(1, 32, 24);

    // Add Atoms
    atoms.forEach((atom) => {
      if (!showHydrogens && atom.is_hydrogen) return;

      let radius = 0.45;
      if (mode === "spacefill") {
        radius = Math.max(0.6, atom.vdw_radius * 0.85);
      } else if (mode === "stick") {
        radius = 0.22;
      } else {
        // Ball and stick
        radius = atom.is_hydrogen ? 0.26 : Math.max(0.38, atom.covalent_radius * 0.55);
      }

      let color = new THREE.Color(atom.color);
      if (mode === "charge") {
        color = chargeToColor(atom.gasteiger_charge);
      }

      const mat = new THREE.MeshStandardMaterial({
        color: color,
        metalness: 0.15,
        roughness: 0.35,
      });

      const mesh = new THREE.Mesh(sphereGeom, mat);
      mesh.scale.set(radius, radius, radius);
      mesh.position.set(atom.x - cx, atom.y - cy, atom.z - cz);
      mesh.userData = { atomIndex: atom.index };

      group.add(mesh);
      atomMeshesRef.current.set(atom.index, mesh);
    });

    // Add Bonds (cylinders)
    if (mode !== "spacefill") {
      const cylinderGeom = new THREE.CylinderGeometry(0.1, 0.1, 1, 16);
      const bondColor = new THREE.Color(0x94a3b8);

      bonds.forEach((bond) => {
        const a1 = atoms[bond.atom1];
        const a2 = atoms[bond.atom2];
        if (!a1 || !a2) return;
        if (!showHydrogens && (a1.is_hydrogen || a2.is_hydrogen)) return;

        const p1 = new THREE.Vector3(a1.x - cx, a1.y - cy, a1.z - cz);
        const p2 = new THREE.Vector3(a2.x - cx, a2.y - cy, a2.z - cz);
        const dir = new THREE.Vector3().subVectors(p2, p1);
        const len = dir.length();
        const mid = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5);

        const mat = new THREE.MeshStandardMaterial({
          color: bondColor,
          metalness: 0.2,
          roughness: 0.4,
        });

        const cylinder = new THREE.Mesh(cylinderGeom, mat);
        cylinder.scale.set(1, len, 1);
        cylinder.position.copy(mid);

        // Orient cylinder
        const up = new THREE.Vector3(0, 1, 0);
        const axis = new THREE.Vector3().crossVectors(up, dir).normalize();
        const angle = Math.acos(Math.max(-1, Math.min(1, up.dot(dir.clone().normalize()))));
        if (axis.length() > 0.0001) {
          cylinder.quaternion.setFromAxisAngle(axis, angle);
        }

        group.add(cylinder);
      });
    }

    // Auto-fit camera
    let maxDist = 0;
    atoms.forEach((a) => {
      if (!showHydrogens && a.is_hydrogen) return;
      const d = Math.sqrt((a.x - cx) ** 2 + (a.y - cy) ** 2 + (a.z - cz) ** 2);
      if (d > maxDist) maxDist = d;
    });

    if (cameraRef.current) {
      cameraRef.current.position.set(0, 0, Math.max(8, maxDist * 3.2));
      cameraRef.current.lookAt(0, 0, 0);
    }
  }, [data, mode, showHydrogens]);

  // Highlight selected atoms
  useEffect(() => {
    atomMeshesRef.current.forEach((mesh, idx) => {
      const mat = mesh.material as THREE.MeshStandardMaterial;
      if (selectedIndices.includes(idx)) {
        mat.emissive.setHex(0xfacc15); // Yellow glow
      } else {
        mat.emissive.setHex(0x000000);
      }
    });
  }, [selectedIndices]);

  return (
    <div className={styles.viewportContainer}>
      <div ref={mountRef} className={styles.canvas} />

      <div className={styles.viewportOverlay}>
        <div className={styles.guideTag}>
          <span><span className={styles.kbd}>Left Click</span> Rotate</span>
          <span><span className={styles.kbd}>Right Click / Shift</span> Pan</span>
          <span><span className={styles.kbd}>Wheel</span> Zoom</span>
        </div>
        <div className={styles.guideTag}>
          <span>Click atoms to inspect. Select 2 for Distance, 3 for Angle, 4 for Dihedral.</span>
        </div>
      </div>
    </div>
  );
}
