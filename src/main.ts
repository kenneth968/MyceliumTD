import { GameRunner, GameState, PlacementState, PlacedTower, GameSpeed } from './systems/gameRunner';
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

const CANVAS_WIDTH = 1280;
const CANVAS_HEIGHT = 720;

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
    private lastTime: number = 0;
    private showingMenu: boolean = true;
    private menuAnimTime: number = 0;

    constructor() {
        this.canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
        this.ctx = this.canvas.getContext('2d')!;

        this.game = new GameRunner({ mapId: 'garden_path' });
        this.renderer = createGameRenderer();
        this.loop = createGameLoop(this.game, this.renderer);

        this.mouse = { x: 0, y: 0, down: false };

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
        this.game.start();
        this.loop.start();
        this.loop.setRenderCallback(this.render.bind(this));
        // Auto-start first wave after a short delay
        setTimeout(() => {
            this.game.startWave();
        }, 1500);
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
                if (btnId === 'resume') this.game.resume();
                else if (btnId === 'restart') { this.game.reset(); this.game.start(); }
                else if (btnId === 'quit') { this.showingMenu = true; this.game.reset(); this.drawMenu(); }
                return;
            }
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
        const panelH = 300;
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
            } else if (this.game.getState() === GameState.Paused) {
                this.game.resume();
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
        this.ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        this.ctx.save();
        this.ctx.translate(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
        this.ctx.scale(renderData.camera.zoom, renderData.camera.zoom);
        this.ctx.translate(-renderData.camera.x, -renderData.camera.y);
        
        this.drawPath(renderData.path);
        this.drawPlacementPreview(renderData.placementPreview);
        this.drawTowers(renderData);
        this.drawEnemies(renderData);
        this.drawProjectiles(renderData.projectiles);
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

    private drawEnemies(renderData: GameFrameRenderData): void {
        for (const enemy of renderData.enemies.enemies) {
            this.ctx.save();
            
            const radius = enemy.bodyRadius;
            
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
            
            const decorations = renderData.enemies.enemyTypeInfo?.get(enemy.id)?.decorations || [];
            const hasShell = decorations.some(d => d.type === 'shell');
            if (hasShell) {
                this.ctx.beginPath();
                this.ctx.arc(enemy.position.x, enemy.position.y - radius * 0.2, radius * 0.7, 0, Math.PI * 2);
                this.ctx.strokeStyle = enemy.secondaryColor || 'transparent';
                this.ctx.lineWidth = 2;
                this.ctx.stroke();
            }
            
            if (enemy.isCamo) {
                this.ctx.beginPath();
                this.ctx.arc(enemy.position.x, enemy.position.y, radius + 5, 0, Math.PI * 2);
                this.ctx.strokeStyle = '#00FF00';
                this.ctx.lineWidth = 2;
                this.ctx.stroke();
            }
            
            const aura = renderData.enemies.enemyTypeInfo?.get(enemy.id)?.statusEffectAuras?.[0];
            if (aura) {
                this.ctx.beginPath();
                this.ctx.arc(enemy.position.x, enemy.position.y, radius + 8, 0, Math.PI * 2);
                this.ctx.fillStyle = aura.color + '4D';
                this.ctx.fill();
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
            
            const animationState = p.animationState || { scale: 1, rotation: 0, pulsePhase: 0 };
            const stretch = p.stretch || { scaleX: 1, scaleY: 1 };
            
            this.ctx.translate(x, y);
            this.ctx.rotate(animationState.rotation);
            this.ctx.scale(stretch.scaleX * animationState.scale, stretch.scaleY * animationState.scale);
            
            if (p.hasTrail && p.trailPoints && p.trailPoints.length > 0) {
                this.drawProjectileTrail(p.trailPoints, color, glowColor, size);
            }
            
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
        
        for (let i = 1; i < trailPoints.length; i++) {
            const prev = trailPoints[i - 1];
            const curr = trailPoints[i];
            const opacity = curr.opacity || 0.3;
            
            this.ctx.beginPath();
            this.ctx.moveTo(prev.position.x - this.ctx.getTransform().e, prev.position.y - this.ctx.getTransform().f);
            this.ctx.lineTo(curr.position.x - this.ctx.getTransform().e, curr.position.y - this.ctx.getTransform().f);
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
