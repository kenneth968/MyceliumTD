import { GameRunner, GameState, PlacementState, PlacedTower, GameSpeed } from './systems/gameRunner';
import { RoundState } from './systems/roundManager';
import { createWaveControls, getStartWaveButtonRect, getStartWaveLabel, WaveControls } from './systems/waveControls';
import { GameRenderer, GameFrameRenderData, createGameRenderer } from './systems/gameRenderer';
import { GameLoop, createGameLoop } from './systems/gameLoop';
import { processHotkey, findHotkeyAction, HotkeyAction } from './systems/hotkeys';
import { TowerType, TOWER_STATS } from './entities/tower';
import { TargetingMode } from './systems/targeting';
import { Vec2 } from './utils/vec2';
import { TowerGrowthStage } from './systems/towerRender';
import {
    getSellButtonAtPosition,
    PlacementPreviewWithTargetingRenderData,
    TowerSelectionPreviewRenderData,
} from './systems/placementPreview';
import { WaveUIAnnouncementRenderData } from './systems/waveAnnouncementRender';
import { getPauseAudioSettings, getPauseMenuButtonAtPosition, PauseMenuRenderData } from './systems/pauseMenuRender';
import { WaveProgressRenderData } from './systems/waveProgressRender';
import {
    getGameOverVictoryButtonAtPosition,
    GameOverVictoryRenderData,
} from './systems/gameOverVictoryRender';
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
import { BrowserGameAudio, createGameAudioDirector } from './systems/gameAudioDirector';
import { RELEASE_FEATURES, RELEASE_MAP_ID } from './systems/releaseScope';
import { canHandleGameplayInput, getActiveUiLayer, UiGateState, UiLayer } from './systems/uiInputGate';
import {
    getReleaseHudRegionAtPosition,
    getPauseSettingsControlAtPosition,
    getPrimaryHotkeyLabel,
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
    drainGameEventsForPresentation,
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
    getOnboardingCompletionNotice,
    paintOnboardingReach,
    projectOnboardingReach,
    type OnboardingRenderData,
} from './systems/onboardingRender';
import { paintEnvironment } from './presentation/environmentPainter';
import { TowerSpriteImageCache } from './presentation/towerSpriteCache';
import {
    paintTowerIdentity,
    paintTowerIconIdentity,
} from './presentation/towerSpritePainter';
import { paintTowerSelectionOutline } from './presentation/towerOverlayPainter';
import { paintEnemies } from './presentation/enemyPainter';
import { paintBossHealthBars } from './presentation/bossHealthBarPainter';
import { CombatEffectPool } from './presentation/combatEffects';
import { paintCombatEffects } from './presentation/combatEffectPainter';
import { paintNetworkConnections } from './presentation/networkPainter';
import { paintProjectiles } from './presentation/projectilePainter';
import { paintWorldEffects } from './presentation/worldEffectPainter';

