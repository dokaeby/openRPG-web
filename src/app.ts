import * as THREE from "three";
import { GameState } from "./core/gameState";
import { SceneManager } from "./engine/scene";
import { PlayerController } from "./engine/playerController";
import { CombatBridge } from "./engine/combatBridge";
import { InputManager } from "./input/input";
import { createHud } from "./ui/hud";
import { CharacterCreateUI } from "./ui/characterCreate";
import { createBagUI } from "./ui/bag";
import type { BagAction } from "./ui/bag";
import { createQuestLogUI } from "./ui/questLog";
import { DialogueUI } from "./ui/dialogue";
import { createMinimap } from "./ui/minimap";
import { getZone } from "./data/zones";
import type { ZoneDef } from "./data/zones";
import { NPCS } from "./data/npcs";
import type { DialogueNode, NpcDef } from "./data/npcs";
import { QUESTS } from "./data/quests";
import { MONSTERS } from "./data/monsters";
import { getItem } from "./data/items";
import { isQuestAvailable } from "./core/quest";
import { countItem } from "./core/inventory";
import { createSpawnState, markKilled, tickSpawns } from "./core/spawn";
import type { SpawnNode } from "./core/spawn";
import { choose, startDialogue, visibleChoices } from "./core/dialogue";
import type { DialogueContext } from "./core/dialogue";
import { listSaves, loadGame, saveGame } from "./save/save";

const MAX_DT = 0.05;
const ENCOUNTER_RADIUS = 2.5;
const NPC_RADIUS = 2.8;
const PORTAL_RADIUS = 2.2;
const AUTOSAVE_MS = 30_000;
const SAVE_SLOT = "slot1";

const MONSTER_COLORS: Record<string, number> = {
  goblin: 0x5a8f3c,
  slime: 0x7ec8e3,
  wolf: 0x9a9a9a,
  boar: 0x8b5a2b,
};
const NPC_COLOR = 0xb08d3e;

function inCombat(gs: GameState): boolean {
  return gs.getState().combat?.phase === "active";
}

/**
 * Wires scene, player, input, combat, quests, NPCs, items, and UI
 * into a rAF loop. Menus (bag/quest log/dialogue) pause simulation.
 */
