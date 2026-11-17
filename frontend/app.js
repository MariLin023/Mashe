/* =====================================================================
   MASHE – tienda de materiales (HTML + CSS + JS, sin frameworks)
   Pantallas: bienvenida, login, registro, inicio, catálogo, búsqueda,
   preguntas frecuentes, carrito lateral, pago y confirmación.
   ===================================================================== */

/* ---------- 1. DATOS Y CONEXIÓN CON LA API ---------- */
// URL del backend. En producción cámbiala por la dirección donde publiques la API.
const API = "http://localhost:4000/api/v1";

// Los productos ya no se escriben aquí: vienen de la base de datos (GET /products)
let PRODUCTS = [];
const DETAILS = {}; // se llena en loadProducts() con desc y specs de cada producto

async function api(path, { method = "GET", body } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (user && user.token) headers.Authorization = `Bearer ${user.token}`;
  let res;
  try {
    res = await fetch(API + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
  } catch {
    throw new Error("No pudimos conectar con el servidor. Intenta de nuevo.");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.message || "Ocurrió un error. Intenta de nuevo.");
    err.status = res.status;
    throw err;
  }
  return data;
}

async function loadProducts() {
  const [{ products }, cats] = await Promise.all([api("/products"), api("/categories").catch(() => null)]);
  PRODUCTS = products;
  if (cats && cats.categories.length) { // las categorías vienen de la base de datos
    Object.keys(CATEGORIES).forEach((k) => delete CATEGORIES[k]);
    cats.categories.forEach((c) => { CATEGORIES[c.key] = c.name; });
  }
  products.forEach((p) => {
    DETAILS[p.id] = { desc: p.desc, specs: (p.specs || []).map((s) => [s.label, s.value]) };
  });
  // Limpia carritos viejos si un producto ya no existe o cambió el stock
  cart = cart.filter((l) => productById(l.id) && productById(l.id).stock > 0).map((l) => ({ ...l, qty: Math.min(l.qty, productById(l.id).stock) }));
  save("mashe_cart", cart);
}

// Valores por defecto; loadProducts() los reemplaza por las categorías de la base de datos
const CATEGORIES = { arte: "Arte", oficina: "Oficina", escolares: "Escolares" };
const catName = (key) => CATEGORIES[key] || key;

// Tarjetas de "¿Qué estás buscando?" (type debe coincidir con el campo type de PRODUCTS)
const HOME_TILES = [
  { label: "Óleos",      type: "Óleos",      image: "img/oleos.jpg" },
  { label: "Acrílicos",  type: "Acrílicos",  image: "img/acrilicos.jpg" },
  { label: "Marcadores", type: "Marcadores", image: "img/marcadores.jpg" },
  { label: "Lienzos",    type: "Lienzos",    image: "img/lienzos.jpg" },
  { label: "Medios & solventes & aceites & barnices", type: "Medios, solventes, aceites y barnices", image: "img/aceite.jpg" },
];

const PRICE_RANGES = [
  { id: "0-15000",     label: "Hasta $15.000",        min: 0,     max: 15000 },
  { id: "15000-30000", label: "$15.000 – $30.000",    min: 15000, max: 30000 },
  { id: "30000-50000", label: "$30.000 – $50.000",    min: 30000, max: 50000 },
  { id: "50000-",      label: "Más de $50.000",       min: 50000, max: Infinity },
];

const SHIPPING_FEE = 9000;
const FREE_SHIPPING_FROM = 150000;

const FAQ = [
  ["¿Cuánto demora el envío?", "En Bogotá entregamos entre 1 y 2 días hábiles. Al resto del país, entre 3 y 6 días hábiles."],
  ["¿Cuánto cuesta el envío?", `Cuesta ${money(SHIPPING_FEE)}. Es gratis en compras desde ${money(FREE_SHIPPING_FROM)}.`],
  ["¿Qué métodos de pago aceptan?", "Tarjeta débito o crédito, PSE y pago contra entrega."],
  ["¿Puedo devolver un producto?", "Sí. Tienes 8 días para devolver productos sin abrir. Escríbenos con tu número de pedido."],
  ["¿Cómo sé si un producto está disponible?", "Los productos agotados aparecen marcados y no se pueden agregar al carrito. También puedes filtrar por disponibilidad."],
];

/* ---------- 2. UTILIDADES ---------- */
function money(n) { return "$" + Math.round(n).toLocaleString("es-CO"); }
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

function store(key, fallback) {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch { return fallback; }
}
function save(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* modo privado: se ignora */ }
}

