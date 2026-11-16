"use client";

import { useEffect, useRef, useCallback } from "react";
import * as THREE from "three";
import type { ModellingAtom, ModellingBond, ModellingTool, RenderMode, MeasurementResult } from "./types";
import styles from "./modelling.module.css";

interface ViewerProps {
  atoms: ModellingAtom[];
  bonds: ModellingBond[];
  activeTool: ModellingTool;
  selectedElement: string;
  selectedAtomId: number | null;
  selectedBondId: string | null;
  bondOrderToAdd: number;
  renderMode: RenderMode;
  showLabels: boolean;
  showBonds: boolean;
  autoRotate: boolean;
  warningAtomIds: number[];
  cameraViewTrigger?: string; // "reset" | "front" | "top" | "side"
  onSelectAtom: (atom: ModellingAtom | null) => void;
  onSelectBond: (bond: ModellingBond | null) => void;
  onAddAtomAt: (pos: { x: number; y: number; z: number }, sproutFromAtomId?: number) => void;
  onMoveAtom: (atomId: number, newPos: { x: number; y: number; z: number }) => void;
  onDeleteAtom: (atomId: number) => void;
  onDeleteBond: (bondId: string) => void;
  onAddBond: (atom1Id: number, atom2Id: number) => void;
  onChangeBondOrder: (bondId: string) => void;
  onMeasurement: (result: MeasurementResult | null) => void;
}

// Helper to build a single 3D arrow handle for the 3D translation gizmo
function createGizmoArrow(
  direction: THREE.Vector3,
  colorHex: number,
  axisName: "x" | "y" | "z"
): THREE.Group {
  const group = new THREE.Group();
  group.userData = { isGizmoHandle: true, axis: axisName };

  const shaftLength = 1.3;
  const shaftRadius = 0.045;
  const headLength = 0.45;
  const headRadius = 0.12;

  const mat = new THREE.MeshStandardMaterial({
    color: colorHex,
    roughness: 0.25,
    metalness: 0.5,
    depthTest: false,
    depthWrite: false,
  });

  const shaftGeom = new THREE.CylinderGeometry(shaftRadius, shaftRadius, shaftLength, 12);
  const shaft = new THREE.Mesh(shaftGeom, mat);
  shaft.position.y = shaftLength / 2;
  shaft.userData = { isGizmoHandle: true, axis: axisName };
  group.add(shaft);

  const headGeom = new THREE.ConeGeometry(headRadius, headLength, 16);
  const head = new THREE.Mesh(headGeom, mat);
  head.position.y = shaftLength + headLength / 2;
  head.userData = { isGizmoHandle: true, axis: axisName };
  group.add(head);

  // Orient group to match given direction (default is +Y)
  const defaultDir = new THREE.Vector3(0, 1, 0);
  const quat = new THREE.Quaternion().setFromUnitVectors(defaultDir, direction.clone().normalize());
  group.setRotationFromQuaternion(quat);

  return group;
}

