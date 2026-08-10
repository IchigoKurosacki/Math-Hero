/**
 * Per-creature animation profiles.
 *
 * Every enemy in the bestiary is mapped to a movement archetype with its own
 * idle, attack and death motion. Profiles are pure functions of time and
 * progress, returning a pose the sprite renderer applies.
 *
 * Ground archetypes keep `lift` at 0 for most of the cycle so their feet stay
 * planted on the same line the hero stands on; only hoppers and fliers leave
 * the ground, and they say so via `airborne` / `hop`.
 *
 * Pose fields
 *   offsetX   horizontal shift, sprite units (negative = towards the hero)
 *   lift      height above the ground line
 *   rotation  radians
 *   scaleX/Y  squash and stretch, anchored at the feet
 *   skewX     horizontal shear, used for jelly and cloth wobble
 *   flash     0..1 white hit flash
 *   opacity   0..1
 */

const TAU = Math.PI * 2;

const clamp01 = value => (value < 0 ? 0 : value > 1 ? 1 : value);
const easeOutCubic = t => 1 - (1 - t) ** 3;
const easeInCubic = t => t * t * t;
const easeOutBack = t => 1 + 2.2 * (t - 1) ** 3 + 1.2 * (t - 1) ** 2;

/** Neutral pose; every profile starts from this and overrides what it needs. */
export function neutralPose() {
  return { offsetX: 0, lift: 0, rotation: 0, scaleX: 1, scaleY: 1, skewX: 0, flash: 0, opacity: 1 };
}

/**
 * Shared three-beat attack timing: wind-up, strike, recovery.
 * `shape` lets each profile express those beats differently.
 */
function beats(progress) {
  if (progress < 0.34) return { phase: 'windup', k: easeOutCubic(progress / 0.34) };
  if (progress < 0.5) return { phase: 'strike', k: easeOutCubic((progress - 0.34) / 0.16) };
  return { phase: 'recover', k: easeOutCubic((progress - 0.5) / 0.5) };
}

// ── Archetypes ─────────────────────────────────────────────────────────────