export function bootstrap(): void {
  const container = document.getElementById("canvas-container");
  const uiRoot = document.getElementById("ui");
  if (!container || !uiRoot) {
    throw new Error("#canvas-container or #ui not found");
  }

  const canvas = document.createElement("canvas");
  container.appendChild(canvas);

  const sceneManager = new SceneManager(canvas);
  const inputManager = new InputManager(document.body);
  const playerController = new PlayerController(sceneManager.camera, canvas);
  const gameState = new GameState();
  const combatBridge = new CombatBridge(gameState, sceneManager);
  const hud = createHud(uiRoot);
  const minimap = createMinimap(uiRoot);

  // ---------- 월드 상태 ----------
  let currentZoneId = "village";
  let spawnNodes: SpawnNode[] = [];
  const mobMeshes = new Map<SpawnNode, THREE.Object3D>();
  const npcMeshes = new Map<string, THREE.Object3D>();
  let pendingNode: SpawnNode | null = null;
  let minimapBounds = { minX: -40, maxX: 40, minZ: -40, maxZ: 40 };

  const zoneDef = (): ZoneDef => getZone(currentZoneId);

  function npcsInZone(zoneId: string): NpcDef[] {
    return Object.values(NPCS).filter((n) => n.zone === zoneId);
  }

  function addMobMesh(node: SpawnNode): void {
    const mesh = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.4, 0.8, 4, 12),
      new THREE.MeshLambertMaterial({
        color: MONSTER_COLORS[node.monsterId] ?? 0xff4444,
      }),
    );
    mesh.position.set(node.x, 0.8, node.z);
    mesh.castShadow = true;
    sceneManager.addToZone(mesh);
    mobMeshes.set(node, mesh);
  }

  function addNpcMesh(npc: NpcDef): void {
    const mesh = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.45, 1.0, 4, 12),
      new THREE.MeshLambertMaterial({ color: NPC_COLOR }),
    );
    mesh.position.set(npc.x, 1.0, npc.z);
    mesh.castShadow = true;
    sceneManager.addToZone(mesh);
    npcMeshes.set(npc.id, mesh);
  }

  function loadZone(zoneId: string): void {
    currentZoneId = zoneId;
    const zone = getZone(zoneId);
    void sceneManager.setZone(zoneId);

    for (const mesh of mobMeshes.values()) sceneManager.removeFromZone(mesh);
    mobMeshes.clear();
    for (const mesh of npcMeshes.values()) sceneManager.removeFromZone(mesh);
    npcMeshes.clear();

    spawnNodes = createSpawnState(zone);
    for (const node of spawnNodes) {
      if (node.alive) addMobMesh(node);
    }
    for (const npc of npcsInZone(zoneId)) addNpcMesh(npc);

    const half = zone.size / 2;
    minimapBounds = { minX: -half, maxX: half, minZ: -half, maxZ: half };
    minimap.setZoneName(zone.name);
  }

  function travelTo(zoneId: string): void {
    const from = currentZoneId;
    const dest = getZone(zoneId);
    // 도착 지점: 목적지 존에서 출발 존을 가리키는 포탈 안쪽
    const back =
      dest.portals.find((p) => p.to === from) ?? dest.portals[0];
    const px = back ? back.x + (back.x >= 0 ? 5 : -5) : 0;
    const pz = back ? back.z + (back.z >= 0 ? 5 : -5) : 0;

    gameState.dispatch({ type: "setZone", zone: zoneId });
    playerController.group.position.set(px, 0, pz);
    gameState.dispatch({ type: "setPosition", x: px, y: 0, z: pz });
    loadZone(zoneId);
    gameState.dispatch({
      type: "questEvent",
      event: { type: "reach", target: zoneId },
    });
    hud.toast(`${dest.name}(으)로 이동했습니다`);
  }

  // ---------- UI ----------
  const characterUI = new CharacterCreateUI(uiRoot, (name, race, classId) => {
    gameState.dispatch({ type: "createCharacter", name, race, classId });
    const p = gameState.getState().player;
    if (p) {
      playerController.group.position.set(p.position.x, 0, p.position.z);
      loadZone(p.position.zone);
      // 시작 소지품
      gameState.dispatch({ type: "addItem", itemId: "hp_potion_small", count: 2 });
      gameState.dispatch({ type: "addItem", itemId: "mp_potion", count: 1 });
    }
    hud.toast(`${name}님, 모험을 시작합니다`);
  });

  const bagUI = createBagUI(uiRoot, {
    getPlayer: () => gameState.getState().player,
    onAction: (action: BagAction) => {
      const result = dispatchBagAction(action);
      const r = result as { ok: boolean; reason?: string } | undefined;
      if (r && !r.ok) hud.toast(r.reason ?? "실패했습니다");
      bagUI.refresh();
    },
  });

  function dispatchBagAction(action: BagAction): unknown {
    if (action.type === "use" && action.itemId) {
      return gameState.dispatch({ type: "useItem", itemId: action.itemId });
    }
    if (action.type === "equip" && action.itemId) {
      return gameState.dispatch({ type: "equipItem", itemId: action.itemId });
    }
    if (action.type === "unequip" && action.slot) {
      return gameState.dispatch({ type: "unequipItem", slot: action.slot });
    }
    return undefined;
  }

  let bagOpen = false;
  const questLogUI = createQuestLogUI(uiRoot, {
    getQuests: () =>
      Object.values(QUESTS).map((def) => ({
        def,
        entry: gameState.data.questBook.entries[def.id] ?? null,
        available: isQuestAvailable(
          gameState.data.questBook,
          def,
          gameState.getState().player?.race,
        ),
      })),
    onAction: (action, questId) => {
      if (action === "accept") {
        const r = gameState.dispatch({ type: "questAccept", questId }) as {
          ok: boolean;
          reason?: string;
        };
        if (!r.ok) hud.toast(r.reason ?? "수락할 수 없습니다");
      } else {
        gameState.dispatch({ type: "questAbandon", questId });
      }
      questLogUI.refresh();
    },
  });
  let questLogOpen = false;

  const dialogueUI = new DialogueUI(uiRoot, () => {
    dialogueUI.close();
    activeNpc = null;
  });
  let activeNpc: NpcDef | null = null;

  function dialogueCtx(): DialogueContext {
    const p = gameState.getState().player;
    return {
      questStates: gameState.getState().questStates,
      level: p?.level ?? 1,
      race: p?.race,
    };
  }

  function renderNode(node: DialogueNode): void {
    if (!activeNpc) return;
    const ctx = dialogueCtx();
    dialogueUI.open(
      activeNpc.name,
      node.text,
      visibleChoices(node, ctx).map((c) => ({ label: c.label })),
      (i) => onDialogueChoice(node, i),
    );
  }

  function openNpc(npc: NpcDef): void {
    activeNpc = npc;
    gameState.dispatch({
      type: "questEvent",
      event: { type: "talk", target: npc.id },
    });
    renderNode(startDialogue(npc, dialogueCtx()).node);
  }

  function onDialogueChoice(node: DialogueNode, index: number): void {
    if (!activeNpc) return;
    const res = choose(activeNpc, node.id, index, dialogueCtx());
    if (res.action) applyDialogueAction(res.action);
    if (res.node) {
      renderNode(res.node);
    } else {
      dialogueUI.close();
      activeNpc = null;
    }
  }

  function applyDialogueAction(action: {
    type: string;
    questId?: string;
    itemId?: string;
    count?: number;
  }): void {
    if (action.type === "quest.accept" && action.questId) {
      const r = gameState.dispatch({
        type: "questAccept",
        questId: action.questId,
      }) as { ok: boolean; reason?: string };
      hud.toast(r.ok ? "퀘스트를 수락했습니다" : (r.reason ?? "수락 실패"));
    } else if (action.type === "quest.abandon" && action.questId) {
      gameState.dispatch({ type: "questAbandon", questId: action.questId });
      hud.toast("퀘스트를 포기했습니다");
    } else if (action.type === "quest.complete" && activeNpc) {
      gameState.dispatch({
        type: "questEvent",
        event: { type: "talk", target: activeNpc.id },
      });
    } else if (action.type === "giveItem" && action.itemId) {
      gameState.dispatch({
        type: "addItem",
        itemId: action.itemId,
        count: action.count ?? 1,
      });
      hud.toast(`${getItem(action.itemId).name}을(를) 받았습니다`);
    }
  }

  // 상호작용 힌트
  const hintEl = document.createElement("div");
  hintEl.className = "interact-hint";
  hintEl.hidden = true;
  uiRoot.append(hintEl);
  let nearestNpc: NpcDef | null = null;

  function checkNpc(pos: { x: number; z: number }): void {
    nearestNpc = null;
    let best = NPC_RADIUS;
    for (const npc of npcsInZone(currentZoneId)) {
      const d = Math.hypot(pos.x - npc.x, pos.z - npc.z);
      if (d < best) {
        best = d;
        nearestNpc = npc;
      }
    }
    if (nearestNpc) {
      hintEl.textContent = `[F] ${nearestNpc.name}와(과) 대화하기`;
      hintEl.hidden = false;
    } else {
      hintEl.hidden = true;
    }
  }

  // 저장/불러오기 바
  const saveBar = document.createElement("div");
  saveBar.className = "save-bar";
  const saveBtn = document.createElement("button");
  saveBtn.textContent = "저장";
  const loadBtn = document.createElement("button");
  loadBtn.textContent = "불러오기";
  saveBtn.addEventListener("click", () => {
    void saveGame(gameState, SAVE_SLOT).then(() =>
      hud.toast("저장했습니다"),
    );
  });
  loadBtn.addEventListener("click", () => {
    void (async () => {
      const saves = await listSaves();
      const latest = saves.sort((a, b) => b.savedAt - a.savedAt)[0];
      const data = latest ? await loadGame(latest.id) : null;
      if (!data) {
        hud.toast("불러올 저장 데이터가 없습니다");
        return;
      }
      combatBridge.end();
      dialogueUI.close();
      gameState.dispatch({
        type: "loadState",
        data: { ...data, combat: null },
      });
      const p = gameState.getState().player;
      if (p) {
        playerController.group.position.set(p.position.x, 0, p.position.z);
        loadZone(p.position.zone);
        hud.toast("불러왔습니다");
      } else {
        characterUI.show();
      }
    })();
  });
  saveBar.append(saveBtn, loadBtn);
  uiRoot.append(saveBar);

  // ---------- 이벤트 토스트 ----------
  gameState.bus.on("player:levelup", (payload) => {
    const level = (payload as { level: number }).level;
    hud.toast(`레벨 업! Lv.${level}`);
  });
  gameState.bus.on("combat:ended", (payload) => {
    const { result, exp, gold } = payload as {
      result: string;
      exp: number;
      gold: number;
    };
    if (result === "won") {
      hud.toast(`승리! 경험치 +${exp}, 골드 +${gold}`);
      handleCombatWon();
    } else {
      hud.toast("패배했습니다... 마을에서 쉬고 다시 도전하세요");
      const p = gameState.getState().player;
      if (p) p.hp = p.maxHp;
      restorePendingMob();
    }
  });
  gameState.bus.on("player:died", () => hud.toast("쓰러졌습니다"));
  gameState.bus.on("quest:completed", (payload) => {
    const { name } = payload as { name: string };
    hud.toast(`퀘스트 완료: ${name}`);
  });
  gameState.bus.on("player:itemGained", (payload) => {
    const { itemId, count } = payload as { itemId: string; count: number };
    try {
      hud.toast(`${getItem(itemId).name} ${count}개 획득`);
    } catch {
      /* 알 수 없는 아이템 무시 */
    }
  });

  function handleCombatWon(): void {
    const combat = gameState.getState().combat;
    if (!combat) return;
    const kills = new Map<string, number>();
    for (const e of combat.enemies) {
      if (!e.monsterId) continue;
      kills.set(e.monsterId, (kills.get(e.monsterId) ?? 0) + 1);
      // 드롭
      const def = MONSTERS[e.monsterId];
      for (const drop of def?.drops ?? []) {
        if (Math.random() < drop.chance) {
          gameState.dispatch({
            type: "addItem",
            itemId: drop.itemId,
            count: 1,
          });
        }
      }
    }
    for (const [monsterId, count] of kills) {
      gameState.dispatch({
        type: "questEvent",
        event: { type: "kill", target: monsterId, count },
      });
      if (pendingNode) {
        markKilled(
          spawnNodes,
          monsterId,
          pendingNode.x,
          pendingNode.z,
          Date.now(),
        );
        pendingNode = null;
      }
    }
  }

  function restorePendingMob(): void {
    if (pendingNode && !mobMeshes.has(pendingNode)) {
      addMobMesh(pendingNode);
    }
    pendingNode = null;
  }

  // ---------- 입력 ----------
  const onKeyDown = (e: KeyboardEvent): void => {
    if (e.code === "Space" && combatBridge.canPlayerAct()) {
      combatBridge.onPlayerAttack();
      e.preventDefault();
      return;
    }
    if (e.code === "Digit1" || e.code === "Digit2") {
      castSkill(e.code === "Digit1" ? 0 : 1);
      return;
    }
    if (e.code === "KeyF" && nearestNpc && !dialogueUI.isOpen()) {
      openNpc(nearestNpc);
      return;
    }
    if (e.code === "KeyI") {
      bagOpen = !bagOpen;
      if (bagOpen) bagUI.show();
      else bagUI.hide();
      return;
    }
    if (e.code === "KeyJ") {
      questLogOpen = !questLogOpen;
      if (questLogOpen) questLogUI.show();
      else questLogUI.hide();
      return;
    }
    if (e.code === "KeyQ") {
      usePotion();
    }
  };
  document.addEventListener("keydown", onKeyDown);

  function castSkill(index: number): void {
    const p = gameState.getState().player;
    const skillId = p?.skills[index];
    if (!skillId || !combatBridge.canPlayerAct()) return;
    try {
      gameState.dispatch({ type: "combatCastSkill", skillId });
    } catch (err) {
      hud.toast(err instanceof Error ? err.message : "시전 실패");
    }
  }

  function usePotion(): void {
    const p = gameState.getState().player;
    if (!p) return;
    for (const itemId of ["hp_potion_small", "hp_potion_medium"]) {
      if (countItem(p, itemId) > 0) {
        const r = gameState.dispatch({ type: "useItem", itemId }) as {
          ok: boolean;
          reason?: string;
        };
        hud.toast(r.ok ? "포션을 사용했습니다" : (r.reason ?? "사용 실패"));
        return;
      }
    }
    hud.toast("체력 포션이 없습니다");
  }

  characterUI.show();
  loadZone(currentZoneId);

  const onResize = (): void => sceneManager.resize();
  window.addEventListener("resize", onResize);

  const menusOpen = (): boolean =>
    bagOpen || questLogOpen || dialogueUI.isOpen();

  let last = performance.now();
  let lastAutosave = last;
  const loop = (now: number): void => {
    const dt = Math.min((now - last) / 1000, MAX_DT);
    last = now;

    const combat = inCombat(gameState);
    const paused = menusOpen();
    const p = gameState.getState().player;

    if (p && !combat && !paused) {
      playerController.update(dt, inputManager.state);
      const pos = playerController.getPosition();
      gameState.dispatch({ type: "setPosition", ...pos });

      checkEncounters(pos);
      checkPortals(pos);
      checkNpc(pos);
    } else {
      if (combat || paused) inputManager.reset();
      if (!p || paused) hintEl.hidden = true;
    }

    if (!paused) {
      combatBridge.update(dt * 1000);
      // 몬스터 리스폰
      for (const node of tickSpawns(spawnNodes, Date.now())) {
        addMobMesh(node);
      }
    }

    // 미니맵
    if (p) {
      const markers: { x: number; z: number; color: string }[] = [];
      for (const node of spawnNodes) {
        if (node.alive) markers.push({ x: node.x, z: node.z, color: "#7A2E2E" });
      }
      for (const npc of npcsInZone(currentZoneId)) {
        markers.push({ x: npc.x, z: npc.z, color: "#B08D3E" });
      }
      for (const portal of zoneDef().portals) {
        markers.push({ x: portal.x, z: portal.z, color: "#4A3A6B" });
      }
      minimap.update({
        player: { x: p.position.x, z: p.position.z },
        markers,
        bounds: minimapBounds,
      });
    }

    hud.update(gameState);
    sceneManager.update(dt);
    sceneManager.render();

    if (now - lastAutosave > AUTOSAVE_MS) {
      lastAutosave = now;
      if (gameState.getState().player) {
        void saveGame(gameState, SAVE_SLOT);
      }
    }

    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);

  function checkEncounters(pos: { x: number; z: number }): void {
    if (inCombat(gameState) || pendingNode) return;
    for (const [node, mesh] of mobMeshes) {
      if (!node.alive) continue;
      const d = Math.hypot(pos.x - node.x, pos.z - node.z);
      if (d < ENCOUNTER_RADIUS) {
        pendingNode = node;
        sceneManager.removeFromZone(mesh);
        mobMeshes.delete(node);
        combatBridge.startEncounter([node.monsterId]);
        const name = MONSTERS[node.monsterId]?.name ?? node.monsterId;
        hud.toast(`${name}와(과) 조우했습니다!`);
        return;
      }
    }
  }

  function checkPortals(pos: { x: number; z: number }): void {
    for (const portal of zoneDef().portals) {
      const d = Math.hypot(pos.x - portal.x, pos.z - portal.z);
      if (d < PORTAL_RADIUS) {
        travelTo(portal.to);
        return;
      }
    }
  }
}
