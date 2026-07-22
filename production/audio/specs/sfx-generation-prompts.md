# Mycelium TD Semantic Sound Effects

## Shared direction

Create one clean, production-ready sound effect for Mycelium TD, a stylized bioluminescent fungal tower-defence game. Sonic identity: organic fungal materials, damp soil, hollow seed pods, stretched fibres, brittle insect shell, soft wood, airy spores, and restrained glassy bioluminescent tones. Avoid generic arcade bleeps, orchestral hits, speech, vocals, comedy, horror gore, harsh distortion, sub-bass rumble, excessive reverb, background ambience, and melodic content unrelated to the two-note network motif.

Deliver a tightly edited 48 kHz / 24-bit WAV master with no leading silence, no clipped transient, peak at or below -1 dBTP, and a natural tail inside the requested duration. Gameplay cues are mono and approximately -18 LUFS integrated. Victory and Defeat are stereo terminal stingers at approximately -16 LUFS. Also export a 192 kbps MP3 with the identical basename for browser playback. Do not bake in looping.

The shared network motif is two soft rising notes: a woody-glass first note followed by a brighter fungal-glass note a perfect fifth above. Connection uses the unresolved two-note rise; Wave Complete and Victory may resolve it. All cues should sound like one deliberately designed family.

## Exact cue prompts

place — 0.18–0.30 seconds. A compact damp-soil thump, tiny root-pluck, and soft cap settle. Warm, tactile, confident, no metallic click.

network-bloom — 0.40–0.60 seconds. The signature two-note rising network motif made from soft wood and translucent fungal glass, with a faint outward mycelium shimmer. Clear but not bright or magical-cartoonish.

mature — 0.45–0.70 seconds. Fibres stretch upward, a seed husk opens, and one restrained luminous rise confirms healthy growth. Related to place but larger; no explosion.

evolve — 0.75–1.10 seconds. A decisive organic transformation: root surge, cap unfurl, and layered luminous bloom. Begin earthy, finish with the network timbre, strong enough for a permanent choice without becoming a musical fanfare.

layer-break — 0.12–0.28 seconds. One brittle insect-shell crack with a dry pop and tiny fragment scatter. Short, readable in dense combat, no glass-shatter cliché.

trait-break — 0.18–0.35 seconds. A taut membrane or chitin ward snaps, followed by a very short dimming shimmer. Distinct from layer-break, lighter and more energetic.

seed-detonate — 0.28–0.50 seconds. A hollow seed pod compresses then bursts into a rounded fungal puff with a compact low-mid impact. Satisfying, not explosive military ordnance.

leak — 0.45–0.70 seconds. A descending wet wooden warning with one strained root tone. Urgent and negative without a buzzer, alarm, or painful high frequency.

wave-complete — 0.70–1.10 seconds. The two-note network motif returns and resolves with a warm third organic tone, plus a subtle settling spore tail. Rewarding but quieter than Victory.

victory — 1.8–2.8 seconds, stereo. An earned terminal stinger that grows from roots into a luminous connected canopy, using the network motif and a warm resolution. Organic, hopeful, concise, no cinematic orchestra or choir.

defeat — 1.5–2.3 seconds, stereo. The network motif loses energy and descends into a soft root collapse and fading hollow cap tone. Melancholic and readable, not frightening, comic, or punishing.

## Generation and selection method

The generator is the deterministic FFmpeg 8.1.1 recipe in `production/audio/scripts/generate-sfx.sh`, authored during an OpenAI Codex session. It builds each candidate from original mathematical oscillator/filter/envelope instructions; no samples, stock recordings, melodies, speech, or third-party audio inputs are present. Each cue has three candidates at 0.97×, 1.00×, and 1.03× pitch-family variants under `.superpowers/audio-takes/`. Take 2 was selected consistently after checking duration, channel layout, peak headroom, waveform tail, motif ratios, and spectrogram continuity. Cleanup is limited to a 45 Hz high-pass, 6.2 kHz low-pass, natural output fade, EBU R128 loudness normalization, safety limiting, 24-bit WAV encoding, and 192 kbps MP3 encoding.

Selection was technical and spectrogram-based. No human audition was available in this execution environment, so emotional readability and mix translation remain an explicit qualitative playtest item; this document does not claim a listening approval.

