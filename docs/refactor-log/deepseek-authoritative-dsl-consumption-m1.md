# DeepSeek Authoritative DSL Consumption M1

## 1. Status

- current state: M1 implementation commit exists; M1 Oracle found a ledger-only Compatibility & Cutover blocker.
- current mode: GOAL_DRIVEN_CONTINUOUS_LOOP_LEDGER_REPAIR_NO_PUSH.
- loop id: DEEPSEEK-AUTHORITATIVE-DSL-CONSUMPTION-CONTINUOUS.
- repository baseline:
  - expected head: `e24c808e1a7a385d23da30b67364ad403da314d2`
  - expected branch: `main`
  - expected worktree: clean
  - expected ahead/behind: `0 2` for `origin/main...main`
  - expected subject: `feat(game-dsl): define DeepSeek authoritative support profile`
- implementation authorized: yes, for one dependency-ready capability gap at a time.
- commit authorized: yes, after local validation and Oracle-reviewed exact diff.
- production default cutover authorized: no.
- push authorized: no.
- next authorization gate: continue the same loop after Oracle-reviewed clean checkpoint, or stop on a defined `BLOCKED_*` state.

## 2. Goal

DeepSeek must completely consume the frozen `DEEPSEEK_RUN_AND_GUN_VALIDATION_PROFILE_V1` through the authoritative DSL path and eventually produce user-verifiable runtime artifacts for the fixed `UserValidationPrompt` named below.

The end target is not a generic engine expansion. It is a bounded capability profile for the fixed `赤焰突围` prompt: the prompt must be expressible, normalized, compiled, consumed by runtime, and verified without manual artifact repair, hidden scripts, undeclared fallback, or legacy success masking.

The final user-facing gate remains manual validation by the user after automated contract, executable, replay, and Oracle gates pass.

## 3. Non-goals

- Not an unlimited DSL expansion.
- Not support for every side-scrolling shooter or every game category.
- Not production active/default path cutover.
- Not a continuation of historical Commit7 or Commit8-11 numbering.
- Not model training or fine-tuning.
- Not a code implementation in M0.5.
- Not a DeepSeek live call in M0.5.
- Not a new Step37 durable log entry.
- Not WP5, deploy, canary, rollback, SLI, OSS, or cloud work.

## 4. Fixed Prompt Identity

Source attachment/reference:

- `/Users/dahufa/.codex/attachments/17076354-847d-4f1b-8439-4d366a8c9cdd/pasted-text.txt`
- `/Users/dahufa/.codex/attachments/946ff316-68b5-41b3-ae9e-9b6d8293398f/pasted-text.txt`

Identity:

- character count: 580
- SHA-256: `5bff34f8b97ea7ee5b0e66b5a17b893eda11fd327d3dadc128c30f3123c64686`
- identity match: yes
- prompt rewrite allowed: no

Fixed prompt:

```text
请生成一款原创的16位像素风横版跑射游戏，节奏参考经典街机跑射作品，但不得复用任何现有作品的角色、名称、美术、音乐、关卡布局或台词。游戏名为《赤焰突围》，单人游玩。

玩家从左向右推进，可左右移动、跳跃、下蹲和射击；空中可射击，受击后短暂无敌。初始武器为直线单发，关卡中可拾取散射弹和连射弹；拾取新武器时替换当前武器，死亡后恢复初始武器。玩家有3点生命和2次重试机会，生命归零时消耗一次重试并从最近检查点复活；无重试时进入失败界面，可重新开始。

制作一个连续关卡，分为丛林入口、金属桥和敌军核心三段。镜头跟随玩家且不能越过关卡边界。丛林入口包含巡逻步兵、固定炮台、跳台和一个检查点；金属桥包含从右侧进入的飞行敌人、间歇爆炸区域和武器补给；敌军核心先关闭入口，再生成两波敌人，清空后开启首领战。

首领为原创机械体“熔核守卫”，有两个阶段。第一阶段在地面左右移动并发射直线弹；生命低于一半后进入第二阶段，提高移动速度，并交替使用三向弹与从上方落下的危险区域。首领被击败后停止生成敌人，播放简短胜利反馈并进入通关界面。

HUD 显示玩家生命、剩余重试、当前武器和首领生命。玩家子弹只伤害敌人，敌方子弹和危险区域只伤害玩家；敌人与玩家接触也造成伤害。所有生成、碰撞、状态切换、检查点、胜负条件和界面跳转必须显式表达，不得依赖人工补丁、隐藏脚本或未声明的回退路径。
```

## 5. Authority Order

1. actual repository code/contracts
2. authoritative schema/types
3. active ledger
4. executable tests
5. historical drafts

## 6. Support Vocabulary

- `schema_expressible`: the authoritative schema can represent the node without unknown fields or lossy encoding.
- `normalized`: model-facing or authored input is transformed into canonical authoritative DSL while preserving the semantic node.
- `compiled`: the canonical node is transformed into a runtime plan, capability IR, or manifest-owned contract.
- `runtime_consumed`: runtime code or a runtime loader reads the compiled artifact and acts on the node.
- `qa_observed`: a contract, executable assertion, telemetry probe, or browser/runtime QA observes the behavior or artifact binding.
- `complete_supported`: all of `schema_expressible`, `normalized`, `compiled`, `runtime_consumed`, and `qa_observed` are true for the frozen capability.
- `conditional`: a construct can pass only under named preconditions. If the condition is absent, it must fail closed with a typed result.
- `unsupported`: no current authoritative path may claim success for the construct.
- `deferred`: schema or draft language may exist, but a downstream consumer or QA proof is missing.
- `CONDITIONAL_LEGACY_BACKED`: legacy runtime can execute a related behavior, but it is not `complete_supported` for this target.

Current M0 fact: `complete_supported` count is 0. Existing legacy runtime-backed abilities must not be promoted to `complete_supported` without authoritative schema, normalizer, compiler, runtime, and QA evidence.

## 7. Frozen Target Profile

Target profile: `DEEPSEEK_RUN_AND_GUN_VALIDATION_PROFILE_V1`.

Capability clusters:

1. profile identity and fixed prompt binding
2. player movement and action state
3. grounded and airborne firing state
4. damage and temporary invulnerability
5. weapon and loadout lifecycle
6. player health, retry, checkpoint, failure, and restart lifecycle
7. ordered level progression
8. camera follow and boundary limits
9. enemy, hazard, and supply archetypes
10. ordered wave and encounter gates
11. boss lifecycle and phase transitions
12. HUD and interface state
13. victory, failure, feedback, audio, and effect declarations
14. visual presentation metadata
15. authoritative DeepSeek draft, canonicalization, runtime artifact, and replay evidence

## 8. Requirement Traceability Matrix

