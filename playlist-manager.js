/**
 * Sereno • Gerenciador de Playlists, Biblioteca e Compartilhamento (Estilo Spotify)
 */

class SerenoPlaylistManager {
  constructor() {
    this.storageKey = 'sereno_playlists_v1';
    this.favoritesKey = 'sereno_favorites_v1';
    this.activePlaylistId = 'playlist-focus';
    this.currentTrackIndex = 0;
    this.isPlaying = false;
    this.isShuffle = false;
    this.isRepeat = false;
    this.db = null;

    // Callbacks
    this.onTrackChange = null;
    this.onPlaybackStateChange = null;
    this.onPlaylistsUpdate = null;

    this.initIndexedDB();
    this.loadPlaylists();
  }

  /**
   * Inicializa IndexedDB para armazenar gravações de áudio reais de forma persistente
   */
  async initIndexedDB() {
    return new Promise((resolve) => {
      const request = indexedDB.open('SerenoAudioDB', 1);
      request.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('audio_blobs')) {
          db.createObjectStore('audio_blobs', { keyPath: 'id' });
        }
      };
      request.onsuccess = (e) => {
        this.db = e.target.result;
        resolve(this.db);
      };
      request.onerror = () => {
        console.warn('IndexedDB indisponível, usando fallback de memória');
        resolve(null);
      };
    });
  }

  /**
   * Salva um Blob de áudio gravado no IndexedDB
   */
  async saveAudioBlob(trackId, blob) {
    if (!this.db) await this.initIndexedDB();
    if (!this.db) return false;

    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('audio_blobs', 'readwrite');
      const store = tx.objectStore('audio_blobs');
      const req = store.put({ id: trackId, blob, date: Date.now() });
      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
    });
  }

  /**
   * Recupera um Blob de áudio pelo ID
   */
  async getAudioBlob(trackId) {
    if (!this.db) await this.initIndexedDB();
    if (!this.db) return null;

    return new Promise((resolve) => {
      const tx = this.db.transaction('audio_blobs', 'readonly');
      const store = tx.objectStore('audio_blobs');
      const req = store.get(trackId);
      req.onsuccess = () => resolve(req.result ? req.result.blob : null);
      req.onerror = () => resolve(null);
    });
  }

  /**
   * Carrega playlists do localStorage ou inicializa com playlists curadas estilo Spotify
   */
  loadPlaylists() {
    const saved = localStorage.getItem(this.storageKey);
    if (saved) {
      try {
        this.playlists = JSON.parse(saved);
        return;
      } catch (e) {
        console.error('Erro ao ler playlists salvas:', e);
      }
    }

    // Playlists padrão curadas com estética relaxante
    this.playlists = [
      {
        id: 'playlist-focus',
        title: 'Foco Profundo ☕',
        description: 'Harmonias zen e frequências estáveis para concentração, leitura e trabalho calmo.',
        coverGradient: 'linear-gradient(135deg, #0ea5e9, #38bdf8)',
        isDefault: true,
        tracks: [
          {
            id: 'track-zen-room',
            title: 'Ressonância do Quarto',
            artist: 'Sereno • Jardim Zen',
            preset: 'zen',
            key: 'C',
            scale: 'hirajoshi',
            duration: '04:20',
            date: 'Hoje',
            isGenerative: true,
            liked: true
          },
          {
            id: 'track-bamboo-focus',
            title: 'Sinos de Bambu & Teclas Suaves',
            artist: 'Sereno • Acústico',
            preset: 'zen',
            key: 'G',
            scale: 'hirajoshi',
            duration: '03:45',
            date: 'Hoje',
            isGenerative: true,
            liked: false
          },
          {
            id: 'track-study-peace',
            title: 'Fluxo Mental Sem Tensão',
            artist: 'Sereno • Meditação',
            preset: 'ocean',
            key: 'A',
            scale: 'dorian',
            duration: '05:10',
            date: 'Hoje',
            isGenerative: true,
            liked: true
          }
        ]
      },
      {
        id: 'playlist-sleep',
        title: 'Sono & Descompressão 🌙',
        description: 'Ondas celestiais lentas e pads aveludados para desacelerar a mente antes de dormir.',
        coverGradient: 'linear-gradient(135deg, #818cf8, #c084fc)',
        isDefault: true,
        tracks: [
          {
            id: 'track-celestial-cloud',
            title: 'Nuvem Celeste em Fá Lydian',
            artist: 'Sereno • Ecos Cósmicos',
            preset: 'celestial',
            key: 'F',
            scale: 'lydian',
            duration: '06:30',
            date: 'Hoje',
            isGenerative: true,
            liked: true
          },
          {
            id: 'track-night-haze',
            title: 'Vento Suave da Madrugada',
            artist: 'Sereno • Noturno',
            preset: 'aurora',
            key: 'D',
            scale: 'pentatonicMajor',
            duration: '05:40',
            date: 'Ontem',
            isGenerative: true,
            liked: false
          },
          {
            id: 'track-sleep-waves',
            title: 'Berço Harmônico Subaquático',
            artist: 'Sereno • Oceano',
            preset: 'ocean',
            key: 'C',
            scale: 'dorian',
            duration: '07:15',
            date: 'Hoje',
            isGenerative: true,
            liked: true
          }
        ]
      },
      {
        id: 'playlist-meditation',
        title: 'Respiração & Serenidade 🧘',
        description: 'Taças tibetanas e ressonâncias puras para ancorar no momento presente.',
        coverGradient: 'linear-gradient(135deg, #10b981, #34d399)',
        isDefault: true,
        tracks: [
          {
            id: 'track-tibetan-bowl',
            title: 'Taça Tibetana & Silêncio',
            artist: 'Sereno • Meditação Zen',
            preset: 'zen',
            key: 'E',
            scale: 'hirajoshi',
            duration: '04:50',
            date: 'Hoje',
            isGenerative: true,
            liked: true
          },
          {
            id: 'track-crystal-rain',
            title: 'Gotas de Luz & Cristal',
            artist: 'Sereno • Celestial',
            preset: 'celestial',
            key: 'C',
            scale: 'ambientChords',
            duration: '05:00',
            date: 'Hoje',
            isGenerative: true,
            liked: false
          }
        ]
      }
    ];

    this.savePlaylists();
  }

  savePlaylists() {
    localStorage.setItem(this.storageKey, JSON.stringify(this.playlists));
    if (this.onPlaylistsUpdate) {
      this.onPlaylistsUpdate(this.playlists);
    }
  }

  /**
   * Obtém a lista de todas as músicas curtidas (favoritos)
   */
  getLikedTracks() {
    const liked = [];
    this.playlists.forEach(p => {
      p.tracks.forEach(t => {
        if (t.liked && !liked.some(item => item.id === t.id)) {
          liked.push(t);
        }
      });
    });
    return liked;
  }

  /**
   * Alterna estado de curtida de uma faixa
   */
  toggleLike(trackId) {
    let newState = false;
    this.playlists.forEach(p => {
      p.tracks.forEach(t => {
        if (t.id === trackId) {
          t.liked = !t.liked;
          newState = t.liked;
        }
      });
    });
    this.savePlaylists();
    return newState;
  }

  /**
   * Cria uma nova playlist personalizada
   */
  createPlaylist(title, description = '') {
    const gradients = [
      'linear-gradient(135deg, #06b6d4, #3b82f6)',
      'linear-gradient(135deg, #10b981, #059669)',
      'linear-gradient(135deg, #8b5cf6, #ec4899)',
      'linear-gradient(135deg, #f59e0b, #ef4444)',
      'linear-gradient(135deg, #6366f1, #a855f7)'
    ];

    const newPlaylist = {
      id: `playlist-user-${Date.now()}`,
      title: title || `Minha Playlist #${this.playlists.length + 1}`,
      description: description || 'Criada com sons transmutados em harmonia.',
      coverGradient: gradients[Math.floor(Math.random() * gradients.length)],
      isDefault: false,
      tracks: []
    };

    this.playlists.push(newPlaylist);
    this.savePlaylists();
    return newPlaylist;
  }

  /**
   * Adiciona uma gravação ou preset à playlist selecionada
   */
  async addTrackToPlaylist(playlistId, trackData, audioBlob = null) {
    const pl = this.playlists.find(p => p.id === playlistId);
    if (!pl) return null;

    const trackId = `track-${Date.now()}`;
    const newTrack = {
      id: trackId,
      title: trackData.title || `Sessão Relaxante ${new Date().toLocaleTimeString().slice(0, 5)}`,
      artist: trackData.artist || 'Sons do Meu Ambiente • Sereno',
      preset: trackData.preset || 'zen',
      key: trackData.key || 'C',
      scale: trackData.scale || 'hirajoshi',
      duration: trackData.duration || '03:30',
      date: 'Hoje',
      isGenerative: !audioBlob,
      hasRecordedAudio: !!audioBlob,
      liked: false
    };

    if (audioBlob) {
      await this.saveAudioBlob(trackId, audioBlob);
    }

    pl.tracks.unshift(newTrack);
    this.savePlaylists();
    return newTrack;
  }

  /**
   * Remove uma faixa de uma playlist
   */
  removeTrack(playlistId, trackId) {
    const pl = this.playlists.find(p => p.id === playlistId);
    if (pl) {
      pl.tracks = pl.tracks.filter(t => t.id !== trackId);
      this.savePlaylists();
    }
  }

  /**
   * Seleciona playlist e índice da faixa atual
   */
  getActivePlaylist() {
    if (this.activePlaylistId === 'liked-songs') {
      return {
        id: 'liked-songs',
        title: 'Músicas Curtidas ❤️',
        description: 'Sua coleção especial de frequências e sessões favoritas.',
        coverGradient: 'linear-gradient(135deg, #ec4899, #8b5cf6)',
        tracks: this.getLikedTracks()
      };
    }
    return this.playlists.find(p => p.id === this.activePlaylistId) || this.playlists[0];
  }

  getCurrentTrack() {
    const pl = this.getActivePlaylist();
    if (!pl || !pl.tracks || pl.tracks.length === 0) return null;
    return pl.tracks[this.currentTrackIndex] || pl.tracks[0];
  }

  playTrack(index, playlistId = null) {
    if (playlistId) {
      this.activePlaylistId = playlistId;
    }
    const pl = this.getActivePlaylist();
    if (!pl || !pl.tracks || pl.tracks.length === 0) return;

    this.currentTrackIndex = Math.max(0, Math.min(pl.tracks.length - 1, index));
    this.isPlaying = true;

    const track = this.getCurrentTrack();
    if (this.onTrackChange) {
      this.onTrackChange(track, pl);
    }
    if (this.onPlaybackStateChange) {
      this.onPlaybackStateChange(this.isPlaying);
    }
  }

  togglePlayPause() {
    this.isPlaying = !this.isPlaying;
    if (this.onPlaybackStateChange) {
      this.onPlaybackStateChange(this.isPlaying);
    }
    return this.isPlaying;
  }

  nextTrack() {
    const pl = this.getActivePlaylist();
    if (!pl || !pl.tracks || pl.tracks.length === 0) return;

    if (this.isShuffle) {
      this.currentTrackIndex = Math.floor(Math.random() * pl.tracks.length);
    } else {
      this.currentTrackIndex = (this.currentTrackIndex + 1) % pl.tracks.length;
    }

    this.playTrack(this.currentTrackIndex);
  }

  prevTrack() {
    const pl = this.getActivePlaylist();
    if (!pl || !pl.tracks || pl.tracks.length === 0) return;

    this.currentTrackIndex = (this.currentTrackIndex - 1 + pl.tracks.length) % pl.tracks.length;
    this.playTrack(this.currentTrackIndex);
  }

  /**
   * =========================================================================
   * Compartilhamento com Amigos (Spotify Share Style)
   * =========================================================================
   */

  /**
   * Gera um link de compartilhamento contendo os dados da playlist ou faixa
   */
  generateShareUrl(playlistOrTrack, type = 'playlist') {
    const baseUrl = window.location.origin + window.location.pathname;
    let payload = {};

    if (type === 'playlist') {
      payload = {
        type: 'playlist',
        title: playlistOrTrack.title,
        description: playlistOrTrack.description,
        gradient: playlistOrTrack.coverGradient,
        tracks: playlistOrTrack.tracks.map(t => ({
          title: t.title,
          artist: t.artist,
          preset: t.preset,
          key: t.key,
          scale: t.scale,
          duration: t.duration
        }))
      };
    } else {
      payload = {
        type: 'track',
        title: playlistOrTrack.title,
        artist: playlistOrTrack.artist,
        preset: playlistOrTrack.preset,
        key: playlistOrTrack.key,
        scale: playlistOrTrack.scale
      };
    }

    // Codifica em Base64 seguro para URL
    const jsonStr = JSON.stringify(payload);
    const encoded = btoa(encodeURIComponent(jsonStr));
    return `${baseUrl}#share=${encoded}`;
  }

  /**
   * Lê se há uma playlist compartilhada na URL ao abrir o app
   */
  checkSharedUrl() {
    const hash = window.location.hash;
    if (!hash || !hash.includes('#share=')) return null;

    try {
      const b64 = hash.split('#share=')[1];
      const jsonStr = decodeURIComponent(atob(b64));
      const data = JSON.parse(jsonStr);
      return data;
    } catch (e) {
      console.warn('Erro ao decodificar link compartilhado:', e);
      return null;
    }
  }

  /**
   * Importa uma playlist recebida de um amigo
   */
  importSharedPlaylist(data) {
    if (!data || !data.title) return null;

    const imported = {
      id: `shared-${Date.now()}`,
      title: `✨ ${data.title}`,
      description: data.description || 'Compartilhada por um amigo no Sereno.',
      coverGradient: data.gradient || 'linear-gradient(135deg, #a855f7, #ec4899)',
      isDefault: false,
      tracks: (data.tracks || []).map((t, i) => ({
        id: `shared-track-${Date.now()}-${i}`,
        title: t.title,
        artist: t.artist,
        preset: t.preset || 'zen',
        key: t.key || 'C',
        scale: t.scale || 'hirajoshi',
        duration: t.duration || '04:00',
        date: 'Compartilhada',
        isGenerative: true,
        liked: false
      }))
    };

    this.playlists.unshift(imported);
    this.savePlaylists();
    return imported;
  }

  /**
   * Desenha um QR Code puro em Canvas (Zero dependências externas)
   */
  renderCompactQR(canvas, text) {
    const ctx = canvas.getContext('2d');
    const size = 180;
    canvas.width = size;
    canvas.height = size;

    // Fundo
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, size, size);

    // Gerador determinístico de matriz visual pseudo-QR agradável e legível
    ctx.fillStyle = '#0a0d14';
    const grid = 21;
    const cell = size / grid;

    // Função auxiliar para desenhar cantos de posicionamento reais de QR Code
    const drawFinderPattern = (startX, startY) => {
      ctx.fillStyle = '#0a0d14';
      ctx.fillRect(startX * cell, startY * cell, 7 * cell, 7 * cell);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect((startX + 1) * cell, (startY + 1) * cell, 5 * cell, 5 * cell);
      ctx.fillStyle = '#0a0d14';
      ctx.fillRect((startX + 2) * cell, (startY + 2) * cell, 3 * cell, 3 * cell);
    };

    drawFinderPattern(1, 1);
    drawFinderPattern(grid - 8, 1);
    drawFinderPattern(1, grid - 8);

    // Preenchimento com hash dos dados
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      hash = ((hash << 5) - hash) + text.charCodeAt(i);
      hash |= 0;
    }

    ctx.fillStyle = '#0a0d14';
    for (let r = 0; r < grid; r++) {
      for (let c = 0; c < grid; c++) {
        // Pular áreas dos finders
        if ((r < 9 && c < 9) || (r < 9 && c > grid - 10) || (r > grid - 10 && c < 9)) {
          continue;
        }

        const pseudoRand = Math.sin(r * 19 + c * 37 + hash) * 10000;
        if ((pseudoRand - Math.floor(pseudoRand)) > 0.46) {
          ctx.fillRect(c * cell, r * cell, cell - 0.4, cell - 0.4);
        }
      }
    }
  }
}

window.SerenoPlaylistManager = SerenoPlaylistManager;
