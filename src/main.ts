import { GameRunner, GameState, PlacementState, PlacedTower, GameSpeed } from './systems/gameRunner';
import type { GameEvent } from './systems/gameEvents';
import { RoundState } from './systems/roundManager';
import { createWaveControls, getStartWaveButtonRect, getStartWaveLabel, WaveControls } from './systems/waveControls';
import { GameRenderer, GameFrameRenderData, createGameRenderer, PathRenderData, PathSegmentRenderData, NetworkConnectionRenderData, LingeringFieldRenderData, SeededPayloadRenderData } from './systems/gameRenderer';
import { GameLoop, createGameLoop } from './systems/gameLoop';
import { processHotkey, findHotkeyAction, HotkeyAction } from './systems/hotkeys';
import { TowerType, TOWER_STATS } from './entities/tower';
import { TargetingMode } from './systems/targeting';
import { Vec2 } from './utils/vec2';
import { TowerGrowthStage, getTowerBodyShape } from './systems/towerRender';
import {
    getSellButtonAtPosition,
    PlacementPreviewWithTargetingRenderData,
    TowerSelectionPreviewRenderData,
} from './systems/placementPreview';
import { HealthBarRenderData } from './systems/healthBarRender';
import { WaveUIAnnouncementRenderData } from './systems/waveAnnouncementRender';
import { getPauseMenuButtonAtPosition, PauseMenuRenderData } from './systems/pauseMenuRender';
import { WaveProgressRenderData } from './systems/waveProgressRender';
import { getGameOverVictoryButtonAtPosition, GameOverVictoryRenderData } from './systems/gameOverVictoryRender';
import {
    EVOLUTION_CARD_SELECTED_BACKGROUND_COLOR,
    getEvolutionCardStatusColor,
    type TowerInfoPanelRenderData,
} from './systems/towerInfoPanel';
import {
    routeTowerInfoPanelClick,
    type TowerInfoPanelClickRoute,
} from './systems/towerInfoPanelInput';
import { LivesMoneyDisplayRenderData, formatNutrients } from './systems/livesMoneyDisplayRender';
import { EnemyCountDisplayRenderData } from './systems/enemyCountDisplayRender';
import {
    TowerPurchaseRenderData,
    getTowerPurchaseButtonAtPosition as getTowerPurchaseButtonFromRenderData,
    getTowerPurchaseRenderData,
} from './systems/towerPurchaseRender';
import { MapSelectionRenderData } from './systems/mapSelectionRender';
import { getMapSelectionButtonAtPosition } from './systems/mapSelectionRender';
import { AudioManager, createAudioManager, isBossWave } from './systems/audioManager';
import { RELEASE_FEATURES, RELEASE_MAP_ID } from './systems/releaseScope';
import { canHandleGameplayInput, getActiveUiLayer, UiGateState, UiLayer } from './systems/uiInputGate';
import {
    getReleaseHudRegionAtPosition,
    getPauseSettingsControlAtPosition,
    RELEASE_CAMERA,
    RELEASE_HUD_LAYOUT,
    type Rect,
} from './systems/releaseHudLayout';
import type { TraitShape } from './systems/traitVisuals';
import type { WavePreviewRenderData } from './systems/wavePreviewRender';
import {
    OnboardingAction,
    OnboardingStep,
    createOnboardingState,
    type OnboardingState,
} from './systems/onboarding';
import {
    drainGameEventsForOnboarding,
    isNewOnboardingCompletion,
} from './systems/onboardingIntegration';
import {
    applyOnboardingControl,
    getOnboardingKeyboardControl,
    getOnboardingPointerControl,
    isOnboardingPromptAtPosition,
    routeOnboardingCommand,
    type OnboardingCommandRoute,
    type OnboardingControl,
} from './systems/onboardingInput';
import {
    projectOnboardingReach,
    type OnboardingRenderData,
} from './systems/onboardingRender';