const PROFILES = {
  /** Gelatinous blob: never really leaves the floor, wobbles like set jelly. */
  slime: {
    fx: 'splash',
    idle(time) {
      const pose = neutralPose();
      const pulse = Math.sin(time * 3.1);
      const settle = Math.sin(time * 6.2 + 0.7);
      pose.scaleY = 1 + pulse * 0.11;
      pose.scaleX = 1 - pulse * 0.09 + settle * 0.02;
      pose.skewX = settle * 0.05;
      // Only the very top of the pulse lifts the body off the floor.
      pose.lift = Math.max(0, pulse) * 1.6;
      return pose;
    },
    attack(progress) {
      const pose = neutralPose();
      const { phase, k } = beats(progress);
      if (phase === 'windup') {
        pose.scaleY = 1 - 0.3 * k;   // compress like a spring
        pose.scaleX = 1 + 0.26 * k;
        pose.offsetX = 10 * k;
      } else if (phase === 'strike') {
        pose.scaleY = 0.7 + 0.62 * k; // launch
        pose.scaleX = 1.26 - 0.42 * k;
        pose.offsetX = 10 - 62 * k;
        pose.lift = 16 * Math.sin(k * Math.PI);
      } else {
        pose.offsetX = -52 * (1 - k);
        pose.scaleY = 1 + 0.18 * (1 - k) * Math.sin(k * Math.PI * 3);
        pose.scaleX = 1 - 0.14 * (1 - k) * Math.sin(k * Math.PI * 3);
      }
      return pose;
    },
    death(progress) {
      const pose = neutralPose();
      // Deflates into a puddle rather than falling over.
      pose.scaleY = 1 - 0.88 * easeInCubic(progress);
      pose.scaleX = 1 + 0.5 * easeOutCubic(progress);
      pose.skewX = Math.sin(progress * Math.PI * 3) * 0.18 * (1 - progress);
      pose.opacity = 1 - easeInCubic(clamp01((progress - 0.45) / 0.55));
      return pose;
    },
  },

  /** Light creature that travels in discrete hops with an anticipation crouch. */
  hopper: {
    fx: 'claw',
    hop: true,
    idle(time) {
      const pose = neutralPose();
      const cycle = (time * 0.85) % 1;
      if (cycle < 0.45) {
        // Grounded: crouch, then load for the next hop.
        const k = cycle / 0.45;
        const crouch = Math.sin(k * Math.PI);
        pose.scaleY = 1 - crouch * 0.16;
        pose.scaleX = 1 + crouch * 0.14;
        pose.lift = 0;
      } else {
        const k = (cycle - 0.45) / 0.55;
        const arc = Math.sin(k * Math.PI);
        pose.lift = arc * 26;
        pose.scaleY = 1 + arc * 0.14;
        pose.scaleX = 1 - arc * 0.1;
        pose.rotation = Math.sin(k * Math.PI * 2) * 0.08;
      }
      return pose;
    },
    attack(progress) {
      const pose = neutralPose();
      const { phase, k } = beats(progress);
      if (phase === 'windup') {
        pose.scaleY = 1 - 0.22 * k;
        pose.scaleX = 1 + 0.18 * k;
        pose.offsetX = 12 * k;
      } else if (phase === 'strike') {
        pose.offsetX = 12 - 70 * k;
        pose.lift = 30 * Math.sin(k * Math.PI);
        pose.rotation = -0.3 * k;
        pose.scaleY = 1 + 0.16 * k;
      } else {
        pose.offsetX = -58 * (1 - k);
        pose.rotation = -0.3 * (1 - k);
      }
      return pose;
    },
    death(progress) {
      const pose = neutralPose();
      pose.lift = Math.sin(progress * Math.PI) * 22 - 14 * easeInCubic(progress);
      pose.rotation = progress * 2.4;
      pose.scaleY = 1 - 0.3 * progress;
      pose.opacity = 1 - easeInCubic(clamp01((progress - 0.3) / 0.7));
      return pose;
    },
  },

  /** Insect swarm flier: fast wingbeat jitter over a lazy figure-eight drift. */
  swarm: {
    fx: 'sting',
    airborne: 46,
    idle(time) {
      const pose = neutralPose();
      pose.lift = Math.sin(time * 2.3) * 7 + Math.sin(time * 19) * 1.2;
      pose.offsetX = Math.sin(time * 1.15) * 9;
      pose.rotation = Math.sin(time * 2.3 + 1) * 0.12;
      // High-frequency buzz shows as a body-width flutter.
      pose.scaleX = 1 + Math.sin(time * 26) * 0.035;
      return pose;
    },
    attack(progress) {
      const pose = neutralPose();
      const { phase, k } = beats(progress);
      if (phase === 'windup') {
        pose.offsetX = 26 * k;                 // pull back to aim
        pose.lift = 14 * k;
        pose.rotation = 0.24 * k;
      } else if (phase === 'strike') {
        pose.offsetX = 26 - 96 * k;            // darting stab
        pose.lift = 14 - 20 * k;
        pose.rotation = 0.24 - 0.5 * k;
      } else {
        pose.offsetX = -70 * (1 - k) + Math.sin(k * 30) * 3 * (1 - k);
        pose.lift = -6 * (1 - k);
        pose.rotation = -0.26 * (1 - k);
      }
      return pose;
    },
    death(progress) {
      const pose = neutralPose();
      // Loses lift and spirals down.
      pose.lift = -46 * easeInCubic(progress);
      pose.offsetX = Math.sin(progress * 9) * 16 * (1 - progress);
      pose.rotation = progress * 5;
      pose.opacity = 1 - easeInCubic(clamp01((progress - 0.2) / 0.8));
      return pose;
    },
  },

  /** Large winged creature: slow powerful strokes with a banking roll. */
  flyer: {
    fx: 'claw',
    airborne: 54,
    idle(time) {
      const pose = neutralPose();
      const stroke = Math.sin(time * 3.4);
      pose.lift = stroke * 12;
      pose.rotation = Math.cos(time * 3.4) * 0.11;
      pose.scaleY = 1 + stroke * 0.05;
      pose.scaleX = 1 - stroke * 0.04;
      pose.offsetX = Math.sin(time * 1.7) * 6;
      return pose;
    },
    attack(progress) {
      const pose = neutralPose();
      const { phase, k } = beats(progress);
      if (phase === 'windup') {
        pose.lift = 34 * k;                    // climb before the dive
        pose.offsetX = 22 * k;
        pose.rotation = 0.3 * k;
      } else if (phase === 'strike') {
        pose.lift = 34 - 58 * k;               // stoop
        pose.offsetX = 22 - 92 * k;
        pose.rotation = 0.3 - 0.72 * k;
        pose.scaleX = 1 + 0.12 * k;
      } else {
        pose.lift = -24 * (1 - k);
        pose.offsetX = -70 * (1 - k);
        pose.rotation = -0.42 * (1 - k);
      }
      return pose;
    },
    death(progress) {
      const pose = neutralPose();
      pose.lift = -54 * easeInCubic(progress);
      pose.rotation = progress * 2.2;
      pose.offsetX = progress * 18;
      pose.scaleY = 1 - 0.2 * progress;
      pose.opacity = 1 - easeInCubic(clamp01((progress - 0.25) / 0.75));
      return pose;
    },
  },

  /** Many-legged low body: scuttles side to side, never lifts. */
  crawler: {
    fx: 'bite',
    idle(time) {
      const pose = neutralPose();
      const scuttle = Math.sin(time * 7.5);
      pose.offsetX = scuttle * 4.5;
      pose.rotation = scuttle * 0.05;
      pose.scaleY = 1 + Math.abs(Math.sin(time * 15)) * 0.035;
      pose.lift = 0;
      return pose;
    },
    attack(progress) {
      const pose = neutralPose();
      const { phase, k } = beats(progress);
      if (phase === 'windup') {
        pose.offsetX = 14 * k;
        pose.scaleX = 1 - 0.1 * k;             // coil
        pose.rotation = 0.1 * k;
      } else if (phase === 'strike') {
        pose.offsetX = 14 - 60 * k;
        pose.scaleX = 0.9 + 0.28 * k;          // snap forward
        pose.rotation = 0.1 - 0.26 * k;
      } else {
        pose.offsetX = -46 * (1 - k) + Math.sin(k * 22) * 2.5 * (1 - k);
        pose.rotation = -0.16 * (1 - k);
      }
      return pose;
    },
    death(progress) {
      const pose = neutralPose();
      // Flips onto its back.
      pose.rotation = -Math.PI * easeOutCubic(progress);
      pose.lift = Math.sin(progress * Math.PI) * 14;
      pose.opacity = 1 - easeInCubic(clamp01((progress - 0.45) / 0.55));
      return pose;
    },
  },

  /** Massive and slow: shifts weight from foot to foot, ground never leaves. */
  stomper: {
    fx: 'slam',
    idle(time) {
      const pose = neutralPose();
      const shift = Math.sin(time * 1.5);
      pose.offsetX = shift * 3.2;
      pose.rotation = shift * 0.035;
      // Weight settling reads as a slow vertical compression, not a hop.
      const settle = Math.abs(Math.sin(time * 1.5));
      pose.scaleY = 1 - settle * 0.035;
      pose.scaleX = 1 + settle * 0.03;
      pose.lift = 0;
      return pose;
    },
    attack(progress) {
      const pose = neutralPose();
      const { phase, k } = beats(progress);
      if (phase === 'windup') {
        pose.rotation = 0.16 * k;              // rear back
        pose.offsetX = 14 * k;
        pose.scaleY = 1 + 0.1 * k;
      } else if (phase === 'strike') {
        pose.rotation = 0.16 - 0.4 * k;        // overhead slam
        pose.offsetX = 14 - 40 * k;
        pose.scaleY = 1.1 - 0.24 * k;
        pose.scaleX = 1 + 0.18 * k;
      } else {
        pose.rotation = -0.24 * (1 - k);
        pose.offsetX = -26 * (1 - k);
        pose.scaleY = 0.86 + 0.14 * k;
      }
      return pose;
    },
    death(progress) {
      const pose = neutralPose();
      // Crumbles straight down, then topples.
      const crumble = easeInCubic(progress);
      pose.scaleY = 1 - 0.55 * crumble;
      pose.scaleX = 1 + 0.24 * crumble;
      pose.rotation = crumble * 0.5;
      pose.offsetX = crumble * 12;
      pose.opacity = 1 - easeInCubic(clamp01((progress - 0.5) / 0.5));
      return pose;
    },
  },

  /** Four-legged predator: prowling gait with a low head bob. */
  prowler: {
    fx: 'bite',
    idle(time) {
      const pose = neutralPose();
      const gait = Math.sin(time * 4.2);
      pose.offsetX = gait * 3;
      pose.scaleX = 1 + gait * 0.035;          // body lengthens on the stride
      pose.scaleY = 1 - gait * 0.03;
      pose.rotation = Math.sin(time * 4.2 + 0.9) * 0.045;
      pose.lift = Math.max(0, Math.sin(time * 8.4)) * 1.8;
      return pose;
    },
    attack(progress) {
      const pose = neutralPose();
      const { phase, k } = beats(progress);
      if (phase === 'windup') {
        pose.scaleY = 1 - 0.16 * k;            // crouch to pounce
        pose.scaleX = 1 + 0.1 * k;
        pose.offsetX = 16 * k;
        pose.rotation = 0.1 * k;
      } else if (phase === 'strike') {
        pose.offsetX = 16 - 84 * k;
        pose.lift = 26 * Math.sin(k * Math.PI);
        pose.rotation = 0.1 - 0.34 * k;
        pose.scaleX = 1.1 + 0.14 * k;
        pose.scaleY = 0.84 + 0.2 * k;
      } else {
        pose.offsetX = -68 * (1 - k);
        pose.rotation = -0.24 * (1 - k);
      }
      return pose;
    },
    death(progress) {
      const pose = neutralPose();
      pose.rotation = easeOutCubic(progress) * 1.5;
      pose.lift = Math.sin(progress * Math.PI) * 10 - 12 * easeInCubic(progress);
      pose.scaleY = 1 - 0.3 * progress;
      pose.opacity = 1 - easeInCubic(clamp01((progress - 0.35) / 0.65));
      return pose;
    },
  },

  /** Spellcaster: hovers a little, robes sway, gathers power before casting. */
  caster: {
    fx: 'spell',
    airborne: 8,
    idle(time) {
      const pose = neutralPose();
      pose.lift = Math.sin(time * 1.9) * 4;
      pose.skewX = Math.sin(time * 1.3) * 0.045;   // cloth drift
      pose.rotation = Math.sin(time * 0.9) * 0.03;
      pose.scaleY = 1 + Math.sin(time * 1.9) * 0.02;
      return pose;
    },
    attack(progress) {
      const pose = neutralPose();
      const { phase, k } = beats(progress);
      if (phase === 'windup') {
        pose.lift = 18 * k;                     // rises while charging
        pose.scaleY = 1 + 0.1 * k;
        pose.skewX = -0.09 * k;
        pose.rotation = -0.08 * k;
      } else if (phase === 'strike') {
        pose.lift = 18 - 8 * k;
        pose.scaleY = 1.1 - 0.18 * k;           // thrusts the spell forward
        pose.scaleX = 1 + 0.14 * k;
        pose.offsetX = -20 * k;
        pose.skewX = -0.09 + 0.2 * k;
      } else {
        pose.lift = 10 * (1 - k);
        pose.offsetX = -20 * (1 - k);
        pose.skewX = 0.11 * (1 - k);
      }
      return pose;
    },
    death(progress) {
      const pose = neutralPose();
      // Collapses inward as the magic holding it together fails.
      pose.scaleX = 1 - 0.6 * easeInCubic(progress);
      pose.scaleY = 1 + 0.25 * Math.sin(progress * Math.PI);
      pose.lift = progress * 18;
      pose.rotation = Math.sin(progress * Math.PI * 2) * 0.2;
      pose.opacity = 1 - easeInCubic(progress);
      return pose;
    },
  },

  /** Incorporeal: drifts weightlessly and fades in and out of view. */
  phantom: {
    fx: 'spell',
    airborne: 34,
    idle(time) {
      const pose = neutralPose();
      pose.lift = Math.sin(time * 1.35) * 13;
      pose.offsetX = Math.sin(time * 0.85 + 1.2) * 11;
      pose.skewX = Math.sin(time * 1.1) * 0.07;
      pose.rotation = Math.sin(time * 0.7) * 0.05;
      pose.opacity = 0.74 + 0.26 * (0.5 + 0.5 * Math.sin(time * 1.6));
      return pose;
    },
    attack(progress) {
      const pose = neutralPose();
      const { phase, k } = beats(progress);
      if (phase === 'windup') {
        pose.opacity = 1 - 0.55 * k;            // fades out…
        pose.offsetX = 24 * k;
        pose.scaleX = 1 - 0.16 * k;
      } else if (phase === 'strike') {
        pose.opacity = 0.45 + 0.55 * k;         // …and reappears mid-lunge
        pose.offsetX = 24 - 100 * k;
        pose.scaleX = 0.84 + 0.3 * k;
        pose.skewX = -0.16 * k;
      } else {
        pose.offsetX = -76 * (1 - k);
        pose.skewX = -0.16 * (1 - k);
        pose.opacity = 1;
      }
      return pose;
    },
    death(progress) {
      const pose = neutralPose();
      // Unravels upward.
      pose.lift = progress * 44;
      pose.scaleY = 1 + progress * 0.5;
      pose.scaleX = 1 - progress * 0.45;
      pose.skewX = Math.sin(progress * Math.PI * 3) * 0.22;
      pose.opacity = 1 - progress;
      return pose;
    },
  },

  /** Armoured soldier: disciplined stance, minimal idle, committed swings. */
  armored: {
    fx: 'blade',
    idle(time) {
      const pose = neutralPose();
      const breath = Math.sin(time * 1.6);
      pose.scaleY = 1 + breath * 0.018;
      pose.scaleX = 1 - breath * 0.014;
      pose.rotation = Math.sin(time * 0.8) * 0.018;
      pose.offsetX = Math.sin(time * 0.8 + 2) * 1.4;
      pose.lift = 0;
      return pose;
    },
    attack(progress) {
      const pose = neutralPose();
      const { phase, k } = beats(progress);
      if (phase === 'windup') {
        pose.rotation = 0.2 * k;                // shoulder the blade
        pose.offsetX = 16 * k;
        pose.scaleX = 1 - 0.05 * k;
      } else if (phase === 'strike') {
        pose.rotation = 0.2 - 0.46 * k;         // step-through cut
        pose.offsetX = 16 - 66 * k;
        pose.scaleX = 0.95 + 0.2 * k;
        pose.scaleY = 1 - 0.08 * k;
      } else {
        pose.rotation = -0.26 * (1 - k);
        pose.offsetX = -50 * (1 - k);
      }
      return pose;
    },
    death(progress) {
      const pose = neutralPose();
      // Falls like a felled statue.
      pose.rotation = easeInCubic(progress) * 1.75;
      pose.lift = -6 * easeInCubic(progress);
      pose.offsetX = easeInCubic(progress) * 26;
      pose.opacity = 1 - easeInCubic(clamp01((progress - 0.55) / 0.45));
      return pose;
    },
  },

  /** Stiff shambler: lurching, off-balance gait. */
  shambler: {
    fx: 'claw',
    idle(time) {
      const pose = neutralPose();
      const lurch = Math.sin(time * 2.2);
      pose.rotation = lurch * 0.075;
      pose.offsetX = lurch * 4;
      pose.scaleY = 1 - Math.abs(lurch) * 0.03;
      pose.skewX = lurch * 0.03;
      pose.lift = 0;
      return pose;
    },
    attack(progress) {
      const pose = neutralPose();
      const { phase, k } = beats(progress);
      if (phase === 'windup') {
        pose.rotation = 0.22 * k;
        pose.offsetX = 10 * k;
        pose.skewX = 0.08 * k;
      } else if (phase === 'strike') {
        pose.rotation = 0.22 - 0.44 * k;
        pose.offsetX = 10 - 52 * k;
        pose.skewX = 0.08 - 0.2 * k;
      } else {
        pose.rotation = -0.22 * (1 - k) * Math.cos(k * 6);
        pose.offsetX = -42 * (1 - k);
      }
      return pose;
    },
    death(progress) {
      const pose = neutralPose();
      pose.rotation = easeInCubic(progress) * 1.4;
      pose.scaleY = 1 - 0.42 * easeInCubic(progress);
      pose.skewX = Math.sin(progress * Math.PI * 2) * 0.14;
      pose.opacity = 1 - easeInCubic(clamp01((progress - 0.4) / 0.6));
      return pose;
    },
  },
};

