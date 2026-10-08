# Sound

Decide whether sound improves the piece; intentional silence is valid. When the piece has sound, plan the sonic palette alongside the visuals.

## Voice
- Write for the ear: short sentences, one idea each, the stressed word last. Read it aloud at the target pace (about 150-165 wpm for explainers).
- TTS (ElevenLabs when connected, with spend approval): pick the voice from the service's voice list to match the brief, and never guess voice IDs. Check pronunciation of product names and acronyms; use phonetic respellings if needed.
- Get **word-level timestamps** from the TTS response or forced alignment (transcribe the final VO). Save them as `audio/vo.words.json`.
- Picture locks to the VO: key motion lands on the stressed syllable, within 1 frame.
- Voice clones or real likenesses require explicit authorization.

## Music
- Choose a tempo, then snap cuts and key actions to the beat grid (beat = 60/BPM s). One motif returns on the key idea.
- Source it from a licensed track, generated music (with approval, logging provenance), or a procedural bed rendered with `OfflineAudioContext` so it is deterministic. Never use a live `AudioContext` during frame capture.
- Edit music on bar boundaries with 10-30 ms crossfades. No clicks.

## Sound design
- Layers: UI foley (clicks, ticks, soft keys), one transition texture, one low-end hit on the main turn or reveal, and room tone under the VO.
- Sync meaningful accents only. Do not punctuate every movement.
- Place every cue by frame number from the timeline (`frame / fps` seconds). Export a cue sheet from the timeline instead of placing cues by hand.

## Mix
- Duck music 6-9 dB under voice, with about 150 ms attack and 400 ms release (ffmpeg `sidechaincompress`, or keyframed gain).
- Use a high-pass on the VO around 80 Hz and gentle de-essing.
- Loudness target by destination. The defaults are -16 LUFS integrated with true peak at most -1.5 dBTP (web/social). Use -14 LUFS for YouTube/Spotify-style normalization when it is requested, and -23 LUFS for EBU broadcast.
- Normalize with two passes of `loudnorm` (measure, then apply `measured_*`) and confirm with `scripts/qa.mjs`.
- Check for clipping, unintended silence and channel balance. Listen to the final export end to end at normal volume.

## Captions
- Captions are word-timed from the VO timestamps: at most 2 lines and about 32 characters per line, each cue 1-6 s, breaking on phrases.
- Include relevant non-speech cues ([music swells]) when the audio carries meaning.
- Ship `captions.srt`, plus burned-in captions when requested, placed inside the safe areas. The active word can get a subtle highlight.
- Proofread against the final audio, not the script.