| id | requirement_text | verification_class | existing_construct | required_new_construct | normalization_contract | compiler_contract | runtime_consumer_contract | QA evidence | milestone | completion_state |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| R001 | Original game, no reuse of existing characters, names, art, music, level layout, or lines. | USER_VERIFIABLE | Prompt policy text only | Originality declaration and asset/source provenance metadata | Preserve originality constraints as metadata and validation notes | Emit provenance expectations into manifest or validation package | Runtime need not prove originality, but must avoid hidden imported copyrighted refs | User review plus artifact provenance check | M8 | USER_VERIFIABLE_NOT_AUTOMATED |
| R002 | 16-bit pixel style. | ARTIFACT_VERIFIABLE | Visual hints only | visual_presentation metadata | Preserve style target in canonical profile | Emit style target to asset/runtime manifest | Runtime surfaces declared style metadata | Artifact manifest and screenshot review | M8 | REQUIRES_EXPANSION |
| R003 | Side-scrolling run-and-gun game. | EXECUTABLE | side_scrolling_run_and_gun legacy profile | target profile binding | Normalize to `DEEPSEEK_RUN_AND_GUN_VALIDATION_PROFILE_V1` | Compile to run-and-gun runtime plan | Runtime selects authoritative run-and-gun systems | Runtime smoke and QA profile | M1 | CONDITIONAL_LEGACY_BACKED |
| R004 | Arcade-paced reference without copying existing works. | USER_VERIFIABLE | Prompt policy text only | pacing intent metadata | Preserve as qualitative pacing intent | Compile only measurable timing if declared | Runtime may expose movement/spawn pacing values | User review; optional timing assertions | M8 | USER_VERIFIABLE_NOT_AUTOMATED |
| R005 | Game title is `赤焰突围`. | CONTRACT_VERIFIABLE | metadata/title | fixed title binding | Preserve title exactly | Emit title into runtime metadata | Runtime UI reads title from manifest or config | Contract assertion | M1 | SCHEMA_EXPRESSIBLE_ONLY |
| R006 | Single-player. | CONTRACT_VERIFIABLE | profile/player count implied | player_count | Normalize `single_player` | Compile player count into runtime config | Runtime creates one player controller | Contract or runtime assertion | M1 | REQUIRES_EXPANSION |
| R007 | Player advances from left to right. | EXECUTABLE | side-scrolling direction implied | progression_direction | Preserve direction in level progression | Compile segment order and spawn direction | Runtime starts left and advances right | Runtime position/progression assertion | M5 | REQUIRES_EXPANSION |
| R008 | Player can move left and right. | EXECUTABLE | movement.run_jump.v1 partially | horizontal_movement_action | Preserve action set | Compile control bindings and movement system | Runtime handles left/right input | Input simulation assertion | M2 | CONDITIONAL_LEGACY_BACKED |
| R009 | Player can jump. | EXECUTABLE | movement.run_jump.v1 | jump_action | Preserve action set | Compile jump physics | Runtime applies jump | Input simulation assertion | M2 | CONDITIONAL_LEGACY_BACKED |
| R010 | Player can crouch. | EXECUTABLE | none | crouch_action | Preserve crouch action and collision/state implications | Compile crouch control and state | Runtime handles crouch state | Input/state assertion | M2 | REQUIRES_EXPANSION |
| R011 | Player can shoot. | EXECUTABLE | combat.projectile.v1 | fire_action | Preserve fire action | Compile projectile system | Runtime emits player projectile | Projectile spawn assertion | M2 | CONDITIONAL_LEGACY_BACKED |
| R012 | Player can shoot while airborne. | EXECUTABLE | projectile plus jump only implicit | airborne_fire_allowed | Preserve grounded/airborne firing rule | Compile airborne fire permission | Runtime fires during jump/fall | Input simulation assertion | M2 | REQUIRES_EXPANSION |
| R013 | Player becomes briefly invulnerable after damage. | EXECUTABLE | health.damage_invulnerability.v1 contract seeded | damage_invulnerability_window | Preserve duration and trigger | Compile invulnerability state | Runtime suppresses repeated damage during window | Damage timing assertion | M2 | REQUIRES_EXPANSION |
| R014 | Initial weapon is straight single shot. | EXECUTABLE | projectile weapon hints | default_weapon_straight_single | Preserve default loadout | Compile weapon definition | Runtime equips default weapon | Weapon state assertion | M3 | REQUIRES_EXPANSION |
| R015 | Player can pick up spread shot. | EXECUTABLE | pickup.collectible.v1 partially | spread_weapon_pickup | Preserve pickup and loadout effect | Compile pickup-to-weapon transition | Runtime changes weapon to spread | Pickup and projectile pattern assertion | M3 | REQUIRES_EXPANSION |
| R016 | Player can pick up rapid-fire shot. | EXECUTABLE | pickup.collectible.v1 partially | rapid_fire_weapon_pickup | Preserve pickup and fire-rate effect | Compile pickup-to-weapon transition | Runtime changes weapon fire rate | Pickup and fire-rate assertion | M3 | REQUIRES_EXPANSION |
| R017 | New weapon pickup replaces current weapon. | EXECUTABLE | none | weapon_replacement_rule | Preserve replacement semantics | Compile loadout transition rule | Runtime has single active weapon | State transition assertion | M3 | REQUIRES_EXPANSION |
| R018 | Death restores initial weapon. | EXECUTABLE | none | loadout_reset_on_death | Preserve reset trigger | Compile lifecycle reset | Runtime resets loadout after death | Death/reset assertion | M3 | REQUIRES_EXPANSION |
| R019 | Player has 3 health points. | EXECUTABLE | health partially implied | player_health_points | Preserve exact health count | Compile player health config | Runtime initializes HP 3 | Runtime state assertion | M4 | REQUIRES_EXPANSION |
| R020 | Player has 2 retries. | EXECUTABLE | lives/restart loop partial legacy | retry_count | Preserve retry count | Compile retry lifecycle | Runtime tracks retries | Runtime state assertion | M4 | REQUIRES_EXPANSION |
| R021 | At zero health, consume one retry and respawn at nearest checkpoint. | EXECUTABLE | rules.restart_loop.v1 partial | retry_checkpoint_respawn_rule | Preserve trigger, retry decrement, checkpoint ref | Compile death flow | Runtime respawns at checkpoint | Death/checkpoint assertion | M4 | REQUIRES_EXPANSION |
| R022 | With no retries, enter failure screen. | EXECUTABLE | win/lose partial | failure_state_screen | Preserve terminal failure transition | Compile failure UI state | Runtime enters failure UI | UI state assertion | M4 | REQUIRES_EXPANSION |
| R023 | Failure screen can restart. | EXECUTABLE | restart loop partial | restart_from_failure | Preserve restart command and reset state | Compile restart transition | Runtime restarts full run | UI/input assertion | M4 | REQUIRES_EXPANSION |
| R024 | One continuous level contains three named segments: jungle entrance, metal bridge, enemy core. | CONTRACT_VERIFIABLE | scenes/segments deferred | ordered_named_segments | Preserve names and order | Compile segment graph | Runtime exposes ordered segment progression | Contract plus runtime segment assertion | M5 | REQUIRES_EXPANSION |
| R025 | Camera follows player and cannot cross level boundaries. | EXECUTABLE | camera.side_follow.v1 | camera_bounds | Preserve follow and bounds | Compile camera boundary config | Runtime clamps camera | Camera position assertion | M5 | CONDITIONAL_LEGACY_BACKED |
| R026 | Jungle entrance has patrol infantry. | EXECUTABLE | enemy waves partial | enemy_archetype_patrol_infantry | Preserve archetype and segment placement | Compile enemy archetype spawn | Runtime spawns patrol infantry | Spawn and movement assertion | M6 | REQUIRES_EXPANSION |
| R027 | Jungle entrance has fixed turret. | EXECUTABLE | spawn.static.v1 partial | enemy_archetype_fixed_turret | Preserve archetype and segment placement | Compile static turret behavior | Runtime spawns turret | Spawn and firing assertion | M6 | REQUIRES_EXPANSION |
| R028 | Jungle entrance has jump platforms. | EXECUTABLE | collision.platform.v1 | platform_segment_placement | Preserve platform placement | Compile platform collision | Runtime provides jumpable platform | Collision/jump assertion | M6 | CONDITIONAL_LEGACY_BACKED |
| R029 | Jungle entrance has one checkpoint. | EXECUTABLE | checkpoints deferred | checkpoint_node | Preserve checkpoint id and location | Compile checkpoint trigger | Runtime updates checkpoint | Checkpoint assertion | M4 | REQUIRES_EXPANSION |
| R030 | Metal bridge has flying enemies entering from right. | EXECUTABLE | enemy waves partial | flying_enemy_right_entry | Preserve archetype and entry side | Compile flying spawn rule | Runtime spawns flying enemy from right | Spawn trajectory assertion | M6 | REQUIRES_EXPANSION |
| R031 | Metal bridge has intermittent explosion areas. | EXECUTABLE | hazard.contact_damage.v1 partial | timed_explosion_hazard | Preserve hazard timing and area | Compile timed hazard schedule | Runtime activates hazard intervals | Hazard timing/damage assertion | M6 | REQUIRES_EXPANSION |
| R032 | Metal bridge has weapon supply. | EXECUTABLE | pickup.collectible.v1 partial | weapon_supply_node | Preserve supply type and placement | Compile pickup placement | Runtime exposes weapon pickups | Pickup assertion | M3 | REQUIRES_EXPANSION |
| R033 | Enemy core closes entrance first. | EXECUTABLE | none | encounter_gate_close_entrance | Preserve gate trigger and closed state | Compile encounter gate | Runtime closes entrance | Gate state assertion | M5 | REQUIRES_EXPANSION |
| R034 | Enemy core spawns two waves after entrance closes. | EXECUTABLE | spawn.enemy_wave.v1 partial | ordered_wave_sequence | Preserve sequence and count | Compile ordered waves | Runtime starts two waves in order | Wave order assertion | M5 | REQUIRES_EXPANSION |
| R035 | Clearing waves opens boss battle. | EXECUTABLE | objective/wave partial | boss_unlock_on_wave_clear | Preserve unlock condition | Compile trigger from wave-clear objective | Runtime starts boss after waves clear | Encounter transition assertion | M5 | REQUIRES_EXPANSION |
| R036 | Boss is original mechanical entity named `熔核守卫`. | CONTRACT_VERIFIABLE | bosses schema expressible only | boss_identity_node | Preserve name and originality metadata | Compile boss entity metadata | Runtime creates named boss | Contract plus runtime entity assertion | M7 | REQUIRES_EXPANSION |
| R037 | Boss has two phases. | EXECUTABLE | boss phases schema expressible only | boss_phase_count | Preserve phase list | Compile phase state machine | Runtime transitions phases | Phase assertion | M7 | REQUIRES_EXPANSION |
| R038 | Phase 1 moves left/right on ground and fires straight bullets. | EXECUTABLE | projectile and movement partial | boss_phase1_behavior | Preserve movement and attack pattern | Compile phase behavior | Runtime executes behavior | Boss behavior assertion | M7 | REQUIRES_EXPANSION |
| R039 | Below half health, boss enters phase 2. | EXECUTABLE | boss phases schema expressible only | hp_threshold_phase_transition | Preserve threshold | Compile transition guard | Runtime transitions at HP threshold | HP transition assertion | M7 | REQUIRES_EXPANSION |
| R040 | Phase 2 increases movement speed. | EXECUTABLE | none | boss_phase_speed_modifier | Preserve speed delta | Compile phase stat modifier | Runtime changes speed | Speed assertion | M7 | REQUIRES_EXPANSION |
| R041 | Phase 2 alternates three-way bullets and falling hazards from above. | EXECUTABLE | projectile/hazard partial | boss_alternating_attack_pattern | Preserve attack alternation and source | Compile attack pattern schedule | Runtime alternates attacks | Attack sequence assertion | M7 | REQUIRES_EXPANSION |
| R042 | Boss defeat stops enemy spawning. | EXECUTABLE | none | stop_spawn_on_boss_defeat | Preserve stop condition | Compile spawn shutdown trigger | Runtime stops spawns | Spawn absence assertion | M7 | REQUIRES_EXPANSION |
| R043 | Boss defeat plays short victory feedback. | ARTIFACT_VERIFIABLE | feedback/effects unsupported | victory_feedback_declaration | Preserve feedback declaration | Compile feedback event declaration | Runtime may emit declared feedback event | Artifact/event assertion plus user review | M8 | REQUIRES_EXPANSION |
| R044 | Boss defeat enters win screen. | EXECUTABLE | win/lose partial | win_screen_transition | Preserve win transition | Compile terminal win state | Runtime enters win UI | UI state assertion | M8 | REQUIRES_EXPANSION |
| R045 | HUD shows player health. | EXECUTABLE | UI default partial | hud_player_health | Preserve HUD field | Compile HUD binding | Runtime displays HP | UI assertion | M8 | REQUIRES_EXPANSION |
| R046 | HUD shows remaining retries. | EXECUTABLE | none | hud_remaining_retries | Preserve HUD field | Compile HUD binding | Runtime displays retries | UI assertion | M8 | REQUIRES_EXPANSION |
| R047 | HUD shows current weapon. | EXECUTABLE | none | hud_current_weapon | Preserve HUD field | Compile HUD binding | Runtime displays weapon | UI assertion | M8 | REQUIRES_EXPANSION |
| R048 | HUD shows boss health. | EXECUTABLE | boss HUD unsupported | hud_boss_health | Preserve HUD field and visibility condition | Compile boss HP binding | Runtime displays boss HP during battle | UI assertion | M8 | REQUIRES_EXPANSION |
| R049 | Player bullets only damage enemies. | EXECUTABLE | combat.projectile.v1 partial | damage_affinity_player_projectile | Preserve damage domain | Compile collision/damage masks | Runtime applies player projectile damage only to enemies | Collision assertion | M10 | REQUIRES_EXPANSION |
| R050 | Enemy bullets and hazardous areas only damage player. | EXECUTABLE | hazard.contact_damage.v1 partial | damage_affinity_enemy_hazard | Preserve damage domain | Compile collision/damage masks | Runtime damages only player | Collision assertion | M10 | REQUIRES_EXPANSION |
| R051 | Enemy contact damages player. | EXECUTABLE | hazard.contact_damage.v1 | enemy_contact_damage | Preserve contact damage rule | Compile contact damage | Runtime applies contact damage | Collision assertion | M10 | CONDITIONAL_LEGACY_BACKED |
| R052 | All spawning is explicitly expressed. | CONTRACT_VERIFIABLE | spawn rules partial | explicit_spawn_declarations | Reject implicit or hidden spawns | Compile all spawn declarations to plan | Runtime consumes declared spawns only | Plan/runtime diff assertion | M11 | REQUIRES_EXPANSION |
| R053 | All collisions are explicitly expressed. | CONTRACT_VERIFIABLE | collision partial | explicit_collision_matrix | Reject implicit collision domains | Compile collision matrix | Runtime consumes declared collision matrix | Collision contract assertion | M10 | REQUIRES_EXPANSION |
| R054 | All state transitions are explicitly expressed. | CONTRACT_VERIFIABLE | partial win/lose | explicit_state_transition_graph | Preserve transition graph | Compile state machine | Runtime consumes transition graph | State graph assertion | M10 | REQUIRES_EXPANSION |
| R055 | Checkpoints are explicitly expressed. | CONTRACT_VERIFIABLE | checkpoints deferred | explicit_checkpoint_nodes | Preserve checkpoint graph | Compile checkpoint plan | Runtime consumes checkpoint plan | Checkpoint contract/runtime assertion | M4 | REQUIRES_EXPANSION |
| R056 | Win and lose conditions are explicitly expressed. | CONTRACT_VERIFIABLE | winLose partial | explicit_terminal_conditions | Preserve win/lose rules | Compile terminal conditions | Runtime consumes terminal conditions | Win/lose assertion | M8 | REQUIRES_EXPANSION |
| R057 | UI transitions are explicitly expressed. | CONTRACT_VERIFIABLE | UI partial | explicit_ui_transition_graph | Preserve UI state transitions | Compile UI transition graph | Runtime consumes UI transitions | UI state assertion | M8 | REQUIRES_EXPANSION |
| R058 | No manual patch. | CONTRACT_VERIFIABLE | pipeline policy partial | manual_patch_forbidden_evidence | Preserve no-patch policy | Compile artifact lineage evidence | Runtime artifacts must derive from source artifacts | Artifact lineage assertion | M11 | REQUIRES_PIPELINE_EVIDENCE |
| R059 | No hidden script. | CONTRACT_VERIFIABLE | pipeline policy partial | hidden_script_forbidden_evidence | Preserve source/artifact refs | Compile manifest with declared modules only | Runtime loads declared modules only | Manifest/module-load assertion | M11 | REQUIRES_PIPELINE_EVIDENCE |
| R060 | No undeclared fallback path. | CONTRACT_VERIFIABLE | generation path receipt partial | fallback_policy_fail_closed | Preserve fallback policy | Compile path receipt and fail-closed rules | Runtime/generation does not claim fallback success | Path receipt assertion | M12 | REQUIRES_PIPELINE_EVIDENCE |