const CANVAS_WIDTH = RELEASE_HUD_LAYOUT.canvas.width;
const CANVAS_HEIGHT = RELEASE_HUD_LAYOUT.canvas.height;

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
    scout_beetle: '#E74C3C',
    dart_wasp: '#3498DB',
    shell_beetle: '#27AE60',
    crawler_caterpillar: '#F1C40F',
    swarm_wasp: '#E91E90',
    iron_caterpillar: '#2C3E50',
    veil_wasp: '#ECF0F1',
    bulwark_beetle: '#7F8C8D',
    ward_moth: '#9B59B6',
    pale_moth: '#E67E22',
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

    /** Slimefungus slow hit - ice crystal shards */
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

    /** Bulb Shooter poison hit - lingering toxic wisps */
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

    /** Thorn Sniper instakill - red snap/chomp flash */
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

    /** Lumen Oracle reveal - cyan expanding pulse */
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
    processEvents(events: readonly GameEvent[]): void {
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

    spawnNetworkBloom(x: number, y: number): void {
        this.spawn({
            x, y,
            size: 12, sizeEnd: 160,
            life: 0.8, maxLife: 0.8,
            color: '#4ADE80', alpha: 0.9, alphaEnd: 0,
            shape: 'ring',
        });
        for (let index = 0; index < 12; index++) {
            const angle = (Math.PI * 2 * index) / 12;
            this.spawn({
                x, y,
                vx: Math.cos(angle) * 90,
                vy: Math.sin(angle) * 90,
                life: 0.55, maxLife: 0.55,
                size: 4, sizeEnd: 1,
                color: '#C084FC', alpha: 0.9, alphaEnd: 0,
                shape: 'spark',
                rotation: angle,
            });
        }
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
    private waveControls: WaveControls;
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
    private onboarding: OnboardingState = createOnboardingState(true);
    private onboardingPulseUntil: number = 0;

    constructor() {
        this.canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
        this.ctx = this.canvas.getContext('2d')!;

        this.game = new GameRunner();
        this.waveControls = createWaveControls(this.game);
        this.renderer = createGameRenderer();
        this.loop = createGameLoop(this.game, this.renderer);

        this.mouse = { x: 0, y: 0, down: false };
        this.audio = createAudioManager();
        this.particles = new ParticleSystem();

        this.setupEventListeners();
        this.renderer.setCamera(RELEASE_CAMERA);
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
            ctx.fillText('Mycelium TD', CANVAS_WIDTH / 2, titleY);

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

            const replay = this.getCurrentOnboardingRenderData().replayButton;
            if (replay) {
                ctx.fillStyle = 'rgba(155, 89, 182, 0.16)';
                ctx.fillRect(replay.rect.x, replay.rect.y, replay.rect.width, replay.rect.height);
                ctx.strokeStyle = '#C084FC';
                ctx.lineWidth = 2;
                ctx.strokeRect(replay.rect.x, replay.rect.y, replay.rect.width, replay.rect.height);
                ctx.fillStyle = '#FFFFFF';
                ctx.font = 'bold 18px sans-serif';
                ctx.fillText(
                    `${replay.label} [${replay.hotkey}]`,
                    replay.rect.x + replay.rect.width / 2,
                    replay.rect.y + replay.rect.height / 2,
                );
            }

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
        this.startReleaseRun();
        this.audio.ensureInitialized();
        this.audio.playNormalTrack();
        this.loop.start();
        this.loop.setRenderCallback(this.render.bind(this));
        // Player places towers first, then clicks "Start Wave"
    }

    private startReleaseRun(): void {
        this.game.reset();
        if (!this.game.setMap(RELEASE_MAP_ID)) {
            throw new Error(`Unable to start release map: ${RELEASE_MAP_ID}`);
        }
        this.game.start();
        this.showingMenu = false;
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

    private getCurrentOnboardingRenderData(): OnboardingRenderData {
        return this.renderer.getOnboardingRenderData(
            this.game,
            this.onboarding,
            performance.now() < this.onboardingPulseUntil,
        );
    }

    private transitionOnboarding(
        next: OnboardingState,
        bloomPosition: Readonly<Vec2> | null = null,
    ): void {
        const previous = this.onboarding;
        this.onboarding = next;
        if (!isNewOnboardingCompletion(previous, next)) return;

        const path = this.game.getPath();
        const position = bloomPosition
            ?? path.getPointAtDistance(path.getTotalLength()).position;
        this.particles.spawnNetworkBloom(position.x, position.y);
    }

    private handleOnboardingControl(control: OnboardingControl): void {
        this.transitionOnboarding(applyOnboardingControl(this.onboarding, control));
    }

    private runOnboardingCommand<T>(
        action: OnboardingAction,
        command: () => T,
    ): OnboardingCommandRoute<T> {
        const result = routeOnboardingCommand(this.onboarding, action, command);
        if (result.kind === 'blocked') {
            this.onboardingPulseUntil = performance.now() + 280;
        }
        return result;
    }

    private getTowerOnboardingAction(towerType: TowerType): OnboardingAction {
        return towerType === TowerType.Sporecap
            ? OnboardingAction.PlaceSporecap
            : OnboardingAction.PlaceAnyTower;
    }

    private getPlacementOnboardingAction(): OnboardingAction {
        const towerType = this.game.getSelectedTowerType();
        return towerType === null
            ? OnboardingAction.ManageTower
            : this.getTowerOnboardingAction(towerType);
    }

    private getWorldClickOnboardingAction(x: number, y: number): OnboardingAction {
        const placementState = this.game.getPlacementState();
        if (placementState === PlacementState.Placing) {
            return this.getPlacementOnboardingAction();
        }
        if (placementState === PlacementState.Selecting) {
            const sellButton = this.game.getTowerSelectionPreviewRenderData().sellButton;
            return sellButton !== null && getSellButtonAtPosition(sellButton, x, y)
                ? OnboardingAction.ModifyTower
                : OnboardingAction.ManageTower;
        }
        return OnboardingAction.ManageTower;
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
        if (!canHandleGameplayInput(this.getUiGateState())) return;

        const world = this.screenToWorld(e.clientX, e.clientY);
        this.mouse.x = world.x;
        this.mouse.y = world.y;
        
        if (this.game.getPlacementState() === PlacementState.Placing) {
            this.runOnboardingCommand(
                this.getPlacementOnboardingAction(),
                () => this.game.updatePlacementPosition(world.x, world.y),
            );
        }
    }

    private onMouseDown(e: MouseEvent): void {
        this.mouse.down = true;

        const rect = this.canvas.getBoundingClientRect();
        const screenX = (e.clientX - rect.left) * (CANVAS_WIDTH / rect.width);
        const screenY = (e.clientY - rect.top) * (CANVAS_HEIGHT / rect.height);
        const layer = getActiveUiLayer(this.getUiGateState());

        if (layer === UiLayer.Menu) {
            const control = getOnboardingPointerControl(
                this.getCurrentOnboardingRenderData(),
                screenX,
                screenY,
            );
            if (control === 'replay') {
                this.handleOnboardingControl(control);
                return;
            }
            this.startGame();
            return;
        }

        if (layer === UiLayer.Terminal) {
            const terminal = this.game.getGameOverVictoryRenderData();
            const button = getGameOverVictoryButtonAtPosition(terminal, screenX, screenY);
            if (e.button === 0 && button?.id === 'restart') this.restartGame();
            if (e.button === 0 && button?.id === 'quit') this.quitToMenu();
            return;
        }

        if (layer === UiLayer.Pause) {
            const btnId = this.getPauseButtonAtScreen(screenX, screenY);
            if (btnId) {
                if (btnId === 'resume') {
                    this.runOnboardingCommand(OnboardingAction.Pause, () => {
                        this.game.resume();
                        this.audio.resume();
                    });
                }
                else if (btnId === 'restart') this.restartGame();
                else if (btnId === 'quit') this.quitToMenu();
                return;
            }
            // Settings controls in pause menu
            if (this.handlePauseSettingsClick(screenX, screenY)) return;
            return;
        }

        const onboardingRenderData = this.getCurrentOnboardingRenderData();
        const onboardingControl = getOnboardingPointerControl(
            onboardingRenderData,
            screenX,
            screenY,
        );
        if (onboardingControl === 'skip' || onboardingControl === 'open_preview') {
            this.handleOnboardingControl(onboardingControl);
            return;
        }
        if (isOnboardingPromptAtPosition(onboardingRenderData, screenX, screenY)) return;

        if (this.game.getPlacementState() === PlacementState.Selecting) {
            const panel = this.game.getTowerInfoPanelRenderData();
            const panelRoute = routeTowerInfoPanelClick(panel, screenX, screenY);
            if (panelRoute.consumed) {
                const action = panelRoute.action !== null && e.button === 0
                    ? OnboardingAction.ModifyTower
                    : OnboardingAction.ManageTower;
                const growthRoute = this.runOnboardingCommand(
                    action,
                    () => this.handleTowerGrowthClick(panel, panelRoute, e.button === 0),
                );
                if (growthRoute.kind === 'blocked' || growthRoute.value) return;
            }
        }

        if (e.button === 2) {
            this.runOnboardingCommand(OnboardingAction.ManageTower, () => {
                this.game.cancelPlacement();
                this.game.deselectTower();
            });
            return;
        }
        
        const mapRenderData = this.game.getMapSelectionRenderData();
        if (RELEASE_FEATURES.mapSelection && mapRenderData && mapRenderData.isVisible) {
            const mapId = getMapSelectionButtonAtPosition(screenX, screenY, mapRenderData);
            if (mapId) {
                this.runOnboardingCommand(OnboardingAction.ChangeMap, () => {
                    this.game.selectMap(mapId);
                    this.game.hideMapSelectionUI();
                });
                return;
            }
        }
        
        // Start Wave button
        if (this.isWaveButtonVisible()) {
            const btn = this.getStartWaveButtonRect();
            if (screenX >= btn.x && screenX <= btn.x + btn.width && screenY >= btn.y && screenY <= btn.y + btn.height) {
                this.runOnboardingCommand(OnboardingAction.StartWave, () => this.startNextWave());
                return;
            }
        }

        const towerType = this.getTowerPurchaseButtonAtPosition(screenX, screenY);
        if (towerType !== null && this.game.getPlacementState() === PlacementState.None) {
            this.runOnboardingCommand(
                this.getTowerOnboardingAction(towerType),
                () => this.game.startTowerPlacement(towerType),
            );
            return;
        }

        if (getReleaseHudRegionAtPosition(screenX, screenY) !== null) return;

        const world = this.screenToWorld(e.clientX, e.clientY);
        this.runOnboardingCommand(
            this.getWorldClickOnboardingAction(world.x, world.y),
            () => this.handleClick(world.x, world.y, e.button === 0),
        );
    }
    
    private getPauseButtonAtScreen(sx: number, sy: number): string | null {
        return getPauseMenuButtonAtPosition(sx, sy, this.game.getPauseMenuRenderData());
    }

    private handlePauseSettingsClick(sx: number, sy: number): boolean {
        const control = getPauseSettingsControlAtPosition(sx, sy);
        switch (control) {
            case 'music_volume': {
                const { musicVolumeBar } = RELEASE_HUD_LAYOUT.pauseSettings;
                const volume = Math.max(0, Math.min(1, (sx - musicVolumeBar.x) / musicVolumeBar.width));
                this.audio.setMusicVolume(volume);
                return true;
            }
            case 'sound_volume': {
                const { soundVolumeBar } = RELEASE_HUD_LAYOUT.pauseSettings;
                const volume = Math.max(0, Math.min(1, (sx - soundVolumeBar.x) / soundVolumeBar.width));
                this.audio.setSoundVolume(volume);
                return true;
            }
            case 'mute':
                this.audio.toggleMute();
                return true;
            case 'speed_normal':
                this.runOnboardingCommand(
                    OnboardingAction.AdjustSpeed,
                    () => this.game.setGameSpeed(GameSpeed.Normal),
                );
                return true;
            case 'speed_fast':
                this.runOnboardingCommand(
                    OnboardingAction.AdjustSpeed,
                    () => this.game.setGameSpeed(GameSpeed.Fast),
                );
                return true;
            case 'speed_faster':
                this.runOnboardingCommand(
                    OnboardingAction.AdjustSpeed,
                    () => this.game.setGameSpeed(GameSpeed.Faster),
                );
                return true;
            case null:
                return false;
            default:
                control satisfies never;
                return false;
        }
    }

    private getTowerPurchaseButtonAtPosition(screenX: number, screenY: number): TowerType | null {
        const economy = this.game.getEconomy();
        const purchase = getTowerPurchaseRenderData(
            false,
            this.game.getSelectedTowerType(),
            economy.getMoney(),
            towerType => economy.canAfford(TOWER_STATS[towerType].cost),
        );
        return getTowerPurchaseButtonFromRenderData(purchase.buttons, screenX, screenY);
    }

    private onMouseUp(_e: MouseEvent): void {
        this.mouse.down = false;
    }

    private handleClick(x: number, y: number, leftClick: boolean): void {
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
            const sellButton = this.game.getTowerSelectionPreviewRenderData().sellButton;
            if (sellButton !== null && getSellButtonAtPosition(sellButton, x, y)) {
                const sellResult = this.game.sellTowerAtPosition(x, y);
                if (sellResult.status === 'sold') return;
                if (sellResult.status === 'confirmation_required') {
                    const towerList = sellResult.disconnectLabels.join(', ');
                    const confirmed = window.confirm(
                        `Selling this bridge will isolate ${sellResult.disconnects.length} downstream tower(s): ${towerList}. Sell anyway?`
                    );
                    if (confirmed) {
                        this.game.sellTowerAtPosition(x, y, true);
                    }
                }
                return;
            }
            this.game.deselectTower();
        } else {
            const towerSelected = this.game.selectTowerAtPosition(x, y);
            if (!towerSelected) {
            }
        }
    }

    private handleTowerGrowthClick(
        panel: TowerInfoPanelRenderData,
        route: TowerInfoPanelClickRoute,
        activateAction: boolean,
    ): boolean {
        if (!route.consumed || !route.action || !activateAction) return route.consumed;

        switch (route.action.kind) {
            case 'mature':
                this.game.matureTower(panel.towerId);
                break;
            case 'evolve':
                this.game.evolveTower(panel.towerId, route.action.path);
                break;
            default:
                route.action satisfies never;
        }
        return true;
    }

    private onKeyDown(e: KeyboardEvent): void {
        const layer = getActiveUiLayer(this.getUiGateState());

        if (layer === UiLayer.Menu) {
            const control = getOnboardingKeyboardControl(this.onboarding, e.key);
            if (control === 'replay') {
                this.handleOnboardingControl(control);
                return;
            }
            if (e.key === 'Enter' || e.key === ' ') {
                this.startGame();
            }
            return;
        }

        const result = findHotkeyAction(e.key);
        const action = result ? result.action : null;

        if (layer === UiLayer.Terminal) {
            if (e.key === 'Enter' || e.key === ' ') this.restartGame();
            else if (action === HotkeyAction.Cancel) this.quitToMenu();
            return;
        }

        if (layer === UiLayer.Pause) {
            if (action === HotkeyAction.Pause || action === HotkeyAction.Cancel) {
                this.runOnboardingCommand(OnboardingAction.Pause, () => {
                    this.game.resume();
                    this.audio.resume();
                });
            }
            return;
        }

        const onboardingControl = getOnboardingKeyboardControl(this.onboarding, e.key);
        if (onboardingControl === 'skip' || onboardingControl === 'open_preview') {
            this.handleOnboardingControl(onboardingControl);
            return;
        }

        if (RELEASE_FEATURES.mapSelection && action === HotkeyAction.SelectMap) {
            this.runOnboardingCommand(OnboardingAction.ChangeMap, () => {
                const mapState = this.game.getMapSelectionState();
                if (mapState.isSelecting) {
                    this.game.hideMapSelectionUI();
                } else {
                    this.game.showMapSelectionUI();
                }
            });
            return;
        }

        if (action === HotkeyAction.Pause) {
            this.runOnboardingCommand(OnboardingAction.Pause, () => {
                this.game.pause();
                this.audio.pause();
            });
            return;
        }

        if (action === HotkeyAction.SetSpeed1) {
            this.runOnboardingCommand(
                OnboardingAction.AdjustSpeed,
                () => this.game.setGameSpeed(GameSpeed.Normal),
            );
            return;
        }

        if (action === HotkeyAction.SetSpeed2) {
            this.runOnboardingCommand(
                OnboardingAction.AdjustSpeed,
                () => this.game.setGameSpeed(GameSpeed.Fast),
            );
            return;
        }

        if (action === HotkeyAction.SetSpeed3) {
            this.runOnboardingCommand(
                OnboardingAction.AdjustSpeed,
                () => this.game.setGameSpeed(GameSpeed.Faster),
            );
            return;
        }

        // Start / Next wave (Enter key)
        if (e.key === 'Enter') {
            this.runOnboardingCommand(OnboardingAction.StartWave, () => this.startNextWave());
            return;
        }

        // Mute toggle (N key - M is already used for map selection)
        if (e.key === 'n' || e.key === 'N') {
            this.runOnboardingCommand(OnboardingAction.ManageTower, () => this.audio.toggleMute());
            return;
        }

        if (action === HotkeyAction.Cancel) {
            this.runOnboardingCommand(OnboardingAction.ManageTower, () => {
                this.game.cancelPlacement();
                this.game.deselectTower();
            });
            return;
        }

        const towerKeys: Record<string, TowerType> = {
            '1': TowerType.Puffball,
            '2': TowerType.Slimefungus,
            '3': TowerType.ThornSniper,
            '4': TowerType.LumenOracle,
            '5': TowerType.BulbShooter,
            '6': TowerType.Sporecap,
        };

        if (towerKeys[e.key]) {
            if (this.game.getPlacementState() === PlacementState.None) {
                const towerType = towerKeys[e.key];
                this.runOnboardingCommand(
                    this.getTowerOnboardingAction(towerType),
                    () => this.game.startTowerPlacement(towerType),
                );
            }
        }
    }

    private getUiGateState(): UiGateState {
        return {
            gameState: this.game.getState(),
            menuVisible: this.showingMenu,
            pauseVisible: this.game.getPauseMenuRenderData().isVisible,
            tutorialBlocking: this.getCurrentOnboardingRenderData().isVisible,
        };
    }

    private restartGame(): void {
        if (this.onboarding.enabled && this.onboarding.step !== OnboardingStep.Complete) {
            this.onboarding = createOnboardingState(true);
        }
        this.game.reset();
        this.game.start();
        this.lastTrackedWaveIndex = -1;
        this.audio.playNormalTrack();
        this.particles.clear();
    }

    private quitToMenu(): void {
        if (this.onboarding.enabled && this.onboarding.step !== OnboardingStep.Complete) {
            this.onboarding = createOnboardingState(true);
        }
        this.showingMenu = true;
        this.loop.stop();
        this.game.reset();
        this.lastTrackedWaveIndex = -1;
        this.audio.stop();
        this.particles.clear();
        this.drawMenu();
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
        const eventResult = drainGameEventsForOnboarding(
            this.onboarding,
            () => this.game.drainEvents(),
            events => {
                this.particles.processEvents(events);
                this.audio.processGameEvents(events);
            },
        );
        this.transitionOnboarding(eventResult.state, eventResult.completionBloom);
        this.particles.update(particleDt);
        renderData.onboarding = this.getCurrentOnboardingRenderData();

        this.ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        this.ctx.save();
        this.ctx.translate(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
        this.ctx.scale(renderData.camera.zoom, renderData.camera.zoom);
        this.ctx.translate(-renderData.camera.x, -renderData.camera.y);

        this.drawPath(renderData.path);
        this.drawLingeringFields(renderData.lingeringFields);
        this.drawSeededPayloads(renderData.seededPayloads);
        this.drawNetworkConnections(renderData.networkConnections);
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

        if (preview.proposedConnection) {
            const connection = preview.proposedConnection;
            this.ctx.beginPath();
            this.ctx.moveTo(connection.sourcePosition.x, connection.sourcePosition.y);
            this.ctx.lineTo(connection.targetPosition.x, connection.targetPosition.y);
            this.ctx.strokeStyle = connection.sourceType === 'kernel' ? '#4ade80' : '#9B59B6';
            this.ctx.lineWidth = 3;
            this.ctx.setLineDash([8, 6]);
            this.ctx.stroke();
            this.ctx.setLineDash([]);
        }
        
        const size = ghost.size;
        const halfSize = size / 2;
        
        this.ctx.fillStyle = ghost.isValid ? 'rgba(100, 255, 100, 0.3)' : 'rgba(255, 100, 100, 0.3)';
        this.ctx.strokeStyle = ghost.isValid ? '#00ff00' : '#ff0000';
        this.ctx.lineWidth = 2;
        
        const typeMap: Record<TowerType, 'circle' | 'square' | 'diamond'> = {
            [TowerType.Puffball]: 'circle',
            [TowerType.Slimefungus]: 'diamond',
            [TowerType.ThornSniper]: 'square',
            [TowerType.LumenOracle]: 'circle',
            [TowerType.BulbShooter]: 'diamond',
            [TowerType.Sporecap]: 'circle',
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

        this.ctx.fillStyle = preview.willBeConnected ? '#4ade80' : '#F87171';
        this.ctx.font = 'bold 12px sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'bottom';
        this.ctx.fillText(
            preview.willBeConnected ? 'Connected' : 'Isolated',
            ghost.position.x,
            ghost.position.y - halfSize - 12
        );
        
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
    
    private drawNetworkConnections(connections: NetworkConnectionRenderData[]): void {
        if (connections.length === 0) return;

        const time = performance.now() / 1000;
        const ctx = this.ctx;

        for (const connection of connections) {
            const target = connection.targetPosition;

            const pulseAlpha = 0.15 + Math.sin(time * 3) * 0.08;
            ctx.beginPath();
            ctx.arc(target.x, target.y, 18, 0, Math.PI * 2);
            ctx.fillStyle = connection.sourceType === 'kernel'
                ? `rgba(74, 222, 128, ${pulseAlpha})`
                : `rgba(142, 68, 173, ${pulseAlpha})`;
            ctx.fill();

            const source = connection.sourcePosition;
            const dx = target.x - source.x;
            const dy = target.y - source.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const dashOffset = (time * 40) % 20;

            ctx.beginPath();
            ctx.moveTo(source.x, source.y);
            ctx.lineTo(target.x, target.y);
            const glowAlpha = 0.15 + Math.sin(time * 2 + dist * 0.01) * 0.08;
            ctx.strokeStyle = connection.sourceType === 'kernel'
                ? `rgba(74, 222, 128, ${glowAlpha})`
                : `rgba(142, 68, 173, ${glowAlpha})`;
            ctx.lineWidth = connection.width + 4;
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(source.x, source.y);
            ctx.lineTo(target.x, target.y);
            ctx.strokeStyle = connection.color;
            ctx.lineWidth = connection.width;
            ctx.setLineDash([8, 12]);
            ctx.lineDashOffset = -dashOffset;
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.lineDashOffset = 0;
        }
    }

    private drawLingeringFields(fields: LingeringFieldRenderData[]): void {
        if (fields.length === 0) return;

        const time = performance.now() / 1000;
        const ctx = this.ctx;

        for (const field of fields) {
            const pulse = 0.92 + Math.sin(time * 2.6 + field.id) * 0.08;
            const radius = field.radius * pulse;

            ctx.save();
            ctx.globalAlpha = Math.min(0.85, field.alpha);
            ctx.beginPath();
            ctx.arc(field.position.x, field.position.y, radius, 0, Math.PI * 2);
            ctx.fillStyle = field.color;
            ctx.fill();

            ctx.beginPath();
            ctx.arc(field.position.x, field.position.y, radius, 0, Math.PI * 2);
            ctx.strokeStyle = field.borderColor;
            ctx.lineWidth = 2;
            ctx.setLineDash([6, 6]);
            ctx.stroke();
            ctx.setLineDash([]);

            ctx.beginPath();
            ctx.arc(field.position.x, field.position.y, radius * 0.55, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(202, 255, 128, 0.16)';
            ctx.fill();
            ctx.restore();
        }
    }

    private drawSeededPayloads(payloads: SeededPayloadRenderData[]): void {
        if (payloads.length === 0) return;

        const time = performance.now() / 1000;
        const ctx = this.ctx;

        for (const payload of payloads) {
            const pulse = 0.85 + Math.sin(time * 8 + payload.id) * 0.15;
            const coreRadius = 7 + pulse * 2;

            ctx.save();
            ctx.globalAlpha = Math.min(0.9, payload.alpha);
            ctx.beginPath();
            ctx.arc(payload.position.x, payload.position.y, payload.radius, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(255, 207, 102, 0.22)';
            ctx.lineWidth = 2;
            ctx.setLineDash([4, 8]);
            ctx.stroke();
            ctx.setLineDash([]);

            ctx.beginPath();
            ctx.arc(payload.position.x, payload.position.y, coreRadius, 0, Math.PI * 2);
            ctx.fillStyle = payload.color;
            ctx.fill();
            ctx.strokeStyle = payload.borderColor;
            ctx.lineWidth = 2;
            ctx.stroke();

            ctx.beginPath();
            ctx.arc(payload.position.x, payload.position.y, coreRadius * 0.45, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(90, 54, 20, 0.55)';
            ctx.fill();
            ctx.restore();
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
            if (placed.tower.towerType === TowerType.LumenOracle) {
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

            // Camo enemies: semi-transparent unless revealed by Lumen Oracle
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

            if (enemy.isMetal) {
                this.ctx.save();
                this.ctx.beginPath();
                this.ctx.arc(enemy.position.x, enemy.position.y, radius + 4, 0, Math.PI * 2);
                this.ctx.strokeStyle = enemy.armorColor || '#C8D0D8';
                this.ctx.lineWidth = 3;
                this.ctx.setLineDash([3, 3]);
                this.ctx.stroke();
                this.ctx.setLineDash([]);
                this.ctx.restore();
            }

            if (enemy.shieldActive) {
                this.ctx.save();
                const shieldPulse = 0.65 + Math.sin(performance.now() / 260 + enemy.id) * 0.2;
                this.ctx.globalAlpha = shieldPulse;
                this.ctx.shadowColor = enemy.shieldColor || 'rgba(124, 218, 255, 0.75)';
                this.ctx.shadowBlur = 10;
                this.ctx.beginPath();
                this.ctx.arc(enemy.position.x, enemy.position.y, radius + 8, 0, Math.PI * 2);
                this.ctx.strokeStyle = enemy.shieldColor || 'rgba(124, 218, 255, 0.75)';
                this.ctx.lineWidth = 2;
                this.ctx.stroke();
                this.ctx.restore();
            }

            if (enemy.swarmLinkedActive) {
                this.ctx.save();
                const linkColor = enemy.swarmLinkColor || 'rgba(245, 94, 121, 0.72)';
                const swarmPulse = 0.35 + Math.sin(performance.now() / 220 + enemy.id) * 0.12;
                this.ctx.globalAlpha = swarmPulse;
                this.ctx.strokeStyle = linkColor;
                this.ctx.lineWidth = 2;
                this.ctx.beginPath();
                this.ctx.arc(enemy.position.x, enemy.position.y, radius + 12, 0, Math.PI * 2);
                this.ctx.stroke();

                for (const other of renderData.enemies.enemies) {
                    if (!other.swarmLinkedActive || other.id <= enemy.id) {
                        continue;
                    }

                    const dx = other.position.x - enemy.position.x;
                    const dy = other.position.y - enemy.position.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    if (distance <= 80) {
                        this.ctx.globalAlpha = 0.18;
                        this.ctx.beginPath();
                        this.ctx.moveTo(enemy.position.x, enemy.position.y);
                        this.ctx.lineTo(other.position.x, other.position.y);
                        this.ctx.stroke();
                    }
                }
                this.ctx.restore();
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

            if (!enemy.showHealthBar && enemy.totalLayers > 1) {
                const indicatorY = enemy.position.y + radius + 7;
                const indicatorWidth = 12;
                const remainingRatio = enemy.layersRemaining / enemy.totalLayers;
                this.ctx.fillStyle = 'rgba(18, 24, 31, 0.8)';
                this.ctx.fillRect(enemy.position.x - indicatorWidth / 2, indicatorY, indicatorWidth, 3);
                this.ctx.fillStyle = enemy.secondaryColor;
                this.ctx.fillRect(enemy.position.x - indicatorWidth / 2, indicatorY, indicatorWidth * remainingRatio, 3);
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

            // Trail points are in world coordinates.
            if (p.hasTrail && p.trailPoints && p.trailPoints.length > 0) {
                this.drawProjectileTrail(p.trailPoints, color, glowColor, size, p.trailStyle || 'ribbon');
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
            
            this.drawProjectileShape(p.shape || 'orb', size, color, p.accentColor || glowColor);
            
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

    private drawProjectileShape(shape: string, size: number, color: string, accentColor: string): void {
        this.ctx.fillStyle = color;
        this.ctx.strokeStyle = accentColor;
        this.ctx.lineWidth = Math.max(2, size * 0.22);

        if (shape === 'cloud') {
            for (const puff of [
                { x: -size * 0.45, y: 0, r: size * 0.62 },
                { x: size * 0.25, y: -size * 0.2, r: size * 0.7 },
                { x: size * 0.42, y: size * 0.28, r: size * 0.5 },
            ]) {
                this.ctx.beginPath();
                this.ctx.arc(puff.x, puff.y, puff.r, 0, Math.PI * 2);
                this.ctx.fill();
            }
            this.ctx.stroke();
            return;
        }

        if (shape === 'drop') {
            this.ctx.beginPath();
            this.ctx.moveTo(0, -size * 1.15);
            this.ctx.bezierCurveTo(size, -size * 0.25, size * 0.55, size, 0, size);
            this.ctx.bezierCurveTo(-size * 0.55, size, -size, -size * 0.25, 0, -size * 1.15);
            this.ctx.closePath();
            this.ctx.fill();
            this.ctx.stroke();
            return;
        }

        if (shape === 'jaw') {
            this.ctx.beginPath();
            this.ctx.moveTo(-size, -size * 0.7);
            this.ctx.lineTo(size * 0.15, 0);
            this.ctx.lineTo(-size, size * 0.7);
            this.ctx.closePath();
            this.ctx.fill();
            this.ctx.beginPath();
            this.ctx.moveTo(size, -size * 0.7);
            this.ctx.lineTo(-size * 0.15, 0);
            this.ctx.lineTo(size, size * 0.7);
            this.ctx.closePath();
            this.ctx.fill();
            this.ctx.beginPath();
            this.ctx.moveTo(-size * 0.15, 0);
            this.ctx.lineTo(size * 0.15, 0);
            this.ctx.stroke();
            return;
        }

        if (shape === 'bolt') {
            this.ctx.beginPath();
            this.ctx.moveTo(-size * 0.35, -size * 1.1);
            this.ctx.lineTo(size * 0.28, -size * 0.18);
            this.ctx.lineTo(-size * 0.04, -size * 0.18);
            this.ctx.lineTo(size * 0.42, size * 1.1);
            this.ctx.lineTo(-size * 0.42, size * 0.08);
            this.ctx.lineTo(-size * 0.08, size * 0.08);
            this.ctx.closePath();
            this.ctx.fill();
            this.ctx.stroke();
            return;
        }

        if (shape === 'needle') {
            this.ctx.beginPath();
            this.ctx.moveTo(0, -size * 1.25);
            this.ctx.lineTo(size * 0.36, size * 0.7);
            this.ctx.lineTo(0, size * 1.05);
            this.ctx.lineTo(-size * 0.36, size * 0.7);
            this.ctx.closePath();
            this.ctx.fill();
            this.ctx.stroke();
            return;
        }

        this.ctx.beginPath();
        this.ctx.arc(0, 0, size, 0, Math.PI * 2);
        this.ctx.fill();
    }

    private drawProjectileTrail(trailPoints: any[], color: string, glowColor: string, size: number, style: string): void {
        if (trailPoints.length < 2) return;

        for (let i = 1; i < trailPoints.length; i++) {
            const prev = trailPoints[i - 1];
            const curr = trailPoints[i];
            const opacity = curr.opacity || 0.3;

            if (style === 'spore' || style === 'toxin') {
                this.ctx.beginPath();
                this.ctx.arc(curr.position.x, curr.position.y, Math.max(1.5, size * opacity * 0.35), 0, Math.PI * 2);
                this.ctx.fillStyle = style === 'toxin' ? color : glowColor;
                this.ctx.globalAlpha = opacity * 0.65;
                this.ctx.fill();
                this.ctx.globalAlpha = 1;
                continue;
            }

            this.ctx.beginPath();
            this.ctx.moveTo(prev.position.x, prev.position.y);
            if (style === 'spark') {
                const midX = (prev.position.x + curr.position.x) / 2 + Math.sin(i * 2.3) * size * 0.35;
                const midY = (prev.position.y + curr.position.y) / 2 + Math.cos(i * 1.7) * size * 0.35;
                this.ctx.lineTo(midX, midY);
            }
            this.ctx.lineTo(curr.position.x, curr.position.y);
            this.ctx.strokeStyle = style === 'snap' ? color : glowColor;
            this.ctx.lineWidth = Math.max(1, size * opacity * (style === 'pulse' ? 0.8 : 0.5));
            this.ctx.globalAlpha = opacity * (style === 'pulse' ? 0.65 : 0.5);
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
        this.ctx.fillText(`Sell ${formatNutrients(button.sellValue)}`, button.position.x + button.size.width / 2, button.position.y + button.size.height / 2);
    }

    private drawHUD(renderData: GameFrameRenderData): void {
        this.drawWaveAnnouncement(renderData.waveAnnouncement);
        this.drawWaveProgress(renderData.waveProgress);
        this.drawTowerInfoPanel(renderData.towerInfoPanel);
        this.drawLivesMoney(renderData.livesMoneyDisplay);
        this.drawEnemyCount(renderData.enemyCountDisplay);
        this.drawTowerPurchase(renderData.towerPurchase);
        this.drawWavePreview(renderData.wavePreview);
        this.drawStartWaveButton();
        this.drawOnboarding(renderData.onboarding);
        if (RELEASE_FEATURES.mapSelection) {
            this.drawMapSelection(renderData.mapSelection);
        }
        this.drawPauseMenu(renderData.pauseMenu);
        this.drawGameOverVictory(renderData.gameOverVictory);
    }

    private drawOnboarding(onboarding: OnboardingRenderData): void {
        if (!onboarding.isVisible || onboarding.promptRect === null || onboarding.prompt === null) return;

        this.ctx.save();
        if (onboarding.reach) {
            const projection = projectOnboardingReach({
                reach: onboarding.reach,
                worldToScreen: point => this.renderer.worldToScreen(point.x, point.y),
                zoom: this.renderer.getCamera().zoom,
            });
            this.ctx.setLineDash([9, 7]);
            this.ctx.strokeStyle = onboarding.reach.color;
            this.ctx.lineWidth = 3;
            this.ctx.beginPath();
            this.ctx.arc(
                projection.center.x,
                projection.center.y,
                projection.radius,
                0,
                Math.PI * 2,
            );
            this.ctx.stroke();
            this.ctx.setLineDash([]);
            this.ctx.fillStyle = '#FFFFFF';
            this.ctx.font = 'bold 12px sans-serif';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(
                onboarding.reach.label,
                projection.center.x,
                projection.center.y - projection.radius - 10,
            );
        }

        for (const highlight of onboarding.highlights) {
            this.ctx.strokeStyle = highlight.color;
            this.ctx.lineWidth = 4;
            this.ctx.strokeRect(
                highlight.rect.x,
                highlight.rect.y,
                highlight.rect.width,
                highlight.rect.height,
            );
            this.ctx.fillStyle = highlight.color;
            this.ctx.font = 'bold 11px sans-serif';
            this.ctx.textAlign = 'left';
            this.ctx.fillText(
                highlight.label,
                highlight.rect.x + 6,
                highlight.rect.y - 7,
                highlight.rect.width - 12,
            );
        }

        const promptRect = onboarding.promptRect;
        this.ctx.fillStyle = 'rgba(10, 10, 20, 0.94)';
        this.ctx.fillRect(promptRect.x, promptRect.y, promptRect.width, promptRect.height);
        this.ctx.strokeStyle = onboarding.promptPulsing ? '#F87171' : '#4ADE80';
        this.ctx.lineWidth = onboarding.promptPulsing ? 4 : 2;
        this.ctx.strokeRect(promptRect.x, promptRect.y, promptRect.width, promptRect.height);
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.font = 'bold 16px sans-serif';
        this.ctx.textAlign = 'left';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(
            onboarding.prompt,
            promptRect.x + 16,
            promptRect.y + promptRect.height / 2,
            promptRect.width - 128,
        );

        const skip = onboarding.skipButton;
        if (skip) {
            this.ctx.fillStyle = 'rgba(155, 89, 182, 0.2)';
            this.ctx.fillRect(skip.rect.x, skip.rect.y, skip.rect.width, skip.rect.height);
            this.ctx.strokeStyle = '#C084FC';
            this.ctx.lineWidth = 2;
            this.ctx.strokeRect(skip.rect.x, skip.rect.y, skip.rect.width, skip.rect.height);
            this.ctx.fillStyle = '#FFFFFF';
            this.ctx.font = 'bold 13px sans-serif';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(
                `${skip.label} [${skip.hotkey}]`,
                skip.rect.x + skip.rect.width / 2,
                skip.rect.y + skip.rect.height / 2,
            );
        }
        this.ctx.restore();
    }

    private drawWavePreview(preview: WavePreviewRenderData | null): void {
        if (preview === null) return;

        const panel = RELEASE_HUD_LAYOUT.wavePreview;
        const padding = 12;
        const contentX = panel.x + padding;
        const contentWidth = panel.width - padding * 2;
        this.ctx.save();
        this.ctx.beginPath();
        this.ctx.rect(panel.x, panel.y, panel.width, panel.height);
        this.ctx.clip();

        this.ctx.fillStyle = 'rgba(10, 10, 20, 0.9)';
        this.ctx.fillRect(panel.x, panel.y, panel.width, panel.height);
        this.ctx.strokeStyle = 'rgba(184, 199, 217, 0.55)';
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(panel.x + 0.5, panel.y + 0.5, panel.width - 1, panel.height - 1);

        this.ctx.textAlign = 'left';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillStyle = '#FFD700';
        this.ctx.font = 'bold 13px sans-serif';
        this.ctx.fillText(`Wave ${preview.waveNumber}: ${preview.name}`, contentX, panel.y + 16, contentWidth);

        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.font = '11px sans-serif';
        preview.enemies.forEach((enemy, index) => {
            this.ctx.fillText(
                `${enemy.count}× ${enemy.displayName}`,
                contentX,
                panel.y + 36 + index * 15,
                contentWidth,
            );
        });

        if (preview.traits.length === 0) {
            this.ctx.fillStyle = '#B8C7D9';
            this.ctx.font = '10px sans-serif';
            this.ctx.fillText('No special traits', contentX, panel.y + 108);
        } else {
            const columnWidth = contentWidth / 2;
            preview.traits.forEach((trait, index) => {
                const column = index % 2;
                const row = Math.floor(index / 2);
                const traitX = contentX + column * columnWidth;
                const traitY = panel.y + 104 + row * 17;
                this.drawTraitShape(trait.shape, trait.color, traitX + 6, traitY, 5);
                this.ctx.fillStyle = '#FFFFFF';
                this.ctx.font = '10px sans-serif';
                this.ctx.fillText(trait.label, traitX + 16, traitY, columnWidth - 18);
            });
        }

        this.ctx.fillStyle = '#FFD700';
        this.ctx.font = 'bold 11px sans-serif';
        this.ctx.textAlign = 'right';
        this.ctx.fillText(preview.rewardLabel, panel.x + panel.width - padding, panel.y + panel.height - 11);
        this.ctx.restore();
    }

    private drawTraitShape(shape: TraitShape, color: string, x: number, y: number, radius: number): void {
        this.ctx.save();
        this.ctx.strokeStyle = color;
        this.ctx.fillStyle = color;
        this.ctx.lineWidth = 1.5;

        switch (shape) {
            case 'hexagon':
                this.ctx.beginPath();
                for (let corner = 0; corner < 6; corner++) {
                    const angle = Math.PI / 3 * corner;
                    const pointX = x + Math.cos(angle) * radius;
                    const pointY = y + Math.sin(angle) * radius;
                    if (corner === 0) this.ctx.moveTo(pointX, pointY);
                    else this.ctx.lineTo(pointX, pointY);
                }
                this.ctx.closePath();
                this.ctx.stroke();
                break;
            case 'eye':
                this.ctx.beginPath();
                this.ctx.ellipse(x, y, radius + 1, radius - 1, 0, 0, Math.PI * 2);
                this.ctx.stroke();
                this.ctx.beginPath();
                this.ctx.arc(x, y, 1.5, 0, Math.PI * 2);
                this.ctx.fill();
                break;
            case 'shield':
                this.ctx.beginPath();
                this.ctx.moveTo(x, y - radius);
                this.ctx.lineTo(x + radius, y - radius + 2);
                this.ctx.lineTo(x + radius - 1, y + 2);
                this.ctx.lineTo(x, y + radius);
                this.ctx.lineTo(x - radius + 1, y + 2);
                this.ctx.lineTo(x - radius, y - radius + 2);
                this.ctx.closePath();
                this.ctx.stroke();
                break;
            case 'links':
                this.ctx.beginPath();
                this.ctx.ellipse(x - 2, y, radius - 1, radius - 2, -0.5, 0, Math.PI * 2);
                this.ctx.ellipse(x + 2, y, radius - 1, radius - 2, -0.5, 0, Math.PI * 2);
                this.ctx.stroke();
                break;
            default:
                shape satisfies never;
        }

        this.ctx.restore();
    }

    private isWaveButtonVisible(): boolean {
        const state = this.game.getState();
        if (state !== GameState.Playing && state !== GameState.Idle) return false;
        const rm = this.game.getRoundManager();
        const roundState = rm.getState();
        return roundState === RoundState.Idle || roundState === RoundState.Intermission;
    }

    private getStartWaveButtonRect(): Rect {
        return getStartWaveButtonRect();
    }

    private drawStartWaveButton(): void {
        if (!this.isWaveButtonVisible()) return;

        const label = getStartWaveLabel(this.waveControls.getWaveUIState());
        if (label === null) return;

        const { x, y, width, height } = this.getStartWaveButtonRect();

        // Pulsing glow to draw attention
        const pulse = 0.7 + 0.3 * Math.sin(Date.now() / 300);

        this.ctx.save();
        this.ctx.shadowColor = '#4ade80';
        this.ctx.shadowBlur = 12 * pulse;

        this.ctx.fillStyle = `rgba(34, 120, 60, ${0.85 * pulse})`;
        this.ctx.beginPath();
        this.ctx.roundRect(x, y, width, height, 6);
        this.ctx.fill();

        this.ctx.strokeStyle = '#4ade80';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.roundRect(x, y, width, height, 6);
        this.ctx.stroke();

        this.ctx.shadowBlur = 0;
        this.ctx.fillStyle = '#fff';
        this.ctx.font = 'bold 15px sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(`${label}  [Enter]`, x + width / 2, y + height / 2);
        this.ctx.restore();
    }

    private drawMapSelection(mapSelection: MapSelectionRenderData | null): void {
        if (!mapSelection || !mapSelection.isVisible) return;

        this.ctx.globalAlpha = mapSelection.progress;

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
            this.ctx.fillText(formatNutrients(card.startingMoneyLabel), x + w / 2, y + 98);
            this.ctx.fillText(`Kernel ${card.startingLivesLabel}`, x + w / 2, y + 112);

            if (card.isLocked) {
                this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
                this.ctx.fillRect(x, y, w, h);
                this.ctx.fillStyle = '#888';
                this.ctx.font = 'bold 14px sans-serif';
                this.ctx.fillText('LOCKED', x + w / 2, y + h / 2);
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
        const panelX = menu.position.x - panelW / 2;
        const panelY = menu.position.y - panelH / 2;

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
        this.ctx.fillText(menu.title || 'PAUSED', menu.titlePosition.x, menu.titlePosition.y);

        // Subtitle
        if (menu.subtitle) {
            this.ctx.fillStyle = menu.subtitleColor || '#aaa';
            this.ctx.font = '16px sans-serif';
            this.ctx.fillText(menu.subtitle, menu.subtitlePosition.x, menu.subtitlePosition.y);
        }

        // Buttons
        for (const btn of menu.buttons) {
            const bx = btn.position.x - btn.size.width / 2;
            const by = btn.position.y - btn.size.height / 2;

            this.ctx.fillStyle = '#2a2a3e';
            this.ctx.fillRect(bx, by, btn.size.width, btn.size.height);
            this.ctx.strokeStyle = '#666';
            this.ctx.lineWidth = 1;
            this.ctx.strokeRect(bx, by, btn.size.width, btn.size.height);

            this.ctx.fillStyle = '#fff';
            this.ctx.font = 'bold 18px sans-serif';
            this.ctx.fillText(btn.label, btn.position.x, btn.position.y);
        }

        const { musicVolumeBar, soundVolumeBar, muteButton, speedButtons } = RELEASE_HUD_LAYOUT.pauseSettings;
        const volumeControls = [
            { label: 'Music Volume', volume: this.audio.getMusicVolume(), rect: musicVolumeBar },
            { label: 'Sound Volume', volume: this.audio.getSoundVolume(), rect: soundVolumeBar },
        ] as const;

        for (const control of volumeControls) {
            this.ctx.fillStyle = '#888';
            this.ctx.font = '14px sans-serif';
            this.ctx.textAlign = 'left';
            this.ctx.fillText(control.label, control.rect.x - 150, control.rect.y + control.rect.height / 2 + 4);
            this.ctx.fillStyle = '#333';
            this.ctx.fillRect(control.rect.x, control.rect.y, control.rect.width, control.rect.height);
            this.ctx.fillStyle = '#4ade80';
            this.ctx.fillRect(control.rect.x, control.rect.y, control.rect.width * control.volume, control.rect.height);
            this.ctx.strokeStyle = '#555';
            this.ctx.lineWidth = 1;
            this.ctx.strokeRect(control.rect.x, control.rect.y, control.rect.width, control.rect.height);
            const handleX = control.rect.x + control.rect.width * control.volume;
            this.ctx.beginPath();
            this.ctx.arc(handleX, control.rect.y + control.rect.height / 2, 6, 0, Math.PI * 2);
            this.ctx.fillStyle = '#4ade80';
            this.ctx.fill();
            this.ctx.strokeStyle = '#fff';
            this.ctx.stroke();
        }

        this.ctx.fillStyle = this.audio.isMuted() ? '#E74C3C' : '#2a2a3e';
        this.ctx.fillRect(muteButton.x, muteButton.y, muteButton.width, muteButton.height);
        this.ctx.strokeStyle = '#666';
        this.ctx.strokeRect(muteButton.x, muteButton.y, muteButton.width, muteButton.height);
        this.ctx.fillStyle = '#fff';
        this.ctx.font = '13px sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(
            this.audio.isMuted() ? 'Unmute Music' : 'Mute Music',
            muteButton.x + muteButton.width / 2,
            muteButton.y + muteButton.height / 2 + 1,
        );

        const speedOptions = [
            { label: '1x', speed: GameSpeed.Normal, rect: speedButtons[0] },
            { label: '2x', speed: GameSpeed.Fast, rect: speedButtons[1] },
            { label: '3x', speed: GameSpeed.Faster, rect: speedButtons[2] },
        ] as const;
        const currentSpeed = this.game.getGameSpeed ? this.game.getGameSpeed() : GameSpeed.Normal;

        this.ctx.fillStyle = '#888';
        this.ctx.font = '14px sans-serif';
        this.ctx.textAlign = 'left';
        this.ctx.fillText('Speed', speedButtons[0].x - 50, speedButtons[0].y + speedButtons[0].height / 2 + 1);

        for (const option of speedOptions) {
            const isActive = currentSpeed === option.speed;
            this.ctx.fillStyle = isActive ? '#4ade80' : '#2a2a3e';
            this.ctx.fillRect(option.rect.x, option.rect.y, option.rect.width, option.rect.height);
            this.ctx.strokeStyle = isActive ? '#fff' : '#666';
            this.ctx.lineWidth = 1;
            this.ctx.strokeRect(option.rect.x, option.rect.y, option.rect.width, option.rect.height);
            this.ctx.fillStyle = isActive ? '#000' : '#fff';
            this.ctx.font = 'bold 13px sans-serif';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(
                option.label,
                option.rect.x + option.rect.width / 2,
                option.rect.y + option.rect.height / 2 + 1,
            );
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
        this.ctx.fillText(progress.waveText, x, y + 10);
        
        this.ctx.fillStyle = '#333';
        this.ctx.fillRect(x, y + 25, width, height);
        
        const fillWidth = width * progress.progress;
        this.ctx.fillStyle = '#4CAF50';
        this.ctx.fillRect(x, y + 25, fillWidth, height);
        
        this.ctx.fillStyle = '#fff';
        this.ctx.font = '12px sans-serif';
        this.ctx.fillText(`${progress.enemiesDefeated}/${progress.enemiesTotal}`, x, y + 55);
    }

    private drawGameOverVictory(gov: GameOverVictoryRenderData): void {
        if (gov.state === 'hidden') return;

        this.ctx.save();
        this.ctx.globalAlpha = gov.backgroundOpacity;
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
        this.ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        this.ctx.globalAlpha = gov.titleOpacity;
        this.ctx.fillStyle = gov.titleColor;
        this.ctx.font = 'bold 64px sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(gov.title, gov.titlePosition.x, gov.titlePosition.y);

        this.ctx.globalAlpha = gov.subtitleOpacity;
        this.ctx.fillStyle = gov.subtitleColor;
        this.ctx.font = '18px sans-serif';
        if (gov.subtitle) {
            this.ctx.fillText(gov.subtitle, gov.subtitlePosition.x, gov.subtitlePosition.y);
        }

        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.font = '24px sans-serif';
        this.ctx.fillText(`Final Score: ${gov.finalScore}`, gov.position.x, gov.position.y - 35);
        this.ctx.fillText(`Wave Reached: ${gov.finalWave}`, gov.position.x, gov.position.y);

        for (const button of gov.buttons) {
            const x = button.position.x - button.size.width / 2;
            const y = button.position.y - button.size.height / 2;
            this.ctx.globalAlpha = button.opacity;
            this.ctx.fillStyle = 'rgba(50, 50, 50, 0.9)';
            this.ctx.fillRect(x, y, button.size.width, button.size.height);
            this.ctx.strokeStyle = gov.borderColor;
            this.ctx.lineWidth = 2;
            this.ctx.strokeRect(x, y, button.size.width, button.size.height);
            this.ctx.fillStyle = '#FFFFFF';
            this.ctx.font = 'bold 18px sans-serif';
            this.ctx.fillText(button.label, button.position.x, button.position.y);
        }

        this.ctx.restore();
    }

    private drawTowerInfoPanel(panel: TowerInfoPanelRenderData | null): void {
        if (!panel || !panel.isVisible) return;

        const width = panel.size.width;
        const height = panel.size.height;
        const x = panel.position.x;
        const y = panel.position.y;

        this.ctx.save();
        this.ctx.globalAlpha = panel.opacity;
        this.ctx.fillStyle = panel.backgroundColor;
        this.ctx.fillRect(x, y, width, height);
        this.ctx.strokeStyle = panel.borderColor;
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(x, y, width, height);

        this.ctx.fillStyle = panel.textColor;
        this.ctx.font = 'bold 18px sans-serif';
        this.ctx.textAlign = 'left';
        this.ctx.textBaseline = 'top';
        this.ctx.fillText(this.truncateText(panel.towerName, width - 30), x + 15, y + 14);

        this.ctx.font = '14px sans-serif';
        this.ctx.fillStyle = '#aaa';
        this.ctx.fillText(`${panel.targetingMode.icon} Target: ${panel.targetingMode.label}`, x + 15, y + 40);

        let statX = x + 15;
        for (const stat of panel.stats) {
            this.ctx.fillStyle = panel.textColor;
            this.ctx.font = '12px sans-serif';
            this.ctx.fillText(stat.label, statX, y + 66);
            this.ctx.fillStyle = '#FFD700';
            this.ctx.font = 'bold 14px sans-serif';
            this.ctx.fillText(stat.value, statX, y + 82);
            statX += 86;
        }

        if (panel.specialEffect) {
            this.ctx.fillStyle = '#9EE6C8';
            this.ctx.font = '12px sans-serif';
            this.ctx.fillText(this.truncateText(panel.specialEffect.description, width - 30), x + 15, y + 108);
        }

        this.ctx.font = 'bold 12px sans-serif';
        this.ctx.fillStyle = panel.connectionState.isConnected ? '#4ade80' : '#F87171';
        this.ctx.fillText(`Mycelium: ${panel.connectionState.label}`, x + 15, y + 132);
        this.ctx.fillStyle = '#B8C7D9';
        const growthLabel = RELEASE_HUD_LAYOUT.towerGrowthLabel;
        this.ctx.textAlign = 'right';
        this.ctx.fillText(
            `Growth: ${this.formatGrowthStage(panel)}`,
            growthLabel.x + growthLabel.width,
            growthLabel.y,
            growthLabel.width,
        );
        this.ctx.textAlign = 'left';

        this.ctx.fillStyle = panel.textColor;
        this.ctx.font = 'bold 14px sans-serif';
        this.ctx.fillText(panel.growth.stage === 'seedling' ? 'Mature' : 'Choose Evolution', x + 15, y + 144);

        if (panel.matureAction) {
            const action = panel.matureAction;
            this.ctx.fillStyle = action.isEnabled ? 'rgba(17, 70, 45, 0.9)' : 'rgba(35, 35, 42, 0.92)';
            this.ctx.fillRect(action.position.x, action.position.y, action.size.width, action.size.height);
            this.ctx.strokeStyle = action.isEnabled ? '#4CAF50' : '#555';
            this.ctx.lineWidth = 2;
            this.ctx.strokeRect(action.position.x, action.position.y, action.size.width, action.size.height);
            this.ctx.fillStyle = action.isEnabled ? '#FFFFFF' : '#999';
            this.ctx.font = 'bold 16px sans-serif';
            this.ctx.fillText(action.label, action.position.x + 12, action.position.y + 10);
            this.ctx.textAlign = 'right';
            this.ctx.fillStyle = action.isEnabled ? panel.accentColor : '#777';
            this.ctx.fillText(formatNutrients(action.cost), action.position.x + action.size.width - 12, action.position.y + 10);
            this.ctx.textAlign = 'left';
            this.ctx.fillStyle = '#B8C7D9';
            this.ctx.font = '12px sans-serif';
            this.drawWrappedText(action.description, action.position.x + 12, action.position.y + 38, action.size.width - 24, 15, 2);
            if (action.lockedReason) {
                this.ctx.fillStyle = '#F87171';
                this.ctx.fillText(this.formatGrowthLockReason(action.lockedReason), action.position.x + 12, action.position.y + action.size.height - 18);
            }
        }

        const pathColors = ['#4CAF50', '#4A90D9', '#9B59B6'];
        for (let index = 0; index < panel.evolutionCards.length; index++) {
            const card = panel.evolutionCards[index];
            const borderColor = pathColors[index] ?? '#555';
            this.ctx.fillStyle = card.isSelected
                ? EVOLUTION_CARD_SELECTED_BACKGROUND_COLOR
                : card.isEnabled ? 'rgba(28, 45, 42, 0.92)' : 'rgba(35, 35, 42, 0.92)';
            this.ctx.fillRect(card.position.x, card.position.y, card.size.width, card.size.height);
            this.ctx.strokeStyle = card.isSelected || card.isEnabled ? borderColor : '#555';
            this.ctx.lineWidth = card.isSelected ? 3 : 1;
            this.ctx.strokeRect(card.position.x, card.position.y, card.size.width, card.size.height);

            this.ctx.fillStyle = card.isEnabled || card.isSelected ? '#FFFFFF' : '#999';
            this.ctx.font = 'bold 13px sans-serif';
            this.ctx.fillText(`${card.pathLabel}: ${card.name}`, card.position.x + 10, card.position.y + 7);
            this.ctx.textAlign = 'right';
            this.ctx.fillStyle = getEvolutionCardStatusColor(card, panel.accentColor);
            this.ctx.fillText(card.isSelected ? 'SELECTED' : formatNutrients(card.cost), card.position.x + card.size.width - 10, card.position.y + 7);
            this.ctx.textAlign = 'left';
            this.ctx.fillStyle = '#B8C7D9';
            this.ctx.font = '11px sans-serif';
            const descriptionLines = card.lockedReason && !card.isSelected ? 1 : 2;
            this.drawWrappedText(card.description, card.position.x + 10, card.position.y + 25, card.size.width - 20, 12, descriptionLines);
            if (card.lockedReason && !card.isSelected) {
                this.ctx.fillStyle = card.lockedReason === 'requires_connection' ? '#C084FC' : '#F87171';
                this.ctx.fillText(this.formatGrowthLockReason(card.lockedReason), card.position.x + 10, card.position.y + card.size.height - 12);
            }
        }

        this.ctx.strokeStyle = '#333';
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        this.ctx.moveTo(x + 10, y + height - 34);
        this.ctx.lineTo(x + width - 10, y + height - 34);
        this.ctx.stroke();

        this.ctx.fillStyle = '#F87171';
        this.ctx.font = '12px sans-serif';
        this.ctx.fillText(`Sell value: ${formatNutrients(panel.sellValue)}`, x + 15, y + height - 25);
        this.ctx.restore();
    }

    private formatGrowthStage(panel: TowerInfoPanelRenderData): string {
        if (panel.growth.stage === 'evolved' && panel.growth.evolution) {
            return panel.evolutionCards.find(card => card.isSelected)?.pathLabel ?? 'Evolved';
        }
        return panel.growth.stage === 'seedling' ? 'Seedling' : 'Mature';
    }

    private formatGrowthLockReason(reason: string): string {
        if (reason === 'requires_connection') return 'Requires mycelium connection';
        if (reason === 'not_enough_nutrients') return 'Not enough Nutrients';
        return 'Evolution complete';
    }

    private drawWrappedText(
        text: string,
        x: number,
        y: number,
        maxWidth: number,
        lineHeight: number,
        maxLines: number
    ): void {
        const words = text.split(' ');
        let line = '';
        let lineIndex = 0;
        for (const word of words) {
            const candidate = line ? `${line} ${word}` : word;
            if (this.ctx.measureText(candidate).width <= maxWidth) {
                line = candidate;
                continue;
            }
            this.ctx.fillText(line, x, y + lineIndex * lineHeight);
            lineIndex++;
            if (lineIndex >= maxLines) return;
            line = word;
        }
        if (line && lineIndex < maxLines) {
            this.ctx.fillText(line, x, y + lineIndex * lineHeight);
        }
    }

    private drawLivesMoney(lm: LivesMoneyDisplayRenderData): void {
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.fillRect(10, 10, 300, 40);

        this.ctx.font = 'bold 18px sans-serif';
        this.ctx.textBaseline = 'middle';
        this.ctx.textAlign = 'left';

        this.ctx.fillStyle = '#FF4444';
        this.ctx.fillText(lm.kernelIntegrity.integrityText, 20, 30);

        this.ctx.fillStyle = '#FFD700';
        this.ctx.fillText(lm.nutrients.nutrientText, 170, 30);
    }

    private drawEnemyCount(ec: EnemyCountDisplayRenderData): void {
        if (!ec.isVisible) return;
        
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.fillRect(CANVAS_WIDTH / 2 - 60, 75, 120, 30);
        
        this.ctx.fillStyle = '#fff';
        this.ctx.font = '16px sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(ec.enemyCount.countText, CANVAS_WIDTH / 2, 95);
    }

    private drawTowerPurchase(purchase: TowerPurchaseRenderData | null): void {
        if (!purchase || !purchase.isVisible) return;

        for (const button of purchase.buttons) {
            const x = button.position.x;
            const y = button.position.y;
            const width = button.size.width;
            const height = button.size.height;
            
            this.ctx.fillStyle = button.canAfford ? 'rgba(0, 0, 0, 0.8)' : 'rgba(50, 50, 50, 0.8)';
            this.ctx.fillRect(x, y, width, height);
            
            this.ctx.strokeStyle = button.isSelected ? '#FFD700' : (button.canAfford ? '#4CAF50' : '#666');
            this.ctx.lineWidth = button.isSelected ? 3 : 2;
            this.ctx.strokeRect(x, y, width, height);
            
            this.ctx.fillStyle = button.canAfford ? '#FFD700' : '#888';
            this.ctx.font = 'bold 12px sans-serif';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'top';
            this.ctx.fillText(button.label, x + width / 2, y + 5);

            this.ctx.fillStyle = button.canAfford ? '#9EE6C8' : '#777';
            this.ctx.font = 'bold 11px sans-serif';
            this.ctx.fillText(button.role, x + width / 2, y + 21);
            
            this.ctx.fillStyle = button.canAfford ? '#4CAF50' : '#F44336';
            this.ctx.font = 'bold 13px sans-serif';
            this.ctx.fillText(button.costText, x + width / 2, y + 36);

            this.ctx.fillStyle = button.canAfford ? '#B8C7D9' : '#666';
            this.ctx.font = '10px sans-serif';
            this.ctx.fillText(button.counterTags.join(' / '), x + width / 2, y + 53);
            
            this.ctx.fillStyle = button.canAfford ? '#aaa' : '#666';
            this.ctx.font = '10px sans-serif';
            this.ctx.textAlign = 'left';
            this.ctx.fillText(`[${button.hotkey}]`, x + 7, y + height - 15);
            this.ctx.textAlign = 'right';
            this.ctx.fillText(button.tacticalHint, x + width - 7, y + height - 15);
        }
    }

    private truncateText(text: string, maxWidth: number): string {
        if (this.ctx.measureText(text).width <= maxWidth) {
            return text;
        }

        let clipped = text;
        while (clipped.length > 0 && this.ctx.measureText(`${clipped}...`).width > maxWidth) {
            clipped = clipped.slice(0, -1);
        }
        return `${clipped}...`;
    }
}

window.addEventListener('DOMContentLoaded', () => {
    new Game();
});