FFmpeg's EBU R128 integrated meter reports finite values of approximately -18 LUFS for gameplay cues at least 400 ms long and -16 LUFS for both terminal cues. Its absolute short-program gate reports `-inf` for place, layer-break, and trait-break because they are shorter than the meter block, so no finite LUFS claim is made for those three. Their measured RMS levels are respectively -15.07, -17.73, and -17.82 dBFS; their measured true/sample peaks are -1.2 dBFS or lower. Every other master also measures at or below -1.2 dBTP.

For every provenance row, the complete generation prompt is the three verbatim paragraphs in **Shared direction**, immediately followed by the row's verbatim cue prompt in **Exact cue prompts**. Usage rights reference: original procedural synthesis with no third-party audio inputs, governed by this repository's ISC license as declared in `package.json`.

## Provenance

| Cue | Generator | Model/version | Generation date | Complete prompt | Usage-rights reference | Selected take | Cleanup edits | WAV SHA-256 | MP3 SHA-256 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| place | FFmpeg 8.1.1 procedural synthesis authored by OpenAI Codex | OpenAI Codex session; exact build identifier not exposed | 2026-07-20 | Shared direction + exact `place` prompt above | Original mathematical synthesis; no stock inputs; repository ISC license | take 2 of 3 | 45 Hz HPF; 6.2 kHz LPF; natural fade; -18 LUFS target; -1.2 dBTP target; 24-bit WAV; 192 kbps MP3 | `74014ec50bedfeea2a776b9e33fb928283834370b4c1cc18438515d3d18ec0e4` | `cffc125c8527eff31c165c6eae4acf54f6d6bd1cb65e512cb601d7ed06fac4e3` |
| network-bloom | FFmpeg 8.1.1 procedural synthesis authored by OpenAI Codex | OpenAI Codex session; exact build identifier not exposed | 2026-07-20 | Shared direction + exact `network-bloom` prompt above | Original mathematical synthesis; no stock inputs; repository ISC license | take 2 of 3 | 45 Hz HPF; 6.2 kHz LPF; natural fade; -18 LUFS target; -1.2 dBTP target; 24-bit WAV; 192 kbps MP3 | `a9e403132a67bc6cd300693b692b987280de49b1dfcb7018785c6cd49d36c243` | `21f492f8ca2d4a9e540c6566dbdec00bcf815871c07cdcead0dfb9016ad7f139` |
| mature | FFmpeg 8.1.1 procedural synthesis authored by OpenAI Codex | OpenAI Codex session; exact build identifier not exposed | 2026-07-20 | Shared direction + exact `mature` prompt above | Original mathematical synthesis; no stock inputs; repository ISC license | take 2 of 3 | 45 Hz HPF; 6.2 kHz LPF; natural fade; -18 LUFS target; -1.2 dBTP target; 24-bit WAV; 192 kbps MP3 | `87c8bf1245ff9a1d84991b3d11c6d7e7ad345c2d0d0687b9570427801fd3af52` | `35588206ca0c9daff9cdc4d94841a03ad4ba0ba802aecf34811b1913e8e6136a` |
| evolve | FFmpeg 8.1.1 procedural synthesis authored by OpenAI Codex | OpenAI Codex session; exact build identifier not exposed | 2026-07-20 | Shared direction + exact `evolve` prompt above | Original mathematical synthesis; no stock inputs; repository ISC license | take 2 of 3 | 45 Hz HPF; 6.2 kHz LPF; natural fade; -18 LUFS target; -1.2 dBTP target; 24-bit WAV; 192 kbps MP3 | `b71a99c33da5869bbf69af4c95cbe0a2112826cb296ebaee74511ef4624e1a36` | `b93571780a5a0c5b0e6b55b8e36d7aa0121c759127349df59307d502ba789103` |
| layer-break | FFmpeg 8.1.1 procedural synthesis authored by OpenAI Codex | OpenAI Codex session; exact build identifier not exposed | 2026-07-20 | Shared direction + exact `layer-break` prompt above | Original mathematical synthesis; no stock inputs; repository ISC license | take 2 of 3 | 45 Hz HPF; 6.2 kHz LPF; natural fade; -18 LUFS target; -1.2 dBTP target; 24-bit WAV; 192 kbps MP3 | `7bce4dad9a654aaf16be9977e269bda9be978d6d290b4e6d895a7eaee0837bd3` | `a9f679d8a23a3d52d9a1ab3ecfaa5d2c2647269aa2008593b655cd1f157527f9` |
| trait-break | FFmpeg 8.1.1 procedural synthesis authored by OpenAI Codex | OpenAI Codex session; exact build identifier not exposed | 2026-07-20 | Shared direction + exact `trait-break` prompt above | Original mathematical synthesis; no stock inputs; repository ISC license | take 2 of 3 | 45 Hz HPF; 6.2 kHz LPF; natural fade; -18 LUFS target; -1.2 dBTP target; 24-bit WAV; 192 kbps MP3 | `b92b3c2dc1d229f7f5e462f64a0c21609831454b521cf211b02b52fbffb44481` | `f6bdf543d708700c6c370d0ab8714f8d829fc0ca19286f7d28d358c71350ae18` |
| seed-detonate | FFmpeg 8.1.1 procedural synthesis authored by OpenAI Codex | OpenAI Codex session; exact build identifier not exposed | 2026-07-20 | Shared direction + exact `seed-detonate` prompt above | Original mathematical synthesis; no stock inputs; repository ISC license | take 2 of 3 | 45 Hz HPF; 6.2 kHz LPF; natural fade; -18 LUFS target; -1.2 dBTP target; 24-bit WAV; 192 kbps MP3 | `f287e6ca90cc3e073813861d9140ace28a4ab41faea814bacc98608ddb02062e` | `e1139267662c8c5b25809275677a1c5354b0c99cba4eef98c5abd492064e6d73` |
| leak | FFmpeg 8.1.1 procedural synthesis authored by OpenAI Codex | OpenAI Codex session; exact build identifier not exposed | 2026-07-20 | Shared direction + exact `leak` prompt above | Original mathematical synthesis; no stock inputs; repository ISC license | take 2 of 3 | 45 Hz HPF; 6.2 kHz LPF; natural fade; -18 LUFS target; -1.2 dBTP target; 24-bit WAV; 192 kbps MP3 | `adf97f2508ece184f72d57c5c0b1852dbd93499d1ae7686d542465987feff35c` | `dd7b08931b6c6cea5e0f35af4b3d0a61094a73f9d13794f91fd95891b87d9a0d` |
| wave-complete | FFmpeg 8.1.1 procedural synthesis authored by OpenAI Codex | OpenAI Codex session; exact build identifier not exposed | 2026-07-20 | Shared direction + exact `wave-complete` prompt above | Original mathematical synthesis; no stock inputs; repository ISC license | take 2 of 3 | 45 Hz HPF; 6.2 kHz LPF; natural fade; -18 LUFS target; -1.2 dBTP target; 24-bit WAV; 192 kbps MP3 | `0bb36f2a2ace11b44d14abee060becc0e37494be6de9a33ccca563cef5744645` | `c9f159306d1d5c568f686be492544ff24e67f9bd2e7f71e39dd630b20d2472f0` |
| victory | FFmpeg 8.1.1 procedural synthesis authored by OpenAI Codex | OpenAI Codex session; exact build identifier not exposed | 2026-07-20 | Shared direction + exact `victory` prompt above | Original mathematical synthesis; no stock inputs; repository ISC license | take 2 of 3 | 45 Hz HPF; 6.2 kHz LPF; natural fade; -16 LUFS target; -1.2 dBTP target; stereo 24-bit WAV; 192 kbps MP3 | `57510b75aab5eb28eab8ffcf68d2fd491e120f09b32f8978ee1d47df554b5cb0` | `0f2746e62f1710f87cdd92ffa20aa4ac14c323e816ada5b4ddcc2a9e910ac683` |
| defeat | FFmpeg 8.1.1 procedural synthesis authored by OpenAI Codex | OpenAI Codex session; exact build identifier not exposed | 2026-07-20 | Shared direction + exact `defeat` prompt above | Original mathematical synthesis; no stock inputs; repository ISC license | take 2 of 3 | 45 Hz HPF; 6.2 kHz LPF; natural fade; -16 LUFS target; -1.2 dBTP target; stereo 24-bit WAV; 192 kbps MP3 | `e150d5dadafec24fb3416f5489d3a3b304b6138ae010c2269ab1c309c1bc77c1` | `dc25fc9c25b9ca785f48b14f49335b17c970e4fd42a0c8d4124ec2a9d7ac25f9` |
