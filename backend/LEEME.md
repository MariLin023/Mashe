# Backend de Mashe

API en Node.js + Express + Mongoose (MongoDB Atlas).

## Puesta en marcha

1. `npm install` (instala también bcrypt, jsonwebtoken y cors)
2. Copia `.env.example` a `.env` y llena `MONGODB_URI` y `JWT_SECRET`
3. `npm run seed`  → carga los 24 productos del frontend en la colección `products`
4. `npm run dev`   → servidor en http://localhost:4000

> Si ya tenías usuarios de prueba en Atlas con el campo `username`, borra la colección `users`
> antes de registrar (el índice único de `username` choca con el modelo nuevo, que usa `name`).

## Endpoints (prefijo `/api/v1`)

| Método | Ruta | Acceso | Qué hace |
|---|---|---|---|
| POST | `/users/register` | público | Crea cuenta `{ name, email, password }` y devuelve token |
| POST | `/users/login` | público | Inicia sesión `{ email, password }` y devuelve token |
| GET | `/users/me` | token | Datos del usuario actual |
| GET | `/products` | público | Lista (`?cat=arte`, `?best=true`) |
| GET | `/products/:id` | público | Un producto |
| POST | `/products` | administrador | Crea producto |
| PATCH | `/products/:id` | administrador | Edita producto |
| POST | `/orders` | invitado o token | Crea pedido `{ items:[{id,qty}], customer, pay }` |
| GET | `/orders/mine` | token | Pedidos del cliente |
| PATCH | `/orders/:code/cancel` | token (dueño) | Cancela y devuelve el stock |

El token va en el header `Authorization: Bearer <token>`.

## Reglas de negocio implementadas

- Precio, envío y total los calcula el servidor con los precios de la BD (el cliente no los decide).
- Envío: $9.000, gratis desde $150.000.
- El inventario se descuenta al crear el pedido, con una condición atómica (`stock >= cantidad`), así no se vende más de lo que hay.
- Si el pago es rechazado o falla el guardado, el stock se devuelve.
- Pago simulado: `tarjeta` y `pse` se aprueban; `contraentrega` queda pendiente. Para probar el rechazo, manda `"simulateReject": true` en el body (solo fuera de producción).
- Estados del pedido: `pendiente` → `pagado` → `enviado` → `entregado`, o `cancelado`.
- Una compra abandonada no toca el inventario: el carrito vive en el navegador y solo se descuenta al confirmar.
- Todo el que se registra queda como `cliente`; el rol `administrador` se asigna directo en la BD.

## Hacer administrador a un usuario

En Atlas, colección `users`, edita el documento y pon `role: "administrador"`.
