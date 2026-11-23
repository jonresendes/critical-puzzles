/**
 * ============================================================================
 * TOTEM ASSET FACTORY - GAME INTEGRATION MODULE (Three.js r128+)
 * Includes 10 Sculpted Archetypes + 6 Classic & 5 Gemstone PBR Materials
 * ============================================================================
 * 1. Import or include this file in your Three.js game project.
 * 2. Instantiate (pass renderer for procedural gemstone/metal reflections):
 *      const totemFactory = new TotemAssetFactory(THREE, renderer);
 * 3. Spawn stack:
 *      const playerTotem = totemFactory.createTotemStack(CONFIG);
 * 4. Add to scene:
 *      scene.add(playerTotem);
 * 5. Animate in your game loop:
 *      playerTotem.userData.update(clock.getElapsedTime());
 * ============================================================================
 */

/**
     * TotemAssetFactory
     * Self-contained procedural 3D generator for squat stackable accolade totems.
     * Compatible with Three.js r128+ (ES6 / Global THREE).
     *
     * Standardized Geometry Spec:
     *  - Core Radius:   1.00 unit (Diameter = 2.00 units)
     *  - Core Height:   1.25 units per totem block
     *  - Interlocking:  Top mortise socket, bottom cylindrical tenon peg + side dowel pins
     *  - Max Stack:     4 blocks resting on a carved wooden display pedestal
     */
    class TotemAssetFactory {
      constructor(THREE_LIB, renderer = null) {
        this.THREE = THREE_LIB || window.THREE;
        this.CORE_RADIUS = 1.00;
        this.CORE_HEIGHT = 1.25;
        this.PEG_HEIGHT = 0.22;
        this.PEG_RADIUS = 0.44;
        this.BASE_HEIGHT = 0.46;
        this.MAX_STACK = 4;

        this.textures = {};
        this.materials = {};
        this.envMap = null;

        if (renderer) {
          this.envMap = this._createStudioEnvMap(renderer);
        }

        this._initProceduralTextures();
        this._initMaterials();
      }

      /**
       * Generates a procedural studio HDR-like PMREM environment map so metals
       * and faceted gemstones (Diamond, Ruby, Sapphire, Emerald, Amethyst)
       * exhibit crisp specular highlights and internal reflections without external HDR files.
       */
      _createStudioEnvMap(renderer) {
        const THREE = this.THREE;
        const pmrem = new THREE.PMREMGenerator(renderer);
        pmrem.compileEquirectangularShader();

        const envScene = new THREE.Scene();
        envScene.background = new THREE.Color(0x111622);

        const panels = [
          { color: 0xffffff, pos: [0, 12, 6],   scale: [18, 6, 1],   rot: [Math.PI / 3, 0, 0] },
          { color: 0xfff3d6, pos: [12, 6, 4],   scale: [8, 12, 1],   rot: [0, -Math.PI / 2.4, 0] },
          { color: 0xdbeafe, pos: [-12, 5, -4], scale: [10, 10, 1],  rot: [0, Math.PI / 2.2, 0] },
          { color: 0xfef08a, pos: [0, -10, 0],  scale: [20, 20, 1],  rot: [-Math.PI / 2, 0, 0] },
          { color: 0xf472b6, pos: [6, 3, -12],  scale: [8, 8, 1],    rot: [0, Math.PI, 0] }
        ];

        panels.forEach(p => {
          const mesh = new THREE.Mesh(
            new THREE.PlaneGeometry(1, 1),
            new THREE.MeshBasicMaterial({ color: p.color, side: THREE.DoubleSide })
          );
          mesh.position.set(...p.pos);
          mesh.scale.set(...p.scale);
          mesh.rotation.set(...p.rot);
          envScene.add(mesh);
        });

        const renderTarget = pmrem.fromScene(envScene, 0.035);
        pmrem.dispose();
        return renderTarget.texture;
      }

      /**
       * Catalog of all 10 available totem archetypes
       */
      static get TOTEM_TYPES() {
        return [
          { id: 'beaver',     name: 'Beaver',         icon: '🦫', desc: 'Squat builder with cross-hatched tail behind' },
          { id: 'owl',        name: 'Great Owl',      icon: '🦉', desc: 'Layered outstretched wings, tufts & talons' },
          { id: 'tree',       name: 'Ancient Tree',   icon: '🌳', desc: 'Hollow-knot bark trunk & 4 leafy branches' },
          { id: 'water',      name: 'Ball of Water',  icon: '🌊', desc: 'Swirling ocean wave core & floating droplets' },
          { id: 'flame',      name: 'Glowing Flame',  icon: '🔥', desc: 'Multi-tongue flickering fire & rising embers' },
          { id: 'key',        name: 'Master Key',     icon: '🗝️', desc: 'Clover-cut bow ring, notched shaft & warded bit' },
          { id: 'lighthouse', name: 'Lighthouse',     icon: '🚨', desc: 'Tapered masonry tower, gallery & rotating beam' },
          { id: 'sword',      name: 'Greatsword',     icon: '⚔️', desc: 'Vertical fuller blade, wide quillons & pommel' },
          { id: 'shield',     name: 'Aegis Shield',   icon: '🛡️', desc: 'Curved heater shield, boss & riveted emblem' },
          { id: 'mountain',   name: 'Mountain Peak',  icon: '🏔️', desc: 'Craggy alpine ridges & snow-capped spires' }
        ];
      }

      /**
       * Catalog of Accolade Finishes grouped into Classic and Gemstone categories
       */
      static get FINISH_TIERS() {
        return [
          // Classic Finishes
          { id: 'wood',     category: 'classic',  name: 'Carved Walnut',     swatch: 'linear-gradient(135deg, #8c5832, #4e2d16)' },
          { id: 'stone',    category: 'classic',  name: 'Mossy Granite',     swatch: 'linear-gradient(135deg, #7c858e, #4b5563)' },
          { id: 'bronze',   category: 'classic',  name: 'Brushed Bronze',    swatch: 'linear-gradient(135deg, #d98a54, #85461e)' },
          { id: 'silver',   category: 'classic',  name: 'Sterling Silver',   swatch: 'linear-gradient(135deg, #f8fafc, #94a3b8)' },
          { id: 'gold',     category: 'classic',  name: 'Radiant Gold',      swatch: 'linear-gradient(135deg, #fde047, #d97706)' },
          { id: 'obsidian', category: 'classic',  name: 'Volcanic Obsidian', swatch: 'linear-gradient(135deg, #312e81, #090d16)' },
          // Gemstone Finishes
          { id: 'amethyst', category: 'gemstone', name: 'Amethyst',          swatch: 'linear-gradient(135deg, #c084fc, #6b21a8)' },
          { id: 'sapphire', category: 'gemstone', name: 'Sapphire',          swatch: 'linear-gradient(135deg, #60a5fa, #1e3a8a)' },
          { id: 'ruby',     category: 'gemstone', name: 'Ruby',              swatch: 'linear-gradient(135deg, #fb7185, #9f1239)' },
          { id: 'emerald',  category: 'gemstone', name: 'Emerald',           swatch: 'linear-gradient(135deg, #34d399, #065f46)' },
          { id: 'diamond',  category: 'gemstone', name: 'Diamond',           swatch: 'linear-gradient(135deg, #ffffff, #bae6fd 55%, #f5d0fe)' }
        ];
      }

      /**
       * Generates procedural Canvas PBR textures (albedo, bumpMap, roughnessMap, crystal facets, water, tail)
       */
      _initProceduralTextures() {
        // 1. Wood Grain Albedo & Bump
        this.textures.wood = this._makeCanvasTexture(256, 256, (ctx, w, h) => {
          ctx.fillStyle = '#7c4d2b';
          ctx.fillRect(0, 0, w, h);
          for (let y = 0; y < h; y += 2) {
            const wave = Math.sin(y * 0.08) * 14;
            ctx.fillStyle = y % 4 === 0 ? 'rgba(42, 22, 10, 0.28)' : 'rgba(156, 104, 62, 0.18)';
            ctx.fillRect(0, y, w, 1.5);
            ctx.strokeStyle = 'rgba(38, 19, 8, 0.22)';
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.bezierCurveTo(w * 0.33, y + wave * 0.3, w * 0.66, y - wave * 0.3, w, y);
            ctx.stroke();
          }
        });

        // 2. Carved Stone / Mossy Granite Texture
        this.textures.stone = this._makeCanvasTexture(256, 256, (ctx, w, h) => {
          ctx.fillStyle = '#737982';
          ctx.fillRect(0, 0, w, h);
          for (let i = 0; i < 3400; i++) {
            const x = Math.random() * w;
            const y = Math.random() * h;
            const r = 1 + Math.random() * 2.5;
            ctx.fillStyle = Math.random() > 0.5 ? 'rgba(255,255,255,0.10)' : 'rgba(15,20,25,0.18)';
            ctx.fillRect(x, y, r, r);
          }
          for (let i = 0; i < 160; i++) {
            ctx.fillStyle = 'rgba(68, 122, 64, 0.28)';
            ctx.beginPath();
            ctx.arc(Math.random() * w, Math.random() * h, 2 + Math.random() * 4.5, 0, Math.PI * 2);
            ctx.fill();
          }
        });

        // 3. Brushed Metal Roughness/Bump Texture
        this.textures.metal = this._makeCanvasTexture(256, 256, (ctx, w, h) => {
          ctx.fillStyle = '#d4d4d8';
          ctx.fillRect(0, 0, w, h);
          for (let y = 0; y < h; y++) {
            ctx.fillStyle = Math.random() > 0.5 ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.09)';
            ctx.fillRect(0, y, w, 1);
          }
        });

        // 4. Crystalline Gemstone Facet & Inclusion Bump/Roughness Map
        this.textures.crystalFacet = this._makeCanvasTexture(256, 256, (ctx, w, h) => {
          ctx.fillStyle = '#9ca3af';
          ctx.fillRect(0, 0, w, h);
          // Voronoi-like triangular crystal facets
          for (let i = 0; i < 65; i++) {
            const cx = Math.random() * w;
            const cy = Math.random() * h;
            const size = 24 + Math.random() * 46;
            const shade = Math.floor(110 + Math.random() * 135);
            ctx.fillStyle = `rgba(${shade}, ${shade}, ${shade}, 0.45)`;
            ctx.beginPath();
            ctx.moveTo(cx, cy - size * 0.6);
            ctx.lineTo(cx + size * 0.55, cy + size * 0.45);
            ctx.lineTo(cx - size * 0.55, cy + size * 0.45);
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = 'rgba(255,255,255,0.35)';
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        });

        // 5. Water Swirl & Foam Texture
        this.textures.water = this._makeCanvasTexture(256, 256, (ctx, w, h) => {
          const grad = ctx.createLinearGradient(0, 0, w, h);
          grad.addColorStop(0, '#0284c7');
          grad.addColorStop(0.5, '#0ea5e9');
          grad.addColorStop(1, '#0369a1');
          ctx.fillStyle = grad;
          ctx.fillRect(0, 0, w, h);

          ctx.strokeStyle = 'rgba(255, 255, 255, 0.58)';
          ctx.lineWidth = 3.5;
          for (let i = 0; i < 18; i++) {
            ctx.beginPath();
            const startY = (i / 18) * h;
            ctx.moveTo(0, startY);
            ctx.bezierCurveTo(w * 0.35, startY - 24, w * 0.65, startY + 24, w, startY);
            ctx.stroke();
          }
        });

        // 6. Beaver Tail Cross-Hatch Texture
        this.textures.tail = this._makeCanvasTexture(128, 128, (ctx, w, h) => {
          ctx.fillStyle = '#4a3222';
          ctx.fillRect(0, 0, w, h);
          ctx.strokeStyle = '#291a10';
          ctx.lineWidth = 2.5;
          for (let i = -w; i < w * 2; i += 12) {
            ctx.beginPath();
            ctx.moveTo(i, 0);
            ctx.lineTo(i + h, h);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(i + h, 0);
            ctx.lineTo(i, h);
            ctx.stroke();
          }
        });
      }

      _makeCanvasTexture(w, h, drawFn) {
        const THREE = this.THREE;
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        drawFn(ctx, w, h);
        const tex = new THREE.CanvasTexture(canvas);
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.RepeatWrapping;
        return tex;
      }

      /**
       * Initializes PBR Standard & Physical materials for all Classic and Gemstone finishes
       */
      _initMaterials() {
        const THREE = this.THREE;
        const env = this.envMap;

        this.materials = {
          // --- CLASSIC FINISHES ---
          wood: new THREE.MeshStandardMaterial({
            map: this.textures.wood,
            bumpMap: this.textures.wood,
            bumpScale: 0.03,
            roughness: 0.68,
            metalness: 0.05,
            envMap: env,
            envMapIntensity: 0.35
          }),
          woodLight: new THREE.MeshStandardMaterial({
            color: 0xc89d6c,
            map: this.textures.wood,
            roughness: 0.6,
            metalness: 0.05,
            envMap: env,
            envMapIntensity: 0.35
          }),
          stone: new THREE.MeshStandardMaterial({
            map: this.textures.stone,
            bumpMap: this.textures.stone,
            bumpScale: 0.04,
            roughnessMap: this.textures.stone,
            roughness: 0.86,
            metalness: 0.08,
            envMap: env,
            envMapIntensity: 0.3
          }),
          bronze: new THREE.MeshStandardMaterial({
            color: 0xd1824b,
            map: this.textures.metal,
            bumpMap: this.textures.metal,
            bumpScale: 0.015,
            roughnessMap: this.textures.metal,
            roughness: 0.32,
            metalness: 0.85,
            envMap: env,
            envMapIntensity: 1.15
          }),
          silver: new THREE.MeshStandardMaterial({
            color: 0xf1f5f9,
            map: this.textures.metal,
            bumpMap: this.textures.metal,
            bumpScale: 0.01,
            roughnessMap: this.textures.metal,
            roughness: 0.20,
            metalness: 0.94,
            envMap: env,
            envMapIntensity: 1.35
          }),
          gold: new THREE.MeshStandardMaterial({
            color: 0xffc63b,
            map: this.textures.metal,
            bumpMap: this.textures.metal,
            bumpScale: 0.014,
            roughnessMap: this.textures.metal,
            roughness: 0.19,
            metalness: 0.96,
            emissive: 0x3b2100,
            emissiveIntensity: 0.22,
            envMap: env,
            envMapIntensity: 1.45
          }),
          obsidian: new THREE.MeshPhysicalMaterial({
            color: 0x16142c,
            bumpMap: this.textures.crystalFacet,
            bumpScale: 0.015,
            roughness: 0.12,
            metalness: 0.35,
            clearcoat: 1.0,
            clearcoatRoughness: 0.08,
            reflectivity: 0.95,
            emissive: 0x1e1b4b,
            emissiveIntensity: 0.28,
            envMap: env,
            envMapIntensity: 1.4
          }),

          // --- GEMSTONE FINISHES ---
          amethyst: new THREE.MeshPhysicalMaterial({
            color: 0x9333ea,
            bumpMap: this.textures.crystalFacet,
            bumpScale: 0.022,
            roughness: 0.10,
            metalness: 0.04,
            ior: 1.55,
            transmission: 0.56,
            transparent: true,
            opacity: 0.90,
            clearcoat: 1.0,
            clearcoatRoughness: 0.06,
            emissive: 0x581c87,
            emissiveIntensity: 0.42,
            envMap: env,
            envMapIntensity: 1.65
          }),
          sapphire: new THREE.MeshPhysicalMaterial({
            color: 0x1d4ed8,
            bumpMap: this.textures.crystalFacet,
            bumpScale: 0.018,
            roughness: 0.08,
            metalness: 0.06,
            ior: 1.77,
            transmission: 0.52,
            transparent: true,
            opacity: 0.92,
            clearcoat: 1.0,
            clearcoatRoughness: 0.05,
            emissive: 0x172554,
            emissiveIntensity: 0.45,
            envMap: env,
            envMapIntensity: 1.75
          }),
          ruby: new THREE.MeshPhysicalMaterial({
            color: 0xe11d48,
            bumpMap: this.textures.crystalFacet,
            bumpScale: 0.020,
            roughness: 0.09,
            metalness: 0.05,
            ior: 1.77,
            transmission: 0.50,
            transparent: true,
            opacity: 0.91,
            clearcoat: 1.0,
            clearcoatRoughness: 0.05,
            emissive: 0x881337,
            emissiveIntensity: 0.48,
            envMap: env,
            envMapIntensity: 1.75
          }),
          emerald: new THREE.MeshPhysicalMaterial({
            color: 0x059669,
            bumpMap: this.textures.crystalFacet,
            bumpScale: 0.026,
            roughness: 0.12,
            metalness: 0.04,
            ior: 1.58,
            transmission: 0.48,
            transparent: true,
            opacity: 0.91,
            clearcoat: 1.0,
            clearcoatRoughness: 0.07,
            emissive: 0x064e3b,
            emissiveIntensity: 0.44,
            envMap: env,
            envMapIntensity: 1.65
          }),
          diamond: new THREE.MeshPhysicalMaterial({
            color: 0xf0f9ff,
            bumpMap: this.textures.crystalFacet,
            bumpScale: 0.024,
            roughness: 0.04,
            metalness: 0.08,
            ior: 2.42,
            transmission: 0.72,
            transparent: true,
            opacity: 0.86,
            clearcoat: 1.0,
            clearcoatRoughness: 0.02,
            reflectivity: 1.0,
            emissive: 0x38bdf8,
            emissiveIntensity: 0.24,
            envMap: env,
            envMapIntensity: 2.2
          })
        };
      }

      /**
       * Resolves primary and contrasting accent materials for any finish tier
       */
      _getTierMaterials(finishId) {
        const THREE = this.THREE;
        const primary = this.materials[finishId] || this.materials.wood;
        const accent = primary.clone();

        if (finishId === 'wood') {
          accent.color = new THREE.Color(0x4e2c15);
        } else if (finishId === 'stone') {
          accent.color = new THREE.Color(0x9ca3af);
        } else if (finishId === 'diamond') {
          accent.color = new THREE.Color(0xbae6fd);
          accent.emissive = new THREE.Color(0xe879f9);
          accent.emissiveIntensity = 0.28;
        } else {
          accent.color.offsetHSL(0.02, -0.04, 0.12);
        }
        return { primary, accent };
      }

      /**
       * Builds the carved wooden display pedestal base with top tenon peg
       */
      createPedestalBase() {
        const THREE = this.THREE;
        const group = new THREE.Group();
        group.name = 'TotemPedestalBase';

        const baseGeo = new THREE.CylinderGeometry(1.18, 1.32, this.BASE_HEIGHT, 20);
        const baseMesh = new THREE.Mesh(baseGeo, this.materials.wood);
        baseMesh.position.y = this.BASE_HEIGHT / 2;
        baseMesh.castShadow = true;
        baseMesh.receiveShadow = true;
        group.add(baseMesh);

        // Hand-carved gouge facets around the rim
        const facetCount = 16;
        for (let i = 0; i < facetCount; i++) {
          const angle = (i / facetCount) * Math.PI * 2;
          const facetGeo = new THREE.BoxGeometry(0.26, this.BASE_HEIGHT * 0.74, 0.16);
          const facet = new THREE.Mesh(facetGeo, this.materials.woodLight);
          facet.position.set(
            Math.cos(angle) * 1.20,
            this.BASE_HEIGHT * 0.48,
            Math.sin(angle) * 1.20
          );
          facet.rotation.y = -angle + Math.PI / 2;
          facet.rotation.x = 0.15;
          facet.castShadow = true;
          facet.receiveShadow = true;
          group.add(facet);
        }

        // Top cylindrical tenon peg that inserts into the bottom mortise of Tier 1
        const pegGeo = new THREE.CylinderGeometry(this.PEG_RADIUS * 0.96, this.PEG_RADIUS, this.PEG_HEIGHT, 24);
        const peg = new THREE.Mesh(pegGeo, this.materials.woodLight);
        peg.position.y = this.BASE_HEIGHT + this.PEG_HEIGHT / 2;
        group.add(peg);

        return group;
      }

      /**
       * Standardized Uniform Core (Radius = 1.0, Height = 1.25) with:
       *  - Top mortise socket ring & bottom mortise recess
       *  - Bottom/Top interlocking tenon peg
       *  - Horizontal side dowel pins
       */
      _createStandardCore(primaryMat, options = {}) {
        const THREE = this.THREE;
        const coreGroup = new THREE.Group();
        const r = options.radius || this.CORE_RADIUS;
        const h = this.CORE_HEIGHT;

        // Main uniform cylinder drum (uses 16 facets for gemstones to catch crisp light reflections)
        const radialSegs = options.faceted ? 16 : 32;
        const geo = new THREE.CylinderGeometry(r, r, h, radialSegs);
        const mesh = new THREE.Mesh(geo, primaryMat);
        mesh.position.y = h / 2;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        coreGroup.add(mesh);

        // Top Mortise Socket Collar (receives the tenon peg of the block above)
        const socketOuter = new THREE.Mesh(
          new THREE.RingGeometry(this.PEG_RADIUS * 1.02, r * 0.96, 28),
          this.materials.woodLight
        );
        socketOuter.rotation.x = -Math.PI / 2;
        socketOuter.position.y = h + 0.002;
        coreGroup.add(socketOuter);

        const socketDark = new THREE.Mesh(
          new THREE.CircleGeometry(this.PEG_RADIUS * 1.02, 24),
          new THREE.MeshStandardMaterial({ color: 0x231409, roughness: 0.9 })
        );
        socketDark.rotation.x = -Math.PI / 2;
        socketDark.position.y = h + 0.001;
        coreGroup.add(socketDark);

        // Top Tenon Peg (protrudes upward to lock into next totem's bottom mortise)
        const pegGeo = new THREE.CylinderGeometry(this.PEG_RADIUS * 0.94, this.PEG_RADIUS * 0.98, this.PEG_HEIGHT, 24);
        const peg = new THREE.Mesh(pegGeo, this.materials.woodLight);
        peg.position.y = h + this.PEG_HEIGHT / 2;
        coreGroup.add(peg);

        // Bottom Mortise Rim
        const bottomRim = new THREE.Mesh(
          new THREE.TorusGeometry(r * 0.98, 0.03, 10, 32),
          this.materials.woodLight
        );
        bottomRim.rotation.x = Math.PI / 2;
        bottomRim.position.y = 0.025;
        coreGroup.add(bottomRim);

        // Horizontal Side Dowel Pins (left & right joinery accents)
        if (options.sideDowels !== false) {
          const dowelGeo = new THREE.CylinderGeometry(0.09, 0.09, r * 2.34, 14);
          dowelGeo.rotateZ(Math.PI / 2);
          const dowel = new THREE.Mesh(dowelGeo, this.materials.woodLight);
          dowel.position.y = h * 0.5;
          dowel.castShadow = true;
          coreGroup.add(dowel);
        }

        return coreGroup;
      }

      /**
       * Helper to check if a finish ID is one of the 5 crystalline gemstones
       */
      _isGemstone(finishId) {
        return ['amethyst', 'sapphire', 'ruby', 'emerald', 'diamond'].includes(finishId);
      }

      /**
       * Builds a single squat totem piece of uniform Radius = 1.00 and Height = 1.25.
       * @param {string} type - One of TotemAssetFactory.TOTEM_TYPES ids
       * @param {string} finish - One of TotemAssetFactory.FINISH_TIERS ids
       */
      createTotemPiece(type = 'beaver', finish = 'wood') {
        const THREE = this.THREE;
        const totem = new THREE.Group();
        totem.name = `Totem_${type}_${finish}`;
        totem.userData = { type, finish, animators: [] };

        const h = this.CORE_HEIGHT; // 1.25
        const r = this.CORE_RADIUS; // 1.00
        const isGem = this._isGemstone(finish);

        switch (type) {
          // ------------------------------------------------------------------
          // 1. BEAVER: Squat rounded body, ears, buck teeth, eyes, nose,
          //            and flat cross-hatched paddle tail curving behind
          // ------------------------------------------------------------------
          case 'beaver': {
            const { primary, accent } = this._getTierMaterials(finish);
            totem.add(this._createStandardCore(primary, { radius: r * 0.94, faceted: isGem }));

            // Squat rounded belly/torso
            const bodyGeo = new THREE.SphereGeometry(0.96, isGem ? 16 : 26, isGem ? 14 : 22);
            bodyGeo.scale(1.04, 0.72, 1.08);
            const body = new THREE.Mesh(bodyGeo, primary);
            body.position.set(0, h * 0.42, 0.10);
            body.castShadow = true;
            totem.add(body);

            // Chubby head at upper-front
            const headGeo = new THREE.SphereGeometry(0.54, isGem ? 14 : 22, isGem ? 12 : 18);
            headGeo.scale(1.06, 0.84, 1.04);
            const head = new THREE.Mesh(headGeo, primary);
            head.position.set(0, h * 0.76, 0.46);
            head.castShadow = true;
            totem.add(head);

            // Cheeks, Snout & Nose
            const snout = new THREE.Mesh(new THREE.SphereGeometry(0.24, 16, 14), accent);
            snout.position.set(0, h * 0.72, 0.92);
            totem.add(snout);

            const noseMat = new THREE.MeshStandardMaterial({ color: 0x1c130e, roughness: 0.25 });
            const nose = new THREE.Mesh(new THREE.SphereGeometry(0.095, 12, 12), noseMat);
            nose.position.set(0, h * 0.78, 1.12);
            totem.add(nose);

            // Buck Teeth
            const toothMat = new THREE.MeshStandardMaterial({ color: 0xfef9c3, roughness: 0.22 });
            [-0.055, 0.055].forEach(xOff => {
              const tooth = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.17, 0.05), toothMat);
              tooth.position.set(xOff, h * 0.60, 1.02);
              tooth.rotation.x = 0.12;
              totem.add(tooth);
            });

            // Eyes & Rounded Ears
            const eyeMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.1 });
            [-0.26, 0.26].forEach(xOff => {
              const eye = new THREE.Mesh(new THREE.SphereGeometry(0.075, 12, 12), eyeMat);
              eye.position.set(xOff, h * 0.83, 0.84);
              totem.add(eye);

              const ear = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 12), accent);
              ear.scale.set(0.55, 1, 0.85);
              ear.position.set(xOff * 1.48, h * 0.92, 0.38);
              totem.add(ear);
            });

            // Front Paws
            [-0.30, 0.30].forEach(xOff => {
              const paw = new THREE.Mesh(new THREE.SphereGeometry(0.17, 14, 12), accent);
              paw.scale.set(0.95, 0.6, 1.35);
              paw.position.set(xOff, h * 0.13, 0.78);
              totem.add(paw);
            });

            // Flat Cross-Hatched Paddle Tail curving behind (-Z)
            const tailMat = finish === 'wood'
              ? new THREE.MeshStandardMaterial({ map: this.textures.tail, bumpMap: this.textures.tail, bumpScale: 0.045, roughness: 0.75 })
              : accent;
            const tailGeo = new THREE.SphereGeometry(0.58, 22, 16);
            tailGeo.scale(0.88, 0.18, 1.75);
            const tail = new THREE.Mesh(tailGeo, tailMat);
            tail.position.set(0, h * 0.36, -1.16);
            tail.rotation.x = 0.62;
            tail.castShadow = true;
            totem.add(tail);
            break;
          }

          // ------------------------------------------------------------------
          // 2. GREAT OWL: Feathered body, horned tufts, glowing eyes, beak,
          //               talons, and wide outstretched layered wings
          // ------------------------------------------------------------------
          case 'owl': {
            const { primary, accent } = this._getTierMaterials(finish);
            totem.add(this._createStandardCore(primary, { faceted: isGem }));

            // Chest Feather Chevron Scales
            for (let row = 0; row < 3; row++) {
              for (let col = -1; col <= 1; col++) {
                const feather = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 10), accent);
                feather.scale.set(1.1, 0.75, 0.45);
                feather.position.set(col * 0.24 + (row % 2) * 0.10, h * (0.24 + row * 0.13), 0.92);
                totem.add(feather);
              }
            }

            // Horned Ear Tufts
            [-0.38, 0.38].forEach(xOff => {
              const tuft = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.36, 6), accent);
              tuft.position.set(xOff, h * 0.94, 0.42);
              tuft.rotation.z = xOff > 0 ? -0.36 : 0.36;
              tuft.rotation.x = 0.25;
              totem.add(tuft);
            });

            // Glowing Eyes & Hooked Beak
            const eyeRingMat = new THREE.MeshStandardMaterial({
              color: 0xfef08a,
              emissive: 0xf59e0b,
              emissiveIntensity: 0.55,
              roughness: 0.2
            });
            const pupilMat = new THREE.MeshStandardMaterial({ color: 0x090d16, roughness: 0.1 });
            [-0.29, 0.29].forEach(xOff => {
              const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.23, 0.23, 0.10, 20), eyeRingMat);
              disc.rotation.x = Math.PI / 2;
              disc.position.set(xOff, h * 0.72, 0.88);
              totem.add(disc);

              const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.11, 12, 12), pupilMat);
              pupil.position.set(xOff, h * 0.72, 0.93);
              totem.add(pupil);
            });

            const beakMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.3 });
            const beak = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.30, 4), beakMat);
            beak.rotation.x = Math.PI * 0.78;
            beak.position.set(0, h * 0.56, 0.98);
            totem.add(beak);

            // Gripping Talons at bottom front
            [-0.32, 0.32].forEach(xOff => {
              [-0.07, 0, 0.07].forEach(toe => {
                const claw = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.18, 6), beakMat);
                claw.rotation.x = Math.PI * 0.65;
                claw.position.set(xOff + toe, h * 0.08, 0.94);
                totem.add(claw);
              });
            });

            // Wide Outstretched Layered Wings (Left & Right)
            [-1, 1].forEach(dir => {
              const wingGroup = new THREE.Group();
              wingGroup.position.set(dir * 0.92, h * 0.58, 0);

              const upperWing = new THREE.Mesh(new THREE.BoxGeometry(1.28, 0.42, 0.22), primary);
              upperWing.position.set(dir * 0.62, 0.10, -0.05);
              upperWing.rotation.z = dir * 0.16;
              upperWing.rotation.y = -dir * 0.14;
              upperWing.castShadow = true;
              wingGroup.add(upperWing);

              for (let f = 0; f < 4; f++) {
                const feather = new THREE.Mesh(new THREE.BoxGeometry(0.86 - f * 0.11, 0.14, 0.16), accent);
                feather.position.set(dir * (0.68 - f * 0.10), -0.14 - f * 0.11, -0.06);
                feather.rotation.z = dir * (0.24 + f * 0.08);
                feather.castShadow = true;
                wingGroup.add(feather);
              }
              totem.add(wingGroup);
            });
            break;
          }

          // ------------------------------------------------------------------
          // 3. ANCIENT TREE: Textured bark trunk with hollow knot, roots,
          //                    and 4 extending branches with multi-leaf clusters
          // ------------------------------------------------------------------
          case 'tree': {
            const { primary, accent } = this._getTierMaterials(finish);
            totem.add(this._createStandardCore(primary, { radius: r * 0.92, faceted: isGem }));

            // Vertical bark ridges & flared roots
            for (let i = 0; i < 10; i++) {
              const ang = (i / 10) * Math.PI * 2;
              const ridge = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.16, h * 0.96, 8), accent);
              ridge.position.set(Math.cos(ang) * 0.88, h * 0.48, Math.sin(ang) * 0.88);
              ridge.castShadow = true;
              totem.add(ridge);
            }

            // Hollow Owl/Squirrel Knot Hole on Front (+Z)
            const knotRim = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.06, 10, 20), accent);
            knotRim.position.set(0, h * 0.44, 0.92);
            totem.add(knotRim);

            const knotHole = new THREE.Mesh(
              new THREE.CircleGeometry(0.20, 18),
              new THREE.MeshStandardMaterial({ color: 0x180e07, roughness: 0.95 })
            );
            knotHole.position.set(0, h * 0.44, 0.91);
            totem.add(knotHole);

            // Leaf material adapts to finish tier
            const leafMat = (finish === 'wood' || finish === 'stone')
              ? new THREE.MeshStandardMaterial({ color: 0x3f8630, roughness: 0.62 })
              : accent;

            // 4 Extending Branches with Multi-Leaf Clusters
            const branchAngles = [0.22, Math.PI - 0.22, Math.PI * 0.56, -Math.PI * 0.44];
            branchAngles.forEach((ang, idx) => {
              const bGroup = new THREE.Group();
              const yPos = h * (0.60 + (idx % 2) * 0.14);
              bGroup.position.set(Math.cos(ang) * 0.82, yPos, Math.sin(ang) * 0.82);
              bGroup.rotation.y = -ang;

              const limb = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.13, 0.92, 8), primary);
              limb.rotation.z = -Math.PI * 0.34;
              limb.position.set(0.38, 0.18, 0);
              limb.castShadow = true;
              bGroup.add(limb);

              const clusters = [
                [0.74, 0.36, 0, 0.30],
                [0.56, 0.46, 0.18, 0.22],
                [0.58, 0.32, -0.18, 0.22],
                [0.86, 0.24, 0.08, 0.19]
              ];
              clusters.forEach(([lx, ly, lz, rad]) => {
                const puff = new THREE.Mesh(new THREE.DodecahedronGeometry(rad, 1), leafMat);
                puff.position.set(lx, ly, lz);
                puff.castShadow = true;
                bGroup.add(puff);
              });

              totem.add(bGroup);
            });
            break;
          }

          // ------------------------------------------------------------------
          // 4. BALL OF WATER: Swirling translucent ocean wave block with
          //                     sculpted wave crests and floating foam droplets
          // ------------------------------------------------------------------
          case 'water': {
            const waterMat = (finish === 'wood' || finish === 'stone')
              ? new THREE.MeshPhysicalMaterial({
                  color: 0x0ea5e9,
                  map: this.textures.water,
                  roughness: 0.08,
                  metalness: 0.05,
                  ior: 1.33,
                  transmission: 0.58,
                  transparent: true,
                  opacity: 0.88,
                  clearcoat: 1.0,
                  emissive: 0x0369a1,
                  emissiveIntensity: 0.45,
                  envMap: this.envMap,
                  envMapIntensity: 1.6
                })
              : this.materials[finish];

            totem.add(this._createStandardCore(waterMat, { radius: r * 0.94, faceted: isGem }));

            // Bulging spherical ocean wave body
            const orb = new THREE.Mesh(new THREE.SphereGeometry(1.06, isGem ? 18 : 30, isGem ? 14 : 24), waterMat);
            orb.scale.set(1.06, 0.72, 1.06);
            orb.position.y = h * 0.5;
            totem.add(orb);

            const foamMat = new THREE.MeshStandardMaterial({
              color: 0xf0f9ff,
              roughness: 0.28,
              emissive: 0xbae6fd,
              emissiveIntensity: 0.35
            });

            // Sculpted Wave Crests & Floating Foam Droplets
            const swirlGroup = new THREE.Group();
            swirlGroup.position.y = h * 0.5;
            for (let i = 0; i < 4; i++) {
              const waveArc = new THREE.Mesh(
                new THREE.TorusGeometry(1.02, 0.065, 10, 32, Math.PI * 1.15),
                foamMat
              );
              waveArc.rotation.x = Math.PI * 0.42;
              waveArc.rotation.y = (i * Math.PI) / 2;
              waveArc.position.y = (i - 1.5) * 0.14;
              swirlGroup.add(waveArc);

              // Floating water droplets orbiting outside the crest
              const dropAng = (i / 4) * Math.PI * 2 + 0.4;
              const drop = new THREE.Mesh(new THREE.SphereGeometry(0.085, 12, 12), foamMat);
              drop.scale.set(0.85, 1.25, 0.85);
              drop.position.set(Math.cos(dropAng) * 1.24, (i % 2 === 0 ? 0.22 : -0.22), Math.sin(dropAng) * 1.24);
              swirlGroup.add(drop);
            }
            totem.add(swirlGroup);

            totem.userData.animators.push((t) => {
              swirlGroup.rotation.y = t * 1.2;
            });
            break;
          }

          // ------------------------------------------------------------------
          // 5. GLOWING FLAME: Sculpted multi-tongue flickering fire core with
          //                     dynamic inner glow/emissive animation & embers
          // ------------------------------------------------------------------
          case 'flame': {
            const isClassicWarm = ['wood', 'stone', 'gold', 'bronze'].includes(finish);
            const flameOuterMat = isClassicWarm
              ? new THREE.MeshPhysicalMaterial({
                  color: 0xfbbf24,
                  roughness: 0.14,
                  transmission: 0.42,
                  transparent: true,
                  opacity: 0.86,
                  clearcoat: 1.0,
                  emissive: 0xf59e0b,
                  emissiveIntensity: 0.65,
                  envMap: this.envMap
                })
              : this.materials[finish];

            const flameCoreMat = new THREE.MeshStandardMaterial({
              color: isClassicWarm ? 0xfef08a : 0xffffff,
              emissive: isClassicWarm ? 0xff6b00 : (this.materials[finish].emissive || 0x38bdf8),
              emissiveIntensity: 1.0,
              roughness: 0.18
            });

            totem.add(this._createStandardCore(flameOuterMat, { radius: r * 0.92, faceted: isGem }));

            // Inner glowing fire core
            const emberCore = new THREE.Mesh(new THREE.OctahedronGeometry(0.68, 1), flameCoreMat);
            emberCore.position.y = h * 0.5;
            totem.add(emberCore);

            // Multi-tongue sculpted flames wrapping around the core
            const tongues = [];
            const tongueCount = 8;
            for (let i = 0; i < tongueCount; i++) {
              const ang = (i / tongueCount) * Math.PI * 2;
              const tHeight = 0.76 + (i % 3) * 0.18;
              const cone = new THREE.Mesh(new THREE.ConeGeometry(0.32, tHeight, isGem ? 6 : 12), flameOuterMat);
              cone.position.set(
                Math.cos(ang) * 0.78,
                h * 0.50 + (i % 2) * 0.12,
                Math.sin(ang) * 0.78
              );
              cone.rotation.z = -Math.cos(ang) * 0.26;
              cone.rotation.x = Math.sin(ang) * 0.26;
              totem.add(cone);
              tongues.push({ mesh: cone, phase: i * 0.95, baseY: cone.position.y });
            }

            // Rising floating ember sparks
            const sparks = [];
            for (let s = 0; s < 6; s++) {
              const ang = (s / 6) * Math.PI * 2 + 0.3;
              const spark = new THREE.Mesh(new THREE.OctahedronGeometry(0.065, 0), flameCoreMat);
              spark.position.set(Math.cos(ang) * 1.12, h * 0.25, Math.sin(ang) * 1.12);
              totem.add(spark);
              sparks.push({ mesh: spark, phase: s * 1.15 });
            }

            totem.userData.animators.push((t) => {
              emberCore.rotation.y = t * 1.9;
              const pulse = 0.94 + Math.sin(t * 6.5) * 0.08;
              emberCore.scale.setScalar(pulse);
              flameCoreMat.emissiveIntensity = 0.85 + Math.sin(t * 8) * 0.25;

              tongues.forEach(item => {
                item.mesh.scale.y = 0.90 + Math.sin(t * 7.2 + item.phase) * 0.16;
                item.mesh.position.y = item.baseY + Math.cos(t * 5.4 + item.phase) * 0.04;
              });

              sparks.forEach(sp => {
                const cycle = ((t * 0.65 + sp.phase) % 1);
                sp.mesh.position.y = h * (0.15 + cycle * 0.85);
                sp.mesh.scale.setScalar(1 - cycle * 0.7);
              });
            });
            break;
          }

          // ------------------------------------------------------------------
          // 6. MASTER KEY: Ornate bow ring with inner clover cutout, notched
          //                  shaft, and intricate warded bit extending outward
          // ------------------------------------------------------------------
          case 'key': {
            const keyFinish = finish === 'wood' ? 'gold' : finish;
            const { primary, accent } = this._getTierMaterials(keyFinish);
            totem.add(this._createStandardCore(this.materials[finish] || primary, { radius: r * 0.92, faceted: isGem }));

            const keyGroup = new THREE.Group();
            keyGroup.position.set(0, h * 0.5, 0.16);

            // Ornate Outer Bow Ring (Left -X)
            const bow = new THREE.Mesh(new THREE.TorusGeometry(0.46, 0.10, 14, 30), primary);
            bow.position.set(-1.18, 0, 0);
            bow.castShadow = true;
            keyGroup.add(bow);

            // Inner Clover Cutout Loops inside Bow
            for (let c = 0; c < 4; c++) {
              const cAng = (c * Math.PI) / 2 + Math.PI / 4;
              const lobe = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.035, 8, 16), accent);
              lobe.position.set(-1.18 + Math.cos(cAng) * 0.18, Math.sin(cAng) * 0.18, 0);
              keyGroup.add(lobe);
            }

            // Notched Horizontal Key Shaft
            const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 2.55, 16), primary);
            shaft.rotation.z = Math.PI / 2;
            shaft.position.set(0.18, 0, 0);
            shaft.castShadow = true;
            keyGroup.add(shaft);

            // Decorative Shaft Collars
            [-0.64, 0.82].forEach(xPos => {
              const collar = new THREE.Mesh(new THREE.TorusGeometry(0.145, 0.04, 10, 20), accent);
              collar.rotation.y = Math.PI / 2;
              collar.position.set(xPos, 0, 0);
              keyGroup.add(collar);
            });

            // Intricate Warded Bit Extending Downward (+X)
            const bitSpine = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.12, 0.10), accent);
            bitSpine.position.set(1.18, -0.14, 0);
            keyGroup.add(bitSpine);

            [-0.16, 0, 0.16].forEach((dx, idx) => {
              const tooth = new THREE.Mesh(
                new THREE.BoxGeometry(0.10, idx === 1 ? 0.34 : 0.26, 0.10),
                primary
              );
              tooth.position.set(1.18 + dx, -0.22, 0);
              tooth.castShadow = true;
              keyGroup.add(tooth);
            });

            totem.add(keyGroup);
            break;
          }

          // ------------------------------------------------------------------
          // 7. LIGHTHOUSE: Tapered masonry tower with gallery deck, glass
          //                lantern room, rotating light beam/glow & conical cap
          // ------------------------------------------------------------------
          case 'lighthouse': {
            const { primary, accent } = this._getTierMaterials(finish);
            totem.add(this._createStandardCore(primary, { radius: r * 0.94, faceted: isGem }));

            // Tapered Masonry Bands
            const stripeMat = (finish === 'wood' || finish === 'stone')
              ? new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.5 })
              : accent;
            [0.24, 0.60].forEach((yFrac, idx) => {
              const band = new THREE.Mesh(
                new THREE.CylinderGeometry(r * (0.97 - idx * 0.03), r * (0.99 - idx * 0.03), 0.22, isGem ? 16 : 30),
                stripeMat
              );
              band.position.y = h * yFrac;
              totem.add(band);
            });

            // Gallery Deck & Railing Ring
            const deck = new THREE.Mesh(new THREE.CylinderGeometry(1.12, 1.02, 0.10, 28), accent);
            deck.position.y = h * 0.78;
            deck.castShadow = true;
            totem.add(deck);

            const rail = new THREE.Mesh(new THREE.TorusGeometry(1.06, 0.025, 8, 28), primary);
            rail.rotation.x = Math.PI / 2;
            rail.position.y = h * 0.85;
            totem.add(rail);

            // Glass Lantern Room & Glowing Beacon Core
            const glassMat = new THREE.MeshPhysicalMaterial({
              color: 0xfef9c3,
              transmission: 0.75,
              transparent: true,
              opacity: 0.65,
              roughness: 0.08
            });
            const glassRoom = new THREE.Mesh(new THREE.CylinderGeometry(0.54, 0.54, 0.26, 16), glassMat);
            glassRoom.position.y = h * 0.89;
            totem.add(glassRoom);

            const beaconMat = new THREE.MeshStandardMaterial({
              color: 0xfef08a,
              emissive: 0xfacc15,
              emissiveIntensity: 1.0,
              roughness: 0.15
            });
            const lanternCore = new THREE.Mesh(new THREE.SphereGeometry(0.26, 16, 14), beaconMat);
            lanternCore.position.y = h * 0.89;
            totem.add(lanternCore);

            // Conical Cap Roof
            const cap = new THREE.Mesh(new THREE.ConeGeometry(0.62, 0.24, 16), stripeMat);
            cap.position.y = h * 1.06;
            totem.add(cap);

            // Rotating Volumetric Light Beam Cones
            const beamGroup = new THREE.Group();
            beamGroup.position.y = h * 0.89;
            const beamMat = new THREE.MeshBasicMaterial({
              color: 0xfef08a,
              transparent: true,
              opacity: 0.28,
              side: THREE.DoubleSide,
              depthWrite: false
            });
            [-1, 1].forEach(dir => {
              const beam = new THREE.Mesh(new THREE.ConeGeometry(0.36, 1.75, 16, 1, true), beamMat);
              beam.rotation.z = dir * (Math.PI / 2);
              beam.position.x = dir * 1.12;
              beamGroup.add(beam);
            });
            totem.add(beamGroup);

            totem.userData.animators.push((t) => {
              beamGroup.rotation.y = t * 1.8;
            });
            break;
          }

          // ------------------------------------------------------------------
          // 8. GREATSWORD: Vertical fuller blade piercing the core with
          //                  wide crossguard quillons and pommel
          // ------------------------------------------------------------------
          case 'sword': {
            const swordFinish = finish === 'wood' ? 'silver' : finish;
            const { primary, accent } = this._getTierMaterials(swordFinish);
            totem.add(this._createStandardCore(this.materials[finish] || primary, { radius: r * 0.90, faceted: isGem }));

            // Vertical Fuller Blade Piercing Front & Back
            const blade = new THREE.Mesh(new THREE.BoxGeometry(0.46, h * 1.02, 0.20), primary);
            blade.position.set(0, h * 0.48, 0.92);
            blade.castShadow = true;
            totem.add(blade);

            const fuller = new THREE.Mesh(new THREE.BoxGeometry(0.11, h * 0.88, 0.23), accent);
            fuller.position.set(0, h * 0.48, 0.92);
            totem.add(fuller);

            // Wide Winged Crossguard & Flared Quillons
            const guard = new THREE.Mesh(new THREE.BoxGeometry(2.45, 0.19, 0.30), accent);
            guard.position.set(0, h * 0.74, 0.92);
            guard.castShadow = true;
            totem.add(guard);

            [-1.24, 1.24].forEach(xOff => {
              const quillon = new THREE.Mesh(new THREE.OctahedronGeometry(0.17, 0), primary);
              quillon.position.set(xOff, h * 0.76, 0.92);
              totem.add(quillon);
            });

            // Leather/Accent Grip & Gemstone Pommel
            const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.30, 14), this.materials.wood);
            grip.position.set(0, h * 0.90, 0.92);
            totem.add(grip);

            const pommel = new THREE.Mesh(new THREE.OctahedronGeometry(0.18, 1), accent);
            pommel.position.set(0, h * 1.05, 0.92);
            totem.add(pommel);
            break;
          }

          // ------------------------------------------------------------------
          // 9. AEGIS SHIELD: Curved heater/kite shield mounted on front with
          //                    boss, riveted rim, and heraldic emblem
          // ------------------------------------------------------------------
          case 'shield': {
            const { primary, accent } = this._getTierMaterials(finish);
            totem.add(this._createStandardCore(primary, { radius: r * 0.94, faceted: isGem }));

            // Extruded Heater Shield Body
            const shape = new THREE.Shape();
            shape.moveTo(-0.76, 0.52);
            shape.lineTo(0.76, 0.52);
            shape.lineTo(0.70, -0.06);
            shape.quadraticCurveTo(0.56, -0.46, 0, -0.62);
            shape.quadraticCurveTo(-0.56, -0.46, -0.70, -0.06);
            shape.closePath();

            const shieldGeo = new THREE.ExtrudeGeometry(shape, {
              depth: 0.15,
              bevelEnabled: true,
              bevelSegments: 2,
              steps: 1,
              bevelSize: 0.04,
              bevelThickness: 0.04
            });
            const shieldMesh = new THREE.Mesh(shieldGeo, accent);
            shieldMesh.position.set(0, h * 0.50, 0.90);
            shieldMesh.castShadow = true;
            totem.add(shieldMesh);

            // Heraldic Cross Bars & Center Boss
            const vBar = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.92, 0.06), primary);
            vBar.position.set(0, h * 0.48, 1.07);
            totem.add(vBar);

            const hBar = new THREE.Mesh(new THREE.BoxGeometry(1.16, 0.12, 0.06), primary);
            hBar.position.set(0, h * 0.58, 1.07);
            totem.add(hBar);

            const boss = new THREE.Mesh(new THREE.SphereGeometry(0.24, 18, 16), primary);
            boss.scale.set(1, 1, 0.55);
            boss.position.set(0, h * 0.58, 1.10);
            totem.add(boss);

            // Rim Rivets
            [[-0.60, 0.38], [0.60, 0.38], [-0.52, -0.06], [0.52, -0.06], [0, -0.46]].forEach(([rx, ry]) => {
              const rivet = new THREE.Mesh(new THREE.SphereGeometry(0.048, 8, 8), primary);
              rivet.position.set(rx, h * 0.50 + ry, 1.09);
              totem.add(rivet);
            });
            break;
          }

          // ------------------------------------------------------------------
          // 10. MOUNTAIN PEAK: Craggy faceted alpine ridges with snow-capped
          //                    summit spires
          // ------------------------------------------------------------------
          case 'mountain': {
            const mtnFinish = finish === 'wood' ? 'stone' : finish;
            const { primary, accent } = this._getTierMaterials(mtnFinish);
            totem.add(this._createStandardCore(primary, { radius: r * 0.96, faceted: true }));

            const snowMat = (finish === 'wood' || finish === 'stone')
              ? new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.4 })
              : accent;

            const peaks = [
              { ang: 0.20,  rad: 0.48, height: 1.02, dist: 0.80 },
              { ang: 1.45,  rad: 0.44, height: 0.92, dist: 0.82 },
              { ang: 2.85,  rad: 0.50, height: 0.98, dist: 0.78 },
              { ang: 4.35,  rad: 0.46, height: 0.94, dist: 0.82 },
              { ang: 5.45,  rad: 0.40, height: 0.86, dist: 0.80 }
            ];

            peaks.forEach(p => {
              const cragGroup = new THREE.Group();
              cragGroup.position.set(Math.cos(p.ang) * p.dist, h * 0.48, Math.sin(p.ang) * p.dist);
              cragGroup.rotation.y = -p.ang;
              cragGroup.rotation.z = -0.20;

              const rockCone = new THREE.Mesh(new THREE.ConeGeometry(p.rad, p.height, 6), primary);
              rockCone.castShadow = true;
              cragGroup.add(rockCone);

              const snowCap = new THREE.Mesh(new THREE.ConeGeometry(p.rad * 0.46, p.height * 0.38, 6), snowMat);
              snowCap.position.y = p.height * 0.31;
              cragGroup.add(snowCap);

              totem.add(cragGroup);
            });
            break;
          }
        }

        return totem;
      }

      /**
       * Assembles a complete stack of totems (up to 4) on top of the carved display pedestal.
       * @param {Array<{type: string, finish: string}>} stackConfig - Ordered bottom-to-top
       * @returns {THREE.Group} Complete 3D Group ready to add to any Three.js scene
       */
      createTotemStack(stackConfig = []) {
        const THREE = this.THREE;
        const root = new THREE.Group();
        root.name = 'TotemStackAssembly';

        const clamped = stackConfig.slice(0, this.MAX_STACK);
        const animators = [];

        const base = this.createPedestalBase();
        root.add(base);

        let currentY = this.BASE_HEIGHT;
        clamped.forEach((item, index) => {
          const piece = this.createTotemPiece(item.type, item.finish);
          piece.position.y = currentY;
          piece.userData.slotIndex = index;
          root.add(piece);

          if (piece.userData.animators && piece.userData.animators.length > 0) {
            animators.push(...piece.userData.animators);
          }

          currentY += this.CORE_HEIGHT;
        });

        root.userData.update = (elapsedTime) => {
          for (let i = 0; i < animators.length; i++) {
            animators[i](elapsedTime);
          }
        };

        return root;
      }
    }

// ============================================================================
// EXAMPLE USAGE WITH YOUR CURRENTLY CONFIGURED ACCOLADE STACK:
// ============================================================================
/*
const totemFactory = new TotemAssetFactory(THREE, renderer);

const myAccoladeStackConfig = [
  {
    "type": "beaver",
    "finish": "wood"
  },
  {
    "type": "water",
    "finish": "sapphire"
  },
  {
    "type": "tree",
    "finish": "emerald"
  },
  {
    "type": "beaver",
    "finish": "obsidian"
  }
];

const totemMesh = totemFactory.createTotemStack(myAccoladeStackConfig);
totemMesh.position.set(0, 0, 0);
scene.add(totemMesh);

// Inside your requestAnimationFrame loop:
function gameLoop(timeMs) {
  const elapsedSeconds = timeMs * 0.001;
  if (totemMesh.userData.update) {
    totemMesh.userData.update(elapsedSeconds);
  }
  renderer.render(scene, camera);
  requestAnimationFrame(gameLoop);
}
*/

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { TotemAssetFactory };
}
