# Tower Sprite Atlas Generation and Provenance

## Shared production contract

```text
Create one production-ready 1024×1024 transparent PNG sprite atlas for a single fungal tower in a stylized bioluminescent garden tower-defence game. Use an exact invisible 4×4 grid of sixteen 256×256 cells, read left-to-right and top-to-bottom. The atlas contains one consistent living organism across five forms, with three subtle idle-animation frames per form, followed by one tower-card portrait.

Cell assignment: 1–3 Seedling idle; 4–6 Mature idle; 7–9 Predator Evolution idle; 10–12 Specialist Evolution idle; 13–15 Symbiote Evolution idle; 16 clean tower-card portrait. The three frames of each form show only a gentle breathing, cap sway, glow pulse, or fluid motion; camera, scale, root anchor, lighting, and proportions stay fixed.

Camera: Camera mounted high above the unit with a 55-degree downward pitch and a slight lower-right azimuth, orthographic/isometric strategy-game view. The top surface of every cap/body must dominate; sides are visibly foreshortened; undersides/gills are barely visible; the root contact reads as a small ellipse on the ground plane. No eye-level view, no front elevation, no character-sheet frontal pose. Style: hand-painted organic fantasy, soft gouache texture, deliberate chunky silhouette, dark-garden bioluminescence, readable at 64 pixels, restrained detail, cohesive teal/mint/amber/violet palette. Predator uses sharper crimson geometry, Specialist uses patterned amber geometry, and Symbiote uses branching mint mycelium; shape must communicate the path without colour alone.

Keep all opaque pixels within a centred 220×220 safe area in each cell. Put the root contact point at the same local coordinate, approximately x=128 and y=194, in every gameplay cell. Transparent background only. No scenery, terrain, cast shadow, text, letters, numbers, labels, arrows, borders, dividers, visible grid, UI frame, duplicate tower, cropped parts, or effects crossing a cell boundary. Do not change art style between cells.
```

The runtime row-major mapping is:

```typescript
export const TowerSpriteForm = {
  Seedling: 'seedling',
  Mature: 'mature',
  Predator: 'predator',
  Specialist: 'specialist',
  Symbiote: 'symbiote',
} as const;

export const FORM_CELL_INDICES = {
  seedling: [0, 1, 2],
  mature: [3, 4, 5],
  predator: [6, 7, 8],
  specialist: [9, 10, 11],
  symbiote: [12, 13, 14],
} as const;
```

## Exact tower subject blocks

