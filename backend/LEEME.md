# Backend de Mashe

API en Node.js + Express + Mongoose (MongoDB Atlas), con el dominio escrito en clases (POO).
La explicación de las clases, los principios de POO y la correspondencia con los requisitos está en
`docs/POO_Y_CORRESPONDENCIA.md`.

## Puesta en marcha

1. `npm install`
2. Copia `.env.example` a `.env` y llena `MONGODB_URI` y `JWT_SECRET`
3. `npm run seed`  → carga los 24 productos del frontend en la colección `products` (solo la primera vez)
4. `npm run dev`   → servidor en http://localhost:4000
5. `npm test`      → 35 pruebas automáticas (no necesitan base de datos)

## Estructura

```
src/
├── domain/         clases con las reglas de negocio (Usuario, Cliente, Administrador, Producto,
│                   Carrito, Pedido, MetodoPago...)
├── services/       casos de uso (comprar, registrar, cancelar...)
├── repositories/   acceso a MongoDB (convierten documentos <-> clases)
├── models/         esquemas de Mongoose
├── controllers/    HTTP <-> servicios
├── routes/ · middlewares/ · config/ · scripts/ · test/
├── container.js    arma los objetos y sus dependencias
└── app.js · index.js
```

## Endpoints (prefijo `/api/v1`)

| Método | Ruta | Acceso | Qué hace |
|---|---|---|---|
| POST | `/users/register` | público | Crea cuenta `{ name, email, password }` y devuelve token |
| POST | `/users/login` | público | Inicia sesión `{ email, password }` y devuelve token |
| GET | `/users/me` | token | Datos del usuario actual |
| GET | `/products` | público | Lista (`?cat=arte`, `?best=true`) |
| GET | `/products/:id` | público | Un producto |
| POST | `/products` | administrador | Crea producto |
| PATCH | `/products/:id` | administrador | Edita producto, precio o stock |
| POST | `/orders` | invitado o token | Crea pedido `{ items:[{id,qty}], customer, pay }` |
| GET | `/orders/mine` | cliente | Pedidos del cliente |
| PATCH | `/orders/:code/cancel` | cliente (dueño) | Cancela y devuelve el stock |
| GET | `/orders` | administrador | Todos los pedidos |
| PATCH | `/orders/:code/status` | administrador | Cambia el estado `{ status }` |

El token va en el header `Authorization: Bearer <token>`.

## Reglas de negocio

- Precio, envío y total los calcula el servidor con los precios de la BD.
- Envío: $9.000, gratis desde $150.000.
- El inventario se descuenta al crear el pedido, con una condición atómica (`stock >= cantidad`).
- Si el pago es rechazado o falla el guardado, el stock se devuelve. Al cancelar un pedido, también.
- Pago simulado: `tarjeta` y `pse` se aprueban; `contraentrega` queda pendiente. Para probar el rechazo, manda `"simulateReject": true` en el body (solo fuera de producción).
- Estados: `pendiente` → `pagado` → `enviado` → `entregado`, o `cancelado` (solo antes de enviar). Transiciones inválidas devuelven 409.
- Todo el que se registra queda como `cliente`; el rol `administrador` se asigna directo en la BD.

## Hacer administrador a un usuario

En Atlas, colección `users`, edita el documento y pon `role: "administrador"`.
