import type {
  DialogueAction,
  DialogueChoice,
  DialogueCondition,
  DialogueNode,
  NpcDef,
} from "../data/npcs";

export interface DialogueContext {
  questStates: Record<string, "locked" | "available" | "active" | "completed">;
  level: number;
  race?: string;
}

export interface DialogueStep {
  node: DialogueNode;
}

export interface DialogueResult {
  node: DialogueNode | null;
  action?: DialogueAction;
  ended: boolean;
}

export function conditionMet(
  cond: DialogueCondition | undefined,
  ctx: DialogueContext,
): boolean {
  if (!cond) return true;
  if (cond.questState) {
    const actual = ctx.questStates[cond.questState.questId] ?? "locked";
    if (actual !== cond.questState.state) return false;
  }
  if (cond.level) {
    if (cond.level.min !== undefined && ctx.level < cond.level.min) return false;
    if (cond.level.max !== undefined && ctx.level > cond.level.max) return false;
  }
  if (cond.race !== undefined && ctx.race !== cond.race) return false;
  return true;
}

export function resolveNode(
  npc: NpcDef,
  nodeId: string,
  ctx: DialogueContext,
): DialogueNode | null {
  const node = npc.nodes.find((n) => n.id === nodeId);
  if (!node) return null;
  if (!conditionMet(node.condition, ctx)) return null;
  return node;
}

export function visibleChoices(
  node: DialogueNode,
  ctx: DialogueContext,
): DialogueChoice[] {
  return node.choices.filter((c) => conditionMet(c.condition, ctx));
}

function entryNode(npc: NpcDef, ctx: DialogueContext): DialogueNode {
  const byId = npc.nodes.find((n) => n.id === "start");
  const entry = byId ?? npc.nodes[0];
  if (!entry) {
    throw new Error(`NPC ${npc.id} has no dialogue nodes`);
  }
  if (conditionMet(entry.condition, ctx)) {
    return entry;
  }
  const fallback = npc.nodes.find((n) => conditionMet(n.condition, ctx));
  if (!fallback) {
    throw new Error(`No dialogue node available for NPC ${npc.id}`);
  }
  return fallback;
}

export function startDialogue(
  npc: NpcDef,
  ctx: DialogueContext,
): DialogueStep {
  return { node: entryNode(npc, ctx) };
}

export function choose(
  npc: NpcDef,
  currentNodeId: string,
  choiceIndex: number,
  ctx: DialogueContext,
): DialogueResult {
  const current = resolveNode(npc, currentNodeId, ctx);
  if (!current) {
    return { node: null, ended: true };
  }
  const choices = visibleChoices(current, ctx);
  const choice = choices[choiceIndex];
  if (!choice) {
    return { node: null, ended: true };
  }

  if (choice.next !== undefined) {
    const next = resolveNode(npc, choice.next, ctx);
    if (next) {
      return { node: next, action: choice.action, ended: false };
    }
    // next node missing or condition failed: still surface the action, then end.
    return { node: null, action: choice.action, ended: true };
  }

  // No next: the choice terminates the dialogue.
  return { node: null, action: choice.action, ended: true };
}