```text
SPORECAP — A compact upright mushroom dart tower with one round cap and visible needle-like gills. Seedling is small, friendly, and simple. Mature is taller with a fuller cap and a ring of closed dart pores. Needle Volley Predator grows a sharp crown of quill gills and taut crimson launch pores. Forked Spores Specialist develops a clearly bifurcated cap with paired amber spore channels. Signal Cap Symbiote grows mint antenna-like hyphae and a luminous connection ring that reads as a network transmitter. Keep the central round-cap silhouette recognizable in every form.

THORN SNIPER — A tall narrow fungal stalk grown around one forward-pointing thorn needle, elegant and precise rather than bulky. Seedling has a short stem and one small needle bud. Mature becomes a stable long-barrel stalk with root braces. Heartwood Needle Predator grows a thick dark heartwood spear and sharp crimson bracing. Skewer Specialist grows one extra-long amber piercing lance with layered guide fins, not multiple weapons. Reaper Thorn Symbiote curves into a restrained scythe-like thorn with mint mycelium veins and one mark-shaped light beneath the cap. Keep the vertical sniper silhouette and a single clear firing axis.

PUFFBALL — A broad spherical fungal sac on a tiny rooted base, soft but powerful, with several small pores. Seedling is a compact fuzzy ball. Mature is larger and lobed with visible pressure folds. Burst Sac Predator becomes taut and heavy with crimson burst seams and a wider mouth. Echo Puff Specialist gains one smaller amber echo lobe behind the main sac, clearly part of the same organism. Fungal Carpet Symbiote spreads a low mint root mat and branching hyphae beneath the round body. Keep the large circular puff silhouette dominant.

SLIMEFUNGUS — A low asymmetric mushroom with a drooping cap, wet folds, and a few hanging slime droplets. Seedling has one small tilted cap. Mature grows broader with a shallow slime basin. Caustic Slime Predator develops sharp crimson-yellow corrosive sacs and thicker falling droplets. Bog Cap Specialist becomes a very broad amber-patterned umbrella with low wet tendrils for area control. Trait Rot Symbiote grows branching mint mycelium through dark violet rot patches and one cracked trait-like nodule. Keep the silhouette low, uneven, and visibly fluid.

BULB SHOOTER — A chunky rooted fungal artillery tower with one angled seed bulb acting as a cannon. Seedling has a small closed bud. Mature has a stout body and a clear upward-angled launcher. Siege Bulb Predator grows one oversized armoured crimson cannon bloom with a wide muzzle. Cluster Bloom Specialist grows three smaller amber launcher buds in a readable triangular cluster. Seeded Payload Symbiote carries mint-veined seed pods linked into the main bulb by glowing hyphae. Keep the chunky artillery posture and angled firing direction.

LUMEN ORACLE — A graceful lantern mushroom with a split luminous cap and small orbiting light nodes, clearly a support and detection tower. Seedling is a simple glowing bell. Mature has a taller stem, wider split cap, and two balanced light nodes. Luminous Bolt Predator focuses into a sharp crimson-white prism crown and one bright guided-bolt eye. Revelation Field Specialist opens into a wide amber eye-like halo with patterned reveal membranes. Chorus Light Symbiote grows concentric mint antenna crowns and branching light filaments that visibly belong to a network. Keep the luminous lantern silhouette calm, readable, and distinct from artillery.
```

## Exact built-in generation wrapper

Each final generation call used the shared contract, then the applicable exact subject block, inside this wrapper. Sporecap was generated first without an image reference. Its approved camera-corrected chroma-key source atlas was passed as Image 1 for the other five calls.

```text
Use case: stylized-concept
Asset type: production game sprite atlas
Input images: Image 1 is the approved camera-corrected chroma-key Sporecap atlas used only as the style, camera, lighting, texture, spacing, and finish reference.
Primary request:
<SHARED PRODUCTION CONTRACT>

Subject:
<EXACT TOWER SUBJECT BLOCK>

Scene/backdrop: one perfectly flat solid #0000ff chroma-key background for local removal.
Composition/framing clarification: exactly four columns and four rows, exactly sixteen occupied cells. Row 1 = Seedling 1, Seedling 2, Seedling 3, Mature 1. Row 2 = Mature 2, Mature 3, Predator 1, Predator 2. Row 3 = Predator 3, Specialist 1, Specialist 2, Specialist 3. Row 4 = Symbiote 1, Symbiote 2, Symbiote 3, one single clean tower-card portrait. Exactly one organism per cell.
Constraints: match Image 1's art direction but create only <TOWER NAME>. Uniform #0000ff background only; no shadows, gradient, texture, grid, scenery, floor, or lighting variation. Do not use #0000ff in the subject. No 5th row, 4th gameplay frame, montage or UI frame in cell 16, spill, text, watermark, reflection, duplicate objects, or cropped parts.
```

The Sporecap call omitted the `Input images` line because it established the style reference. It used the same wrapper and explicitly required the same perfectly flat `#0000ff` background, exact sixteen-cell occupancy, and one organism per cell.

Additional exact constraints used where the subject required them:

```text
SLIMEFUNGUS: A few droplets must remain visibly attached to each organism rather than becoming separate floating objects.
BULB SHOOTER: Exactly one rooted organism per cell; the three Specialist buds and Symbiote seed pods must remain visibly attached parts of that organism.
LUMEN ORACLE: Exactly one rooted organism per cell. Attach every light node to its organism with a clear thin curved filament so each cell reads as one complete connected sprite.
```

## Targeted whole-sheet correction prompts

