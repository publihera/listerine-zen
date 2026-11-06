/**
 * Sereno • Motor de Áudio Web Audio API
 * Transmuta ruídos e sons captados pelo microfone em música ambiente relaxante.
 */

class SerenoAudioEngine {
  constructor() {
    this.audioCtx = null;
    this.micStream = null;
    this.micSource = null;
    this.micGain = null;
    this.micBleedGain = null;

    // Nós de análise
    this.analyser = null;
    this.timeData = null;
    this.freqData = null;

    // Cadeia de efeitos espaciais
    this.reverbNode = null;
    this.reverbGain = null;
    this.delayNode = null;
    this.delayFeedback = null;
    this.masterGain = null;
    this.compressor = null;
    this.recorderDest = null;
    this.mediaRecorder = null;
    this.recordedChunks = [];

    // Banco de Ressonadores (Filtros passa-banda sintonizados)
    this.resonators = [];
    this.resonatorMasterGain = null;

    // Ganhos e volumes configuráveis (valores padrão)
    this.bellsVolume = 75;
    this.droneVolume = 60;
    this.resonanceVolume = 80;
    this.reverbVolume = 85;
    this.micBleedVolume = 0;

    // Nós de ganho das camadas
    this.resonatorMasterGain = null;
    this.bellsGain = null;
    this.droneGain = null;

    // Estado musical
    this.currentKey = 'C';
    this.currentScale = 'hirajoshi';
    this.scaleFrequencies = [];
    this.scaleNoteNames = [];

    // Parâmetros de resposta acústica
    this.sensitivity = 0.65; // 0.0 a 1.0
    this.density = 0.5;      // 0.0 a 1.0
    this.lastTriggerTime = 0;
    this.minTriggerInterval = 280; // ms entre sinos
    this.lastRMS = 0;
    this.smoothedEnergy = 0;
    this.isRunning = false;

    // Preset atual
    this.activePreset = 'zen';

    // Vozes de Drone ativas
    this.droneVoices = [];
    this.droneIntervalId = null;

    // Reprodução de Faixas da Playlist (Estilo Spotify)
    this.playbackMode = 'live'; // 'live' | 'track' | 'generative'
    this.currentAudioElement = null;
    this.audioSourceNode = null;
    this.generativeTimerId = null;
    this.trackDurationSec = 240; // 4 min padrão
    this.trackCurrentTimeSec = 0;
    this.trackTimerInterval = null;

    // Callbacks de eventos para UI e Visualizador
    this.onNoteTriggered = null; // (noteName, freq, velocity) => {}
    this.onEnergyUpdate = null;  // (rms, db, centroid) => {}
    this.onTrackProgress = null; // (currentTimeSec, durationSec) => {}
    this.onTrackEnded = null;    // () => {}
  }

  // Definições de Escalas e Notas
  static get NOTE_SEMITONES() {
    return {
      'C': 0, 'C#': 1, 'D': 2, 'D#': 3, 'E': 4, 'F': 5,
      'F#': 6, 'G': 7, 'G#': 8, 'A': 9, 'A#': 10, 'B': 11
    };
  }

  static get NOTE_NAMES() {
    return ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  }

  static get SCALES() {
    return {
      pentatonicMajor: {
        name: 'Pentatônica Maior',
        intervals: [0, 2, 4, 7, 9] // 1, 2, 3, 5, 6
      },
      hirajoshi: {
        name: 'Zen Hirajoshi',
        intervals: [0, 2, 3, 7, 8] // 1, 2, b3, 5, b6
      },
      lydian: {
        name: 'Lydian Celestial',
        intervals: [0, 2, 4, 6, 7, 9, 11] // 1, 2, 3, #4, 5, 6, 7
      },
      dorian: {
        name: 'Dórico Noturno',
        intervals: [0, 2, 3, 5, 7, 9, 10] // 1, 2, b3, 4, 5, 6, b7
      },
      ambientChords: {
        name: 'Acordes Ambient',
        intervals: [0, 4, 7, 11, 14, 16] // Maj9 e aberturas
      }
    };
  }

  /**
   * Converte número MIDI em Frequência (Hz)
   */
  midiToFreq(midi) {
    return 440 * Math.pow(2, (midi - 69) / 12);
  }

  /**
   * Atualiza a tabela de frequências da escala ativa (oitavas 2 a 6)
   */
  updateScaleFrequencies() {
    const rootSemitone = SerenoAudioEngine.NOTE_SEMITONES[this.currentKey] ?? 0;
    const scaleDef = SerenoAudioEngine.SCALES[this.currentScale] || SerenoAudioEngine.SCALES.hirajoshi;
    const intervals = scaleDef.intervals;

    this.scaleFrequencies = [];
    this.scaleNoteNames = [];

    // Gerar notas nas oitavas 2, 3, 4, 5 e 6
    for (let oct = 2; oct <= 6; oct++) {
      for (let i = 0; i < intervals.length; i++) {
        const interval = intervals[i];
        const midi = (oct + 1) * 12 + rootSemitone + interval;
        const freq = this.midiToFreq(midi);
        const noteIndex = (rootSemitone + interval) % 12;
        const noteName = `${SerenoAudioEngine.NOTE_NAMES[noteIndex]}${oct}`;

        this.scaleFrequencies.push({ freq, midi, noteName, oct });
        this.scaleNoteNames.push(noteName);
      }
    }

    // Se os ressonadores já existem, sintonizar com a nova escala
    if (this.resonators.length > 0) {
      this.retuneResonators();
    }
  }

