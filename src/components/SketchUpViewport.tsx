import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import {
  SketchUpExtension,
  ViewportStyle,
  CameraPreset,
  ViewportStats,
} from '../types/extension';
import {
  Eye,
  Maximize2,
  Sun,
  Layers,
  ChevronDown,
  ChevronUp,
  Compass,
  Ruler,
  Box,
  RotateCw,
} from 'lucide-react';

interface SketchUpViewportProps {
  extension: SketchUpExtension;
  paramValues: Record<string, any>;
  onConsoleLog?: (msg: string) => void;
  unit: string;
}

export const SketchUpViewport: React.FC<SketchUpViewportProps> = ({
  extension,
  paramValues,
  onConsoleLog,
  unit,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const modelGroupRef = useRef<THREE.Group | null>(null);

  // Viewport Settings
  const [style, setStyle] = useState<ViewportStyle>('sketchup_standard');
  const [shadowsEnabled, setShadowsEnabled] = useState(true);
  const [explodeRatio, setExplodeRatio] = useState(0);
  const [showDimensions, setShowDimensions] = useState(true);
  const [dockCollapsed, setDockCollapsed] = useState(false);
  const [stats, setStats] = useState<ViewportStats>({
    faces: 0,
    edges: 0,
    components: 1,
    boundingBox: { width: 0, height: 0, depth: 0, unit },
  });

  // Reusable materials map
  const materialsMap = useMemo(() => {
    return {
      woodTread: new THREE.MeshStandardMaterial({
        color: 0xc89d6c,
        roughness: 0.65,
        metalness: 0.05,
      }),
      woodDark: new THREE.MeshStandardMaterial({
        color: 0x5a3d28,
        roughness: 0.7,
        metalness: 0.05,
      }),
      metalPole: new THREE.MeshStandardMaterial({
        color: 0x2e3440,
        roughness: 0.35,
        metalness: 0.85,
      }),
      handrailWood: new THREE.MeshStandardMaterial({
        color: 0xa0633b,
        roughness: 0.4,
        metalness: 0.1,
      }),
      timberLumber: new THREE.MeshStandardMaterial({
        color: 0xe5c391,
        roughness: 0.8,
        metalness: 0.0,
      }),
      cabinetCarcass: new THREE.MeshStandardMaterial({
        color: 0xf5eedc,
        roughness: 0.6,
        metalness: 0.05,
      }),
      cabinetDoor: new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.5,
        metalness: 0.05,
      }),
      metalHardware: new THREE.MeshStandardMaterial({
        color: 0x1a1a1a,
        roughness: 0.25,
        metalness: 0.9,
      }),
      windowFrame: new THREE.MeshStandardMaterial({
        color: 0x334155,
        roughness: 0.5,
        metalness: 0.2,
      }),
      glassPane: new THREE.MeshPhysicalMaterial({
        color: 0xd9f2ff,
        transmission: 0.88,
        opacity: 0.4,
        transparent: true,
        roughness: 0.1,
        metalness: 0.05,
        ior: 1.5,
        depthWrite: false,
      }),
      monochrome: new THREE.MeshStandardMaterial({
        color: 0xf3f4f6,
        roughness: 0.7,
        metalness: 0.0,
      }),
      blueprint: new THREE.MeshStandardMaterial({
        color: 0x1e3a8a,
        roughness: 0.8,
        metalness: 0.1,
      }),
      xray: new THREE.MeshStandardMaterial({
        color: 0x60a5fa,
        transparent: true,
        opacity: 0.38,
        roughness: 0.5,
        depthWrite: false,
      }),
    };
  }, []);

  // Initialize Three.js Scene, Camera, Renderer
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth;
    const height = container.clientHeight;

    // 1. Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color(0xdce7f0); // SketchUp sky gradient top tone
    scene.fog = new THREE.FogExp2(0xdce7f0, 0.00015);

    // 2. Camera: Isometric-like default angle
    const camera = new THREE.PerspectiveCamera(40, width / height, 10, 40000);
    camera.position.set(3200, 2600, 3600);
    cameraRef.current = camera;

    // 3. Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    rendererRef.current = renderer;
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    // 4. Studio Environment
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    // 5. Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controlsRef.current = controls;
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2 - 0.02; // Don't orbit below ground
    controls.minDistance = 300;
    controls.maxDistance = 25000;
    controls.target.set(0, 800, 0);

    // 6. Lighting (Warm Sun Key + Cool Sky Ambient)
    const sunLight = new THREE.DirectionalLight(0xfff6e8, 2.2);
    sunLight.position.set(2800, 4800, 2200);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 100;
    sunLight.shadow.camera.far = 15000;
    const shadowD = 2800;
    sunLight.shadow.camera.left = -shadowD;
    sunLight.shadow.camera.right = shadowD;
    sunLight.shadow.camera.top = shadowD;
    sunLight.shadow.camera.bottom = -shadowD;
    sunLight.shadow.bias = -0.0005;
    sunLight.shadow.normalBias = 0.02;
    scene.add(sunLight);

    const hemiLight = new THREE.HemisphereLight(0xe0f2fe, 0xb4a491, 1.2);
    scene.add(hemiLight);

    // 7. SketchUp Ground Plane
    const groundGeo = new THREE.PlaneGeometry(24000, 24000);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0xded8cc,
      roughness: 0.9,
      metalness: 0.0,
      depthWrite: true,
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -1;
    ground.receiveShadow = true;
    scene.add(ground);

    // 8. Authentic SketchUp RGB Coordinate Axes
    const axesGroup = new THREE.Group();
    axesGroup.name = 'SketchUpAxes';

    const axisLength = 6000;
    // Red axis: +X (solid), -X (dashed)
    const redMat = new THREE.LineBasicMaterial({ color: 0xdc2626, linewidth: 2 });
    const redDashedMat = new THREE.LineDashedMaterial({
      color: 0xef4444,
      dashSize: 40,
      gapSize: 30,
    });
    const redPosGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0.5, 0),
      new THREE.Vector3(axisLength, 0.5, 0),
    ]);
    const redNegGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0.5, 0),
      new THREE.Vector3(-axisLength, 0.5, 0),
    ]);
    const redPosLine = new THREE.Line(redPosGeo, redMat);
    const redNegLine = new THREE.Line(redNegGeo, redDashedMat);
    redNegLine.computeLineDistances();
    axesGroup.add(redPosLine, redNegLine);

    // Green axis: +Z (North in 3D / solid green), -Z (dashed green)
    const greenMat = new THREE.LineBasicMaterial({ color: 0x16a34a, linewidth: 2 });
    const greenDashedMat = new THREE.LineDashedMaterial({
      color: 0x22c55e,
      dashSize: 40,
      gapSize: 30,
    });
    const greenPosGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0.5, 0),
      new THREE.Vector3(0, 0.5, axisLength),
    ]);
    const greenNegGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0.5, 0),
      new THREE.Vector3(0, 0.5, -axisLength),
    ]);
    const greenPosLine = new THREE.Line(greenPosGeo, greenMat);
    const greenNegLine = new THREE.Line(greenNegGeo, greenDashedMat);
    greenNegLine.computeLineDistances();
    axesGroup.add(greenPosLine, greenNegLine);

    // Blue axis: +Y (Up / solid blue), -Y (dashed blue)
    const blueMat = new THREE.LineBasicMaterial({ color: 0x2563eb, linewidth: 2 });
    const blueDashedMat = new THREE.LineDashedMaterial({
      color: 0x3b82f6,
      dashSize: 40,
      gapSize: 30,
    });
    const bluePosGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0.5, 0),
      new THREE.Vector3(0, axisLength, 0),
    ]);
    const blueNegGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0.5, 0),
      new THREE.Vector3(0, -axisLength, 0),
    ]);
    const bluePosLine = new THREE.Line(bluePosGeo, blueMat);
    const blueNegLine = new THREE.Line(blueNegGeo, blueDashedMat);
    blueNegLine.computeLineDistances();
    axesGroup.add(bluePosLine, blueNegLine);

    scene.add(axesGroup);

    // 9. Model Container Group
    const modelGroup = new THREE.Group();
    modelGroup.name = 'ExtensionGeometryGroup';
    scene.add(modelGroup);
    modelGroupRef.current = modelGroup;

    // 10. Animation Loop
    let animId: number;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // Resize Handler
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  // Update Viewport Styling (Background, Fog, Styles)
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    if (style === 'sketchup_standard') {
      scene.background = new THREE.Color(0xdce7f0);
      scene.fog = new THREE.FogExp2(0xdce7f0, 0.00015);
    } else if (style === 'construction_monochrome') {
      scene.background = new THREE.Color(0xf1f5f9);
      scene.fog = new THREE.FogExp2(0xf1f5f9, 0.00018);
    } else if (style === 'blueprint_dark') {
      scene.background = new THREE.Color(0x0a1128);
      scene.fog = new THREE.FogExp2(0x0a1128, 0.00015);
    } else if (style === 'xray_translucent') {
      scene.background = new THREE.Color(0x1e293b);
      scene.fog = new THREE.FogExp2(0x1e293b, 0.00015);
    } else if (style === 'clay_shaded') {
      scene.background = new THREE.Color(0xe2e8f0);
      scene.fog = new THREE.FogExp2(0xe2e8f0, 0.00015);
    }
  }, [style]);

  // Update Shadow Map
  useEffect(() => {
    if (rendererRef.current) {
      rendererRef.current.shadowMap.enabled = shadowsEnabled;
    }
  }, [shadowsEnabled]);

  // Helper to add mesh with authentic SketchUp black edge outline
  const addSketchUpMesh = (
    parent: THREE.Group,
    geometry: THREE.BufferGeometry,
    material: THREE.Material,
    name = 'Part',
    castShadow = true,
    receiveShadow = true
  ): THREE.Mesh => {
    // Override material depending on active style
    let activeMat = material;
    if (style === 'construction_monochrome') {
      activeMat = materialsMap.monochrome;
    } else if (style === 'blueprint_dark') {
      activeMat = materialsMap.blueprint;
    } else if (style === 'xray_translucent') {
      activeMat = materialsMap.xray;
    }

    const mesh = new THREE.Mesh(geometry, activeMat);
    mesh.name = name;
    mesh.castShadow = castShadow;
    mesh.receiveShadow = receiveShadow;

    // Edge outline for the iconic SketchUp visual look
    const edgesGeo = new THREE.EdgesGeometry(geometry, 24);
    const edgeColor =
      style === 'blueprint_dark'
        ? 0x38bdf8
        : style === 'xray_translucent'
        ? 0x93c5fd
        : 0x1c1917;
    const edgeMat = new THREE.LineBasicMaterial({
      color: edgeColor,
      linewidth: 1.5,
    });
    const edgeLines = new THREE.LineSegments(edgesGeo, edgeMat);
    edgeLines.name = `${name}_Edges`;
    mesh.add(edgeLines);

    parent.add(mesh);
    return mesh;
  };

  // Build Procedural Geometry based on Extension type and parameters
  useEffect(() => {
    const modelGroup = modelGroupRef.current;
    if (!modelGroup) return;

    // Clear old geometry
    while (modelGroup.children.length > 0) {
      const child = modelGroup.children[0] as THREE.Mesh;
      if (child.geometry) child.geometry.dispose();
      modelGroup.remove(child);
    }

    let calculatedFaces = 0;
    let calculatedEdges = 0;
    let componentCount = 1;
    let boundingBox = { width: 0, height: 0, depth: 0, unit };

    const type = extension.geometryType;

    if (type === 'stairs') {
      // 1. Parametric Spiral Staircase
      const totalH = Number(paramValues.totalHeight ?? 2800);
      const radius = Number(paramValues.outerRadius ?? 900);
      const steps = Math.max(4, Number(paramValues.stepsCount ?? 16));
      const rotDeg = Number(paramValues.totalRotation ?? 360);
      const treadThick = Number(paramValues.treadThickness ?? 45);
      const poleDia = Number(paramValues.poleDiameter ?? 120);
      const hasRail = Boolean(paramValues.hasHandrail ?? true);
      const railH = Number(paramValues.handrailHeight ?? 900);

      const poleRadius = poleDia / 2;
      const stepAngle = ((rotDeg * Math.PI) / 180) / steps;
      const stepH = totalH / steps;

      // Central Column (Cylinder)
      const poleGeo = new THREE.CylinderGeometry(poleRadius, poleRadius, totalH, 32);
      poleGeo.translate(0, totalH / 2, 0);
      addSketchUpMesh(modelGroup, poleGeo, materialsMap.metalPole, 'CentralPole');

      // Treads
      const railPoints: THREE.Vector3[] = [];

      for (let i = 0; i < steps; i++) {
        const angle = i * stepAngle;
        const currentY = i * stepH;

        // Tread Shape (trapezoidal pie slice)
        const shape = new THREE.Shape();
        const startA = -stepAngle * 0.45;
        const endA = stepAngle * 0.45;

        shape.moveTo(poleRadius * Math.cos(startA), poleRadius * Math.sin(startA));
        shape.lineTo(radius * Math.cos(startA), radius * Math.sin(startA));
        shape.lineTo(radius * Math.cos(endA), radius * Math.sin(endA));
        shape.lineTo(poleRadius * Math.cos(endA), poleRadius * Math.sin(endA));
        shape.closePath();

        const extrudeSettings = {
          steps: 1,
          depth: treadThick,
          bevelEnabled: true,
          bevelThickness: 3,
          bevelSize: 3,
          bevelSegments: 2,
        };

        const treadGeo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
        treadGeo.rotateX(-Math.PI / 2); // Lay horizontal

        const treadMesh = addSketchUpMesh(
          modelGroup,
          treadGeo,
          materialsMap.woodTread,
          `Tread_${i + 1}`
        );

        // Position and rotate
        treadMesh.position.set(0, currentY, 0);
        treadMesh.rotation.y = -angle;

        // Railing Point
        const railR = radius - 40;
        const railX = railR * Math.cos(-angle);
        const railZ = railR * Math.sin(-angle);
        const railY = currentY + treadThick + railH;
        railPoints.push(new THREE.Vector3(railX, railY, railZ));

        // Baluster (vertical upright rod)
        if (hasRail && i % 1 === 0) {
          const balusterGeo = new THREE.CylinderGeometry(8, 8, railH, 12);
          balusterGeo.translate(0, railH / 2, 0);
          const baluster = addSketchUpMesh(
            modelGroup,
            balusterGeo,
            materialsMap.metalHardware,
            `Baluster_${i}`
          );
          baluster.position.set(railX, currentY + treadThick, railZ);
        }
      }

      // Continuous Helical Handrail
      if (hasRail && railPoints.length > 2) {
        const curve = new THREE.CatmullRomCurve3(railPoints);
        const railGeo = new THREE.TubeGeometry(curve, steps * 6, 22, 12, false);
        addSketchUpMesh(modelGroup, railGeo, materialsMap.handrailWood, 'HelicalHandrail');
      }

      calculatedFaces = steps * 24 + 140;
      calculatedEdges = steps * 36 + 180;
      componentCount = steps + 2;
      boundingBox = {
        width: Math.round(radius * 2),
        height: Math.round(totalH + (hasRail ? railH : 0)),
        depth: Math.round(radius * 2),
        unit,
      };
    } else if (type === 'cutlist') {
      // 2. CutList & Sheet Nesting 3D Exploded Visualizer
      const sheetW = Number(paramValues.sheetWidth ?? 1220);
      const sheetL = Number(paramValues.sheetLength ?? 2440);
      const kerf = Number(paramValues.kerfThickness ?? 3.2);

      // Sheet 1: 4x8 base plywood stock
      const stockGeo = new THREE.BoxGeometry(sheetW, 18, sheetL);
      stockGeo.translate(sheetW / 2, 9, sheetL / 2);
      addSketchUpMesh(modelGroup, stockGeo, materialsMap.woodTread, 'StockSheet_Plywood');

      // Nested cut panels with gap
      const panels = [
        { name: 'Carcass Left', w: 560, l: 720, x: 0, z: 0 },
        { name: 'Carcass Right', w: 560, l: 720, x: 560 + kerf * 4, z: 0 },
        { name: 'Bottom Deck', w: 560, l: 764, x: 0, z: 720 + kerf * 4 },
        { name: 'Shelf 1', w: 540, l: 762, x: 560 + kerf * 4, z: 720 + kerf * 4 },
        { name: 'Shelf 2', w: 540, l: 762, x: 0, z: 720 + 764 + kerf * 8 },
        { name: 'Top Stretchers', w: 200, l: 764, x: 560 + kerf * 4, z: 720 + 762 + kerf * 8 },
      ];

      panels.forEach((p, idx) => {
        const pGeo = new THREE.BoxGeometry(p.w, 18.5, p.l);
        pGeo.translate(p.w / 2, 19 + explodeRatio * 100, p.l / 2);
        const pMesh = addSketchUpMesh(
          modelGroup,
          pGeo,
          materialsMap.timberLumber,
          p.name
        );
        pMesh.position.set(p.x, 0, p.z);
      });

      calculatedFaces = panels.length * 6 + 12;
      calculatedEdges = panels.length * 12 + 24;
      componentCount = panels.length + 1;
      boundingBox = {
        width: Math.round(sheetW),
        height: Math.round(18 + explodeRatio * 100),
        depth: Math.round(sheetL),
        unit,
      };
    } else if (type === 'cabinet') {
      // 3. Parametric Casework & Cabinet
      const w = Number(paramValues.cabinetWidth ?? 800);
      const h = Number(paramValues.cabinetHeight ?? 870);
      const d = Number(paramValues.cabinetDepth ?? 580);
      const tkH = Number(paramValues.toeKickHeight ?? 100);
      const tkR = Number(paramValues.toeKickRecess ?? 60);
      const shelves = Number(paramValues.shelfCount ?? 2);
      const doorStyle = String(paramValues.doorStyle ?? 'Shaker 5-Piece');
      const doorsCount = Number(paramValues.doorsCount ?? 2);
      const thick = 18;

      // Toe Kick Base
      const tkGeo = new THREE.BoxGeometry(w, tkH, d - tkR);
      tkGeo.translate(w / 2, tkH / 2, (d - tkR) / 2 + tkR);
      addSketchUpMesh(modelGroup, tkGeo, materialsMap.metalHardware, 'ToeKick');

      // Left Panel
      const leftH = h - tkH;
      const leftGeo = new THREE.BoxGeometry(thick, leftH, d);
      leftGeo.translate(thick / 2, tkH + leftH / 2, d / 2);
      addSketchUpMesh(modelGroup, leftGeo, materialsMap.cabinetCarcass, 'LeftPanel');

      // Right Panel
      const rightGeo = new THREE.BoxGeometry(thick, leftH, d);
      rightGeo.translate(w - thick / 2, tkH + leftH / 2, d / 2);
      addSketchUpMesh(modelGroup, rightGeo, materialsMap.cabinetCarcass, 'RightPanel');

      // Bottom Deck
      const deckGeo = new THREE.BoxGeometry(w - thick * 2, thick, d);
      deckGeo.translate(w / 2, tkH + thick / 2, d / 2);
      addSketchUpMesh(modelGroup, deckGeo, materialsMap.cabinetCarcass, 'BottomDeck');

      // Top Rails / Stretchers
      const topRailFrontGeo = new THREE.BoxGeometry(w - thick * 2, thick, 100);
      topRailFrontGeo.translate(w / 2, h - thick / 2, 50);
      addSketchUpMesh(modelGroup, topRailFrontGeo, materialsMap.cabinetCarcass, 'TopRailFront');

      const topRailBackGeo = new THREE.BoxGeometry(w - thick * 2, thick, 100);
      topRailBackGeo.translate(w / 2, h - thick / 2, d - 50);
      addSketchUpMesh(modelGroup, topRailBackGeo, materialsMap.cabinetCarcass, 'TopRailBack');

      // Adjustable Shelves
      const shelfSpanH = leftH - thick * 2;
      for (let s = 1; s <= shelves; s++) {
        const sY = tkH + thick + (shelfSpanH / (shelves + 1)) * s;
        const sGeo = new THREE.BoxGeometry(w - thick * 2 - 4, thick, d - 30);
        sGeo.translate(w / 2, sY, (d - 30) / 2 + 25);
        addSketchUpMesh(modelGroup, sGeo, materialsMap.woodTread, `Shelf_${s}`);
      }

      // Doors (Shaker or Slab)
      const doorW = (w - 6) / doorsCount;
      const doorH = leftH - 4;
      for (let dr = 0; dr < doorsCount; dr++) {
        const drX = 3 + dr * doorW + doorW / 2;
        const doorZ = -12 - explodeRatio * 200;

        if (doorStyle.includes('Shaker')) {
          // Shaker frame: outer stiles and rails with recessed panel
          const stileW = 60;
          // Recessed inner panel
          const panelGeo = new THREE.BoxGeometry(doorW - stileW * 2, doorH - stileW * 2, 6);
          panelGeo.translate(drX, tkH + doorH / 2, doorZ);
          addSketchUpMesh(modelGroup, panelGeo, materialsMap.cabinetDoor, `ShakerPanel_${dr}`);

          // Outer frame
          const frameGeo = new THREE.BoxGeometry(doorW, doorH, 19);
          frameGeo.translate(drX, tkH + doorH / 2, doorZ - 6);
          addSketchUpMesh(modelGroup, frameGeo, materialsMap.cabinetDoor, `Door_${dr}`);
        } else {
          // Modern Flat Slab Door
          const slabGeo = new THREE.BoxGeometry(doorW - 2, doorH, 19);
          slabGeo.translate(drX, tkH + doorH / 2, doorZ);
          addSketchUpMesh(modelGroup, slabGeo, materialsMap.cabinetDoor, `DoorSlab_${dr}`);
        }

        // Pull Bar Hardware
        const pullGeo = new THREE.CylinderGeometry(5, 5, 120, 16);
        pullGeo.translate(0, 60, 0);
        const pull = addSketchUpMesh(
          modelGroup,
          pullGeo,
          materialsMap.metalHardware,
          `PullHandle_${dr}`
        );
        const handleX = dr === 0 ? drX + doorW / 2 - 35 : drX - doorW / 2 + 35;
        pull.position.set(handleX, tkH + doorH - 220, doorZ - 20);
      }

      calculatedFaces = 96 + shelves * 12 + doorsCount * 24;
      calculatedEdges = 160 + shelves * 24;
      componentCount = 6 + shelves + doorsCount;
      boundingBox = {
        width: Math.round(w),
        height: Math.round(h),
        depth: Math.round(d),
        unit,
      };
    } else if (type === 'framing') {
      // 4. Timber Wall Stud Framing
      const wallL = Number(paramValues.wallLength ?? 3600);
      const wallH = Number(paramValues.wallHeight ?? 2440);
      const spacing = Number(paramValues.studSpacing ?? 406);
      const lumber = String(paramValues.lumberSize ?? '2x4');
      const doubleTop = Boolean(paramValues.doubleTopPlate ?? true);
      const includeOpen = Boolean(paramValues.includeOpening ?? true);
      const openW = Number(paramValues.openingWidth ?? 900);

      const tStud = 38; // 1.5 inches
      const wStud = lumber.includes('2x6') ? 140 : 89; // 3.5 or 5.5 inches
      const plateT = tStud;

      // Sole Plate (Bottom)
      const soleGeo = new THREE.BoxGeometry(wallL, plateT, wStud);
      soleGeo.translate(wallL / 2, plateT / 2, wStud / 2);
      addSketchUpMesh(modelGroup, soleGeo, materialsMap.timberLumber, 'SolePlate');

      // Top Plate 1
      const topPlate1Geo = new THREE.BoxGeometry(wallL, plateT, wStud);
      topPlate1Geo.translate(wallL / 2, wallH - plateT * 1.5, wStud / 2);
      addSketchUpMesh(modelGroup, topPlate1Geo, materialsMap.timberLumber, 'TopPlate');

      // Double Top Plate 2
      if (doubleTop) {
        const topPlate2Geo = new THREE.BoxGeometry(wallL, plateT, wStud);
        topPlate2Geo.translate(wallL / 2, wallH - plateT / 2, wStud / 2);
        addSketchUpMesh(modelGroup, topPlate2Geo, materialsMap.timberLumber, 'DoubleTopPlate');
      }

      // Studs on Center
      const studH = wallH - plateT * (doubleTop ? 3 : 2);
      const studGeo = new THREE.BoxGeometry(tStud, studH, wStud);
      studGeo.translate(tStud / 2, plateT + studH / 2, wStud / 2);

      let studCount = 0;
      let currX = 0;

      // Window Opening range
      const openStart = wallL * 0.4;
      const openEnd = openStart + openW;

      while (currX <= wallL) {
        const posX = Math.min(currX, wallL - tStud);
        const isInOpening = includeOpen && posX >= openStart + 50 && posX <= openEnd - 50;

        if (!isInOpening) {
          const sMesh = addSketchUpMesh(
            modelGroup,
            studGeo.clone(),
            materialsMap.timberLumber,
            `Stud_${studCount + 1}`
          );
          sMesh.position.x = posX;
          studCount++;
        }
        currX += spacing;
      }

      // Rough opening header and king/jack studs
      if (includeOpen) {
        const headerH = 184; // 2x8 header
        const sillY = 850;
        const headY = 1950;

        // Header Beam
        const headGeo = new THREE.BoxGeometry(openW + tStud * 2, headerH, wStud);
        headGeo.translate(openStart + openW / 2, headY + headerH / 2, wStud / 2);
        addSketchUpMesh(modelGroup, headGeo, materialsMap.timberLumber, 'HeaderBeam');

        // Rough Sill
        const sillGeo = new THREE.BoxGeometry(openW, plateT, wStud);
        sillGeo.translate(openStart + openW / 2, sillY - plateT / 2, wStud / 2);
        addSketchUpMesh(modelGroup, sillGeo, materialsMap.timberLumber, 'RoughSill');

        // King Studs (Left & Right)
        const kingL = addSketchUpMesh(modelGroup, studGeo.clone(), materialsMap.timberLumber, 'KingStud_L');
        kingL.position.x = openStart - tStud;
        const kingR = addSketchUpMesh(modelGroup, studGeo.clone(), materialsMap.timberLumber, 'KingStud_R');
        kingR.position.x = openEnd + tStud;

        // Jack / Trimmer Studs
        const jackH = headY - plateT;
        const jackGeo = new THREE.BoxGeometry(tStud, jackH, wStud);
        jackGeo.translate(tStud / 2, plateT + jackH / 2, wStud / 2);
        const jackL = addSketchUpMesh(modelGroup, jackGeo.clone(), materialsMap.timberLumber, 'JackStud_L');
        jackL.position.x = openStart;
        const jackR = addSketchUpMesh(modelGroup, jackGeo.clone(), materialsMap.timberLumber, 'JackStud_R');
        jackR.position.x = openEnd;
      }

      calculatedFaces = studCount * 6 + 48;
      calculatedEdges = studCount * 12 + 96;
      componentCount = studCount + 6;
      boundingBox = {
        width: Math.round(wallL),
        height: Math.round(wallH),
        depth: Math.round(wStud),
        unit,
      };
    } else if (type === 'window') {
      // 5. Parametric Window & Glass
      const winW = Number(paramValues.windowWidth ?? 1200);
      const winH = Number(paramValues.windowHeight ?? 1500);
      const frameD = Number(paramValues.frameDepth ?? 140);
      const frameW = Number(paramValues.frameWidth ?? 60);
      const panesX = Number(paramValues.mullionGridX ?? 2);
      const panesY = Number(paramValues.mullionGridY ?? 3);
      const hasSill = Boolean(paramValues.includeSill ?? true);

      // Frame Outer Box
      // Left Jamb
      const jambLGeo = new THREE.BoxGeometry(frameW, winH, frameD);
      jambLGeo.translate(frameW / 2, winH / 2, frameD / 2);
      addSketchUpMesh(modelGroup, jambLGeo, materialsMap.windowFrame, 'Jamb_Left');

      // Right Jamb
      const jambRGeo = new THREE.BoxGeometry(frameW, winH, frameD);
      jambRGeo.translate(winW - frameW / 2, winH / 2, frameD / 2);
      addSketchUpMesh(modelGroup, jambRGeo, materialsMap.windowFrame, 'Jamb_Right');

      // Head (top)
      const headGeo = new THREE.BoxGeometry(winW - frameW * 2, frameW, frameD);
      headGeo.translate(winW / 2, winH - frameW / 2, frameD / 2);
      addSketchUpMesh(modelGroup, headGeo, materialsMap.windowFrame, 'HeadFrame');

      // Bottom Sill Frame
      const sillFGeo = new THREE.BoxGeometry(winW - frameW * 2, frameW, frameD);
      sillFGeo.translate(winW / 2, frameW / 2, frameD / 2);
      addSketchUpMesh(modelGroup, sillFGeo, materialsMap.windowFrame, 'SillFrame');

      // Exterior Projecting Sloped Sill
      if (hasSill) {
        const extSillGeo = new THREE.BoxGeometry(winW + 100, 45, frameD + 80);
        extSillGeo.translate(winW / 2, -15, frameD / 2 - 20);
        addSketchUpMesh(modelGroup, extSillGeo, materialsMap.woodDark, 'ExteriorSill');
      }

      // Glass Pane (Physical transmissive glass)
      const glassW = winW - frameW * 2;
      const glassH = winH - frameW * 2;
      const glassGeo = new THREE.BoxGeometry(glassW, glassH, 12);
      glassGeo.translate(winW / 2, winH / 2, frameD / 2);
      addSketchUpMesh(modelGroup, glassGeo, materialsMap.glassPane, 'InsulatedGlass');

      // Mullion Bars (Grid)
      const mullionThick = 24;
      for (let mx = 1; mx < panesX; mx++) {
        const mxPos = frameW + (glassW / panesX) * mx;
        const mGeo = new THREE.BoxGeometry(mullionThick, glassH, 28);
        mGeo.translate(mxPos, winH / 2, frameD / 2);
        addSketchUpMesh(modelGroup, mGeo, materialsMap.windowFrame, `Mullion_V${mx}`);
      }
      for (let my = 1; my < panesY; my++) {
        const myPos = frameW + (glassH / panesY) * my;
        const mGeo = new THREE.BoxGeometry(glassW, mullionThick, 28);
        mGeo.translate(winW / 2, myPos, frameD / 2);
        addSketchUpMesh(modelGroup, mGeo, materialsMap.windowFrame, `Mullion_H${my}`);
      }

      calculatedFaces = 54 + (panesX + panesY) * 12;
      calculatedEdges = 96 + (panesX + panesY) * 24;
      componentCount = 5 + panesX + panesY;
      boundingBox = {
        width: Math.round(winW),
        height: Math.round(winH + (hasSill ? 45 : 0)),
        depth: Math.round(frameD + (hasSill ? 80 : 0)),
        unit,
      };
    } else {
      // Generic / Custom AI Model Geometry: Parametric Architectural Pavilion
      const w = Number(paramValues.width ?? 2400);
      const h = Number(paramValues.height ?? 2400);
      const d = Number(paramValues.depth ?? 2400);

      // Base Slab
      const slabGeo = new THREE.BoxGeometry(w, 80, d);
      slabGeo.translate(w / 2, 40, d / 2);
      addSketchUpMesh(modelGroup, slabGeo, materialsMap.woodTread, 'BaseSlab');

      // 4 Corner Columns
      const colRadius = 80;
      const colGeo = new THREE.CylinderGeometry(colRadius, colRadius, h, 24);
      colGeo.translate(0, h / 2, 0);

      const c1 = addSketchUpMesh(modelGroup, colGeo.clone(), materialsMap.metalPole, 'Col_1');
      c1.position.set(colRadius + 20, 0, colRadius + 20);
      const c2 = addSketchUpMesh(modelGroup, colGeo.clone(), materialsMap.metalPole, 'Col_2');
      c2.position.set(w - colRadius - 20, 0, colRadius + 20);
      const c3 = addSketchUpMesh(modelGroup, colGeo.clone(), materialsMap.metalPole, 'Col_3');
      c3.position.set(colRadius + 20, 0, d - colRadius - 20);
      const c4 = addSketchUpMesh(modelGroup, colGeo.clone(), materialsMap.metalPole, 'Col_4');
      c4.position.set(w - colRadius - 20, 0, d - colRadius - 20);

      // Roof Canopy
      const roofGeo = new THREE.BoxGeometry(w + 300, 100, d + 300);
      roofGeo.translate(w / 2, h + 50, d / 2);
      addSketchUpMesh(modelGroup, roofGeo, materialsMap.timberLumber, 'RoofCanopy');

      calculatedFaces = 72;
      calculatedEdges = 120;
      componentCount = 6;
      boundingBox = { width: Math.round(w), height: Math.round(h + 100), depth: Math.round(d), unit };
    }

    setStats({
      faces: calculatedFaces,
      edges: calculatedEdges,
      components: componentCount,
      boundingBox,
    });

    if (onConsoleLog) {
      onConsoleLog(`> Model updated: ${extension.name} [${calculatedFaces} faces, ${calculatedEdges} edges]`);
    }
  }, [extension, paramValues, style, explodeRatio, unit]);

  // Camera Presets
  const setCameraPreset = (preset: CameraPreset) => {
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    if (!camera || !controls) return;

    const dist = 4200;
    const target = controls.target;

    switch (preset) {
      case 'iso':
        camera.position.set(target.x + dist * 0.7, target.y + dist * 0.6, target.z + dist * 0.7);
        break;
      case 'top':
        camera.position.set(target.x, target.y + dist * 1.3, target.z + 1);
        break;
      case 'front':
        camera.position.set(target.x, target.y, target.z + dist);
        break;
      case 'right':
        camera.position.set(target.x + dist, target.y, target.z);
        break;
      case 'back':
        camera.position.set(target.x, target.y, target.z - dist);
        break;
      case 'left':
        camera.position.set(target.x - dist, target.y, target.z);
        break;
    }
    camera.lookAt(target);
    controls.update();
  };

  const zoomExtents = () => {
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    const modelGroup = modelGroupRef.current;
    if (!camera || !controls || !modelGroup) return;

    const box = new THREE.Box3().setFromObject(modelGroup);
    if (box.isEmpty()) return;

    const center = new THREE.Vector3();
    const size = new THREE.Vector3();
    box.getCenter(center);
    box.getSize(size);

    const maxDim = Math.max(size.x, size.y, size.z);
    controls.target.copy(center);
    camera.position.set(center.x + maxDim * 1.8, center.y + maxDim * 1.4, center.z + maxDim * 1.8);
    controls.update();
  };

  return (
    <div className="relative w-full h-full select-none overflow-hidden bg-stone-900">
      {/* 3D WebGL Canvas Mount */}
      <div ref={mountRef} className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Top Left Spec Badge & Model Info */}
      <div className="absolute top-3 left-3 z-10 flex flex-col gap-1.5 pointer-events-none">
        <div className="flex items-center gap-2 bg-stone-900/90 border border-stone-700/80 rounded-md px-2.5 py-1.5 shadow-lg backdrop-blur-none pointer-events-auto">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
          <span className="text-xs font-semibold text-stone-100 font-mono tracking-wide">
            {extension.name}
          </span>
          <span className="text-[10px] bg-stone-800 text-amber-400 border border-amber-500/30 px-1.5 py-0.5 rounded font-mono">
            {extension.geometryType.toUpperCase()}
          </span>
        </div>

        {/* Real-time Dimensions & Bounding Specs */}
        {showDimensions && (
          <div className="flex items-center gap-3 bg-stone-950/85 border border-stone-800 rounded px-2.5 py-1 text-[11px] text-stone-300 font-mono pointer-events-auto">
            <span className="flex items-center gap-1 text-rose-400">
              <span className="font-bold">W:</span> {stats.boundingBox.width} {unit}
            </span>
            <span className="flex items-center gap-1 text-emerald-400">
              <span className="font-bold">D:</span> {stats.boundingBox.depth} {unit}
            </span>
            <span className="flex items-center gap-1 text-sky-400">
              <span className="font-bold">H:</span> {stats.boundingBox.height} {unit}
            </span>
          </div>
        )}
      </div>

      {/* Top Right Quick SketchUp Viewport Actions */}
      <div className="absolute top-3 right-3 z-10 flex items-center gap-1 bg-stone-900/90 border border-stone-700/80 rounded-md p-1 shadow-lg">
        <button
          onClick={zoomExtents}
          title="Zoom Extents (Fit Model to Viewport)"
          className="p-1.5 rounded hover:bg-stone-700 text-stone-300 hover:text-white transition-colors"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
        <button
          onClick={() => setShadowsEnabled(!shadowsEnabled)}
          title={shadowsEnabled ? 'Disable Sun Shadows' : 'Enable Sun Shadows'}
          className={`p-1.5 rounded transition-colors ${
            shadowsEnabled ? 'bg-amber-500/20 text-amber-400' : 'hover:bg-stone-700 text-stone-400'
          }`}
        >
          <Sun className="w-4 h-4" />
        </button>
        <button
          onClick={() => setShowDimensions(!showDimensions)}
          title="Toggle Dimensions Tape"
          className={`p-1.5 rounded transition-colors ${
            showDimensions ? 'bg-sky-500/20 text-sky-400' : 'hover:bg-stone-700 text-stone-400'
          }`}
        >
          <Ruler className="w-4 h-4" />
        </button>
      </div>

      {/* SketchUp Axis Legend Indicator (Bottom-Left) */}
      <div className="absolute bottom-4 left-4 z-10 flex flex-col gap-1 bg-stone-950/85 border border-stone-800 px-2 py-1.5 rounded text-[10px] font-mono pointer-events-none">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-0.5 bg-red-500 rounded" />
          <span className="text-stone-300">X (Red) : East/Width</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-0.5 bg-green-500 rounded" />
          <span className="text-stone-300">Y (Green) : North/Depth</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-0.5 bg-blue-500 rounded" />
          <span className="text-stone-300">Z (Blue) : Height/Elevation</span>
        </div>
      </div>

      {/* Unified Ergonomic Bottom Control Dock (Compliant with Three.js Skill layout) */}
      <div
        className={`absolute bottom-3 left-1/2 -translate-x-1/2 z-20 transition-all duration-300 ease-out flex flex-col items-center max-w-[94vw] ${
          dockCollapsed ? 'translate-y-[calc(100%-24px)]' : 'translate-y-0'
        }`}
      >
        {/* Collapse / Expand Toggle Button */}
        <button
          onClick={() => setDockCollapsed(!dockCollapsed)}
          className="flex items-center gap-1 px-3 py-1 bg-stone-900 border border-stone-700 text-stone-300 hover:text-white rounded-t-md text-xs font-mono shadow-md cursor-pointer mb-[-1px]"
        >
          {dockCollapsed ? (
            <>
              <ChevronUp className="w-3.5 h-3.5" />
              <span>Show Viewport Controls</span>
            </>
          ) : (
            <>
              <ChevronDown className="w-3.5 h-3.5" />
              <span>Hide Controls (Zen Mode)</span>
            </>
          )}
        </button>

        {/* Dock Bar */}
        <div className="flex flex-wrap items-center gap-3 bg-stone-950/95 border border-stone-700/80 rounded-lg p-2.5 shadow-2xl text-xs text-stone-200">
          {/* Camera Preset Buttons */}
          <div className="flex items-center gap-1 border-r border-stone-800 pr-3">
            <span className="text-[10px] uppercase font-mono text-stone-400 mr-1 flex items-center gap-1">
              <Compass className="w-3 h-3" /> View
            </span>
            {(['iso', 'top', 'front', 'right'] as CameraPreset[]).map((v) => (
              <button
                key={v}
                onClick={() => setCameraPreset(v)}
                className="px-2 py-1 rounded bg-stone-900 hover:bg-stone-800 text-stone-300 hover:text-white font-mono uppercase text-[11px] transition-colors border border-stone-800"
              >
                {v}
              </button>
            ))}
          </div>

          {/* Style Selector */}
          <div className="flex items-center gap-1 border-r border-stone-800 pr-3">
            <span className="text-[10px] uppercase font-mono text-stone-400 mr-1 flex items-center gap-1">
              <Layers className="w-3 h-3" /> Style
            </span>
            <button
              onClick={() => setStyle('sketchup_standard')}
              className={`px-2 py-1 rounded text-[11px] font-mono transition-colors ${
                style === 'sketchup_standard'
                  ? 'bg-amber-600 text-white font-semibold'
                  : 'bg-stone-900 text-stone-400 hover:bg-stone-800'
              }`}
            >
              Standard
            </button>
            <button
              onClick={() => setStyle('construction_monochrome')}
              className={`px-2 py-1 rounded text-[11px] font-mono transition-colors ${
                style === 'construction_monochrome'
                  ? 'bg-amber-600 text-white font-semibold'
                  : 'bg-stone-900 text-stone-400 hover:bg-stone-800'
              }`}
            >
              Monochrome
            </button>
            <button
              onClick={() => setStyle('blueprint_dark')}
              className={`px-2 py-1 rounded text-[11px] font-mono transition-colors ${
                style === 'blueprint_dark'
                  ? 'bg-blue-600 text-white font-semibold'
                  : 'bg-stone-900 text-stone-400 hover:bg-stone-800'
              }`}
            >
              Blueprint
            </button>
            <button
              onClick={() => setStyle('xray_translucent')}
              className={`px-2 py-1 rounded text-[11px] font-mono transition-colors ${
                style === 'xray_translucent'
                  ? 'bg-sky-600 text-white font-semibold'
                  : 'bg-stone-900 text-stone-400 hover:bg-stone-800'
              }`}
            >
              X-Ray
            </button>
          </div>

          {/* Explode / Assembly Slider */}
          <div className="flex items-center gap-2 border-r border-stone-800 pr-3">
            <span className="text-[10px] uppercase font-mono text-stone-400">Explode</span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.02"
              value={explodeRatio}
              onChange={(e) => setExplodeRatio(parseFloat(e.target.value))}
              className="w-20 accent-amber-500 cursor-pointer h-1.5 bg-stone-800 rounded"
            />
            <span className="font-mono text-[10px] text-stone-400 w-8">
              {Math.round(explodeRatio * 100)}%
            </span>
          </div>

          {/* Statistics summary */}
          <div className="flex items-center gap-2 font-mono text-[11px] text-stone-400">
            <span className="flex items-center gap-1">
              <Box className="w-3 h-3 text-amber-500" />
              <span>{stats.faces} faces</span>
            </span>
            <span className="text-stone-600">|</span>
            <span>{stats.edges} edges</span>
          </div>
        </div>
      </div>
    </div>
  );
};