## 9. Capability Expansion Inventory

| cluster | existing capability | new capability required | schema impact | compiler impact | runtime impact | QA impact | dependency |
| --- | --- | --- | --- | --- | --- | --- | --- |
| M1 support vocabulary and profile | legacy runtime profiles, capability statuses | `DEEPSEEK_RUN_AND_GUN_VALIDATION_PROFILE_V1` profile contract | Add or freeze target profile contract | Bind profile to capability requirements | None until runtime milestones | Matrix assertions | M0.5 ledger |
| M2 movement/action state | `movement.run_jump.v1`, `combat.projectile.v1` | crouch, airborne fire, invulnerability | Add player action and damage state nodes | Compile actions and invulnerability state | Input and damage-state systems | Input/damage probes | M1 |
| M3 weapon lifecycle | `pickup.collectible.v1`, `combat.projectile.v1` | default/spread/rapid weapons, replacement, death reset | Add weapon/loadout lifecycle | Compile weapon definitions and transitions | Weapon state and projectile patterns | Pickup/fire-rate/pattern probes | M1, M2 |
| M4 player lifecycle | restart loop partial | health, retries, checkpoints, failure, restart | Add lifecycle and checkpoint nodes | Compile death/retry/checkpoint state machine | Health, retry, checkpoint, UI failure systems | Death/respawn/restart probes | M1, M2 |
| M5 ordered progression | side-follow, waves partial | named segments, gates, ordered waves, boss unlock | Add ordered encounter graph | Compile segment/gate/wave ordering | Encounter gate runtime | Segment and wave-order probes | M1 |
| M6 archetypes/hazards/supplies | static spawn, enemy wave, contact hazard | patrol infantry, turret, flying enemy, timed explosion, supply | Add archetype and timed hazard nodes | Compile archetype behaviors and hazard schedule | Enemy/hazard/supply systems | Spawn, movement, hazard timing probes | M2, M3, M5 |
| M7 boss lifecycle | bosses schema expressible only | phases, threshold transition, speed modifier, alternating attacks, stop spawns | Add boss lifecycle contract | Compile boss state machine and attacks | Boss runtime systems | Phase and defeat probes | M5, M6 |
| M8 HUD/transitions/feedback | UI/winLose partial, feedback unsupported | HUD fields, UI transition graph, feedback declarations | Add HUD and UI transition nodes | Compile HUD bindings and terminal transitions | HUD and terminal UI runtime | UI and event assertions | M3, M4, M7 |
| M9 DeepSeek authoritative draft | DeepSeek raw v0.1 generation | structured authoritative draft path | Add model-facing draft prompt/schema contract if needed | Normalize draft to canonical v0.2 | No direct runtime impact | Provider contract tests | M1-M8 contract targets |
| M10 canonical compiler/runtime plan | canonical compiler tests | full profile compilation | Expand canonical nodes | Compile all profile nodes to runtime plan | Runtime plan consumers | Plan coverage assertions | M2-M8 schemas |
| M11 manifest/artifact binding | runtime manifest shadow ideas | manifest/module/artifact evidence | Add refs and lineage fields if needed | Emit manifest and hashes | Runtime loader consumes declared modules | Loader/hash assertions | M10 |
| M12 validation suite | partial contract tests | negative/metamorphic/replay/holdout | Add invalid fixtures | Fail closed and canonical hash stable | Replay harness | Pass/fail/replay evidence | M9-M11 |
| M13 fixed prompt automated validation | none active | end-to-end fixed prompt harness | Use frozen prompt identity | Produce canonical artifacts | Produce runtime artifacts | Full traceability evidence | M9-M12 |
| M14 Oracle final review | Oracle process | final read-only gate | None | None | None | Oracle PASS | M13 |
| M15 user manual validation | user gate | validation package | None | None | User runs/observes | User acceptance | M14 |

