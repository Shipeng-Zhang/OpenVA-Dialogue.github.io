const cards = [...document.querySelectorAll('.demo-card')];
const tabs = [...document.querySelectorAll('.filter-tab')];
const visibleCount = document.querySelector('#visibleCount');
const videos = [...document.querySelectorAll('.card-media video')];
const modal = document.querySelector('#videoModal');
const modalVideo = document.querySelector('#modalVideo');
const modalTitle = document.querySelector('#modalTitle');
const modalEyebrow = document.querySelector('#modalEyebrow');
const modalDescription = document.querySelector('#modalDescription');
let activePreview = null;

// Do not make the browser fetch all 20 MP4 files on initial page load.
videos.forEach((video) => {
  video.preload = 'none';
});

function updateFilter(filter) {
  let count = 0;
  cards.forEach((card) => {
    const visible = filter === 'all' || card.dataset.category === filter;
    card.classList.toggle('is-hidden', !visible);
    if (visible) count += 1;
  });
  visibleCount.textContent = String(count).padStart(2, '0');
}

tabs.forEach((tab) => {
  tab.addEventListener('click', () => {
    tabs.forEach((item) => {
      const active = item === tab;
      item.classList.toggle('active', active);
      item.setAttribute('aria-selected', String(active));
    });
    updateFilter(tab.dataset.filter);
  });
});

function openModal(card) {
  const source = card.querySelector('video').getAttribute('src');
  if (activePreview) {
    activePreview.pause();
    activePreview = null;
  }
  modalVideo.src = source;
  modalVideo.preload = 'auto';
  modalTitle.textContent = card.dataset.title;
  modalEyebrow.textContent = card.querySelector('.card-eyebrow').textContent;
  modalDescription.textContent = card.querySelector('.card-description').textContent;
  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');
  document.body.classList.add('modal-open');
  modalVideo.play().catch(() => {});
}

function closeModal() {
  modalVideo.pause();
  modalVideo.removeAttribute('src');
  modalVideo.load();
  modal.classList.remove('open');
  modal.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('modal-open');
}

cards.forEach((card) => {
  const media = card.querySelector('.card-media');
  const playButton = card.querySelector('.play-button');
  playButton.addEventListener('click', (event) => {
    event.stopPropagation();
    openModal(card);
  });
  media.addEventListener('click', () => openModal(card));
});

document.querySelectorAll('[data-close-modal]').forEach((element) => element.addEventListener('click', closeModal));
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && modal.classList.contains('open')) closeModal();
});

// Keep only one card preview active. This prevents a local static server from
// receiving many simultaneous MP4 requests while the page is scrolling.
cards.forEach((card) => {
  const video = card.querySelector('video');
  card.querySelector('.card-media').addEventListener('mouseenter', () => {
    if (modal.classList.contains('open')) return;
    if (activePreview && activePreview !== video) activePreview.pause();
    activePreview = video;
    video.play().catch(() => {});
  });
  card.querySelector('.card-media').addEventListener('mouseleave', () => {
    video.pause();
  });
});

const copyButton = document.querySelector('#copyCitation');
const copyConfirm = document.querySelector('#copyConfirm');
copyButton.addEventListener('click', async () => {
  const citation = document.querySelector('#citationText').innerText.replace(/\u00a0/g, ' ');
  try {
    await navigator.clipboard.writeText(citation);
    copyConfirm.classList.add('show');
    window.setTimeout(() => copyConfirm.classList.remove('show'), 1800);
  } catch {
    copyConfirm.textContent = 'Select to copy';
    copyConfirm.classList.add('show');
  }
});

// --- Side-by-side baseline comparison ------------------------------------
const compareVideo = document.querySelector('.compare-ours video');
const comparePlay = document.querySelector('.compare-play');
if (compareVideo && comparePlay) {
  comparePlay.addEventListener('click', () => {
    if (compareVideo.paused) {
      compareVideo.play().catch(() => {});
    } else {
      compareVideo.pause();
    }
  });
}

