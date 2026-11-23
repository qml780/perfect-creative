(() => {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const behavior = () => reduced.matches ? 'instant' : 'smooth';
  const scope = document.querySelector('main#content');
  const progress = document.querySelector('[data-progress]');
  let frame = 0;

  function renderScroll() {
    frame = 0;
    const range = document.documentElement.scrollHeight - innerHeight;
    if (progress) progress.style.transform = `scaleX(${range > 0 ? Math.min(1, scrollY/range) : 0})`;
  }

  const scheduleScroll = () => {
    if (!frame) frame = requestAnimationFrame(renderScroll);
  };
  addEventListener('scroll', scheduleScroll, { passive:true });
  addEventListener('resize', scheduleScroll);
  scheduleScroll();

  const viewer = document.querySelector('[data-lectern-viewer]');
  if (viewer) {
    const start = viewer.querySelector('[data-viewer-start]');
    const status = viewer.querySelector('[data-viewer-status]');
    let loading = false;
    let attempts = 0;
    const load = async () => {
      if (loading) return;
      loading = true;
      start.hidden = true;
      status.textContent = viewer.dataset.lang==='zh' ? '正在加载 3D…' : 'Loading 3D…';
      try {
        const script = [...document.scripts].find(item => new URL(item.src,location.href).pathname.endsWith('/site.js'));
        const viewerURL = new URL('lectern-viewer.js', script?.src || location.origin+'/site.js');
        viewerURL.searchParams.set('attempt',String(++attempts));
        const viewerModule = await import(viewerURL.href);
        await viewerModule.mountViewer(viewer);
        status.textContent = '';
      } catch {
        loading = false;
        start.hidden = false;
        start.textContent = viewer.dataset.lang==='zh' ? '重新加载 3D' : 'Retry 3D view';
        status.textContent = viewer.dataset.lang==='zh' ? '3D 暂时无法加载，可继续查看产品图片。' : '3D is unavailable. Product photography is shown instead.';
      }
    };
    start.addEventListener('click',load);
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver(entries => {
        if (entries.some(entry => entry.isIntersecting)) {
          observer.disconnect();
          load();
        }
      },{rootMargin:'150px'});
      observer.observe(viewer);
    }
  }

  if ('IntersectionObserver' in window) {
    const sequences = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (entry.intersectionRatio < .3) continue;
        entry.target.closest('[data-sequence]').classList.add('sequence-visible');
        sequences.unobserve(entry.target);
      }
    }, { threshold:.3, rootMargin:'-60px 0px -8% 0px' });
    document.querySelectorAll('[data-sequence] [data-enter-title]').forEach(element => {
      const group = element.closest('[data-sequence]');
      group.classList.add('sequence-ready');
      group.addEventListener('focusin', () => {
        group.classList.add('sequence-visible', 'sequence-immediate');
        sequences.unobserve(element);
      }, { once:true });
      sequences.observe(element);
    });
  }

  const menu = document.querySelector('[data-menu]');
  const openMenu = document.querySelector('[data-menu-open]');
  if (menu && openMenu) {
    openMenu.addEventListener('click', () => {
      menu.showModal();
      document.body.style.overflow = 'hidden';
    });
    menu.querySelector('[data-menu-close]').addEventListener('click', () => menu.close());
    menu.addEventListener('close', () => {
      document.body.style.overflow = '';
      openMenu.focus({ preventScroll:true });
    });
    matchMedia('(min-width:901px)').addEventListener('change', event => {
      if (event.matches && menu.open) menu.close();
    });
  }
  document.querySelector('[data-top]')?.addEventListener('click', () => {
    scrollTo({ top:0, behavior:behavior() });
    document.querySelector('.brand')?.focus({ preventScroll:true });
  });

  const steps = [...document.querySelectorAll('[data-step]')];
  const assembly = document.querySelector('[data-assembly]');
  if (steps.length && assembly) {
    const panels = [...assembly.querySelectorAll('[data-panel]')];
    function selectStep(id) {
      const active = steps.find(step => step.dataset.step === id) || steps[0];
      for (const step of steps) {
        if (step === active) step.setAttribute('aria-current','step');
        else step.removeAttribute('aria-current');
      }
      for (const panel of panels) panel.hidden = panel.dataset.panel !== active.dataset.step;
    }
    const readHash = () => selectStep(location.hash.slice(1));
    readHash();
    assembly.dataset.ready = '';
    for (const step of steps) {
      step.addEventListener('click', event => {
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        event.preventDefault();
        if (location.hash !== step.hash) history.pushState(null,'',step.hash);
        selectStep(step.dataset.step);
      });
    }
    addEventListener('hashchange', readHash);
    addEventListener('popstate', readHash);
    if (steps.some(step => step.hash===location.hash)) {
      requestAnimationFrame(() => document.getElementById('construction')?.scrollIntoView({behavior:'instant'}));
    }
  }

  const gallery = document.querySelector('[data-gallery]');
  if (gallery) {
    const track = gallery.querySelector('[data-track]');
    const cards = [...track.querySelectorAll('article')];
    const dots = [...gallery.querySelectorAll('[data-dot]')];
    const prev = gallery.querySelector('[data-gallery-prev]');
    const next = gallery.querySelector('[data-gallery-next]');
    let active = 0;
    const itemLeft = card => card.offsetLeft - cards[0].offsetLeft;
    function update(index) {
      active = index;
      dots.forEach((dot,i) => {
        if (i===index) dot.setAttribute('aria-current','true');
        else dot.removeAttribute('aria-current');
      });
      if (prev && next) { prev.disabled = !index; next.disabled = index===cards.length-1; }
    }
    function go(index) {
      const bounded = Math.max(0, Math.min(index,cards.length-1));
      track.scrollTo({ left:itemLeft(cards[bounded]), behavior:behavior() });
    }
    track.addEventListener('scroll', () => {
      const closest = cards.reduce((best,card,i) => Math.abs(itemLeft(card)-track.scrollLeft) < Math.abs(itemLeft(cards[best])-track.scrollLeft) ? i : best, 0);
      update(closest);
    }, { passive:true });
    track.addEventListener('keydown', event => {
      if (event.target!==track || !['ArrowRight','ArrowLeft','Home','End'].includes(event.key)) return;
      event.preventDefault();
      go({ArrowRight:active+1,ArrowLeft:active-1,Home:0,End:cards.length-1}[event.key]);
    });
    dots.forEach((dot,i) => dot.addEventListener('click', () => go(i)));
    prev?.addEventListener('click', () => go(active-1));
    next?.addEventListener('click', () => go(active+1));
    update(0);
  }

  const detail = scope?.querySelector('.detail-photo img');
  const thumbs = [...document.querySelectorAll('[data-photo]')];
  if (detail) for (const thumb of thumbs) {
    thumb.addEventListener('click', event => {
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      detail.src = thumb.dataset.photo;
      thumbs.forEach(link => link.removeAttribute('aria-current'));
      thumb.setAttribute('aria-current','true');
    });
  }

  const form = document.querySelector('[data-inquiry]');
  const output = form?.querySelector('[data-form-status]');
  if (form && output) {
    const zh = output.dataset.zh==='1';
    const button = form.querySelector('button[type=submit],button:not([type])');
    form.addEventListener('submit', async event => {
      event.preventDefault();
      button.disabled = true;
      delete output.dataset.error;
      output.textContent = zh ? '正在提交…' : 'Submitting…';
      try {
        const response = await fetch(form.action, {
          method:'POST', body:new FormData(form)
        });
        const result = await response.json();
        if (!response.ok) {
          const details = (Array.isArray(result.fields) && result.fields.length && !zh) ? ` (${result.fields.join(', ')})` : '';
          const error = response.status===429 ? (zh?'提交过于频繁，请稍候。':'Please wait before trying again.') : response.status===503 ? (zh?'询盘未开放。':'Inquiry service is not configured.') : (zh?'请核对表单内容后重试。':'Check the form and try again.')+details;
          throw new Error(error);
        }
        form.reset();
        output.textContent = (zh ? '演示询盘已保存。编号 ' : 'Demo inquiry saved. Reference ') + result.reference;
      } catch (error) {
        output.dataset.error = '';
        output.textContent = error instanceof TypeError ? (zh?'网络连接失败，请重试。':'Connection failed. Try again.') : error.message;
      } finally {
        button.disabled = false;
      }
    });
  }
})();