## 10. Verification Classification

- `EXECUTABLE`: gameplay behavior, state transition, collision, progression, input, runtime UI, and boss behavior that can be driven in a runtime or contract harness.
- `CONTRACT_VERIFIABLE`: schema, canonical hash, capability lock, runtime plan, runtime manifest, path receipt, artifact lineage, and fail-closed policy assertions.
- `ARTIFACT_VERIFIABLE`: visual presentation metadata, feedback declarations, manifest refs, screenshots, and generated asset metadata that are inspectable but not sufficient for gameplay success alone.
- `USER_VERIFIABLE`: originality, look-and-feel judgment, subjective pacing, and final playability acceptance. These may be supported by artifacts but cannot be presented as fully automated proof.

Rules:

- Gameplay, state, collision, progression, and UI transitions should be executable whenever feasible.
- Schema or JSON acceptance alone is only producer evidence.
- Visual quality and originality must not be disguised as complete automated proof.
- Legacy runtime-backed success is conditional evidence only until canonical authoritative consumption is proven.

## 11. Milestone Plan

Each milestone is a single capability gap cluster. Each requires a separate prompt and must stop at its own authorization gate.

| milestone | objective | prerequisite | in_scope | out_of_scope | allowed_files | acceptance criteria | required tests | stop conditions | next authorization gate |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| M1 | Freeze support vocabulary and authoritative target profile. | M0.5 Oracle PASS | Profile contract, support matrix, complete_supported rules | Gameplay, runtime, compiler, and provider implementation | Not authorized by this ledger. The M1 prompt must enumerate exact files before any code or test edit. | No schema-expressible/support confusion; legacy runtime-backed remains conditional | Support vocabulary and matrix tests named by M1 authorization | Support vocabulary ambiguity, broad file scope, or unrelated diff | M2 |
| M2 | Player movement/action state. | M1 PASS | left/right, jump, crouch, grounded/airborne fire, invulnerability | Weapons, retries, boss | Targeted schema/normalizer/compiler/runtime/tests for player actions | Actions preserved through canonical and executable evidence | Positive and negative action-state tests | Crouch or invulnerability cannot be consumed | M3 |
| M3 | Weapon/loadout lifecycle. | M2 PASS | default weapon, spread, rapid-fire, replacement, death reset | Player retries/checkpoints | Targeted weapon schema/compiler/runtime/tests | Weapon lifecycle executable and no hidden fallback | Weapon pickup/replacement/death-reset tests | Weapon semantics require broader inventory system | M4 |
| M4 | Player lifecycle. | M3 PASS | health, retries, checkpoint restore, failure, restart | Segment gates, boss | Targeted lifecycle schema/compiler/runtime/tests | Death/retry/checkpoint/failure/restart executable | Lifecycle positive/negative tests | Retry/checkpoint semantics ambiguous | M5 |
| M5 | Ordered level progression. | M4 PASS | named segments, camera bounds, entrance closure, ordered waves, boss unlock | Enemy archetype internals, boss combat | Targeted progression/gate schema/compiler/runtime/tests | Progression graph consumed and executable | Segment/gate/wave-order tests | Runtime cannot consume ordered graph | M6 |
| M6 | Enemy/hazard/supply archetypes. | M5 PASS | patrol infantry, turret, flying enemy, timed explosion, weapon supply | Boss lifecycle | Targeted enemy/hazard/supply schema/compiler/runtime/tests | Archetypes and hazards observed in runtime | Spawn/archetype/hazard tests | Archetypes collapse into generic enemies | M7 |
| M7 | Boss lifecycle and phase transitions. | M6 PASS | boss identity, phases, HP threshold, speed transition, alternating attacks, stop-spawn-on-defeat | HUD and victory UI | Targeted boss schema/compiler/runtime/tests | Boss phase behavior executable | Boss phase and defeat tests | Boss schema accepted but runtime unsupported | M8 |
| M8 | HUD, victory/failure transitions, feedback declarations. | M7 PASS | HUD fields, win/failure screens, feedback/effects declarations, visual metadata | DeepSeek provider path | Targeted UI/feedback schema/compiler/runtime/tests | UI fields and terminal transitions observed; subjective visuals marked user-verifiable | UI/transition/feedback tests | Visual quality requires user-only decision | M9 |
| M9 | DeepSeek structured authoritative draft path. | M1-M8 contracts available | Prompt/model output into authoritative draft/canonical v0.2 path | Production default cutover | `apps/maker-api/src/model-provider/**`, targeted game-dsl schemas/tests, provider tests | DeepSeek path does not target raw v0.1 for this profile | Provider schema/fail-closed tests | Model output bypasses canonical validation | M10 |
| M10 | Canonical normalization/compiler/runtime plan. | M9 PASS | canonical hash, semantic preservation, runtime plan coverage | Runtime manifest hash evidence | Targeted canonical compiler/runtime plan files/tests | All profile nodes compiled or fail closed | Golden and semantic preservation tests | Silent omission in runtime plan | M11 |
| M11 | Runtime manifest, artifact binding, hash evidence. | M10 PASS | manifest, artifact refs, module load, no hidden script evidence | Negative/metamorphic suite | Targeted manifest/artifact/loader/tests | Manifest and artifact hashes bind to same source/run | Manifest/ref/hash tests | Manifest-only proof without runtime consumption | M12 |
| M12 | Negative, metamorphic, replay, holdout validation. | M11 PASS | fail-closed invalid cases, canonical replay, semantic equivalence | User validation | Targeted validation harness/tests | 100% negative fail-closed; replay stable | Negative/metamorphic/replay/holdout tests | Nondeterministic semantic artifacts | M13 |
| M13 | Fixed prompt automated validation. | M12 PASS | Frozen prompt to canonical/runtime artifacts, traceability evidence | Manual pass claim | Targeted local harness/tests/docs package | Fixed prompt produces auditable artifacts or typed fail-closed | End-to-end fixed prompt validation | Any prompt requirement unsupported or missing evidence | M14 |
| M14 | Oracle final review. | M13 PASS | Read-only review of diff/evidence | Code changes | No edits unless authorized repair loop | Oracle PASS with no blocking finding | Oracle review | Oracle P0/P1/P2 or out-of-scope finding | M15 |
| M15 | User manual validation. | M14 PASS | User validation package and hold | Commit | Docs/package only if authorized | User can run and inspect artifacts | User-run instructions reviewed | User has not accepted | Commit authorization, if requested |

## 12. Acceptance Model

- supported semantic pass rate: 100% for constructs marked `complete_supported`.
- negative fail-closed pass rate: 100% for invalid, unknown, unsupported, or unmet-conditional constructs.
- replay stability: same DSL, schema version, capability lock, and model/prompt config must produce equivalent canonical semantic artifacts by canonical hash.
- no silent omission: every fixed prompt requirement must map to a canonical node, typed blocker, or user-verifiable classification.
- no manual patch: generated or runtime artifacts must derive from declared source artifacts.
- no undeclared fallback: legacy or deterministic fallback cannot be counted as authoritative DeepSeek validation success.
- user acceptance gate: final goal remains `AWAITING_USER_ACCEPTANCE` until the user explicitly reports manual validation success.

## 13. Risk and Stop Conditions

- `BLOCKED_SCOPE_AMBIGUOUS`: support vocabulary, target profile, or prompt semantics are no longer uniquely defined.
- `BLOCKED_TARGET_DSL_GAP_REQUIRES_SCOPE_EXPANSION`: a new requirement exceeds the fixed profile.
- `BLOCKED_REPOSITORY_STATE_MISMATCH`: branch, head, ahead/behind, or worktree differ from the authorized baseline.
- `BLOCKED_UNRELATED_WORKTREE_CHANGES`: unrelated tracked or untracked changes appear.
- `BLOCKED_VALIDATION_FAILURE`: targeted tests or contract checks fail.
- `BLOCKED_ORACLE_FINDING`: Oracle finds P0/P1/P2 requiring out-of-scope work.
- `BLOCKED_OUT_OF_SCOPE_CHANGE_REQUIRED`: a milestone needs production cutover, deploy, cloud, or other forbidden work.
- `BLOCKED_NO_MEASURABLE_PROGRESS`: two cycles close no measurable requirement or evidence gap.
- `BLOCKED_OSCILLATING_IMPLEMENTATION`: implementation reverses direction once without new evidence.
- `BLOCKED_REPEATED_FAILURE`: same failure signature recurs twice without improvement.
- legacy fallback leakage: any authoritative validation success depends on `legacy_template_v1` or deterministic local fallback.
- schema/runtime contract mismatch: schema accepts a node that compiler/runtime cannot consume.
- non-verifiable requirement: a requirement is claimed automated without executable, contract, artifact, or user-verifiable evidence.

Compatibility and cutover note:

- M0.5 changes no producer contract, schema, runtime behavior, or QA evidence.
- Future milestones that change a producer contract must include the repository-required Compatibility & Cutover check before closure.