/** Bestiary id → archetype. Anything unlisted falls back by name pattern. */
const ENEMY_PROFILES = {
  slime_green: 'slime', slime_blue: 'hopper', mushroom_prankster: 'hopper', jelly_bee: 'swarm',
  shroom_goblin: 'shambler', spiky_bug: 'crawler', forest_troll: 'stomper', bat_eye: 'flyer',
  armored_bee: 'swarm', honey_slime: 'slime', spear_wasp: 'swarm', bear_sweet: 'prowler',
  sand_beetle: 'crawler', mummy_student: 'shambler', stone_mask: 'phantom', desert_goblin: 'shambler',
  fire_slime: 'slime', lava_crab: 'crawler', smith_goblin: 'armored', magma_golem: 'stomper',
  ice_slime: 'slime', snow_wolf: 'prowler', frost_goblin: 'shambler', frost_golem: 'stomper',
  electric_slime: 'slime', storm_harpy: 'flyer', dark_knight: 'armored', thunder_mage: 'caster',
  phantom_scribe: 'phantom', enchanted_book: 'phantom', shadow_knight: 'armored', mirror_hero: 'armored',

  // Region 1 — the slime meadows
  buble_slime: 'slime', crab_slime: 'crawler', slime_armored: 'armored', slime_man: 'shambler',
  slime_mecha: 'stomper', slime_caterpillar: 'slime', slime_spider: 'crawler',
  // Region 2 — the mushroom woods
  mushroom_warrior: 'shambler', shroom_goblin_knight: 'armored', shroom_slime: 'slime',
  spiky_chameleon: 'prowler', spiky_crab: 'crawler', spiky_ent: 'stomper', spiky_snake: 'crawler',
  // Region 3 — the honey cliffs
  builder_wasp: 'swarm', candy_bug: 'crawler', honey_bat: 'flyer', honey_bug: 'crawler',
  honey_caterpillar: 'slime', honey_golem: 'stomper', warrior_bee: 'swarm',
  // Region 4 — the sand ruins
  cat_snake: 'prowler', desert_construct: 'stomper', desert_dog: 'prowler', desert_goro: 'stomper',
  mummy_assassin: 'prowler', mummy_nomad: 'shambler', mummy_tank: 'armored',
  // Region 5 — the volcanic forge
  magma_bug: 'crawler', magma_phoenix: 'flyer', magma_lizard: 'prowler', magma_pangolin: 'stomper',
  magma_cat: 'prowler', magma_scorpion: 'crawler', magma_spider_dog: 'crawler',
  // Region 6 — the frozen peaks
  snow_assassin: 'prowler', snow_butterfly: 'swarm', snow_yeti: 'stomper', snow_gargoyle: 'flyer',
  snow_horse: 'prowler', snow_scorpion: 'crawler', snow_spirit: 'phantom',
  // Region 7 — the storm kingdom
  storm_bug: 'crawler', storm_crab: 'crawler', storm_golem: 'stomper', storm_mage: 'caster',
  storm_mecha: 'armored', storm_spirit: 'phantom', storm_tank: 'armored',
  // Region 8 — the ghost citadel
  chaos_spirit: 'phantom', ghost_doll: 'phantom', ghost_spirit: 'phantom', ghost_woman: 'phantom',
  shadow_defender: 'armored', shadow_mage: 'caster', shadow_man: 'phantom',
  // Secret level — glitched intruders
  glitch: 'phantom', glitch_bee: 'swarm', glitch_slime_horse: 'slime', glitch_assassin: 'prowler',
  glitch_knight: 'armored', glitch_chimera: 'prowler', glitch_golem: 'stomper', glitch_dragon: 'flyer',

  // Champions. elite_2 is a mossy one-eyed ent, elite_3 a honeycomb colossus
  // and elite_8 an astral archivist — all match their current artwork.
  elite_1: 'armored', elite_2: 'stomper', elite_3: 'stomper', elite_4: 'stomper',
  elite_5: 'prowler', elite_6: 'flyer', elite_7: 'phantom', elite_8: 'phantom',

  boss_1: 'slime', boss_2: 'caster', boss_3: 'swarm', boss_4: 'caster',
  boss_5: 'flyer', boss_6: 'stomper', boss_7: 'caster', boss_8: 'phantom',
  boss_secret: 'caster',
};