Sporecap initially returned a five-row sheet. The first whole-sheet edit used:

```text
Change only the atlas layout from twenty entries to exactly sixteen entries arranged as four columns by four rows. Keep the same Sporecap design, camera, palette, texture, lighting, and chroma background.
Exact row-major cell mapping: cells 1–3 Seedling idle and cell 4 Mature idle frame 1; cells 5–6 Mature idle frames 2–3 and cells 7–8 Needle Volley Predator idle frames 1–2; cell 9 Needle Volley Predator idle frame 3 and cells 10–12 Forked Spores Specialist idle frames 1–3; cells 13–15 Signal Cap Symbiote idle frames 1–3 and cell 16 one clean Sporecap tower-card portrait.
Composition/framing: exactly 4 columns × 4 rows, exactly one centered organism in every cell, exactly sixteen occupied cells total. Three gameplay frames per form only. Maintain a consistent local root point around x=128 y=194 within each implied 256×256 cell. Keep opaque pixels inside a centered 220×220 safe area.
Scene/backdrop: perfectly flat solid #0000ff chroma-key background.
Constraints: preserve all art/style invariants; change only the count and layout. No 5th row. No 4th gameplay frame for any form. No missing or empty cells. No visible grid, dividers, text, symbols, labels, scenery, terrain, shadows, gradients, texture, or lighting variation in background. Do not use #0000ff in the subject. No spill across cell boundaries, cropped parts, reflections, watermark, or duplicate objects inside a cell.
```

Sporecap cell 16 then required:

```text
Keep the complete 4×4 atlas unchanged except correct the content requirement for cell 16 (bottom-right). Cell 16 must contain one single clean Sporecap tower-card portrait: one compact mature upright mushroom dart tower, centered and slightly larger for card readability. It must not be a stack, montage, evolution lineup, or multiple organisms.
Constraints: preserve cells 1–15 exactly in their existing positions and preserve the same Sporecap design, camera, palette, gouache texture, lighting, root anchors, spacing, and perfectly flat solid #0000ff chroma-key background. Keep exactly sixteen occupied cells total and exactly one organism per cell. No extra row, no visible grid/dividers, no text, labels, scenery, shadows, gradients, background texture, cropped parts, spill, watermark, or #0000ff in any subject.
```

Thorn Sniper and Lumen Oracle cell 16 corrections used this exact pattern:

```text
Keep the complete atlas unchanged except remove the <rectangular UI frame / circular UI frame, disc, halo border, and enclosing backdrop> from cell 16 (bottom-right). Cell 16 must remain one clean centered <TOWER NAME> tower-card portrait directly on the same flat #0000ff chroma-key background, with no frame or enclosing shape.
Constraints: preserve cells 1–15 exactly, preserve the 4×4 layout, sixteen occupied cells, tower design, camera, palette, texture, lighting, positions, root anchors, and uniform #0000ff background. No other changes, visible grid, border, divider, text, labels, scenery, shadow, gradient, background texture, watermark, montage, or extra objects.
```

## Review-fix camera regeneration

The first delivered sheets were rejected in review because their tower bodies read as frontal elevation. All six sheets were regenerated as whole sheets. A new Sporecap was generated without the rejected frontal sheet as a reference, using the original contract plus this binding correction:

```text
Camera mounted high above the unit with a 55-degree downward pitch and a slight lower-right azimuth, orthographic/isometric strategy-game view. The top surface of every cap/body must dominate; sides are visibly foreshortened; undersides/gills are barely visible; the root contact reads as a small ellipse on the ground plane. No eye-level view, no front elevation, no character-sheet frontal pose.
```

That new Sporecap generation showed more cap surface but retained front-elevation stems and added a cell-16 disc, so it was rejected. The accepted Sporecap used this exact first whole-sheet correction:

