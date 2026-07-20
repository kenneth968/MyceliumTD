import { vec2Distance, type Vec2 } from '../utils/vec2';

export type NetworkNodeId = 'kernel' | number;

export type NetworkTowerNode = {
  readonly id: number;
  readonly position: Vec2;
};

export type MyceliumConnection = {
  readonly fromId: NetworkNodeId;
  readonly toId: number;
  readonly distance: number;
};

export type MyceliumNetworkConfig = {
  readonly kernelPosition: Vec2;
  readonly kernelReach: number;
  readonly towerReach: number;
  readonly towers: readonly NetworkTowerNode[];
};

export type MyceliumNetworkState = {
  readonly connectedTowerIds: ReadonlySet<number>;
  readonly isolatedTowerIds: ReadonlySet<number>;
  readonly parentByTowerId: ReadonlyMap<number, NetworkNodeId>;
  readonly connections: readonly MyceliumConnection[];
};

type RelayNode = {
  readonly id: NetworkNodeId;
  readonly position: Vec2;
  readonly reach: number;
};

export function calculateMyceliumNetwork(config: MyceliumNetworkConfig): MyceliumNetworkState {
  const towers = [...config.towers].sort((left, right) => left.id - right.id);
  const remaining = new Map(towers.map((tower) => [tower.id, tower]));
  const connectedTowerIds = new Set<number>();
  const parentByTowerId = new Map<number, NetworkNodeId>();
  const connections: MyceliumConnection[] = [];
  const relayQueue: RelayNode[] = [
    { id: 'kernel', position: config.kernelPosition, reach: config.kernelReach },
  ];

  for (const relay of relayQueue) {
    for (const tower of remaining.values()) {
      const distance = vec2Distance(relay.position, tower.position);
      if (distance > relay.reach) continue;

      remaining.delete(tower.id);
      connectedTowerIds.add(tower.id);
      parentByTowerId.set(tower.id, relay.id);
      connections.push({ fromId: relay.id, toId: tower.id, distance });
      relayQueue.push({ id: tower.id, position: tower.position, reach: config.towerReach });
    }
  }

  return {
    connectedTowerIds,
    isolatedTowerIds: new Set(remaining.keys()),
    parentByTowerId,
    connections,
  };
}

export function getBridgeDisconnectImpact(
  config: MyceliumNetworkConfig,
  towerId: number,
): number[] {
  const beforeSale = calculateMyceliumNetwork(config);
  const afterSale = calculateMyceliumNetwork({
    ...config,
    towers: config.towers.filter((tower) => tower.id !== towerId),
  });

  return [...beforeSale.connectedTowerIds]
    .filter((id) => id !== towerId && !afterSale.connectedTowerIds.has(id))
    .sort((left, right) => left - right);
}