const PATTERN_FALLBACKS = [
  [/slime|jelly|blob/, 'slime'],
  [/bee|wasp|hornet/, 'swarm'],
  [/bat|harpy|griffin|dragon|wing/, 'flyer'],
  [/bug|beetle|crab|spider/, 'crawler'],
  [/golem|troll|bear|giant/, 'stomper'],
  [/wolf|hound|cat|bull/, 'prowler'],
  [/mage|wizard|scribe|pharaoh|lord|king/, 'caster'],
  [/ghost|phantom|mask|book|spirit|shadow/, 'phantom'],
  [/knight|guard|soldier|elite/, 'armored'],
  [/mummy|goblin|zombie/, 'shambler'],
];

/** Resolves the animation profile for a bestiary entry. */
export function profileFor(enemy) {
  const id = enemy?.id || '';
  const named = ENEMY_PROFILES[id];
  if (named && PROFILES[named]) return PROFILES[named];

  for (const [pattern, key] of PATTERN_FALLBACKS) {
    if (pattern.test(id)) return PROFILES[key];
  }
  // Explicit bestiary flag wins over a generic ground default.
  return enemy?.flying ? PROFILES.flyer : PROFILES.hopper;
}

/** Baseline hover height; 0 means the creature belongs on the ground line. */
export function hoverHeightFor(enemy) {
  return profileFor(enemy).airborne || 0;
}

export { PROFILES, easeOutBack };
