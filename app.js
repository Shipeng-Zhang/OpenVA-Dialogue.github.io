const cards = [...document.querySelectorAll('.demo-card')];
const tabs = [...document.querySelectorAll('.filter-tab')];
const modal = document.querySelector('#videoModal');
const modalVideo = document.querySelector('#modalVideo');
const modalTitle = document.querySelector('#modalTitle');
const modalEyebrow = document.querySelector('#modalEyebrow');
let activePreview = null;

function getVideoSource(video) {
  return video?.dataset.src || video?.getAttribute('src') || '';
}
function loadVideo(video, preload = 'metadata') {
  if (!video || video.hasAttribute('src')) return video;
  const source = getVideoSource(video);
  if (!source) return video;
  video.preload = preload;
  video.src = source;
  video.load();
  return video;
}

function playWhenReady(video, shouldPlay = () => true, preload = 'auto') {
  loadVideo(video, preload);
  if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
    if (shouldPlay()) video.play().catch(() => {});
    return;
  }
  video.addEventListener('canplay', () => {
    if (shouldPlay()) video.play().catch(() => {});
  }, { once: true });
}

function updateFilter(filter) {
  cards.forEach((card) => {
    const visible = filter === 'all' || card.dataset.category === filter;
    card.classList.toggle('is-hidden', !visible);
  });
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

function openVideoModal(source, title, label) {
  if (!source) return;
  if (activePreview) {
    activePreview.pause();
    activePreview = null;
  }
  modalVideo.src = source;
  modalVideo.preload = 'auto';
  modalTitle.textContent = title;
  modalEyebrow.textContent = label;
  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');
  document.body.classList.add('modal-open');
  modalVideo.play().catch(() => {});
}

function openModal(card) {
  const video = card.querySelector('video');
  const title = card.querySelector('h3')?.textContent || card.dataset.title;
  const label = card.querySelector('.card-tag')?.textContent || 'OPENVA-DIALOGUE DEMO';
  openVideoModal(getVideoSource(video), title, label);
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
    playWhenReady(video, () => activePreview === video && !modal.classList.contains('open'), 'metadata');
  });
  card.querySelector('.card-media').addEventListener('mouseleave', () => {
    video.pause();
    if (activePreview === video) activePreview = null;
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
const compareMedia = document.querySelector('.compare-ours .compare-media');
const compareVideo = compareMedia?.querySelector('video');
if (compareMedia && compareVideo) {
  const openComparison = () => openVideoModal(
    getVideoSource(compareVideo),
    'OpenVA-Dialogue',
    'QUALITATIVE COMPARISON / OURS',
  );
  compareMedia.addEventListener('click', openComparison);
  compareMedia.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      openComparison();
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
    viduVideo.tabIndex = 0;
    viduVideo.setAttribute('role', 'button');
    viduPlaceholder.style.display = 'none';
    if (viduStatus) {
      viduStatus.classList.remove('status-muted');
      viduStatus.textContent = 'VIEW LARGE ↗';
    }
  });

  const openViduComparison = () => {
    if (!viduVideo.src) return;
    openVideoModal(viduVideo.src, 'Vidu S1', 'QUALITATIVE COMPARISON / BASELINE');
  };
  viduVideo.addEventListener('click', openViduComparison);
  viduVideo.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      openViduComparison();
    }
  });
}