const viduUpload = document.querySelector('#viduUpload');
const viduPlaceholder = document.querySelector('#viduPlaceholder');
const viduVideo = document.querySelector('#viduVideo');
const viduStatus = document.querySelector('.compare-vidu .compare-status');
if (viduUpload && viduVideo) {
  viduUpload.addEventListener('change', (event) => {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    if (viduVideo.dataset.objectUrl) URL.revokeObjectURL(viduVideo.dataset.objectUrl);
    const objectUrl = URL.createObjectURL(file);
    viduVideo.dataset.objectUrl = objectUrl;
    viduVideo.src = objectUrl;
    viduVideo.hidden = false;
    viduPlaceholder.style.display = 'none';
    if (viduStatus) {
      viduStatus.classList.remove('status-muted');
      viduStatus.innerHTML = '<b></b> local clip loaded';
    }
  });
}

// --- Featured temporal anatomy viewer ------------------------------------
const timelineVideo = document.querySelector('#timelineVideo');
const timelineCanvas = document.querySelector('#timelineCanvas');
const waveformCanvas = document.querySelector('#waveformCanvas');
const timelineRange = document.querySelector('#timelineRange');
const timelinePlay = document.querySelector('#timelinePlay');
const timelineTime = document.querySelector('#timelineTime');
const frameStrip = document.querySelector('#frameStrip');
const frameCount = 7;
let frameCells = [];

function formatTime(seconds) {
  if (!Number.isFinite(seconds)) return '00:00.00';
  const minutes = Math.floor(seconds / 60).toString().padStart(2, '0');
  const remaining = (seconds % 60).toFixed(2).padStart(5, '0');
  return `${minutes}:${remaining}`;
}

