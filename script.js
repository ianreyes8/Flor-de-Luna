/* =========================================================
   Flor de Luna — lógica de la tienda
   El carrito y los favoritos se guardan localmente en el navegador.
   ========================================================= */
(() => {
  'use strict';

  /* ---------- Utilidades ---------- */
  const $ = (s, r = document) => r.querySelector(s); const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const money = n => '$' + Number(n).toFixed(2);
  const norm = s => String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  const K = { cart: 'fdl_cart', favorites: 'fdl_favorites', theme: 'fdl_theme' };
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* sin almacenamiento */ } }
  };
  /* ---------- Catálogo (Actualizado con Flor.pdf) ---------- */
  const PRODUCTS = [
    { id: 'amatista', name: 'Amatista', image: 'Amatista.png', family: 'Floral', ml: 50, price: 55.49, notes: 'Aromas finos · Elegancia · Esencia', desc: 'Loción perfumada sofisticada y envolvente que refleja tu personalidad.', c1: '#e6d6fa', c2: '#8a5cd0' },
    { id: 'petalo-de-luna', name: 'Pétalo de Luna', image: 'Petalo_de_Luna.jpeg', family: 'Floral', ml: 50, price: 65.99, notes: 'Notas florales · Delicado · Larga duración', desc: 'Una fragancia única que despierta emociones y crea recuerdos inolvidables.', c1: '#d7c0f2', c2: '#5e3a96' },
    { id: 'besos-lavanda', name: 'Besos Lavanda', image: 'Besos_Lavanda.jpeg', family: 'Fresco', ml: 50, price: 55.00, notes: 'Lavanda · Esencia natural · Confort', desc: 'Tu esencia, tu sueño, tu historia en una loción perfumada única.', c1: '#e8dcf8', c2: '#c9a24b' },
    { id: 'dulce-aurora', name: 'Dulce Aurora', image: 'Dulce_Aurora.jpeg', family: 'Oriental', ml: 100, price: 50.59, notes: 'Vainilla · Notas dulces · Sensorial', desc: 'Perfuma tus sueños, enamora tus sentidos con gran durabilidad.', c1: '#ecd28f', c2: '#6a3fa3' },
    { id: 'luz-de-estrella', name: 'Luz de Estrella', image: 'Luz_de_Estrella.jpeg', family: 'Oriental', ml: 50, price: 52.59, notes: 'Vainilla dulce · Notas cálidas', desc: 'La belleza se admira, la esencia se recuerda bajo la luz de la luna.', c1: '#f0cfe6', c2: '#8e3f8f' },
    { id: 'sweet-lily', name: 'Sweet Lily', image: 'Sweet_Lily.jpeg', family: 'Floral', ml: 50, price: 65.99, notes: 'Lirio · Flores finas · Suavidad', desc: 'Una fragancia delicada que puede cambiarlo todo en tu día.', c1: '#cfc3ee', c2: '#4c3a86' },
    { id: 'luna-violeta', name: 'Luna Violeta', image: 'Luna_Violeta.jpeg', family: 'Oriental', ml: 100, price: 60.00, notes: 'Violeta · Notas profundas', desc: 'Una esencia que enamora con elegancia y carácter nocturno.', c1: '#c9a8ee', c2: '#3f2a73' },
    { id: 'flor-nocturna', name: 'Flor Nocturna', image: 'Flor_Nocturna.jpeg', family: 'Floral', ml: 50, price: 49.99, notes: 'Notas nocturnas · Misterio · Estela', desc: 'Deja que tu esencia hable por ti con esta loción perfumada.', c1: '#f2ecfb', c2: '#a98ad8' }
  ];
  const productImage = p => `Flor de luna/${p.image}`;
  const byId = id => PRODUCTS.find(p => p.id === id);
  const FILTERS = ['Todos', 'Floral', 'Oriental', 'Fresco', 'Favoritos'];
  const FREE_SHIP = 60, SHIP_COST = 4, MAX_QTY = 10;

  /* Frasco dibujado con SVG (original, sin imágenes externas) */
  function bottleSVG(p, ctx) {
    const g = `g-${p.id}-${ctx}`, gd = `gd-${p.id}-${ctx}`;
    return `<svg viewBox="0 0 120 160" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="${g}" x1="0" y1="0" x2="0.4" y2="1"><stop offset="0" stop-color="${p.c1}"/><stop offset="1" stop-color="${p.c2}"/></linearGradient>
        <linearGradient id="${gd}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#e6cd85"/><stop offset="1" stop-color="#8f6d22"/></linearGradient>
      </defs>
      <rect x="47" y="6" width="26" height="24" rx="5" fill="url(#${gd})"/>
      <rect x="53" y="29" width="14" height="12" fill="url(#${gd})" opacity=".85"/>
      <rect x="20" y="40" width="80" height="108" rx="24" fill="url(#${g})" stroke="url(#${gd})" stroke-width="1.5"/>
      <path d="M30 64c0-8 5-14 12-16" fill="none" stroke="#fff" stroke-width="3.5" stroke-linecap="round" opacity=".55"/>
      <path d="M62 82A14 14 0 0 0 62 110A18 18 0 0 1 62 82Z" fill="url(#${gd})"/>
      <rect x="40" y="123" width="40" height="1.5" fill="url(#${gd})" opacity=".8"/>
    </svg>`;
  }

  /* ---------- Estado ---------- */
  const state = {
    cart: sanitizeCart(store.get(K.cart, [])),
    favorites: sanitizeFavorites(store.get(K.favorites, [])),
    filter: 'Todos',
    query: ''
  };

  function sanitizeCart(raw) {
    if (!Array.isArray(raw)) return [];
    return raw
      .filter(i => i && byId(i.id))
      .map(i => ({ id: i.id, qty: Math.min(MAX_QTY, Math.max(1, parseInt(i.qty, 10) || 1)) }));
  }
  function sanitizeFavorites(raw) {
    return Array.isArray(raw) ? raw.filter(id => PRODUCTS.some(product => product.id === id)) : [];
  }

  /* ---------- Toasts ---------- */
  function toast(msg) {
    const t = document.createElement('div');
    t.className = 'toast';
    t.textContent = msg;
    $('#toasts').append(t);
    setTimeout(() => t.classList.add('out'), 2600);
    setTimeout(() => t.remove(), 3050);
  }

  /* ---------- Tema ---------- */
  function applyTheme(t) {
    document.documentElement.setAttribute('data-theme', t);
    const b = $('#btnTheme');
    b.setAttribute('aria-pressed', String(t === 'dark'));
    b.setAttribute('aria-label', t === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro');
  }
  applyTheme(document.documentElement.getAttribute('data-theme') || 'light');
  $('#btnTheme').addEventListener('click', () => {
    const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    try { localStorage.setItem(K.theme, next); } catch { /* ignorar */ }
  });

  const userWrap = $('.user-wrap');
  if (userWrap) userWrap.hidden = true;

  /* ---------- Favoritos ---------- */
  const getFavs = () => state.favorites;
  function toggleFav(id) {
    const added = !state.favorites.includes(id);
    state.favorites = added
      ? [...state.favorites, id]
      : state.favorites.filter(favorite => favorite !== id);
    store.set(K.favorites, state.favorites);
    toast(added ? 'Guardado en favoritos.' : 'Quitado de favoritos.');
    renderGrid();
  }

  /* ---------- Catálogo: filtros, búsqueda y render ---------- */
  function renderFilters() {
    $('#filters').innerHTML = FILTERS.map(f =>
      `<button type="button" class="chip${state.filter === f ? ' is-active' : ''}" data-filter="${f}" aria-pressed="${state.filter === f}">${f === 'Favoritos' ? '♥ ' : ''}${f}</button>`
    ).join('');
  }
  function setFilter(f) { state.filter = f; renderFilters(); renderGrid(); }

  $('#filters').addEventListener('click', e => {
    const b = e.target.closest('[data-filter]');
    if (!b) return;
    setFilter(b.dataset.filter);
  });

  function cardHTML(p, i) {
    const fav = getFavs().includes(p.id);
    return `<article class="card" style="animation-delay:${Math.min(i, 8) * 50}ms" data-id="${p.id}">
      <div class="card__media">
        <span class="card__tag">${p.family}</span>
        <button class="icon-btn fav" type="button" data-fav="${p.id}" aria-pressed="${fav}" aria-label="${fav ? 'Quitar' : 'Añadir'} ${esc(p.name)} ${fav ? 'de' : 'a'} favoritos"><svg class="ic"><use href="#i-heart"/></svg></button>
        <img class="card__image" src="${esc(productImage(p))}" alt="${esc(p.name)}" loading="lazy" decoding="async">
      </div>
      <div class="card__body">
        <h3 class="card__name">${p.name}</h3>
        <p class="card__notes">${p.notes}</p>
        <p class="card__desc">${p.desc}</p>
        <div class="card__foot">
          <p class="card__price">${money(p.price)}<small>${p.ml} ml</small></p>
          <button class="btn btn--primary btn--sm" type="button" data-add="${p.id}">Agregar</button>
        </div>
      </div>
    </article>`;
  }

  function renderGrid() {
    const q = norm(state.query);
    const favs = getFavs();
    const list = PRODUCTS.filter(p => {
      if (state.filter === 'Favoritos') { if (!favs.includes(p.id)) return false; }
      else if (state.filter !== 'Todos' && p.family !== state.filter) return false;
      return !q || norm(p.name).includes(q);
    });

    $('#grid').innerHTML = list.map(cardHTML).join('');
    $('#empty').hidden = list.length > 0;
    $('#grid').hidden = list.length === 0;

    if (!list.length) {
      $('#emptyMsg').textContent = state.filter === 'Favoritos' && !q
        ? 'Aún no tienes favoritos. Toca el corazón de un perfume para guardarlo.'
        : 'Prueba con otro nombre o cambia el filtro.';
    }
    const parts = [];
    if (q) parts.push(`“${state.query.trim()}”`);
    if (state.filter !== 'Todos') parts.push(state.filter);
    $('#resultCount').textContent = list.length
      ? `${list.length} ${list.length === 1 ? 'perfume' : 'perfumes'}${parts.length ? ' · ' + parts.join(' · ') : ''}`
      : '';
  }

  $('#grid').addEventListener('click', e => {
    const add = e.target.closest('[data-add]');
    const fav = e.target.closest('[data-fav]');
    if (add) addToCart(add.dataset.add);
    else if (fav) toggleFav(fav.dataset.fav);
  });
  $('#btnReset').addEventListener('click', () => {
    state.query = ''; state.filter = 'Todos';
    $('#searchInput').value = '';
    renderFilters(); renderGrid();
  });

  /* Búsqueda por nombre (lupa) */
  const searchbar = $('#searchbar'), searchInput = $('#searchInput'), btnSearch = $('#btnSearch');
  let scrolledForSearch = false;
  function openSearch() {
    closeCart();
    searchbar.hidden = false;
    btnSearch.setAttribute('aria-expanded', 'true');
    searchInput.focus();
  }
  function closeSearch(clear = true) {
    searchbar.hidden = true;
    btnSearch.setAttribute('aria-expanded', 'false');
    scrolledForSearch = false;
    if (clear && state.query) { state.query = ''; searchInput.value = ''; renderGrid(); }
  }
  btnSearch.addEventListener('click', () => (searchbar.hidden ? openSearch() : closeSearch()));
  $('#searchClose').addEventListener('click', () => closeSearch());
  searchInput.addEventListener('input', () => {
    state.query = searchInput.value;
    renderGrid();
    if (state.query.trim() && !scrolledForSearch) {
      scrolledForSearch = true;
      $('#productos').scrollIntoView({ behavior: 'smooth' });
    }
  });
  searchInput.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); $('#productos').scrollIntoView({ behavior: 'smooth' }); } });

  /* ---------- Carrito ---------- */
  const cartEl = $('#cart'), btnCart = $('#btnCart');
  const cartCount = () => state.cart.reduce((n, i) => n + i.qty, 0);
  const cartSubtotal = () => state.cart.reduce((n, i) => n + i.qty * byId(i.id).price, 0);
  const shippingFor = sub => (sub === 0 || sub >= FREE_SHIP ? 0 : SHIP_COST);
  const saveCart = () => store.set(K.cart, state.cart);

  function openCart() {
    cartEl.hidden = false;
    document.body.classList.add('cart-open');
    btnCart.setAttribute('aria-expanded', 'true');
    btnCart.setAttribute('aria-label', 'Cerrar carrito');
  }
  function closeCart() {
    cartEl.hidden = true;
    document.body.classList.remove('cart-open');
    btnCart.setAttribute('aria-expanded', 'false');
    btnCart.setAttribute('aria-label', 'Abrir carrito');
  }
  btnCart.addEventListener('click', () => (cartEl.hidden ? openCart() : closeCart()));
  $('#cartClose').addEventListener('click', closeCart);

  function renderCart() {
    const list = $('#cartList');
    const count = cartCount();
    const badge = $('#cartBadge');
    badge.hidden = count === 0;
    badge.textContent = count;

    if (!state.cart.length) {
      list.innerHTML = '<li class="cart__empty">Tu carrito está vacío.<br>Agrega una fragancia para comenzar.</li>';
      $('#cartFoot').hidden = true;
      return;
    }
    $('#cartFoot').hidden = false;
    list.innerHTML = state.cart.map(i => {
      const p = byId(i.id);
      return `<li class="cart__item" data-id="${p.id}">
        <div class="cart__thumb"><img src="${esc(productImage(p))}" alt="" loading="lazy" decoding="async"></div>
        <div>
          <p class="cart__name">${p.name}</p>
          <p class="cart__size">${p.ml}ml</p>
          <p class="cart__price">${money(p.price)} c/u</p>
          <div class="qty">
            <button type="button" data-dec aria-label="Disminuir cantidad de ${esc(p.name)}">−</button>
            <span aria-live="polite">${i.qty}</span>
            <button type="button" data-inc aria-label="Aumentar cantidad de ${esc(p.name)}">+</button>
          </div>
        </div>
        <div class="cart__side">
          <p class="cart__line">${money(p.price * i.qty)}</p>
          <button type="button" class="cart__remove" data-remove aria-label="Quitar ${esc(p.name)}">Quitar</button>
        </div>
      </li>`;
    }).join('');

    const sub = cartSubtotal();
    $('#cartSubtotal').textContent = money(sub);
    $('#cartHint').textContent = sub >= FREE_SHIP
      ? '¡Tu envío es gratis!'
      : `Te faltan ${money(FREE_SHIP - sub)} para envío gratis.`;
  }

  function addToCart(id) {
    const p = byId(id);
    if (!p) return;
    const item = state.cart.find(i => i.id === id);
    if (item) {
      if (item.qty >= MAX_QTY) { toast(`Máximo ${MAX_QTY} unidades por perfume.`); return; }
      item.qty++;
    } else state.cart.push({ id, qty: 1 });
    saveCart(); renderCart();
    const badge = $('#cartBadge');
    badge.classList.remove('bump'); void badge.offsetWidth; badge.classList.add('bump');
    toast(`${p.name} se agregó al carrito.`);
  }

  $('#cartList').addEventListener('click', e => {
    const row = e.target.closest('.cart__item');
    if (!row) return;
    const item = state.cart.find(i => i.id === row.dataset.id);
    if (!item) return;
    if (e.target.closest('[data-inc]')) { if (item.qty < MAX_QTY) item.qty++; else toast(`Máximo ${MAX_QTY} unidades por perfume.`); }
    else if (e.target.closest('[data-dec]')) { item.qty--; if (item.qty <= 0) state.cart = state.cart.filter(i => i !== item); }
    else if (e.target.closest('[data-remove]')) state.cart = state.cart.filter(i => i !== item);
    else return;
    saveCart(); renderCart();
  });
  $('#btnClearCart').addEventListener('click', () => { state.cart = []; saveCart(); renderCart(); });

  /* ---------- Checkout estático ---------- */
  const checkoutDialog = $('#checkoutDialog');

  function renderCheckoutSummary() {
    const subtotal = cartSubtotal(), shipping = shippingFor(subtotal);
    $('#summaryList').innerHTML = state.cart.map(item => {
      const product = byId(item.id);
      return `<li>
        <span class="osum__img"><img src="${esc(productImage(product))}" alt="" width="56" height="66"><span class="osum__qty" aria-label="Cantidad">${item.qty}</span></span>
        <span><span class="osum__name">${esc(product.name)}</span><span class="osum__meta">${product.ml} ml · ${money(product.price)} c/u</span></span>
        <span>${money(product.price * item.qty)}</span>
      </li>`;
    }).join('');
    $('#sumSub').textContent = money(subtotal);
    $('#sumShip').textContent = shipping ? money(shipping) : 'Gratis';
    $('#sumTotal').textContent = money(subtotal + shipping);
    $('#sumShipNote').textContent = shipping
      ? `Te faltan ${money(FREE_SHIP - subtotal)} para tener envío gratis.`
      : 'Tu pedido tiene envío gratis.';
    $('#coSubmit').textContent = `Confirmar pedido · ${money(subtotal + shipping)}`;
  }

  $('#btnCheckout').addEventListener('click', () => {
    if (!state.cart.length) return;
    $('#checkoutForm').reset();
    $('#checkoutError').textContent = '';
    $('#checkoutBody').hidden = false;
    $('#checkoutDone').hidden = true;
    renderCheckoutSummary();
    checkoutDialog.showModal();
  });

  $('#checkoutForm').addEventListener('submit', e => {
    e.preventDefault();
    const form = e.currentTarget;
    const error = $('#checkoutError');
    if (!form.checkValidity()) { form.reportValidity(); return; }
    if (!$('#coTerms').checked) {
      error.textContent = 'Debes aceptar los términos de compra para continuar.';
      return;
    }
    error.textContent = '';
    $('#doneTotal').textContent = money(cartSubtotal() + shippingFor(cartSubtotal()));
    $('#checkoutBody').hidden = true;
    $('#checkoutDone').hidden = false;
    state.cart = [];
    saveCart();
    renderCart();
  });

  /* ---------- Diálogos: cerrar con X o clic fuera ---------- */
  $$('dialog').forEach(d => { d.addEventListener('click', e => { if (e.target === d) d.close(); }); });$$
