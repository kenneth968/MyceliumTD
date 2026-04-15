import { GameRunner, GameState, PlacementState, PlacedTower, GameSpeed, GameEvent } from './systems/gameRunner';
import { RoundState } from './systems/roundManager';
import { GameRenderer, GameFrameRenderData, createGameRenderer, PathRenderData, PathSegmentRenderData } from './systems/gameRenderer';
import { GameLoop, createGameLoop } from './systems/gameLoop';
import { processHotkey, findHotkeyAction, HotkeyAction } from './systems/hotkeys';
import { TowerType, TOWER_STATS } from './entities/tower';
import { TargetingMode } from './systems/targeting';
import { Vec2 } from './utils/vec2';
import { TowerGrowthStage, getTowerBodyShape } from './systems/towerRender';
import { PlacementPreviewWithTargetingRenderData, TowerSelectionPreviewRenderData } from './systems/placementPreview';
import { HealthBarRenderData } from './systems/healthBarRender';
import { WaveUIAnnouncementRenderData } from './systems/waveAnnouncementRender';
import { PauseMenuRenderData } from './systems/pauseMenuRender';
import { WaveProgressRenderData } from './systems/waveProgressRender';
import { GameOverVictoryRenderData } from './systems/gameOverVictoryRender';
import { TowerInfoPanelRenderData } from './systems/towerInfoPanel';
import { LivesMoneyDisplayRenderData } from './systems/livesMoneyDisplayRender';
import { EnemyCountDisplayRenderData } from './systems/enemyCountDisplayRender';
import { TowerPurchaseRenderData } from './systems/towerPurchaseRender';
import { MapSelectionRenderData } from './systems/mapSelectionRender';
import { getMapSelectionButtonAtPosition } from './systems/mapSelectionRender';
import { AudioManager, createAudioManager, isBossWave } from './systems/audioManager';

const CANVAS_WIDTH = 1280;
const CANVAS_HEIGHT = 720;

// --- Particle System ---

interface Particle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    life: number;
    maxLife: number;
    size: number;
    sizeEnd: number;
    color: string;
    alpha: number;
    alphaEnd: number;
    shape: 'circle' | 'ring' | 'spark' | 'splat' | 'cloud';
    rotation: number;
    rotationSpeed: number;
    gravity: number;
}

// Enemy type -> color for death splats
const ENEMY_COLORS: Record<string, string> = {
    red_mushroom: '#E74C3C',
    blue_beetle: '#3498DB',
    green_caterpillar: '#27AE60',
    yellow_wasp: '#F1C40F',
    pink_ladybug: '#E91E90',
    black_widow: '#2C3E50',
    white_moth: '#ECF0F1',
    armored_beetle: '#7F8C8D',
    rainbow_stag: '#9B59B6',
    shelled_snail: '#E67E22',
};

class ParticleSystem {
    private particles: Particle[] = [];
    private pendingInstakillBursts: Array<{ x: number; y: number; delay: number }> = [];
    private maxParticles = 500;

    private spawn(p: Partial<Particle> & { x: number; y: number }): void {
        if (this.particles.length >= this.maxParticles) return;
        this.particles.push({
            vx: 0, vy: 0, life: 1, maxLife: 1, size: 4, sizeEnd: 0,
            color: '#fff', alpha: 1, alphaEnd: 0, shape: 'circle',
            rotation: 0, rotationSpeed: 0, gravity: 0,
            ...p,
        });
    }

    /** Bug squash splat - radial splatter particles */
    spawnDeathEffect(x: number, y: number, enemyType: string): void {
        const color = ENEMY_COLORS[enemyType] || '#E74C3C';
        const count = 8 + Math.floor(Math.random() * 5);
        for (let i = 0; i < count; i++) {
            const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
            const speed = 40 + Math.random() * 80;
            this.spawn({
                x, y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 0.4 + Math.random() * 0.3,
                maxLife: 0.4 + Math.random() * 0.3,
                size: 3 + Math.random() * 4,
                sizeEnd: 1,
                color,
                alpha: 0.9,
                alphaEnd: 0,
                shape: 'splat',
                gravity: 60,
            });
        }
        // Central flash
        this.spawn({
            x, y,
            size: 12, sizeEnd: 20,
            life: 0.15, maxLife: 0.15,
            color: '#fff', alpha: 0.8, alphaEnd: 0,
            shape: 'circle',
        });
    }

    /** Puffball area explosion - expanding ring + scattered spores */
    spawnAreaExplosion(x: number, y: number, radius: number): void {
        // Expanding ring
        this.spawn({
            x, y,
            size: 5, sizeEnd: radius,
            life: 0.35, maxLife: 0.35,
            color: '#9B59B6', alpha: 0.5, alphaEnd: 0,
            shape: 'ring',
        });
        // Spore cloud particles
        const count = 10 + Math.floor(Math.random() * 6);
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const dist = Math.random() * radius * 0.8;
            const speed = 10 + Math.random() * 30;
            this.spawn({
                x: x + Math.cos(angle) * dist * 0.3,
                y: y + Math.sin(angle) * dist * 0.3,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 15,
                life: 0.5 + Math.random() * 0.4,
                maxLife: 0.5 + Math.random() * 0.4,
                size: 2 + Math.random() * 3,
                sizeEnd: 5 + Math.random() * 3,
                color: '#D7BDE2',
                alpha: 0.6,
                alphaEnd: 0,
                shape: 'cloud',
                gravity: -10,
            });
        }
    }

    /** Orchid slow hit - ice crystal shards */
    spawnSlowHit(x: number, y: number): void {
        const count = 6;
        for (let i = 0; i < count; i++) {
            const angle = (Math.PI * 2 * i) / count + Math.random() * 0.3;
            const speed = 30 + Math.random() * 40;
            this.spawn({
                x, y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 0.3 + Math.random() * 0.2,
                maxLife: 0.3 + Math.random() * 0.2,
                size: 3 + Math.random() * 2,
                sizeEnd: 0,
                color: '#85C1E9',
                alpha: 0.9,
                alphaEnd: 0.2,
                shape: 'spark',
                rotation: Math.random() * Math.PI * 2,
                rotationSpeed: (Math.random() - 0.5) * 10,
            });
        }
        // Blue flash
        this.spawn({
            x, y,
            size: 8, sizeEnd: 15,
            life: 0.2, maxLife: 0.2,
            color: '#3498DB', alpha: 0.5, alphaEnd: 0,
            shape: 'circle',
        });
    }

    /** Stinkhorn poison hit - lingering toxic wisps */
    spawnPoisonHit(x: number, y: number): void {
        const count = 5;
        for (let i = 0; i < count; i++) {
            this.spawn({
                x: x + (Math.random() - 0.5) * 15,
                y: y + (Math.random() - 0.5) * 15,
                vx: (Math.random() - 0.5) * 20,
                vy: -15 - Math.random() * 25,
                life: 0.6 + Math.random() * 0.5,
                maxLife: 0.6 + Math.random() * 0.5,
                size: 4 + Math.random() * 3,
                sizeEnd: 8 + Math.random() * 4,
                color: '#27AE60',
                alpha: 0.6,
                alphaEnd: 0,
                shape: 'cloud',
                gravity: -20,
            });
        }
    }

    /** Venus Flytower instakill - red snap/chomp flash */
    spawnInstakillHit(x: number, y: number): void {
        // Bright chomp flash
        this.spawn({
            x, y,
            size: 15, sizeEnd: 25,
            life: 0.12, maxLife: 0.12,
            color: '#E74C3C', alpha: 0.8, alphaEnd: 0,
            shape: 'circle',
        });
        // Red teeth-like sparks converging inward then outward
        for (let i = 0; i < 8; i++) {
            const angle = (Math.PI * 2 * i) / 8;
            this.spawn({
                x: x + Math.cos(angle) * 18,
                y: y + Math.sin(angle) * 18,
                vx: -Math.cos(angle) * 60,
                vy: -Math.sin(angle) * 60,
                life: 0.15, maxLife: 0.15,
                size: 4, sizeEnd: 1,
                color: '#FF6B6B', alpha: 1, alphaEnd: 0.3,
                shape: 'spark',
                rotation: angle,
            });
        }
        this.pendingInstakillBursts.push({ x, y, delay: 0.1 });
    }

    private emitInstakillBurst(x: number, y: number): void {
        for (let i = 0; i < 6; i++) {
            const angle = (Math.PI * 2 * i) / 6 + 0.3;
            this.spawn({
                x, y,
                vx: Math.cos(angle) * 80,
                vy: Math.sin(angle) * 80,
                life: 0.2, maxLife: 0.2,
                size: 3, sizeEnd: 0,
                color: '#FFD700', alpha: 0.9, alphaEnd: 0,
                shape: 'spark',
            });
        }
    }

    /** Bioluminescent reveal - cyan expanding pulse */
    spawnRevealHit(x: number, y: number): void {
        this.spawn({
            x, y,
            size: 5, sizeEnd: 50,
            life: 0.4, maxLife: 0.4,
            color: '#1ABC9C', alpha: 0.4, alphaEnd: 0,
            shape: 'ring',
        });
        for (let i = 0; i < 5; i++) {
            const angle = Math.random() * Math.PI * 2;
            this.spawn({
                x, y,
                vx: Math.cos(angle) * 20,
                vy: Math.sin(angle) * 20,
                life: 0.5 + Math.random() * 0.3,
                maxLife: 0.5 + Math.random() * 0.3,
                size: 2, sizeEnd: 4,
                color: '#76D7C4',
                alpha: 0.7, alphaEnd: 0,
                shape: 'circle',
                gravity: -5,
            });
        }
    }

    /** Generic damage hit - small white sparks */
    spawnDamageHit(x: number, y: number): void {
        for (let i = 0; i < 3; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 20 + Math.random() * 30;
            this.spawn({
                x, y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 0.15 + Math.random() * 0.1,
                maxLife: 0.15 + Math.random() * 0.1,
                size: 2, sizeEnd: 0,
                color: '#fff', alpha: 0.8, alphaEnd: 0,
                shape: 'spark',
            });
        }
    }

    /** Process game events into particles */
    processEvents(events: GameEvent[]): void {
        for (const event of events) {
            if (event.type === 'death') {
                this.spawnDeathEffect(event.position.x, event.position.y, event.enemyType || '');
            } else if (event.type === 'area_hit') {
                this.spawnAreaExplosion(event.position.x, event.position.y, event.radius || 40);
            } else if (event.type === 'hit') {
                switch (event.effectType) {
                    case 'slow':
                        this.spawnSlowHit(event.position.x, event.position.y);
                        break;
                    case 'poison':
                        this.spawnPoisonHit(event.position.x, event.position.y);
                        break;
                    case 'instakill':
                        this.spawnInstakillHit(event.position.x, event.position.y);
                        break;
                    case 'reveal_camo':
                        this.spawnRevealHit(event.position.x, event.position.y);
                        break;
                    case 'area_damage':
                        // Handled by the separate area_hit event
                        this.spawnDamageHit(event.position.x, event.position.y);
                        break;
                    default:
                        this.spawnDamageHit(event.position.x, event.position.y);
                        break;
                }
            }
        }
    }

    update(deltaTime: number): void {
        for (let i = this.pendingInstakillBursts.length - 1; i >= 0; i--) {
            const burst = this.pendingInstakillBursts[i];
            burst.delay -= deltaTime;
            if (burst.delay <= 0) {
                this.emitInstakillBurst(burst.x, burst.y);
                this.pendingInstakillBursts.splice(i, 1);
            }
        }

        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.life -= deltaTime;
            if (p.life <= 0) {
                this.particles.splice(i, 1);
                continue;
            }
            p.x += p.vx * deltaTime;
            p.y += p.vy * deltaTime;
            p.vy += p.gravity * deltaTime;
            p.rotation += p.rotationSpeed * deltaTime;
            // Friction
            p.vx *= 0.98;
            p.vy *= 0.98;
        }
    }

    render(ctx: CanvasRenderingContext2D): void {
        for (const p of this.particles) {
            const t = 1 - p.life / p.maxLife; // 0 -> 1 as particle ages
            const alpha = p.alpha + (p.alphaEnd - p.alpha) * t;
            const size = p.size + (p.sizeEnd - p.size) * t;

            if (alpha <= 0.01 || size <= 0.1) continue;

            ctx.globalAlpha = alpha;

            switch (p.shape) {
                case 'circle':
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
                    ctx.fillStyle = p.color;
                    ctx.fill();
                    break;

                case 'ring':
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
                    ctx.strokeStyle = p.color;
                    ctx.lineWidth = 2 + (1 - t) * 2;
                    ctx.stroke();
                    break;

                case 'spark':
                    ctx.save();
                    ctx.translate(p.x, p.y);
                    ctx.rotate(p.rotation);
                    ctx.fillStyle = p.color;
                    ctx.fillRect(-size, -size * 0.3, size * 2, size * 0.6);
                    ctx.restore();
                    break;

                case 'splat':
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
                    ctx.fillStyle = p.color;
                    ctx.fill();
                    // Darker outline for gooey look
                    ctx.strokeStyle = 'rgba(0,0,0,0.3)';
                    ctx.lineWidth = 1;
                    ctx.stroke();
                    break;

                case 'cloud':
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
                    ctx.fillStyle = p.color;
                    ctx.shadowColor = p.color;
                    ctx.shadowBlur = size;
                    ctx.fill();
                    ctx.shadowBlur = 0;
                    break;
            }
        }
        ctx.globalAlpha = 1;
    }

    clear(): void {
        this.particles = [];
        this.pendingInstakillBursts = [];
    }
}