## 14. Decision Log

| date | decision | evidence |
| --- | --- | --- |
| 2026-06-25 | M0 found current active DeepSeek consumer still targets legacy RawGameDsl v0.1, while authoritative target is CanonicalGameDsl v0.2. | M0 read-only audit |
| 2026-06-25 | M0 found `complete_supported` count is 0 under strict registry vocabulary. | M0 read-only audit |
| 2026-06-25 | Oracle M0 result was FAIL because support vocabulary was ambiguous and the fixed prompt contains unsupported product semantics. | Oracle M0 review |
| 2026-06-25 | Scope decision: `AUTHORIZE_TARGETED_AUTHORITATIVE_DSL_EXPANSION`. | M0.5 user authorization |
| 2026-06-25 | Target profile frozen as `DEEPSEEK_RUN_AND_GUN_VALIDATION_PROFILE_V1`. | M0.5 user authorization |
| 2026-06-25 | M0.5 is no-code ledger work only; code, schema, runtime, tests, fixtures, DeepSeek calls, artifacts, stage, commit, and push remain forbidden. | M0.5 prompt |
| 2026-06-25 | Next required authorization is explicit M1 implementation authorization. | M0.5 prompt |
| 2026-06-25 | Continuous loop preflight accepted `e24c808e1a7a385d23da30b67364ad403da314d2` on `main` with clean worktree and `origin/main...main` at `0 2`; push remains forbidden. | `DEEPSEEK-AUTHORITATIVE-DSL-CONSUMPTION-CONTINUOUS` preflight |
| 2026-06-25 | M1 Oracle review found no code-level P0/P2, but blocked M1 closure with P1 because `targetProfileSupport` changed the DSL consumption report field surface without an M1 `Compatibility & Cutover` record. | Oracle review `019efaa9-1473-74c0-aa55-1711d17ea6d3` |

## 15. Current Next Action

ORACLE_REVIEW_D0_DOCS_CHECKPOINT

## 16. M1 Support Vocabulary and Target Profile Contract

- status: D0_DOCS_CHECKPOINT_ORACLE_PASSED_AWAITING_COMMIT
- mode: IMPLEMENT_NO_COMMIT
- objective: machine-freeze M0/M0.5 support vocabulary and `DEEPSEEK_RUN_AND_GUN_VALIDATION_PROFILE_V1` without implementing new gameplay capability.
- implementation authorized: yes, for M1 only.
- commit authorized: no.
- runtime behavior changed: no.
- schema changed: no CanonicalGameDsl, CapabilityGameDslDraft, or RawGameDsl schema changed.
- DeepSeek path changed: no.
- generated artifacts: none.

Exact changed files:

- `docs/refactor-log/deepseek-authoritative-dsl-consumption-m1.md`
- `packages/game-dsl/src/gameplay-capabilities/registry.ts`
- `packages/game-dsl/src/dsl-consumption-report.ts`
- `packages/game-dsl/src/deepseek-run-and-gun-validation-profile-v1.ts`
- `packages/game-dsl/src/index.ts`
- `tests/contracts/deepseek-authoritative-dsl-support.test.ts`

Support vocabulary final definition:

- source location: `packages/game-dsl/src/gameplay-capabilities/registry.ts`
- evidence dimensions: `schema_expressible`, `normalized`, `compiled`, `runtime_consumed`, `qa_observed`
- derived formula: `complete_supported = schema_expressible && normalized && compiled && runtime_consumed && qa_observed`
- derived classifications: `COMPLETE_SUPPORTED`, `CONDITIONAL_LEGACY_BACKED`, `UNSUPPORTED`, `DEFERRED`, `CONTRACT_SEEDED`
- manual complete_supported override possible: no; `isCompleteSupportedGameplayCapability` derives from evidence dimensions, not from the descriptor status string alone.
- legacy runtime-backed handling: `runtime_backed` derives to `CONDITIONAL_LEGACY_BACKED` unless all five support evidence dimensions become true.

Target profile:

- source location: `packages/game-dsl/src/deepseek-run-and-gun-validation-profile-v1.ts`
- id: `DEEPSEEK_RUN_AND_GUN_VALIDATION_PROFILE_V1`
- version: `v1`
- authoritative DSL version: `game-dsl.v0.2`
- fixed prompt character count: 580
- fixed prompt SHA-256: `5bff34f8b97ea7ee5b0e66b5a17b893eda11fd327d3dadc128c30f3123c64686`
- requirement count: 60
- capability cluster count: 15
- complete_supported count: 0

Consumption report:

- source location: `packages/game-dsl/src/dsl-consumption-report.ts`
- M1 adds `targetProfileSupport` as additive report evidence.
- The field lists target profile capability support dimensions, derived classification, complete_supported result, legacy-backed status, and missing evidence dimensions.
- Existing raw DSL path consumption status semantics remain unchanged.

M1 Compatibility & Cutover:

| Check | Required answer |
| --- | --- |
| Producer change | `DslConsumptionReportSchema` adds optional field `targetProfileSupport`; `packages/game-dsl/src/deepseek-run-and-gun-validation-profile-v1.ts` adds the frozen target profile and support-summary producer; `packages/game-dsl/src/gameplay-capabilities/registry.ts` adds support-evidence derivation APIs. |
| Consumer list | `buildDslConsumptionReport`, `DslConsumptionReportSchema`, `tests/contracts/deepseek-authoritative-dsl-support.test.ts`, `tests/contracts/dsl-consumption-report.test.ts`, `tests/contracts/scene-dsl.test.ts`, pipeline readers that parse `dsl_consumption_report.json` through `DslConsumptionReportSchema`. |
| Compatibility type | `LOSSLESS_COMPATIBLE`: the new report field is optional and additive; existing `entries`, `summary`, `schemaVersion`, and raw DSL consumption status semantics are unchanged. |
| Authority | `DEEPSEEK_RUN_AND_GUN_VALIDATION_PROFILE_V1` is the profile authority; `GameplayCapabilityRegistry` is the capability evidence authority; `targetProfileSupport` is derived evidence, not a manual support override. |
| Legacy strategy | Legacy runtime-backed capabilities remain `CONDITIONAL_LEGACY_BACKED` unless all five support-evidence dimensions are true. Legacy fixed-template execution cannot count as authoritative DeepSeek validation success. |
| Failure policy | Unknown, malformed, partial, or missing evidence dimensions derive to false; no status string can manually promote a capability to `complete_supported`. Missing consumer evidence keeps capabilities incomplete rather than falling back. |
| Evidence | `tests/contracts/deepseek-authoritative-dsl-support.test.ts` asserts the fixed profile identity, zero `complete_supported`, missing dimensions, stable ordering, malformed-evidence fail-closed behavior, and `targetProfileSupport` consumption through `buildDslConsumptionReport`; existing DSL report tests still parse the additive field. |
| Rollback | Reverting M1 removes only the optional report field, support-summary producer, and exports; previous DSL consumption report semantics remain valid because old consumers do not require `targetProfileSupport`. |

Compatibility disposition:

```ts
const M1_TARGET_PROFILE_SUPPORT_DISPOSITION = "LOSSLESS_COMPATIBLE";
```

Validation commands and results:

- `npx vitest run tests/contracts/deepseek-authoritative-dsl-support.test.ts`: pass, 1 file / 10 tests.
- Initial failing signature before implementation: 9 failed tests, including missing target profile, missing support vocabulary API, status-only complete_supported override, and absent `targetProfileSupport`.
- `npx vitest run tests/contracts/gameplay-capability-registry.test.ts tests/contracts/generation-capability-readiness.test.ts tests/contracts/generation-capability-runtime.test.ts tests/contracts/dsl-consumption-report.test.ts tests/contracts/scene-dsl.test.ts`: pass, 5 files / 28 tests.
- `npm run typecheck:root`: pass.
- `git diff --check`: pass.
- `rg -n "M1 Compatibility & Cutover|targetProfileSupport.*LOSSLESS_COMPATIBLE|ORACLE_REVIEW_STATUS: FAIL" docs/refactor-log/deepseek-authoritative-dsl-consumption-m1.md`: initial docs-first failure, exit 1 before this repair.

Diff fingerprint:

- algorithm: stable path-sorted SHA-256 over unstaged tracked diffs plus full contents of scope untracked files.
- included paths: the exact changed files listed above.
- storage note: the final digest is reported in the Oracle package and final response rather than embedded here, because embedding a digest into the file included in that digest would create self-referential hash churn.

Oracle review:

- status: FAIL
- findings:
  - P1: M1 added `targetProfileSupport` to DSL consumption report evidence without the repository-required M1 `Compatibility & Cutover` section.
  - P3: ledger baseline drift was non-blocking but must be recorded; current HEAD is `e24c808e1a7a385d23da30b67364ad403da314d2`, branch `main`, worktree clean, `origin/main...main` is `0 2`.

Blockers:

- M1 closure remains blocked until this ledger-only repair passes local validation and Oracle review.

Next authorization gate:

- `AUTO_COMMIT_REVIEWED_DIFF_AUTHORIZED` for this ledger-only repair if local validation passes, Oracle PASS is received, changed files equal the file lock, and no push is performed.

## 17. Continuous Loop Decomposition Checkpoint