const CANVAS_WIDTH = RELEASE_HUD_LAYOUT.canvas.width;
const CANVAS_HEIGHT = RELEASE_HUD_LAYOUT.canvas.height;


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
    private audio: BrowserGameAudio;
    private combatEffects: CombatEffectPool;
    private towerSpriteCache: TowerSpriteImageCache;
    private lastTime: number = 0;
    private lastRenderTime: number = 0;
    private showingMenu: boolean = true;
    private menuAnimTime: number = 0;
    private onboarding: OnboardingState = createOnboardingState(true);
    private onboardingPulseUntil: number = 0;
    private onboardingCompletionStartedAt: number | null = null;

    constructor() {
        this.canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
        const context = this.canvas.getContext('2d');
        if (context === null) throw new Error('Canvas 2D context is unavailable');
        this.ctx = context;

        this.game = new GameRunner();
        this.waveControls = createWaveControls(this.game);
        this.renderer = createGameRenderer();
        this.loop = createGameLoop(this.game, this.renderer);

        this.mouse = { x: 0, y: 0, down: false };
        this.audio = createGameAudioDirector();
        this.combatEffects = new CombatEffectPool();
        this.towerSpriteCache = new TowerSpriteImageCache();

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

            ctx.fillStyle = 'rgba(134, 239, 172, 0.78)';
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
            ctx.fillStyle = 'rgba(255,255,255,0.68)';
            ctx.font = '14px sans-serif';
            ctx.fillText('Click to begin or press Enter', CANVAS_WIDTH / 2, 520);

            requestAnimationFrame(animate);
        };
        requestAnimationFrame(animate);
    }

    private startGame(): void {
        if (!this.showingMenu) return;
        this.startReleaseRun();
        this.loop.start();
        this.loop.setRenderCallback(this.render.bind(this));
        // Player places towers first, then clicks "Start Wave"
    }

    private startReleaseRun(): void {
        this.clearOnboardingCompletionNotice();
        this.game.reset();
        if (!this.game.setMap(RELEASE_MAP_ID)) {
            throw new Error(`Unable to start release map: ${RELEASE_MAP_ID}`);
        }
        this.game.start();
        this.showingMenu = false;
        this.updatePrimaryHotkeyLabel();
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
        completionCause: 'connection' | null = null,
    ): void {
        const previous = this.onboarding;
        this.onboarding = next;
        if (!isNewOnboardingCompletion(previous, next)) return;

        if (completionCause === 'connection') {
            this.onboardingCompletionStartedAt = performance.now();
        }

        const path = this.game.getPath();
        const position = bloomPosition
            ?? path.getPointAtDistance(path.getTotalLength()).position;
        this.combatEffects.addCelebration(position);
    }

    private handleOnboardingControl(control: OnboardingControl): void {
        if (control === 'replay') this.clearOnboardingCompletionNotice();
        this.transitionOnboarding(applyOnboardingControl(this.onboarding, control));
    }

    private clearOnboardingCompletionNotice(): void {
        this.onboardingCompletionStartedAt = null;
    }

    private updatePrimaryHotkeyLabel(): void {
        const label = document.getElementById('primaryActionLabel');
        if (label) label.textContent = getPrimaryHotkeyLabel(this.showingMenu);
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
        this.canvas.addEventListener('pointerdown', () => this.audio.unlock(), { once: true });
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
            const selectedTowerType = this.game.getSelectedTowerType();
            const result = this.game.confirmPlacement(this.game.getSelectedTargetingMode());
            if (result && selectedTowerType !== null) {
                this.game.startTowerPlacement(selectedTowerType);
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
        this.audio.unlock();
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
        this.clearOnboardingCompletionNotice();
        if (this.onboarding.enabled && this.onboarding.step !== OnboardingStep.Complete) {
            this.onboarding = createOnboardingState(true);
        }
        this.game.reset();
        this.game.start();
        this.combatEffects.clear();
    }

    private quitToMenu(): void {
        this.clearOnboardingCompletionNotice();
        if (this.onboarding.enabled && this.onboarding.step !== OnboardingStep.Complete) {
            this.onboarding = createOnboardingState(true);
        }
        this.showingMenu = true;
        this.updatePrimaryHotkeyLabel();
        this.loop.stop();
        this.game.reset();
        this.audio.enterMenu();
        this.combatEffects.clear();
        this.drawMenu();
    }

    private render(renderData: GameFrameRenderData): void {
        const waveIndex = this.game.getCurrentWaveIndex();
        const state = this.game.getState();

        // Update particles
        const now = performance.now() / 1000;
        const particleDt = this.lastRenderTime > 0 ? Math.min(now - this.lastRenderTime, 0.05) : 0.016;
        this.lastRenderTime = now;
        const eventResult = drainGameEventsForPresentation(
            this.onboarding,
            () => this.game.drainEvents(),
            {
                combat: events => {
                    if (events.length > 0) {
                        this.combatEffects.processEvents(
                            events,
                            renderData.towers.towers,
                            renderData.environment.kernel.position,
                        );
                    }
                },
                audio: events => this.audio.director.update(events, state, waveIndex),
            },
        );
        this.transitionOnboarding(
            eventResult.state,
            eventResult.completionBloom,
            eventResult.completionCause,
        );
        this.combatEffects.update(particleDt);
        renderData.onboarding = this.getCurrentOnboardingRenderData();

        this.ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        this.ctx.save();
        this.ctx.translate(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
        this.ctx.scale(renderData.camera.zoom, renderData.camera.zoom);
        this.ctx.translate(-renderData.camera.x, -renderData.camera.y);

        paintEnvironment(this.ctx, renderData.environment, renderData.viewport);
        paintWorldEffects(this.ctx, {
            fields: renderData.lingeringFields,
            payloads: renderData.seededPayloads,
            timestamp: renderData.timestamp,
        });
        paintNetworkConnections(this.ctx, {
            connections: renderData.networkConnections,
            transients: this.combatEffects.getTransientSlots(),
            timestamp: renderData.timestamp,
        });
        this.drawPlacementPreview(renderData.placementPreview, renderData.timestamp);
        this.drawTowers(renderData);
        this.drawEnemies(renderData);
        paintProjectiles(this.ctx, renderData.projectiles);
        paintCombatEffects(this.ctx, {
            particles: this.combatEffects.getParticleSlots(),
            transients: this.combatEffects.getTransientSlots(),
        });
        this.drawTowerSelection(renderData.towerSelection);
        this.drawSellButton(renderData.sellButton);
        
        this.ctx.restore();

        paintBossHealthBars(this.ctx, renderData.healthBars);
        this.drawHUD(renderData);
    }

    private drawPlacementPreview(
        preview: PlacementPreviewWithTargetingRenderData | null,
        timestamp: number,
    ): void {
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
        
        const typeMap: Record<TowerType, 'circle' | 'square' | 'diamond'> = {
            [TowerType.Puffball]: 'circle',
            [TowerType.Slimefungus]: 'diamond',
            [TowerType.ThornSniper]: 'square',
            [TowerType.LumenOracle]: 'circle',
            [TowerType.BulbShooter]: 'diamond',
            [TowerType.Sporecap]: 'circle',
        };
        const shapeType = typeMap[ghost.towerType] || 'circle';
        const spriteSize = Math.max(56, size * 3);
        paintTowerIdentity(
            this.ctx,
            this.towerSpriteCache,
            ghost.towerType,
            ghost.stage,
            ghost.evolution,
            timestamp,
            {
                anchorX: ghost.position.x,
                anchorY: ghost.position.y,
                size: spriteSize,
            },
        );
        
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
            const glowColor = tower.glowColor;
            const bodyRadius = tower.bodyRadius;
            const baseRadius = tower.baseRadius;
            const growthStage = tower.growthStage;
            const growthProgress = tower.growthProgress;
            
            const spriteSize = Math.max(56, baseRadius * 3);
            paintTowerIdentity(
                this.ctx,
                this.towerSpriteCache,
                tower.towerType,
                tower.stage,
                tower.evolution,
                renderData.timestamp,
                {
                    anchorX: tower.position.x,
                    anchorY: tower.position.y,
                    size: spriteSize,
                },
            );
            
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
                paintTowerSelectionOutline(
                    this.ctx,
                    tower.towerType,
                    tower.position.x,
                    tower.position.y,
                    bodyRadius + 4,
                );
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
        paintEnemies(this.ctx, renderData.enemies, {
            timestamp: renderData.timestamp,
            isRevealed: (x, y) => this.isEnemyRevealed(x, y),
        });
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

    private drawSellButton(button: any | null): void {
        if (!button) return;
        
        this.ctx.fillStyle = '#8B0000';
        this.ctx.fillRect(button.position.x, button.position.y, button.size.width, button.size.height);
        this.ctx.strokeStyle = '#FF4444';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(button.position.x, button.position.y, button.size.width, button.size.height);

        const [amountLabel, unitLabel] = formatNutrients(button.sellValue).split(' ');
        const centerX = button.position.x + button.size.width / 2;
        this.ctx.fillStyle = '#fff';
        this.ctx.font = 'bold 11px sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(`Sell ${amountLabel}`, centerX, button.position.y + 12);
        this.ctx.font = '9px sans-serif';
        this.ctx.fillText(unitLabel ?? 'Nutrients', centerX, button.position.y + 25);
    }

    private drawHUD(renderData: GameFrameRenderData): void {
        this.drawWaveAnnouncement(renderData.waveAnnouncement);
        this.drawWaveProgress(renderData.waveProgress);
        this.drawTowerInfoPanel(renderData.towerInfoPanel, renderData.timestamp);
        this.drawLivesMoney(renderData.livesMoneyDisplay);
        this.drawEnemyCount(renderData.enemyCountDisplay);
        this.drawTowerPurchase(renderData.towerPurchase);
        this.drawWavePreview(renderData.wavePreview);
        this.drawStartWaveButton();
        this.drawOnboarding(renderData.onboarding);
        this.drawOnboardingCompletionNotice();
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
            this.ctx.font = 'bold 12px sans-serif';
            const projection = projectOnboardingReach({
                reach: onboarding.reach,
                worldToScreen: point => this.renderer.worldToScreen(point.x, point.y),
                zoom: this.renderer.getCamera().zoom,
                visibleBounds: RELEASE_HUD_LAYOUT.playfield,
                blockedRects: [onboarding.promptRect],
                labelSize: {
                    x: this.ctx.measureText(onboarding.reach.label).width,
                    y: 14,
                },
            });
            paintOnboardingReach(
                this.ctx,
                projection,
                onboarding.reach,
                RELEASE_HUD_LAYOUT.playfield,
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

    private drawOnboardingCompletionNotice(): void {
        const notice = getOnboardingCompletionNotice(
            this.onboardingCompletionStartedAt,
            performance.now(),
        );
        if (notice === null) return;

        this.ctx.save();
        this.ctx.fillStyle = 'rgba(20, 83, 45, 0.95)';
        this.ctx.fillRect(notice.rect.x, notice.rect.y, notice.rect.width, notice.rect.height);
        this.ctx.strokeStyle = '#4ADE80';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(notice.rect.x, notice.rect.y, notice.rect.width, notice.rect.height);
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.font = 'bold 15px sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(
            notice.label,
            notice.rect.x + notice.rect.width / 2,
            notice.rect.y + notice.rect.height / 2,
        );
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
        const audioSettings = getPauseAudioSettings(
            this.audio.getMusicVolume(),
            this.audio.getSoundVolume(),
            this.audio.isMuted(),
        );
        const volumeControls = [
            { label: 'Music Volume', volume: audioSettings.musicVolume, rect: musicVolumeBar },
            { label: 'Sound Volume', volume: audioSettings.soundVolume, rect: soundVolumeBar },
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

        this.ctx.fillStyle = audioSettings.musicMuted ? '#E74C3C' : '#2a2a3e';
        this.ctx.fillRect(muteButton.x, muteButton.y, muteButton.width, muteButton.height);
        this.ctx.strokeStyle = '#666';
        this.ctx.strokeRect(muteButton.x, muteButton.y, muteButton.width, muteButton.height);
        this.ctx.fillStyle = '#fff';
        this.ctx.font = '13px sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(
            audioSettings.musicMuted ? 'Unmute Music' : 'Mute Music',
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

        const panel = RELEASE_HUD_LAYOUT.waveProgress;
        const padding = 8;
        const barX = panel.x + padding;
        const barY = panel.y + 23;
        const barWidth = 140;
        const barHeight = 10;

        this.ctx.save();
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.fillRect(panel.x, panel.y, panel.width, panel.height);

        this.ctx.fillStyle = '#fff';
        this.ctx.font = '12px sans-serif';
        this.ctx.textAlign = 'left';
        this.ctx.textBaseline = 'alphabetic';
        this.ctx.fillText(progress.waveText, panel.x + padding, panel.y + 15);

        this.ctx.fillStyle = '#333';
        this.ctx.fillRect(barX, barY, barWidth, barHeight);

        const fillWidth = barWidth * progress.progress;
        this.ctx.fillStyle = '#4CAF50';
        this.ctx.fillRect(barX, barY, fillWidth, barHeight);

        this.ctx.fillStyle = '#fff';
        this.ctx.font = '11px sans-serif';
        this.ctx.textAlign = 'right';
        this.ctx.fillText(
            `${progress.enemiesDefeated}/${progress.enemiesTotal}`,
            panel.x + panel.width - padding,
            panel.y + 32,
        );
        this.ctx.restore();
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

    private drawTowerInfoPanel(
        panel: TowerInfoPanelRenderData | null,
        timestamp: number,
    ): void {
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
        this.ctx.fillText(this.truncateText(panel.towerName, width - 90), x + 15, y + 14);

        const previewSize = 44;
        paintTowerIdentity(
            this.ctx,
            this.towerSpriteCache,
            panel.towerType,
            panel.growth.stage,
            panel.growth.evolution,
            timestamp,
            {
                anchorX: x + width - 30,
                anchorY: y + 52,
                size: previewSize,
            },
        );

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

            const iconSize = 32;
            paintTowerIconIdentity(
                this.ctx,
                this.towerSpriteCache,
                button.towerType,
                x + 8,
                y + 33,
                iconSize,
            );
            
            this.ctx.fillStyle = button.canAfford ? '#4CAF50' : '#F44336';
            this.ctx.font = 'bold 13px sans-serif';
            this.ctx.textAlign = 'right';
            this.ctx.fillText(button.costText, x + width - 7, y + 36);

            this.ctx.fillStyle = button.canAfford ? '#B8C7D9' : '#666';
            this.ctx.font = '10px sans-serif';
            this.ctx.fillText(button.counterTags.join(' / '), x + width - 7, y + 53);
            
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