// Si la imagen no existe, dibuja un recuadro lila con la inicial del producto
function placeholder(name) {
  const letter = esc((name || "?").trim().charAt(0).toUpperCase());
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><rect width="100%" height="100%" fill="#ece0fd"/><text x="50%" y="55%" font-family="Georgia" font-size="120" fill="#b66fdc" text-anchor="middle" dominant-baseline="middle">${letter}</text></svg>`;
  return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
}
window.imgFallback = (el, name) => { el.onerror = null; el.src = placeholder(name); };
const imgTag = (src, name, cls = "") =>
  `<img class="${cls}" src="${esc(src)}" alt="${esc(name)}" loading="lazy" onerror="imgFallback(this, '${esc(name).replace(/'/g, "")}')">`;

/* ---------- 3. ESTADO: sesión y carrito ---------- */
let user = store("mashe_user", null);
let cart = store("mashe_cart", []);          // [{ id, qty }]

const productById = (id) => PRODUCTS.find((p) => p.id === id);
const cartCount = () => cart.reduce((n, l) => n + l.qty, 0);
const cartSubtotal = () => cart.reduce((s, l) => s + productById(l.id).price * l.qty, 0);
const shippingFor = (sub) => (sub === 0 || sub >= FREE_SHIPPING_FROM ? 0 : SHIPPING_FEE);

function persistCart() { save("mashe_cart", cart); renderCartBadge(); renderDrawer(); }

function addToCart(id, qty = 1) {
  const p = productById(id);
  if (!p || p.stock === 0) return;
  const line = cart.find((l) => l.id === id);
  const current = line ? line.qty : 0;
  const next = Math.min(current + qty, p.stock);
  if (next === current) { toast(`Ya tienes las ${p.stock} unidades disponibles de ${p.name}`); return; }
  if (line) line.qty = next; else cart.push({ id, qty: next });
  persistCart();
  toast(next < current + qty
    ? `Solo había ${p.stock} unidades: agregamos hasta el máximo`
    : `${p.name} agregado al carrito`);
}
function changeQty(id, delta) {
  const line = cart.find((l) => l.id === id);
  if (!line) return;
  const p = productById(id);
  const next = line.qty + delta;
  if (next > p.stock) { toast(`Solo hay ${p.stock} unidades de ${p.name}`); return; }
  if (next <= 0) cart = cart.filter((l) => l.id !== id); else line.qty = next;
  persistCart();
  if (currentRoute === "pago") renderCheckout();
}
function removeFromCart(id) {
  cart = cart.filter((l) => l.id !== id);
  persistCart();
  if (currentRoute === "pago") renderCheckout();
}
function clearCart() { cart = []; persistCart(); if (currentRoute === "pago") navigate("#/inicio"); }

/* ---------- 4. ELEMENTOS FIJOS DE LA PÁGINA ---------- */
const app = $("#app");
const header = $("#site-header");
const nav = $("#site-nav");
const drawer = $("#drawer");
const overlay = $("#overlay");
const toastEl = $("#toast");
let toastTimer;
let currentRoute = "";

function toast(msg) {
  toastEl.textContent = msg;
  toastEl.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove("show"), 2200);
}

function renderCartBadge() { $("#cart-count").textContent = cartCount(); }

// El menú de categorías se arma con las que existen en la base de datos
function renderNav() {
  nav.innerHTML = Object.entries(CATEGORIES).map(([k, n]) => `<a href="#/catalogo/${esc(k)}" data-nav="${esc(k)}">${esc(n)}</a>`).join("")
    + `<a href="#/faq" data-nav="faq">Preguntas frecuentes</a>`;
}

function renderHeaderUser() {
  const chip = $("#user-chip");
  if (user) { chip.hidden = false; chip.innerHTML = `Hola, ${esc(user.name)} · ${isAdmin() ? `<a href="#/admin" style="text-decoration:underline">Administrar</a> · ` : user.token ? `<a href="#/pedidos" style="text-decoration:underline">Mis pedidos</a> · ` : ""}<a href="#/bienvenida" id="logout" style="text-decoration:underline">Salir</a>`; }
  else chip.hidden = true;
}

/* ---------- 5. CARRITO LATERAL ---------- */
function openDrawer() {
  renderDrawer();
  drawer.classList.add("open");
  drawer.setAttribute("aria-hidden", "false");
  overlay.hidden = false;
  $("#drawer-close").focus();
}
function closeDrawer() {
  drawer.classList.remove("open");
  drawer.setAttribute("aria-hidden", "true");
  overlay.hidden = true;
}

function renderDrawer() {
  const body = $("#drawer-body");
  const foot = $("#drawer-foot");
  if (!cart.length) {
    body.innerHTML = `<p class="drawer__empty">Tu carrito está vacío.</p>`;
    foot.innerHTML = `<button class="btn-primary" style="margin-top:0" data-action="seguir">Seguir comprando</button>`;
    return;
  }
  body.innerHTML = cart.map((l) => {
    const p = productById(l.id);
    return `
      <div class="line">
        ${imgTag(p.image, p.name)}
        <div>
          <a class="line__name" href="#/producto/${p.id}" data-close-drawer>${esc(p.name)}</a>
          <div class="line__price">${money(p.price)}</div>
          <div class="qty">
            <button data-action="menos" data-id="${p.id}" aria-label="Quitar una unidad de ${esc(p.name)}">−</button>
            <span>${l.qty}</span>
            <button data-action="mas" data-id="${p.id}" aria-label="Agregar una unidad de ${esc(p.name)}">+</button>
          </div>
        </div>
        <button class="line__rm" data-action="quitar" data-id="${p.id}">Quitar</button>
      </div>`;
  }).join("");

  const sub = cartSubtotal();
  const missing = FREE_SHIPPING_FROM - sub;
  foot.innerHTML = `
    <div class="drawer__total"><span>Subtotal</span><span>${money(sub)}</span></div>
    <p class="drawer__note">${missing > 0 ? `Te faltan ${money(missing)} para el envío gratis.` : "¡Tu envío es gratis!"}</p>
    <button class="btn-primary" data-action="pagar">Ir a pagar</button>
    <button class="link-clear" data-action="vaciar">Vaciar carrito</button>`;
}

drawer.addEventListener("click", (e) => {
  if (e.target.closest("[data-close-drawer]")) { closeDrawer(); return; }
  const btn = e.target.closest("[data-action]");
  if (!btn) return;
  const id = Number(btn.dataset.id);
  switch (btn.dataset.action) {
    case "mas": changeQty(id, 1); break;
    case "menos": changeQty(id, -1); break;
    case "quitar": removeFromCart(id); break;
    case "vaciar": clearCart(); break;
    case "seguir": closeDrawer(); break;
    case "pagar": closeDrawer(); navigate("#/pago"); break;
  }
});
$("#cart-btn").addEventListener("click", openDrawer);
$("#drawer-close").addEventListener("click", closeDrawer);
overlay.addEventListener("click", closeDrawer);
document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeDrawer(); });

/* ---------- 6. COMPONENTES ---------- */
function cardHTML(p) {
  const out = p.stock === 0;
  return `
    <article class="card">
      ${out ? `<span class="badge-out">Agotado</span>` : ""}
      <a class="card__link" href="#/producto/${p.id}" aria-label="Ver detalle de ${esc(p.name)}">${imgTag(p.image, p.name, "card__img")}</a>
      <h3 class="card__name"><a href="#/producto/${p.id}">${esc(p.name)}</a></h3>
      <p class="card__meta">${esc(p.brand)}</p>
      <p class="card__price">${money(p.price)}</p>
      <button class="card__btn" data-add="${p.id}" ${out ? "disabled" : ""}>${out ? "No disponible" : "Agregar al carrito"}</button>
    </article>`;
}

// Un solo listener para todos los botones "Agregar al carrito"
app.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-add]");
  if (btn) addToCart(Number(btn.dataset.add));
});

/* ---------- 7. PANTALLAS ---------- */
function viewWelcome() {
  app.innerHTML = `
    <section class="view welcome">
      <span class="logo">MASHE</span>
      <p class="tagline">Todos tus materiales en un solo lugar</p>
      <button class="btn-soft" data-go="#/login">Iniciar sesión</button>
      <button class="btn-soft" data-go="#/registro">Registrarme</button>
      <a class="auth-back" href="#/inicio">Explorar sin cuenta</a>
    </section>`;
}

function viewAuth(mode) {
  const isLogin = mode === "login";
  app.innerHTML = `
    <section class="view auth">
      <a class="logo" href="#/bienvenida" aria-label="Volver a la bienvenida">MASHE</a>
      <h1>${isLogin ? "Iniciar Sesión" : "Crear cuenta"}</h1>
      <p class="sub">${isLogin ? "Inicia sesión o crea una cuenta" : "Regístrate para comprar más rápido"}</p>
      <button class="btn-google" id="google-btn" type="button">Continuar con Google</button>
      <form id="auth-form" novalidate>
        ${isLogin ? "" : `
        <div class="field">
          <label for="name">Nombre</label>
          <div class="field-row"><input id="name" name="name" autocomplete="name" required></div>
        </div>`}
        <div class="field">
          <label for="email">Correo electrónico</label>
          <div class="field-row">
            <input id="email" name="email" type="email" autocomplete="email" required>
          </div>
        </div>
        <div class="field">
          <label for="password">Contraseña</label>
          <div class="field-row">
            <input id="password" name="password" type="password" autocomplete="${isLogin ? "current-password" : "new-password"}" required>
            <button type="submit" aria-label="Continuar">→</button>
          </div>
        </div>
        <p class="form-error" id="auth-error" role="alert"></p>
      </form>
      <p class="auth-switch">${isLogin
        ? `¿No tienes cuenta? <a href="#/registro">Regístrate</a>`
        : `¿Ya tienes cuenta? <a href="#/login">Inicia sesión</a>`}</p>
      <a class="auth-back" href="#/bienvenida">Volver</a>
    </section>`;

  function finish(name, email, token, role) {
    user = { name, email, token, role };
    save("mashe_user", user);
    navigate("#/inicio");
  }
  // DEMO: sesión simulada. Para producción conecta Firebase Auth, Supabase u otro backend.
  $("#google-btn").addEventListener("click", () => finish("Invitado", "invitado@gmail.com"));
  $("#auth-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = $("#email").value.trim();
    const password = $("#password").value;
    const nameInput = $("#name");
    const name = nameInput ? nameInput.value.trim() : "";
    const err = $("#auth-error");
    if (nameInput && !name) { err.textContent = "Escribe tu nombre."; nameInput.focus(); return; }
    if (!/^\S+@\S+\.\S+$/.test(email)) { err.textContent = "Escribe un correo válido, por ejemplo nombre@correo.com."; $("#email").focus(); return; }
    if (password.length < 6) { err.textContent = "La contraseña debe tener al menos 6 caracteres."; $("#password").focus(); return; }

    err.textContent = "";
    try {
      const data = await api(isLogin ? "/users/login" : "/users/register", {
        method: "POST",
        body: isLogin ? { email, password } : { name, email, password },
      });
      finish(data.user.name, data.user.email, data.token, data.user.role);
    } catch (error) {
      err.textContent = error.message;
    }
  });
}

function viewHome() {
  app.innerHTML = `
    <section class="view">
      <div class="band">
        <h1 class="section-title">¿Qué estás buscando?</h1>
        <div class="tiles">
          ${HOME_TILES.map((t) => `
            <a class="tile" href="#/catalogo/arte?tipo=${encodeURIComponent(t.type)}">
              ${imgTag(t.image, t.label)}
              <span>${esc(t.label)}</span>
            </a>`).join("")}
        </div>
      </div>
      <div class="best">
        <h2 class="section-title">Los más vendidos</h2>
        <div class="grid">${PRODUCTS.filter((p) => p.best).map(cardHTML).join("")}</div>
      </div>
    </section>`;
}

/* ---- Catálogo con filtros ---- */
function emptyFilters() { return { stock: new Set(), price: "", types: new Set(), brands: new Set(), sort: "relevancia" }; }

function applyFilters(list, f) {
  let out = list.filter((p) => {
    if (f.stock.size === 1) {
      if (f.stock.has("en") && p.stock === 0) return false;
      if (f.stock.has("ag") && p.stock > 0) return false;
    }
    if (f.price) {
      const r = PRICE_RANGES.find((x) => x.id === f.price);
      if (r && !(p.price >= r.min && p.price < r.max)) return false;
    }
    if (f.types.size && !f.types.has(p.type)) return false;
    if (f.brands.size && !f.brands.has(p.brand)) return false;
    return true;
  });
  const sorters = {
    "precio-asc": (a, b) => a.price - b.price,
    "precio-desc": (a, b) => b.price - a.price,
    "nombre": (a, b) => a.name.localeCompare(b.name, "es"),
  };
  if (sorters[f.sort]) out = [...out].sort(sorters[f.sort]);
  return out;
}

function viewCatalog({ title, base, preset }) {
  const f = emptyFilters();
  if (preset) f.types.add(preset);
  const types = [...new Set(base.map((p) => p.type))].sort((a, b) => a.localeCompare(b, "es"));
  const brands = [...new Set(base.map((p) => p.brand))].sort((a, b) => a.localeCompare(b, "es"));

  const checkbox = (group, value, label, checked) =>
    `<label><input type="checkbox" data-filter="${group}" value="${esc(value)}" ${checked ? "checked" : ""}> ${esc(label)}</label>`;

  app.innerHTML = `
    <section class="view catalog">
      <h1>${esc(title)}</h1>
      <p class="count" id="count"></p>
      <div class="filters" id="filters">
        <span>Filtrar:</span>
        <details class="dd"><summary>Disponibilidad</summary>
          <div class="dd-panel">${checkbox("stock", "en", "En stock", false)}${checkbox("stock", "ag", "Agotado", false)}</div></details>
        <details class="dd"><summary>Precio</summary>
          <div class="dd-panel">
            <label><input type="radio" name="price" data-filter="price" value="" checked> Todos</label>
            ${PRICE_RANGES.map((r) => `<label><input type="radio" name="price" data-filter="price" value="${r.id}"> ${r.label}</label>`).join("")}
          </div></details>
        <details class="dd"><summary>Tipo</summary>
          <div class="dd-panel">${types.map((t) => checkbox("types", t, t, f.types.has(t))).join("")}</div></details>
        <details class="dd"><summary>Marca</summary>
          <div class="dd-panel">${brands.map((b) => checkbox("brands", b, b, false)).join("")}</div></details>
        <label>Ordenar:
          <select data-filter="sort" aria-label="Ordenar productos">
            <option value="relevancia">Relevancia</option>
            <option value="precio-asc">Precio: menor a mayor</option>
            <option value="precio-desc">Precio: mayor a menor</option>
            <option value="nombre">Nombre A–Z</option>
          </select>
        </label>
        <button class="btn-clear" id="clear-filters" hidden>Limpiar filtros</button>
      </div>
      <div class="grid" id="results" aria-live="polite"></div>
    </section>`;

  const results = $("#results");
  const count = $("#count");
  const clearBtn = $("#clear-filters");

  function paint() {
    const list = applyFilters(base, f);
    results.innerHTML = list.length
      ? list.map(cardHTML).join("")
      : `<p class="empty">No encontramos productos con esos filtros.</p>`;
    count.textContent = `${list.length} producto${list.length === 1 ? "" : "s"}`;
    const active = f.stock.size || f.price || f.types.size || f.brands.size || f.sort !== "relevancia";
    clearBtn.hidden = !active;
  }

  $("#filters").addEventListener("change", (e) => {
    const el = e.target.closest("[data-filter]");
    if (!el) return;
    const g = el.dataset.filter;
    if (g === "price" || g === "sort") f[g] = el.value;
    else if (el.checked) f[g].add(el.value); else f[g].delete(el.value);
    paint();
  });
  clearBtn.addEventListener("click", () => {
    Object.assign(f, emptyFilters());
    $$("#filters input[type=checkbox]").forEach((i) => (i.checked = false));
    $("#filters input[type=radio][value='']").checked = true;
    $("#filters select").value = "relevancia";
    paint();
  });
  paint();
}


/* ---- Detalle de producto ---- */
function viewProduct(id) {
  const p = productById(id);
  if (!p) { app.innerHTML = `<section class="view faq"><h1>Producto no encontrado</h1><p>Ese producto no existe o ya no está disponible.</p><a class="auth-back" href="#/inicio">Volver al inicio</a></section>`; return; }

  const info = DETAILS[p.id] || {
    desc: `${p.name} de la marca ${p.brand}. Un producto de ${p.type.toLowerCase()} de nuestra categoría ${catName(p.cat)}.`,
    specs: [],
  };
  const specs = [["Marca", p.brand], ["Categoría", catName(p.cat)], ["Tipo", p.type], ...info.specs];
  const out = p.stock === 0;
  const low = !out && p.stock <= 10;
  const related = PRODUCTS.filter((x) => x.id !== p.id && (x.type === p.type || x.cat === p.cat))
    .sort((a, b) => (b.type === p.type) - (a.type === p.type)).slice(0, 4);

  app.innerHTML = `
    <section class="view detail">
      <nav class="crumbs" aria-label="Ruta de navegación">
        <a href="#/inicio">Inicio</a> › <a href="#/catalogo/${esc(p.cat)}">${esc(catName(p.cat))}</a> › <a href="#/catalogo/${p.cat}?tipo=${encodeURIComponent(p.type)}">${esc(p.type)}</a> › <span>${esc(p.name)}</span>
      </nav>

      <div class="detail__main">
        <div class="detail__media">${imgTag(p.image, p.name)}</div>

        <div class="detail__info">
          <p class="detail__brand">${esc(p.brand)}</p>
          <h1>${esc(p.name)}</h1>
          <p class="detail__price">${money(p.price)}</p>
          <p class="stock ${out ? "stock--out" : low ? "stock--low" : "stock--ok"}">
            ${out ? "Agotado" : low ? `¡Quedan solo ${p.stock} unidades!` : "Disponible"}
          </p>
          <p class="detail__desc">${esc(info.desc)}</p>

          <div class="buy-row">
            <div class="qty qty--lg" aria-label="Cantidad">
              <button type="button" id="q-minus" aria-label="Menos" ${out ? "disabled" : ""}>−</button>
              <span id="q-val" aria-live="polite">1</span>
              <button type="button" id="q-plus" aria-label="Más" ${out ? "disabled" : ""}>+</button>
            </div>
            <button class="btn-primary buy-btn" id="buy-btn" ${out ? "disabled" : ""}>${out ? "No disponible" : "Agregar al carrito"}</button>
          </div>
          <button class="btn-soft buy-now" id="buy-now" ${out ? "hidden" : ""}>Comprar ahora</button>
          <p class="drawer__note" style="margin-top:14px">Envío gratis desde ${money(FREE_SHIPPING_FROM)}. Devoluciones dentro de 8 días.</p>
        </div>
      </div>

      <div class="detail__specs">
        <h2>Ficha técnica</h2>
        <dl>${specs.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join("")}</dl>
      </div>

      ${related.length ? `
      <div class="best">
        <h2 class="section-title">También te puede gustar</h2>
        <div class="grid">${related.map(cardHTML).join("")}</div>
      </div>` : ""}
    </section>`;

  let qty = 1;
  const val = $("#q-val");
  $("#q-minus").addEventListener("click", () => { if (qty > 1) val.textContent = --qty; });
  $("#q-plus").addEventListener("click", () => {
    if (qty < p.stock) val.textContent = ++qty; else toast(`Solo hay ${p.stock} unidades disponibles`);
  });
  $("#buy-btn").addEventListener("click", () => { addToCart(p.id, qty); });
  $("#buy-now").addEventListener("click", () => { addToCart(p.id, qty); navigate("#/pago"); });
}

function viewFaq() {
  app.innerHTML = `
    <section class="view faq">
      <h1>Preguntas frecuentes</h1>
      ${FAQ.map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join("")}
    </section>`;
}

/* ---- Pago ---- */
function renderCheckout() {
  if (!cart.length) { navigate("#/inicio"); toast("Tu carrito está vacío"); return; }
  const sub = cartSubtotal();
  const ship = shippingFor(sub);
  const prev = $("#checkout-form");
  const keep = prev ? Object.fromEntries(new FormData(prev)) : {};
  const val = (k, d = "") => esc(keep[k] ?? d);

  app.innerHTML = `
    <section class="view checkout">
      <form id="checkout-form" novalidate>
        <h1>Finalizar compra</h1>

        <h2>Datos de contacto</h2>
        <div class="form-grid">
          <div class="field"><label for="c-name">Nombre completo</label><div class="field-row"><input id="c-name" name="name" autocomplete="name" value="${val("name", user ? user.name : "")}" required></div></div>
          <div class="field"><label for="c-email">Correo electrónico</label><div class="field-row"><input id="c-email" name="email" type="email" autocomplete="email" value="${val("email", user ? user.email : "")}" required></div></div>
          <div class="field full"><label for="c-phone">Teléfono</label><div class="field-row"><input id="c-phone" name="phone" type="tel" autocomplete="tel" inputmode="numeric" value="${val("phone")}" required></div></div>
        </div>

        <h2>Dirección de envío</h2>
        <div class="form-grid">
          <div class="field full"><label for="c-address">Dirección</label><div class="field-row"><input id="c-address" name="address" autocomplete="street-address" value="${val("address")}" required></div></div>
          <div class="field"><label for="c-city">Ciudad</label><div class="field-row"><input id="c-city" name="city" autocomplete="address-level2" value="${val("city", "Bogotá")}" required></div></div>
          <div class="field"><label for="c-notes">Indicaciones (opcional)</label><div class="field-row"><input id="c-notes" name="notes" value="${val("notes")}"></div></div>
        </div>

        <h2>Método de pago</h2>
        <div class="pay-options" id="pay-options">
          ${[["tarjeta", "Tarjeta débito o crédito"], ["pse", "PSE"], ["contraentrega", "Pago contra entrega"]].map(([v, l]) =>
            `<label><input type="radio" name="pay" value="${v}" ${(keep.pay || "tarjeta") === v ? "checked" : ""}> ${l}</label>`).join("")}
        </div>
        <div class="card-fields" id="card-fields">
          <div class="form-grid">
            <div class="field full"><label for="c-card">Número de tarjeta</label><div class="field-row"><input id="c-card" inputmode="numeric" autocomplete="cc-number" placeholder="0000 0000 0000 0000"></div></div>
            <div class="field"><label for="c-exp">Vence (MM/AA)</label><div class="field-row"><input id="c-exp" autocomplete="cc-exp" placeholder="MM/AA"></div></div>
            <div class="field"><label for="c-cvv">CVV</label><div class="field-row"><input id="c-cvv" inputmode="numeric" autocomplete="cc-csc" maxlength="4"></div></div>
          </div>
          <p class="drawer__note" style="margin-top:10px">Demo: los datos de la tarjeta no se envían ni se guardan. Para cobrar de verdad conecta una pasarela como Wompi, ePayco o Stripe.</p>
        </div>

        <p class="form-error" id="checkout-error" role="alert"></p>
        <button class="btn-primary" type="submit">Confirmar pedido · ${money(sub + ship)}</button>
      </form>

      <aside class="summary" aria-label="Resumen del pedido">
        <h2>Resumen</h2>
        ${cart.map((l) => {
          const p = productById(l.id);
          return `<div class="sum-item">
            ${imgTag(p.image, p.name)}
            <div class="grow">${esc(p.name)}<small>${l.qty} × ${money(p.price)}</small>
              <div class="qty">
                <button type="button" data-q="menos" data-id="${p.id}" aria-label="Quitar una unidad de ${esc(p.name)}">−</button>
                <span>${l.qty}</span>
                <button type="button" data-q="mas" data-id="${p.id}" aria-label="Agregar una unidad de ${esc(p.name)}">+</button>
              </div></div>
            <strong>${money(p.price * l.qty)}</strong>
          </div>`;
        }).join("")}
        <div class="sum-row"><span>Subtotal</span><span>${money(sub)}</span></div>
        <div class="sum-row"><span>Envío</span><span>${ship === 0 ? "Gratis" : money(ship)}</span></div>
        <div class="sum-row total"><span>Total</span><span>${money(sub + ship)}</span></div>
      </aside>
    </section>`;

  const form = $("#checkout-form");
  const cardBox = $("#card-fields");
  const syncCard = () => { cardBox.hidden = form.pay.value !== "tarjeta"; };
  syncCard();
  $("#pay-options").addEventListener("change", syncCard);

  $(".summary").addEventListener("click", (e) => {
    const b = e.target.closest("[data-q]");
    if (b) changeQty(Number(b.dataset.id), b.dataset.q === "mas" ? 1 : -1);
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(form));
    const err = $("#checkout-error");
    const fail = (msg, id) => { err.textContent = msg; $("#" + id).focus(); };

    if (!d.name.trim()) return fail("Escribe tu nombre completo.", "c-name");
    if (!/^\S+@\S+\.\S+$/.test(d.email.trim())) return fail("Escribe un correo válido.", "c-email");
    if (d.phone.replace(/\D/g, "").length < 7) return fail("Escribe un teléfono válido.", "c-phone");
    if (!d.address.trim()) return fail("Escribe la dirección de entrega.", "c-address");
    if (!d.city.trim()) return fail("Escribe la ciudad.", "c-city");
    if (d.pay === "tarjeta") {
      const num = $("#c-card").value.replace(/\s/g, "");
      if (!/^\d{13,19}$/.test(num)) return fail("El número de tarjeta debe tener entre 13 y 19 dígitos.", "c-card");
      if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test($("#c-exp").value.trim())) return fail("Escribe el vencimiento como MM/AA.", "c-exp");
      if (!/^\d{3,4}$/.test($("#c-cvv").value.trim())) return fail("El CVV tiene 3 o 4 dígitos.", "c-cvv");
    }

    // El precio, el envío y el stock los calcula el servidor. La tarjeta es solo una validación visual:
    // sus datos nunca salen del navegador.
    const btn = form.querySelector('[type="submit"]');
    if (btn) btn.disabled = true;
    err.textContent = "";
    try {
      const { order } = await api("/orders", {
        method: "POST",
        body: {
          items: cart.map((l) => ({ id: l.id, qty: l.qty })),
          customer: { name: d.name.trim(), email: d.email.trim(), phone: d.phone.trim(), address: d.address.trim(), city: d.city.trim(), notes: (d.notes || "").trim() },
          pay: d.pay,
        },
      });
      const orders = store("mashe_orders", []);
      orders.push(order);
      save("mashe_orders", orders);

      cart = [];
      persistCart();
      loadProducts().catch(() => {}); // refresca el stock que ve el cliente
      navigate("#/confirmacion/" + order.id);
    } catch (error) {
      err.textContent = error.message;
      if (error.status === 409) { loadProducts().then(persistCart).catch(() => {}); } // el stock cambió
      if (btn) btn.disabled = false;
    }
  });
}

function viewConfirmation(orderId) {
  const order = store("mashe_orders", []).find((o) => o.id === orderId);
  if (!order) { navigate("#/inicio"); return; }
  const payLabel = { tarjeta: "tarjeta", pse: "PSE", contraentrega: "pago contra entrega" }[order.pay];
  app.innerHTML = `
    <section class="view done">
      <div class="check" aria-hidden="true">✓</div>
      <h1>¡Gracias por tu compra!</h1>
      <p>Tu pedido <span class="order-no">${esc(order.id)}</span> fue recibido.</p>
      <p>Total: <strong>${money(order.total)}</strong> · Pago: ${esc(payLabel)}</p>
      <p>Lo enviaremos a ${esc(order.customer.address)}, ${esc(order.customer.city)}. Te escribiremos a ${esc(order.customer.email)}.</p>
      <a class="btn-soft" href="#/inicio">Volver al inicio</a>
      ${user && user.token ? `<a class="btn-soft" href="#/pedidos">Ver mis pedidos</a>` : ""}
    </section>`;
}

/* ---- Mis pedidos ---- */
const ORDER_STATUS = { pendiente: "Pendiente", pagado: "Pagado", enviado: "Enviado", entregado: "Entregado", cancelado: "Cancelado" };
const ORDER_RANK = { pendiente: 0, pagado: 1, enviado: 2, entregado: 3 };
const TIMELINE = [
  { key: "pendiente", label: "Pedido recibido" },
  { key: "pagado", label: "Pago confirmado" },
  { key: "enviado", label: "En camino" },
  { key: "entregado", label: "Entregado" },
];
const PAY_LABEL = { tarjeta: "Tarjeta", pse: "PSE", contraentrega: "Contra entrega" };

// Línea de tiempo del estado. En contra entrega no hay paso de "pago confirmado": se paga al recibir.
function orderTimeline(o) {
  if (o.status === "cancelado") return `<p class="order-cancelled">Este pedido fue cancelado.</p>`;
  const steps = TIMELINE.filter((s) => !(o.pay === "contraentrega" && s.key === "pagado"));
  const rank = ORDER_RANK[o.status];
  const lastDone = steps.reduce((acc, s, i) => (ORDER_RANK[s.key] <= rank ? i : acc), -1);
  return `<ol class="timeline" aria-label="Estado del pedido">${steps.map((s, i) =>
    `<li class="tl-step${i <= lastDone ? " tl-done" : ""}${i === lastDone ? " tl-current" : ""}"${i === lastDone ? ' aria-current="step"' : ""}>
       <span class="tl-dot" aria-hidden="true">${i <= lastDone ? "✓" : ""}</span><span class="tl-label">${s.label}</span>
     </li>`).join("")}</ol>`;
}

function orderCard(o) {
  const date = new Date(o.date).toLocaleDateString("es-CO", { day: "numeric", month: "long", year: "numeric" });
  const canCancel = o.status === "pendiente" || o.status === "pagado";
  return `
    <article class="order-card">
      <header class="order-head">
        <div><h2>Pedido <span class="order-no">${esc(o.id)}</span></h2><p class="order-date">${date}</p></div>
        <span class="order-status order-status--${esc(o.status)}">${ORDER_STATUS[o.status] || esc(o.status)}</span>
      </header>
      ${orderTimeline(o)}
      <ul class="order-items">${o.items.map((i) => `<li><span>${esc(i.name)} × ${i.qty}</span><span>${money(i.price * i.qty)}</span></li>`).join("")}</ul>
      <dl class="order-totals">
        <div><dt>Subtotal</dt><dd>${money(o.subtotal)}</dd></div>
        <div><dt>Envío</dt><dd>${o.shipping ? money(o.shipping) : "Gratis"}</dd></div>
        <div class="order-total"><dt>Total</dt><dd>${money(o.total)}</dd></div>
      </dl>
      <p class="order-meta">Pago: ${esc(PAY_LABEL[o.pay] || o.pay)} · ${o.paymentStatus === "aprobado" ? "aprobado" : "se paga al recibir"}<br>
        Entrega: ${esc(o.customer.address)}, ${esc(o.customer.city)}</p>
      ${canCancel ? `<button class="btn-cancel" type="button" data-cancel="${esc(o.id)}">Cancelar pedido</button>` : ""}
    </article>`;
}

async function viewOrders() {
  if (isAdmin()) { navigate("#/admin/pedidos"); return; }
  if (!user || !user.token) { navigate("#/login"); toast("Inicia sesión para ver tus pedidos"); return; }
  app.innerHTML = `<section class="view orders"><h1>Mis pedidos</h1><p class="orders-empty">Cargando tus pedidos…</p></section>`;

  let orders;
  try {
    ({ orders } = await api("/orders/mine"));
  } catch (error) {
    if (currentRoute !== "pedidos") return; // el cliente ya cambió de pantalla
    if (error.status === 401) {
      user = null; save("mashe_user", null);
      navigate("#/login"); toast("Tu sesión venció. Inicia sesión de nuevo.");
      return;
    }
    $(".orders").innerHTML = `<h1>Mis pedidos</h1><p class="form-error">${esc(error.message)}</p>`;
    return;
  }
  if (currentRoute !== "pedidos") return;

  app.innerHTML = `
    <section class="view orders">
      <h1>Mis pedidos</h1>
      ${orders.length
        ? orders.map(orderCard).join("")
        : `<div class="orders-empty"><p>Aún no tienes pedidos.</p><a class="btn-soft" href="#/inicio">Ir a comprar</a></div>`}
    </section>`;
  $$("[data-cancel]").forEach((b) => b.addEventListener("click", () => cancelOrder(b.dataset.cancel, b)));
}

async function cancelOrder(code, btn) {
  if (!confirm(`¿Seguro que quieres cancelar el pedido ${code}?`)) return;
  btn.disabled = true;
  try {
    await api(`/orders/${encodeURIComponent(code)}/cancel`, { method: "PATCH" });
    toast("Pedido cancelado");
    loadProducts().catch(() => {}); // el stock vuelve a estar disponible
    viewOrders();
  } catch (error) {
    toast(error.message);
    btn.disabled = false;
  }
}

/* ---------- PANEL DE ADMINISTRADOR (#/admin) ---------- */
function isAdmin() { return Boolean(user && user.token && user.role === "administrador"); }

const ADMIN_TABS = [["pedidos", "Pedidos"], ["productos", "Productos"], ["categorias", "Categorías"]];
// Mismas transiciones que valida el servidor (clase Pedido). El servidor siempre tiene la última palabra.
const NEXT_STATES = { pendiente: ["pagado", "enviado", "cancelado"], pagado: ["enviado", "cancelado"], enviado: ["entregado"], entregado: [], cancelado: [] };

let adminTab = "";
let adminOrderFilter = "todos";
let adminProductEditing = null;  // null | "nuevo" | id del producto que se edita
let adminCategoryEditing = null; // null | "nueva" | clave de la categoría que se edita

const stillHere = (tab) => currentRoute === "admin" && adminTab === tab; // el admin no cambió de pestaña mientras cargaba
const adminBody = () => $("#admin-body");
const shortDate = (d) => new Date(d).toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric" });

function adminError(error) {
  if (error.status === 401) {
    user = null; save("mashe_user", null);
    navigate("#/login"); toast("Tu sesión venció. Inicia sesión de nuevo.");
  } else if (error.status === 403) {
    navigate("#/inicio"); toast("No tienes permiso para hacer esto");
  } else if (adminBody()) {
    adminBody().innerHTML = `<p class="form-error">${esc(error.message)}</p>`;
  }
}

// Recarga productos y categorías, y vuelve a dibujar el menú
async function refreshCatalog() { await loadProducts(); renderNav(); }

function viewAdmin(tab) {
  if (!isAdmin()) { navigate("#/inicio"); toast("No tienes permiso para entrar al panel"); return; }
  if (!ADMIN_TABS.some(([k]) => k === tab)) tab = "pedidos";
  adminTab = tab;
  adminProductEditing = null;
  adminCategoryEditing = null;

  app.innerHTML = `
    <section class="view admin">
      <h1>Panel de administración</h1>
      <nav class="admin-tabs" aria-label="Secciones del panel">
        ${ADMIN_TABS.map(([k, n]) => `<a href="#/admin/${k}" class="${k === tab ? "active" : ""}"${k === tab ? ' aria-current="page"' : ""}>${n}</a>`).join("")}
      </nav>
      <div id="admin-body"><p class="admin-empty">Cargando…</p></div>
    </section>`;
  ({ pedidos: adminOrders, productos: adminProducts, categorias: adminCategories })[tab]();
}

/* ---- Pedidos ---- */
async function adminOrders() {
  let orders;
  try { ({ orders } = await api("/orders")); } catch (error) { if (stillHere("pedidos")) adminError(error); return; }
  if (!stillHere("pedidos")) return;

  const list = adminOrderFilter === "todos" ? orders : orders.filter((o) => o.status === adminOrderFilter);
  adminBody().innerHTML = `
    <div class="admin-bar">
      <label>Estado
        <select id="order-filter">
          <option value="todos">Todos (${orders.length})</option>
          ${Object.entries(ORDER_STATUS).map(([k, n]) => `<option value="${k}"${k === adminOrderFilter ? " selected" : ""}>${n} (${orders.filter((o) => o.status === k).length})</option>`).join("")}
        </select>
      </label>
    </div>
    ${list.length ? `
      <div class="admin-table-wrap"><table class="admin-table">
        <thead><tr><th>Pedido</th><th>Fecha</th><th>Cliente</th><th>Pago</th><th>Total</th><th>Estado</th></tr></thead>
        <tbody>${list.map(adminOrderRow).join("")}</tbody>
      </table></div>` : `<p class="admin-empty">No hay pedidos con ese estado.</p>`}`;

  $("#order-filter").addEventListener("change", (e) => { adminOrderFilter = e.target.value; adminOrders(); });
  $$(".state-select").forEach((s) => s.addEventListener("change", () => s.value && changeOrderState(s.dataset.order, s.value)));
}

function adminOrderRow(o) {
  const next = NEXT_STATES[o.status] || [];
  return `<tr>
    <td data-label="Pedido"><div class="cell"><strong>${esc(o.id)}</strong><br><small>${o.items.length} producto(s)</small></div></td>
    <td data-label="Fecha"><div class="cell">${shortDate(o.date)}</div></td>
    <td data-label="Cliente"><div class="cell">${esc(o.customer.name)}<br><small>${esc(o.customer.email)} · ${esc(o.customer.city)}</small></div></td>
    <td data-label="Pago"><div class="cell">${esc(PAY_LABEL[o.pay] || o.pay)}<br><small>${esc(o.paymentStatus)}</small></div></td>
    <td data-label="Total"><div class="cell">${money(o.total)}</div></td>
    <td data-label="Estado"><div class="cell">${next.length
      ? `<select class="state-select" data-order="${esc(o.id)}" aria-label="Cambiar el estado del pedido ${esc(o.id)}">
           <option value="">${ORDER_STATUS[o.status]}</option>
           ${next.map((s) => `<option value="${s}">→ ${ORDER_STATUS[s]}</option>`).join("")}
         </select>`
      : `<span class="order-status order-status--${esc(o.status)}">${ORDER_STATUS[o.status] || esc(o.status)}</span>`}</div></td>
  </tr>`;
}

async function changeOrderState(code, state) {
  const extra = state === "cancelado" ? " Las unidades vuelven al inventario." : "";
  if (!confirm(`¿Cambiar el pedido ${code} a “${ORDER_STATUS[state]}”?${extra}`)) { adminOrders(); return; }
  try {
    await api(`/orders/${encodeURIComponent(code)}/status`, { method: "PATCH", body: { status: state } });
    toast("Estado actualizado");
    if (state === "cancelado") loadProducts().catch(() => {}); // el stock volvió a la tienda
  } catch (error) {
    if (error.status === 401 || error.status === 403) { adminError(error); return; }
    toast(error.message);
  }
  if (stillHere("pedidos")) adminOrders();
}

/* ---- Productos ---- */
async function adminProducts() {
  try { await loadProducts(); } catch (error) { if (stillHere("productos")) adminError(error); return; }
  if (stillHere("productos")) renderAdminProducts();
}

function productForm(p) {
  const isNew = adminProductEditing === "nuevo";
  const v = (k, d = "") => esc(p[k] ?? d);
  return `
    <form class="admin-form" id="product-form" novalidate>
      <h2>${isNew ? "Nuevo producto" : `Editar producto n.º ${p.id}`}</h2>
      <div class="admin-grid">
        <label>Nombre<input name="name" maxlength="120" value="${v("name")}"></label>
        <label>Categoría
          <select name="cat">${Object.entries(CATEGORIES).map(([k, n]) => `<option value="${esc(k)}"${k === p.cat ? " selected" : ""}>${esc(n)}</option>`).join("")}</select>
        </label>
        <label>Tipo<input name="type" value="${v("type")}" placeholder="Ej. Pinturas"></label>
        <label>Marca<input name="brand" value="${v("brand")}"></label>
        <label>Precio (COP)<input name="price" type="number" min="0" step="1" value="${v("price")}"></label>
        <label>Cantidad en inventario<input name="stock" type="number" min="0" step="1" value="${v("stock", 0)}"></label>
        <label class="wide">Imagen (ruta)<input name="image" value="${v("image")}" placeholder="img/oleos.jpg"></label>
        <label class="wide">Descripción<textarea name="desc" rows="3">${esc(p.desc ?? "")}</textarea></label>
        <label class="check"><input type="checkbox" name="best"${p.best ? " checked" : ""}> Mostrar en “Los más vendidos”</label>
      </div>
      <p class="form-error" id="product-error" role="alert"></p>
      <div class="admin-actions">
        <button class="btn-soft" type="submit">${isNew ? "Crear producto" : "Guardar cambios"}</button>
        <button class="btn-ghost" type="button" id="product-cancel">Cancelar</button>
      </div>
    </form>`;
}

function renderAdminProducts() {
  const editing = adminProductEditing === "nuevo" ? {} : PRODUCTS.find((p) => p.id === adminProductEditing);
  adminBody().innerHTML = `
    <div class="admin-bar"><button class="btn-soft" id="new-product" type="button">+ Nuevo producto</button></div>
    ${adminProductEditing !== null && editing ? productForm(editing) : ""}
    <div class="admin-table-wrap"><table class="admin-table">
      <thead><tr><th>N.º</th><th>Producto</th><th>Categoría</th><th>Precio</th><th>Inventario</th><th></th></tr></thead>
      <tbody>${PRODUCTS.map((p) => `<tr>
        <td data-label="N.º"><div class="cell">${p.id}</div></td>
        <td data-label="Producto"><div class="cell"><strong>${esc(p.name)}</strong><br><small>${esc(p.brand)} · ${esc(p.type)}</small></div></td>
        <td data-label="Categoría"><div class="cell">${esc(catName(p.cat))}</div></td>
        <td data-label="Precio"><div class="cell">${money(p.price)}</div></td>
        <td data-label="Inventario"><div class="cell">${p.stock === 0 ? `<span class="stock-out">Agotado</span>` : p.stock}</div></td>
        <td><button class="btn-small" type="button" data-edit-product="${p.id}">Editar</button></td>
      </tr>`).join("")}</tbody>
    </table></div>`;

  $("#new-product").addEventListener("click", () => { adminProductEditing = "nuevo"; renderAdminProducts(); focusForm("#product-form"); });
  $$("[data-edit-product]").forEach((b) => b.addEventListener("click", () => {
    adminProductEditing = Number(b.dataset.editProduct);
    renderAdminProducts();
    focusForm("#product-form");
  }));
  const form = $("#product-form");
  if (!form) return;
  $("#product-cancel").addEventListener("click", () => { adminProductEditing = null; renderAdminProducts(); });
  form.addEventListener("submit", saveProduct);
}

function focusForm(sel) {
  const f = $(sel);
  if (f) { f.scrollIntoView({ block: "start" }); f.querySelector("input")?.focus(); }
}

async function saveProduct(e) {
  e.preventDefault();
  const form = e.target;
  const f = new FormData(form);
  const err = $("#product-error");
  const body = {
    name: f.get("name").trim(), cat: f.get("cat"), type: f.get("type").trim(), brand: f.get("brand").trim(),
    price: Number(f.get("price")), stock: Number(f.get("stock")),
    image: f.get("image").trim(), desc: f.get("desc").trim(), best: f.get("best") === "on",
  };
  if (!body.name || !body.type || !body.brand) { err.textContent = "Completa el nombre, el tipo y la marca."; return; }
  if (f.get("price").trim() === "" || !Number.isFinite(body.price) || body.price < 0) { err.textContent = "El precio debe ser un número positivo."; return; }
  if (f.get("stock").trim() === "" || !Number.isInteger(body.stock) || body.stock < 0) { err.textContent = "El inventario debe ser un número entero, mínimo 0."; return; }
  err.textContent = "";

  const btn = form.querySelector('[type="submit"]');
  btn.disabled = true;
  const isNew = adminProductEditing === "nuevo";
  try {
    await api(isNew ? "/products" : `/products/${adminProductEditing}`, { method: isNew ? "POST" : "PATCH", body });
    toast(isNew ? "Producto creado" : "Producto actualizado");
    adminProductEditing = null;
    await loadProducts();
    if (stillHere("productos")) renderAdminProducts();
  } catch (error) {
    if (error.status === 401 || error.status === 403) { adminError(error); return; }
    err.textContent = error.message;
    btn.disabled = false;
  }
}

/* ---- Categorías ---- */
async function adminCategories() {
  let categories;
  try { ({ categories } = await api("/categories")); } catch (error) { if (stillHere("categorias")) adminError(error); return; }
  if (stillHere("categorias")) renderAdminCategories(categories);
}

function renderAdminCategories(categories) {
  const isNew = adminCategoryEditing === "nueva";
  const editing = isNew ? {} : categories.find((c) => c.key === adminCategoryEditing);
  adminBody().innerHTML = `
    <div class="admin-bar"><button class="btn-soft" id="new-category" type="button">+ Nueva categoría</button></div>
    ${adminCategoryEditing !== null && editing ? `
      <form class="admin-form" id="category-form" novalidate>
        <h2>${isNew ? "Nueva categoría" : `Editar “${esc(editing.name)}”`}</h2>
        <div class="admin-grid">
          <label>Nombre<input name="name" maxlength="40" value="${esc(editing.name ?? "")}"></label>
          <label class="wide">Descripción<textarea name="description" rows="2" maxlength="200">${esc(editing.description ?? "")}</textarea></label>
        </div>
        <p class="form-error" id="category-error" role="alert"></p>
        <div class="admin-actions">
          <button class="btn-soft" type="submit">${isNew ? "Crear categoría" : "Guardar cambios"}</button>
          <button class="btn-ghost" type="button" id="category-cancel">Cancelar</button>
        </div>
      </form>` : ""}
    ${categories.length ? `
      <div class="admin-table-wrap"><table class="admin-table">
        <thead><tr><th>Nombre</th><th>Descripción</th><th>Productos</th><th></th></tr></thead>
        <tbody>${categories.map((c) => `<tr>
          <td data-label="Nombre"><div class="cell"><strong>${esc(c.name)}</strong><br><small>${esc(c.key)}</small></div></td>
          <td data-label="Descripción"><div class="cell">${esc(c.description) || "—"}</div></td>
          <td data-label="Productos"><div class="cell">${c.productCount}</div></td>
          <td class="admin-row-actions">
            <button class="btn-small" type="button" data-edit-category="${esc(c.key)}">Editar</button>
            <button class="btn-small btn-small--danger" type="button" data-delete-category="${esc(c.key)}"
              ${c.productCount ? 'disabled title="Tiene productos: muévelos a otra categoría primero"' : ""}>Eliminar</button>
          </td>
        </tr>`).join("")}</tbody>
      </table></div>` : `<p class="admin-empty">Todavía no hay categorías.</p>`}`;

  $("#new-category").addEventListener("click", () => { adminCategoryEditing = "nueva"; renderAdminCategories(categories); focusForm("#category-form"); });
  $$("[data-edit-category]").forEach((b) => b.addEventListener("click", () => {
    adminCategoryEditing = b.dataset.editCategory;
    renderAdminCategories(categories);
    focusForm("#category-form");
  }));
  $$("[data-delete-category]").forEach((b) => b.addEventListener("click", () => deleteCategory(b.dataset.deleteCategory)));
  if ($("#category-form")) {
    $("#category-cancel").addEventListener("click", () => { adminCategoryEditing = null; renderAdminCategories(categories); });
    $("#category-form").addEventListener("submit", saveCategory);
  }
}

async function saveCategory(e) {
  e.preventDefault();
  const f = new FormData(e.target);
  const err = $("#category-error");
  const body = { name: f.get("name").trim(), description: f.get("description").trim() };
  if (body.name.length < 2) { err.textContent = "El nombre debe tener al menos 2 caracteres."; return; }
  err.textContent = "";

  const btn = e.target.querySelector('[type="submit"]');
  btn.disabled = true;
  const isNew = adminCategoryEditing === "nueva";
  try {
    await api(isNew ? "/categories" : `/categories/${encodeURIComponent(adminCategoryEditing)}`, { method: isNew ? "POST" : "PATCH", body });
    toast(isNew ? "Categoría creada" : "Categoría actualizada");
    adminCategoryEditing = null;
    await refreshCatalog(); // el menú de la tienda se actualiza solo
    if (stillHere("categorias")) adminCategories();
  } catch (error) {
    if (error.status === 401 || error.status === 403) { adminError(error); return; }
    err.textContent = error.message;
    btn.disabled = false;
  }
}

async function deleteCategory(key) {
  if (!confirm(`¿Eliminar la categoría “${catName(key)}”?`)) return;
  try {
    await api(`/categories/${encodeURIComponent(key)}`, { method: "DELETE" });
    toast("Categoría eliminada");
    await refreshCatalog();
  } catch (error) {
    if (error.status === 401 || error.status === 403) { adminError(error); return; }
    toast(error.message);
  }
  if (stillHere("categorias")) adminCategories();
}

/* ---------- 8. ROUTER (por hash: #/inicio, #/catalogo/arte …) ---------- */
function navigate(hash) { if (location.hash === hash) route(); else location.hash = hash; }

// Qué enlace del menú se marca como activo (en el detalle, el de la categoría del producto)
function navKey(name, parts) {
  if (name === "catalogo") return parts[1];
  if (name === "producto") { const p = productById(Number(parts[1])); return p ? p.cat : ""; }
  return name;
}

function route() {
  const [path, qs = ""] = location.hash.slice(1).split("?");
  const parts = path.split("/").filter(Boolean);
  const params = new URLSearchParams(qs);
  const name = parts[0] || "bienvenida";
  currentRoute = name;

  const isAuthScreen = ["bienvenida", "login", "registro"].includes(name);
  header.hidden = nav.hidden = isAuthScreen;
  $$("[data-nav]", nav).forEach((a) => a.classList.toggle("active", a.dataset.nav === navKey(name, parts)));
  renderHeaderUser();
  renderCartBadge();
  if (name !== "buscar") $("#search-input").value = "";
  window.scrollTo(0, 0);

  switch (name) {
    case "bienvenida": viewWelcome(); break;
    case "login": viewAuth("login"); break;
    case "registro": viewAuth("registro"); break;
    case "inicio": viewHome(); break;
    case "catalogo": {
      const cat = CATEGORIES[parts[1]] ? parts[1] : (Object.keys(CATEGORIES)[0] || "arte");
      viewCatalog({ title: catName(cat), base: PRODUCTS.filter((p) => p.cat === cat), preset: params.get("tipo") });
      break;
    }
    case "buscar": {
      const q = (params.get("q") || "").trim();
      const norm = (s) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const base = PRODUCTS.filter((p) => norm(`${p.name} ${p.brand} ${p.type} ${p.cat}`).includes(norm(q)));
      viewCatalog({ title: `Resultados para “${q}”`, base });
      $("#search-input").value = q;
      break;
    }
    case "producto": viewProduct(Number(parts[1])); break;
    case "faq": viewFaq(); break;
    case "pago": renderCheckout(); break;
    case "confirmacion": viewConfirmation(parts[1]); break;
    case "pedidos": viewOrders(); break;
    case "admin": viewAdmin(parts[1]); break;
    default: navigate("#/inicio");
  }
}

/* ---------- 9. EVENTOS GLOBALES ---------- */
$("#search-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const q = $("#search-input").value.trim();
  if (q) navigate("#/buscar?q=" + encodeURIComponent(q));
});

// Botones con data-go (pantalla de bienvenida)
document.addEventListener("click", (e) => {
  const go = e.target.closest("[data-go]");
  if (go) navigate(go.dataset.go);

  const logout = e.target.closest("#logout");
  if (logout) { user = null; save("mashe_user", null); }

  // Cierra los desplegables de filtros al hacer clic fuera
  $$("details.dd[open]").forEach((d) => { if (!d.contains(e.target)) d.removeAttribute("open"); });
});

window.addEventListener("hashchange", route);

(async function init() {
  try {
    await loadProducts();
  } catch (error) {
    $("#app").innerHTML = `<section class="view faq"><h1>No pudimos cargar los productos</h1><p>${esc(error.message)}</p><p>Revisa que el servidor esté encendido y recarga la página.</p></section>`;
    return;
  }
  renderNav();
  route();
})();