```text
Change the camera view of every one of the sixteen Sporecap sprites so the whole atlas genuinely reads as a high three-quarter top-down orthographic/isometric strategy-game view. Camera mounted high above each unit with a 55-degree downward pitch and a slight lower-right azimuth. Rotate/re-render each complete organism from that elevated camera: the top surface of each cap must dominate, the cap must visibly obscure most of the stem, all vertical sides must be strongly foreshortened, gills/undersides must be barely visible, and the root contact must read as a small ellipse on the horizontal ground plane behind/beneath the cap rather than as a frontal row of rocks. The result must resemble units viewed from a high strategy-game camera, never a front-facing character sheet.

Also remove only the enclosing circular UI disc/frame from cell 16. Cell 16 must be one clean centered mature Sporecap portrait directly on the same flat #0000ff chroma-key background.

Constraints: this is a whole-sheet edit. Preserve the exact 4×4 layout, exactly sixteen occupied cells, row-major form mapping, one connected organism per cell, tower identity, evolution geometry, palette, gouache texture, lighting, spacing, safe margins, animation grouping, and uniform #0000ff background. Keep the same local root anchor near x=128 y=194. No eye-level view, no front elevation, no upright character-sheet frontal pose, no visible grid, divider, text, labels, scenery, floor, cast shadow, gradient, background texture, watermark, montage, border, UI frame, duplicate object, cropping, or spill.
```

The accepted Sporecap then became the only style/camera reference for the other five new whole-sheet generations. Thorn Sniper and Lumen Oracle required one further whole-sheet camera correction each. Their exact subject-specific correction requests were:

```text
THORN SNIPER: Change the camera view of every one of the sixteen Thorn Sniper sprites so the whole sheet genuinely reads from the same high three-quarter top-down orthographic/isometric strategy-game camera as the corrected Sporecap reference: camera high above at a 55-degree downward pitch with slight lower-right azimuth. Re-render each complete tower from above. The top cap/weapon planes must dominate; the tall stalk must project away into depth and appear strongly foreshortened to roughly half its current visible height, not stand vertically as a front elevation. Show the top face and length of the single thorn firing axis receding across the cap plane, not a spike pointed vertically at the viewer. Root contacts must be compact ground-plane ellipses. Preserve the elegant sniper identity and one clear firing axis.

LUMEN ORACLE: Change the camera view of every one of the sixteen Lumen Oracle sprites so the whole sheet genuinely reads from the same high three-quarter top-down orthographic/isometric strategy-game camera as the corrected Sporecap reference: camera high above at a 55-degree downward pitch with slight lower-right azimuth. Re-render each complete tower from above. Rotate the two split cap lobes out of an upright front-facing shell pose into a broad crown whose upper surfaces dominate; the central split must read as a narrow top-view seam. Strongly foreshorten the stem to roughly half its current visible height and let the cap obscure most of it. The small root base must read as a compact ground-plane ellipse. Keep attached light-node filaments visible from above and preserve the calm support/detection identity.

SHARED CONSTRAINTS: whole-sheet edit only. Preserve exact 4×4 layout, exactly sixteen occupied cells, row-major form mapping, one connected organism per cell, evolution geometry, palette, gouache texture, lighting, spacing, safe margins, animation grouping, and perfectly uniform #0000ff chroma background. Keep root anchors near local x=128 y=194. Cell 16 stays one clean unframed portrait. No eye-level view, no front elevation, no upright character-sheet pose, no visible grid/divider, text, labels, scenery, floor, cast shadow, gradient, background texture, watermark, montage, border, UI frame, duplicate, cropping, or spill.
```

Accepted built-in source outputs:

| Tower | Built-in output filename |
| --- | --- |
| Sporecap | `exec-bb9cf974-85e7-4101-ad7f-2972e3a9b7ca.png` |
| Thorn Sniper | `exec-f3b048ff-6bb1-43c5-bcf1-2988c86aeb04.png` |
| Puffball | `exec-3730d2ae-3ee4-4caa-bad4-277d60f8314f.png` |
| Slimefungus | `exec-5886c275-b5e0-4002-b892-2a7557676e88.png` |
| Bulb Shooter | `exec-b2262389-502a-4aae-8de5-86789a5d7ec4.png` |
| Lumen Oracle | `exec-7d31f6b8-a88c-48bc-b17f-0e6e5dba1dc3.png` |

