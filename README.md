# 🌿 Sereno • O "Spotify" da Música Relaxante com Som Ambiente

**Sereno** é uma aplicação interativa que une a captação e transmutação acústica em tempo real com a experiência completa de um serviço de streaming estilo **Spotify**: crie suas próprias playlists, curta faixas, salve gravações do seu ambiente e compartilhe com seus amigos via link ou QR Code!

---

## ✨ Como Executar em 1 Clique

No terminal, execute:

```bash
cd app-som-tranquilo
./start.sh
```

*(Ou `python3 server.py`)*

O aplicativo abrirá automaticamente no seu navegador em `http://localhost:3000`.

---

## 🪄 O Fluxo Perfeito de Transformação

O coração do Sereno é o **Estúdio de Transformação Acústica**:

1. **Passo 1: Gravar o Som Ambiente**
   - Aperte `🎙️ Gravar Som Ambiente` e capte alguns segundos do seu quarto, escritório ou rua (ou use os botões rápidos de ruídos de teste como *Escritório*, *Cafeteria* ou *Trânsito*).
   - Ao finalizar, o app guarda o ruído original para você ouvir se quiser.

2. **Passo 2: Escolher o Tema Pré-setado**
   - 🎍 **Jardim Zen**: Taças tibetanas, bambu e harmonia japonesa Hirajoshi.
   - ✨ **Nuvem Celeste**: Harpa translúcida e ambiência celestial Lydian.
   - 🌊 **Oceano Profundo**: Marimba aveludada e ressonâncias aquáticas no modo Dórico.
   - 🌌 **Aurora Boreal**: Teclas aveludadas tipo Rhodes e pentatônica maior acolhedora.
   - 💎 **Chuva de Cristal**: Sinos de vidro e acordes abertos relaxantes.

3. **Passo 3: Transformar em Música Serena**
   - Aperte o botão `✨ Transformar em Música Serena`.
   - O motor processa o áudio em alta velocidade com `OfflineAudioContext`: filtra asperezas pelo banco ressonador, mapeia os impactos para sinos afinados e aplica reverb de catedral.
   - **Resultado Lado a Lado**: compare o **Áudio Barulhento Original** com a **Música Calma Gerada**, salve na sua playlist, baixe em `.wav` ou compartilhe com seus amigos via link e QR Code!

### 1. 📚 Playlists & Biblioteca Personalizada
- **Playlists Curadas de Fábrica:**
  - ☕ **Foco Profundo**: Frequências calmas e taças tibetanas para trabalhar, ler e programar.
  - 🌙 **Sono & Descompressão**: Ondas celestiais lentas e pads aveludados para induzir o sono.
  - 🧘 **Respiração & Serenidade**: Timbres de cristal para ancorar a mente no presente.
- **+ Criar Playlist:** Crie quantas playlists personalizadas quiser com títulos e descrições próprias.
- **❤️ Músicas Curtidas:** Coleção dinâmica de todas as faixas que você favoritou com o coração.
- **Salvar Gravações do Ambiente:** Grave os momentos em que seu quarto ou escritório estiver gerando harmonias bonitas e salve a música diretamente na sua playlist favorita (armazenada de forma persistente no IndexedDB do seu navegador).

### 2. 📲 Compartilhamento com Amigos (Spotify Share)
- **Link Direto:** Clique em **Compartilhar** em qualquer playlist ou na barra superior para gerar um link único contendo todas as definições da playlist.
- **Copiar Link & WhatsApp:** Botão de 1 clique para copiar o link ou abrir a gaveta de compartilhamento nativo do celular (`navigator.share`).
- **QR Code Integrado:** O app gera um QR Code instantâneo na tela para seus amigos apontarem a câmera do celular e abrirem a playlist na hora, sem precisar digitar nada!
- **Importação Automática:** Ao abrir um link compartilhado por um amigo, o Sereno exibe uma barra no topo: *"Seu amigo compartilhou uma playlist com você! [Salvar na Biblioteca]"*.

### 3. ⏯️ Barra de Reprodução Fixa Inferior (Player Bar)
- Mini-capa e dados da música em tempo real.
- Botão de Curtir (Coração).
- Controles: **Aleatório (Shuffle)**, **Anterior**, **Play/Pause**, **Próxima**, **Repetir (Loop)**.
- **Barra de Progresso com Scrub:** Arraste ou clique na barra para navegar pelo tempo da faixa.
- Controle de Volume Geral com resposta imediata.
- Atalho rápido para alternar entre o modo Playlist e o visualizador **Ao Vivo**.

### 4. 🧭 Explorar Paisagens & Modos
- Cards visuais por categoria de bem-estar: *Foco & Estudo*, *Sono Reparador*, *Meditação*, *Chuva & Gotas de Cristal*, *Aurora Boreal*, *Jardim Zen*.

---

## 🎙️ O Transmutador Acústico Ao Vivo

Além de funcionar como reprodutor de playlists, o Sereno mantém o seu superpoder generativo:
- **Banco de 12 Ressonadores Harmônicos:** Vibra e ressoa musicalmente com o ruído de fundo (ar condicionado, respiração, passos, chuva).
- **Detecção de Transientes & Sinos FM:** Converte toques no teclado, cliques de mouse e vozes em sinos cristalinos afinados na escala ativa.
- **Colchão Sonoro & Drones Protetores:** Ondas puras em tríades e nonas para relaxamento profundo.
- **Guia de Respiração Consciente (4-4-4):** Orbe visual central para exercícios de pranayama e mindfulness.
- **Modo Tela Cheia:** Para deixar rodando no monitor como plano de fundo de descanso ou estudo.

---

## 📂 Arquitetura Técnica

- [`playlist-manager.js`](file:///Users/chrismacbook/Producao/2025/Socicam/0153_Conceito2026/JULHO2026/app-som-tranquilo/playlist-manager.js): Gerenciamento de playlists, persistência IndexedDB de áudio, importação/exportação e gerador de QR Code em Canvas.
- [`audio-engine.js`](file:///Users/chrismacbook/Producao/2025/Socicam/0153_Conceito2026/JULHO2026/app-som-tranquilo/audio-engine.js): Motor em Web Audio API com suporte simultâneo a transmutação via microfone, síntese generativa e reprodução de faixas salvas.
- [`visualizer.js`](file:///Users/chrismacbook/Producao/2025/Socicam/0153_Conceito2026/JULHO2026/app-som-tranquilo/visualizer.js): Ondas fluidas estilo aurora boreal, ondulações florais de notas e partículas luminescentes.
- [`styles.css`](file:///Users/chrismacbook/Producao/2025/Socicam/0153_Conceito2026/JULHO2026/app-som-tranquilo/styles.css): Layout desktop/mobile estilo Spotify com Glassmorphism e tema escuro suave.
- [`app.js`](file:///Users/chrismacbook/Producao/2025/Socicam/0153_Conceito2026/JULHO2026/app-som-tranquilo/app.js): Controlador das abas, player inferior, modais e eventos de compartilhamento.
