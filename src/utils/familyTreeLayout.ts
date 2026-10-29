// src/utils/familyTreeLayout.ts
// Robust generation-based family tree layout calculator
// Ensures:
// 1. Spouses are strictly on the same generation level.
// 2. Parents strictly above children, grandparents above parents.
// 3. Children connected via clear parent-partnership branches without overlapping.
// 4. Handles multiple spouses, half-siblings, and single parents gracefully.

import type { Entity, Relationship } from '../db/schema';

export interface FamilyMemberNode {
  id: string;
  entity: Entity;
  generation: number; // 0 = focus, -1 = parents, -2 = grandparents, +1 = children, +2 = grandchildren
  isFocus?: boolean;
  role: string;
  badgeType?: 'spouse' | 'adopted' | 'inferred' | 'standard';
  spouses: string[];
  parents: string[];
  children: string[];
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CoupleUnit {
  id: string;
  parent1Id: string;
  parent2Id?: string;
  generation: number;
  childrenIds: string[];
  midX: number;
  y: number;
}

export interface TreeEdge {
  id: string;
  type: 'marriage' | 'parent-child' | 'adoption';
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  path: string; // SVG path d attribute
}

export interface ComputedTreeLayout {
  nodes: FamilyMemberNode[];
  couples: CoupleUnit[];
  edges: TreeEdge[];
  generationLevels: { generation: number; label: string; y: number }[];
  bounds: { minX: number; minY: number; maxX: number; maxY: number; width: number; height: number };
}

const CARD_WIDTH = 210;
const CARD_HEIGHT = 74;
const SPOUSE_GAP = 36;
const SIBLING_GAP = 28;
const COUPLE_GROUP_GAP = 50;
const GEN_HEIGHT = 140;

export async function computeFamilyTreeLayout(
  focusEntity: Entity,
  allWorldEntities: Entity[],
  relationships: Relationship[],
  orientation: 'vertical' | 'horizontal' = 'vertical'
): Promise<ComputedTreeLayout> {
  const entityMap = new Map<string, Entity>(allWorldEntities.map(e => [e.id, e]));
  if (!entityMap.has(focusEntity.id)) {
    entityMap.set(focusEntity.id, focusEntity);
  }

  // 1. Build adjacency maps for family relationships
  // Parent-child directed: parent -> child
  const parentsOf = new Map<string, Set<string>>(); // childId -> Set<parentId>
  const childrenOf = new Map<string, Set<string>>(); // parentId -> Set<childId>
  const spousesOf = new Map<string, Set<string>>(); // personId -> Set<spouseId>
  const adoptions = new Set<string>(); // "childId->parentId"

  function addEdge(map: Map<string, Set<string>>, from: string, to: string) {
    if (!map.has(from)) map.set(from, new Set());
    map.get(from)!.add(to);
  }

  for (const rel of relationships) {
    if (rel.deletedAt) continue;
    const { fromEntityId, toEntityId, typeId } = rel;

    if (typeId === 'rt-parent-of') {
      addEdge(parentsOf, toEntityId, fromEntityId);
      addEdge(childrenOf, fromEntityId, toEntityId);
    } else if (typeId === 'rt-child-of') {
      addEdge(parentsOf, fromEntityId, toEntityId);
      addEdge(childrenOf, toEntityId, fromEntityId);
    } else if (typeId === 'rt-adopted-by') {
      addEdge(parentsOf, fromEntityId, toEntityId);
      addEdge(childrenOf, toEntityId, fromEntityId);
      adoptions.add(`${fromEntityId}->${toEntityId}`);
    } else if (typeId === 'rt-spouse-of' || typeId === 'rt-married-to') {
      addEdge(spousesOf, fromEntityId, toEntityId);
      addEdge(spousesOf, toEntityId, fromEntityId);
    }
  }

  // 2. Determine generation for each connected entity using BFS from focus
  // Generation constraints:
  // - spouse has SAME generation (delta = 0)
  // - parent has generation - 1 (child generation + 1)
  // - child has generation + 1 (parent generation + 1)
  const generations = new Map<string, number>();
  generations.set(focusEntity.id, 0);

  const queue: string[] = [focusEntity.id];
  const visited = new Set<string>([focusEntity.id]);

  while (queue.length > 0) {
    const currentId = queue.shift()!;
    const curGen = generations.get(currentId)!;

    // Spouses: exactly same generation
    const spouses = spousesOf.get(currentId) || new Set();
    for (const spId of spouses) {
      if (!visited.has(spId)) {
        visited.add(spId);
        generations.set(spId, curGen);
        queue.push(spId);
      }
    }

    // Parents: generation - 1
    const parents = parentsOf.get(currentId) || new Set();
    for (const pId of parents) {
      if (!visited.has(pId)) {
        visited.add(pId);
        generations.set(pId, curGen - 1);
        queue.push(pId);
      }
    }

    // Children: generation + 1
    const children = childrenOf.get(currentId) || new Set();
    for (const chId of children) {
      if (!visited.has(chId)) {
        visited.add(chId);
        generations.set(chId, curGen + 1);
        queue.push(chId);
      }
    }
  }

  // Also pull in any family members if focus is an 'et-family' dynasty entity
  if (focusEntity.typeId === 'et-family') {
    for (const rel of relationships) {
      if (rel.fromEntityId === focusEntity.id || rel.toEntityId === focusEntity.id) {
        const otherId = rel.fromEntityId === focusEntity.id ? rel.toEntityId : rel.fromEntityId;
        if (!generations.has(otherId)) {
          generations.set(otherId, 0);
          visited.add(otherId);
        }
      }
    }
  }

  // Filter to entities that actually exist in DB
  const memberIds = [...generations.keys()].filter(id => entityMap.has(id));

  // Build member nodes list
  const memberNodes: FamilyMemberNode[] = memberIds.map(id => {
    const ent = entityMap.get(id)!;
    const gen = generations.get(id) ?? 0;
    const isFocus = id === focusEntity.id;

    let role = 'Member';
    let badgeType: 'spouse' | 'adopted' | 'inferred' | 'standard' = 'standard';

    if (isFocus) {
      role = 'Subject';
    } else if (gen < 0) {
      role = gen === -1 ? 'Parent' : 'Grandparent';
    } else if (gen > 0) {
      role = gen === 1 ? 'Child' : 'Grandchild';
    } else if ((spousesOf.get(focusEntity.id) || new Set()).has(id)) {
      role = 'Spouse / Partner';
      badgeType = 'spouse';
    } else {
      // Sibling check
      const focusParents = parentsOf.get(focusEntity.id) || new Set();
      const myParents = parentsOf.get(id) || new Set();
      let hasSharedParent = false;
      for (const p of focusParents) {
        if (myParents.has(p)) hasSharedParent = true;
      }
      if (hasSharedParent) {
        role = 'Sibling';
        badgeType = 'inferred';
      }
    }

    // Check if adopted
    for (const p of (parentsOf.get(id) || new Set())) {
      if (adoptions.has(`${id}->${p}`)) {
        badgeType = 'adopted';
        if (role === 'Child') role = 'Adopted Child';
      }
    }

    return {
      id,
      entity: ent,
      generation: gen,
      isFocus,
      role,
      badgeType,
      spouses: [...(spousesOf.get(id) || [])],
      parents: [...(parentsOf.get(id) || [])],
      children: [...(childrenOf.get(id) || [])],
      x: 0,
      y: 0,
      width: CARD_WIDTH,
      height: CARD_HEIGHT,
    };
  });

  // Group nodes by generation
  const byGeneration = new Map<number, FamilyMemberNode[]>();
  for (const node of memberNodes) {
    if (!byGeneration.has(node.generation)) {
      byGeneration.set(node.generation, []);
    }
    byGeneration.get(node.generation)!.push(node);
  }

  // Sort generations from oldest (lowest number) to youngest (highest)
  const sortedGens = [...byGeneration.keys()].sort((a, b) => a - b);

  // 3. Form Couple Units on each generation
  // A couple unit is either (Person A + Spouse B) or (Single Parent) with their children
  const coupleUnits: CoupleUnit[] = [];
  const processedInCouple = new Set<string>();

  for (const gen of sortedGens) {
    const nodes = byGeneration.get(gen)!;

    for (const node of nodes) {
      if (processedInCouple.has(node.id)) continue;

      // Find an unassigned spouse on same generation
      const spouseId = node.spouses.find(sp => !processedInCouple.has(sp) && generations.get(sp) === gen);

      if (spouseId) {
        processedInCouple.add(node.id);
        processedInCouple.add(spouseId);

        // Union of children between these two
        const nChildren = childrenOf.get(node.id) || new Set();
        const spChildren = childrenOf.get(spouseId) || new Set();
        const sharedChildren = new Set<string>();

        // Children shared by both or belongs to this couple
        for (const ch of nChildren) sharedChildren.add(ch);
        for (const ch of spChildren) sharedChildren.add(ch);

        coupleUnits.push({
          id: `couple-${node.id}-${spouseId}`,
          parent1Id: node.id,
          parent2Id: spouseId,
          generation: gen,
          childrenIds: [...sharedChildren].filter(cid => entityMap.has(cid)),
          midX: 0,
          y: 0,
        });
      } else {
        // Single parent / individual unit
        processedInCouple.add(node.id);
        const myChildren = childrenOf.get(node.id) || new Set();
        coupleUnits.push({
          id: `single-${node.id}`,
          parent1Id: node.id,
          generation: gen,
          childrenIds: [...myChildren].filter(cid => entityMap.has(cid)),
          midX: 0,
          y: 0,
        });
      }
    }
  }

  // 4. Calculate X, Y positions for generation rows and couples
  // Top-to-bottom layout:
  // Gen Y = (gen - minGen) * GEN_HEIGHT
  const minGen = sortedGens.length > 0 ? sortedGens[0] : 0;
  const nodeMap = new Map<string, FamilyMemberNode>(memberNodes.map(n => [n.id, n]));

  // Generation level labels
  const generationLevels = sortedGens.map(gen => {
    const y = (gen - minGen) * GEN_HEIGHT + 40;
    let label = `Generation ${gen >= 0 ? `+${gen}` : gen}`;
    if (gen === 0) label = 'Subject Generation';
    else if (gen === -1) label = 'Parents';
    else if (gen === -2) label = 'Grandparents';
    else if (gen === 1) label = 'Children';
    else if (gen === 2) label = 'Grandchildren';

    return { generation: gen, label, y };
  });

  const genLevelMap = new Map(generationLevels.map(gl => [gl.generation, gl.y]));

  // Place nodes on each generation horizontally with clean spacing
  for (const gen of sortedGens) {
    const y = genLevelMap.get(gen) || 40;
    const unitsInGen = coupleUnits.filter(u => u.generation === gen);

    let currentX = 50;

    for (const unit of unitsInGen) {
      const p1 = nodeMap.get(unit.parent1Id);
      if (p1) {
        p1.x = currentX;
        p1.y = y;
      }

      if (unit.parent2Id) {
        const p2 = nodeMap.get(unit.parent2Id);
        if (p2) {
          p2.x = currentX + CARD_WIDTH + SPOUSE_GAP;
          p2.y = y;
        }
        unit.midX = currentX + CARD_WIDTH + SPOUSE_GAP / 2;
        currentX += CARD_WIDTH * 2 + SPOUSE_GAP + COUPLE_GROUP_GAP;
      } else {
        unit.midX = currentX + CARD_WIDTH / 2;
        currentX += CARD_WIDTH + COUPLE_GROUP_GAP;
      }
      unit.y = y;
    }
  }

  // 5. Connectors & Edges (Orthogonal Clean SVG Lines)
  const edges: TreeEdge[] = [];

  // A. Marriage connectors (Horizontal line between spouses)
  for (const unit of coupleUnits) {
    if (unit.parent2Id) {
      const p1 = nodeMap.get(unit.parent1Id);
      const p2 = nodeMap.get(unit.parent2Id);
      if (p1 && p2) {
        const startX = p1.x + CARD_WIDTH;
        const startY = p1.y + CARD_HEIGHT / 2;
        const endX = p2.x;
        const endY = p2.y + CARD_HEIGHT / 2;

        edges.push({
          id: `edge-spouse-${p1.id}-${p2.id}`,
          type: 'marriage',
          startX,
          startY,
          endX,
          endY,
          path: `M ${startX} ${startY} L ${endX} ${endY}`,
        });
      }
    }
  }

  // B. Parent-Child branching connectors
  // From couple midpoint stem down to horizontal sibling bar, then into child top
  for (const unit of coupleUnits) {
    if (unit.childrenIds.length === 0) continue;

    const stemStartX = unit.midX;
    const stemStartY = unit.y + (unit.parent2Id ? CARD_HEIGHT / 2 : CARD_HEIGHT);
    const branchY = stemStartY + (GEN_HEIGHT - CARD_HEIGHT) / 2;

    // Valid child nodes
    const childNodes = unit.childrenIds
      .map(cid => nodeMap.get(cid))
      .filter((cn): cn is FamilyMemberNode => !!cn);

    if (childNodes.length === 0) continue;

    // Find leftmost and rightmost child midpoints
    const childMidXs = childNodes.map(c => c.x + CARD_WIDTH / 2);
    const minChildX = Math.min(...childMidXs, stemStartX);
    const maxChildX = Math.max(...childMidXs, stemStartX);

    // 1. Trunk from parent down to branchY
    edges.push({
      id: `trunk-${unit.id}`,
      type: 'parent-child',
      startX: stemStartX,
      startY: stemStartY,
      endX: stemStartX,
      endY: branchY,
      path: `M ${stemStartX} ${stemStartY} L ${stemStartX} ${branchY}`,
    });

    // 2. Horizontal sibling bar connecting child drops
    if (minChildX !== maxChildX) {
      edges.push({
        id: `bar-${unit.id}`,
        type: 'parent-child',
        startX: minChildX,
        startY: branchY,
        endX: maxChildX,
        endY: branchY,
        path: `M ${minChildX} ${branchY} L ${maxChildX} ${branchY}`,
      });
    }

    // 3. Drop down to each child
    for (const child of childNodes) {
      const childMidX = child.x + CARD_WIDTH / 2;
      const childTopY = child.y;

      edges.push({
        id: `drop-${unit.id}-${child.id}`,
        type: adoptions.has(`${child.id}->${unit.parent1Id}`) ? 'adoption' : 'parent-child',
        startX: childMidX,
        startY: branchY,
        endX: childMidX,
        endY: childTopY,
        path: `M ${childMidX} ${branchY} L ${childMidX} ${childTopY}`,
      });
    }
  }

  // 6. Calculate Overall Layout Bounds
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  if (memberNodes.length === 0) {
    minX = 0; maxX = 500; minY = 0; maxY = 300;
  } else {
    for (const n of memberNodes) {
      minX = Math.min(minX, n.x);
      maxX = Math.max(maxX, n.x + n.width);
      minY = Math.min(minY, n.y);
      maxY = Math.max(maxY, n.y + n.height);
    }
  }

  // Add padding
  minX -= 60;
  maxX += 60;
  minY -= 40;
  maxY += 60;

  return {
    nodes: memberNodes,
    couples: coupleUnits,
    edges,
    generationLevels,
    bounds: {
      minX,
      minY,
      maxX,
      maxY,
      width: Math.max(700, maxX - minX),
      height: Math.max(450, maxY - minY),
    },
  };
}