- iteration id: `CONTINUOUS-20260625-D0-DOCS-CHECKPOINT`
- status: LOCAL_COMMITTED_NO_PUSH
- mode: DOCS_ONLY_NO_PUSH
- objective: understand the continuous loop, split it into dependency-coherent capability-gap groups, and land the split in durable docs before new implementation begins.
- plan document: `docs/plans/deepseek-authoritative-dsl-consumption-continuous-loop.md`
- canonical ledger: `docs/refactor-log/deepseek-authoritative-dsl-consumption-m1.md`
- affected clusters: M1 ledger repair plus planning for M2-M15; no production capability evidence changes.
- file lock:
  - `docs/refactor-log/deepseek-authoritative-dsl-consumption-m1.md`
  - `docs/plans/deepseek-authoritative-dsl-consumption-continuous-loop.md`
- acceptance assertions:
  - M1 `Compatibility & Cutover` table exists and uses the fixed disposition vocabulary.
  - Oracle P1 and current preflight facts are recorded.
  - Continuous loop decomposition is documented before implementation resumes.
  - The next implementation candidate is identified as M2 player action-state contract, but no production code is changed in D0.
- expected failing docs check:
  - `rg -n "M1 Compatibility & Cutover|targetProfileSupport.*LOSSLESS_COMPATIBLE|ORACLE_REVIEW_STATUS: FAIL" docs/refactor-log/deepseek-authoritative-dsl-consumption-m1.md` exited 1 before the repair.
- validation plan:
  - `rg -n "M1 Compatibility & Cutover|LOSSLESS_COMPATIBLE|Continuous Loop Decomposition Checkpoint|CONTINUOUS-M2-ACTION-STATE-CONTRACT-001" docs/refactor-log/deepseek-authoritative-dsl-consumption-m1.md docs/plans/deepseek-authoritative-dsl-consumption-continuous-loop.md`
  - `git diff --check`
  - changed-file trailing whitespace scan for the two Markdown files.
- validation result:
  - `rg -n "M1 Compatibility & Cutover|LOSSLESS_COMPATIBLE|Continuous Loop Decomposition Checkpoint|CONTINUOUS-M2-ACTION-STATE-CONTRACT-001" docs/refactor-log/deepseek-authoritative-dsl-consumption-m1.md docs/plans/deepseek-authoritative-dsl-consumption-continuous-loop.md`: pass.
  - `git diff --check`: pass, no output.
  - `git diff --name-only && git ls-files --others --exclude-standard`: changed files are exactly the file lock.
  - `rg -n "[ \t]+$" docs/refactor-log/deepseek-authoritative-dsl-consumption-m1.md docs/plans/deepseek-authoritative-dsl-consumption-continuous-loop.md`: pass, no trailing whitespace matches.
- Oracle review:
  - first review: FAIL
  - finding: P2, reviewed diff fingerprint omitted the untracked plan file because the first fingerprint used plain `git diff`.
  - remediation: use a content-inclusive fingerprint that combines tracked ledger diff and a `git diff --no-index` patch for the untracked plan file, then submit Oracle re-review.
  - second review: PASS
  - reviewed fingerprint: `c3135509c53b59bd1a49bdb3c57c20825573dc207b616c3198b2192fe9f86469`
  - remaining findings: P0/P1/P2 none; P3 only notes that cached diff checks should be rerun after precise staging.
- commit policy: auto-commit only after Oracle PASS and staged files exactly match the file lock.
- next action after commit: return to Phase A and freeze the first implementation iteration for M2 player action-state contract.

## 18. Continuous M2 Action-State Contract 001

- iteration id: `CONTINUOUS-M2-ACTION-STATE-CONTRACT-001`
- status: LOCAL_COMMITTED_NO_PUSH
- mode: IMPLEMENT_NO_PUSH
- capability gap: target profile references `movement.crouch.v1` and `combat.airborne_fire.v1`, but the gameplay capability registry does not yet carry those IDs as explicit planned contracts.
- affected requirements:
  - `R010`: Player can crouch.
  - `R012`: Player can shoot while airborne.
  - Guarded existing M2 requirements: `R008`, `R009`, `R011`, `R013` must not be promoted to complete support by this iteration.
- affected cluster: `M2`
- objective: register the missing M2 action-state capability IDs as incomplete planned capability contracts so support reporting is explicit and fail-closed, without adding runtime behavior or claiming `complete_supported`.
- prerequisites:
  - D0 docs checkpoint committed as `5ff1addd83aadbcfbf43fe644ef903da174c3612`.
  - Worktree clean before this iteration.
- file lock:
  - `packages/game-dsl/src/gameplay-capabilities/registry.ts`
  - `tests/contracts/deepseek-authoritative-dsl-support.test.ts`
  - `docs/refactor-log/deepseek-authoritative-dsl-consumption-m1.md`
- acceptance assertions:
  - `movement.crouch.v1` is registered in `GameplayCapabilityRegistry`.
  - `combat.airborne_fire.v1` is registered in `GameplayCapabilityRegistry`.
  - Both capabilities derive `DEFERRED`, not `COMPLETE_SUPPORTED`.
  - Both capabilities remain `completeSupported=false`.
  - Both capabilities keep all five support-evidence dimensions incomplete until real schema, normalizer, compiler, runtime, and QA evidence exist.
  - `DEEPSEEK_RUN_AND_GUN_VALIDATION_PROFILE_V1` remains at 60 requirements, 15 clusters, and zero complete-supported capabilities.
- expected failing test:
  - Add a contract assertion in `tests/contracts/deepseek-authoritative-dsl-support.test.ts` that M2 crouch and airborne-fire capabilities are registered as deferred support.
- expected support-evidence change:
  - `registered=true` for `movement.crouch.v1` and `combat.airborne_fire.v1`.
  - `classification` changes from `UNSUPPORTED` to `DEFERRED`.
  - `completeSupported` remains false.
  - `schema_expressible`, `normalized`, `compiled`, `runtime_consumed`, and `qa_observed` remain false.
- targeted tests:
  - `npx vitest run tests/contracts/deepseek-authoritative-dsl-support.test.ts`
- regression tests:
  - `npx vitest run tests/contracts/gameplay-capability-registry.test.ts tests/contracts/generation-capability-readiness.test.ts tests/contracts/dsl-consumption-report.test.ts`
  - `npm run typecheck:root`
  - `git diff --check`
- stop conditions:
  - Any need to edit outside the file lock.
  - Any pressure to mark M2 or either new capability as `complete_supported` without real downstream consumer and QA evidence.
  - Any runtime, provider, production cutover, or fixed-template fallback change.
- RED result:
  - `npx vitest run tests/contracts/deepseek-authoritative-dsl-support.test.ts`: failed, 1 failed / 10 passed.
  - failure signature: `movement.crouch.v1` and `combat.airborne_fire.v1` were `registered=false` and `classification=UNSUPPORTED` in target profile support.
- implementation:
  - `packages/game-dsl/src/gameplay-capabilities/registry.ts` registers `movement.crouch.v1` and `combat.airborne_fire.v1` as `planned` capability descriptors for `side_scrolling_run_and_gun.v1`.
  - `tests/contracts/deepseek-authoritative-dsl-support.test.ts` asserts both capabilities are registered, derive `DEFERRED`, and keep all five support-evidence dimensions false.
  - No schema, normalizer, compiler, runtime, provider, production cutover, or fallback behavior changed.
- support evidence:

| capability id | registered | classification | schema_expressible | normalized | compiled | runtime_consumed | qa_observed | complete_supported |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `movement.crouch.v1` | true | `DEFERRED` | false | false | false | false | false | false |
| `combat.airborne_fire.v1` | true | `DEFERRED` | false | false | false | false | false | false |

- Compatibility & Cutover:

| Check | Required answer |
| --- | --- |
| Producer change | `GameplayCapabilityRegistry` gains two planned capability IDs: `movement.crouch.v1` and `combat.airborne_fire.v1`; target profile support output changes those IDs from unknown `UNSUPPORTED` to registered `DEFERRED`. |
| Consumer list | `buildDeepSeekRunAndGunValidationProfileSupportSummary`, `buildDslConsumptionReport` through `targetProfileSupport`, registry validation, and the DeepSeek support contract tests read the new IDs. No runtime consumer is added. |
| Compatibility type | `LOSSLESS_COMPATIBLE` for support-report consumers because unknown gaps become explicit deferred gaps without removing or rewriting existing IDs. Runtime gameplay support remains incomplete and is not claimed. |
| Authority | `GameplayCapabilityRegistry` is the source of truth for the two capability IDs; `DEEPSEEK_RUN_AND_GUN_VALIDATION_PROFILE_V1` remains the target-profile requirement authority. |
| Legacy strategy | No legacy runtime alias is attached to either capability; legacy fixed-template behavior cannot satisfy crouch or airborne-fire authoritative support. |
| Failure policy | Both capabilities keep false evidence dimensions and `completeSupported=false`; downstream reports must continue to show missing schema, normalizer, compiler, runtime, and QA evidence until real consumers exist. |
| Evidence | The new contract test asserts both IDs are registered as `DEFERRED` with all five evidence dimensions false; target profile complete-supported count remains zero. |
| Rollback | Reverting this iteration returns the two IDs to unknown `UNSUPPORTED` in support reports without changing runtime behavior or generated artifacts. |

