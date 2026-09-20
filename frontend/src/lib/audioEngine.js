const audioCtx = typeof window !== 'undefined' ? new (window.AudioContext || window.webkitAudioContext)() : null;

// Pre-compute a white noise buffer for better percussive sounds
let noiseBuffer = null;
if (audioCtx) {
  const bufferSize = audioCtx.sampleRate * 0.15; // 150ms
  noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const data = noiseBuffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }
}

export function playKeystroke(theme) {
  if (!audioCtx || theme === 'none' || !theme) return;
  
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }

  const t = audioCtx.currentTime;

  if (theme === 'thock') {
    // A deep, satisfying mechanical "thock" (like a lubed switch)
    // Uses a low-passed noise burst + a subtle low-frequency sine thump
    
    // 1. Noise transient (the "clack")
    const noiseSource = audioCtx.createBufferSource();
    noiseSource.buffer = noiseBuffer;
    
    const noiseFilter = audioCtx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.value = 800;
    noiseFilter.Q.value = 1.5;
    
    const noiseGain = audioCtx.createGain();
    noiseGain.gain.setValueAtTime(1.5, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, t + 0.05);
    
    noiseSource.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(audioCtx.destination);
    
    noiseSource.start(t);
    noiseSource.stop(t + 0.05);

    // 2. Body resonance (the "thump")
    const osc = audioCtx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, t);
    osc.frequency.exponentialRampToValueAtTime(60, t + 0.08);
    
    const oscGain = audioCtx.createGain();
    oscGain.gain.setValueAtTime(0.8, t);
    oscGain.gain.exponentialRampToValueAtTime(0.01, t + 0.08);
    
    osc.connect(oscGain);
    oscGain.connect(audioCtx.destination);
    
    osc.start(t);
    osc.stop(t + 0.08);
    
  } else if (theme === 'wood') {
    // A crisp, resonant wood block tap
    const noiseSource = audioCtx.createBufferSource();
    noiseSource.buffer = noiseBuffer;
    
    const noiseFilter = audioCtx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.value = 2500;
    noiseFilter.Q.value = 3.0;
    
    const noiseGain = audioCtx.createGain();
    noiseGain.gain.setValueAtTime(2.0, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, t + 0.04);
    
    noiseSource.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(audioCtx.destination);
    
    noiseSource.start(t);
    noiseSource.stop(t + 0.04);
    
    // Subtle wood resonance
    const osc = audioCtx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(800, t);
    osc.frequency.exponentialRampToValueAtTime(300, t + 0.06);
    
    const oscGain = audioCtx.createGain();
    oscGain.gain.setValueAtTime(0.5, t);
    oscGain.gain.exponentialRampToValueAtTime(0.01, t + 0.06);
    
    osc.connect(oscGain);
    oscGain.connect(audioCtx.destination);
    
    osc.start(t);
    osc.stop(t + 0.06);

  } else if (theme === 'water') {
    // A bubbly, pleasing water drop
    const osc = audioCtx.createOscillator();
    osc.type = 'sine';
    
    // Quick pitch sweep up for the bubble effect
    osc.frequency.setValueAtTime(400, t);
    osc.frequency.exponentialRampToValueAtTime(1200, t + 0.06);
    
    const gain = audioCtx.createGain();
    gain.gain.setValueAtTime(0.8, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.08);
    
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    
    osc.start(t);
    osc.stop(t + 0.08);
  }
}
