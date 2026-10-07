const VIDEO_DATABASE = [
      {
        id: 'v_mp4_1',
        src: 'https://www.xxxfollow.com/media/fans/post_public/3678/36780737/1266255_uhd.mp4',
        user: '@bstream',
        displayName: 'Bstream hot',
        avatar: 'https://i.picasion.com/pic93/aa1ee2ed2e6aabfe840c17dcbb4d4021.gif',
        coverImage: 'https://i.picasion.com/pic93/3d0ce54a7f007e896296d4601cc9cb42.gif',
        messageLink: 'https://cinematic2026.github.io/BStream-chat/',
        plataforma: 'BStream',
        caption: 'Caliente y cachonda #caliente #mujer #biblioteca',
        tags: ['#familia', '#caliente', 'porno'],
        views: 'Oficial',
        likes: '2M'
      },
      {
        id: 'v_mp4_2',
        src: 'https://cdn.xfree.com/xfree-prod/1/6/c/16c4a3fd-ef52-474f-b1db-67d78481fa66/full.mp4',
        user: '@bstream',
        displayName: 'Bstream hot',
        avatar: 'https://i.picasion.com/pic93/aa1ee2ed2e6aabfe840c17dcbb4d4021.gif',
        coverImage: 'https://i.picasion.com/pic93/3d0ce54a7f007e896296d4601cc9cb42.gif',
        messageLink: 'https://cinematic2026.github.io/BStream-chat/',
        plataforma: 'BStream',
        caption: '3 mujetes un hombre #trio #mujeres #porno',
        tags: ['#hombre', '#trio', '#porno'],
        views: 'Oficial',
        likes: '2M'
      },
      {
        id: 'v_mp4_3',
        src: 'https://www.xxxfollow.com/media/fans/post_public/4084/40849583/1510476_fhd.mp4',
        user: '@bstream',
        displayName: 'Bstream hot',
        avatar: 'https://i.picasion.com/pic93/aa1ee2ed2e6aabfe840c17dcbb4d4021.gif',
        coverImage: 'https://i.picasion.com/pic93/3d0ce54a7f007e896296d4601cc9cb42.gif',
        messageLink: 'https://cinematic2026.github.io/BStream-chat/',
        plataforma: 'BStream',
        caption: 'Lo que me va a entrar #verga #cuca #trio #teta',
        tags: ['#teta', '#mujer', '#amante'],
        views: 'Oficial',
        likes: '2M'
      },
      {
        id: 'v_mp4_4',
        src: 'https://cdn.xfree.com/xfree-prod/0/3/9/039de276-f200-48d3-9ca1-0040dd36f671/full.mp4',
        user: '@bstream',
        displayName: 'Bstream hot',
        avatar: 'https://i.picasion.com/pic93/aa1ee2ed2e6aabfe840c17dcbb4d4021.gif',
        coverImage: 'https://i.picasion.com/pic93/3d0ce54a7f007e896296d4601cc9cb42.gif',
        messageLink: 'https://cinematic2026.github.io/BStream-chat/',
        plataforma: 'BStream',
        caption: 'Wow que morena #morena #vaginal',
        tags: ['#morena', '#vagina', '#verga'],
        views: 'Oficial',
        likes: '2M'
      },
    ];

    let db;
    let currentActiveVideo = null;
    let isGlobalMuted = false; // MODIFICADO: Por defecto en falso para activar el sonido
    let feedQueue = [];
    let currentFeedMode = 'foryou';
    let isContextualFeedActive = false;
    let hasUserInteracted = false; // Control para desbloqueo de audio por políticas del navegador

    let tapTimer = null;
    let lastTapTime = 0;
    let currentProfileUser = null;
    let currentProfileTab = 'videos';
    let currentProfileMessageUrl = 'https://t.me/TuGrupoTelegram';

    function initDB() {
      return new Promise((resolve) => {
        const req = indexedDB.open('TikTokProDB_v7', 1);
        req.onupgradeneeded = (e) => {
          const d = e.target.result;
          if (!d.objectStoreNames.contains('likes')) d.createObjectStore('likes');
          if (!d.objectStoreNames.contains('favorites')) d.createObjectStore('favorites');
          if (!d.objectStoreNames.contains('follows')) d.createObjectStore('follows');
          if (!d.objectStoreNames.contains('settings')) d.createObjectStore('settings');
        };
        req.onsuccess = (e) => { db = e.target.result; resolve(); };
      });
    }

    function dbSet(store, key, val) {
      return new Promise((resolve) => {
        if (!db) return resolve();
        const tx = db.transaction(store, 'readwrite');
        const st = tx.objectStore(store);
        if (val !== null && val !== undefined) st.put(val, key);
        else st.delete(key);
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      });
    }

    function dbGet(store, key) {
      return new Promise((resolve) => {
        if (!db) return resolve(null);
        const tx = db.transaction(store, 'readonly');
        const req = tx.objectStore(store).get(key);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => resolve(null);
      });
    }

    function dbGetAll(store) {
      return new Promise((resolve) => {
        if (!db) return resolve([]);
        const tx = db.transaction(store, 'readonly');
        const req = tx.objectStore(store).getAllKeys();
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => resolve([]);
      });
    }

    async function switchFeedTab(mode) {
      if (currentFeedMode === mode && !isContextualFeedActive) return;
      currentFeedMode = mode;
      isContextualFeedActive = false;
      restoreMainHeader();

      document.getElementById('feed-tab-foryou').classList.toggle('active', mode === 'foryou');
      document.getElementById('feed-tab-following').classList.toggle('active', mode === 'following');

      await renderFeed();
    }

    async function generateSmartFeed() {
      const followedUsers = await dbGetAll('follows');
      if (currentFeedMode === 'following') {
        const followingVideos = VIDEO_DATABASE.filter(v => followedUsers.includes(v.user.toLowerCase()));
        return followingVideos.map(video => ({ video, score: Math.random() }))
                              .sort((a, b) => b.score - a.score)
                              .map(item => item.video);
      }

      const likedIds = await dbGetAll('likes');
      const favIds = await dbGetAll('favorites');
      const tagAffinity = {};

      VIDEO_DATABASE.forEach(v => {
        const isLiked = likedIds.includes(v.id);
        const isFav = favIds.includes(v.id);
        v.tags.forEach(t => {
          if (!tagAffinity[t]) tagAffinity[t] = 0;
          if (isLiked) tagAffinity[t] += 3;
          if (isFav) tagAffinity[t] += 5;
        });
      });

      const scoredVideos = VIDEO_DATABASE.map(video => {
        let score = 0;
        video.tags.forEach(t => { score += (tagAffinity[t] || 0); });
        return { video, score: score + (Math.random() * 10) };
      });

      scoredVideos.sort((a, b) => b.score - a.score);
      return scoredVideos.map(item => item.video);
    }

    function formatCaption(caption) {
      return caption.replace(/(#\w+)/g, '<span class="hashtag" onclick="navigateTo(\'hashtag\', { tag: \'$1\' })">$1</span>');
    }

    function showToast(msg) {
      const t = document.getElementById('toast');
      t.innerText = msg;
      t.classList.add('show');
      setTimeout(() => t.classList.remove('show'), 2400);
    }

    function navigateTo(tab, params = {}, pushHistory = true) {
      const state = { tab, ...params };
      let urlObj = new URL(window.location.href);
      urlObj.search = '';
      urlObj.searchParams.set('tab', tab);

      if (params.q) urlObj.searchParams.set('q', params.q);
      if (params.user) urlObj.searchParams.set('user', params.user);
      if (params.tag) urlObj.searchParams.set('tag', params.tag);
      if (params.contextual) urlObj.searchParams.set('contextual', '1');

      if (pushHistory) history.pushState(state, '', urlObj.toString());
      applyRouteState(state);
    }

    async function applyRouteState(state) {
      const tab = state.tab || 'home';
      closeBottomSheet();
      closeDonationsModalPro();
      closeTermsModal();

      document.body.classList.remove('jugador-active');

      if (tab !== 'home' && tab !== 'contextual' && currentActiveVideo) {
        currentActiveVideo.pause();
      }

      document.querySelectorAll('.sub-view').forEach(v => v.classList.remove('active'));
      document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));

      if (tab === 'search') {
        isContextualFeedActive = false;
        document.getElementById('search-view').classList.add('active');
        document.querySelectorAll('.nav-item')[1].classList.add('active');
        if (state.q) {
          document.getElementById('search-box').value = state.q;
          handleSearch(state.q);
        } else {
          handleSearch('');
        }
      } else if (tab === 'favs') {
        isContextualFeedActive = false;
        document.getElementById('favs-view').classList.add('active');
        document.querySelectorAll('.nav-item')[2].classList.add('active');
        await renderFavoritesView();
      } else if (tab === 'profile') {
        isContextualFeedActive = false;
        document.getElementById('profile-view').classList.add('active');
        await renderProfileView(state.user || '@mi.real.favorito');
      } else if (tab === 'hashtag') {
        isContextualFeedActive = false;
        document.getElementById('hashtag-title').innerText = state.tag || '#hashtag';
        renderHashtagResults(state.tag || '');
        document.getElementById('hashtag-view').classList.add('active');
      } else if (tab === 'contextual') {
        if (state.items && state.items.length > 0) {
          await playContextualFeed(state.items, state.videoId, state.title || 'Videos', false);
        } else {
          navigateTo('home', {}, false);
        }
      } else {
        isContextualFeedActive = false;
        document.querySelectorAll('.nav-item')[0].classList.add('active');
        restoreMainHeader();
        await renderFeed();
        if (currentActiveVideo) {
          currentActiveVideo.muted = isGlobalMuted;
          currentActiveVideo.play().catch(() => {});
        }
      }
    }

    window.addEventListener('popstate', (e) => {
      if (e.state) {
        applyRouteState(e.state);
      } else {
        parseInitialURL();
      }
    });

    function parseInitialURL() {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get('tab') || 'home';
      navigateTo(tab, {
        q: params.get('q') || '',
        user: params.get('user') || '',
        tag: params.get('tag') || ''
      }, false);
    }

    async function handleHomeClick() {
      isContextualFeedActive = false;
      restoreMainHeader();
      navigateTo('home');
      await renderFeed();
    }

    function setContextualHeader(title) {
      isContextualFeedActive = true;
      document.getElementById('header-main-tabs').style.display = 'none';
      const ctx = document.getElementById('header-contextual');
      ctx.style.display = 'flex';
      document.getElementById('contextual-header-title').innerText = title;
    }

    function restoreMainHeader() {
      document.getElementById('header-contextual').style.display = 'none';
      document.getElementById('header-main-tabs').style.display = 'flex';
    }

    function goBackFromContextualFeed() {
      isContextualFeedActive = false;
      restoreMainHeader();
      history.back();
    }

    async function playContextualFeed(items, videoId, contextualTitle, pushHistory = true) {
      setContextualHeader(contextualTitle);
      const index = items.findIndex(i => i.id === videoId);
      let orderedItems = index > -1 ? [...items.slice(index), ...items.slice(0, index)] : items;

      document.querySelectorAll('.sub-view').forEach(v => v.classList.remove('active'));
      document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
      document.querySelectorAll('.nav-item')[0].classList.add('active');

      if (pushHistory) {
        const state = {
          tab: 'contextual',
          items: orderedItems,
          videoId: videoId,
          title: contextualTitle
        };
        let urlObj = new URL(window.location.href);
        urlObj.searchParams.set('tab', 'contextual');
        urlObj.searchParams.set('v', videoId);
        history.pushState(state, '', urlObj.toString());
      }

      await renderFeed(orderedItems);
      document.getElementById('feed-container').scrollTop = 0;
    }

    async function renderFeed(customQueue = null) {
      const container = document.getElementById('feed-container');
      container.innerHTML = '';

      if (customQueue) feedQueue = customQueue;
      else if (!isContextualFeedActive) feedQueue = await generateSmartFeed();

      if (feedQueue.length === 0 && currentFeedMode === 'following' && !isContextualFeedActive) {
        container.innerHTML = `
          <div class="empty-state">
            <iconify-icon icon="ph:users-duotone"></iconify-icon>
            <h3>Sin cuentas seguidas</h3>
            <p>Sigue a creadores para ver sus publicaciones directas aquí.</p>
          </div>
        `;
        return;
      }

      feedQueue.forEach((item, index) => {
        const card = document.createElement('div');
        card.className = 'video-card';
        card.id = `card-${item.id}`;

        const preloadMode = index <= 1 ? 'auto' : 'metadata';

        card.innerHTML = `
          <video src="${item.src}" loop playsinline muted="${isGlobalMuted}" preload="${preloadMode}"></video>
          <div class="play-pause-badge" id="pause-badge-${item.id}">
            <iconify-icon icon="ph:play-fill"></iconify-icon>
          </div>
          <div class="video-details">
            <div class="username" onclick="navigateTo('profile', { user: '${item.user}' })">
              <span>${item.user}</span>
              <iconify-icon icon="ph:seal-check-fill" style="color:var(--cyan); font-size:16px;"></iconify-icon>
            </div>
            <div class="caption">${formatCaption(item.caption)}</div>
          </div>
          <div class="side-actions">
            <div class="avatar-action-wrapper" onclick="navigateTo('profile', { user: '${item.user}' })">
              <img src="${item.avatar}" alt="${item.user}" class="action-avatar-img">
            </div>
            <button class="action-btn" id="like-btn-${item.id}" onclick="toggleLike('${item.id}')">
              <iconify-icon icon="ph:heart-fill"></iconify-icon>
            </button>
            <button class="action-btn" id="fav-btn-${item.id}" onclick="toggleFavorite('${item.id}')">
              <iconify-icon icon="ph:bookmark-simple-fill"></iconify-icon>
            </button>
            <button class="action-btn" onclick="togglePlayerMode(event)">
              <iconify-icon icon="ph:corners-out-bold"></iconify-icon>
              <span>Jugador</span>
            </button>
            <button class="action-btn" onclick="openBottomSheet('${item.id}')">
              <iconify-icon icon="ph:dots-three-bold"></iconify-icon>
            </button>
          </div>
        `;

        card.addEventListener('click', (e) => {
          if (e.target.closest('.side-actions') || e.target.closest('.video-details')) return;
          
          if (document.body.classList.contains('jugador-active')) {
            document.body.classList.remove('jugador-active');
            return;
          }

          const now = Date.now();
          if (now - lastTapTime < 280 && now - lastTapTime > 0) {
            clearTimeout(tapTimer);
            handleDoubleTapLike(card, e.clientX, e.clientY, item.id);
          } else {
            tapTimer = setTimeout(() => togglePlayPause(card, item.id), 280);
          }
          lastTapTime = now;
        });

        container.appendChild(card);
      });

      hydrateCardStates();
      setupIntersectionObserver();
    }

    async function hydrateCardStates() {
      for (let item of feedQueue) {
        const isLiked = await dbGet('likes', item.id);
        const isFav = await dbGet('favorites', item.id);
        if (isLiked) document.getElementById(`like-btn-${item.id}`)?.classList.add('liked');
        if (isFav) document.getElementById(`fav-btn-${item.id}`)?.classList.add('favorited');
      }
    }

    function togglePlayerMode(e) {
      if (e) e.stopPropagation();
      document.body.classList.toggle('jugador-active');
      showToast(document.body.classList.contains('jugador-active') ? 'Modo Jugador activado' : 'Modo Jugador desactivado');
    }

    function togglePlayPause(card, id) {
      const video = card.querySelector('video');
      const badge = document.getElementById(`pause-badge-${id}`);
      if (!video) return;

      if (video.paused) {
        video.play().then(() => badge?.classList.remove('visible')).catch(() => {});
      } else {
        video.pause();
        badge?.classList.add('visible');
      }
    }

    async function handleDoubleTapLike(card, x, y, videoId) {
      const heart = document.createElement('iconify-icon');
      heart.setAttribute('icon', 'ph:heart-fill');
      heart.className = 'floating-heart';
      heart.style.left = x + 'px';
      heart.style.top = y + 'px';
      card.appendChild(heart);
      setTimeout(() => heart.remove(), 800);

      if (!(await dbGet('likes', videoId))) toggleLike(videoId);
    }

    function setupIntersectionObserver() {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          const card = entry.target;
          const video = card.querySelector('video');

          if (entry.isIntersecting && video) {
            if (currentActiveVideo && currentActiveVideo !== video) {
              currentActiveVideo.pause();
              currentActiveVideo.ontimeupdate = null;
            }
            document.getElementById('global-progress-fill').style.width = '0%';
            document.getElementById('global-time-display').innerText = '0:00 / 0:00';
            currentActiveVideo = video;
            video.muted = isGlobalMuted;
            video.preload = 'auto';
            bindPlayerEvents(video);
            video.play().catch(() => {
              // Si el navegador bloquea el audio en la primer carga automatica, se silencia temporalmente y se reintenta reproducir
              if (!hasUserInteracted) {
                video.muted = true;
                isGlobalMuted = true;
                updateVolumeIconUI();
                video.play().catch(() => {});
              }
            });
          } else if (video && currentActiveVideo !== video) {
            video.pause();
            video.ontimeupdate = null;
          }
        });
      }, { 
        threshold: 0.6, 
        rootMargin: '300px 0px 300px 0px' 
      });

      document.querySelectorAll('.video-card').forEach(card => observer.observe(card));
    }

    function bindPlayerEvents(video) {
      const fill = document.getElementById('global-progress-fill');
      const timeTxt = document.getElementById('global-time-display');

      const updateUI = () => {
        if (video !== currentActiveVideo) return;
        if (video.duration && !isNaN(video.duration)) {
          fill.style.width = ((video.currentTime / video.duration) * 100) + '%';
          timeTxt.innerText = formatTime(video.currentTime) + ' / ' + formatTime(video.duration);
        }
      };
      video.ontimeupdate = updateUI;
      video.onloadedmetadata = updateUI;
    }

    function formatTime(sec) {
      if (isNaN(sec)) return '0:00';
      return Math.floor(sec / 60) + ':' + (Math.floor(sec % 60) < 10 ? '0' : '') + Math.floor(sec % 60);
    }

    let isDraggingProgress = false;
    const progressWrap = document.getElementById('global-progress-wrap');

    function updateVideoProgressFromPointer(e) {
      if (!currentActiveVideo || !currentActiveVideo.duration) return;
      const rect = progressWrap.getBoundingClientRect();
      const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      currentActiveVideo.currentTime = pos * currentActiveVideo.duration;
      document.getElementById('global-progress-fill').style.width = (pos * 100) + '%';
    }

    if (progressWrap) {
      progressWrap.addEventListener('pointerdown', (e) => {
        isDraggingProgress = true;
        progressWrap.setPointerCapture(e.pointerId);
        updateVideoProgressFromPointer(e);
      });

      progressWrap.addEventListener('pointermove', (e) => {
        if (isDraggingProgress) updateVideoProgressFromPointer(e);
      });

      progressWrap.addEventListener('pointerup', (e) => {
        if (isDraggingProgress) {
          isDraggingProgress = false;
          try { progressWrap.releasePointerCapture(e.pointerId); } catch(err){}
        }
      });
    }

    async function toggleLike(id) {
      const btn = document.getElementById('like-btn-' + id);
      const current = await dbGet('likes', id);
      await dbSet('likes', id, current ? null : true);
      btn?.classList.toggle('liked', !current);
      
      if (document.getElementById('profile-view').classList.contains('active')) {
        renderProfileGrid();
        if (currentProfileUser) {
           const likedIds = await dbGetAll('likes');
           const userVideos = VIDEO_DATABASE.filter(v => v.user.toLowerCase() === currentProfileUser.toLowerCase());
           const myLikesCount = userVideos.filter(v => likedIds.includes(v.id)).length;
           document.getElementById('profile-stat-mislikes').innerText = myLikesCount;
        }
      }
    }

    async function toggleFavorite(id) {
      const btn = document.getElementById('fav-btn-' + id);
      const current = await dbGet('favorites', id);
      await dbSet('favorites', id, current ? null : true);
      btn?.classList.toggle('favorited', !current);
      showToast(current ? 'Eliminado de favoritos' : 'Guardado en favoritos');
      if (document.getElementById('favs-view').classList.contains('active')) renderFavoritesView();
    }

    async function toggleFollowUser(username) {
      const clean = username.toLowerCase();
      const current = await dbGet('follows', clean);
      await dbSet('follows', clean, current ? null : true);
      showToast(current ? `Dejaste de seguir a ${username}` : `¡Ahora sigues a ${username}!`);
      if (currentProfileUser && currentProfileUser.toLowerCase() === clean) updateProfileFollowButton(!current);
      if (!isContextualFeedActive) await renderFeed();
    }

    async function toggleFollowCurrentProfile() {
      if (currentProfileUser) await toggleFollowUser(currentProfileUser);
    }

    function updateProfileFollowButton(isFollowed) {
      const btn = document.getElementById('btn-profile-follow');
      const txt = document.getElementById('txt-profile-follow');
      if (!btn || !txt) return;
      btn.classList.toggle('following', isFollowed);
      txt.innerText = isFollowed ? 'Siguiendo' : 'Seguir';
    }

    async function renderProfileView(username) {
      currentProfileUser = username;
      const userVideo = VIDEO_DATABASE.find(v => v.user.toLowerCase() === username.toLowerCase());

      const displayName = userVideo ? (userVideo.displayName || userVideo.user.replace('@', '')) : username.replace('@', '');
      const coverImg = userVideo ? (userVideo.coverImage || 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?q=80&w=1200&auto=format&fit=crop') : 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?q=80&w=1200&auto=format&fit=crop';
      const avatarImg = userVideo ? userVideo.avatar : 'https://i.picasion.com/pic93/aa1ee2ed2e6aabfe840c17dcbb4d4021.gif';
      
      currentProfileMessageUrl = userVideo ? (userVideo.messageLink || 'https://t.me/TuGrupoTelegram') : 'https://t.me/TuGrupoTelegram';

      document.getElementById('profile-card-displayname').innerText = displayName;
      document.getElementById('profile-card-username').innerText = username;
      document.getElementById('profile-card-avatar').src = avatarImg;
      document.getElementById('profile-banner-bg').style.backgroundImage = `url('${coverImg}')`;

      const userVideos = VIDEO_DATABASE.filter(v => v.user.toLowerCase() === username.toLowerCase());
      const likedIds = await dbGetAll('likes');
      const myLikesCount = userVideos.filter(v => likedIds.includes(v.id)).length;

      document.getElementById('profile-stat-videos').innerText = userVideos.length;
      document.getElementById('profile-stat-mislikes').innerText = myLikesCount;
      document.getElementById('profile-stat-platform').innerText = userVideo?.plataforma || 'BStream';

      updateProfileFollowButton(await dbGet('follows', username.toLowerCase()));
      switchProfileTab('videos');
    }

    function openProfileMessageLink() {
      if (currentProfileMessageUrl) {
        window.open(currentProfileMessageUrl, '_blank');
      } else {
        showToast('Abriendo enlace de mensajes...');
      }
    }

    function switchProfileTab(tab) {
      currentProfileTab = tab;
      document.getElementById('tab-user-videos-btn').classList.toggle('active', tab === 'videos');
      document.getElementById('tab-user-likes-btn').classList.toggle('active', tab === 'likes');
      renderProfileGrid();
    }

    async function renderProfileGrid() {
      const container = document.getElementById('profile-grid-results');
      const emptyState = document.getElementById('profile-empty');
      const likedIds = await dbGetAll('likes');
      const filtered = currentProfileTab === 'videos' ?
        VIDEO_DATABASE.filter(v => v.user.toLowerCase() === currentProfileUser.toLowerCase()) :
        VIDEO_DATABASE.filter(v => v.user.toLowerCase() === currentProfileUser.toLowerCase() && likedIds.includes(v.id));

      if (filtered.length === 0) {
        container.innerHTML = '';
        emptyState.style.display = 'flex';
      } else {
        emptyState.style.display = 'none';
        renderTikTokGrid(filtered, container, 'profile', currentProfileUser);
      }
    }

    function shareCurrentProfile() {
      const url = window.location.origin + window.location.pathname + '?tab=profile&user=' + encodeURIComponent(currentProfileUser);
      if (navigator.share) navigator.share({ title: 'Perfil TikTok Pro', url });
      else navigator.clipboard.writeText(url).then(() => showToast('¡Enlace del perfil copiado!'));
    }

    let activeVideoItem = null;
    function openBottomSheet(id) {
      activeVideoItem = VIDEO_DATABASE.find(v => v.id === id);
      document.getElementById('modal-overlay').classList.add('active');
      document.getElementById('bottom-sheet').classList.add('active');
    }

    function closeBottomSheet() {
      document.getElementById('modal-overlay').classList.remove('active');
      document.getElementById('bottom-sheet').classList.remove('active');
    }

    function shareVideoNative() {
      if (!activeVideoItem) return;
      const url = window.location.origin + window.location.pathname + '?v=' + activeVideoItem.id;
      if (navigator.share) navigator.share({ title: 'TikTok Video', url });
      else navigator.clipboard.writeText(url).then(() => showToast('¡Enlace copiado al portapapeles!'));
      closeBottomSheet();
    }

    function openDonationsModalPro() {
      closeBottomSheet();
      document.getElementById('donations-modal').classList.add('active');
    }

    function closeDonationsModalPro() {
      document.getElementById('donations-modal').classList.remove('active');
    }

    function openTermsModal() {
      document.getElementById('terms-modal').classList.add('active');
    }

    function closeTermsModal() {
      document.getElementById('terms-modal').classList.remove('active');
    }

    function clearAppData() {
      indexedDB.deleteDatabase('TikTokProDB_v7');
      showToast('Restableciendo datos y caché...');
      setTimeout(() => location.reload(), 1000);
    }

    function handleSearch(q) {
      const container = document.getElementById('search-results');
      const query = q.trim().toLowerCase();

      if (!query) {
        renderTikTokGrid(VIDEO_DATABASE, container, 'search');
        return;
      }
      
      const searchTerms = query.split(/\s+/); 

      const filtered = VIDEO_DATABASE.filter(item => {
        const searchableText = [
          item.user,
          item.displayName || '',
          item.caption,
          ...(item.tags || [])
        ].join(' ').toLowerCase();

        return searchTerms.every(term => searchableText.includes(term));
      });

      renderTikTokGrid(filtered, container, 'search');
    }

    function renderHashtagResults(tag) {
      renderTikTokGrid(VIDEO_DATABASE.filter(item => item.caption.toLowerCase().includes(tag.toLowerCase())), document.getElementById('hashtag-results'), 'hashtag');
    }

    async function renderFavoritesView() {
      const container = document.getElementById('favs-results');
      const emptyState = document.getElementById('favs-empty');
      const favIds = await dbGetAll('favorites');
      const items = VIDEO_DATABASE.filter(i => favIds.includes(i.id));

      document.getElementById('favs-counter').innerText = `${items.length} video${items.length !== 1 ? 's' : ''}`;
      if (items.length === 0) {
        container.innerHTML = '';
        emptyState.style.display = 'flex';
      } else {
        emptyState.style.display = 'none';
        renderTikTokGrid(items, container, 'favs');
      }
    }

    function renderTikTokGrid(items, container, type = 'search', extraArg = '') {
      container.innerHTML = '';
      if (items.length === 0) {
        container.innerHTML = `<div style="grid-column: span 2; text-align: center; color: var(--text-muted); font-size: 0.85rem; padding: 40px 0;">Sin resultados disponibles</div>`;
        return;
      }

      items.forEach(item => {
        const card = document.createElement('div');
        card.className = 'tiktok-card';
        card.onclick = () => {
          let title = 'Videos relacionados';
          if (type === 'profile') title = extraArg;
          else if (type === 'favs') title = 'Favoritos';
          else if (type === 'hashtag') title = extraArg || '#hashtag';
          playContextualFeed(items, item.id, title, true);
        };
        card.innerHTML = `
          <video src="${item.src}#t=0.5" preload="metadata" muted></video>
          <div class="tiktok-card-overlay">
            <div class="card-top-badge">
              <iconify-icon icon="ph:play-fill"></iconify-icon>
              <span>${item.views || '10K'}</span>
            </div>
            <div class="card-bottom-info">
              <div class="user-tag">${item.user}</div>
              <div class="caption-snip">${item.caption}</div>
            </div>
          </div>
        `;
        container.appendChild(card);
      });
    }

    async function initAudioPreference() {
      const savedMute = await dbGet('settings', 'audio_muted');
      if (savedMute !== null && savedMute !== undefined) {
        isGlobalMuted = savedMute;
      } else {
        isGlobalMuted = false; // Por defecto desmuteado
      }
      updateVolumeIconUI();
    }

    function updateVolumeIconUI() {
      const volIcon = document.getElementById('global-vol-icon');
      if (volIcon) volIcon.setAttribute('icon', isGlobalMuted ? 'ph:speaker-slash-fill' : 'ph:speaker-high-fill');
    }

    const volBtn = document.getElementById('global-vol-btn');
    if (volBtn) {
      volBtn.onclick = async () => {
        isGlobalMuted = !isGlobalMuted;
        await dbSet('settings', 'audio_muted', isGlobalMuted);
        updateVolumeIconUI();
        if (currentActiveVideo) {
          currentActiveVideo.muted = isGlobalMuted;
          currentActiveVideo.play().catch(() => {});
        }
        showToast(isGlobalMuted ? 'Audio silenciado' : 'Audio activado (Preferencia guardada)');
      };
    }

    // Detectar primera interacción global del usuario para liberar el sonido y reproducir con audio automáticamente
    window.addEventListener('pointerdown', () => {
      if (!hasUserInteracted) {
        hasUserInteracted = true;
        if (currentActiveVideo && isGlobalMuted === false) {
          currentActiveVideo.muted = false;
          currentActiveVideo.play().catch(() => {});
        }
      }
    }, { once: true });

    window.addEventListener('DOMContentLoaded', async () => {
      await initDB();
      await initAudioPreference();
      parseInitialURL();
    });
