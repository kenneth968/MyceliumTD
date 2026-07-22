import { applyStatusEffect, createEnemy, StatusEffectType } from '../entities/enemy';
import { EnemyType } from '../systems/wave';
import { createDefaultPath } from '../systems/path';
import { getEnemiesRenderData } from '../systems/enemyRender';
import { getEnemyFamilyGeometrySignature } from './enemyBodyPainter';
import { getActiveSwarmLinks, getCamoPresentation } from './enemyTraitPainter';

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

const path = createDefaultPath();

const beetle = getEnemyFamilyGeometrySignature('beetle-shell');
const wasp = getEnemyFamilyGeometrySignature('wasp-wings');
const caterpillar = getEnemyFamilyGeometrySignature('caterpillar-segments');
const moth = getEnemyFamilyGeometrySignature('moth-wings');
assert(beetle.shell === 'broad' && beetle.legCount === 6, 'beetle uses broad shell and six legs');
assert(wasp.wingCount === 2 && wasp.wingShape === 'triangle', 'wasp uses triangular wings');
assert(caterpillar.segmentCount === 5, 'caterpillar uses a segmented horizontal body');
assert(moth.wingShape === 'wide-paired' && moth.centralLuminousBody, 'moth uses paired wings and luminous body');

const swarmA = createEnemy(1, EnemyType.SwarmWasp, path);
const swarmB = createEnemy(2, EnemyType.SwarmWasp, path);
const swarmC = createEnemy(3, EnemyType.SwarmWasp, path);
const inactive = createEnemy(4, EnemyType.SwarmWasp, path);
swarmA.position = { x: 100, y: 100 };
swarmB.position = { x: 130, y: 100 };
swarmC.position = { x: 160, y: 100 };
inactive.position = { x: 115, y: 100 };
swarmA.swarmLinkedActive = true;
swarmB.swarmLinkedActive = true;
swarmC.swarmLinkedActive = true;
const renderCollection = getEnemiesRenderData([swarmA, swarmB, swarmC, inactive]);
const links = getActiveSwarmLinks(renderCollection.enemies);
assert(links.length === 3, 'nearby active enemies receive short links');
assert(links.every(link => link.fromId !== 4 && link.toId !== 4), 'inactive neighbours are excluded');
assert(new Set(links.map(link => [link.fromId, link.toId].sort().join('-'))).size === links.length, 'links are unique');
for (const enemyId of [1, 2, 3]) {
  assert(links.filter(link => link.fromId === enemyId || link.toId === enemyId).length <= 2, 'per-enemy link work stays capped');
}

const camoEnemy = getEnemiesRenderData([createEnemy(5, EnemyType.VeilWasp, path)]).enemies[0];
assert(getCamoPresentation(camoEnemy, false).bodyOpacity < 0.5, 'hidden camo is partially opaque');
assert(getCamoPresentation(camoEnemy, true).showEye, 'revealed camo shows an Eye glyph');

// Given a Camo enemy whose gameplay reveal status remains active outside Oracle range.
const revealedEnemy = createEnemy(6, EnemyType.VeilWasp, path);
applyStatusEffect(revealedEnemy, StatusEffectType.Revealed, 2000, 1);
const revealedCamo = getEnemiesRenderData([revealedEnemy]).enemies[0];
// When presentation receives no supplemental Oracle-geometry reveal.
const outsideOraclePresentation = getCamoPresentation(revealedCamo, false);
// Then authoritative reveal keeps the enemy at live-reveal opacity with its Eye cue.
assert(revealedCamo.isRevealed, 'render data preserves authoritative Camo reveal state');
assert(outsideOraclePresentation.bodyOpacity === 0.82, 'status-revealed Camo stays fully presented outside Oracle range');
assert(outsideOraclePresentation.showEye, 'status-revealed Camo keeps its Eye cue outside Oracle range');

console.log('enemyPresentation tests passed');
