/**
 * Sereno • Controlador Principal da Aplicação
 * Integra o Estúdio de Transformação Acústica (Gravar -> Escolher Tema -> Transformar)
 * com o ecossistema de Playlists, Streaming e Compartilhamento Estilo Spotify.
 */

document.addEventListener('DOMContentLoaded', async () => {
  // Instanciar Motores
  const audioEngine = new SerenoAudioEngine();
  const playlistManager = new SerenoPlaylistManager();

  // Visualizador
  const canvas = document.getElementById('visualizer-canvas');
  const visualizer = new SerenoVisualizer(canvas, audioEngine);

  // Player auxiliar para preview de áudio bruto
  const auxPlayer = document.getElementById('aux-preview-player');

  // Estado do Estúdio de Transformação
  let rawCapturedBuffer = null;
  let rawCapturedBlob = null;
  let rawAudioUrl = null;
  let rawCapturedName = 'Som Ambiente Gravado';
  let selectedTheme = 'zen';
  let lastTransmutationResult = null;

  // Estado de Gravação do Estúdio
  let studioRecorder = null;
  let studioRecordChunks = [];
  let studioRecordTimer = null;
  let studioRecordStart = 0;

  // =========================================================================
  // Elementos do DOM - Navegação
  // =========================================================================
  const navBtnTransform = document.getElementById('nav-btn-transform');
  const navBtnLive = document.getElementById('nav-btn-live');
  const navBtnExplore = document.getElementById('nav-btn-explore');
  const navBtnLibrary = document.getElementById('nav-btn-library');
  const viewTransform = document.getElementById('view-transform');
  const viewLive = document.getElementById('view-live');
  const viewPlaylist = document.getElementById('view-playlist');
  const viewExplore = document.getElementById('view-explore');
  const currentViewTitle = document.getElementById('current-view-title');
  const sidebarPlaylistsList = document.getElementById('sidebar-playlists-list');

  // =========================================================================
  // Elementos do DOM - Estúdio de Transformação
  // =========================================================================
  const recordStateIdle = document.getElementById('record-state-idle');
  const recordStateRecording = document.getElementById('record-state-recording');
  const recordStateReady = document.getElementById('record-state-ready');

  const btnStartRecordStudio = document.getElementById('btn-start-record-studio');
  const btnStopRecordStudio = document.getElementById('btn-stop-record-studio');
  const recordingLiveTimer = document.getElementById('recording-live-timer');
  const readyAudioName = document.getElementById('ready-audio-name');
  const readyAudioDuration = document.getElementById('ready-audio-duration');
  const btnPlayPreviewOriginal = document.getElementById('btn-play-preview-original');
  const previewPlayIcon = document.getElementById('preview-play-icon');
  const previewPauseIcon = document.getElementById('preview-pause-icon');
  const btnReRecord = document.getElementById('btn-re-record');
  const inputAudioFile = document.getElementById('input-audio-file');

  const sampleButtons = document.querySelectorAll('.pill-sample-btn[data-sample]');
  const themeCards = document.querySelectorAll('.theme-card');
  const btnTransmuteAction = document.getElementById('btn-transmute-action');
  const transmuteBtnText = document.getElementById('transmute-btn-text');

  const transformingProgressBox = document.getElementById('transforming-progress-box');
  const transformProgressFill = document.getElementById('transform-progress-fill');
  const transformStatusText = document.getElementById('transform-status-text');

  const transformationResultCard = document.getElementById('transformation-result-card');
  const resOriginalTitle = document.getElementById('res-original-title');
  const resSereneTitle = document.getElementById('res-serene-title');
  const btnPlayResOriginal = document.getElementById('btn-play-res-original');
  const btnPlayResSerene = document.getElementById('btn-play-res-serene');
  const btnSaveToPlaylist = document.getElementById('btn-save-to-playlist');
  const btnShareResult = document.getElementById('btn-share-result');
  const btnDownloadWav = document.getElementById('btn-download-wav');

  // =========================================================================
  // Elementos do DOM - Player Spotify Inferior
  // =========================================================================
  const playerCover = document.getElementById('player-track-cover');
  const playerCoverEmoji = document.getElementById('player-cover-emoji');
  const playerTitle = document.getElementById('player-title');
  const playerArtist = document.getElementById('player-artist');
  const playerLikeBtn = document.getElementById('player-like-btn');
  const playerBtnToggle = document.getElementById('player-btn-toggle');
  const playerPlayIcon = document.getElementById('player-play-icon');
  const playerPauseIcon = document.getElementById('player-pause-icon');
  const playerBtnPrev = document.getElementById('player-btn-prev');
  const playerBtnNext = document.getElementById('player-btn-next');
  const playerBtnShuffle = document.getElementById('player-btn-shuffle');
  const playerBtnRepeat = document.getElementById('player-btn-repeat');
  const playerCurrentTime = document.getElementById('player-current-time');
  const playerTotalTime = document.getElementById('player-total-time');
  const playerProgressTrack = document.getElementById('player-progress-track');
  const playerProgressFill = document.getElementById('player-progress-fill');
  const playerVolumeSlider = document.getElementById('player-volume-slider');
  const btnPlayerStudioMode = document.getElementById('btn-player-studio-mode');

  // =========================================================================
  // Elementos do DOM - Playlist View & Modais
  // =========================================================================
  const playlistViewCover = document.getElementById('playlist-view-cover');
  const playlistCoverIcon = document.getElementById('playlist-cover-icon');
  const playlistViewTitle = document.getElementById('playlist-view-title');
  const playlistViewDesc = document.getElementById('playlist-view-desc');
  const playlistViewCount = document.getElementById('playlist-view-count');
  const playlistViewDuration = document.getElementById('playlist-view-duration');
  const playlistTracksBody = document.getElementById('playlist-tracks-body');
  const btnPlaylistPlayAll = document.getElementById('btn-playlist-play-all');
  const btnPlaylistShare = document.getElementById('btn-playlist-share');
  const btnPlaylistDelete = document.getElementById('btn-playlist-delete');

  const modalCreatePlaylist = document.getElementById('modal-create-playlist');
  const btnModalCreatePlaylist = document.getElementById('btn-modal-create-playlist');
  const inputPlaylistName = document.getElementById('input-playlist-name');
  const inputPlaylistDesc = document.getElementById('input-playlist-desc');
  const btnConfirmCreatePlaylist = document.getElementById('btn-confirm-create-playlist');

  const modalShare = document.getElementById('modal-share');
  const topbarShareBtn = document.getElementById('topbar-share-btn');
  const shareItemName = document.getElementById('share-item-name');
  const shareItemDesc = document.getElementById('share-item-desc');
  const shareLinkInput = document.getElementById('share-link-input');
  const btnCopyShareLink = document.getElementById('btn-copy-share-link');
  const btnNativeShare = document.getElementById('btn-native-share');
  const shareQrCanvas = document.getElementById('share-qr-canvas');

  const modalSaveTrack = document.getElementById('modal-save-track');
  const inputTrackTitle = document.getElementById('input-track-title');
  const selectTargetPlaylist = document.getElementById('select-target-playlist');
  const btnConfirmSaveTrack = document.getElementById('btn-confirm-save-track');

  const sharedBanner = document.getElementById('shared-banner');
  const sharedBannerText = document.getElementById('shared-banner-text');
  const btnImportShared = document.getElementById('btn-import-shared');
  const btnCloseShared = document.getElementById('btn-close-shared');
  const toastNotification = document.getElementById('toast-notification');
  const toastMessage = document.getElementById('toast-message');

  // =========================================================================
  // Helper Toast
  // =========================================================================
  function showToast(msg) {
    toastMessage.textContent = msg;
    toastNotification.classList.remove('hidden');
    setTimeout(() => {
      toastNotification.classList.add('hidden');
    }, 3200);
  }

  // =========================================================================
  // Alternância de Abas (Tabs)
  // =========================================================================
  function switchView(viewName) {
    [viewTransform, viewLive, viewPlaylist, viewExplore].forEach(v => v.classList.remove('active'));
    [navBtnTransform, navBtnLive, navBtnExplore, navBtnLibrary].forEach(b => b.classList.remove('active'));

    if (viewName === 'transform') {
      viewTransform.classList.add('active');
      navBtnTransform.classList.add('active');
      currentViewTitle.textContent = 'Estúdio • Gravar Som & Transformar em Música';
    } else if (viewName === 'live') {
      viewLive.classList.add('active');
      navBtnLive.classList.add('active');
      currentViewTitle.textContent = 'Ao Vivo • Transmutador Contínuo';
      visualizer.handleResize();
    } else if (viewName === 'explore') {
      viewExplore.classList.add('active');
      navBtnExplore.classList.add('active');
      currentViewTitle.textContent = 'Explorar Paisagens & Modos';
      renderExploreGrid();
    } else if (viewName === 'playlist') {
      viewPlaylist.classList.add('active');
      navBtnLibrary.classList.add('active');
      renderPlaylistView();
    }
  }

  navBtnTransform.addEventListener('click', () => switchView('transform'));
  navBtnLive.addEventListener('click', () => switchView('live'));
  navBtnExplore.addEventListener('click', () => switchView('explore'));
  navBtnLibrary.addEventListener('click', () => switchView('playlist'));
  btnPlayerStudioMode.addEventListener('click', () => switchView('transform'));

  // =========================================================================
  // PASSO 1: GRAVAÇÃO E CAPTAÇÃO DO SOM AMBIENTE NO ESTÚDIO
  // =========================================================================

  // Iniciar Gravação do Som Ambiente
  async function startStudioRecording() {
    try {
      await audioEngine.ensureAudioGraph();
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false }
      });

      studioRecordChunks = [];
      studioRecorder = new MediaRecorder(stream);
      studioRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) studioRecordChunks.push(e.data);
      };

      studioRecorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        rawCapturedBlob = new Blob(studioRecordChunks, { type: studioRecorder.mimeType || 'audio/webm' });
        rawAudioUrl = URL.createObjectURL(rawCapturedBlob);

        const arrayBuffer = await rawCapturedBlob.arrayBuffer();
        rawCapturedBuffer = await audioEngine.audioCtx.decodeAudioData(arrayBuffer);

        const durSec = Math.round(rawCapturedBuffer.duration);
        rawCapturedName = `Gravação do Quarto (${durSec}s)`;
        readyAudioName.textContent = rawCapturedName;
        readyAudioDuration.textContent = `Duração: ${durSec} segundos de ruído capturado`;

        setStudioAudioReady();
      };

      studioRecorder.start(200);
      studioRecordStart = Date.now();

      // UI
      recordStateIdle.classList.add('hidden');
      recordStateRecording.classList.remove('hidden');
      recordStateReady.classList.add('hidden');

      studioRecordTimer = setInterval(() => {
        const elapsed = Math.floor((Date.now() - studioRecordStart) / 1000);
        const mins = String(Math.floor(elapsed / 60)).padStart(2, '0');
        const secs = String(elapsed % 60).padStart(2, '0');
        recordingLiveTimer.textContent = `${mins}:${secs}`;
      }, 1000);

    } catch (err) {
      console.error('Erro ao acessar microfone no estúdio:', err);
      alert('Permita o microfone para gravar os ruídos do seu ambiente.');
    }
  }

  // Parar Gravação do Som Ambiente
  function stopStudioRecording() {
    if (studioRecorder && studioRecorder.state !== 'inactive') {
      clearInterval(studioRecordTimer);
      studioRecorder.stop();
    }
  }

  btnStartRecordStudio.addEventListener('click', startStudioRecording);
  btnStopRecordStudio.addEventListener('click', stopStudioRecording);

  // Configurar Estado de Áudio Pronto
  function setStudioAudioReady() {
    recordStateIdle.classList.add('hidden');
    recordStateRecording.classList.add('hidden');
    recordStateReady.classList.remove('hidden');

    btnTransmuteAction.disabled = false;
    transformationResultCard.classList.add('hidden');
  }

  // Descartar e Gravar Outro
  btnReRecord.addEventListener('click', () => {
    rawCapturedBuffer = null;
    rawCapturedBlob = null;
    auxPlayer.pause();
    previewPlayIcon.classList.remove('hidden');
    previewPauseIcon.classList.add('hidden');

    recordStateReady.classList.add('hidden');
    recordStateIdle.classList.remove('hidden');
    btnTransmuteAction.disabled = true;
    transformationResultCard.classList.add('hidden');
  });

  // Ouvir Preview do Áudio Original
  btnPlayPreviewOriginal.addEventListener('click', () => {
    if (!rawAudioUrl) return;
    if (auxPlayer.paused) {
      auxPlayer.src = rawAudioUrl;
      auxPlayer.play();
      previewPlayIcon.classList.add('hidden');
      previewPauseIcon.classList.remove('hidden');
    } else {
      auxPlayer.pause();
      previewPlayIcon.classList.remove('hidden');
      previewPauseIcon.classList.add('hidden');
    }
  });

  auxPlayer.onended = () => {
    previewPlayIcon.classList.remove('hidden');
    previewPauseIcon.classList.add('hidden');
  };

  // Botões de Amostra Pronta (Escritório, Cafeteria, Trânsito)
  sampleButtons.forEach(btn => {
    btn.addEventListener('click', async () => {
      await audioEngine.ensureAudioGraph();
      const sampleType = btn.dataset.sample;
      rawCapturedBuffer = audioEngine.generateSyntheticNoisySample(sampleType, 8);
      rawCapturedBlob = audioEngine.audioBufferToWav(rawCapturedBuffer);
      rawAudioUrl = URL.createObjectURL(rawCapturedBlob);

      const names = {
        office: 'Ruído de Escritório & Teclado (8s)',
        cafe: 'Ruído de Cafeteria & Pessoas (8s)',
        street: 'Ruído de Trânsito & Motores (8s)'
      };
      rawCapturedName = names[sampleType] || 'Amostra de Ruído';
      readyAudioName.textContent = rawCapturedName;
      readyAudioDuration.textContent = 'Duração: 8 segundos de ruído simulado';

      setStudioAudioReady();
      showToast(`Amostra "${rawCapturedName}" carregada!`);
    });
  });

  // Enviar Arquivo de Áudio
  inputAudioFile.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      showToast('Carregando áudio...');
      rawCapturedBuffer = await audioEngine.decodeAudioFile(file);
      rawCapturedBlob = audioEngine.audioBufferToWav(rawCapturedBuffer);
      rawAudioUrl = URL.createObjectURL(rawCapturedBlob);

      rawCapturedName = file.name;
      readyAudioName.textContent = file.name;
      readyAudioDuration.textContent = `Duração: ${Math.round(rawCapturedBuffer.duration)} segundos`;

      setStudioAudioReady();
      showToast('Áudio carregado com sucesso!');
    } catch (err) {
      console.error('Erro ao ler áudio:', err);
      alert('Não foi possível ler este arquivo de áudio.');
    }
  });

  // =========================================================================
  // PASSO 2: ESCOLHER TEMA PRÉ-SETADO
  // =========================================================================
  themeCards.forEach(card => {
    card.addEventListener('click', () => {
      themeCards.forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      selectedTheme = card.dataset.theme;
    });
  });

  // =========================================================================
  // PASSO 3: BOTÃO MÁGICO DE TRANSFORMAÇÃO & RENDERIZAÇÃO
  // =========================================================================
  btnTransmuteAction.addEventListener('click', async () => {
    if (!rawCapturedBuffer) return;

    // UI de carregamento
    btnTransmuteAction.disabled = true;
    transmuteBtnText.textContent = 'Transmutando Áudio...';
    transformingProgressBox.classList.remove('hidden');
    transformationResultCard.classList.add('hidden');
    transformProgressFill.style.width = '10%';
    transformStatusText.textContent = 'Analisando frequências do som ambiente...';

    try {
      // Executa a transmutação espectral do buffer gravado
      lastTransmutationResult = await audioEngine.transmuteAudioBuffer(
        rawCapturedBuffer,
        selectedTheme,
        (percent, statusMsg) => {
          transformProgressFill.style.width = `${percent}%`;
          transformStatusText.textContent = statusMsg;
        }
      );

      // Finalização
      setTimeout(() => {
        transformingProgressBox.classList.add('hidden');
        btnTransmuteAction.disabled = false;
        transmuteBtnText.textContent = 'Transformar Novamente';

        // Preencher card de resultado
        resOriginalTitle.textContent = rawCapturedName;
        resSereneTitle.textContent = `${lastTransmutationResult.presetName} • Música Serena Gerada (${lastTransmutationResult.durationFormatted})`;

        // Configurar botão de download
        btnDownloadWav.href = lastTransmutationResult.transformedUrl;
        const cleanDate = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 16);
        btnDownloadWav.download = `sereno-${selectedTheme}-${cleanDate}.wav`;

        transformationResultCard.classList.remove('hidden');
        transformationResultCard.scrollIntoView({ behavior: 'smooth' });

        // Tocar a música serena resultante no player Spotify imediatamente!
        playGeneratedResultInPlayer();

        showToast('Áudio transformado com sucesso em harmonia serena! 🍃');
      }, 400);

    } catch (err) {
      console.error('Erro na transmutação:', err);
      alert('Ocorreu um erro ao transformar o áudio.');
      btnTransmuteAction.disabled = false;
      transmuteBtnText.textContent = 'Transformar em Música Serena';
      transformingProgressBox.classList.add('hidden');
    }
  });

  // Tocar música gerada no player principal
  function playGeneratedResultInPlayer() {
    if (!lastTransmutationResult) return;

    const newTrack = {
      id: `transmuted-${Date.now()}`,
      title: `${lastTransmutationResult.presetName} (Som do Quarto)`,
      artist: 'Alquimia Sonora • Sereno',
      preset: selectedTheme,
      duration: lastTransmutationResult.durationFormatted,
      hasRecordedAudio: true
    };

    audioEngine.playTrack(newTrack, lastTransmutationResult.transformedWavBlob);
    playlistManager.isPlaying = true;

    playerTitle.textContent = newTrack.title;
    playerArtist.textContent = newTrack.artist;
    playerCoverEmoji.textContent = selectedTheme === 'zen' ? '🎍' : (selectedTheme === 'celestial' ? '✨' : (selectedTheme === 'ocean' ? '🌊' : '🌌'));
    playerTotalTime.textContent = newTrack.duration;
    playerPlayIcon.classList.add('hidden');
    playerPauseIcon.classList.remove('hidden');
  }

  // Comparador de áudio no card de resultado
  btnPlayResOriginal.addEventListener('click', () => {
    if (!lastTransmutationResult) return;
    auxPlayer.src = lastTransmutationResult.originalUrl;
    auxPlayer.play();
    showToast('Reproduzindo ruído original...');
  });

  btnPlayResSerene.addEventListener('click', () => {
    playGeneratedResultInPlayer();
  });

  // Salvar na Playlist
  btnSaveToPlaylist.addEventListener('click', () => {
    if (!lastTransmutationResult) return;
    inputTrackTitle.value = `${lastTransmutationResult.presetName} (Som Ambiente)`;
    selectTargetPlaylist.innerHTML = '';
    playlistManager.playlists.forEach(pl => {
      const opt = document.createElement('option');
      opt.value = pl.id;
      opt.textContent = pl.title;
      selectTargetPlaylist.appendChild(opt);
    });
    modalSaveTrack.classList.remove('hidden');
    inputTrackTitle.focus();
  });

  btnConfirmSaveTrack.addEventListener('click', async () => {
    if (!lastTransmutationResult) return;
    const title = inputTrackTitle.value.trim() || 'Música Serena';
    const targetPlId = selectTargetPlaylist.value;

    const trackData = {
      title,
      artist: `${lastTransmutationResult.presetName} • Sereno`,
      preset: selectedTheme,
      duration: lastTransmutationResult.durationFormatted
    };

    await playlistManager.addTrackToPlaylist(targetPlId, trackData, lastTransmutationResult.transformedWavBlob);
    modalSaveTrack.classList.add('hidden');
    playlistManager.activePlaylistId = targetPlId;
    renderSidebarPlaylists();
    switchView('playlist');
    showToast(`Música "${title}" adicionada à playlist! 🎶`);
  });

  btnShareResult.addEventListener('click', () => {
    openShareModal();
  });

  // =========================================================================
  // RENDERIZAÇÃO DE PLAYLISTS E NAVEGAÇÃO SPOTIFY
  // =========================================================================
  function renderSidebarPlaylists() {
    sidebarPlaylistsList.innerHTML = '';
    playlistManager.playlists.forEach(pl => {
      const btn = document.createElement('button');
      btn.className = `sidebar-playlist-item ${playlistManager.activePlaylistId === pl.id ? 'active' : ''}`;
      btn.textContent = pl.title;
      btn.addEventListener('click', () => {
        playlistManager.activePlaylistId = pl.id;
        switchView('playlist');
        renderSidebarPlaylists();
      });
      sidebarPlaylistsList.appendChild(btn);
    });
  }

  document.getElementById('btn-liked-songs').addEventListener('click', () => {
    playlistManager.activePlaylistId = 'liked-songs';
    switchView('playlist');
    renderSidebarPlaylists();
  });

  async function renderPlaylistView() {
    const pl = playlistManager.getActivePlaylist();
    if (!pl) return;

    currentViewTitle.textContent = `Playlist • ${pl.title}`;
    playlistViewTitle.textContent = pl.title;
    playlistViewDesc.textContent = pl.description;
    playlistViewCover.style.background = pl.coverGradient || 'linear-gradient(135deg, #0ea5e9, #38bdf8)';

    const trackCount = pl.tracks ? pl.tracks.length : 0;
    playlistViewCount.textContent = `${trackCount} ${trackCount === 1 ? 'faixa' : 'faixas'}`;

    if (pl.id === 'liked-songs') {
      playlistCoverIcon.textContent = '❤️';
      btnPlaylistDelete.classList.add('hidden');
    } else {
      playlistCoverIcon.textContent = pl.title.includes('Zen') ? '🎍' : (pl.title.includes('Sono') ? '🌙' : '🎵');
      btnPlaylistDelete.classList.toggle('hidden', pl.isDefault);
    }

    playlistTracksBody.innerHTML = '';
    if (!pl.tracks || pl.tracks.length === 0) {
      playlistTracksBody.innerHTML = `
        <div style="padding: 40px 16px; text-align: center; color: var(--text-muted);">
          <p>Esta playlist ainda não tem faixas.</p>
          <small>Grave um som ambiente no <strong>Estúdio</strong> e aperte em transformar para adicionar aqui!</small>
        </div>
      `;
      return;
    }

    pl.tracks.forEach((track, idx) => {
      const isCurrent = (playlistManager.getCurrentTrack()?.id === track.id);
      const row = document.createElement('div');
      row.className = `track-row ${isCurrent ? 'active' : ''}`;

      row.innerHTML = `
        <div class="track-num-cell">${isCurrent && playlistManager.isPlaying ? '▶' : (idx + 1)}</div>
        <div class="track-title-cell">
          <span class="track-title-text">${track.title}</span>
          <span class="track-artist-text">${track.artist}</span>
        </div>
        <div class="col-preset">
          <span class="track-preset-badge">${(track.preset || 'zen').toUpperCase()}</span>
        </div>
        <div class="track-date-cell">${track.date || 'Hoje'}</div>
        <div class="track-dur-cell">
          <span>${track.duration || '04:00'}</span>
          <button class="track-like-btn ${track.liked ? 'liked' : ''}" data-track-id="${track.id}">
            ${track.liked ? '❤️' : '🤍'}
          </button>
        </div>
      `;

      row.addEventListener('click', async (e) => {
        if (e.target.closest('.track-like-btn')) return;
        await playTrackByIndex(idx);
      });

      const likeBtn = row.querySelector('.track-like-btn');
      likeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const newState = playlistManager.toggleLike(track.id);
        likeBtn.textContent = newState ? '❤️' : '🤍';
        likeBtn.classList.toggle('liked', newState);
      });

      playlistTracksBody.appendChild(row);
    });
  }

  async function playTrackByIndex(index) {
    playlistManager.playTrack(index);
    const track = playlistManager.getCurrentTrack();
    if (!track) return;

    let blob = null;
    if (track.hasRecordedAudio) {
      blob = await playlistManager.getAudioBlob(track.id);
    }

    await audioEngine.playTrack(track, blob);
    updatePlayerBarInfo();
    renderPlaylistView();
  }

  function updatePlayerBarInfo() {
    const track = playlistManager.getCurrentTrack();
    if (!track) return;

    playerTitle.textContent = track.title;
    playerArtist.textContent = track.artist;
    playerCoverEmoji.textContent = track.preset === 'zen' ? '🎍' : (track.preset === 'celestial' ? '✨' : (track.preset === 'ocean' ? '🌊' : '🌌'));
    playerTotalTime.textContent = track.duration || '04:00';
    playerLikeBtn.classList.toggle('liked', !!track.liked);

    if (playlistManager.isPlaying) {
      playerPlayIcon.classList.add('hidden');
      playerPauseIcon.classList.remove('hidden');
    } else {
      playerPlayIcon.classList.remove('hidden');
      playerPauseIcon.classList.add('hidden');
    }
  }

  btnPlaylistPlayAll.addEventListener('click', async () => {
    const pl = playlistManager.getActivePlaylist();
    if (pl && pl.tracks && pl.tracks.length > 0) {
      await playTrackByIndex(0);
    }
  });

  btnPlaylistDelete.addEventListener('click', () => {
    const pl = playlistManager.getActivePlaylist();
    if (!pl || pl.isDefault || pl.id === 'liked-songs') return;

    if (confirm(`Excluir a playlist "${pl.title}"?`)) {
      playlistManager.playlists = playlistManager.playlists.filter(p => p.id !== pl.id);
      playlistManager.savePlaylists();
      playlistManager.activePlaylistId = playlistManager.playlists[0].id;
      renderSidebarPlaylists();
      renderPlaylistView();
      showToast('Playlist removida.');
    }
  });

  // Controles do Player Inferior
  playerBtnToggle.addEventListener('click', async () => {
    if (!audioEngine.audioCtx) {
      await playTrackByIndex(playlistManager.currentTrackIndex);
      return;
    }
    const playing = playlistManager.togglePlayPause();
    if (playing) audioEngine.resumeTrack();
    else audioEngine.pauseTrack();
    updatePlayerBarInfo();
    renderPlaylistView();
  });

  playerBtnNext.addEventListener('click', async () => {
    playlistManager.nextTrack();
    await playTrackByIndex(playlistManager.currentTrackIndex);
  });

  playerBtnPrev.addEventListener('click', async () => {
    playlistManager.prevTrack();
    await playTrackByIndex(playlistManager.currentTrackIndex);
  });

  playerBtnShuffle.addEventListener('click', () => {
    playlistManager.isShuffle = !playlistManager.isShuffle;
    playerBtnShuffle.classList.toggle('active', playlistManager.isShuffle);
    showToast(playlistManager.isShuffle ? 'Modo aleatório ativado' : 'Modo sequencial');
  });

  playerBtnRepeat.addEventListener('click', () => {
    playlistManager.isRepeat = !playlistManager.isRepeat;
    playerBtnRepeat.classList.toggle('active', playlistManager.isRepeat);
    showToast(playlistManager.isRepeat ? 'Repetir ativado' : 'Repetir desligado');
  });

  playerLikeBtn.addEventListener('click', () => {
    const track = playlistManager.getCurrentTrack();
    if (track) {
      const newState = playlistManager.toggleLike(track.id);
      playerLikeBtn.classList.toggle('liked', newState);
      renderPlaylistView();
      showToast(newState ? 'Adicionada às Curtidas ❤️' : 'Removida das Curtidas');
    }
  });

  audioEngine.onTrackProgress = (currentTimeSec, durationSec) => {
    const progressPercent = Math.min(100, (currentTimeSec / Math.max(1, durationSec)) * 100);
    playerProgressFill.style.width = `${progressPercent}%`;

    const mins = Math.floor(currentTimeSec / 60);
    const secs = String(Math.floor(currentTimeSec % 60)).padStart(2, '0');
    playerCurrentTime.textContent = `${mins}:${secs}`;
  };

  audioEngine.onTrackEnded = async () => {
    if (playlistManager.isRepeat) await playTrackByIndex(playlistManager.currentTrackIndex);
    else {
      playlistManager.nextTrack();
      await playTrackByIndex(playlistManager.currentTrackIndex);
    }
  };

  playerProgressTrack.addEventListener('click', (e) => {
    const rect = playerProgressTrack.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    audioEngine.seekTrack(ratio * audioEngine.trackDurationSec);
  });

  playerVolumeSlider.addEventListener('input', (e) => {
    const val = parseInt(e.target.value, 10);
    if (audioEngine.masterGain) {
      audioEngine.masterGain.gain.setTargetAtTime(val / 100, audioEngine.audioCtx.currentTime, 0.05);
    }
  });

  // =========================================================================
  // ABA EXPLORAR
  // =========================================================================
  function renderExploreGrid() {
    const exploreCardsGrid = document.getElementById('explore-cards-grid');
    exploreCardsGrid.innerHTML = '';

    const exploreItems = [
      { title: 'Foco Profundo & Estudo', icon: '☕', gradient: 'linear-gradient(135deg, #0ea5e9, #38bdf8)', playlistId: 'playlist-focus' },
      { title: 'Sono Restaurador', icon: '🌙', gradient: 'linear-gradient(135deg, #818cf8, #c084fc)', playlistId: 'playlist-sleep' },
      { title: 'Meditação Zen', icon: '🧘', gradient: 'linear-gradient(135deg, #10b981, #34d399)', playlistId: 'playlist-meditation' },
      { title: 'Chuva & Vidro Cristal', icon: '💧', gradient: 'linear-gradient(135deg, #06b6d4, #0284c7)', theme: 'crystal' },
      { title: 'Aurora Boreal', icon: '🌌', gradient: 'linear-gradient(135deg, #a855f7, #ec4899)', theme: 'aurora' },
      { title: 'Jardim de Bambu', icon: '🎍', gradient: 'linear-gradient(135deg, #059669, #10b981)', theme: 'zen' }
    ];

    exploreItems.forEach(item => {
      const card = document.createElement('div');
      card.className = 'explore-card';
      card.style.background = item.gradient;
      card.innerHTML = `<h3>${item.title}</h3><span class="explore-card-icon">${item.icon}</span>`;

      card.addEventListener('click', async () => {
        if (item.playlistId) {
          playlistManager.activePlaylistId = item.playlistId;
          switchView('playlist');
          await playTrackByIndex(0);
        } else if (item.theme) {
          selectedTheme = item.theme;
          themeCards.forEach(c => c.classList.toggle('active', c.dataset.theme === item.theme));
          switchView('transform');
        }
      });
      exploreCardsGrid.appendChild(card);
    });
  }

  // =========================================================================
  // MODAIS E COMPARTILHAMENTO (SPOTIFY SHARE + QR CODE)
  // =========================================================================
  document.querySelectorAll('[data-close]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.getElementById(btn.dataset.close)?.classList.add('hidden');
    });
  });

  btnModalCreatePlaylist.addEventListener('click', () => {
    inputPlaylistName.value = '';
    inputPlaylistDesc.value = '';
    modalCreatePlaylist.classList.remove('hidden');
    inputPlaylistName.focus();
  });

  btnConfirmCreatePlaylist.addEventListener('click', () => {
    const title = inputPlaylistName.value.trim();
    if (!title) return alert('Informe um nome para a playlist.');
    const newPl = playlistManager.createPlaylist(title, inputPlaylistDesc.value.trim());
    modalCreatePlaylist.classList.add('hidden');
    playlistManager.activePlaylistId = newPl.id;
    renderSidebarPlaylists();
    switchView('playlist');
    showToast(`Playlist "${newPl.title}" criada! ✨`);
  });

  function openShareModal() {
    const target = playlistManager.getActivePlaylist();
    if (!target) return;

    const shareUrl = playlistManager.generateShareUrl(target, 'playlist');
    shareItemName.textContent = target.title;
    shareItemDesc.textContent = target.description || 'Música suave criada no Sereno.';
    shareLinkInput.value = shareUrl;

    playlistManager.renderCompactQR(shareQrCanvas, shareUrl);
    modalShare.classList.remove('hidden');
  }

  topbarShareBtn.addEventListener('click', openShareModal);
  btnPlaylistShare.addEventListener('click', openShareModal);

  btnCopyShareLink.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(shareLinkInput.value);
      showToast('Link copiado! Cole no WhatsApp ou envie aos amigos 📲');
    } catch (e) {
      shareLinkInput.select();
      document.execCommand('copy');
      showToast('Link copiado!');
    }
  });

  btnNativeShare.addEventListener('click', async () => {
    const target = playlistManager.getActivePlaylist();
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Sereno • ${target.title}`,
          text: `Ouça esta música relaxante criada com o som ambiente: ${target.title}`,
          url: shareLinkInput.value
        });
      } catch (err) {}
    } else {
      btnCopyShareLink.click();
    }
  });

  // Detecção de link compartilhado na URL
  const sharedData = playlistManager.checkSharedUrl();
  if (sharedData && sharedData.title) {
    sharedBannerText.textContent = `Seu amigo compartilhou a playlist "${sharedData.title}" com você!`;
    sharedBanner.classList.remove('hidden');
  }

  btnImportShared.addEventListener('click', () => {
    if (sharedData) {
      const imported = playlistManager.importSharedPlaylist(sharedData);
      sharedBanner.classList.add('hidden');
      window.location.hash = '';
      playlistManager.activePlaylistId = imported.id;
      renderSidebarPlaylists();
      switchView('playlist');
      playTrackByIndex(0);
      showToast(`Playlist "${imported.title}" salva na sua biblioteca!`);
    }
  });

  btnCloseShared.addEventListener('click', () => {
    sharedBanner.classList.add('hidden');
  });

  // Tela Cheia
  btnFullscreen.addEventListener('click', () => {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => {});
    else document.exitFullscreen().catch(() => {});
  });

  // Alternância de Tema Zen Claro / Escuro
  const btnThemeToggle = document.getElementById('btn-theme-toggle');
  const themeToggleIcon = document.getElementById('theme-toggle-icon');
  const themeToggleText = document.getElementById('theme-toggle-text');

  const savedTheme = localStorage.getItem('sereno_theme');
  if (savedTheme === 'dark') {
    document.body.classList.add('theme-dark');
    if (themeToggleIcon) themeToggleIcon.textContent = '☀️';
    if (themeToggleText) themeToggleText.textContent = 'Modo Zen Claro';
  }

  btnThemeToggle?.addEventListener('click', () => {
    document.body.classList.toggle('theme-dark');
    const isDark = document.body.classList.contains('theme-dark');
    if (themeToggleIcon) themeToggleIcon.textContent = isDark ? '☀️' : '🌙';
    if (themeToggleText) themeToggleText.textContent = isDark ? 'Modo Zen Claro' : 'Modo Noturno';
    localStorage.setItem('sereno_theme', isDark ? 'dark' : 'light');
    showToast(isDark ? 'Modo Zen Noturno ativado 🌙' : 'Modo Zen Claro ativado ☀️');
  });

  // =========================================================================
  // Inicialização Geral
  // =========================================================================
  renderSidebarPlaylists();
  renderPlaylistView();
  updatePlayerBarInfo();
});
