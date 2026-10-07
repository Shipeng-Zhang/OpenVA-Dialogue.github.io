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