- validation result:
  - `npx vitest run tests/contracts/deepseek-authoritative-dsl-support.test.ts`: pass, 1 file / 11 tests.
  - `npx vitest run tests/contracts/gameplay-capability-registry.test.ts tests/contracts/generation-capability-readiness.test.ts tests/contracts/dsl-consumption-report.test.ts`: pass, 3 files / 16 tests.
  - `npm run typecheck:root`: pass.
  - `git diff --check`: pass.
  - `git diff --name-only`: exactly the file lock.
- Oracle review:
  - status: PASS
  - reviewed fingerprint: `21f2a08df1f6f41a99219efd4c9c6be753a7c6fbfeb13da77493e345fa5539a9`
  - findings: P0/P1/P2/P3 none.
- final Oracle review:
  - status: PASS
  - reviewed fingerprint: `c1f83d5a1119db2a1f158e73f30a56404777e14e5a5516cbbe47723e77e91011`
  - findings: P0/P1/P2/P3 none.
- commit:
  - `397df79e6fc53dc95a66b54d4306490f024b5a37`
  - subject: `feat(game-dsl): register action-state capability gaps`
  - push: not performed.
- next action: return to Phase A and freeze the next dependency-ready gap from live target-profile support.

## 19. Continuous M1 Profile Metadata Registry 001

- iteration id: `CONTINUOUS-M1-PROFILE-METADATA-REGISTRY-001`
- status: LOCAL_COMMITTED_NO_PUSH
- mode: IMPLEMENT_NO_PUSH
- capability gap: target profile cluster `M1` references `profile.deepseek_run_and_gun_validation.v1` and `metadata.fixed_prompt_binding.v1`, but live support summary still reports both as unknown `UNSUPPORTED`.
- affected requirements:
  - `R003`: side-scrolling run-and-gun target-profile binding.
  - `R005`: fixed game title and prompt-bound metadata binding.
  - `R006`: single-player target-profile metadata guard.
- affected cluster: `M1`
- objective: register the profile and fixed-prompt metadata capability IDs as explicit contract-seeded evidence so the profile-support baseline distinguishes seeded M1 contracts from truly unknown future gaps, without claiming runtime completion.
- prerequisites:
  - D0 docs checkpoint committed as `5ff1addd83aadbcfbf43fe644ef903da174c3612`.
  - M2 action-state registry checkpoint committed as `397df79e6fc53dc95a66b54d4306490f024b5a37`.
  - Worktree clean before this iteration.
- file lock:
  - `packages/game-dsl/src/gameplay-capabilities/registry.ts`
  - `tests/contracts/deepseek-authoritative-dsl-support.test.ts`
  - `docs/refactor-log/deepseek-authoritative-dsl-consumption-m1.md`
- acceptance assertions:
  - `profile.deepseek_run_and_gun_validation.v1` is registered in `GameplayCapabilityRegistry`.
  - `metadata.fixed_prompt_binding.v1` is registered in `GameplayCapabilityRegistry`.
  - Both capabilities derive `CONTRACT_SEEDED`, not `COMPLETE_SUPPORTED`.
  - Both capabilities remain `completeSupported=false`.
  - Both capabilities expose `schema_expressible=true` and keep `normalized`, `compiled`, `runtime_consumed`, and `qa_observed` false.
  - `DEEPSEEK_RUN_AND_GUN_VALIDATION_PROFILE_V1` remains at 60 requirements, 15 clusters, and zero complete-supported capabilities.
- expected failing test:
  - Add a contract assertion in `tests/contracts/deepseek-authoritative-dsl-support.test.ts` that M1 profile and fixed-prompt metadata capability IDs are registered as contract-seeded support.
- expected support-evidence change:
  - `registered=true` for `profile.deepseek_run_and_gun_validation.v1` and `metadata.fixed_prompt_binding.v1`.
  - `classification` changes from `UNSUPPORTED` to `CONTRACT_SEEDED`.
  - `completeSupported` remains false.
  - `schema_expressible` becomes true through seeded contract evidence; downstream evidence dimensions remain false.
- targeted tests:
  - `npx vitest run tests/contracts/deepseek-authoritative-dsl-support.test.ts`
- regression tests:
  - `npx vitest run tests/contracts/gameplay-capability-registry.test.ts tests/contracts/generation-capability-readiness.test.ts tests/contracts/dsl-consumption-report.test.ts`
  - `npm run typecheck:root`
  - `git diff --check`
- stop conditions:
  - Any need to edit outside the file lock.
  - Any pressure to mark either M1 metadata capability as `complete_supported` without all five evidence dimensions.
  - Any runtime, provider, production cutover, or fixed-template fallback change.
- RED result:
  - `npx vitest run tests/contracts/deepseek-authoritative-dsl-support.test.ts`: failed, 1 failed / 11 passed.
  - failure signature: `metadata.fixed_prompt_binding.v1` and `profile.deepseek_run_and_gun_validation.v1` were `registered=false`, `classification=UNSUPPORTED`, and missing `schema_expressible`.
- implementation:
  - `packages/game-dsl/src/gameplay-capabilities/registry.ts` adds `metadata` and `profile` to the capability domain vocabulary.
  - The registry adds `metadata.fixed_prompt_binding.v1` and `profile.deepseek_run_and_gun_validation.v1` as `contract_seeded` descriptors for `side_scrolling_run_and_gun.v1`.
  - `tests/contracts/deepseek-authoritative-dsl-support.test.ts` asserts both M1 IDs are registered, derive `CONTRACT_SEEDED`, keep downstream dimensions false, and remain below `complete_supported`.
  - No normalizer, compiler, runtime, provider, production cutover, or fallback behavior changed.
- support evidence:

| capability id | registered | classification | schema_expressible | normalized | compiled | runtime_consumed | qa_observed | complete_supported |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `metadata.fixed_prompt_binding.v1` | true | `CONTRACT_SEEDED` | true | false | false | false | false | false |
| `profile.deepseek_run_and_gun_validation.v1` | true | `CONTRACT_SEEDED` | true | false | false | false | false | false |

- target profile summary after implementation:
  - requirements: 60
  - clusters: 15
  - required capabilities: 59
  - registered capabilities: 12
  - complete-supported capabilities: 0
  - legacy-backed capabilities: 7
- Compatibility & Cutover:

| Check | Required answer |
| --- | --- |
| Producer change | `GameplayCapabilityRegistry` gains `metadata` and `profile` capability domains plus two contract-seeded IDs: `metadata.fixed_prompt_binding.v1` and `profile.deepseek_run_and_gun_validation.v1`; target-profile support changes those IDs from unknown `UNSUPPORTED` to registered `CONTRACT_SEEDED`. |
| Consumer list | Registry validation, `buildDeepSeekRunAndGunValidationProfileSupportSummary`, `buildDslConsumptionReport` through `targetProfileSupport`, and the DeepSeek support contract tests read the new domain vocabulary and capability IDs. No runtime consumer is added. |
| Compatibility type | `LOSSLESS_COMPATIBLE` for support-report consumers because unknown M1 profile gaps become explicit seeded contract gaps without removing or rewriting existing fields. Runtime gameplay support remains incomplete and is not claimed. |
| Authority | `DEEPSEEK_RUN_AND_GUN_VALIDATION_PROFILE_V1` remains the target-profile authority; `GameplayCapabilityRegistry` is the support-evidence authority for the new IDs. |
| Legacy strategy | No legacy runtime alias is attached to either capability; legacy fixed-template execution cannot satisfy profile or fixed-prompt authoritative evidence by itself. |
| Failure policy | Both capabilities keep `completeSupported=false`; reports continue to expose missing normalizer, compiler, runtime, and QA evidence until those consumers exist. |
| Evidence | The new contract test asserts both IDs are `CONTRACT_SEEDED` with only `schema_expressible=true`; support-summary evidence confirms complete-supported count remains zero. |
| Rollback | Reverting this iteration returns the two IDs to unknown `UNSUPPORTED` in target-profile support without changing runtime behavior or generated artifacts. |

- validation result:
  - `npx vitest run tests/contracts/deepseek-authoritative-dsl-support.test.ts`: pass, 1 file / 12 tests.
  - `npx vitest run tests/contracts/gameplay-capability-registry.test.ts tests/contracts/generation-capability-readiness.test.ts tests/contracts/dsl-consumption-report.test.ts`: pass, 3 files / 16 tests.
  - `npm run typecheck:root`: pass.
  - `git diff --check`: pass.
  - `git diff --name-only`: exactly the file lock.
- Oracle review:
  - first review: PASS
  - reviewed fingerprint: `c1d3739a8b8085ec2f350dbfe890a611a5eb23e9f633729355de7eabc7491ddc`
  - findings: P0/P1/P2 none; P3 noted that the support contract test did not directly assert `requiredCapabilityCount=59`.
  - remediation: add the missing `requiredCapabilityCount=59` assertion to the existing target-profile support summary contract test and rerun validation before final review.