export default function ModellingViewer({
  atoms,
  bonds,
  activeTool,
  selectedElement,
  selectedAtomId,
  selectedBondId,
  bondOrderToAdd,
  renderMode,
  showLabels,
  showBonds,
  autoRotate,
  warningAtomIds,
  cameraViewTrigger,
  onSelectAtom,
  onSelectBond,
  onAddAtomAt,
  onMoveAtom,
  onDeleteAtom,
  onDeleteBond,
  onAddBond,
  onChangeBondOrder,
  onMeasurement,
}: ViewerProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const molGroupRef = useRef<THREE.Group | null>(null);
  const labelsGroupRef = useRef<THREE.Group | null>(null);
  const gizmoGroupRef = useRef<THREE.Group | null>(null);
  const guideLineRef = useRef<THREE.Line | null>(null);

  const atomMeshesRef = useRef<Map<number, THREE.Mesh>>(new Map());
  const bondMeshesRef = useRef<Map<string, THREE.Object3D>>(new Map());
  const gizmoHandlesRef = useRef<THREE.Object3D[]>([]);

  // ALL props and callbacks kept in a ref to NEVER trigger re-instantiation of WebGL scene
  const propsRef = useRef({
    atoms,
    bonds,
    activeTool,
    selectedElement,
    selectedAtomId,
    selectedBondId,
    bondOrderToAdd,
    renderMode,
    showLabels,
    showBonds,
    autoRotate,
    warningAtomIds,
    onSelectAtom,
    onSelectBond,
    onAddAtomAt,
    onMoveAtom,
    onDeleteAtom,
    onDeleteBond,
    onAddBond,
    onChangeBondOrder,
    onMeasurement,
  });

  useEffect(() => {
    propsRef.current = {
      atoms,
      bonds,
      activeTool,
      selectedElement,
      selectedAtomId,
      selectedBondId,
      bondOrderToAdd,
      renderMode,
      showLabels,
      showBonds,
      autoRotate,
      warningAtomIds,
      onSelectAtom,
      onSelectBond,
      onAddAtomAt,
      onMoveAtom,
      onDeleteAtom,
      onDeleteBond,
      onAddBond,
      onChangeBondOrder,
      onMeasurement,
    };
  });

  // Multi-atom selection for measurement (dist: 2, angle: 3, dihedral: 4)
  const measureAtomIdsRef = useRef<number[]>([]);

  // First atom selected when in 'add_bond' mode
  const bondSourceAtomIdRef = useRef<number | null>(null);

  // 3D Gizmo & Move Drag state
  const draggingAtomIdRef = useRef<number | null>(null);
  const activeGizmoAxisRef = useRef<"x" | "y" | "z" | "plane" | null>(null);
  const dragStartAtomPosRef = useRef<THREE.Vector3>(new THREE.Vector3());
  const dragStartMouseRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const dragPlaneRef = useRef<THREE.Plane>(new THREE.Plane());

  // Mouse interaction states
  const isOrbitingRef = useRef(false);
  const isPanningRef = useRef(false);
  const prevMouseRef = useRef({ x: 0, y: 0 });
  const hoveredAtomIdRef = useRef<number | null>(null);

  // Compute measurements callback
  const updateMeasurementOutput = useCallback((atomIds: number[]) => {
    const atomList = propsRef.current.atoms;
    if (atomIds.length < 2) {
      propsRef.current.onMeasurement(null);
      return;
    }

    const a1 = atomList.find((a) => a.id === atomIds[0]);
    const a2 = atomList.find((a) => a.id === atomIds[1]);
    if (!a1 || !a2) {
      propsRef.current.onMeasurement(null);
      return;
    }

    if (atomIds.length === 2) {
      const dx = a1.x - a2.x;
      const dy = a1.y - a2.y;
      const dz = a1.z - a2.z;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
      propsRef.current.onMeasurement({
        type: "distance",
        atoms: atomIds,
        label: `Distance (${a1.symbol}${a1.id} — ${a2.symbol}${a2.id})`,
        value: `${dist.toFixed(3)} Å`,
      });
    } else if (atomIds.length === 3) {
      const a3 = atomList.find((a) => a.id === atomIds[2]);
      if (!a3) return;
      const v1 = new THREE.Vector3(a1.x - a2.x, a1.y - a2.y, a1.z - a2.z).normalize();
      const v2 = new THREE.Vector3(a3.x - a2.x, a3.y - a2.y, a3.z - a2.z).normalize();
      const dot = Math.max(-1, Math.min(1, v1.dot(v2)));
      const angle = (Math.acos(dot) * 180) / Math.PI;
      propsRef.current.onMeasurement({
        type: "angle",
        atoms: atomIds,
        label: `Bond Angle (${a1.symbol}${a1.id} — ${a2.symbol}${a2.id} — ${a3.symbol}${a3.id})`,
        value: `${angle.toFixed(2)}°`,
      });
    } else if (atomIds.length === 4) {
      const a3 = atomList.find((a) => a.id === atomIds[2]);
      const a4 = atomList.find((a) => a.id === atomIds[3]);
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
      const dihedral = (Math.atan2(y, x) * 180) / Math.PI;
      propsRef.current.onMeasurement({
        type: "dihedral",
        atoms: atomIds,
        label: `Dihedral (${a1.symbol}${a1.id} — ${a2.symbol}${a2.id} — ${a3.symbol}${a3.id} — ${a4.symbol}${a4.id})`,
        value: `${dihedral.toFixed(2)}°`,
      });
    }
  }, []);

  // INITIALIZE THREE.JS SCENE ONCE ON COMPONENT MOUNT
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 800;
    const height = container.clientHeight || 600;

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 0, 16);
    cameraRef.current = camera;

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

    // Studio lighting rig (3-point scientific lighting)
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.8);
    keyLight.position.set(20, 25, 20);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x38bdf8, 0.9);
    fillLight.position.set(-20, -15, -10);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xffffff, 0.6);
    rimLight.position.set(0, -20, 15);
    scene.add(rimLight);

    // Subtle 3D spatial grid on floor
    const grid = new THREE.GridHelper(30, 30, 0x334155, 0x1e293b);
    grid.position.y = -6;
    scene.add(grid);

    // Main Molecule group (holds atom and bond meshes)
    const molGroup = new THREE.Group();
    molGroupRef.current = molGroup;
    scene.add(molGroup);

    // Labels group
    const labelsGroup = new THREE.Group();
    labelsGroupRef.current = labelsGroup;
    scene.add(labelsGroup);

    // 3D Translation Gizmo Group
    const gizmoGroup = new THREE.Group();
    gizmoGroup.visible = false;
    gizmoGroup.renderOrder = 999;
    gizmoGroupRef.current = gizmoGroup;
    scene.add(gizmoGroup);

    // Build Gizmo handles: X (Red), Y (Green), Z (Blue)
    const xArrow = createGizmoArrow(new THREE.Vector3(1, 0, 0), 0xef4444, "x");
    const yArrow = createGizmoArrow(new THREE.Vector3(0, 1, 0), 0x22c55e, "y");
    const zArrow = createGizmoArrow(new THREE.Vector3(0, 0, 1), 0x3b82f6, "z");

    // Center handle (Yellow sphere for planar/free drag)
    const centerGeom = new THREE.SphereGeometry(0.18, 16, 16);
    const centerMat = new THREE.MeshStandardMaterial({
      color: 0xfacc15,
      metalness: 0.6,
      roughness: 0.2,
      depthTest: false,
    });
    const centerHandle = new THREE.Mesh(centerGeom, centerMat);
    centerHandle.userData = { isGizmoHandle: true, axis: "plane" };

    gizmoGroup.add(xArrow, yArrow, zArrow, centerHandle);
    gizmoHandlesRef.current = [xArrow, yArrow, zArrow, centerHandle];

    // Dynamic guide line for bond creation in progress
    const guideLineGeom = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, 0),
    ]);
    const guideLineMat = new THREE.LineDashedMaterial({
      color: 0x38bdf8,
      dashSize: 0.2,
      gapSize: 0.1,
      depthTest: false,
      transparent: true,
      opacity: 0.85,
    });
    const guideLine = new THREE.Line(guideLineGeom, guideLineMat);
    guideLine.visible = false;
    guideLine.computeLineDistances();
    guideLineRef.current = guideLine;
    scene.add(guideLine);

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

    const dom = renderer.domElement;

    // Helper: Normalized Device Coordinates (-1 to +1)
    const getNDC = (e: MouseEvent): THREE.Vector2 => {
      const rect = dom.getBoundingClientRect();
      return new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1
      );
    };

    // Helper: raycast gizmo handles
    const raycastGizmo = (mouse: THREE.Vector2): THREE.Intersection[] => {
      if (!gizmoGroup.visible) return [];
      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(mouse, camera);
      return raycaster.intersectObjects(gizmoHandlesRef.current, true);
    };

    // Helper: raycast atom meshes
    const raycastAtoms = (mouse: THREE.Vector2): THREE.Intersection[] => {
      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(mouse, camera);
      const meshes = Array.from(atomMeshesRef.current.values());
      return raycaster.intersectObjects(meshes, true);
    };

    // Helper: raycast bond meshes
    const raycastBonds = (mouse: THREE.Vector2): THREE.Intersection[] => {
      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(mouse, camera);
      const meshes = Array.from(bondMeshesRef.current.values());
      return raycaster.intersectObjects(meshes, true);
    };

    // MouseDown Handler
    const handleMouseDown = (e: MouseEvent) => {
      prevMouseRef.current = { x: e.clientX, y: e.clientY };
      const mouse = getNDC(e);

      // Right click or Shift+Left click on background -> Pan camera
      if (e.button === 2 || (e.shiftKey && e.button === 0 && !activeGizmoAxisRef.current)) {
        isPanningRef.current = true;
        return;
      }

      if (e.button === 0) {
        // 1. Check if user clicked an axis arrow on the 3D Translation Gizmo
        const gizmoHits = raycastGizmo(mouse);
        if (gizmoHits.length > 0 && propsRef.current.selectedAtomId !== null) {
          const hitObj = gizmoHits[0].object;
          let axis = hitObj.userData.axis as "x" | "y" | "z" | "plane";
          if (!axis && hitObj.parent) {
            axis = hitObj.parent.userData.axis;
          }
          if (axis) {
            activeGizmoAxisRef.current = axis;
            draggingAtomIdRef.current = propsRef.current.selectedAtomId;
            dragStartMouseRef.current = { x: e.clientX, y: e.clientY };

            const targetAtom = propsRef.current.atoms.find((a) => a.id === propsRef.current.selectedAtomId);
            if (targetAtom) {
              dragStartAtomPosRef.current.set(targetAtom.x, targetAtom.y, targetAtom.z);
            }

            // Setup camera-facing plane for raycasting
            const normal = camera.getWorldDirection(new THREE.Vector3()).negate();
            dragPlaneRef.current.setFromNormalAndCoplanarPoint(normal, gizmoGroup.position);
            return;
          }
        }

        const tool = propsRef.current.activeTool;

        // 2. If tool is 'move_atom', check if user clicked an atom to drag directly
        if (tool === "move_atom") {
          const atomHits = raycastAtoms(mouse);
          if (atomHits.length > 0) {
            const hitMesh = atomHits[0].object as THREE.Mesh;
            const atomId = hitMesh.userData.atomId as number;
            draggingAtomIdRef.current = atomId;
            activeGizmoAxisRef.current = e.ctrlKey || e.altKey ? "z" : "plane";
            dragStartMouseRef.current = { x: e.clientX, y: e.clientY };

            const targetAtom = propsRef.current.atoms.find((a) => a.id === atomId);
            if (targetAtom) {
              dragStartAtomPosRef.current.set(targetAtom.x, targetAtom.y, targetAtom.z);
              propsRef.current.onSelectAtom(targetAtom);
            }

            const normal = camera.getWorldDirection(new THREE.Vector3()).negate();
            dragPlaneRef.current.setFromNormalAndCoplanarPoint(normal, hitMesh.position);
            return;
          }
        }

        // 3. If tool is 'add_bond', 'add_atom', 'change_bond', 'delete', or 'measure_*',
        // check if user clicked an atom or bond so we DO NOT inadvertently trigger orbit!
        if (["add_bond", "add_atom", "change_bond", "delete", "measure_distance", "measure_angle", "measure_dihedral"].includes(tool)) {
          const atomHits = raycastAtoms(mouse);
          const bondHits = raycastBonds(mouse);
          if (atomHits.length > 0 || bondHits.length > 0) {
            // User clicked interactive element: do NOT orbit!
            isOrbitingRef.current = false;
            return;
          }
        }

        // 4. Default: User clicked background -> Orbit camera
        isOrbitingRef.current = true;
      }
    };

    // MouseMove Handler
    const handleMouseMove = (e: MouseEvent) => {
      const dx = e.clientX - prevMouseRef.current.x;
      const dy = e.clientY - prevMouseRef.current.y;
      prevMouseRef.current = { x: e.clientX, y: e.clientY };

      const mouse = getNDC(e);

      // 1. ACTIVE 3D DRAGGING (Gizmo Handle or Direct Atom Drag)
      if (draggingAtomIdRef.current !== null && activeGizmoAxisRef.current !== null) {
        const axis = activeGizmoAxisRef.current;
        const startPos = dragStartAtomPosRef.current;
        const totalDx = e.clientX - dragStartMouseRef.current.x;
        const totalDy = e.clientY - dragStartMouseRef.current.y;

        let newX = startPos.x;
        let newY = startPos.y;
        let newZ = startPos.z;

        if (axis === "x") {
          // Move strictly along 3D X axis (project screen delta into 3D scale)
          newX = Math.round((startPos.x + totalDx * 0.02) * 100) / 100;
          dom.style.cursor = "ew-resize";
        } else if (axis === "y") {
          // Move strictly along 3D Y axis
          newY = Math.round((startPos.y - totalDy * 0.02) * 100) / 100;
          dom.style.cursor = "ns-resize";
        } else if (axis === "z") {
          // Move strictly along 3D Z axis (Depth)
          newZ = Math.round((startPos.z - totalDy * 0.025) * 100) / 100;
          dom.style.cursor = "ns-resize";
        } else {
          // Plane drag: project ray to camera plane
          const raycaster = new THREE.Raycaster();
          raycaster.setFromCamera(mouse, camera);
          const intersectionPoint = new THREE.Vector3();
          if (raycaster.ray.intersectPlane(dragPlaneRef.current, intersectionPoint)) {
            newX = Math.round(intersectionPoint.x * 100) / 100;
            newY = Math.round(intersectionPoint.y * 100) / 100;
            newZ = startPos.z;
          }
          dom.style.cursor = "grabbing";
        }

        // Live coordinate update
        propsRef.current.onMoveAtom(draggingAtomIdRef.current, { x: newX, y: newY, z: newZ });

        // Update gizmo position in real-time
        gizmoGroup.position.set(newX, newY, newZ);
        return;
      }

      // 2. CAMERA PANNING
      if (isPanningRef.current) {
        camera.position.x -= dx * 0.02;
        camera.position.y += dy * 0.02;
        dom.style.cursor = "move";
        return;
      }

      // 3. CAMERA ORBITING
      if (isOrbitingRef.current && molGroup) {
        molGroup.rotation.y += dx * 0.008;
        molGroup.rotation.x += dy * 0.008;
        dom.style.cursor = "grabbing";
        return;
      }

      // 4. UPDATE DYNAMIC GUIDE LINE FOR BOND IN PROGRESS
      if (propsRef.current.activeTool === "add_bond" && bondSourceAtomIdRef.current !== null) {
        const sourceAtom = propsRef.current.atoms.find((a) => a.id === bondSourceAtomIdRef.current);
        if (sourceAtom && guideLineRef.current) {
          const raycaster = new THREE.Raycaster();
          raycaster.setFromCamera(mouse, camera);
          const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -sourceAtom.z);
          const targetPoint = new THREE.Vector3();

          // Check if hovering candidate atom
          const atomHits = raycastAtoms(mouse);
          if (atomHits.length > 0 && atomHits[0].object.userData.atomId !== sourceAtom.id) {
            const hitAtomId = atomHits[0].object.userData.atomId as number;
            const targetAtom = propsRef.current.atoms.find((a) => a.id === hitAtomId);
            if (targetAtom) {
              targetPoint.set(targetAtom.x, targetAtom.y, targetAtom.z);
            }
          } else if (raycaster.ray.intersectPlane(plane, targetPoint)) {
            // Point on plane
          } else {
            targetPoint.copy(camera.position).add(raycaster.ray.direction.clone().multiplyScalar(14));
          }

          const positions = guideLineRef.current.geometry.attributes.position.array as Float32Array;
          positions[0] = sourceAtom.x;
          positions[1] = sourceAtom.y;
          positions[2] = sourceAtom.z;
          positions[3] = targetPoint.x;
          positions[4] = targetPoint.y;
          positions[5] = targetPoint.z;
          guideLineRef.current.geometry.attributes.position.needsUpdate = true;
          guideLineRef.current.computeLineDistances();
          guideLineRef.current.visible = true;
        }
      } else if (guideLineRef.current && guideLineRef.current.visible) {
        guideLineRef.current.visible = false;
      }

      // 5. HOVER RAYCASTING (Gizmo, Atoms, Bonds)
      const gizmoHits = raycastGizmo(mouse);
      if (gizmoHits.length > 0) {
        const hit = gizmoHits[0].object;
        let axis = hit.userData.axis as string;
        if (!axis && hit.parent) axis = hit.parent.userData.axis;
        dom.style.cursor = axis === "x" ? "ew-resize" : axis === "y" || axis === "z" ? "ns-resize" : "move";
        return;
      }

      const atomHits = raycastAtoms(mouse);
      if (atomHits.length > 0) {
        const hitMesh = atomHits[0].object as THREE.Mesh;
        const atomId = hitMesh.userData.atomId as number;

        if (hoveredAtomIdRef.current !== atomId) {
          // Reset previous
          if (hoveredAtomIdRef.current !== null) {
            const prev = atomMeshesRef.current.get(hoveredAtomIdRef.current);
            if (prev) (prev.material as THREE.MeshStandardMaterial).emissive.setHex(0x000000);
          }
          hoveredAtomIdRef.current = atomId;
          const mat = hitMesh.material as THREE.MeshStandardMaterial;

          // Color hover depending on active tool
          if (propsRef.current.activeTool === "add_bond") {
            mat.emissive.setHex(0x22c55e); // Green candidate bond glow
          } else if (propsRef.current.activeTool === "delete") {
            mat.emissive.setHex(0xef4444); // Red delete target
          } else {
            mat.emissive.setHex(0x38bdf8); // Cyan hover glow
          }
        }
        dom.style.cursor = "pointer";
      } else {
        if (hoveredAtomIdRef.current !== null) {
          const prev = atomMeshesRef.current.get(hoveredAtomIdRef.current);
          if (prev) (prev.material as THREE.MeshStandardMaterial).emissive.setHex(0x000000);
          hoveredAtomIdRef.current = null;
        }

        const bondHits = raycastBonds(mouse);
        if (bondHits.length > 0) {
          dom.style.cursor = "pointer";
        } else {
          dom.style.cursor = propsRef.current.activeTool === "add_atom" ? "crosshair" : "default";
        }
      }
    };

    // MouseUp Handler
    const handleMouseUp = () => {
      isOrbitingRef.current = false;
      isPanningRef.current = false;
      draggingAtomIdRef.current = null;
      activeGizmoAxisRef.current = null;
    };

    // Wheel Zoom Handler
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (!camera) return;
      camera.position.z = Math.max(3, Math.min(80, camera.position.z + e.deltaY * 0.015));
    };

    // Click: Dispatch Tool Action
    const handleClick = (e: MouseEvent) => {
      const mouse = getNDC(e);
      const tool = propsRef.current.activeTool;
      const atomHits = raycastAtoms(mouse);
      const bondHits = raycastBonds(mouse);

      // 1. TOOL: ADD ATOM
      if (tool === "add_atom") {
        if (atomHits.length > 0) {
          // Clicked existing atom -> Sprout atom in 3D!
          const hit = atomHits[0].object as THREE.Mesh;
          const parentId = hit.userData.atomId as number;
          propsRef.current.onAddAtomAt({ x: 0, y: 0, z: 0 }, parentId);
        } else {
          // Clicked empty canvas -> place atom at mouse ray intersection on plane z=0
          const raycaster = new THREE.Raycaster();
          raycaster.setFromCamera(mouse, camera);
          const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
          const worldPoint = new THREE.Vector3();
          if (raycaster.ray.intersectPlane(plane, worldPoint)) {
            propsRef.current.onAddAtomAt({
              x: Math.round(worldPoint.x * 100) / 100,
              y: Math.round(worldPoint.y * 100) / 100,
              z: 0,
            });
          } else {
            const pos = camera.position.clone().add(raycaster.ray.direction.clone().multiplyScalar(14));
            propsRef.current.onAddAtomAt({
              x: Math.round(pos.x * 100) / 100,
              y: Math.round(pos.y * 100) / 100,
              z: Math.round(pos.z * 100) / 100,
            });
          }
        }
        return;
      }

      // 2. TOOL: ADD BOND
      if (tool === "add_bond") {
        if (atomHits.length > 0) {
          const hit = atomHits[0].object as THREE.Mesh;
          const clickedId = hit.userData.atomId as number;

          if (bondSourceAtomIdRef.current === null) {
            // First atom selected: start bond creation
            bondSourceAtomIdRef.current = clickedId;
            const clickedAtom = propsRef.current.atoms.find((a) => a.id === clickedId) || null;
            propsRef.current.onSelectAtom(clickedAtom);
          } else if (bondSourceAtomIdRef.current !== clickedId) {
            // Second atom selected: create chemical bond!
            propsRef.current.onAddBond(bondSourceAtomIdRef.current, clickedId);
            bondSourceAtomIdRef.current = null;
            if (guideLineRef.current) guideLineRef.current.visible = false;
          } else {
            // Clicked same atom again: cancel
            bondSourceAtomIdRef.current = null;
            propsRef.current.onSelectAtom(null);
            if (guideLineRef.current) guideLineRef.current.visible = false;
          }
        } else {
          // Clicked background: cancel bond creation
          bondSourceAtomIdRef.current = null;
          if (guideLineRef.current) guideLineRef.current.visible = false;
        }
        return;
      }

      // 3. TOOL: DELETE
      if (tool === "delete") {
        if (atomHits.length > 0) {
          const hit = atomHits[0].object as THREE.Mesh;
          propsRef.current.onDeleteAtom(hit.userData.atomId as number);
          return;
        }
        if (bondHits.length > 0) {
          const hit = bondHits[0].object;
          const bondId = hit.userData.bondId as string;
          if (bondId) propsRef.current.onDeleteBond(bondId);
          return;
        }
        return;
      }

      // 4. TOOL: CHANGE BOND TYPE
      if (tool === "change_bond") {
        if (bondHits.length > 0) {
          const hit = bondHits[0].object;
          const bondId = hit.userData.bondId as string;
          if (bondId) propsRef.current.onChangeBondOrder(bondId);
          return;
        }
      }

      // 5. TOOL: MEASURE (Distance, Angle, Dihedral)
      if (tool === "measure_distance" || tool === "measure_angle" || tool === "measure_dihedral") {
        if (atomHits.length > 0) {
          const hit = atomHits[0].object as THREE.Mesh;
          const atomId = hit.userData.atomId as number;
          const maxAtoms = tool === "measure_distance" ? 2 : tool === "measure_angle" ? 3 : 4;

          const current = measureAtomIdsRef.current;
          let next: number[];
          if (current.includes(atomId)) {
            next = current.filter((id) => id !== atomId);
          } else {
            next = [...current, atomId].slice(-maxAtoms);
          }
          measureAtomIdsRef.current = next;
          updateMeasurementOutput(next);
        } else {
          measureAtomIdsRef.current = [];
          updateMeasurementOutput([]);
        }
        return;
      }

      // 6. DEFAULT: SELECT TOOL / MOVE TOOL
      if (atomHits.length > 0) {
        const hit = atomHits[0].object as THREE.Mesh;
        const atomId = hit.userData.atomId as number;
        const atom = propsRef.current.atoms.find((a) => a.id === atomId) || null;
        propsRef.current.onSelectAtom(atom);
        propsRef.current.onSelectBond(null);
      } else if (bondHits.length > 0) {
        const hit = bondHits[0].object;
        const bondId = hit.userData.bondId as string;
        const bond = propsRef.current.bonds.find((b) => b.id === bondId) || null;
        propsRef.current.onSelectBond(bond);
        propsRef.current.onSelectAtom(null);
      } else {
        propsRef.current.onSelectAtom(null);
        propsRef.current.onSelectBond(null);
        bondSourceAtomIdRef.current = null;
      }
    };

    const preventContext = (e: MouseEvent) => e.preventDefault();

    dom.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    dom.addEventListener("wheel", handleWheel, { passive: false });
    dom.addEventListener("click", handleClick);
    dom.addEventListener("contextmenu", preventContext);

    // Animation Loop
    let animId: number;
    const animate = () => {
      animId = requestAnimationFrame(animate);

      if (
        propsRef.current.autoRotate &&
        molGroup &&
        !isOrbitingRef.current &&
        !draggingAtomIdRef.current
      ) {
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
      dom.removeEventListener("contextmenu", preventContext);
      renderer.dispose();
      if (container) container.innerHTML = "";
    };
  }, [updateMeasurementOutput]); // NEVER depends on atoms or bonds! Runs once.

  // CAMERA VIEW PRESET TRIGGER
  useEffect(() => {
    if (!cameraViewTrigger || !cameraRef.current || !molGroupRef.current) return;
    const camera = cameraRef.current;
    const molGroup = molGroupRef.current;

    if (cameraViewTrigger === "reset") {
      // Auto-fit bounding sphere
      const box = new THREE.Box3();
      atomMeshesRef.current.forEach((mesh) => {
        box.expandByPoint(mesh.position);
      });
      const center = new THREE.Vector3();
      box.getCenter(center);
      const size = new THREE.Vector3();
      box.getSize(size);
      const maxDim = Math.max(size.x, size.y, size.z, 2);

      molGroup.position.set(-center.x, -center.y, -center.z);
      camera.position.set(0, 0, Math.max(12, maxDim * 2.5));
      camera.lookAt(0, 0, 0);
    } else if (cameraViewTrigger === "front") {
      molGroup.rotation.set(0, 0, 0);
    } else if (cameraViewTrigger === "top") {
      molGroup.rotation.set(Math.PI / 2, 0, 0);
    } else if (cameraViewTrigger === "side") {
      molGroup.rotation.set(0, Math.PI / 2, 0);
    }
  }, [cameraViewTrigger]);

  // REBUILD 3D MESHES (Atoms & Bonds) WITHOUT DESTROYING SCENE OR ROTATION
  useEffect(() => {
    const group = molGroupRef.current;
    const labelsGroup = labelsGroupRef.current;
    if (!group || !labelsGroup) return;

    // Properly clean up previous atom & bond meshes
    while (group.children.length > 0) {
      const child = group.children[0];
      group.remove(child);
      child.traverse((c) => {
        if ((c as THREE.Mesh).geometry) (c as THREE.Mesh).geometry.dispose();
      });
    }
    while (labelsGroup.children.length > 0) {
      const child = labelsGroup.children[0];
      labelsGroup.remove(child);
    }

    atomMeshesRef.current.clear();
    bondMeshesRef.current.clear();

    if (atoms.length === 0) return;

    // Base Sphere geometry for atoms
    const sphereGeom = new THREE.SphereGeometry(1, 32, 24);

    // 1. RENDER ATOMS
    atoms.forEach((atom) => {
      let radius = 0.45;
      if (renderMode === "spacefill") {
        radius = Math.max(0.65, atom.vdwRadius * 0.75);
      } else if (renderMode === "stick") {
        radius = 0.22;
      } else if (renderMode === "wireframe") {
        radius = 0.15;
      } else {
        // Ball and stick
        radius = atom.isHydrogen ? 0.28 : Math.max(0.42, atom.covalentRadius * 0.58);
      }

      const mat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(atom.color),
        metalness: 0.15,
        roughness: 0.35,
        wireframe: renderMode === "wireframe",
      });

      const mesh = new THREE.Mesh(sphereGeom, mat);
      mesh.scale.set(radius, radius, radius);
      mesh.position.set(atom.x, atom.y, atom.z);
      mesh.userData = { atomId: atom.id };

      group.add(mesh);
      atomMeshesRef.current.set(atom.id, mesh);
    });

    // 2. RENDER BONDS
    if (showBonds && renderMode !== "spacefill") {
      const atomMap = new Map<number, ModellingAtom>();
      atoms.forEach((a) => atomMap.set(a.id, a));

      bonds.forEach((bond) => {
        const a1 = atomMap.get(bond.atom1);
        const a2 = atomMap.get(bond.atom2);
        if (!a1 || !a2) return;

        const p1 = new THREE.Vector3(a1.x, a1.y, a1.z);
        const p2 = new THREE.Vector3(a2.x, a2.y, a2.z);
        const dir = new THREE.Vector3().subVectors(p2, p1);
        const len = dir.length();
        if (len < 0.01) return; // Prevent 0-length artifacts

        const mid = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5);

        // Cylinder default direction is (0, 1, 0)
        const up = new THREE.Vector3(0, 1, 0);
        const normDir = dir.clone().normalize();
        const quat = new THREE.Quaternion().setFromUnitVectors(up, normDir);

        const bondObj = new THREE.Group();
        bondObj.position.copy(mid);
        bondObj.setRotationFromQuaternion(quat);
        bondObj.userData = { bondId: bond.id };

        const isDouble = bond.order === 2;
        const isTriple = bond.order === 3;
        const radius = renderMode === "stick" ? 0.12 : 0.085;

        const bondMat = new THREE.MeshStandardMaterial({
          color: new THREE.Color(0x94a3b8),
          metalness: 0.2,
          roughness: 0.4,
          wireframe: renderMode === "wireframe",
        });

        if (isDouble) {
          // Parallel double cylinder offset
          const cylGeom = new THREE.CylinderGeometry(radius * 0.8, radius * 0.8, len, 14);
          const m1 = new THREE.Mesh(cylGeom, bondMat);
          m1.position.x = 0.12;
          m1.userData = { bondId: bond.id };
          const m2 = new THREE.Mesh(cylGeom, bondMat);
          m2.position.x = -0.12;
          m2.userData = { bondId: bond.id };
          bondObj.add(m1, m2);
        } else if (isTriple) {
          // Triangular triple cylinder offset
          const cylGeom = new THREE.CylinderGeometry(radius * 0.7, radius * 0.7, len, 14);
          const m1 = new THREE.Mesh(cylGeom, bondMat);
          m1.position.set(0, 0, 0.13);
          m1.userData = { bondId: bond.id };
          const m2 = new THREE.Mesh(cylGeom, bondMat);
          m2.position.set(0.11, 0, -0.07);
          m2.userData = { bondId: bond.id };
          const m3 = new THREE.Mesh(cylGeom, bondMat);
          m3.position.set(-0.11, 0, -0.07);
          m3.userData = { bondId: bond.id };
          bondObj.add(m1, m2, m3);
        } else {
          // Single / Aromatic cylinder
          const cylGeom = new THREE.CylinderGeometry(radius, radius, len, 16);
          const m = new THREE.Mesh(cylGeom, bondMat);
          m.userData = { bondId: bond.id };
          bondObj.add(m);
        }

        group.add(bondObj);
        bondMeshesRef.current.set(bond.id, bondObj);
      });
    }
  }, [atoms, bonds, renderMode, showBonds, showLabels]);

  // UPDATE 3D TRANSLATION GIZMO POSITION & VISIBILITY
  useEffect(() => {
    const gizmo = gizmoGroupRef.current;
    if (!gizmo) return;

    if (
      (activeTool === "move_atom" || activeTool === "select") &&
      selectedAtomId !== null
    ) {
      const atom = atoms.find((a) => a.id === selectedAtomId);
      if (atom) {
        gizmo.position.set(atom.x, atom.y, atom.z);
        gizmo.visible = true;
        return;
      }
    }
    gizmo.visible = false;
  }, [activeTool, atoms, selectedAtomId]);

  // UPDATE SELECTION & WARNING HIGHLIGHTS
  useEffect(() => {
    // 1. Highlight atoms
    atomMeshesRef.current.forEach((mesh, id) => {
      const mat = mesh.material as THREE.MeshStandardMaterial;
      if (id === selectedAtomId) {
        mat.emissive.setHex(0xfacc15); // Golden selection glow
      } else if (warningAtomIds.includes(id)) {
        mat.emissive.setHex(0xef4444); // Red valence warning glow
      } else {
        mat.emissive.setHex(0x000000);
      }
    });

    // 2. Highlight bonds
    bondMeshesRef.current.forEach((obj, id) => {
      const isSelected = id === selectedBondId;
      obj.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mat = (child as THREE.Mesh).material as THREE.MeshStandardMaterial;
          mat.emissive.setHex(isSelected ? 0xfacc15 : 0x000000);
        }
      });
    });
  }, [selectedAtomId, selectedBondId, warningAtomIds]);

  return (
    <div className={styles.canvasContainer}>
      <div ref={mountRef} className={styles.webglCanvas} />

      {/* Floating 3D Navigation & Gizmo HUD Instructions */}
      <div className={styles.hudOverlay}>
        <div className={styles.hudTag}>
          <span className={styles.hudKbd}>Left Drag</span> Orbit
          <span className={styles.hudKbd}>Right Drag / Shift</span> Pan
          <span className={styles.hudKbd}>Wheel</span> Zoom
          <span className={styles.hudKbd}>Gizmo (R/G/B)</span> 3D X/Y/Z Move
        </div>
      </div>
    </div>
  );
}
