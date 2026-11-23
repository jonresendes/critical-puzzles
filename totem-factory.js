/**
 * ============================================================================
 * TOTEM ASSET FACTORY - GAME INTEGRATION MODULE (Three.js r128+)
 * ============================================================================
 * 1. Import or include this file in your Three.js game project.
 * 2. Instantiate: const totemFactory = new TotemAssetFactory(THREE);
 * 3. Spawn stack: const playerTotem = totemFactory.createTotemStack(CONFIG);
 * 4. Add to scene: scene.add(playerTotem);
 * 5. Animate in your game loop: playerTotem.userData.update(clock.getElapsedTime());
 * ============================================================================
 */

/**
     * TotemAssetFactory
     * Self-contained procedural 3D generator for squat stackable accolade totems.
     * Compatible with Three.js r128+ (ES6 / Global THREE).
     *
     * Standardized Geometry Spec:
     *  - Core Diameter: 1.20 units (radius 0.60)
     *  - Core Height:   1.15 units per totem block
     *  - Interlocking:  Top tenon peg & bottom mortise socket + side dowel accents
     *  - Max Stack:     4 blocks resting on a carved pedestal base (height 0.36)
     */
    class TotemAssetFactory {
      constructor(THREE_LIB) {
        this.THREE = THREE_LIB || window.THREE;
        this.CORE_RADIUS = 0.60;
        this.CORE_HEIGHT = 1.15;
        this.PEG_HEIGHT = 0.14;
        this.BASE_HEIGHT = 0.36;
        this.MAX_STACK = 4;

        this.textures = {};
        this.materials = {};
        this._initProceduralTextures();
        this._initMaterials();
      }

      /**
       * Catalog of all 10 available totem archetypes
       */
      static get TOTEM_TYPES() {
        return [
          { id: 'beaver',     name: 'Beaver',         icon: '🦫', desc: 'Squat builder with cross-hatched tail behind' },
          { id: 'owl',        name: 'Great Owl',      icon: '🦉', desc: 'Outstretched layered wings & vigilant eyes' },
          { id: 'tree',       name: 'Ancient Tree',   icon: '🌳', desc: 'Gnarled bark core with leafy outer boughs' },
          { id: 'water',      name: 'Ball of Water',  icon: '🌊', desc: 'Swirling translucent wave orb with foam crests' },
          { id: 'flame',      name: 'Glowing Flame',  icon: '🔥', desc: 'Radiant flickering amber tongues & inner ember' },
          { id: 'key',        name: 'Master Key',     icon: '🗝️', desc: 'Ornate bow handle & warded bit extending outward' },
          { id: 'lighthouse', name: 'Lighthouse',     icon: '🚨', desc: 'Striped coastal tower with rotating beacon' },
          { id: 'sword',      name: 'Greatsword',     icon: '⚔️', desc: 'Winged crossguard, fuller blade & pommel' },
          { id: 'shield',     name: 'Aegis Shield',   icon: '🛡️', desc: 'Embossed heater shield with brass rivets' },
          { id: 'mountain',   name: 'Mountain Peak',  icon: '🏔️', desc: 'Faceted alpine crags with snow-capped ridges' }
        ];
      }

      /**
       * Catalog of Accolade Tiers / Surface Finishes
       */
      static get FINISH_TIERS() {
        return [
          { id: 'wood',     name: 'Carved Walnut',    swatch: '#7c4d2b', type: 'wood' },
          { id: 'stone',    name: 'Mossy Granite',    swatch: '#6b7280', type: 'stone' },
          { id: 'bronze',   name: 'Brushed Bronze',   swatch: '#b4693e', type: 'metal' },
          { id: 'silver',   name: 'Sterling Silver',  swatch: '#cbd5e1', type: 'metal' },
          { id: 'gold',     name: 'Radiant Gold',     swatch: '#f59e0b', type: 'metal' },
          { id: 'jade',     name: 'Imperial Jade',    swatch: '#10b981', type: 'crystal' },
          { id: 'resin',    name: 'Elemental Resin',  swatch: '#38bdf8', type: 'resin' },
          { id: 'obsidian', name: 'Volcanic Obsidian',swatch: '#312e81', type: 'obsidian' }
        ];
      }

      /**
       * Generates procedural CanvasTextures for grain, stone, brushed metal, water swirls, and cross-hatching
       */
      _initProceduralTextures() {
        const THREE = this.THREE;

        // 1. Wood Grain Texture
        this.textures.wood = this._makeCanvasTexture(256, 256, (ctx, w, h) => {
          ctx.fillStyle = '#7c4d2b';
          ctx.fillRect(0, 0, w, h);
          for (let y = 0; y < h; y += 2) {
            const wave = Math.sin(y * 0.08) * 14;
            ctx.fillStyle = y % 4 === 0 ? 'rgba(42, 22, 10, 0.28)' : 'rgba(156, 104, 62, 0.18)';
            ctx.fillRect(0, y, w, 1.5);
            // Wood knots & fibers
            ctx.strokeStyle = 'rgba(38, 19, 8, 0.22)';
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.bezierCurveTo(w * 0.33, y + wave * 0.3, w * 0.66, y - wave * 0.3, w, y);
            ctx.stroke();
          }
        });

        // 2. Carved Stone / Noise Texture
        this.textures.stone = this._makeCanvasTexture(256, 256, (ctx, w, h) => {
          ctx.fillStyle = '#737982';
          ctx.fillRect(0, 0, w, h);
          for (let i = 0; i < 3200; i++) {
            const x = Math.random() * w;
            const y = Math.random() * h;
            const r = 1 + Math.random() * 2.5;
            ctx.fillStyle = Math.random() > 0.5 ? 'rgba(255,255,255,0.09)' : 'rgba(15,20,25,0.16)';
            ctx.fillRect(x, y, r, r);
          }
          // Subtle moss flecks
          for (let i = 0; i < 140; i++) {
            ctx.fillStyle = 'rgba(72, 118, 68, 0.25)';
            ctx.beginPath();
            ctx.arc(Math.random() * w, Math.random() * h, 2 + Math.random() * 4, 0, Math.PI * 2);
            ctx.fill();
          }
        });

        // 3. Brushed Metal Texture
        this.textures.metal = this._makeCanvasTexture(256, 256, (ctx, w, h) => {
          ctx.fillStyle = '#d4d4d8';
          ctx.fillRect(0, 0, w, h);
          for (let y = 0; y < h; y++) {
            ctx.fillStyle = Math.random() > 0.5 ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)';
            ctx.fillRect(0, y, w, 1);
          }
        });

        // 4. Water Swirl & Foam Texture
        this.textures.water = this._makeCanvasTexture(256, 256, (ctx, w, h) => {
          const grad = ctx.createLinearGradient(0, 0, w, h);
          grad.addColorStop(0, '#0284c7');
          grad.addColorStop(0.5, '#0ea5e9');
          grad.addColorStop(1, '#0369a1');
          ctx.fillStyle = grad;
          ctx.fillRect(0, 0, w, h);

          ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
          ctx.lineWidth = 3;
          for (let i = 0; i < 18; i++) {
            ctx.beginPath();
            const startY = (i / 18) * h;
            ctx.moveTo(0, startY);
            ctx.bezierCurveTo(w * 0.35, startY - 24, w * 0.65, startY + 24, w, startY);
            ctx.stroke();
          }
        });

        // 5. Beaver Tail Cross-Hatch Texture
        this.textures.tail = this._makeCanvasTexture(128, 128, (ctx, w, h) => {
          ctx.fillStyle = '#4a3222';
          ctx.fillRect(0, 0, w, h);
          ctx.strokeStyle = '#291a10';
          ctx.lineWidth = 2;
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
       * Initializes PBR Standard/Physical materials for each accolade tier
       */
      _initMaterials() {
        const THREE = this.THREE;
        this.materials = {
          wood: new THREE.MeshStandardMaterial({
            map: this.textures.wood,
            bumpMap: this.textures.wood,
            bumpScale: 0.025,
            roughness: 0.68,
            metalness: 0.05
          }),
          woodLight: new THREE.MeshStandardMaterial({
            color: 0xc89d6c,
            map: this.textures.wood,
            roughness: 0.6,
            metalness: 0.05
          }),
          stone: new THREE.MeshStandardMaterial({
            map: this.textures.stone,
            bumpMap: this.textures.stone,
            bumpScale: 0.035,
            roughness: 0.85,
            metalness: 0.08
          }),
          bronze: new THREE.MeshStandardMaterial({
            color: 0xcd7f49,
            map: this.textures.metal,
            bumpMap: this.textures.metal,
            bumpScale: 0.012,
            roughness: 0.34,
            metalness: 0.82
          }),
          silver: new THREE.MeshStandardMaterial({
            color: 0xe2e8f0,
            map: this.textures.metal,
            bumpMap: this.textures.metal,
            bumpScale: 0.01,
            roughness: 0.24,
            metalness: 0.92
          }),
          gold: new THREE.MeshStandardMaterial({
            color: 0xffbf36,
            map: this.textures.metal,
            bumpMap: this.textures.metal,
            bumpScale: 0.012,
            roughness: 0.22,
            metalness: 0.94,
            emissive: 0x331d00,
            emissiveIntensity: 0.25
          }),
          jade: new THREE.MeshPhysicalMaterial({
            color: 0x10b981,
            roughness: 0.18,
            metalness: 0.05,
            transmission: 0.35,
            transparent: true,
            opacity: 0.92,
            emissive: 0x064e3b,
            emissiveIntensity: 0.3
          }),
          resin: new THREE.MeshPhysicalMaterial({
            color: 0x38bdf8,
            roughness: 0.12,
            metalness: 0.05,
            transparent: true,
            opacity: 0.84,
            emissive: 0x0284c7,
            emissiveIntensity: 0.45
          }),
          obsidian: new THREE.MeshStandardMaterial({
            color: 0x1e1b4b,
            roughness: 0.16,
            metalness: 0.45,
            emissive: 0x312e81,
            emissiveIntensity: 0.35
          })
        };
      }

      /**
       * Resolves primary and accent materials based on selected accolade tier
       */
      _getTierMaterials(finishId, naturalDefaults = {}) {
        const THREE = this.THREE;
        // If 'resin' is chosen on flame or water, preserve their iconic elemental hue
        if (finishId === 'resin' && naturalDefaults.resinOverride) {
          return naturalDefaults.resinOverride;
        }
        const primary = this.materials[finishId] || this.materials.wood;
        // Create a subtle contrasting accent material for secondary details
        const accent = primary.clone();
        if (finishId === 'wood') {
          accent.color = new THREE.Color(0x523018);
        } else if (finishId === 'stone') {
          accent.color = new THREE.Color(0x9ca3af);
        } else {
          accent.color.offsetHSL(0, -0.05, 0.12);
        }
        return { primary, accent };
      }

      /**
       * Builds the carved wooden pedestal base on which the stack rests
       */
      createPedestalBase() {
        const THREE = this.THREE;
        const group = new THREE.Group();
        group.name = 'TotemPedestalBase';

        // Main chamfered cylinder base
        const baseGeo = new THREE.CylinderGeometry(0.76, 0.84, this.BASE_HEIGHT, 16);
        const baseMesh = new THREE.Mesh(baseGeo, this.materials.wood);
        baseMesh.position.y = this.BASE_HEIGHT / 2;
        baseMesh.castShadow = true;
        baseMesh.receiveShadow = true;
        group.add(baseMesh);

        // Carved gouge facets around the rim
        const facetCount = 14;
        for (let i = 0; i < facetCount; i++) {
          const angle = (i / facetCount) * Math.PI * 2;
          const facetGeo = new THREE.BoxGeometry(0.18, this.BASE_HEIGHT * 0.72, 0.12);
          const facet = new THREE.Mesh(facetGeo, this.materials.woodLight);
          facet.position.set(
            Math.cos(angle) * 0.77,
            this.BASE_HEIGHT * 0.48,
            Math.sin(angle) * 0.77
          );
          facet.rotation.y = -angle + Math.PI / 2;
          facet.rotation.x = 0.14;
          facet.castShadow = true;
          facet.receiveShadow = true;
          group.add(facet);
        }

        // Top interlocking tenon peg
        const pegGeo = new THREE.CylinderGeometry(0.28, 0.30, this.PEG_HEIGHT, 20);
        const peg = new THREE.Mesh(pegGeo, this.materials.woodLight);
        peg.position.y = this.BASE_HEIGHT + this.PEG_HEIGHT / 2;
        group.add(peg);

        return group;
      }

      /**
       * Standardized Uniform Core + Interlocking Pegs & Side Dowels
       * Every totem shares this exact structural footprint so any order stacks seamlessly.
       */
      _createStandardCore(primaryMat, options = {}) {
        const THREE = this.THREE;
        const coreGroup = new THREE.Group();
        const r = options.radius || this.CORE_RADIUS;
        const h = this.CORE_HEIGHT;

        // Main uniform cylinder/drum core
        const geo = options.squareCore
          ? new THREE.BoxGeometry(r * 1.85, h, r * 1.85)
          : new THREE.CylinderGeometry(r, r, h, 28);
        const mesh = new THREE.Mesh(geo, primaryMat);
        mesh.position.y = h / 2;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        coreGroup.add(mesh);

        // Subtle top and bottom bevel rings for clean seam lines
        const ringGeo = new THREE.TorusGeometry(r * 0.99, 0.022, 10, 32);
        ringGeo.rotateX(Math.PI / 2);

        const bottomRing = new THREE.Mesh(ringGeo, this.materials.woodLight);
        bottomRing.position.y = 0.02;
        coreGroup.add(bottomRing);

        const topRing = new THREE.Mesh(ringGeo, this.materials.woodLight);
        topRing.position.y = h - 0.02;
        coreGroup.add(topRing);

        // Top interlocking peg (fits into bottom of the totem stacked above it)
        const pegGeo = new THREE.CylinderGeometry(0.26, 0.28, this.PEG_HEIGHT, 20);
        const peg = new THREE.Mesh(pegGeo, this.materials.woodLight);
        peg.position.y = h + this.PEG_HEIGHT / 2;
        coreGroup.add(peg);

        // Side wooden joinery dowels (matching handcrafted aesthetic)
        if (options.sideDowels !== false) {
          const dowelGeo = new THREE.CylinderGeometry(0.065, 0.065, r * 2.38, 12);
          dowelGeo.rotateZ(Math.PI / 2);
          const dowel = new THREE.Mesh(dowelGeo, this.materials.woodLight);
          dowel.position.y = h * 0.5;
          dowel.castShadow = true;
          coreGroup.add(dowel);
        }

        return coreGroup;
      }

      /**
       * Builds a single squat totem piece of uniform height (1.15) & core width (1.20)
       * @param {string} type - One of TotemAssetFactory.TOTEM_TYPES ids
       * @param {string} finish - One of TotemAssetFactory.FINISH_TIERS ids
       */
      createTotemPiece(type = 'beaver', finish = 'wood') {
        const THREE = this.THREE;
        const totem = new THREE.Group();
        totem.name = `Totem_${type}_${finish}`;
        totem.userData = { type, finish, animators: [] };

        const h = this.CORE_HEIGHT;
        const r = this.CORE_RADIUS;

        switch (type) {
          // ------------------------------------------------------------------
          // 1. BEAVER: Squat body, buck teeth, flat cross-hatched tail behind
          // ------------------------------------------------------------------
          case 'beaver': {
            const { primary, accent } = this._getTierMaterials(finish);
            totem.add(this._createStandardCore(primary, { radius: r * 0.96 }));

            // Squat plump belly/body wrap
            const bodyGeo = new THREE.SphereGeometry(0.64, 24, 20);
            bodyGeo.scale(1.02, 0.84, 1.08);
            const body = new THREE.Mesh(bodyGeo, primary);
            body.position.set(0, h * 0.44, 0.08);
            body.castShadow = true;
            totem.add(body);

            // Round head at top-front
            const headGeo = new THREE.SphereGeometry(0.38, 20, 18);
            headGeo.scale(1.05, 0.88, 1.05);
            const head = new THREE.Mesh(headGeo, primary);
            head.position.set(0, h * 0.78, 0.34);
            head.castShadow = true;
            totem.add(head);

            // Snout & Nose
            const snout = new THREE.Mesh(new THREE.SphereGeometry(0.18, 14, 14), accent);
            snout.position.set(0, h * 0.74, 0.66);
            totem.add(snout);

            const noseMat = new THREE.MeshStandardMaterial({ color: 0x1f1612, roughness: 0.3 });
            const nose = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 12), noseMat);
            nose.position.set(0, h * 0.79, 0.80);
            totem.add(nose);

            // Signature Buck Teeth (Ivory)
            const toothMat = new THREE.MeshStandardMaterial({ color: 0xfef9c3, roughness: 0.25 });
            [-0.042, 0.042].forEach(xOff => {
              const tooth = new THREE.Mesh(new THREE.BoxGeometry(0.068, 0.13, 0.04), toothMat);
              tooth.position.set(xOff, h * 0.63, 0.74);
              tooth.rotation.x = 0.12;
              totem.add(tooth);
            });

            // Eyes & Ears
            const eyeMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.15 });
            [-0.19, 0.19].forEach(xOff => {
              const eye = new THREE.Mesh(new THREE.SphereGeometry(0.055, 12, 12), eyeMat);
              eye.position.set(xOff, h * 0.84, 0.60);
              totem.add(eye);

              const ear = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 12), accent);
              ear.scale.set(0.6, 1, 0.8);
              ear.position.set(xOff * 1.45, h * 0.92, 0.28);
              totem.add(ear);
            });

            // Paws tucked in front
            [-0.22, 0.22].forEach(xOff => {
              const paw = new THREE.Mesh(new THREE.SphereGeometry(0.13, 14, 12), accent);
              paw.scale.set(0.9, 0.65, 1.3);
              paw.position.set(xOff, h * 0.14, 0.56);
              totem.add(paw);
            });

            // Flat Cross-Hatched Paddle Tail extending behind (-Z)
            const tailMat = finish === 'wood'
              ? new THREE.MeshStandardMaterial({ map: this.textures.tail, bumpMap: this.textures.tail, bumpScale: 0.04, roughness: 0.75 })
              : accent;
            const tailGeo = new THREE.SphereGeometry(0.42, 20, 16);
            tailGeo.scale(0.85, 0.20, 1.65);
            const tail = new THREE.Mesh(tailGeo, tailMat);
            tail.position.set(0, h * 0.34, -0.82);
            tail.rotation.x = 0.58; // Angled upward behind the beaver
            tail.castShadow = true;
            totem.add(tail);
            break;
          }

          // ------------------------------------------------------------------
          // 2. OWL: Squat feathered core, large eyes, outstretched wings L & R
          // ------------------------------------------------------------------
          case 'owl': {
            const { primary, accent } = this._getTierMaterials(finish);
            totem.add(this._createStandardCore(primary));

            // Ear tufts / horns
            [-0.28, 0.28].forEach(xOff => {
              const tuft = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.28, 6), accent);
              tuft.position.set(xOff, h * 0.94, 0.26);
              tuft.rotation.z = xOff > 0 ? -0.35 : 0.35;
              tuft.rotation.x = 0.25;
              totem.add(tuft);
            });

            // Big Owl Eyes + Beak
            const eyeRingMat = new THREE.MeshStandardMaterial({ color: 0xfef08a, roughness: 0.3, emissive: 0x713f12, emissiveIntensity: 0.2 });
            const pupilMat = new THREE.MeshStandardMaterial({ color: 0x090d16, roughness: 0.1 });
            [-0.21, 0.21].forEach(xOff => {
              const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.08, 18), eyeRingMat);
              disc.rotation.x = Math.PI / 2;
              disc.position.set(xOff, h * 0.70, 0.56);
              totem.add(disc);

              const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.085, 12, 12), pupilMat);
              pupil.position.set(xOff, h * 0.70, 0.60);
              totem.add(pupil);
            });

            // Hooked Beak
            const beakMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.35 });
            const beak = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.24, 4), beakMat);
            beak.rotation.x = Math.PI * 0.78;
            beak.position.set(0, h * 0.56, 0.64);
            totem.add(beak);

            // Outstretched Layered Wings (Left & Right)
            [-1, 1].forEach(dir => {
              const wingGroup = new THREE.Group();
              wingGroup.position.set(dir * 0.56, h * 0.58, 0);

              // Upper wing sweep
              const upperWing = new THREE.Mesh(new THREE.BoxGeometry(0.88, 0.34, 0.16), primary);
              upperWing.position.set(dir * 0.42, 0.08, -0.04);
              upperWing.rotation.z = dir * 0.18;
              upperWing.rotation.y = -dir * 0.15;
              upperWing.castShadow = true;
              wingGroup.add(upperWing);

              // Layered primary flight feathers
              for (let f = 0; f < 4; f++) {
                const feather = new THREE.Mesh(new THREE.BoxGeometry(0.55 - f * 0.07, 0.12, 0.12), accent);
                feather.position.set(dir * (0.48 - f * 0.08), -0.10 - f * 0.09, -0.05);
                feather.rotation.z = dir * (0.25 + f * 0.08);
                feather.castShadow = true;
                wingGroup.add(feather);
              }
              totem.add(wingGroup);
            });
            break;
          }

          // ------------------------------------------------------------------
          // 3. TREE: Gnarled bark trunk core & leafy branches around it
          // ------------------------------------------------------------------
          case 'tree': {
            const { primary, accent } = this._getTierMaterials(finish);
            totem.add(this._createStandardCore(primary, { radius: r * 0.92 }));

            // Vertical bark ridges & roots
            for (let i = 0; i < 8; i++) {
              const ang = (i / 8) * Math.PI * 2;
              const ridge = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.11, h * 0.94, 8), accent);
              ridge.position.set(Math.cos(ang) * 0.54, h * 0.48, Math.sin(ang) * 0.54);
              ridge.castShadow = true;
              totem.add(ridge);
            }

            // Leaf material adapts to finish tier (lush green on wood/stone, metallic/crystal on others)
            const leafMat = (finish === 'wood' || finish === 'stone')
              ? new THREE.MeshStandardMaterial({ color: 0x3f7d32, roughness: 0.65 })
              : accent;

            // Extending Boughs & Leaf Clusters around the totem
            const branchAngles = [0.25, Math.PI - 0.25, Math.PI * 0.55, -Math.PI * 0.45, Math.PI * 1.25];
            branchAngles.forEach((ang, idx) => {
              const bGroup = new THREE.Group();
              const yPos = h * (0.56 + (idx % 3) * 0.12);
              bGroup.position.set(Math.cos(ang) * 0.48, yPos, Math.sin(ang) * 0.48);
              bGroup.rotation.y = -ang;

              // Woody limb extending outward
              const limb = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.09, 0.68, 8), primary);
              limb.rotation.z = -Math.PI * 0.34;
              limb.position.set(0.28, 0.14, 0);
              limb.castShadow = true;
              bGroup.add(limb);

              // Lush leaf cluster puffs
              const clusterOffsets = [
                [0.54, 0.28, 0, 0.22],
                [0.42, 0.36, 0.12, 0.16],
                [0.44, 0.24, -0.12, 0.16]
              ];
              clusterOffsets.forEach(([lx, ly, lz, rad]) => {
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
          // 4. BALL OF WATER: Translucent swirling blue orb/drum & foam crests
          // ------------------------------------------------------------------
          case 'water': {
            const waterMat = (finish === 'resin' || finish === 'wood')
              ? new THREE.MeshPhysicalMaterial({
                  color: 0x0ea5e9,
                  map: this.textures.water,
                  roughness: 0.1,
                  metalness: 0.05,
                  transparent: true,
                  opacity: 0.86,
                  emissive: 0x0369a1,
                  emissiveIntensity: 0.45
                })
              : this.materials[finish];

            totem.add(this._createStandardCore(waterMat, { radius: r * 0.95 }));

            // Bulging spherical water belly
            const orb = new THREE.Mesh(new THREE.SphereGeometry(0.66, 28, 24), waterMat);
            orb.scale.set(1.05, 0.86, 1.05);
            orb.position.y = h * 0.5;
            totem.add(orb);

            // Swirling white water foam crests orbiting the orb
            const foamMat = new THREE.MeshStandardMaterial({
              color: 0xf0f9ff,
              roughness: 0.35,
              emissive: 0xbae6fd,
              emissiveIntensity: 0.3
            });

            const swirlGroup = new THREE.Group();
            swirlGroup.position.y = h * 0.5;
            for (let i = 0; i < 3; i++) {
              const waveArc = new THREE.Mesh(
                new THREE.TorusGeometry(0.64, 0.045, 10, 28, Math.PI * 1.15),
                foamMat
              );
              waveArc.rotation.x = Math.PI * 0.42;
              waveArc.rotation.y = (i * Math.PI * 2) / 3;
              waveArc.position.y = (i - 1) * 0.14;
              swirlGroup.add(waveArc);
            }
            totem.add(swirlGroup);

            // Register idle swirl animation
            totem.userData.animators.push((t) => {
              swirlGroup.rotation.y = t * 1.25;
            });
            break;
          }

          // ------------------------------------------------------------------
          // 5. GLOWING FLAME: Warm amber/gold flickering tongues & ember core
          // ------------------------------------------------------------------
          case 'flame': {
            const isElemental = (finish === 'resin' || finish === 'wood' || finish === 'gold');
            const flameOuterMat = isElemental
              ? new THREE.MeshPhysicalMaterial({
                  color: 0xfbbf24,
                  roughness: 0.15,
                  transparent: true,
                  opacity: 0.84,
                  emissive: 0xf59e0b,
                  emissiveIntensity: 0.65
                })
              : this.materials[finish];

            const flameCoreMat = new THREE.MeshStandardMaterial({
              color: isElemental ? 0xfef08a : 0xffffff,
              emissive: isElemental ? 0xff7b00 : 0x38bdf8,
              emissiveIntensity: 0.9,
              roughness: 0.2
            });

            totem.add(this._createStandardCore(flameOuterMat, { radius: r * 0.92 }));

            // Inner glowing ember core
            const ember = new THREE.Mesh(new THREE.OctahedronGeometry(0.42, 1), flameCoreMat);
            ember.position.y = h * 0.5;
            totem.add(ember);

            // Sculpted flickering flame tongues wrapping around the core
            const tongues = [];
            const tongueCount = 7;
            for (let i = 0; i < tongueCount; i++) {
              const ang = (i / tongueCount) * Math.PI * 2;
              const tHeight = 0.62 + (i % 3) * 0.16;
              const cone = new THREE.Mesh(new THREE.ConeGeometry(0.22, tHeight, 10), flameOuterMat);
              cone.position.set(
                Math.cos(ang) * 0.44,
                h * 0.52 + (i % 2) * 0.12,
                Math.sin(ang) * 0.44
              );
              cone.rotation.z = -Math.cos(ang) * 0.24;
              cone.rotation.x = Math.sin(ang) * 0.24;
              totem.add(cone);
              tongues.push({ mesh: cone, phase: i * 1.1, baseY: cone.position.y });
            }

            // Idle flickering animation
            totem.userData.animators.push((t) => {
              ember.rotation.y = t * 1.8;
              ember.scale.setScalar(0.95 + Math.sin(t * 6) * 0.07);
              tongues.forEach(item => {
                item.mesh.scale.y = 0.92 + Math.sin(t * 7 + item.phase) * 0.14;
                item.mesh.position.y = item.baseY + Math.cos(t * 5 + item.phase) * 0.03;
              });
            });
            break;
          }

          // ------------------------------------------------------------------
          // 6. KEY: Ornate circular bow handle on one side, warded bit on other
          // ------------------------------------------------------------------
          case 'key': {
            const keyFinish = finish === 'wood' ? 'gold' : finish;
            const { primary, accent } = this._getTierMaterials(keyFinish);
            totem.add(this._createStandardCore(this.materials[finish] || primary, { radius: r * 0.92 }));

            const keyGroup = new THREE.Group();
            keyGroup.position.set(0, h * 0.5, 0.12);

            // Ornate Key Bow (Ring Handle extending Left -X)
            const bow = new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.085, 14, 28), primary);
            bow.position.set(-0.76, 0, 0);
            bow.castShadow = true;
            keyGroup.add(bow);

            // Decorative trefoil inner ring
            const innerBow = new THREE.Mesh(new THREE.TorusGeometry(0.20, 0.04, 10, 20), accent);
            innerBow.position.set(-0.76, 0, 0);
            keyGroup.add(innerBow);

            // Horizontal Key Shaft passing through core & extending Right (+X)
            const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 1.85, 16), primary);
            shaft.rotation.z = Math.PI / 2;
            shaft.position.set(0.14, 0, 0);
            shaft.castShadow = true;
            keyGroup.add(shaft);

            // Collar rings
            [-0.36, 0.52].forEach(xPos => {
              const collar = new THREE.Mesh(new THREE.TorusGeometry(0.115, 0.035, 10, 18), accent);
              collar.rotation.y = Math.PI / 2;
              collar.position.set(xPos, 0, 0);
              keyGroup.add(collar);
            });

            // Warded Key Teeth extending downward on right (+X)
            const bitBlock = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.28, 0.08), accent);
            bitBlock.position.set(0.82, -0.16, 0);
            bitBlock.castShadow = true;
            keyGroup.add(bitBlock);

            totem.add(keyGroup);
            break;
          }

          // ------------------------------------------------------------------
          // 7. LIGHTHOUSE: Striped coastal tower, gallery deck & rotating beam
          // ------------------------------------------------------------------
          case 'lighthouse': {
            const { primary, accent } = this._getTierMaterials(finish);
            totem.add(this._createStandardCore(primary, { radius: r * 0.95 }));

            // Red/White or Accent horizontal masonry bands
            const stripeMat = (finish === 'wood' || finish === 'stone')
              ? new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.55 })
              : accent;
            [0.28, 0.66].forEach(yFrac => {
              const band = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.98, r * 0.98, 0.20, 28), stripeMat);
              band.position.y = h * yFrac;
              totem.add(band);
            });

            // Catwalk Gallery Deck near top
            const deck = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.66, 0.09, 24), accent);
            deck.position.y = h * 0.84;
            deck.castShadow = true;
            totem.add(deck);

            // Glowing Lantern Room Housing
            const beaconMat = new THREE.MeshStandardMaterial({
              color: 0xfef08a,
              emissive: 0xfacc15,
              emissiveIntensity: 0.95,
              roughness: 0.15
            });
            const lantern = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.26, 16), beaconMat);
            lantern.position.y = h * 0.96;
            totem.add(lantern);

            // Rotating Volumetric Light Beam Cones
            const beamGroup = new THREE.Group();
            beamGroup.position.y = h * 0.96;
            const beamMat = new THREE.MeshBasicMaterial({
              color: 0xfef08a,
              transparent: true,
              opacity: 0.28,
              side: THREE.DoubleSide,
              depthWrite: false
            });
            [-1, 1].forEach(dir => {
              const beam = new THREE.Mesh(new THREE.ConeGeometry(0.28, 1.35, 16, 1, true), beamMat);
              beam.rotation.z = dir * (Math.PI / 2);
              beam.position.x = dir * 0.82;
              beamGroup.add(beam);
            });
            totem.add(beamGroup);

            totem.userData.animators.push((t) => {
              beamGroup.rotation.y = t * 1.8;
            });
            break;
          }

          // ------------------------------------------------------------------
          // 8. SWORD: Broad blade core, winged crossguard & gemstone pommel
          // ------------------------------------------------------------------
          case 'sword': {
            const swordFinish = finish === 'wood' ? 'silver' : finish;
            const { primary, accent } = this._getTierMaterials(swordFinish);
            totem.add(this._createStandardCore(this.materials[finish] || primary, { radius: r * 0.88 }));

            // Broad Double-Edged Vertical Blade running down the front (+Z)
            const blade = new THREE.Mesh(new THREE.BoxGeometry(0.36, h * 0.96, 0.14), primary);
            blade.position.set(0, h * 0.5, 0.56);
            blade.castShadow = true;
            totem.add(blade);

            // Center Fuller Groove
            const fuller = new THREE.Mesh(new THREE.BoxGeometry(0.08, h * 0.82, 0.16), accent);
            fuller.position.set(0, h * 0.5, 0.56);
            totem.add(fuller);

            // Wide Winged Crossguard extending left & right
            const guard = new THREE.Mesh(new THREE.BoxGeometry(1.78, 0.16, 0.24), accent);
            guard.position.set(0, h * 0.72, 0.56);
            guard.castShadow = true;
            totem.add(guard);

            // Guard Quillon Tips
            [-0.90, 0.90].forEach(xOff => {
              const tip = new THREE.Mesh(new THREE.OctahedronGeometry(0.13, 0), primary);
              tip.position.set(xOff, h * 0.74, 0.56);
              totem.add(tip);
            });

            // Grip & Pommel at top
            const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.26, 12), this.materials.wood);
            grip.position.set(0, h * 0.88, 0.56);
            totem.add(grip);

            const pommel = new THREE.Mesh(new THREE.SphereGeometry(0.13, 14, 14), accent);
            pommel.position.set(0, h * 1.01, 0.56);
            totem.add(pommel);
            break;
          }

          // ------------------------------------------------------------------
          // 9. SHIELD: Embossed heraldic heater shield with boss & rivets
          // ------------------------------------------------------------------
          case 'shield': {
            const { primary, accent } = this._getTierMaterials(finish);
            totem.add(this._createStandardCore(primary, { radius: r * 0.94 }));

            // Heraldic Heater Shield Shape extruded in front (+Z)
            const shape = new THREE.Shape();
            shape.moveTo(-0.56, 0.44);
            shape.lineTo(0.56, 0.44);
            shape.lineTo(0.52, -0.05);
            shape.quadraticCurveTo(0.42, -0.38, 0, -0.52);
            shape.quadraticCurveTo(-0.42, -0.38, -0.52, -0.05);
            shape.closePath();

            const shieldGeo = new THREE.ExtrudeGeometry(shape, {
              depth: 0.12,
              bevelEnabled: true,
              bevelSegments: 2,
              steps: 1,
              bevelSize: 0.03,
              bevelThickness: 0.03
            });
            const shieldMesh = new THREE.Mesh(shieldGeo, accent);
            shieldMesh.position.set(0, h * 0.50, 0.54);
            shieldMesh.castShadow = true;
            totem.add(shieldMesh);

            // Center Shield Boss (Dome)
            const boss = new THREE.Mesh(new THREE.SphereGeometry(0.18, 16, 14), primary);
            boss.scale.set(1, 1, 0.55);
            boss.position.set(0, h * 0.52, 0.68);
            totem.add(boss);

            // Corner Rivets
            [[-0.42, 0.32], [0.42, 0.32], [-0.36, -0.06], [0.36, -0.06], [0, -0.36]].forEach(([rx, ry]) => {
              const rivet = new THREE.Mesh(new THREE.SphereGeometry(0.038, 8, 8), primary);
              rivet.position.set(rx, h * 0.50 + ry, 0.68);
              totem.add(rivet);
            });
            break;
          }

          // ------------------------------------------------------------------
          // 10. MOUNTAIN PEAK: Faceted alpine crags & snow-capped ridges
          // ------------------------------------------------------------------
          case 'mountain': {
            const mtnFinish = finish === 'wood' ? 'stone' : finish;
            const { primary, accent } = this._getTierMaterials(mtnFinish);
            totem.add(this._createStandardCore(primary, { radius: r * 0.96 }));

            const snowMat = (finish === 'wood' || finish === 'stone')
              ? new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.45 })
              : accent;

            // Jagged Alpine Crags arranged around the core
            const peaks = [
              { ang: 0.15,  rad: 0.36, height: 0.88, dist: 0.44 },
              { ang: 1.45,  rad: 0.32, height: 0.78, dist: 0.46 },
              { ang: 2.85,  rad: 0.38, height: 0.84, dist: 0.42 },
              { ang: 4.35,  rad: 0.34, height: 0.80, dist: 0.45 }
            ];

            peaks.forEach(p => {
              const cragGroup = new THREE.Group();
              cragGroup.position.set(Math.cos(p.ang) * p.dist, h * 0.46, Math.sin(p.ang) * p.dist);
              cragGroup.rotation.y = -p.ang;
              cragGroup.rotation.z = -0.18;

              const rockCone = new THREE.Mesh(new THREE.ConeGeometry(p.rad, p.height, 6), primary);
              rockCone.castShadow = true;
              cragGroup.add(rockCone);

              // Snow cap tip
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
       * Assembles a complete stack of totems (up to 4) on top of the carved pedestal base.
       * @param {Array<{type: string, finish: string}>} stackConfig - Ordered bottom-to-top
       * @returns {THREE.Group} Complete 3D Group ready to add to any Three.js scene
       */
      createTotemStack(stackConfig = []) {
        const THREE = this.THREE;
        const root = new THREE.Group();
        root.name = 'TotemStackAssembly';

        const clamped = stackConfig.slice(0, this.MAX_STACK);
        const animators = [];

        // 1. Add carved wooden pedestal base
        const base = this.createPedestalBase();
        root.add(base);

        // 2. Stack each totem block vertically using uniform CORE_HEIGHT increments
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

        // Expose single update(elapsedTime) method for game loop integration
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
const totemFactory = new TotemAssetFactory(THREE);

const myAccoladeStackConfig = [
  {
    "type": "lighthouse",
    "finish": "stone"
  },
  {
    "type": "flame",
    "finish": "obsidian"
  },
  {
    "type": "lighthouse",
    "finish": "wood"
  },
  {
    "type": "key",
    "finish": "wood"
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