function drawCover(source, canvas) {
  if (!source.videoWidth || !source.videoHeight) return;
  const context = canvas.getContext('2d');
  const targetRatio = canvas.width / canvas.height;
  const sourceRatio = source.videoWidth / source.videoHeight;
  let sx = 0; let sy = 0; let sw = source.videoWidth; let sh = source.videoHeight;
  if (sourceRatio > targetRatio) {
    sw = source.videoHeight * targetRatio;
    sx = (source.videoWidth - sw) / 2;
  } else {
    sh = source.videoWidth / targetRatio;
    sy = (source.videoHeight - sh) / 2;
  }
  context.fillStyle = '#111315';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(source, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
}

function seekTimeline(time) {
  return new Promise((resolve) => {
    if (!timelineVideo || Math.abs(timelineVideo.currentTime - time) < 0.01) {
      resolve();
      return;
    }
    const onSeeked = () => resolve();
    timelineVideo.addEventListener('seeked', onSeeked, { once: true });
    timelineVideo.currentTime = time;
    window.setTimeout(resolve, 900);
  });
}

function drawCurrentFrame() {
  if (!timelineVideo || timelineVideo.readyState < 2) return;
  drawCover(timelineVideo, timelineCanvas);
  if (timelineTime) timelineTime.textContent = formatTime(timelineVideo.currentTime);
  if (timelineRange) timelineRange.value = timelineVideo.currentTime;
  frameCells.forEach((cell) => {
    cell.button.classList.toggle('active', Math.abs(Number(cell.time) - timelineVideo.currentTime) < Math.max(.08, timelineVideo.duration / 35));
  });
}

async function renderFrameStrip() {
  if (!timelineVideo || !timelineVideo.duration || !frameStrip) return;
  const previousTime = timelineVideo.currentTime;
  frameStrip.innerHTML = '';
  frameCells = [];
  for (let index = 0; index < frameCount; index += 1) {
    const time = timelineVideo.duration * index / (frameCount - 1);
    const button = document.createElement('button');
    button.className = 'frame-cell';
    button.type = 'button';
    button.setAttribute('aria-label', `Show frame at ${formatTime(time)}`);
    const canvas = document.createElement('canvas');
    canvas.width = 320;
    canvas.height = 180;
    const label = document.createElement('span');
    label.textContent = formatTime(time);
    button.append(canvas, label);
    button.addEventListener('click', () => {
      timelineVideo.pause();
      timelineVideo.currentTime = time;
      drawCurrentFrame();
    });
    frameStrip.appendChild(button);
    frameCells.push({ button, time });
    await seekTimeline(time);
    drawCover(timelineVideo, canvas);
  }
  timelineVideo.currentTime = previousTime;
  drawCurrentFrame();
}

function drawFallbackWaveform() {
  if (!waveformCanvas) return;
  const context = waveformCanvas.getContext('2d');
  const bars = 150;
  context.clearRect(0, 0, waveformCanvas.width, waveformCanvas.height);
  context.strokeStyle = 'rgba(201,239,67,.78)';
  context.lineWidth = 2;
  for (let index = 0; index < bars; index += 1) {
    const value = 5 + ((index * 37) % 29) + Math.abs(Math.sin(index * .37) * 17);
    const x = index / bars * waveformCanvas.width;
    context.beginPath();
    context.moveTo(x, waveformCanvas.height / 2 - value);
    context.lineTo(x, waveformCanvas.height / 2 + value);
    context.stroke();
  }
}

async function renderWaveform() {
  if (!waveformCanvas || !timelineVideo) return;
  try {
    const response = await fetch(timelineVideo.getAttribute('src'));
    const audioBuffer = await response.arrayBuffer();
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const decoded = await audioContext.decodeAudioData(audioBuffer);
    const channel = decoded.getChannelData(0);
    const context = waveformCanvas.getContext('2d');
    const bars = 180;
    const samplesPerBar = Math.max(1, Math.floor(channel.length / bars));
    context.clearRect(0, 0, waveformCanvas.width, waveformCanvas.height);
    context.strokeStyle = '#c9ef43';
    context.lineWidth = 2;
    for (let index = 0; index < bars; index += 1) {
      let peak = 0;
      const start = index * samplesPerBar;
      for (let sample = start; sample < Math.min(start + samplesPerBar, channel.length); sample += 1) peak = Math.max(peak, Math.abs(channel[sample]));
      const height = Math.max(3, peak * waveformCanvas.height * .8);
      const x = index / bars * waveformCanvas.width;
      context.globalAlpha = .35 + peak * .7;
      context.beginPath();
      context.moveTo(x, waveformCanvas.height / 2 - height / 2);
      context.lineTo(x, waveformCanvas.height / 2 + height / 2);
      context.stroke();
    }
    context.globalAlpha = 1;
    await audioContext.close();
  } catch {
    drawFallbackWaveform();
  }
}

if (timelineVideo) {
  timelineVideo.addEventListener('loadedmetadata', () => {
    timelineRange.max = timelineVideo.duration;
    timelineRange.value = 0;
    drawFallbackWaveform();
    drawCurrentFrame();
    renderFrameStrip();
    renderWaveform();
  });
  timelineVideo.addEventListener('loadeddata', drawCurrentFrame);
  timelineVideo.addEventListener('seeked', drawCurrentFrame);
  timelineVideo.addEventListener('timeupdate', drawCurrentFrame);
  timelineVideo.addEventListener('play', () => { timelinePlay.dataset.playing = 'true'; });
  timelineVideo.addEventListener('pause', () => { timelinePlay.dataset.playing = 'false'; });
  timelineRange.addEventListener('input', () => {
    timelineVideo.pause();
    timelineVideo.currentTime = Number(timelineRange.value);
    drawCurrentFrame();
  });
  timelinePlay.addEventListener('click', () => {
    if (timelineVideo.paused) timelineVideo.play().catch(() => {});
    else timelineVideo.pause();
  });
}