  /**
   * Garante a criação do contexto e grafo de síntese / efeitos
   * (Pode ser invocado para tocar faixas mesmo antes do microfone ser ativado)
   */
  async ensureAudioGraph() {
    if (this.audioCtx && this.compressor) {
      if (this.audioCtx.state === 'suspended') {
        await this.audioCtx.resume();
      }
      return;
    }

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    this.audioCtx = new AudioContextClass({
      latencyHint: 'interactive'
    });

    if (this.audioCtx.state === 'suspended') {
      await this.audioCtx.resume();
    }

    // Master Compressor / Limiter para segurança e conforto acústico
    this.compressor = this.audioCtx.createDynamicsCompressor();
    this.compressor.threshold.value = -16;
    this.compressor.knee.value = 12;
    this.compressor.ratio.value = 8;
    this.compressor.attack.value = 0.005;
    this.compressor.release.value = 0.25;

    // Master Gain
    this.masterGain = this.audioCtx.createGain();
    this.masterGain.gain.value = 0.85;

    // Destino para Gravação
    this.recorderDest = this.audioCtx.createMediaStreamDestination();

    // Criar Reverb Convolucional Sintético
    this.reverbNode = this.audioCtx.createConvolver();
    this.reverbNode.buffer = this.generateImpulseResponse(4.8, 2.2);

    this.reverbGain = this.audioCtx.createGain();
    this.reverbGain.gain.value = (this.reverbVolume / 100) * 1.0;

    // Stereo Ping-Pong Delay com filtro suave
    this.createPingPongDelay();

    // Ganhos das camadas
    this.resonatorMasterGain = this.audioCtx.createGain();
    this.resonatorMasterGain.gain.value = (this.resonanceVolume / 100) * 1.0;

    this.bellsGain = this.audioCtx.createGain();
    this.bellsGain.gain.value = (this.bellsVolume / 100) * 0.9;

    this.droneGain = this.audioCtx.createGain();
    this.droneGain.gain.value = (this.droneVolume / 100) * 0.8;

    // Construir Banco de Ressonadores (Filtros harmônicos sintonizados)
    this.updateScaleFrequencies();
    this.buildResonatorBank();

    // Camadas enviam para o Reverb e Delay
    const sendToEffects = (node) => {
      node.connect(this.reverbNode);
      node.connect(this.delayInput);
      node.connect(this.compressor); // som direto
    };

    sendToEffects(this.resonatorMasterGain);
    sendToEffects(this.bellsGain);
    sendToEffects(this.droneGain);

    // Efeitos conectam no Compressor
    this.reverbNode.connect(this.reverbGain);
    this.reverbGain.connect(this.compressor);
    this.delayOutput.connect(this.compressor);

    // Compressor -> Master -> Destinos
    this.compressor.connect(this.masterGain);
    this.masterGain.connect(this.audioCtx.destination);
    this.masterGain.connect(this.recorderDest);
  }