// --- End Particle System ---

interface MouseState {
    x: number;
    y: number;
    down: boolean;
}

class Game {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private game: GameRunner;
    private renderer: GameRenderer;
    private loop: GameLoop;
    private mouse: MouseState;
    private audio: AudioManager;
    private particles: ParticleSystem;
    private lastTime: number = 0;
    private lastRenderTime: number = 0;
    private showingMenu: boolean = true;
    private menuAnimTime: number = 0;
    private lastTrackedWaveIndex: number = -1;

    constructor() {
        this.canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
        this.ctx = this.canvas.getContext('2d')!;

        this.game = new GameRunner({ mapId: 'garden_path' });
        this.renderer = createGameRenderer();
        this.loop = createGameLoop(this.game, this.renderer);

        this.mouse = { x: 0, y: 0, down: false };
        this.audio = createAudioManager();
        this.particles = new ParticleSystem();

        this.setupEventListeners();
        this.renderer.setCamera({ x: 400, y: 300, zoom: 1.2 });
        this.drawMenu();
    }

    private drawMenu(): void {
        const animate = () => {
            if (!this.showingMenu) return;
            this.menuAnimTime += 0.02;
            const ctx = this.ctx;
            ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

            // Background
            ctx.fillStyle = '#0a0a14';
            ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

            // Animated spore particles
            for (let i = 0; i < 30; i++) {
                const x = ((i * 137.5 + this.menuAnimTime * 20 * (i % 3 + 1)) % CANVAS_WIDTH);
                const y = ((i * 91.3 + this.menuAnimTime * 10 * ((i + 1) % 2 + 1)) % CANVAS_HEIGHT);
                const r = 1.5 + Math.sin(this.menuAnimTime + i) * 1;
                const alpha = 0.2 + Math.sin(this.menuAnimTime * 0.5 + i * 0.7) * 0.15;
                ctx.beginPath();
                ctx.arc(x, y, r, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(74, 222, 128, ${alpha})`;
                ctx.fill();
            }

            // Title
            const titleY = 220 + Math.sin(this.menuAnimTime * 0.8) * 8;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            ctx.fillStyle = '#4ade80';
            ctx.font = 'bold 64px sans-serif';
            ctx.fillText('Mycomed TD', CANVAS_WIDTH / 2, titleY);

            ctx.fillStyle = 'rgba(74, 222, 128, 0.5)';
            ctx.font = '18px sans-serif';
            ctx.fillText('A Mycelium Tower Defense', CANVAS_WIDTH / 2, titleY + 50);

            // Start button
            const btnY = 420;
            const btnW = 240;
            const btnH = 56;
            const pulse = 0.95 + Math.sin(this.menuAnimTime * 2) * 0.05;

            ctx.save();
            ctx.translate(CANVAS_WIDTH / 2, btnY);
            ctx.scale(pulse, pulse);
            ctx.fillStyle = 'rgba(74, 222, 128, 0.15)';
            ctx.strokeStyle = '#4ade80';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.roundRect(-btnW / 2, -btnH / 2, btnW, btnH, 8);
            ctx.fill();
            ctx.stroke();
            ctx.fillStyle = '#4ade80';
            ctx.font = 'bold 24px sans-serif';
            ctx.fillText('Start Game', 0, 2);
            ctx.restore();

            // Hint
            ctx.fillStyle = 'rgba(255,255,255,0.3)';
            ctx.font = '14px sans-serif';
            ctx.fillText('Click to begin or press Enter', CANVAS_WIDTH / 2, 520);

            requestAnimationFrame(animate);
        };
        requestAnimationFrame(animate);
    }

    private startGame(): void {
        if (!this.showingMenu) return;
        this.showingMenu = false;
        this.audio.ensureInitialized();
        this.audio.playNormalTrack();
        this.game.start();
        this.loop.start();
        this.loop.setRenderCallback(this.render.bind(this));
        // Player places towers first, then clicks "Start Wave"
    }

    private startNextWave(): boolean {
        const rm = this.game.getRoundManager();
        const roundState = rm.getState();
        if (roundState === RoundState.Idle) {
            return this.game.startWave();
        }
        if (roundState === RoundState.Intermission) {
            return rm.skipIntermission();
        }
        return false;
    }

    private setupEventListeners(): void {
        this.canvas.addEventListener('mousemove', this.onMouseMove.bind(this));
        this.canvas.addEventListener('mousedown', this.onMouseDown.bind(this));
        this.canvas.addEventListener('mouseup', this.onMouseUp.bind(this));
        window.addEventListener('keydown', this.onKeyDown.bind(this));
    }

    private screenToWorld(screenX: number, screenY: number): Vec2 {
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = CANVAS_WIDTH / rect.width;
        const scaleY = CANVAS_HEIGHT / rect.height;
        const x = (screenX - rect.left) * scaleX;
        const y = (screenY - rect.top) * scaleY;
        return this.renderer.screenToWorld(x, y);
    }

    private onMouseMove(e: MouseEvent): void {
        const world = this.screenToWorld(e.clientX, e.clientY);
        this.mouse.x = world.x;
        this.mouse.y = world.y;
        
        if (this.game.getPlacementState() === PlacementState.Placing) {
            this.game.updatePlacementPosition(world.x, world.y);
        }
    }

    private onMouseDown(e: MouseEvent): void {
        this.mouse.down = true;

        if (this.showingMenu) {
            this.startGame();
            return;
        }

        if (e.button === 2) {
            this.game.cancelPlacement();
            this.game.deselectTower();
            return;
        }
        
        const rect = this.canvas.getBoundingClientRect();
        const screenX = (e.clientX - rect.left) * (CANVAS_WIDTH / rect.width);
        const screenY = (e.clientY - rect.top) * (CANVAS_HEIGHT / rect.height);
        
        if (this.game.getState() === GameState.Paused) {
            const btnId = this.getPauseButtonAtScreen(screenX, screenY);
            if (btnId) {
                if (btnId === 'resume') { this.game.resume(); this.audio.resume(); }
                else if (btnId === 'restart') { this.game.reset(); this.game.start(); this.lastTrackedWaveIndex = -1; this.audio.playNormalTrack(); this.particles.clear(); }
                else if (btnId === 'quit') { this.showingMenu = true; this.game.reset(); this.lastTrackedWaveIndex = -1; this.audio.stop(); this.particles.clear(); this.drawMenu(); }
                return;
            }
            // Settings controls in pause menu
            if (this.handlePauseSettingsClick(screenX, screenY)) return;
        }
        
        const mapRenderData = this.game.getMapSelectionRenderData();
        if (mapRenderData && mapRenderData.isVisible) {
            const mapId = getMapSelectionButtonAtPosition(screenX, screenY, mapRenderData);
            if (mapId) {
                this.game.selectMap(mapId);
                this.game.hideMapSelectionUI();
                return;
            }
        }
        
        // Start Wave button
        if (this.isWaveButtonVisible()) {
            const btn = this.getStartWaveButtonRect();
            if (screenX >= btn.x && screenX <= btn.x + btn.w && screenY >= btn.y && screenY <= btn.y + btn.h) {
                this.startNextWave();
                return;
            }
        }

        const towerType = this.getTowerPurchaseButtonAtPosition(screenX, screenY);
        if (towerType !== null && this.game.getPlacementState() === PlacementState.None) {
            this.game.startTowerPlacement(towerType);
            return;
        }
        
        const world = this.screenToWorld(e.clientX, e.clientY);
        this.handleClick(world.x, world.y, e.button === 0);
    }
    
    private getPauseButtonAtScreen(sx: number, sy: number): string | null {
        // Use same layout as drawPauseMenu
        const panelH = 420;
        const panelY = CANVAS_HEIGHT / 2 - panelH / 2;
        const btnW = 200;
        const btnH = 40;
        const bx = CANVAS_WIDTH / 2 - btnW / 2;
        const menuPosY = 300; // from pauseMenuRender getPauseMenuPosition
        const btnIds = ['resume', 'restart', 'quit'];
        const btnBaseYs = [280, 330, 380]; // from render data: position.y + BUTTON_START_Y + i*BUTTON_SPACING
        for (let i = 0; i < btnIds.length; i++) {
            const by = btnBaseYs[i] + CANVAS_HEIGHT / 2 - menuPosY;
            if (sx >= bx && sx <= bx + btnW && sy >= by && sy <= by + btnH) {
                return btnIds[i];
            }
        }
        return null;
    }

    private handlePauseSettingsClick(sx: number, sy: number): boolean {
        // Must match layout in drawPauseMenu settings section
        const panelH = 420;
        const panelY = CANVAS_HEIGHT / 2 - panelH / 2;
        const cx = CANVAS_WIDTH / 2;
        const settingsY = panelY + panelH - 90;

        // Volume bar: barX to barX+barW, settingsY +/- 8
        const barX = cx - 30;
        const barW = 120;
        if (sx >= barX && sx <= barX + barW && sy >= settingsY - 10 && sy <= settingsY + 10) {
            const vol = Math.max(0, Math.min(1, (sx - barX) / barW));
            this.audio.setVolume(vol);
            return true;
        }

        // Mute button
        const muteX = cx - 100;
        const muteY = settingsY + 25;
        const muteW = 90;
        const muteH = 28;
        if (sx >= muteX && sx <= muteX + muteW && sy >= muteY && sy <= muteY + muteH) {
            this.audio.toggleMute();
            return true;
        }

        // Speed buttons
        const speedBtnW = 40;
        const speedBtnH = 28;
        const speedStartX = cx + 20;
        const speeds = [GameSpeed.Normal, GameSpeed.Fast, GameSpeed.Faster];
        for (let si = 0; si < 3; si++) {
            const bx = speedStartX + si * (speedBtnW + 5);
            if (sx >= bx && sx <= bx + speedBtnW && sy >= muteY && sy <= muteY + speedBtnH) {
                this.game.setGameSpeed(speeds[si]);
                return true;
            }
        }

        return false;
    }

    private getTowerPurchaseButtonAtPosition(screenX: number, screenY: number): TowerType | null {
        const BUTTON_WIDTH = 120;
        const BUTTON_HEIGHT = 80;
        const BUTTON_SPACING = 10;
        const BUTTON_COUNT = 5;
        
        const totalWidth = BUTTON_COUNT * BUTTON_WIDTH + (BUTTON_COUNT - 1) * BUTTON_SPACING;
        const startX = CANVAS_WIDTH / 2 - totalWidth / 2;
        const startY = CANVAS_HEIGHT - BUTTON_HEIGHT - 20;
        
        if (screenY < startY || screenY > startY + BUTTON_HEIGHT) {
            return null;
        }
        
        for (let i = 0; i < BUTTON_COUNT; i++) {
            const buttonX = startX + i * (BUTTON_WIDTH + BUTTON_SPACING);
            if (screenX >= buttonX && screenX <= buttonX + BUTTON_WIDTH) {
                const TOWER_TYPES = [
                    TowerType.PuffballFungus,
                    TowerType.OrchidTrap,
                    TowerType.VenusFlytower,
                    TowerType.BioluminescentShroom,
                    TowerType.StinkhornLine,
                ];
                return TOWER_TYPES[i];
            }
        }
        
        return null;
    }

    private onMouseUp(_e: MouseEvent): void {
        this.mouse.down = false;
    }

    private handleClick(x: number, y: number, leftClick: boolean): void {
        const state = this.game.getState();
        if (state === GameState.GameOver || state === GameState.Victory) {
            this.game.reset();
            this.game.start();
            this.lastTrackedWaveIndex = -1;
            this.audio.playNormalTrack();
            this.particles.clear();
            return;
        }

        const placementState = this.game.getPlacementState();

        if (placementState === PlacementState.Placing) {
            if (this.game.selectTargetingModeAtPosition(x, y)) {
                return;
            }
            this.game.updatePlacementPosition(x, y);
            const result = this.game.confirmPlacement(this.game.getSelectedTargetingMode());
            if (result) {
                this.game.startTowerPlacement(this.game.getSelectedTowerType()!);
                setTimeout(() => this.game.cancelPlacement(), 100);
            }
        } else if (placementState === PlacementState.Selecting) {
            const sellResult = this.game.sellTowerAtPosition(x, y);
            if (sellResult.success) {
                return;
            }
            this.game.deselectTower();
        } else {
            const towerSelected = this.game.selectTowerAtPosition(x, y);
            if (!towerSelected) {
            }
        }
    }

    private onKeyDown(e: KeyboardEvent): void {
        if (this.showingMenu) {
            if (e.key === 'Enter' || e.key === ' ') {
                this.startGame();
            }
            return;
        }

        const result = findHotkeyAction(e.key);
        const action = result ? result.action : null;

        if (action === HotkeyAction.SelectMap) {
            const mapState = this.game.getMapSelectionState();
            if (mapState.isSelecting) {
                this.game.hideMapSelectionUI();
            } else {
                this.game.showMapSelectionUI();
            }
            return;
        }

        if (action === HotkeyAction.Pause) {
            if (this.game.getState() === GameState.Playing) {
                this.game.pause();
                this.audio.pause();
            } else if (this.game.getState() === GameState.Paused) {
                this.game.resume();
                this.audio.resume();
            }
            return;
        }

        if (action === HotkeyAction.SetSpeed1) {
            this.game.setGameSpeed(GameSpeed.Normal);
            return;
        }

        if (action === HotkeyAction.SetSpeed2) {
            this.game.setGameSpeed(GameSpeed.Fast);
            return;
        }

        if (action === HotkeyAction.SetSpeed3) {
            this.game.setGameSpeed(GameSpeed.Faster);
            return;
        }

        // Start / Next wave (Enter key)
        if (e.key === 'Enter') {
            this.startNextWave();
            return;
        }

        // Mute toggle (N key - M is already used for map selection)
        if (e.key === 'n' || e.key === 'N') {
            this.audio.toggleMute();
            return;
        }

        if (action === HotkeyAction.Cancel) {
            this.game.cancelPlacement();
            this.game.deselectTower();
            return;
        }

        const towerKeys: Record<string, TowerType> = {
            '1': TowerType.PuffballFungus,
            '2': TowerType.OrchidTrap,
            '3': TowerType.VenusFlytower,
            '4': TowerType.BioluminescentShroom,
            '5': TowerType.StinkhornLine,
        };

        if (towerKeys[e.key]) {
            if (this.game.getPlacementState() === PlacementState.None) {
                this.game.startTowerPlacement(towerKeys[e.key]);
            }
        }
    }

    private render(renderData: GameFrameRenderData): void {
        // Switch music based on wave changes
        const waveIndex = this.game.getCurrentWaveIndex();
        if (waveIndex !== this.lastTrackedWaveIndex && waveIndex >= 0) {
            this.lastTrackedWaveIndex = waveIndex;
            const totalWaves = this.game.getGameStats().totalWaves ?? 10;
            if (isBossWave(waveIndex, totalWaves)) {
                this.audio.playBossTrack();
            } else if (waveIndex > 0) {
                // Only switch back to normal if we were on a boss track
                this.audio.playNormalTrack();
            }
        }

        // Stop music on game over / victory
        const state = this.game.getState();
        if (state === GameState.GameOver || state === GameState.Victory) {
            if (this.lastTrackedWaveIndex !== -2) {
                this.audio.stop();
                this.lastTrackedWaveIndex = -2; // sentinel to avoid repeated stops
            }
        }

        // Update particles
        const now = performance.now() / 1000;
        const particleDt = this.lastRenderTime > 0 ? Math.min(now - this.lastRenderTime, 0.05) : 0.016;
        this.lastRenderTime = now;
        const events = this.game.drainEvents();
        this.particles.processEvents(events);
        this.particles.update(particleDt);

        this.ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        this.ctx.save();
        this.ctx.translate(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
        this.ctx.scale(renderData.camera.zoom, renderData.camera.zoom);
        this.ctx.translate(-renderData.camera.x, -renderData.camera.y);

        this.drawPath(renderData.path);
        this.drawNetworkConnections();
        this.drawPlacementPreview(renderData.placementPreview);
        this.drawTowers(renderData);
        this.drawEnemies(renderData);
        this.drawProjectiles(renderData.projectiles);
        this.particles.render(this.ctx);
        this.drawHealthBars(renderData.healthBars);
        this.drawTowerSelection(renderData.towerSelection);
        this.drawSellButton(renderData.sellButton);
        
        this.ctx.restore();
        
        this.drawHUD(renderData);
    }

    private drawPath(pathData: PathRenderData): void {
        for (const segment of pathData.segments) {
            this.ctx.beginPath();
            this.ctx.moveTo(segment.start.x, segment.start.y);
            this.ctx.lineTo(segment.end.x, segment.end.y);
            this.ctx.strokeStyle = segment.isHighlighted ? segment.highlightColor : segment.color;
            this.ctx.lineWidth = segment.width;
            this.ctx.lineCap = 'round';
            this.ctx.stroke();
        }

        // Direction arrows along path
        const segs = pathData.segments;
        for (let i = 0; i < segs.length; i++) {
            const s = segs[i];
            const mx = (s.start.x + s.end.x) / 2;
            const my = (s.start.y + s.end.y) / 2;
            const angle = Math.atan2(s.end.y - s.start.y, s.end.x - s.start.x);
            const sz = 8;
            this.ctx.save();
            this.ctx.translate(mx, my);
            this.ctx.rotate(angle);
            this.ctx.beginPath();
            this.ctx.moveTo(sz, 0);
            this.ctx.lineTo(-sz, -sz * 0.6);
            this.ctx.lineTo(-sz, sz * 0.6);
            this.ctx.closePath();
            this.ctx.fillStyle = 'rgba(74, 222, 128, 0.5)';
            this.ctx.fill();
            this.ctx.restore();
        }

        // Start / End labels
        if (segs.length > 0) {
            const first = segs[0];
            const last = segs[segs.length - 1];
            this.ctx.font = 'bold 14px sans-serif';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillStyle = '#4ade80';
            this.ctx.fillText('START', first.start.x, first.start.y - 20);
            this.ctx.fillStyle = '#f87171';
            this.ctx.fillText('END', last.end.x, last.end.y - 20);
        }
    }

    private drawPlacementPreview(preview: PlacementPreviewWithTargetingRenderData | null): void {
        if (!preview || !preview.ghost) return;
        
        const ghost = preview.ghost;
        this.ctx.globalAlpha = 0.7;
        
        const size = ghost.size;
        const halfSize = size / 2;
        
        this.ctx.fillStyle = ghost.isValid ? 'rgba(100, 255, 100, 0.3)' : 'rgba(255, 100, 100, 0.3)';
        this.ctx.strokeStyle = ghost.isValid ? '#00ff00' : '#ff0000';
        this.ctx.lineWidth = 2;
        
        const typeMap: Record<TowerType, 'circle' | 'square' | 'diamond'> = {
            [TowerType.PuffballFungus]: 'circle',
            [TowerType.OrchidTrap]: 'diamond',
            [TowerType.VenusFlytower]: 'square',
            [TowerType.BioluminescentShroom]: 'circle',
            [TowerType.StinkhornLine]: 'diamond',
            [TowerType.MyceliumNetwork]: 'circle',
        };
        const shapeType = typeMap[ghost.towerType] || 'circle';
        
        if (shapeType === 'circle') {
            this.ctx.beginPath();
            this.ctx.arc(ghost.position.x, ghost.position.y, halfSize, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.stroke();
        } else if (shapeType === 'square') {
            this.ctx.fillRect(ghost.position.x - halfSize, ghost.position.y - halfSize, size, size);
            this.ctx.strokeRect(ghost.position.x - halfSize, ghost.position.y - halfSize, size, size);
        } else if (shapeType === 'diamond') {
            this.ctx.beginPath();
            this.ctx.moveTo(ghost.position.x, ghost.position.y - halfSize);
            this.ctx.lineTo(ghost.position.x + halfSize, ghost.position.y);
            this.ctx.lineTo(ghost.position.x, ghost.position.y + halfSize);
            this.ctx.lineTo(ghost.position.x - halfSize, ghost.position.y);
            this.ctx.closePath();
            this.ctx.fill();
            this.ctx.stroke();
        }
        
        this.ctx.strokeStyle = ghost.glowColor;
        this.ctx.lineWidth = 3;
        this.ctx.shadowColor = ghost.glowColor;
        this.ctx.shadowBlur = 8;
        if (shapeType === 'circle') {
            this.ctx.beginPath();
            this.ctx.arc(ghost.position.x, ghost.position.y, halfSize, 0, Math.PI * 2);
            this.ctx.stroke();
        } else if (shapeType === 'square') {
            this.ctx.strokeRect(ghost.position.x - halfSize, ghost.position.y - halfSize, size, size);
        } else if (shapeType === 'diamond') {
            this.ctx.beginPath();
            this.ctx.moveTo(ghost.position.x, ghost.position.y - halfSize);
            this.ctx.lineTo(ghost.position.x + halfSize, ghost.position.y);
            this.ctx.lineTo(ghost.position.x, ghost.position.y + halfSize);
            this.ctx.lineTo(ghost.position.x - halfSize, ghost.position.y);
            this.ctx.closePath();
            this.ctx.stroke();
        }
        this.ctx.shadowBlur = 0;
        
        if (preview.rangeCircle) {
            const rc = preview.rangeCircle;
            this.ctx.beginPath();
            this.ctx.arc(rc.position.x, rc.position.y, rc.radius, 0, Math.PI * 2);
            this.ctx.strokeStyle = ghost.isValid ? 'rgba(129, 199, 132, 0.5)' : 'rgba(239, 83, 80, 0.5)';
            this.ctx.lineWidth = 2;
            this.ctx.setLineDash([8, 4]);
            this.ctx.stroke();
            this.ctx.setLineDash([]);
            
            this.ctx.fillStyle = ghost.isValid ? 'rgba(76, 175, 80, 0.1)' : 'rgba(244, 67, 54, 0.1)';
            this.ctx.fill();
        }
        
        if (preview.pathCoverage && preview.pathCoverage.segments.length > 0) {
            this.ctx.lineWidth = 4;
            for (const segment of preview.pathCoverage.segments) {
                this.ctx.beginPath();
                this.ctx.moveTo(segment.start.x, segment.start.y);
                this.ctx.lineTo(segment.end.x, segment.end.y);
                this.ctx.strokeStyle = segment.isCovered ? '#8BC34A' : '#9E9E9E';
                this.ctx.globalAlpha = segment.opacity;
                this.ctx.stroke();
            }
            this.ctx.globalAlpha = 0.7;
        }
        
        if (preview.targetingModeSelection && preview.targetingModeSelection.isVisible) {
            this.drawTargetingModeButtonsFromSelection(preview.targetingModeSelection.buttons);
        }
        
        this.ctx.globalAlpha = 1;
    }
    
    private drawTargetingModeButtonsFromSelection(buttons: any[]): void {
        for (const btn of buttons) {
            this.ctx.fillStyle = btn.isSelected ? '#2196F3' : '#333';
            this.ctx.fillRect(btn.position.x, btn.position.y, btn.size.width, btn.size.height);
            this.ctx.strokeStyle = btn.isSelected ? '#fff' : '#555';
            this.ctx.lineWidth = 2;
            this.ctx.strokeRect(btn.position.x, btn.position.y, btn.size.width, btn.size.height);
            
            this.ctx.fillStyle = '#fff';
            this.ctx.font = '12px sans-serif';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText(btn.label, btn.position.x + btn.size.width / 2, btn.position.y + btn.size.height / 2);
        }
    }

    private drawTowers(renderData: GameFrameRenderData): void {
        for (const tower of renderData.towers.towers) {
            const isSelected = tower.isSelected;
            const primaryColor = tower.primaryColor;
            const secondaryColor = tower.secondaryColor;
            const glowColor = tower.glowColor;
            const bodyRadius = tower.bodyRadius;
            const baseRadius = tower.baseRadius;
            const bodyShape = getTowerBodyShape(tower.towerType);
            const growthStage = tower.growthStage;
            const growthProgress = tower.growthProgress;
            
            this.ctx.beginPath();
            switch (bodyShape) {
                case 'circle':
                    this.ctx.arc(tower.position.x, tower.position.y, bodyRadius, 0, Math.PI * 2);
                    break;
                case 'hexagon':
                    this.drawHexagon(tower.position.x, tower.position.y, bodyRadius);
                    break;
                case 'diamond':
                    this.drawDiamond(tower.position.x, tower.position.y, bodyRadius);
                    break;
                case 'star':
                    this.drawStar(tower.position.x, tower.position.y, bodyRadius);
                    break;
                default:
                    this.ctx.arc(tower.position.x, tower.position.y, bodyRadius, 0, Math.PI * 2);
            }
            this.ctx.fillStyle = primaryColor;
            this.ctx.fill();
            this.ctx.strokeStyle = secondaryColor;
            this.ctx.lineWidth = 2;
            this.ctx.stroke();
            
            if (growthStage === TowerGrowthStage.FullyMatured || growthStage === TowerGrowthStage.Mature) {
                this.ctx.beginPath();
                this.ctx.arc(tower.position.x, tower.position.y, bodyRadius * 0.5, 0, Math.PI * 2);
                this.ctx.fillStyle = glowColor;
                this.ctx.globalAlpha = 0.4 + growthProgress * 0.3;
                this.ctx.fill();
                this.ctx.globalAlpha = 1;
            }
            
            if (growthStage === TowerGrowthStage.FullyMatured) {
                this.ctx.shadowColor = glowColor;
                this.ctx.shadowBlur = 15 + growthProgress * 10;
                this.ctx.beginPath();
                this.ctx.arc(tower.position.x, tower.position.y, bodyRadius + 3, 0, Math.PI * 2);
                this.ctx.strokeStyle = glowColor;
                this.ctx.lineWidth = 2;
                this.ctx.stroke();
                this.ctx.shadowBlur = 0;
            }
            
            if (isSelected) {
                this.ctx.strokeStyle = '#FFD700';
                this.ctx.lineWidth = 3;
                this.ctx.beginPath();
                switch (bodyShape) {
                    case 'circle':
                        this.ctx.arc(tower.position.x, tower.position.y, bodyRadius + 4, 0, Math.PI * 2);
                        break;
                    case 'hexagon':
                        this.drawHexagon(tower.position.x, tower.position.y, bodyRadius + 4);
                        break;
                    case 'diamond':
                        this.drawDiamond(tower.position.x, tower.position.y, bodyRadius + 4);
                        break;
                    case 'star':
                        this.drawStar(tower.position.x, tower.position.y, bodyRadius + 4);
                        break;
                    default:
                        this.ctx.arc(tower.position.x, tower.position.y, bodyRadius + 4, 0, Math.PI * 2);
                }
                this.ctx.stroke();
            }
            
            if (tower.isFiring) {
                this.ctx.shadowColor = glowColor;
                this.ctx.shadowBlur = 20;
                this.ctx.beginPath();
                this.ctx.arc(tower.position.x, tower.position.y, bodyRadius + 2, 0, Math.PI * 2);
                this.ctx.strokeStyle = glowColor;
                this.ctx.lineWidth = 3;
                this.ctx.stroke();
                this.ctx.shadowBlur = 0;
            }
            
            if (tower.showRange) {
                this.ctx.beginPath();
                this.ctx.arc(tower.position.x, tower.position.y, tower.rangeRadius, 0, Math.PI * 2);
                this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
                this.ctx.lineWidth = 1;
                this.ctx.setLineDash([5, 5]);
                this.ctx.stroke();
                this.ctx.setLineDash([]);
            }
        }
    }
    
    private drawNetworkConnections(): void {
        const buffedTowers = this.game.getNetworkBuffedTowers();
        if (buffedTowers.length === 0) return;

        const time = performance.now() / 1000;
        const ctx = this.ctx;

        for (const entry of buffedTowers) {
            const target = entry.tower;

            // Draw buff glow on buffed tower
            const pulseAlpha = 0.15 + Math.sin(time * 3) * 0.08;
            ctx.beginPath();
            ctx.arc(target.position.x, target.position.y, 18, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(142, 68, 173, ${pulseAlpha})`;
            ctx.fill();

            // Draw connection lines from each source
            for (const source of entry.sources) {
                const dx = target.position.x - source.position.x;
                const dy = target.position.y - source.position.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                // Animated dash offset for "flowing" effect
                const dashOffset = (time * 40) % 20;

                ctx.beginPath();
                ctx.moveTo(source.position.x, source.position.y);
                ctx.lineTo(target.position.x, target.position.y);

                // Glow layer
                ctx.strokeStyle = `rgba(142, 68, 173, ${0.15 + Math.sin(time * 2 + dist * 0.01) * 0.08})`;
                ctx.lineWidth = 6;
                ctx.stroke();

                // Core line with animated dashes
                ctx.beginPath();
                ctx.moveTo(source.position.x, source.position.y);
                ctx.lineTo(target.position.x, target.position.y);
                ctx.strokeStyle = `rgba(186, 120, 220, ${0.5 + Math.sin(time * 2.5) * 0.2})`;
                ctx.lineWidth = 2;
                ctx.setLineDash([8, 12]);
                ctx.lineDashOffset = -dashOffset;
                ctx.stroke();
                ctx.setLineDash([]);
                ctx.lineDashOffset = 0;
            }
        }
    }

    private drawHexagon(x: number, y: number, radius: number): void {
        this.ctx.moveTo(x + radius * Math.cos(0), y + radius * Math.sin(0));
        for (let i = 1; i <= 6; i++) {
            const angle = (i * Math.PI) / 3;
            this.ctx.lineTo(x + radius * Math.cos(angle), y + radius * Math.sin(angle));
        }
        this.ctx.closePath();
    }
    
    private drawDiamond(x: number, y: number, radius: number): void {
        this.ctx.moveTo(x, y - radius);
        this.ctx.lineTo(x + radius, y);
        this.ctx.lineTo(x, y + radius);
        this.ctx.lineTo(x - radius, y);
        this.ctx.closePath();
    }
    
    private drawStar(x: number, y: number, radius: number): void {
        const points = 5;
        const innerRadius = radius * 0.5;
        for (let i = 0; i < points * 2; i++) {
            const r = i % 2 === 0 ? radius : innerRadius;
            const angle = (i * Math.PI) / points - Math.PI / 2;
            if (i === 0) {
                this.ctx.moveTo(x + r * Math.cos(angle), y + r * Math.sin(angle));
            } else {
                this.ctx.lineTo(x + r * Math.cos(angle), y + r * Math.sin(angle));
            }
        }
        this.ctx.closePath();
    }

    private isEnemyRevealed(ex: number, ey: number): boolean {
        for (const placed of this.game.getPlacedTowers()) {
            if (placed.tower.towerType === TowerType.BioluminescentShroom) {
                const dx = ex - placed.tower.position.x;
                const dy = ey - placed.tower.position.y;
                if (dx * dx + dy * dy <= placed.tower.range * placed.tower.range) {
                    return true;
                }
            }
        }
        return false;
    }

    private drawEnemies(renderData: GameFrameRenderData): void {
        for (const enemy of renderData.enemies.enemies) {
            this.ctx.save();

            const radius = enemy.bodyRadius;

            // Camo enemies: semi-transparent unless revealed by Bioluminescent Shroom
            let camoRevealed = false;
            if (enemy.isCamo) {
                camoRevealed = this.isEnemyRevealed(enemy.position.x, enemy.position.y);
                if (!camoRevealed) {
                    // Shimmer effect - barely visible
                    const shimmer = 0.15 + Math.sin(performance.now() / 400 + enemy.id) * 0.05;
                    this.ctx.globalAlpha = shimmer;
                } else {
                    // Revealed - yellow highlight pulse
                    const revealPulse = 0.8 + Math.sin(performance.now() / 300) * 0.2;
                    this.ctx.globalAlpha = revealPulse;
                    // Reveal glow
                    this.ctx.shadowColor = '#F1C40F';
                    this.ctx.shadowBlur = 12;
                }
            }

            this.ctx.beginPath();
            const bodyShape = renderData.enemies.enemyTypeInfo?.get(enemy.id)?.bodyShape || 'circle';
            if (bodyShape === 'circle') {
                this.ctx.arc(enemy.position.x, enemy.position.y, radius, 0, Math.PI * 2);
            } else if (bodyShape === 'oval') {
                this.ctx.ellipse(enemy.position.x, enemy.position.y, radius * 1.3, radius, 0, 0, Math.PI * 2);
            } else {
                this.ctx.arc(enemy.position.x, enemy.position.y, radius, 0, Math.PI * 2);
            }
            this.ctx.fillStyle = enemy.primaryColor;
            this.ctx.fill();
            this.ctx.strokeStyle = enemy.secondaryColor;
            this.ctx.lineWidth = 2;
            this.ctx.stroke();

            // Reset shadow/alpha for decorations
            this.ctx.shadowBlur = 0;
            if (enemy.isCamo && !camoRevealed) {
                // Keep low alpha for decorations too
            } else {
                this.ctx.globalAlpha = 1;
            }

            const decorations = renderData.enemies.enemyTypeInfo?.get(enemy.id)?.decorations || [];
            const hasShell = decorations.some(d => d.type === 'shell');
            if (hasShell) {
                this.ctx.beginPath();
                this.ctx.arc(enemy.position.x, enemy.position.y - radius * 0.2, radius * 0.7, 0, Math.PI * 2);
                this.ctx.strokeStyle = enemy.secondaryColor || 'transparent';
                this.ctx.lineWidth = 2;
                this.ctx.stroke();
            }

            // Camo indicator - dashed outline for revealed enemies
            if (enemy.isCamo && camoRevealed) {
                this.ctx.beginPath();
                this.ctx.arc(enemy.position.x, enemy.position.y, radius + 5, 0, Math.PI * 2);
                this.ctx.strokeStyle = '#F1C40F';
                this.ctx.lineWidth = 2;
                this.ctx.setLineDash([4, 4]);
                this.ctx.stroke();
                this.ctx.setLineDash([]);
            }
            
            // Reset alpha for status indicators (always visible even on camo)
            this.ctx.globalAlpha = 1;

            // Status effect indicators
            const auras = renderData.enemies.enemyTypeInfo?.get(enemy.id)?.statusEffectAuras || [];
            const time = performance.now() / 1000;
            if (auras.length > 0) {
                // Aura ring for strongest effect
                const mainAura = auras[0];
                const pulse = 0.3 + Math.sin(time * mainAura.pulseSpeed) * 0.15;
                this.ctx.beginPath();
                this.ctx.arc(enemy.position.x, enemy.position.y, mainAura.radius, 0, Math.PI * 2);
                this.ctx.strokeStyle = mainAura.color;
                this.ctx.globalAlpha = pulse;
                this.ctx.lineWidth = 2;
                this.ctx.stroke();
                this.ctx.globalAlpha = 1;
            }
            // Small colored dots above enemy for each active effect
            const effects = enemy.statusEffects || [];
            if (effects.length > 0) {
                const dotY = enemy.position.y - radius - 8;
                const totalWidth = effects.length * 8;
                const startX = enemy.position.x - totalWidth / 2 + 4;
                for (let ei = 0; ei < effects.length; ei++) {
                    const eff = effects[ei];
                    const dotX = startX + ei * 8;
                    const effPulse = 0.7 + Math.sin(time * 5 + ei) * 0.3;
                    this.ctx.globalAlpha = effPulse;
                    this.ctx.beginPath();
                    this.ctx.arc(dotX, dotY, 3, 0, Math.PI * 2);
                    this.ctx.fillStyle = eff.color;
                    this.ctx.fill();
                    this.ctx.globalAlpha = 1;
                }
            }
            
            this.ctx.restore();
        }
    }

    private drawProjectiles(projectiles: any[]): void {
        for (const p of projectiles) {
            const x = p.position.x;
            const y = p.position.y;
            const size = p.size || 5;
            const color = p.color || '#fff';
            const glowColor = p.glowColor || color;
            
            this.ctx.save();

            // Draw trail BEFORE local transform — trail points are in world coordinates
            if (p.hasTrail && p.trailPoints && p.trailPoints.length > 0) {
                this.drawProjectileTrail(p.trailPoints, color, glowColor, size);
            }

            const animationState = p.animationState || { scale: 1, rotation: 0, pulsePhase: 0 };
            const stretch = p.stretch || { scaleX: 1, scaleY: 1 };

            this.ctx.translate(x, y);
            this.ctx.rotate(animationState.rotation);
            this.ctx.scale(stretch.scaleX * animationState.scale, stretch.scaleY * animationState.scale);
            
            if (p.glowColor) {
                this.ctx.shadowColor = glowColor;
                this.ctx.shadowBlur = size * 2;
            }
            
            this.ctx.beginPath();
            this.ctx.arc(0, 0, size, 0, Math.PI * 2);
            this.ctx.fillStyle = color;
            this.ctx.fill();
            
            if (p.specialEffect === 'area_damage') {
                this.ctx.beginPath();
                this.ctx.arc(0, 0, size * 0.6, 0, Math.PI * 2);
                this.ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
                this.ctx.fill();
            } else if (p.specialEffect === 'poison') {
                this.ctx.beginPath();
                this.ctx.arc(0, 0, size * 0.5, 0, Math.PI * 2);
                this.ctx.fillStyle = 'rgba(150, 0, 150, 0.7)';
                this.ctx.fill();
            } else if (p.specialEffect === 'slow') {
                this.ctx.beginPath();
                this.ctx.arc(0, 0, size * 0.7, 0, Math.PI * 2);
                this.ctx.fillStyle = 'rgba(100, 150, 255, 0.5)';
                this.ctx.fill();
            } else if (p.specialEffect === 'instakill') {
                this.ctx.beginPath();
                this.ctx.arc(0, 0, size * 0.8, 0, Math.PI * 2);
                this.ctx.fillStyle = 'rgba(255, 200, 0, 0.6)';
                this.ctx.fill();
            } else if (p.specialEffect === 'reveal_camo') {
                this.ctx.beginPath();
                this.ctx.arc(0, 0, size * 0.5, 0, Math.PI * 2);
                this.ctx.fillStyle = 'rgba(0, 255, 200, 0.6)';
                this.ctx.fill();
            }
            
            this.ctx.shadowBlur = 0;
            this.ctx.restore();
        }
    }

    private drawProjectileTrail(trailPoints: any[], color: string, glowColor: string, size: number): void {
        if (trailPoints.length < 2) return;

        // Trail points are in world coordinates; the camera transform is already applied
        for (let i = 1; i < trailPoints.length; i++) {
            const prev = trailPoints[i - 1];
            const curr = trailPoints[i];
            const opacity = curr.opacity || 0.3;

            this.ctx.beginPath();
            this.ctx.moveTo(prev.position.x, prev.position.y);
            this.ctx.lineTo(curr.position.x, curr.position.y);
            this.ctx.strokeStyle = glowColor;
            this.ctx.lineWidth = size * opacity * 0.5;
            this.ctx.globalAlpha = opacity * 0.5;
            this.ctx.stroke();
            this.ctx.globalAlpha = 1;
        }
    }

    private drawHealthBars(healthBars: HealthBarRenderData[]): void {
        for (const hb of healthBars) {
            if (!hb.isVisible) continue;
            
            const x = hb.position.x - hb.width / 2;
            const y = hb.position.y - hb.height / 2;
            
            this.ctx.fillStyle = '#333';
            this.ctx.fillRect(x, y, hb.width, hb.height);
            
            const fillWidth = hb.width * hb.healthPercent;
            let fillColor = '#00ff00';
            if (hb.healthState === 'damaged') fillColor = '#ffff00';
            if (hb.healthState === 'critical') fillColor = '#ff0000';
            
            this.ctx.fillStyle = fillColor;
            this.ctx.fillRect(x, y, fillWidth, hb.height);
            
            this.ctx.strokeStyle = '#666';
            this.ctx.lineWidth = 1;
            this.ctx.strokeRect(x, y, hb.width, hb.height);
        }
    }

    private drawTowerSelection(selection: TowerSelectionPreviewRenderData | null): void {
        if (!selection || !selection.selection) return;

        if (selection.rangePreview) {
            const rp = selection.rangePreview;
            this.ctx.beginPath();
            this.ctx.arc(rp.position.x, rp.position.y, rp.radius, 0, Math.PI * 2);
            this.ctx.strokeStyle = rp.color;
            this.ctx.lineWidth = 2;
            this.ctx.globalAlpha = rp.opacity;
            this.ctx.setLineDash([8, 4]);
            this.ctx.stroke();
            this.ctx.setLineDash([]);
            this.ctx.globalAlpha = 1;
        }

        if (selection.upgradeIndicators) {
            const tower = selection.selection;
            const indicatorHeight = 6;
            const indicatorWidth = 30;
            const indicatorSpacing = 8;
            const totalWidth = (indicatorWidth + indicatorSpacing) * 4 - indicatorSpacing;
            let startX = tower.position.x - totalWidth / 2;
            const startY = tower.position.y + tower.size + 15;

            const paths = ['Damage', 'Range', 'FireRate', 'Special'];
            const colors = ['#FF4444', '#44FF44', '#4444FF', '#FF44FF'];

            for (let i = 0; i < selection.upgradeIndicators.length; i++) {
                const indicator = selection.upgradeIndicators[i];
                const x = startX + i * (indicatorWidth + indicatorSpacing);

                this.ctx.fillStyle = '#333';
                this.ctx.fillRect(x, startY, indicatorWidth, indicatorHeight);

                const fillWidth = (indicator.currentTier / indicator.maxTier) * indicatorWidth;
                this.ctx.fillStyle = indicator.canUpgrade ? colors[i] : '#666';
                this.ctx.fillRect(x, startY, fillWidth, indicatorHeight);

                this.ctx.strokeStyle = '#555';
                this.ctx.lineWidth = 1;
                this.ctx.strokeRect(x, startY, indicatorWidth, indicatorHeight);

                this.ctx.fillStyle = '#fff';
                this.ctx.font = '8px sans-serif';
                this.ctx.textAlign = 'center';
                this.ctx.textBaseline = 'top';
                this.ctx.fillText(`${indicator.currentTier}/${indicator.maxTier}`, x + indicatorWidth / 2, startY + indicatorHeight + 2);
            }

            this.ctx.font = '10px sans-serif';
            this.ctx.textAlign = 'center';
            this.ctx.fillStyle = '#aaa';
            this.ctx.fillText(paths.join(' | '), tower.position.x, startY + indicatorHeight + 14);
        }
    }

    private drawTargetingModeButtons(buttons: any[]): void {
        for (const btn of buttons) {
            this.ctx.fillStyle = btn.isSelected ? btn.color : '#333';
            this.ctx.fillRect(btn.position.x, btn.position.y, btn.size.width, btn.size.height);
            this.ctx.strokeStyle = btn.isSelected ? '#fff' : '#555';
            this.ctx.lineWidth = 2;
            this.ctx.strokeRect(btn.position.x, btn.position.y, btn.size.width, btn.size.height);
            
            this.ctx.fillStyle = '#fff';
            this.ctx.font = '12px sans-serif';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText(btn.label, btn.position.x + btn.size.width / 2, btn.position.y + btn.size.height / 2);
        }
    }

    private drawSellButton(button: any | null): void {
        if (!button) return;
        
        this.ctx.fillStyle = '#8B0000';
        this.ctx.fillRect(button.position.x, button.position.y, button.size.width, button.size.height);
        this.ctx.strokeStyle = '#FF4444';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(button.position.x, button.position.y, button.size.width, button.size.height);
        
        this.ctx.fillStyle = '#fff';
        this.ctx.font = 'bold 14px sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(`Sell $${button.sellValue}`, button.position.x + button.size.width / 2, button.position.y + button.size.height / 2);
    }

    private drawHUD(renderData: GameFrameRenderData): void {
        this.drawMapSelection(renderData.mapSelection);
        this.drawWaveAnnouncement(renderData.waveAnnouncement);
        this.drawPauseMenu(renderData.pauseMenu);
        this.drawWaveProgress(renderData.waveProgress);
        this.drawGameOverVictory(renderData.gameOverVictory);
        this.drawTowerInfoPanel(renderData.towerInfoPanel);
        this.drawLivesMoney(renderData.livesMoneyDisplay);
        this.drawEnemyCount(renderData.enemyCountDisplay);
        this.drawTowerPurchase(renderData.towerPurchase);
        this.drawStartWaveButton();
    }

    private isWaveButtonVisible(): boolean {
        const state = this.game.getState();
        if (state !== GameState.Playing && state !== GameState.Idle) return false;
        const rm = this.game.getRoundManager();
        const roundState = rm.getState();
        return roundState === RoundState.Idle || roundState === RoundState.Intermission;
    }

    private getStartWaveButtonRect(): { x: number; y: number; w: number; h: number } {
        return { x: CANVAS_WIDTH / 2 - 80, y: CANVAS_HEIGHT - 130, w: 160, h: 36 };
    }

    private drawStartWaveButton(): void {
        if (!this.isWaveButtonVisible()) return;

        const rm = this.game.getRoundManager();
        const roundState = rm.getState();
        const roundInfo = rm.getRoundInfo();
        const isFirstWave = roundState === RoundState.Idle;
        const nextWaveNumber = isFirstWave ? 1 : roundInfo.roundNumber + 1;
        const label = isFirstWave
            ? 'Start Wave 1  [Enter]'
            : `Next Wave ${nextWaveNumber}  [Enter]`;

        const { x, y, w, h } = this.getStartWaveButtonRect();

        // Pulsing glow to draw attention
        const pulse = 0.7 + 0.3 * Math.sin(Date.now() / 300);

        this.ctx.save();
        this.ctx.shadowColor = '#4ade80';
        this.ctx.shadowBlur = 12 * pulse;

        this.ctx.fillStyle = `rgba(34, 120, 60, ${0.85 * pulse})`;
        this.ctx.beginPath();
        this.ctx.roundRect(x, y, w, h, 6);
        this.ctx.fill();

        this.ctx.strokeStyle = '#4ade80';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.roundRect(x, y, w, h, 6);
        this.ctx.stroke();

        this.ctx.shadowBlur = 0;
        this.ctx.fillStyle = '#fff';
        this.ctx.font = 'bold 15px sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(label, x + w / 2, y + h / 2);
        this.ctx.restore();
    }

    private drawMapSelection(mapSelection: MapSelectionRenderData | null): void {
        if (!mapSelection || !mapSelection.isVisible) return;

        this.ctx.globalAlpha = mapSelection.opacity;

        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
        this.ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        this.ctx.fillStyle = mapSelection.titleColor;
        this.ctx.font = 'bold 36px sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(mapSelection.title, mapSelection.titlePosition.x, mapSelection.titlePosition.y);

        for (const card of mapSelection.cards) {
            const x = card.position.x;
            const y = card.position.y;
            const w = card.size.width;
            const h = card.size.height;

            this.ctx.fillStyle = card.cardColor;
            this.ctx.fillRect(x, y, w, h);
            this.ctx.strokeStyle = card.borderColor;
            this.ctx.lineWidth = card.borderWidth;
            this.ctx.strokeRect(x, y, w, h);

            this.ctx.fillStyle = '#fff';
            this.ctx.font = 'bold 16px sans-serif';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'top';
            this.ctx.fillText(card.name, x + w / 2, y + 10);

            this.ctx.fillStyle = card.difficultyColor;
            this.ctx.font = '12px sans-serif';
            this.ctx.fillText(card.difficultyLabel, x + w / 2, y + 32);

            this.ctx.fillStyle = card.themeColor;
            this.ctx.fillText(card.themeLabel, x + w / 2, y + 48);

            this.ctx.fillStyle = '#aaa';
            this.ctx.font = '10px sans-serif';
            this.ctx.fillText(`Waves: ${card.maxWaves}`, x + w / 2, y + 70);
            this.ctx.fillText(`Towers: ${card.towerCount}`, x + w / 2, y + 84);
            this.ctx.fillText(`$${card.startingMoneyLabel}`, x + w / 2, y + 98);
            this.ctx.fillText(`♥${card.startingLivesLabel}`, x + w / 2, y + 112);

            if (card.isLocked) {
                this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
                this.ctx.fillRect(x, y, w, h);
                this.ctx.fillStyle = '#888';
                this.ctx.font = 'bold 14px sans-serif';
                this.ctx.fillText('🔒 LOCKED', x + w / 2, y + h / 2);
            }
        }

        this.ctx.globalAlpha = 1;
    }

    private drawWaveAnnouncement(wa: WaveUIAnnouncementRenderData): void {
        const a = wa.announcement;
        if (!a.isVisible) return;

        this.ctx.globalAlpha = a.opacity;
        this.ctx.fillStyle = a.backgroundColor || '#000';
        this.ctx.fillRect(0, CANVAS_HEIGHT / 2 - 80, CANVAS_WIDTH, 160);

        this.ctx.fillStyle = a.textColor || '#FFD700';
        this.ctx.font = 'bold 48px sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(`Wave ${a.waveNumber}`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 20);

        this.ctx.fillStyle = a.subtextColor || '#fff';
        this.ctx.font = '24px sans-serif';
        this.ctx.fillText(a.waveName || '', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 30);

        this.ctx.globalAlpha = 1;
    }

    private drawPauseMenu(menu: PauseMenuRenderData | null): void {
        if (!menu || menu.state === 'hidden') return;

        const opacity = menu.backgroundOpacity ?? 1;

        // Dim background overlay
        this.ctx.globalAlpha = opacity * 0.5;
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        // Panel background
        const panelW = menu.size.width;
        const panelH = menu.size.height;
        const panelX = CANVAS_WIDTH / 2 - panelW / 2;
        const panelY = CANVAS_HEIGHT / 2 - panelH / 2;

        this.ctx.globalAlpha = opacity;
        this.ctx.fillStyle = 'rgba(15, 15, 30, 0.95)';
        this.ctx.fillRect(panelX, panelY, panelW, panelH);
        this.ctx.strokeStyle = menu.borderColor || '#FFD700';
        this.ctx.lineWidth = menu.borderWidth || 2;
        this.ctx.strokeRect(panelX, panelY, panelW, panelH);

        // Title
        this.ctx.fillStyle = menu.titleColor || '#fff';
        this.ctx.font = 'bold 40px sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(menu.title || 'PAUSED', CANVAS_WIDTH / 2, panelY + 50);

        // Subtitle
        if (menu.subtitle) {
            this.ctx.fillStyle = menu.subtitleColor || '#aaa';
            this.ctx.font = '16px sans-serif';
            this.ctx.fillText(menu.subtitle, CANVAS_WIDTH / 2, panelY + 90);
        }

        // Buttons
        for (const btn of menu.buttons) {
            const bx = CANVAS_WIDTH / 2 - btn.size.width / 2;
            const by = btn.position.y + CANVAS_HEIGHT / 2 - menu.position.y;

            this.ctx.fillStyle = '#2a2a3e';
            this.ctx.fillRect(bx, by, btn.size.width, btn.size.height);
            this.ctx.strokeStyle = '#666';
            this.ctx.lineWidth = 1;
            this.ctx.strokeRect(bx, by, btn.size.width, btn.size.height);

            this.ctx.fillStyle = '#fff';
            this.ctx.font = 'bold 18px sans-serif';
            this.ctx.fillText(btn.label, CANVAS_WIDTH / 2, by + btn.size.height / 2);
        }

        // Settings controls
        const settingsY = panelY + panelH - 90;
        const cx = CANVAS_WIDTH / 2;

        // Volume bar
        this.ctx.fillStyle = '#888';
        this.ctx.font = '14px sans-serif';
        this.ctx.textAlign = 'left';
        this.ctx.fillText('Volume', cx - 100, settingsY + 4);

        const barX = cx - 30;
        const barW = 120;
        const barH = 8;
        const vol = this.audio.getVolume();

        // Track
        this.ctx.fillStyle = '#333';
        this.ctx.fillRect(barX, settingsY - barH / 2, barW, barH);
        // Fill
        this.ctx.fillStyle = '#4ade80';
        this.ctx.fillRect(barX, settingsY - barH / 2, barW * vol, barH);
        // Border
        this.ctx.strokeStyle = '#555';
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(barX, settingsY - barH / 2, barW, barH);
        // Handle
        const handleX = barX + barW * vol;
        this.ctx.beginPath();
        this.ctx.arc(handleX, settingsY, 6, 0, Math.PI * 2);
        this.ctx.fillStyle = '#4ade80';
        this.ctx.fill();
        this.ctx.strokeStyle = '#fff';
        this.ctx.stroke();

        // Mute button
        const muteX = cx - 100;
        const muteY = settingsY + 25;
        const muteW = 90;
        const muteH = 28;
        this.ctx.fillStyle = this.audio.isMuted() ? '#E74C3C' : '#2a2a3e';
        this.ctx.fillRect(muteX, muteY, muteW, muteH);
        this.ctx.strokeStyle = '#666';
        this.ctx.strokeRect(muteX, muteY, muteW, muteH);
        this.ctx.fillStyle = '#fff';
        this.ctx.font = '13px sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(this.audio.isMuted() ? 'Unmute' : 'Mute', muteX + muteW / 2, muteY + muteH / 2 + 1);

        // Speed selector
        const speedLabels = ['1x', '2x', '3x'];
        const speeds = [GameSpeed.Normal, GameSpeed.Fast, GameSpeed.Faster];
        const currentSpeed = this.game.getGameSpeed ? this.game.getGameSpeed() : GameSpeed.Normal;
        const speedBtnW = 40;
        const speedBtnH = 28;
        const speedStartX = cx + 20;

        this.ctx.fillStyle = '#888';
        this.ctx.font = '14px sans-serif';
        this.ctx.textAlign = 'left';
        this.ctx.fillText('Speed', muteX + muteW + 20, muteY + muteH / 2 + 1);

        for (let si = 0; si < 3; si++) {
            const sx = speedStartX + si * (speedBtnW + 5);
            const isActive = currentSpeed === speeds[si];
            this.ctx.fillStyle = isActive ? '#4ade80' : '#2a2a3e';
            this.ctx.fillRect(sx, muteY, speedBtnW, speedBtnH);
            this.ctx.strokeStyle = isActive ? '#fff' : '#666';
            this.ctx.lineWidth = 1;
            this.ctx.strokeRect(sx, muteY, speedBtnW, speedBtnH);
            this.ctx.fillStyle = isActive ? '#000' : '#fff';
            this.ctx.font = 'bold 13px sans-serif';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(speedLabels[si], sx + speedBtnW / 2, muteY + speedBtnH / 2 + 1);
        }

        this.ctx.globalAlpha = 1;
    }

    private drawWaveProgress(progress: WaveProgressRenderData): void {
        if (progress.state === 'hidden') return;
        
        const x = CANVAS_WIDTH - 220;
        const y = 20;
        const width = 200;
        const height = 30;
        
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.fillRect(x - 10, y - 10, width + 20, height + 60);
        
        this.ctx.fillStyle = '#fff';
        this.ctx.font = '16px sans-serif';
        this.ctx.textAlign = 'left';
        this.ctx.fillText(`Wave ${progress.currentWave}/${progress.totalWaves}`, x, y + 10);
        
        this.ctx.fillStyle = '#333';
        this.ctx.fillRect(x, y + 25, width, height);
        
        const fillWidth = width * progress.enemyProgress;
        this.ctx.fillStyle = '#4CAF50';
        this.ctx.fillRect(x, y + 25, fillWidth, height);
        
        this.ctx.fillStyle = '#fff';
        this.ctx.font = '12px sans-serif';
        this.ctx.fillText(`${progress.enemiesDefeated}/${progress.enemiesTotal}`, x, y + 55);
    }

    private drawGameOverVictory(gov: GameOverVictoryRenderData): void {
        if (gov.state === 'hidden') return;
        
        this.ctx.globalAlpha = gov.opacity || 1;
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
        this.ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        
        this.ctx.fillStyle = gov.state === 'game_over' ? '#FF4444' : '#FFD700';
        this.ctx.font = 'bold 64px sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(gov.state === 'game_over' ? 'GAME OVER' : 'VICTORY!', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 60);
        
        this.ctx.fillStyle = '#fff';
        this.ctx.font = '24px sans-serif';
        this.ctx.fillText(`Final Score: ${gov.finalScore}`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 10);
        this.ctx.fillText(`Wave Reached: ${gov.finalWave}`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 50);
        
        this.ctx.font = '18px sans-serif';
        this.ctx.fillText('Click to restart', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 120);
        
        this.ctx.globalAlpha = 1;
    }

    private drawTowerInfoPanel(panel: TowerInfoPanelRenderData | null): void {
        if (!panel || !panel.isVisible) return;
        
        const width = 280;
        const height = panel.isExpanded ? 350 : 200;
        const x = 20;
        const y = CANVAS_HEIGHT - height - 20;
        
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
        this.ctx.fillRect(x, y, width, height);
        this.ctx.strokeStyle = '#555';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(x, y, width, height);
        
        this.ctx.fillStyle = '#fff';
        this.ctx.font = 'bold 18px sans-serif';
        this.ctx.textAlign = 'left';
        this.ctx.fillText(panel.towerName, x + 15, y + 30);
        
        this.ctx.font = '14px sans-serif';
        this.ctx.fillStyle = '#aaa';
        this.ctx.fillText(`Type: ${panel.towerType}`, x + 15, y + 55);
        
        let statY = y + 85;
        for (const stat of panel.stats) {
            this.ctx.fillStyle = stat.isUpgrade ? '#4CAF50' : '#fff';
            this.ctx.fillText(`${stat.label}: ${stat.value}`, x + 15, statY);
            statY += 22;
        }
    }

    private drawLivesMoney(lm: LivesMoneyDisplayRenderData): void {
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.fillRect(10, 10, 300, 40);

        this.ctx.font = 'bold 18px sans-serif';
        this.ctx.textBaseline = 'middle';
        this.ctx.textAlign = 'left';

        this.ctx.fillStyle = '#FF4444';
        this.ctx.fillText(`♥ ${lm.lives.currentLives}/${lm.lives.maxLives}`, 20, 30);

        this.ctx.fillStyle = '#FFD700';
        this.ctx.fillText(`$ ${lm.money.currentMoney}`, 170, 30);
    }

    private drawEnemyCount(ec: EnemyCountDisplayRenderData): void {
        if (!ec.isVisible) return;
        
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.fillRect(CANVAS_WIDTH / 2 - 60, 75, 120, 30);
        
        this.ctx.fillStyle = '#fff';
        this.ctx.font = '16px sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(`Enemies: ${ec.enemyCount.currentCount}`, CANVAS_WIDTH / 2, 95);
    }

    private drawTowerPurchase(purchase: TowerPurchaseRenderData | null): void {
        if (!purchase || !purchase.isVisible) return;
        
        const BUTTON_WIDTH = 120;
        const BUTTON_HEIGHT = 80;
        const BUTTON_SPACING = 10;
        const BUTTON_COUNT = 5;
        
        const totalWidth = BUTTON_COUNT * BUTTON_WIDTH + (BUTTON_COUNT - 1) * BUTTON_SPACING;
        const startX = CANVAS_WIDTH / 2 - totalWidth / 2;
        const startY = CANVAS_HEIGHT - BUTTON_HEIGHT - 20;
        
        const TOWER_TYPES = [
            TowerType.PuffballFungus,
            TowerType.OrchidTrap,
            TowerType.VenusFlytower,
            TowerType.BioluminescentShroom,
            TowerType.StinkhornLine,
        ];
        
        const LABELS: Record<TowerType, string> = {
            [TowerType.PuffballFungus]: 'Puffball',
            [TowerType.OrchidTrap]: 'Orchid',
            [TowerType.VenusFlytower]: 'Venus',
            [TowerType.BioluminescentShroom]: 'BioLumi',
            [TowerType.StinkhornLine]: 'Stinkhorn',
            [TowerType.MyceliumNetwork]: 'Mycelium',
        };
        
        const HOTKEYS: Record<TowerType, string> = {
            [TowerType.PuffballFungus]: '1',
            [TowerType.OrchidTrap]: '2',
            [TowerType.VenusFlytower]: '3',
            [TowerType.BioluminescentShroom]: '4',
            [TowerType.StinkhornLine]: '5',
            [TowerType.MyceliumNetwork]: '6',
        };
        
        for (let i = 0; i < BUTTON_COUNT; i++) {
            const towerType = TOWER_TYPES[i];
            const button = purchase.buttons.find(b => b.towerType === towerType);
            if (!button) continue;
            
            const x = startX + i * (BUTTON_WIDTH + BUTTON_SPACING);
            const y = startY;
            
            this.ctx.fillStyle = button.canAfford ? 'rgba(0, 0, 0, 0.8)' : 'rgba(50, 50, 50, 0.8)';
            this.ctx.fillRect(x, y, BUTTON_WIDTH, BUTTON_HEIGHT);
            
            this.ctx.strokeStyle = button.canAfford ? '#4CAF50' : '#666';
            this.ctx.lineWidth = 2;
            this.ctx.strokeRect(x, y, BUTTON_WIDTH, BUTTON_HEIGHT);
            
            this.ctx.fillStyle = button.canAfford ? '#FFD700' : '#888';
            this.ctx.font = 'bold 12px sans-serif';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'top';
            this.ctx.fillText(LABELS[towerType], x + BUTTON_WIDTH / 2, y + 5);
            
            this.ctx.fillStyle = button.canAfford ? '#4CAF50' : '#F44336';
            this.ctx.font = 'bold 14px sans-serif';
            this.ctx.fillText(`$${button.cost}`, x + BUTTON_WIDTH / 2, y + 22);
            
            this.ctx.fillStyle = button.canAfford ? '#aaa' : '#666';
            this.ctx.font = '10px sans-serif';
            this.ctx.fillText(`[${HOTKEYS[towerType]}]`, x + BUTTON_WIDTH / 2, y + BUTTON_HEIGHT - 15);
        }
    }
}

window.addEventListener('DOMContentLoaded', () => {
    new Game();
});
