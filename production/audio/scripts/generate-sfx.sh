#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
take_root="$repo_root/.superpowers/audio-takes"
master_root="$repo_root/assets/sfx"
runtime_root="$repo_root/public/assets/sfx"
mkdir -p "$take_root" "$master_root" "$runtime_root"

cues=(place network-bloom mature evolve layer-break trait-break seed-detonate leak wave-complete victory defeat)

duration_for() {
  case "$1" in
    place) echo 0.24 ;;
    network-bloom) echo 0.52 ;;
    mature) echo 0.62 ;;
    evolve) echo 0.95 ;;
    layer-break) echo 0.22 ;;
    trait-break) echo 0.29 ;;
    seed-detonate) echo 0.42 ;;
    leak) echo 0.60 ;;
    wave-complete) echo 0.95 ;;
    victory) echo 2.35 ;;
    defeat) echo 1.90 ;;
  esac
}

expression_for() {
  local cue="$1" scale="$2"
  case "$cue" in
    place) echo "0.34*sin(2*PI*78*$scale*t)*exp(-18*t)+0.10*sin(2*PI*232*$scale*t)*exp(-28*t)+0.04*sin(2*PI*510*$scale*t)*exp(-38*t)" ;;
    network-bloom) echo "0.12*sin(2*PI*260*$scale*t)*(between(t\,0\,0.24))*exp(-4*t)+0.11*sin(2*PI*390*$scale*(t-0.16))*(between(t\,0.16\,0.52))*exp(-4*(t-0.16))+0.025*sin(2*PI*780*$scale*t)*exp(-5*t)" ;;
    mature) echo "0.10*sin(2*PI*(145+180*t)*$scale*t)*exp(-3*t)+0.07*sin(2*PI*(290+240*t)*$scale*t)*exp(-4*t)+0.025*sin(2*PI*72*$scale*t)*exp(-8*t)" ;;
    evolve) echo "0.18*sin(2*PI*(72+95*t)*$scale*t)*exp(-2.4*t)+0.08*sin(2*PI*(220+350*t)*$scale*t)*exp(-2*t)+0.05*sin(2*PI*330*$scale*(t-0.46))*(between(t\,0.46\,0.95))*exp(-3*(t-0.46))+0.04*sin(2*PI*495*$scale*(t-0.58))*(between(t\,0.58\,0.95))*exp(-3*(t-0.58))" ;;
    layer-break) echo "0.28*sin(2*PI*(680-2400*t)*$scale*t)*exp(-34*t)+0.12*sin(2*PI*118*$scale*t)*exp(-30*t)+0.05*sin(2*PI*1900*$scale*t)*exp(-55*t)" ;;
    trait-break) echo "0.18*sin(2*PI*(920-1550*t)*$scale*t)*exp(-22*t)+0.10*sin(2*PI*330*$scale*t)*exp(-18*t)+0.04*sin(2*PI*1320*$scale*t)*exp(-15*t)" ;;
    seed-detonate) echo "0.05*sin(2*PI*170*$scale*t)*(between(t\,0\,0.09))+0.30*sin(2*PI*(120-90*(t-0.08))*$scale*(t-0.08))*(between(t\,0.08\,0.42))*exp(-12*(t-0.08))+0.07*sin(2*PI*420*$scale*(t-0.08))*(between(t\,0.08\,0.32))*exp(-15*(t-0.08))" ;;
    leak) echo "0.14*sin(2*PI*(230-145*t)*$scale*t)*exp(-2.8*t)+0.10*sin(2*PI*(115-58*t)*$scale*t)*exp(-3.5*t)+0.035*sin(2*PI*345*$scale*t)*exp(-6*t)" ;;
    wave-complete) echo "0.09*sin(2*PI*294*$scale*t)*(between(t\,0\,0.34))*exp(-3*t)+0.09*sin(2*PI*441*$scale*(t-0.20))*(between(t\,0.20\,0.62))*exp(-3*(t-0.20))+0.08*sin(2*PI*588*$scale*(t-0.43))*(between(t\,0.43\,0.95))*exp(-3*(t-0.43))+0.025*sin(2*PI*882*$scale*t)*exp(-3*t)" ;;
    victory) echo "0.11*sin(2*PI*147*$scale*t)*exp(-0.9*t)+0.08*sin(2*PI*294*$scale*(t-0.18))*(between(t\,0.18\,1.25))*exp(-1.3*(t-0.18))+0.08*sin(2*PI*441*$scale*(t-0.52))*(between(t\,0.52\,1.65))*exp(-1.3*(t-0.52))+0.07*sin(2*PI*588*$scale*(t-0.92))*(between(t\,0.92\,2.35))*exp(-1.2*(t-0.92))|0.10*sin(2*PI*147*$scale*t+0.06)*exp(-0.9*t)+0.075*sin(2*PI*294*$scale*(t-0.16))*(between(t\,0.16\,1.3))*exp(-1.25*(t-0.16))+0.085*sin(2*PI*441*$scale*(t-0.55))*(between(t\,0.55\,1.7))*exp(-1.25*(t-0.55))+0.07*sin(2*PI*588*$scale*(t-0.88))*(between(t\,0.88\,2.35))*exp(-1.15*(t-0.88))" ;;
    defeat) echo "0.09*sin(2*PI*330*$scale*t)*exp(-1.5*t)+0.08*sin(2*PI*220*$scale*(t-0.30))*(between(t\,0.30\,1.9))*exp(-1.5*(t-0.30))+0.13*sin(2*PI*(105-32*t)*$scale*t)*exp(-1.7*t)|0.085*sin(2*PI*330*$scale*t+0.04)*exp(-1.45*t)+0.075*sin(2*PI*220*$scale*(t-0.33))*(between(t\,0.33\,1.9))*exp(-1.45*(t-0.33))+0.12*sin(2*PI*(105-31*t)*$scale*t)*exp(-1.65*t)" ;;
  esac
}

for cue in "${cues[@]}"; do
  duration="$(duration_for "$cue")"
  fade_start="$(awk -v d="$duration" 'BEGIN { printf "%.3f", (d > 1.4 ? d - 0.35 : d - 0.10) }')"
  channels=1
  target=-18
  if [[ "$cue" == victory || "$cue" == defeat ]]; then channels=2; target=-16; fi
  for take in 1 2 3; do
    case "$take" in 1) scale=0.97 ;; 2) scale=1.00 ;; 3) scale=1.03 ;; esac
    expression="$(expression_for "$cue" "$scale")"
    candidate="$take_root/$cue-take-$take.wav"
    ffmpeg -hide_banner -loglevel error -y \
      -f lavfi -i "aevalsrc=exprs='$expression':s=48000:d=$duration" \
      -af "highpass=f=45,lowpass=f=6200,afade=t=out:st=$fade_start:d=$(awk -v d="$duration" -v s="$fade_start" 'BEGIN {printf "%.3f", d-s}'),loudnorm=I=$target:TP=-1.2:LRA=7,alimiter=limit=0.871:level=false" \
      -ar 48000 -ac "$channels" -c:a pcm_s24le "$candidate"
  done
  cp "$take_root/$cue-take-2.wav" "$master_root/$cue.wav"
  ffmpeg -hide_banner -loglevel error -y -i "$master_root/$cue.wav" -c:a libmp3lame -b:a 192k "$runtime_root/$cue.mp3"
done