  /**
   * Inicializa a captura do microfone e transmutação ao vivo
   */
  async init() {
    if (this.isRunning) return;

    await this.ensureAudioGraph();

    // Pedir acesso ao microfone (desativando cancelamento agressivo para captar o ambiente)
    try {
      this.micStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false
        }
      });
    } catch (err) {
      console.warn('Tentando fallback de microfone padrão:', err);
      this.micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    }

    // Criar nós centrais do microfone
    this.micSource = this.audioCtx.createMediaStreamSource(this.micStream);

    // Pré-amplificador e filtro passa-alta sutil para remover rumble < 35Hz
    const lowcut = this.audioCtx.createBiquadFilter();
    lowcut.type = 'highpass';
    lowcut.frequency.value = 35;
    lowcut.Q.value = 0.7;

    this.micGain = this.audioCtx.createGain();
    this.micGain.gain.value = 1.0;

    // Analisador FFT
    this.analyser = this.audioCtx.createAnalyser();
    this.analyser.fftSize = 2048;
    this.analyser.smoothingTimeConstant = 0.82;
    this.timeData = new Float32Array(this.analyser.fftSize);
    this.freqData = new Uint8Array(this.analyser.frequencyBinCount);

    // Conectar microfone ao analisador e aos ressonadores
    this.micSource.connect(lowcut);
    lowcut.connect(this.micGain);
    this.micGain.connect(this.analyser);
    this.micGain.connect(this.resonatorMasterGain);

    // Monitor do som bruto do microfone (bleeding)
    this.micBleedGain = this.audioCtx.createGain();
    this.micBleedGain.gain.value = (this.micBleedVolume / 100) * 0.4;
    this.micGain.connect(this.micBleedGain);
    this.micBleedGain.connect(this.compressor);

    // Iniciar Drones Contínuos
    this.startAmbientDroneEngine();

    this.isRunning = true;

    // Loop de Análise e Transmutação
    this.startAnalysisLoop();
  }

  /**
   * Constrói o Delay Espacial Estéreo
   */
  createPingPongDelay() {
    this.delayInput = this.audioCtx.createGain();
    this.delayOutput = this.audioCtx.createGain();

    const delayL = this.audioCtx.createDelay();
    delayL.delayTime.value = 0.42; // 420ms

    const delayR = this.audioCtx.createDelay();
    delayR.delayTime.value = 0.63; // 630ms

    const feedbackGainL = this.audioCtx.createGain();
    feedbackGainL.gain.value = 0.35;

    const feedbackGainR = this.audioCtx.createGain();
    feedbackGainR.gain.value = 0.35;

    // Filtros de amortecimento nos ecos para não acumular frequências agudas ásperas
    const filterL = this.audioCtx.createBiquadFilter();
    filterL.type = 'lowpass';
    filterL.frequency.value = 2200;

    const filterR = this.audioCtx.createBiquadFilter();
    filterR.type = 'lowpass';
    filterR.frequency.value = 1800;

    // Panning estéreo
    const merger = this.audioCtx.createChannelMerger(2);

    this.delayInput.connect(delayL);
    this.delayInput.connect(delayR);

    delayL.connect(filterL);
    filterL.connect(feedbackGainL);
    feedbackGainL.connect(delayR); // Cross feedback

    delayR.connect(filterR);
    filterR.connect(feedbackGainR);
    feedbackGainR.connect(delayL);

    filterL.connect(merger, 0, 0); // Canal Esquerdo
    filterR.connect(merger, 0, 1); // Canal Direito

    merger.connect(this.delayOutput);
    this.delayOutput.gain.value = 0.45;
  }

  /**
   * Gera um Impulse Response procedimental para ConvolverNode (Reverb de Espaço Cósmico)
   */
  generateImpulseResponse(durationSec = 4.5, decay = 2.0) {
    const sampleRate = this.audioCtx.sampleRate;
    const length = Math.floor(sampleRate * durationSec);
    const impulse = this.audioCtx.createBuffer(2, length, sampleRate);
    const left = impulse.getChannelData(0);
    const right = impulse.getChannelData(1);

    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      // Curva exponencial suave de decaimento
      const env = Math.exp(-t * decay);
      // Ruído estéreo com suavização
      const noiseL = (Math.random() * 2 - 1) * env;
      const noiseR = (Math.random() * 2 - 1) * env;

      // Adicionar pequenas reflexões iniciais harmônicas
      const earlyRef = i < sampleRate * 0.08 ? (Math.sin(i * 0.02) * 0.3) : 0;

      left[i] = noiseL + earlyRef;
      right[i] = noiseR + earlyRef * 0.9;
    }

    return impulse;
  }

  /**
   * Constrói o banco de 12 ressonadores passa-banda de alto Q
   * Quando qualquer ruído bate no microfone, este banco "canta" os harmônicos afinados!
   */
  buildResonatorBank() {
    this.resonators.forEach(r => {
      try {
        r.filter.disconnect();
        r.gain.disconnect();
      } catch (e) {}
    });
    this.resonators = [];

    // Escolhemos 12 frequências distribuídas nas oitavas 3, 4 e 5
    const subset = this.scaleFrequencies.filter(f => f.oct >= 3 && f.oct <= 5).slice(0, 12);

    subset.forEach(noteData => {
      const filter = this.audioCtx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = noteData.freq;
      filter.Q.value = 32.0; // Q alto para produzir ressonância quase senoidal e musical

      const gain = this.audioCtx.createGain();
      gain.gain.value = 0.35;

      this.resonatorMasterGain.connect(filter);
      filter.connect(gain);
      gain.connect(this.reverbNode);
      gain.connect(this.compressor);

      this.resonators.push({ filter, gain, noteData });
    });
  }

  /**
   * Reafina os ressonadores existentes para a nova escala/tom
   */
  retuneResonators() {
    const subset = this.scaleFrequencies.filter(f => f.oct >= 3 && f.oct <= 5).slice(0, 12);
    const now = this.audioCtx ? this.audioCtx.currentTime : 0;

    subset.forEach((noteData, idx) => {
      if (this.resonators[idx]) {
        this.resonators[idx].filter.frequency.setTargetAtTime(noteData.freq, now, 0.1);
        this.resonators[idx].noteData = noteData;
      }
    });
  }

  /**
   * Dispara um Sino Zen / Taça Tibetana sintetizado suavemente
   * baseado nas características do som ambiente detectado.
   */
  playTranquilBell(targetFreq, velocity = 0.5, noteName = '') {
    if (!this.audioCtx || !this.isRunning) return;

    const now = this.audioCtx.currentTime;
    const dur = 3.5 + Math.random() * 2.5; // Decaimento longo e meditativo

    // Oscilador Carregador (Carrier) - Tom principal
    const carrier = this.audioCtx.createOscillator();
    carrier.type = 'sine';
    carrier.frequency.setValueAtTime(targetFreq, now);

    // Oscilador Modulador (FM) - Traz a riqueza de taça de cristal/metal tibetano
    const modulator = this.audioCtx.createOscillator();
    modulator.type = 'sine';

    // Relações harmônicas de sinos e taças tibetanas (ex: 2.756 ou 1.414)
    const ratio = this.activePreset === 'zen' ? 2.76 : (this.activePreset === 'celestial' ? 2.0 : 1.5);
    modulator.frequency.setValueAtTime(targetFreq * ratio, now);

    const modGain = this.audioCtx.createGain();
    const modDepth = targetFreq * 0.45 * velocity;
    modGain.gain.setValueAtTime(modDepth, now);
    modGain.gain.exponentialRampToValueAtTime(0.001, now + dur * 0.7);

    modulator.connect(modGain);
    modGain.connect(carrier.frequency);

    // Envelope de Amplitude com ataque suave (evita estalo)
    const voiceGain = this.audioCtx.createGain();
    const peakVol = Math.min(0.28, velocity * 0.28);
    voiceGain.gain.setValueAtTime(0.0001, now);
    voiceGain.gain.linearRampToValueAtTime(peakVol, now + 0.045); // 45ms attack
    voiceGain.gain.exponentialRampToValueAtTime(0.0001, now + dur);

    // Panning Estéreo aleatório
    const panner = this.audioCtx.createStereoPanner ? this.audioCtx.createStereoPanner() : null;
    if (panner) {
      panner.pan.setValueAtTime((Math.random() * 2 - 1) * 0.7, now);
    }

    // Filtro suave para cortar quaisquer arestas
    const bellFilter = this.audioCtx.createBiquadFilter();
    bellFilter.type = 'lowpass';
    bellFilter.frequency.setValueAtTime(Math.min(4200, targetFreq * 4.5), now);
    bellFilter.frequency.exponentialRampToValueAtTime(400, now + dur);

    // Conexões
    carrier.connect(bellFilter);
    bellFilter.connect(voiceGain);

    if (panner) {
      voiceGain.connect(panner);
      panner.connect(this.bellsGain);
    } else {
      voiceGain.connect(this.bellsGain);
    }

    modulator.start(now);
    carrier.start(now);

    modulator.stop(now + dur + 0.1);
    carrier.stop(now + dur + 0.1);

    // Notificar UI e Visualizador
    if (this.onNoteTriggered) {
      this.onNoteTriggered(noteName, targetFreq, velocity);
    }
  }

  /**
   * Motor de Drone e Colchão Harmônico Contínuo
   * Mantém um fluxo calmo de fundo que respira com a dinâmica da sala
   */
  startAmbientDroneEngine() {
    this.stopAmbientDroneEngine();

    // Notas de fundo baseadas na fundamental e quinta da escala
    const rootSemitone = SerenoAudioEngine.NOTE_SEMITONES[this.currentKey] ?? 0;
    const baseMidi1 = 36 + rootSemitone; // Oitava 2 (ex: C2 = 65.4 Hz)
    const baseMidi2 = baseMidi1 + 7;      // Quinta perfeita (G2)
    const baseMidi3 = baseMidi1 + 14;     // Nona / Segunda na oitava acima

    const droneFreqs = [
      this.midiToFreq(baseMidi1),
      this.midiToFreq(baseMidi2),
      this.midiToFreq(baseMidi3)
    ];

    droneFreqs.forEach((freq, idx) => {
      const osc1 = this.audioCtx.createOscillator();
      const osc2 = this.audioCtx.createOscillator();
      osc1.type = 'triangle';
      osc2.type = 'sine';

      // Leve desafinação analógica para movimento orgânico
      osc1.frequency.value = freq;
      osc2.frequency.value = freq * 1.002;

      const filter = this.audioCtx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 280 + idx * 80;
      filter.Q.value = 1.2;

      const gain = this.audioCtx.createGain();
      gain.gain.value = 0.08 / (idx + 1);

      // LFO para respiração sutil do filtro do drone
      const lfo = this.audioCtx.createOscillator();
      lfo.frequency.value = 0.08 + idx * 0.03; // ~12 segundos por ciclo
      const lfoGain = this.audioCtx.createGain();
      lfoGain.gain.value = 60;
      lfo.connect(lfoGain);
      lfoGain.connect(filter.frequency);

      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(gain);
      gain.connect(this.droneGain);

      const now = this.audioCtx.currentTime;
      osc1.start(now);
      osc2.start(now);
      lfo.start(now);

      this.droneVoices.push({ osc1, osc2, lfo, gain, filter });
    });
  }

  stopAmbientDroneEngine() {
    this.droneVoices.forEach(v => {
      try {
        v.osc1.stop();
        v.osc2.stop();
        v.lfo.stop();
        v.gain.disconnect();
      } catch (e) {}
    });
    this.droneVoices = [];
  }

  /**
   * Mapeia qualquer frequência detectada no mundo real para a nota
   * mais próxima e mais consonante na escala harmônica escolhida.
   */
  quantizeToScale(rawFreq) {
    if (!rawFreq || rawFreq < 60 || rawFreq > 5000) {
      // Se não for detectada uma frequência clara, escolher uma nota mágica da escala
      const pool = this.scaleFrequencies.filter(f => f.oct >= 3 && f.oct <= 5);
      return pool[Math.floor(Math.random() * pool.length)];
    }

    let closest = this.scaleFrequencies[0];
    let minDiff = Math.abs(rawFreq - closest.freq);

    for (let i = 1; i < this.scaleFrequencies.length; i++) {
      const diff = Math.abs(rawFreq - this.scaleFrequencies[i].freq);
      if (diff < minDiff) {
        minDiff = diff;
        closest = this.scaleFrequencies[i];
      }
    }

    return closest;
  }

  /**
   * Detector de Tom (Pitch Detection) por Autocorrelação
   */
  autoCorrelate(buf, sampleRate) {
    const SIZE = buf.length;
    let rms = 0;

    for (let i = 0; i < SIZE; i++) {
      const val = buf[i];
      rms += val * val;
    }
    rms = Math.sqrt(rms / SIZE);

    if (rms < 0.015) return -1; // Silêncio

    let r1 = 0, r2 = SIZE - 1, thres = 0.2;
    for (let i = 0; i < SIZE / 2; i++) {
      if (Math.abs(buf[i]) < thres) { r1 = i; break; }
    }
    for (let i = 1; i < SIZE / 2; i++) {
      if (Math.abs(buf[SIZE - i]) < thres) { r2 = SIZE - i; break; }
    }

    const trimmed = buf.slice(r1, r2);
    const c = new Float32Array(trimmed.length);

    for (let i = 0; i < trimmed.length; i++) {
      for (let j = 0; j < trimmed.length - i; j++) {
        c[i] = c[i] + trimmed[j] * trimmed[j + i];
      }
    }

    let d = 0;
    while (c[d] > c[d + 1]) d++;
    let maxval = -1, maxpos = -1;
    for (let i = d; i < trimmed.length; i++) {
      if (c[i] > maxval) {
        maxval = c[i];
        maxpos = i;
      }
    }

    let T0 = maxpos;
    if (T0 === -1) return -1;

    return sampleRate / T0;
  }

  /**
   * Calcula o Centroide Espectral (brilho do som ambiente)
   */
  computeSpectralCentroid() {
    let sum = 0;
    let weightedSum = 0;
    const nyquist = this.audioCtx.sampleRate / 2;
    const binCount = this.freqData.length;

    for (let i = 0; i < binCount; i++) {
      const magnitude = this.freqData[i];
      const freq = (i / binCount) * nyquist;
      sum += magnitude;
      weightedSum += magnitude * freq;
    }

    return sum > 0 ? (weightedSum / sum) : 440;
  }

  /**
   * Loop contínuo de escuta, detecção de eventos e transmutação
   */
  startAnalysisLoop() {
    const loop = () => {
      if (!this.isRunning || !this.analyser) return;

      this.analyser.getFloatTimeDomainData(this.timeData);
      this.analyser.getByteFrequencyData(this.freqData);

      // Calcular RMS (energia)
      let sumSquares = 0;
      for (let i = 0; i < this.timeData.length; i++) {
        sumSquares += this.timeData[i] * this.timeData[i];
      }
      const rms = Math.sqrt(sumSquares / this.timeData.length);
      const db = 20 * Math.log10(Math.max(rms, 1e-4));

      // Suavização da energia (envelope follower)
      this.smoothedEnergy = this.smoothedEnergy * 0.88 + rms * 0.12;

      // Calcular centroide e pitch
      const centroid = this.computeSpectralCentroid();
      const detectedPitch = this.autoCorrelate(this.timeData, this.audioCtx.sampleRate);

      // Callback de energia para UI
      if (this.onEnergyUpdate) {
        this.onEnergyUpdate(rms, db, centroid);
      }

      // Detecção de Transientes e Acionamento Musical
      // Ajuste de limiar pela sensibilidade do usuário
      const threshold = 0.012 + (1.0 - this.sensitivity) * 0.06;
      const energyDelta = rms - this.lastRMS;
      const now = performance.now();

      // Intervalo adaptativo pela densidade
      const minInterval = (1.1 - this.density) * 600 + 150;

      if ((energyDelta > threshold * 0.5 || rms > threshold) && (now - this.lastTriggerTime > minInterval)) {
        this.lastTriggerTime = now;

        // Frequência alvo
        let targetFreq = detectedPitch > 80 && detectedPitch < 3000 ? detectedPitch : centroid;
        const matchedNote = this.quantizeToScale(targetFreq);

        // Velocidade baseada na força do som ambiente
        const velocity = Math.min(1.0, Math.max(0.25, (rms / (threshold * 3))));

        this.playTranquilBell(matchedNote.freq, velocity, matchedNote.noteName);

        // Em sons mais marcantes, gerar uma pequena arpeggiação harmônica secundária (efeito gota de água)
        if (velocity > 0.6 && Math.random() > 0.4) {
          setTimeout(() => {
            if (this.isRunning) {
              const secondary = this.quantizeToScale(matchedNote.freq * 1.5);
              this.playTranquilBell(secondary.freq, velocity * 0.6, secondary.noteName);
            }
          }, 180 + Math.random() * 120);
        }
      }

      this.lastRMS = rms;
      requestAnimationFrame(loop);
    };

    requestAnimationFrame(loop);
  }

  /**
   * Gravação de Sessão de Áudio
   */
  startRecording() {
    if (!this.recorderDest || !this.isRunning) return false;

    this.recordedChunks = [];
    const mimeTypes = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus'];
    let selectedMime = mimeTypes.find(m => MediaRecorder.isTypeSupported(m)) || '';

    try {
      this.mediaRecorder = new MediaRecorder(this.recorderDest.stream, {
        mimeType: selectedMime
      });
    } catch (e) {
      this.mediaRecorder = new MediaRecorder(this.recorderDest.stream);
    }

    this.mediaRecorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) {
        this.recordedChunks.push(e.data);
      }
    };

    this.mediaRecorder.start(250);
    return true;
  }

  stopRecording() {
    return new Promise((resolve) => {
      if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') {
        resolve(null);
        return;
      }

      this.mediaRecorder.onstop = () => {
        const blob = new Blob(this.recordedChunks, { type: this.mediaRecorder.mimeType || 'audio/webm' });
        const url = URL.createObjectURL(blob);
        resolve({ blob, url });
      };

      this.mediaRecorder.stop();
    });
  }

  /**
   * Ajuste dos Controles da UI
   */
  setSensitivity(val) {
    this.sensitivity = Math.max(0.05, Math.min(1.0, val / 100));
  }

  setDensity(val) {
    this.density = Math.max(0.1, Math.min(1.0, val / 100));
  }

  setKey(key) {
    this.currentKey = key;
    this.updateScaleFrequencies();
    this.startAmbientDroneEngine();
  }

  setScale(scaleName) {
    if (SerenoAudioEngine.SCALES[scaleName]) {
      this.currentScale = scaleName;
      this.updateScaleFrequencies();
      this.startAmbientDroneEngine();
    }
  }

  setBellsVolume(val) {
    this.bellsVolume = val;
    if (this.bellsGain) {
      this.bellsGain.gain.setTargetAtTime((val / 100) * 0.9, this.audioCtx.currentTime, 0.05);
    }
  }

  setDroneVolume(val) {
    this.droneVolume = val;
    if (this.droneGain) {
      this.droneGain.gain.setTargetAtTime((val / 100) * 0.8, this.audioCtx.currentTime, 0.05);
    }
  }

  setResonanceVolume(val) {
    this.resonanceVolume = val;
    if (this.resonatorMasterGain) {
      this.resonatorMasterGain.gain.setTargetAtTime((val / 100) * 1.0, this.audioCtx.currentTime, 0.05);
    }
  }

  setReverbVolume(val) {
    this.reverbVolume = val;
    if (this.reverbGain) {
      this.reverbGain.gain.setTargetAtTime((val / 100) * 1.0, this.audioCtx.currentTime, 0.05);
    }
  }

  setMicBleedVolume(val) {
    this.micBleedVolume = val;
    if (this.micBleedGain) {
      this.micBleedGain.gain.setTargetAtTime((val / 100) * 0.4, this.audioCtx.currentTime, 0.05);
    }
  }

  applyPreset(presetName) {
    this.activePreset = presetName;

    switch (presetName) {
      case 'zen':
        this.setKey('C');
        this.setScale('hirajoshi');
        this.setBellsVolume(80);
        this.setDroneVolume(55);
        this.setResonanceVolume(85);
        this.setReverbVolume(85);
        break;

      case 'celestial':
        this.setKey('F');
        this.setScale('lydian');
        this.setBellsVolume(75);
        this.setDroneVolume(70);
        this.setResonanceVolume(75);
        this.setReverbVolume(95);
        break;

      case 'aurora':
        this.setKey('D');
        this.setScale('pentatonicMajor');
        this.setBellsVolume(70);
        this.setDroneVolume(75);
        this.setResonanceVolume(70);
        this.setReverbVolume(80);
        break;

      case 'ocean':
        this.setKey('A');
        this.setScale('dorian');
        this.setBellsVolume(85);
        this.setDroneVolume(65);
        this.setResonanceVolume(90);
        this.setReverbVolume(90);
        break;
    }
  }

  /**
   * =========================================================================
   * Métodos de Reprodução de Faixas da Playlist (Estilo Spotify)
   * =========================================================================
   */
  async playTrack(track, audioBlob = null) {
    await this.ensureAudioGraph();
    this.stopPlayback();

    // Configurar preset, tom e escala da faixa
    if (track.preset) this.applyPreset(track.preset);
    if (track.key) this.setKey(track.key);
    if (track.scale) this.setScale(track.scale);

    // Calcular duração em segundos
    const durParts = (track.duration || '04:00').split(':');
    this.trackDurationSec = (parseInt(durParts[0], 10) || 4) * 60 + (parseInt(durParts[1], 10) || 0);
    this.trackCurrentTimeSec = 0;

    if (audioBlob) {
      // Reproduzir áudio gravado real via HTML5 Audio + Web Audio
      this.playbackMode = 'track';
      const audioUrl = URL.createObjectURL(audioBlob);
      this.currentAudioElement = new Audio(audioUrl);
      this.currentAudioElement.crossOrigin = 'anonymous';

      try {
        const source = this.audioCtx.createMediaElementSource(this.currentAudioElement);
        source.connect(this.compressor);
        source.connect(this.reverbNode);
      } catch (e) {
        console.warn('Audio element source direct connect:', e);
      }

      this.currentAudioElement.ontimeupdate = () => {
        this.trackCurrentTimeSec = this.currentAudioElement.currentTime;
        if (this.onTrackProgress) {
          this.onTrackProgress(this.trackCurrentTimeSec, this.currentAudioElement.duration || this.trackDurationSec);
        }
      };

      this.currentAudioElement.onended = () => {
        if (this.onTrackEnded) this.onTrackEnded();
      };

      await this.currentAudioElement.play();
    } else {
      // Modo Generativo: Executa a paisagem sonora relaxante com o motor de síntese
      this.playbackMode = 'generative';
      this.startAmbientDroneEngine();
      this.startGenerativeMelody();

      // Timer de progresso
      if (this.trackTimerInterval) clearInterval(this.trackTimerInterval);
      this.trackTimerInterval = setInterval(() => {
        this.trackCurrentTimeSec += 1;
        if (this.onTrackProgress) {
          this.onTrackProgress(this.trackCurrentTimeSec, this.trackDurationSec);
        }
        if (this.trackCurrentTimeSec >= this.trackDurationSec) {
          clearInterval(this.trackTimerInterval);
          if (this.onTrackEnded) this.onTrackEnded();
        }
      }, 1000);
    }
  }

  startGenerativeMelody() {
    if (this.generativeTimerId) clearTimeout(this.generativeTimerId);

    const triggerNext = () => {
      if (this.playbackMode !== 'generative') return;

      const pool = this.scaleFrequencies.filter(f => f.oct >= 3 && f.oct <= 5);
      if (pool.length > 0) {
        const note = pool[Math.floor(Math.random() * pool.length)];
        const vel = 0.35 + Math.random() * 0.45;
        this.playTranquilBell(note.freq, vel, note.noteName);

        // Ocasional gota/arpeggio de cristal
        if (Math.random() > 0.45) {
          setTimeout(() => {
            const note2 = pool[Math.floor(Math.random() * pool.length)];
            this.playTranquilBell(note2.freq, vel * 0.65, note2.noteName);
          }, 240 + Math.random() * 200);
        }
      }

      const nextDelay = 1800 + Math.random() * 2600;
      this.generativeTimerId = setTimeout(triggerNext, nextDelay);
    };

    this.generativeTimerId = setTimeout(triggerNext, 1200);
  }

  stopPlayback() {
    if (this.currentAudioElement) {
      try {
        this.currentAudioElement.pause();
        this.currentAudioElement = null;
      } catch (e) {}
    }
    if (this.generativeTimerId) {
      clearTimeout(this.generativeTimerId);
      this.generativeTimerId = null;
    }
    if (this.trackTimerInterval) {
      clearInterval(this.trackTimerInterval);
      this.trackTimerInterval = null;
    }
  }

  pauseTrack() {
    if (this.currentAudioElement) {
      this.currentAudioElement.pause();
    }
    if (this.generativeTimerId) {
      clearTimeout(this.generativeTimerId);
    }
    if (this.trackTimerInterval) {
      clearInterval(this.trackTimerInterval);
    }
  }

  resumeTrack() {
    if (this.currentAudioElement) {
      this.currentAudioElement.play();
    } else if (this.playbackMode === 'generative') {
      this.startGenerativeMelody();
      this.trackTimerInterval = setInterval(() => {
        this.trackCurrentTimeSec += 1;
        if (this.onTrackProgress) {
          this.onTrackProgress(this.trackCurrentTimeSec, this.trackDurationSec);
        }
        if (this.trackCurrentTimeSec >= this.trackDurationSec) {
          clearInterval(this.trackTimerInterval);
          if (this.onTrackEnded) this.onTrackEnded();
        }
      }, 1000);
    }
  }

  seekTrack(seconds) {
    this.trackCurrentTimeSec = seconds;
    if (this.currentAudioElement) {
      this.currentAudioElement.currentTime = seconds;
    }
    if (this.onTrackProgress) {
      this.onTrackProgress(this.trackCurrentTimeSec, this.trackDurationSec);
    }
  }

  /**
   * =========================================================================
   * TRANSMUTAÇÃO DE ÁUDIO GRAVADO (OfflineAudioContext & Processamento Espectral)
   * Transforma áudio ambiente gravado/barulhento em música calma e suave
   * =========================================================================
   */

  /**
   * Converte um AudioBuffer em um Blob WAV padrão (16-bit PCM)
   */
  audioBufferToWav(buffer) {
    const numChannels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const format = 1; // PCM
    const bitDepth = 16;
    const bytesPerSample = bitDepth / 8;
    const blockAlign = numChannels * bytesPerSample;
    const dataSize = buffer.length * blockAlign;
    const headerSize = 44;
    const totalSize = headerSize + dataSize;
    const arrayBuffer = new ArrayBuffer(totalSize);
    const dataView = new DataView(arrayBuffer);

    const writeString = (view, offset, str) => {
      for (let i = 0; i < str.length; i++) {
        view.setUint8(offset + i, str.charCodeAt(i));
      }
    };

    // RIFF chunk
    writeString(dataView, 0, 'RIFF');
    dataView.setUint32(4, 36 + dataSize, true);
    writeString(dataView, 8, 'WAVE');
    // fmt chunk
    writeString(dataView, 12, 'fmt ');
    dataView.setUint32(16, 16, true);
    dataView.setUint16(20, format, true);
    dataView.setUint16(22, numChannels, true);
    dataView.setUint32(24, sampleRate, true);
    dataView.setUint32(28, sampleRate * blockAlign, true);
    dataView.setUint16(32, blockAlign, true);
    dataView.setUint16(34, bitDepth, true);
    // data chunk
    writeString(dataView, 36, 'data');
    dataView.setUint32(40, dataSize, true);

    // PCM samples
    let offset = 44;
    const channels = [];
    for (let c = 0; c < numChannels; c++) {
      channels.push(buffer.getChannelData(c));
    }

    for (let i = 0; i < buffer.length; i++) {
      for (let c = 0; c < numChannels; c++) {
        let sample = Math.max(-1, Math.min(1, channels[c][i]));
        let int16 = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
        dataView.setInt16(offset, int16, true);
        offset += 2;
      }
    }

    return new Blob([dataView], { type: 'audio/wav' });
  }

  /**
   * Gera um buffer de áudio sintético simulando ruídos do cotidiano
   * (para testes rápidos sem precisar gravar)
   */
  generateSyntheticNoisySample(type = 'office', durationSec = 8) {
    const sampleRate = this.audioCtx ? this.audioCtx.sampleRate : 44100;
    const length = Math.floor(sampleRate * durationSec);
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    const ctx = this.audioCtx || new AudioContextClass();
    const buffer = ctx.createBuffer(2, length, sampleRate);
    const left = buffer.getChannelData(0);
    const right = buffer.getChannelData(1);

    // 1. Ruído contínuo de ar / ventilação (ruído rosa / marrom filtrado)
    let b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99 * b0 + white * 0.05;
      b1 = 0.95 * b1 + white * 0.08;
      b2 = 0.90 * b2 + white * 0.12;
      const pink = (b0 + b1 + b2) * 0.18;
      left[i] = pink;
      right[i] = pink * 0.95 + (Math.random() - 0.5) * 0.02;
    }

    // 2. Adicionar impactos e ruídos específicos conforme o tipo
    if (type === 'office') {
      // Teclado, cliques de mouse e xícara pousando
      const clickTimes = [0.6, 0.9, 1.4, 1.8, 2.3, 2.7, 3.2, 4.0, 4.5, 5.1, 5.8, 6.4, 7.1];
      clickTimes.forEach(t => {
        const startSample = Math.floor(t * sampleRate);
        const clickLen = Math.floor(sampleRate * 0.08);
        const clickFreq = 1200 + Math.random() * 2000;
        for (let i = 0; i < clickLen && (startSample + i) < length; i++) {
          const env = Math.exp(-i / (sampleRate * 0.015));
          const wave = Math.sin(i * (clickFreq * 2 * Math.PI / sampleRate)) * env * 0.45;
          const noiseBurst = (Math.random() * 2 - 1) * env * 0.35;
          left[startSample + i] += wave + noiseBurst;
          right[startSample + i] += wave * 0.85 + noiseBurst;
        }
      });
    } else if (type === 'street') {
      // Ronco de motor e passagem de carro
      for (let i = 0; i < length; i++) {
        const t = i / sampleRate;
        const carPass = Math.sin((t / durationSec) * Math.PI) * 0.35;
        const engineHum = Math.sin(t * 2 * Math.PI * 65) * 0.25 * carPass;
        left[i] += engineHum;
        right[i] += engineHum * 1.05;
      }
    } else {
      // Café / Pessoas falando
      for (let i = 0; i < length; i++) {
        const t = i / sampleRate;
        const murmur = (Math.sin(t * 2 * Math.PI * 220) + Math.sin(t * 2 * Math.PI * 340)) * 0.08 * (Math.random() * 0.5 + 0.5);
        left[i] += murmur;
        right[i] += murmur;
      }
    }

    return buffer;
  }

  /**
   * Converte um arquivo de áudio enviado pelo usuário em AudioBuffer
   */
  async decodeAudioFile(file) {
    await this.ensureAudioGraph();
    const arrayBuffer = await file.arrayBuffer();
    return await this.audioCtx.decodeAudioData(arrayBuffer);
  }

  /**
   * Transmuta o buffer de áudio barulhento em música relaxante e suave!
   */
  async transmuteAudioBuffer(rawAudioBuffer, presetName = 'zen', onProgress = null) {
    const sampleRate = rawAudioBuffer.sampleRate;
    const duration = rawAudioBuffer.duration;
    // Duração total com cauda de reverberação suave (+ 3.8s)
    const tailSec = 3.8;
    const totalDurationSec = duration + tailSec;
    const totalLength = Math.floor(sampleRate * totalDurationSec);

    if (onProgress) onProgress(15, 'Analisando espectro acústico e ruídos...');

    // Obter dados do preset e escala
    const presetConfig = {
      zen: { key: 'C', scale: 'hirajoshi', ratio: 2.76, name: 'Jardim Zen' },
      celestial: { key: 'F', scale: 'lydian', ratio: 2.0, name: 'Nuvem Celeste' },
      aurora: { key: 'D', scale: 'pentatonicMajor', ratio: 1.5, name: 'Aurora Boreal' },
      ocean: { key: 'A', scale: 'dorian', ratio: 1.414, name: 'Oceano Profundo' },
      crystal: { key: 'G', scale: 'ambientChords', ratio: 3.14, name: 'Chuva de Cristal' }
    }[presetName] || { key: 'C', scale: 'hirajoshi', ratio: 2.76, name: 'Jardim Zen' };

    // Frequências da escala para este preset
    const rootSemitone = SerenoAudioEngine.NOTE_SEMITONES[presetConfig.key] ?? 0;
    const scaleDef = SerenoAudioEngine.SCALES[presetConfig.scale] || SerenoAudioEngine.SCALES.hirajoshi;
    const intervals = scaleDef.intervals;
    const scaleNotes = [];

    for (let oct = 3; oct <= 5; oct++) {
      for (let i = 0; i < intervals.length; i++) {
        const midi = (oct + 1) * 12 + rootSemitone + intervals[i];
        const freq = this.midiToFreq(midi);
        const noteName = `${SerenoAudioEngine.NOTE_NAMES[(rootSemitone + intervals[i]) % 12]}${oct}`;
        scaleNotes.push({ freq, midi, noteName, oct });
      }
    }

    if (onProgress) onProgress(35, 'Detectando impactos, cliques e transientes...');

    // 1. Analisar transientes e energia no buffer original
    const channelData = rawAudioBuffer.getChannelData(0);
    const windowSize = Math.floor(sampleRate * 0.035); // janelas de ~35ms
    const numWindows = Math.floor(channelData.length / windowSize);
    const energies = new Float32Array(numWindows);

    let maxEnergy = 0;
    for (let w = 0; w < numWindows; w++) {
      let sum = 0;
      const start = w * windowSize;
      for (let i = 0; i < windowSize; i++) {
        const val = channelData[start + i];
        sum += val * val;
      }
      const rms = Math.sqrt(sum / windowSize);
      energies[w] = rms;
      if (rms > maxEnergy) maxEnergy = rms;
    }

    // Identificar picos / transientes de ruído (onde ocorrem impactos na sala)
    const detectedEvents = [];
    const threshold = Math.max(0.012, maxEnergy * 0.22);
    let lastEventTime = -1;

    for (let w = 1; w < numWindows - 1; w++) {
      const time = (w * windowSize) / sampleRate;
      const prev = energies[w - 1];
      const curr = energies[w];
      const next = energies[w + 1];

      if (curr > threshold && curr > prev && curr > next) {
        if (time - lastEventTime > 0.28) { // Mínimo de 280ms entre notas principais
          const velocity = Math.min(1.0, Math.max(0.25, curr / Math.max(0.001, maxEnergy)));
          detectedEvents.push({ time, velocity });
          lastEventTime = time;
        }
      }
    }

    // Se o áudio for muito silencioso ou contínuo, espalhar notas generativas relaxantes
    if (detectedEvents.length < 3) {
      const step = duration / Math.max(4, Math.floor(duration / 1.8));
      for (let t = 0.5; t < duration; t += step) {
        detectedEvents.push({ time: t, velocity: 0.45 });
      }
    }

    if (onProgress) onProgress(60, 'Sintetizando ressonância harmônica e taças suaves...');

    // 2. Renderização em OfflineAudioContext
    const offlineCtx = new OfflineAudioContext(2, totalLength, sampleRate);

    // Reverb Convolucional de Catedral
    const reverb = offlineCtx.createConvolver();
    reverb.buffer = this.generateImpulseResponse(4.2, 2.0);
    const reverbGain = offlineCtx.createGain();
    reverbGain.gain.value = 0.85;

    // Master Compressor / Limiter
    const masterCompressor = offlineCtx.createDynamicsCompressor();
    masterCompressor.threshold.value = -18;
    masterCompressor.knee.value = 14;
    masterCompressor.ratio.value = 8;
    masterCompressor.attack.value = 0.005;
    masterCompressor.release.value = 0.25;

    const masterGain = offlineCtx.createGain();
    masterGain.gain.value = 0.9;

    reverb.connect(reverbGain);
    reverbGain.connect(masterCompressor);
    masterCompressor.connect(masterGain);
    masterGain.connect(offlineCtx.destination);

    // CAMADA 1: FILTRO RESSONADOR ACÚSTICO NO ÁUDIO ORIGINAL
    // Converte o ruído bruto do usuário em harmônicos afinados como uma taça de cristal!
    const rawSource = offlineCtx.createBufferSource();
    rawSource.buffer = rawAudioBuffer;

    const resonatorGain = offlineCtx.createGain();
    resonatorGain.gain.value = 0.75;

    // Banco de filtros passa-banda de alto Q
    const resSubset = scaleNotes.slice(0, 8);
    resSubset.forEach(noteData => {
      const bp = offlineCtx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = noteData.freq;
      bp.Q.value = 35.0; // Q alto afina qualquer ruído em tom musical puro

      const noteGain = offlineCtx.createGain();
      noteGain.gain.value = 0.35;

      rawSource.connect(bp);
      bp.connect(noteGain);
      noteGain.connect(resonatorGain);
    });

    resonatorGain.connect(reverb);
    resonatorGain.connect(masterCompressor);

    // CAMADA 2: COLCHÃO SONORO (DRONE PAD ACONCHEGANTE)
    // Triângulo e seno nas notas fundamentais e quintas
    const rootFreq = scaleNotes[0].freq * 0.5; // Oitava grave
    const fifthFreq = rootFreq * 1.5;

    [rootFreq, fifthFreq].forEach((freq, idx) => {
      const droneOsc = offlineCtx.createOscillator();
      droneOsc.type = idx === 0 ? 'triangle' : 'sine';
      droneOsc.frequency.value = freq;

      const droneFilter = offlineCtx.createBiquadFilter();
      droneFilter.type = 'lowpass';
      droneFilter.frequency.value = 240 + idx * 60;

      const droneGain = offlineCtx.createGain();
      droneGain.gain.setValueAtTime(0.0001, 0);
      droneGain.gain.linearRampToValueAtTime(0.12 / (idx + 1), 1.2);
      droneGain.gain.setValueAtTime(0.12 / (idx + 1), duration);
      droneGain.gain.exponentialRampToValueAtTime(0.0001, totalDurationSec);

      droneOsc.connect(droneFilter);
      droneFilter.connect(droneGain);
      droneGain.connect(reverb);
      droneGain.connect(masterCompressor);

      droneOsc.start(0);
      droneOsc.stop(totalDurationSec);
    });

    // CAMADA 3: SINOS CELESTIAIS & HARPAS SUAVES DISPARADOS PELOS RUÍDOS
    detectedEvents.forEach((ev, idx) => {
      const note = scaleNotes[idx % scaleNotes.length];
      const t = ev.time;
      const vel = ev.velocity;
      const bellDur = 3.2;

      // Carregador (Carrier)
      const carrier = offlineCtx.createOscillator();
      carrier.type = 'sine';
      carrier.frequency.setValueAtTime(note.freq, t);

      // Modulador FM para brilho translúcido
      const mod = offlineCtx.createOscillator();
      mod.type = 'sine';
      mod.frequency.setValueAtTime(note.freq * presetConfig.ratio, t);

      const modGain = offlineCtx.createGain();
      modGain.gain.setValueAtTime(note.freq * 0.35 * vel, t);
      modGain.gain.exponentialRampToValueAtTime(0.001, t + bellDur * 0.6);

      mod.connect(modGain);
      modGain.connect(carrier.frequency);

      // Envelope de Volume Suave (sem clique)
      const voiceGain = offlineCtx.createGain();
      const peakVol = Math.min(0.24, vel * 0.24);
      voiceGain.gain.setValueAtTime(0.0001, t);
      voiceGain.gain.linearRampToValueAtTime(peakVol, t + 0.04);
      voiceGain.gain.exponentialRampToValueAtTime(0.0001, t + bellDur);

      // Filtro de corte
      const voiceFilter = offlineCtx.createBiquadFilter();
      voiceFilter.type = 'lowpass';
      voiceFilter.frequency.setValueAtTime(Math.min(3600, note.freq * 4), t);
      voiceFilter.frequency.exponentialRampToValueAtTime(450, t + bellDur);

      carrier.connect(voiceFilter);
      voiceFilter.connect(voiceGain);
      voiceGain.connect(reverb);
      voiceGain.connect(masterCompressor);

      mod.start(t);
      carrier.start(t);
      mod.stop(t + bellDur + 0.05);
      carrier.stop(t + bellDur + 0.05);
    });

    rawSource.start(0);
    rawSource.stop(duration);

    if (onProgress) onProgress(85, 'Renderizando masterização em alta definição...');

    // 3. Executar a renderização offline (muito rápido, em fração de segundo)
    const renderedBuffer = await offlineCtx.startRendering();

    if (onProgress) onProgress(100, 'Transformação concluída!');

    // Gerar blobs WAV de ambos para comparação
    const originalWavBlob = this.audioBufferToWav(rawAudioBuffer);
    const transformedWavBlob = this.audioBufferToWav(renderedBuffer);

    const originalUrl = URL.createObjectURL(originalWavBlob);
    const transformedUrl = URL.createObjectURL(transformedWavBlob);

    const durMins = Math.floor(renderedBuffer.duration / 60);
    const durSecs = String(Math.floor(renderedBuffer.duration % 60)).padStart(2, '0');

    return {
      originalBuffer: rawAudioBuffer,
      transformedBuffer: renderedBuffer,
      originalWavBlob,
      transformedWavBlob,
      originalUrl,
      transformedUrl,
      duration: renderedBuffer.duration,
      durationFormatted: `${durMins}:${durSecs}`,
      eventsCount: detectedEvents.length,
      preset: presetName,
      presetName: presetConfig.name
    };
  }

  stop() {
    this.isRunning = false;
    this.stopAmbientDroneEngine();

    if (this.micStream) {
      this.micStream.getTracks().forEach(t => t.stop());
    }

    if (this.audioCtx && this.audioCtx.state !== 'closed') {
      this.audioCtx.close();
    }
  }
}

window.SerenoAudioEngine = SerenoAudioEngine;