('[data-close]').forEach(b => b.addEventListener('click', () => b.closest('dialog').close()));

  /* ---------- Contacto ---------- */
  $('#contactForm').addEventListener('submit', e => {
    e.preventDefault();
    const err = $('#contactError');
    const name = $('#cName').value.trim();
    const mail = $('#cMail').value.trim();
    const msg = $('#cMsg').value.trim();
    if (name.length < 2) { err.textContent = 'Escribe tu nombre.'; return; }
    if (!EMAIL_RE.test(mail)) { err.textContent = 'Escribe un correo válido.'; return; }
    if (msg.length < 10) { err.textContent = 'Cuéntanos un poco más en tu mensaje.'; return; }
    err.textContent = '';
    e.target.reset();
    toast('Gracias por escribirnos.');
  });

  /* ---------- Navegación ---------- */
  const navbar = $('#navbar'), menu = $('#menu'), burger = $('#btnBurger');
  const onScroll = () => navbar.classList.toggle('scrolled', window.scrollY > 8);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  function setMenu(open) {
    menu.classList.toggle('open', open);
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
  }
  burger.addEventListener('click', () => setMenu(!menu.classList.contains('open')));
  $$('a', menu).forEach(a => a.addEventListener('click', () => setMenu(false)));    if ('IntersectionObserver' in window) { const links = $$
('.menu a');
    const secObs = new IntersectionObserver(entries => {
      entries.forEach(en => {
        if (en.isIntersecting) links.forEach(l => l.classList.toggle('active', l.dataset.section === en.target.id));
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    ['inicio', 'productos', 'informacion', 'contacto'].forEach(id => secObs.observe($('#' + id)));

    const revObs = new IntersectionObserver(entries => {
      entries.forEach(en => { if (en.isIntersecting) { en.target.classList.add('in'); revObs.unobserve(en.target); } });
    }, { threshold: .12 });
    $$('.reveal').forEach(el => revObs.observe(el)); } else { $$
('.reveal').forEach(el => el.classList.add('in'));
  }

  /* ---------- Cierre global (clic fuera / Escape) ---------- */
  document.addEventListener('click', e => {
    const path = e.composedPath();
    if (!cartEl.hidden && !path.includes(cartEl) && !path.includes(btnCart)) closeCart();
  });
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    if (!cartEl.hidden) { closeCart(); btnCart.focus(); }
    else if (!searchbar.hidden) closeSearch();
    else if (menu.classList.contains('open')) setMenu(false);
  });

  /* ---------- Inicio ---------- */
  $('#year').textContent = new Date().getFullYear();
  renderFilters();
  renderGrid();
  renderCart();
})();
