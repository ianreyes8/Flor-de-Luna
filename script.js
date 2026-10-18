/* =========================================================
   Flor de Luna — lógica de la tienda
   La cuenta, el carrito, los favoritos y los pedidos se guardan en MySQL.
   ========================================================= */
(() => {
  'use strict';

  /* ---------- Utilidades ---------- */
  const $ = (s, r = document) => r.querySelector(s); const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const money = n => '$' + Number(n).toFixed(2);
  const norm = s => String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  const NAME_RE = /^\p{L}+(?:\s+\p{L}+)*$/u;

  const K = { cart: 'fdl_cart', theme: 'fdl_theme' };
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* sin almacenamiento */ } }
  };
  async function api(action, payload) {
    const options = payload === undefined
      ? { credentials: 'same-origin' }
      : {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action, ...payload })
        };
    const response = await fetch(`Conection/index.php${payload === undefined ? `?action=${encodeURIComponent(action)}` : ''}`, options);
    let result;
    try { result = await response.json(); }
    catch { throw new Error('El servidor devolvió una respuesta no válida.'); }
    if (!response.ok) throw new Error(result.error || 'No fue posible completar la operación.');
    return result;
  }

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
  const FILTERS = ['Todos', 'Floral', 'Amaderado', 'Oriental', 'Fresco', 'Favoritos'];
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
    user: null,
    favorites: [],
    filter: 'Todos',
    query: ''
  };
  let pendingAction = null;

  function sanitizeCart(raw) {
    if (!Array.isArray(raw)) return [];
    return raw
      .filter(i => i && byId(i.id))
      .map(i => ({ id: i.id, qty: Math.min(MAX_QTY, Math.max(1, parseInt(i.qty, 10) || 1)) }));
  }
  function mergeCart(saved, incoming) {
    const merged = new Map(sanitizeCart(saved).map(item => [item.id, item.qty]));
    sanitizeCart(incoming).forEach(item => merged.set(item.id, Math.min(MAX_QTY, (merged.get(item.id) || 0) + item.qty)));
    return [...merged].map(([id, qty]) => ({ id, qty }));
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

  /* ---------- Sesión ---------- */
  const currentUser = () => state.user;

  const authDialog = $('#authDialog');

  $$('[data-password-toggle]').forEach(button => {
    button.addEventListener('click', () => {
      const input = document.getElementById(button.getAttribute('aria-controls'));
      const visible = input.type === 'password';
      input.type = visible ? 'text' : 'password';
      button.setAttribute('aria-pressed', String(visible));
      button.setAttribute('aria-label', visible ? 'Ocultar contraseña' : 'Mostrar contraseña');
    });
  });

  function setAuthTab(tab) {
    const login = tab === 'login';
    $('#tabLogin').setAttribute('aria-selected', String(login));
    $('#tabRegister').setAttribute('aria-selected', String(!login));
    $('#loginForm').hidden = !login;
    $('#registerForm').hidden = login;
    $('#authTitle').textContent = login ? 'Bienvenida/o de nuevo' : 'Crea tu cuenta';
    $('#loginError').textContent = '';
    $('#registerError').textContent = ''; } $$('[data-tab]').forEach(b => b.addEventListener('click', () => setAuthTab(b.dataset.tab)));

  function openAuth(note, after, tab = 'login') {
    pendingAction = after || null;
    const n = $('#authNote');
    n.textContent = note || '';
    n.hidden = !note;
    setAuthTab(tab);
    if (!authDialog.open) authDialog.showModal();
  }
  authDialog.addEventListener('close', () => { if (!state.user) pendingAction = null; });

  function requireAuth(note, after) {
    if (currentUser()) { after && after(); return true; }
    openAuth(note, after);
    return false;
  }

  async function startSession(user, data) {
    state.user = user;
    state.favorites = data.favorites || [];
    state.cart = mergeCart(data.cart || [], state.cart);
    store.set(K.cart, state.cart);
    const act = pendingAction;
    pendingAction = null;
    authDialog.close();
    $('#loginForm').reset();
    $('#registerForm').reset();
    renderUser();
    renderFilters();
    renderGrid();
    toast(`¡Hola, ${user.name.split(' ')[0]}!`);
    try { await persistCart(); }
    catch (error) { toast(`Cuenta iniciada, pero el carrito no se sincronizó: ${error.message}`); }
    if (act) act();
  }

  $('#loginForm').addEventListener('submit', async e => {
    e.preventDefault();
    const err = $('#loginError');
    err.textContent = '';
    const email = $('#loginEmail').value.trim().toLowerCase();
    const pw = $('#loginPass').value;
    if (!EMAIL_RE.test(email) || !pw) { err.textContent = 'Ingresa tu correo y tu contraseña.'; return; }
    try {
      const result = await api('login', { email, password: pw });
      await startSession(result.user, result.data);
    } catch (error) { err.textContent = error.message; }
  });

  $('#registerForm').addEventListener('submit', async e => {
    e.preventDefault();
    const err = $('#registerError');
    err.textContent = '';
    const name = $('#regName').value.trim().replace(/\s+/g, ' ').normalize('NFC');
    const email = $('#regEmail').value.trim().toLowerCase();
    const pw = $('#regPass').value;
    const pw2 = $('#regPass2').value;

    if (name.length < 2) { err.textContent = 'Escribe tu nombre.'; return; }
    if (!NAME_RE.test(name)) { err.textContent = 'El nombre solo puede contener letras y espacios.'; return; }
    if (!EMAIL_RE.test(email)) { err.textContent = 'Escribe un correo válido.'; return; }
    if (pw.length < 8 || !/[A-Za-z]/.test(pw) || !/\d/.test(pw)) { err.textContent = 'La contraseña debe tener 8 caracteres o más, con letras y números.'; return; }
    if (pw !== pw2) { err.textContent = 'Las contraseñas no coinciden.'; return; }

    try {
      const result = await api('register', { name, email, password: pw });
      await startSession(result.user, result.data);
    } catch (error) { err.textContent = error.message; }
  });

  async function logout() {
    try { await api('logout', {}); }
    catch (error) { toast(`No se pudo cerrar la sesión: ${error.message}`); return; }
    state.user = null;
    state.favorites = [];
    state.cart = [];
    store.set(K.cart, state.cart);
    if (state.filter === 'Favoritos') state.filter = 'Todos';
    closeUserMenu();
    renderUser();
    renderFilters();
    renderGrid();
    toast('Sesión cerrada.');
  }
  $('#btnLogout').addEventListener('click', logout);

  /* Menú de usuario */
  const userMenu = $('#userMenu'), btnUser = $('#btnUser');
  function closeUserMenu() { userMenu.hidden = true; btnUser.setAttribute('aria-expanded', 'false'); }
  function renderUser() {
    const u = currentUser();
    $('#userDot').hidden = !u;
    btnUser.setAttribute('aria-label', u ? `Cuenta de ${u.name}` : 'Iniciar sesión');
    if (u) { $('#userName').textContent = u.name; $('#userMail').textContent = u.email; }
    else closeUserMenu();
  }
  btnUser.addEventListener('click', () => {
    if (!currentUser()) { openAuth(null, null); return; }
    const open = userMenu.hidden;
    closeCart();
    userMenu.hidden = !open;
    btnUser.setAttribute('aria-expanded', String(open));
  });

  /* ---------- Favoritos ---------- */
  const getFavs = () => state.favorites;
  async function toggleFav(id) {
    requireAuth('Inicia sesión para guardar tus perfumes favoritos.', () => {
      api('favorite', { id }).then(result => {
        state.favorites = result.favorites;
        toast(result.added ? 'Guardado en favoritos.' : 'Quitado de favoritos.');
        renderGrid();
      }).catch(error => toast(`No se pudieron actualizar los favoritos: ${error.message}`));
    });
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
    const f = b.dataset.filter;
    if (f === 'Favoritos') requireAuth('Inicia sesión para ver tus favoritos.', () => setFilter('Favoritos'));
    else setFilter(f);
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
    closeCart(); closeUserMenu();
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
  let cartSync = Promise.resolve();
  function persistCart() {
    if (!currentUser()) return Promise.resolve();
    const items = state.cart.map(item => ({ id: item.id, qty: item.qty }));
    cartSync = cartSync.catch(() => {}).then(() => api('cart', { items }));
    return cartSync;
  }
  const saveCart = () => {
    store.set(K.cart, state.cart);
    if (currentUser()) {
      persistCart().catch(error => toast(`No se pudo guardar el carrito: ${error.message}`));
    }
  };

  function openCart() {
    closeUserMenu();
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

  /* ---------- Pago (requiere sesión) ---------- */
  const checkoutDialog = $('#checkoutDialog');

  $('#btnCheckout').addEventListener('click', () => {
    closeCart();
    requireAuth('Inicia sesión o crea una cuenta para pagar tus productos.', openCheckout);
  });

  const payRadios = $$('input[name="coPay"]');
  const payMethod = () => (payRadios.find(r => r.checked) || payRadios[0]).value;
  const cardFields = ['#coCard', '#coCardName', '#coExp', '#coCvv'];

  function syncPayPanels() {
    const m = payMethod();
    $('#panelCard').hidden = m !== 'Tarjeta de crédito o débito';
    $('#panelTransfer').hidden = m !== 'Transferencia bancaria';
    $('#panelCash').hidden = m !== 'Pago contra entrega';
  }
  payRadios.forEach(r => r.addEventListener('change', syncPayPanels));

  /* Tarjeta: formato en vivo, marca y validación (algoritmo de Luhn). Nada se guarda. */
  const cardBrand = d => /^4/.test(d) ? 'Visa' : /^(5[1-5]|2[2-7])/.test(d) ? 'Mastercard' : /^3[47]/.test(d) ? 'American Express' : 'Tarjeta';
  const luhn = d => {
    let sum = 0, alt = false;
    for (let i = d.length - 1; i >= 0; i--) {
      let n = +d[i];
      if (alt) { n *= 2; if (n > 9) n -= 9; }
      sum += n; alt = !alt;
    }
    return d.length > 0 && sum % 10 === 0;
  };
  function formatCard() {
    const el = $('#coCard');
    const d = el.value.replace(/\D/g, '').slice(0, 19);
    const amex = /^3[47]/.test(d);
    el.value = (amex ? [d.slice(0, 4), d.slice(4, 10), d.slice(10, 15)] : d.match(/.{1,4}/g) || []).filter(Boolean).join(' ');
    $('#cpNum').textContent = el.value || '•••• •••• •••• ••••';
    $('#cpBrand').textContent = cardBrand(d);
  }
  $('#coCard').addEventListener('input', formatCard);
  $('#coCardName').addEventListener('input', e => { $('#cpName').textContent = e.target.value.trim().toUpperCase() || 'NOMBRE APELLIDO'; });
  $('#coExp').addEventListener('input', e => {
    let d = e.target.value.replace(/\D/g, '').slice(0, 4);
    if (d.length >= 3) d = d.slice(0, 2) + '/' + d.slice(2);
    e.target.value = d;
    $('#cpExp').textContent = d || 'MM/AA';
  });
  $('#coCvv').addEventListener('input', e => { e.target.value = e.target.value.replace(/\D/g, '').slice(0, 4); });
  $('#coZip').addEventListener('input', e => { e.target.value = e.target.value.replace(/\D/g, ''); });

  function expiryOk(v) {
    const m = /^(\d{2})\/(\d{2})$/.exec(v);
    if (!m) return false;
    const mm = +m[1], yy = 2000 + +m[2], now = new Date();
    if (mm < 1 || mm > 12) return false;
    return yy > now.getFullYear() || (yy === now.getFullYear() && mm >= now.getMonth() + 1);
  }

  function renderCheckoutSummary() {
    const sub = cartSubtotal(), ship = shippingFor(sub);
    $('#summaryList').innerHTML = state.cart.map(i => {
      const p = byId(i.id);
      return `<li>
        <span class="osum__img"><img src="${esc(productImage(p))}" alt="" width="56" height="66"><span class="osum__qty" aria-label="Cantidad">${i.qty}</span></span>
        <span><span class="osum__name">${esc(p.name)}</span><span class="osum__meta">${p.ml} ml · ${money(p.price)} c/u</span></span>
        <span>${money(p.price * i.qty)}</span>
      </li>`;
    }).join('');
    $('#sumSub').textContent = money(sub);
    $('#sumShip').textContent = ship ? money(ship) : 'Gratis';
    $('#sumTotal').textContent = money(sub + ship);
    $('#sumShipNote').textContent = ship
      ? `Te faltan ${money(FREE_SHIP - sub)} para tener envío gratis.`
      : 'Tu pedido tiene envío gratis.';
    $('#coSubmit').textContent = `Confirmar pedido · ${money(sub + ship)}`;
  }

  function openCheckout() {
    if (!state.cart.length) { toast('Tu carrito está vacío.'); return; }
    const u = currentUser();
    if (!u) return;
    $('#checkoutForm').reset();
    $('#coEmail').value = u.email;
    $('#coName').value = u.name;
    ['#cpNum', '#cpName', '#cpExp', '#cpBrand'].forEach((sel, i) => { $(sel).textContent = ['•••• •••• •••• ••••', 'NOMBRE APELLIDO', 'MM/AA', 'Tarjeta'][i]; });
    $$('#checkoutForm [aria-invalid]').forEach(el => el.removeAttribute('aria-invalid'));
    syncPayPanels();
    renderCheckoutSummary();
    $('#checkoutError').textContent = '';
    $('#checkoutBody').hidden = false;
    $('#checkoutDone').hidden = true;
    if (!checkoutDialog.open) checkoutDialog.showModal();
    $('#checkoutDialog .modal__box').scrollTop = 0;
  }

  $('#checkoutForm').addEventListener('submit', async e => {
    e.preventDefault();
    const u = currentUser();
    const err = $('#checkoutError');
    if (!u) { checkoutDialog.close(); openAuth('Tu sesión terminó. Inicia sesión para continuar.', openCheckout); return; }
    if (!state.cart.length) { checkoutDialog.close(); toast('Tu carrito está vacío.'); return; }

    $$('#checkoutForm [aria-invalid]').forEach(el => el.removeAttribute('aria-invalid'));
    const v = sel => $(sel).value.trim();
    const method = payMethod();
    const checks = [
      ['#coEmail', !EMAIL_RE.test(v('#coEmail')), 'Escribe un correo válido.'],
      ['#coName', v('#coName').length < 3, 'Escribe tu nombre completo.'],
      ['#coPhone', v('#coPhone').replace(/\D/g, '').length < 8 || !/^[\d\s+\-().]+$/.test(v('#coPhone')), 'Escribe un teléfono válido.'],
      ['#coDept', !v('#coDept'), 'Selecciona tu departamento.'],
      ['#coCity', v('#coCity').length < 3, 'Escribe tu municipio o ciudad.'],
      ['#coAddress', v('#coAddress').length < 8, 'Escribe una dirección de entrega más completa.']
    ];
    if (method === 'Tarjeta de crédito o débito') {
      const digits = v('#coCard').replace(/\D/g, '');
      checks.push(
        ['#coCard', digits.length < 13 || !luhn(digits), 'El número de tarjeta no es válido.'],
        ['#coCardName', v('#coCardName').length < 3, 'Escribe el nombre que aparece en la tarjeta.'],
        ['#coExp', !expiryOk(v('#coExp')), 'La fecha de vencimiento no es válida.'],
        ['#coCvv', !/^\d{3,4}$/.test(v('#coCvv')), 'Escribe el código de seguridad (CVV).']
      );
    }
    checks.push(['#coTerms', !$('#coTerms').checked, 'Debes aceptar los términos de compra para continuar.']);

    const bad = checks.find(c => c[1]);
    if (bad) {
      const el = $(bad[0]);
      if (el.type !== 'checkbox') el.setAttribute('aria-invalid', 'true');
      err.textContent = bad[2];
      el.focus();
      return;
    }
    err.textContent = '';

    const payment = {
      'Tarjeta de crédito o débito': 'tarjeta',
      'Transferencia bancaria': 'transferencia',
      'Pago contra entrega': 'contra_entrega'
    }[method];
    try {
      await persistCart();
      const order = await api('order', {
        email: v('#coEmail'),
        name: v('#coName'),
        phone: v('#coPhone'),
        department: v('#coDept'),
        city: v('#coCity'),
        zip: v('#coZip'),
        address: v('#coAddress'),
        reference: v('#coRef'),
        notes: v('#coNotes'),
        payment
      });
      cardFields.forEach(sel => { $(sel).value = ''; });
      state.cart = [];
      saveCart(); renderCart();
      $('#doneId').textContent = order.id;
      $('#doneMail').textContent = order.email;
      $('#doneTotal').textContent = money(order.total);
      $('#checkoutBody').hidden = true;
      $('#checkoutDone').hidden = false;
      $('#checkoutDialog .modal__box').scrollTop = 0;
    } catch (error) { err.textContent = error.message; }
  });

  /* ---------- Pedidos ---------- */
  const ordersDialog = $('#ordersDialog');
  $('#btnOrders').addEventListener('click', async () => {
    closeUserMenu();
    const u = currentUser();
    if (!u) return;
    const list = $('#ordersList');
    list.textContent = 'Cargando pedidos…';
    ordersDialog.showModal();
    try {
      const { orders } = await api('orders');
      list.innerHTML = orders.length ? orders.map(o => `
      <article class="order">
        <div class="order__head"><strong>${esc(o.codigo)}</strong><span>${new Date(o.fecha_pedido.replace(' ', 'T')).toLocaleDateString('es-SV', { day: 'numeric', month: 'long', year: 'numeric' })}</span></div>
        <ul>${o.items.map(i => `<li>${esc(i.name)} ×${i.qty}</li>`).join('')}</ul>
        <p class="order__total">Total: ${money(o.total)}</p>
      </article>`).join('') : '<p class="muted">Todavía no has realizado pedidos.</p>';
    } catch (error) {
      list.textContent = `No se pudieron cargar los pedidos: ${error.message}`;
    }
  });

  /* ---------- Diálogos: cerrar con X o clic fuera ---------- */
  $$('dialog').forEach(d => { d.addEventListener('click', e => { if (e.target === d) d.close(); }); });$$
('[data-close]').forEach(b => b.addEventListener('click', () => b.closest('dialog').close()));

  /* ---------- Contacto ---------- */
  $('#contactForm').addEventListener('submit', async e => {
    e.preventDefault();
    const err = $('#contactError');
    const name = $('#cName').value.trim();
    const mail = $('#cMail').value.trim();
    const msg = $('#cMsg').value.trim();
    if (name.length < 2) { err.textContent = 'Escribe tu nombre.'; return; }
    if (!EMAIL_RE.test(mail)) { err.textContent = 'Escribe un correo válido.'; return; }
    if (msg.length < 10) { err.textContent = 'Cuéntanos un poco más en tu mensaje.'; return; }
    err.textContent = '';
    try {
      await api('contact', { name, email: mail, message: msg });
      e.target.reset();
      toast('¡Gracias! Recibimos tu mensaje y te responderemos pronto.');
    } catch (error) { err.textContent = error.message; }
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
    if (!userMenu.hidden && !path.includes(userMenu) && !path.includes(btnUser)) closeUserMenu();
  });
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    if (!cartEl.hidden) { closeCart(); btnCart.focus(); }
    else if (!userMenu.hidden) { closeUserMenu(); btnUser.focus(); }
    else if (!searchbar.hidden) closeSearch();
    else if (menu.classList.contains('open')) setMenu(false);
  });

  /* ---------- Inicio ---------- */
  $('#year').textContent = new Date().getFullYear();
  async function initialize() {
    try {
      const result = await api('session');
      if (result.user) {
        state.user = result.user;
        state.favorites = result.data.favorites || [];
        state.cart = mergeCart(result.data.cart || [], state.cart);
        store.set(K.cart, state.cart);
        await persistCart();
      }
    } catch (error) {
      toast(`No se pudo conectar con MySQL: ${error.message}`);
    }
    renderUser();
    renderFilters();
    renderGrid();
    renderCart();
  }
  initialize();
})();