- final Oracle review:
  - status: PASS
  - reviewed fingerprint: `61f40a096e6f9822a16cad2bc9a32b1bd875e57a8bf06bdd9136079cf7455abd`
  - findings: P0/P1/P2/P3 none.
  - residual caveat: none.
- exact commit-gate Oracle review:
  - status: PASS
  - reviewed fingerprint: `80f0eb34ab622cf924a7bd9f8c06a4c216ce9ea0f708016232896bccbf0cff22`
  - findings: P0/P1/P2/P3 none.
- commit:
  - `51298669ea33b5c4cb07ddd7fa747a9e1f951add`
  - subject: `feat(game-dsl): seed profile metadata capability gaps`
  - push: not performed.
- next action: return to Phase A and freeze the next dependency-ready gap from live target-profile support.

## 20. Continuous M2 Action-State Normalization 001

- iteration id: `CONTINUOUS-M2-ACTION-STATE-NORMALIZATION-001`
- status: ORACLE_PASSED_AWAITING_COMMIT
- mode: IMPLEMENT_NO_PUSH
- capability gap: `movement.crouch.v1` and `combat.airborne_fire.v1` are registered but still report no schema or normalization evidence, even though the authoritative draft/canonical DSL path can represent capability-specific action-state configs without runtime execution.
- affected requirements:
  - `R010`: Player can crouch.
  - `R012`: Player can shoot while airborne.
  - Guarded M2 requirements: `R008`, `R009`, `R011`, `R013` must not be promoted to complete support by this iteration.
- affected cluster: `M2`
- objective: prove M2 crouch and airborne-fire action-state configs are schema-expressible and normalized into canonical systems, and update support evidence for only those dimensions without claiming compiler, runtime, or QA completion.
- prerequisites:
  - M2 action-state registry checkpoint committed as `397df79e6fc53dc95a66b54d4306490f024b5a37`.
  - M1 profile metadata registry checkpoint committed as `51298669ea33b5c4cb07ddd7fa747a9e1f951add`.
  - Worktree clean before this iteration.
- file lock:
  - `packages/game-dsl/src/gameplay-capabilities/registry.ts`
  - `tests/contracts/deepseek-authoritative-dsl-support.test.ts`
  - `tests/contracts/game-dsl-v0.2.test.ts`
  - `docs/refactor-log/deepseek-authoritative-dsl-consumption-m1.md`
- acceptance assertions:
  - A capability draft may declare `movement.crouch.v1` and `combat.airborne_fire.v1` in `capabilities`, player `capability_refs`, and `capability_configs`.
  - `normalizeCapabilityGameDslDraftToCanonicalV02` preserves those action-state configs as canonical `systems` with deterministic `source_draft_id`, `applies_to_entity_ids`, and declarative config payloads.
  - Target-profile support reports `schema_expressible=true` and `normalized=true` for `movement.crouch.v1` and `combat.airborne_fire.v1`.
  - `compiled`, `runtime_consumed`, `qa_observed`, and `completeSupported` remain false for both capabilities.
  - No compiler, runtime module, QA probe, provider, production cutover, or fixed-template fallback changes.
- expected failing tests:
  - Update `tests/contracts/deepseek-authoritative-dsl-support.test.ts` so the two action-state capabilities must expose schema and normalization evidence while remaining incomplete.
  - Add a focused normalization contract in `tests/contracts/game-dsl-v0.2.test.ts` for action-state capability config preservation.
- expected support-evidence change:
  - `movement.crouch.v1`: `schema_expressible=false`, `normalized=false` -> `schema_expressible=true`, `normalized=true`.
  - `combat.airborne_fire.v1`: `schema_expressible=false`, `normalized=false` -> `schema_expressible=true`, `normalized=true`.
  - `compiled`, `runtime_consumed`, and `qa_observed` remain false.
- targeted tests:
  - `npx vitest run tests/contracts/deepseek-authoritative-dsl-support.test.ts tests/contracts/game-dsl-v0.2.test.ts`
- regression tests:
  - `npx vitest run tests/contracts/gameplay-capability-registry.test.ts tests/contracts/generation-capability-readiness.test.ts tests/contracts/dsl-consumption-report.test.ts`
  - `npm run typecheck:root`
  - `git diff --check`
- stop conditions:
  - Any need to edit outside the file lock.
  - Any need to claim compiler/runtime/QA support for the action-state capabilities.
  - Any runtime, provider, production cutover, or fixed-template fallback change.
- RED result:
  - `npx vitest run tests/contracts/deepseek-authoritative-dsl-support.test.ts tests/contracts/game-dsl-v0.2.test.ts`: failed, 1 failed / 19 passed.
  - failure signature: `movement.crouch.v1` and `combat.airborne_fire.v1` were registered `DEFERRED`, but still reported `schema_expressible=false` and `normalized=false`.
  - same RED run also proved the new canonical normalization consumer test already passed, so the remaining gap was support evidence alignment with an existing authoritative consumer.
- implementation:
  - `tests/contracts/game-dsl-v0.2.test.ts` adds a normalization contract proving draft `capability_configs` for `movement.crouch.v1` and `combat.airborne_fire.v1` are preserved as canonical `systems`.
  - `packages/game-dsl/src/gameplay-capabilities/registry.ts` adds `canonicalNormalizationEvidence` and applies it only to the two M2 action-state descriptors.
  - `tests/contracts/deepseek-authoritative-dsl-support.test.ts` now requires both capabilities to expose `schema_expressible=true` and `normalized=true`, while keeping `compiled=false`, `runtime_consumed=false`, `qa_observed=false`, and `completeSupported=false`.
  - No compiler, runtime module, QA probe, provider, production cutover, or fallback behavior changed.
- support evidence:

| capability id | registered | classification | schema_expressible | normalized | compiled | runtime_consumed | qa_observed | complete_supported |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `movement.crouch.v1` | true | `DEFERRED` | true | true | false | false | false | false |
| `combat.airborne_fire.v1` | true | `DEFERRED` | true | true | false | false | false | false |

- target profile summary after implementation:
  - requirements: 60
  - clusters: 15
  - required capabilities: 59
  - registered capabilities: 12
  - complete-supported capabilities: 0
  - legacy-backed capabilities: 7
- Compatibility & Cutover:

| Check | Required answer |
| --- | --- |
| Producer change | `GameplayCapabilityRegistry` support evidence for `movement.crouch.v1` and `combat.airborne_fire.v1` changes from no dimensions to `schema_expressible=true` and `normalized=true`; `tests/contracts/game-dsl-v0.2.test.ts` adds canonical normalization evidence for their draft `capability_configs`. |
| Consumer list | `CapabilityGameDslDraftV1Schema` accepts the declared capability configs, `normalizeCapabilityGameDslDraftToCanonicalV02` maps them into canonical `systems`, `buildDeepSeekRunAndGunValidationProfileSupportSummary` and `buildDslConsumptionReport` read the updated support evidence, and the DeepSeek support contract tests assert the dimensions. |
| Compatibility type | `LOSSLESS_COMPATIBLE` for authoritative draft/canonical consumers because config payloads are preserved without rewriting semantics; compiler/runtime/QA remain explicitly incomplete. |
| Authority | `CapabilityGameDslDraftV1Schema` and `CanonicalGameDslV02Schema` are the schema authorities for the normalized action-state configs; `GameplayCapabilityRegistry` remains the support-evidence authority. |
| Legacy strategy | Legacy fixed-template execution is not used as evidence for crouch or airborne fire; these capabilities remain non-runtime-complete until a real compiler/runtime/QA consumer is added. |
| Failure policy | The capabilities keep `completeSupported=false` and still report missing `compiled`, `runtime_consumed`, and `qa_observed`; any downstream gate requiring complete support must continue to fail closed. |
| Evidence | The new normalization test constructs a trusted draft/lock/composed-schema tuple with action-state configs and asserts canonical `systems` preserve the capability IDs, applies-to entity, source draft IDs, and config payloads. |
| Rollback | Reverting this iteration returns the support dimensions to the previous deferred no-evidence state and removes only the focused normalization contract; runtime behavior and generated artifacts remain unchanged. |

- validation result:
  - `npx vitest run tests/contracts/deepseek-authoritative-dsl-support.test.ts tests/contracts/game-dsl-v0.2.test.ts`: pass, 2 files / 20 tests.
  - `npx vitest run tests/contracts/gameplay-capability-registry.test.ts tests/contracts/generation-capability-readiness.test.ts tests/contracts/dsl-consumption-report.test.ts`: pass, 3 files / 16 tests.
  - `npm run typecheck:root`: pass.
  - `git diff --check`: pass.
  - `git diff --name-only`: exactly the file lock.
- Oracle review:
  - status: PASS
  - reviewed fingerprint: `8433a54b28aa105379b48cee26fc214ffc1ea30d1173533cf0705bc142e4c725`
  - findings: P0/P1/P2 none.
  - P3: ledger status still said `SCOPE_FROZEN_AWAITING_RED`; remediated by updating this iteration to `ORACLE_PASSED_AWAITING_COMMIT`.
  - P3: the normalizer test proves generic capability config acceptance and preservation for these two IDs, not capability-specific runtime semantics; accepted for this iteration because compiler, runtime, QA, and `completeSupported` remain false.
- next action: precise staging, cached diff check, commit one reviewed diff without push.
