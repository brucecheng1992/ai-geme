CHIYAN_BATTLEFIELD_DSL_VERSION 1.2
DSL_STATUS LIVE_SOURCE_OF_TRUTH_CANDIDATE
DSL_PURPOSE "ChiYan Battlefield side-scrolling run-and-gun cleanup source for Batch 002c"
LIVE_GENERATION_ALLOWED true

PROJECT ChiYan_Battlefield_Side_Runner_Cleanup {
  canonical_name: "ChiYan Battlefield"
  batch_target: "Batch 002c"
  parent_batch_id: "batch-002b"
  game_format: "side-scrolling run-and-gun"
  production_goal: "selective cleanup pass for side-scrolling run-and-gun production candidates"
  auto_select: false
  auto_approve: false
  generic_fantasy_fallback_allowed: false
}

SIDE_RUNNER_CONTRACT {
  camera: "strict side-view / side-on camera"
  gameplay_readability: "horizontal combat lane, gameplay-scale readability, platform readability, clear silhouettes"
  movement: "left-to-right / right-to-left horizontal action"
  weapon_language: "fantasy ChiYan ranged weaponry, ember rifle, flame repeater, fire-lance, arm cannon, explosive fire bolts"
  forbidden_layouts: [
    "front-facing hero portrait",
    "3/4 splash art",
    "poster layout",
    "card art",
    "title card"
  ]
}

CLEANUP_CONSTRAINTS {
  cleanup_targets: [
    "watermark",
    "logo",
    "fake text",
    "signature",
    "title",
    "footer",
    "corner mark",
    "side_view_strictness"
  ]

  no_text_logo_watermark_rules: [
    "no text",
    "no readable text",
    "no fake text",
    "no pseudo text",
    "no letters",
    "no numbers",
    "no Chinese characters",
    "no English letters",
    "no logo",
    "no brand mark",
    "no fake game logo",
    "no fake studio logo",
    "no watermark",
    "no signature",
    "no artist signature",
    "no copyright mark",
    "no title",
    "no title card",
    "no subtitle",
    "no footer",
    "no caption",
    "no label",
    "no UI label",
    "no fake UI labels",
    "no corner emblem",
    "no bottom mark",
    "no decorative typography"
  ]
}

CHIYAN_STYLE_ANCHORS {
  visual_anchors: [
    "deep crimson cloth",
    "blackened iron armor",
    "ember rim light",
    "ash haze",
    "scorched basalt",
    "aged bronze",
    "disciplined battlefield faction"
  ]
}
