CHIYAN_BATTLEFIELD_DSL_VERSION 1.1
DSL_STATUS LIVE_SOURCE_OF_TRUTH_CANDIDATE
DSL_PURPOSE "ChiYan Battlefield side-scrolling run-and-gun production source for Batch 002b"
LIVE_GENERATION_ALLOWED true

PROJECT ChiYan_Battlefield_Side_Runner {
  canonical_name: "ChiYan Battlefield"
  production_goal: "generate reviewable side-scrolling run-and-gun 2D game-art candidates, not final auto-approved assets"
  batch_target: "Batch 002b"
  game_format: "side-scrolling run-and-gun"
  total_requested_images: 11
  auto_select: false
  auto_approve: false
  generic_fantasy_fallback_allowed: false
}

GAMEPLAY_CAMERA_CONTRACT {
  camera: "strict side-view / side-on camera for production character, enemy, and gameplay background tasks"
  gameplay_readability: "horizontal combat lane, platform readability, clear silhouettes"
  movement: "left-to-right / right-to-left horizontal action"
  traversal: "readable walkable platform line and parallax layers for side-scrolling stage production"
  forbidden_layouts: [
    "portrait splash art for production tasks",
    "front-facing hero poster",
    "vertical card art",
    "card art layout",
    "MOBA splash art"
  ]
}

WORLD_IDENTITY {
  faction_name: "ChiYan"
  meaning_anchor: "fire-forged battlefield faction with disciplined military ritual and scorched-frontline identity"
  visual_anchors: [
    "deep crimson war banners",
    "blackened iron armor",
    "heat-discolored bronze",
    "scorched basalt terrain",
    "ash haze",
    "ember rim light",
    "broken siege stone",
    "smoke-stained command markers"
  ]
  mood: [
    "solemn",
    "battle-worn",
    "tactical",
    "ritualized",
    "ember-lit",
    "high-stakes warfront"
  ]
}

SIDE_RUNNER_WEAPON_LANGUAGE {
  weapon_language: "fantasy ChiYan ranged weaponry, ember rifle, flame repeater, fire-lance, arm cannon, explosive fire bolts"
  weapon_rules: [
    "weapons read clearly from side-view gameplay scale",
    "muzzles and projectile direction support horizontal aiming",
    "flame effects support silhouette and action readability",
    "stylized fantasy weapon craft, not modern military realism"
  ]
  forbidden_weapon_language: [
    "modern military rifle realism",
    "real-world tactical firearms",
    "sci-fi neon armor",
    "laser cannon realism",
    "clean plastic futurism"
  ]
}

ART_DIRECTION {
  rendering_style: "cinematic 2D game concept art with production readability for side-scrolling run-and-gun assets"
  detail_density: "medium-high, but silhouette and function must remain readable at gameplay scale"
  lighting_language: "ember rim lighting, smoky atmospheric depth, controlled warm highlights, dark iron shadows"
  shape_language: [
    "side-readable character bodies",
    "horizontal aiming poses",
    "angular lamellar armor plates",
    "broad enemy attack silhouettes",
    "low heavy battlefield props",
    "cracked platform terrain planes",
    "ritual brazier circles"
  ]
  composition_rules: [
    "main subject must be identifiable at gameplay thumbnail size",
    "separate foreground, midground, and background for parallax readability",
    "leave negative space for horizontal gameplay action",
    "do not place readable text inside generated images",
    "do not create fake logo, watermark, readable text, or fake UI labels",
    "no generic fantasy fallback"
  ]
}

PALETTE {
  primary: ["deep crimson", "burnt vermilion", "charcoal black", "dark iron"]
  secondary: ["aged bronze", "ash gray", "basalt gray", "smoke brown"]
  accents: ["ember orange", "molten gold", "low lava glow"]
  forbidden_dominants: ["pastel candy colors", "clean royal blue dominance", "plastic neon green", "bright sci-fi cyan", "soft fairy pink"]
}

MATERIAL_LANGUAGE {
  armor: ["dark iron lamellar plates", "heat-scarred bronze trim", "scratched blackened steel", "red cloth bindings", "ash-dusted surfaces"]
  cloth: ["torn crimson command fabric", "smoke-darkened hems", "battlefield dust", "coarse woven military textile"]
  terrain: ["cracked basalt", "scorched earth", "ash deposits", "cooling lava seams", "broken stone barricades", "burned arrow fragments"]
  props: ["war banners without readable text", "signal drums", "spear racks", "shield walls", "iron braziers", "siege markers", "command stakes"]
}

GLOBAL_NEGATIVE_PROMPT {
  terms: [
    "readable text",
    "fake text",
    "logo",
    "watermark",
    "title card",
    "poster layout",
    "vertical card art",
    "front-facing hero portrait",
    "MOBA splash art",
    "generic fantasy",
    "modern military rifle realism",
    "sci-fi neon armor",
    "unreadable silhouette",
    "overexposed flames",
    "fake UI labels",
    "real-world political symbols"
  ]
}

PROMPT_ASSEMBLY_RULES {
  must_bind_to_game_format: "side-scrolling run-and-gun"
  must_use_strict_side_view_for_production_tasks: true
  must_include_chiyan_visual_anchors: true
  must_include_task_specific_subject: true
  must_include_horizontal_gameplay_readability: true
  must_not_fallback_to_generic_fantasy: true
  must_not_fallback_to_docs_markdown: true
  must_not_use_fixture_dsl: true
}