## Final Thorn Sniper silhouette correction

Final re-review found that the camera-corrected Thorn sheet still read as a spherical mine with a vertical horn rather than a precision sniper. The complete Thorn sheet was regenerated from the approved corrected Sporecap reference with the exact original Thorn subject block plus this binding silhouette correction:

```text
A single elongated forward firing axis must dominate every form, projecting diagonally toward the lower-right from the high-angle view and occupying roughly 35–45% of the unit silhouette length. Seedling has one small forward needle bud; Mature has one long lance with root braces; Predator has one thick dark heartwood spear on the same axis with crimson side bracing; Specialist has one extra-long amber piercing lance with guide fins; Symbiote has one restrained curved scythe-like thorn on the same forward axis. No vertical central horn, no spherical mine silhouette, no radial mine spikes, no turret barrel cluster, no multiple weapons.
```

The first corrected source, `exec-521983c9-5744-4a98-a78d-b1eff60d1f9a.png`, passed the gameplay-form silhouette check but added a rectangular frame to cell 16. It was corrected as a whole sheet with:

```text
Keep the complete atlas unchanged except remove the rectangular UI frame, dark card backdrop, and enclosing border from cell 16 (bottom-right). Cell 16 must remain one clean centered Thorn Sniper tower-card portrait directly on the same perfectly flat #0000ff chroma-key background, with its single elongated forward lance projecting diagonally toward the lower-right.

Constraints: preserve cells 1–15 exactly. Preserve the exact 4×4 layout, sixteen occupied cells, one connected organism per cell, high 55-degree downward-pitch orthographic camera, single lower-right firing axis in every form, tower design, evolution silhouettes, camera, palette, texture, lighting, positions, root anchors, three distinct frames per form, and uniform #0000ff background. No other changes, visible grid, border, divider, text, labels, scenery, floor, shadow, gradient, background texture, watermark, montage, extra object, vertical central horn, spherical mine silhouette, radial mine spikes, weapon cluster, or multiple weapons.
```

The accepted unframed whole-sheet source is `exec-f3b048ff-6bb1-43c5-bcf1-2988c86aeb04.png`. It received the same complete-sheet resample, chroma removal, connected-region assignment, safe-area scaling, and fragment rejection described below. No individual gameplay cell was repainted or sourced separately.

## Provenance, rights, and cleanup

| Field | Record |
| --- | --- |
| Generator | OpenAI built-in `image_gen` tool |
| Exposed model/version | Not reported by the built-in tool; no hidden model name or version was inferred |
| Generation date | 2026-07-20 |
| Style reference | Final approved Sporecap atlas, generated in the same workflow; no third-party image input |
| Source output | Built-in square RGB PNGs at 1254×1254 |
| Final output | Six packaged 1024×1024 RGBA PNG atlases |
| Usage note | AI-assisted original project assets generated under the user's OpenAI tool access. Use and distribution remain subject to the applicable OpenAI service terms and the project's own release review. |

Cleanup was deterministic and applied to each whole atlas without repainting individual forms:

1. resampled the complete generated square from 1254×1254 to 1024×1024 with Lanczos;
2. removed the sampled blue border key with the installed `remove_chroma_key.py` helper using border auto-key, soft matte, thresholds 12/220, and despill;
3. identified the sixteen whole connected sprite regions across the complete sheet and assigned each intact region to its nearest row-major cell;
4. discarded foreign cross-cell fragments, uniformly centered each intact region in its assigned 256×256 cell, capped it to the 220×202 safe area, and aligned its root baseline;
5. preserved original pixels, palette, and internal form geometry; no cell was repainted or sourced separately.

Automated validation decodes each final PNG and proves exact dimensions, RGBA format, transparent corners, sixteen occupied safe-area cells, exactly one significant connected sprite region per cell, three non-identical visible-RGBA frames per form, fixed row-major mapping, and geometry-distinct Predator/Specialist/Symbiote silhouettes.
