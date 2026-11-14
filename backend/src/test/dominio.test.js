import { test, describe } from "node:test";
import assert from "node:assert/strict";

import { Usuario } from "../domain/Usuario.js";
import { Cliente } from "../domain/Cliente.js";
import { Administrador } from "../domain/Administrador.js";
import { crearUsuario } from "../domain/fabricaUsuario.js";
import { Producto } from "../domain/Producto.js";
import { Carrito } from "../domain/Carrito.js";
import { DatosEntrega } from "../domain/DatosEntrega.js";
import { Pedido } from "../domain/Pedido.js";
import { MetodoPago, PagoEnLinea, PagoTarjeta, PagoPSE, PagoContraEntrega } from "../domain/MetodoPago.js";
import { ErrorValidacion, ErrorStock, ErrorConflicto } from "../domain/errores.js";

const nuevoProducto = (extra = {}) => new Producto({
    id: 1, nombre: "Óleo 12 colores", precio: 50000, categoria: "arte",
    tipo: "Pintura", marca: "Mashe", stock: 5, ...extra
});

const entrega = () => DatosEntrega.desde({
    name: "Ana Pérez", email: "ana@correo.com", phone: "3001234567", address: "Calle 1 # 2-3", city: "Bogotá"
});

describe("Usuario, Cliente y Administrador (herencia + polimorfismo)", () => {
    test("Usuario es abstracta: no se puede instanciar", () => {
        assert.throws(() => new Usuario({ nombre: "X", correo: "x@x.co", rol: "cliente" }), TypeError);
    });

    test("Cliente y Administrador SON Usuarios", () => {
        const c = new Cliente({ nombre: "Ana", correo: "ana@correo.com" });
        const a = new Administrador({ nombre: "Admin", correo: "admin@correo.com" });
        assert.ok(c instanceof Usuario && a instanceof Usuario);
        assert.equal(c.rol, "cliente");
        assert.equal(a.rol, "administrador");
    });

    test("mismo método puede(), distinta respuesta según la clase", () => {
        const c = new Cliente({ nombre: "Ana", correo: "ana@correo.com" });
        const a = new Administrador({ nombre: "Admin", correo: "admin@correo.com" });
        assert.equal(c.puede("crear_pedido"), true);
        assert.equal(c.puede("gestionar_productos"), false);
        assert.equal(a.puede("gestionar_productos"), true);
        assert.equal(a.puede("crear_pedido"), false);
    });

    test("la fábrica devuelve la clase correcta según el rol", () => {
        assert.ok(crearUsuario({ nombre: "A", correo: "a@a.co", rol: "administrador" }) instanceof Administrador);
        assert.ok(crearUsuario({ nombre: "A", correo: "a@a.co", rol: "cliente" }) instanceof Cliente);
        assert.throws(() => crearUsuario({ nombre: "A", correo: "a@a.co", rol: "hacker" }), ErrorValidacion);
    });

    test("contraseña: se encripta y se verifica; el hash no sale en aPublico()", async () => {
        const hash = await Usuario.crearHash("clave123");
        assert.notEqual(hash, "clave123");
        const c = new Cliente({ nombre: "Ana", correo: "ana@correo.com", contrasenaHash: hash });
        assert.equal(await c.iniciarSesion("clave123"), true);
        assert.equal(await c.iniciarSesion("otra-clave"), false);
        assert.equal(JSON.stringify(c.aPublico()).includes(hash), false);
    });

    test("rechaza contraseñas cortas y correos inválidos", async () => {
        await assert.rejects(() => Usuario.crearHash("123"), ErrorValidacion);
        assert.throws(() => new Cliente({ nombre: "Ana", correo: "no-es-correo" }), ErrorValidacion);
    });
});

describe("Producto (encapsulamiento)", () => {
    test("el stock es privado: no se puede asignar directo", () => {
        const p = nuevoProducto();
        assert.throws(() => { p.stock = 999; }, TypeError);
        assert.equal(p.stock, 5);
    });

    test("el stock nunca baja de cero", () => {
        const p = nuevoProducto();
        assert.throws(() => p.actualizarStock(-6), ErrorStock);
        p.actualizarStock(-5);
        assert.equal(p.stock, 0);
        assert.equal(p.estaAgotado(), true);
    });

    test("reservar descuenta y devolver repone", () => {
        const p = nuevoProducto();
        p.reservar(2);
        assert.equal(p.stock, 3);
        p.devolver(2);
        assert.equal(p.stock, 5);
        assert.throws(() => p.reservar(10), ErrorStock);
    });

    test("valida precio, stock y categoría", () => {
        assert.throws(() => nuevoProducto({ precio: -1 }), ErrorValidacion);
        assert.throws(() => nuevoProducto({ stock: -3 }), ErrorValidacion);
        assert.throws(() => nuevoProducto({ categoria: "juguetes" }), ErrorValidacion);
        assert.throws(() => nuevoProducto({ nombre: "  " }), ErrorValidacion);
    });
});

describe("Carrito", () => {
    test("agrega, suma cantidades del mismo producto y calcula el subtotal", () => {
        const carrito = new Carrito();
        const p = nuevoProducto();
        carrito.agregarProducto(p, 2);
        carrito.agregarProducto(p, 1);
        assert.equal(carrito.detalles.length, 1);
        assert.equal(carrito.detalles[0].cantidad, 3);
        assert.equal(carrito.calcularSubtotal(), 150000);
    });

    test("no deja pasar el stock disponible", () => {
        const carrito = new Carrito();
        const p = nuevoProducto({ stock: 2 });
        carrito.agregarProducto(p, 2);
        assert.throws(() => carrito.agregarProducto(p, 1), ErrorStock);
    });

    test("cantidad 0 elimina el producto; cantidades inválidas se rechazan", () => {
        const carrito = new Carrito();
        const p = nuevoProducto();
        carrito.agregarProducto(p, 1);
        assert.throws(() => carrito.agregarProducto(p, 0), ErrorValidacion);
        assert.throws(() => carrito.agregarProducto(p, 1.5), ErrorValidacion);
        carrito.modificarCantidad(1, 0);
        assert.equal(carrito.estaVacio(), true);
    });
});

describe("Pedido", () => {
    const pedidoCon = (precio, cantidad) => {
        const carrito = new Carrito();
        carrito.agregarProducto(nuevoProducto({ precio, stock: 50 }), cantidad);
        return Pedido.desdeCarrito({ clienteId: null, datosEntrega: entrega(), carrito });
    };

    test("envío $9.000, y gratis desde $150.000", () => {
        const chico = pedidoCon(50000, 1);
        assert.equal(chico.calcularEnvio(), 9000);
        assert.equal(chico.calcularTotal(), 59000);
        const grande = pedidoCon(50000, 3);
        assert.equal(grande.calcularEnvio(), 0);
        assert.equal(grande.calcularTotal(), 150000);
    });

    test("no se crea un pedido con el carrito vacío", () => {
        assert.throws(
            () => Pedido.desdeCarrito({ clienteId: null, datosEntrega: entrega(), carrito: new Carrito() }),
            ErrorValidacion
        );
    });

    test("el código tiene la forma M + 8 dígitos", () => {
        assert.match(pedidoCon(50000, 1).codigo, /^M\d{8}$/);
    });

    test("estados: solo transiciones válidas", () => {
        const p = pedidoCon(50000, 1);
        assert.equal(p.estado, "pendiente");
        assert.throws(() => p.actualizarEstado("entregado"), ErrorConflicto);
        p.actualizarEstado("pagado");
        p.actualizarEstado("enviado");
        p.actualizarEstado("entregado");
        assert.throws(() => p.actualizarEstado("pendiente"), ErrorConflicto);
        assert.throws(() => p.actualizarEstado("inventado"), ErrorValidacion);
    });

    test("cancelar: sí antes del envío, no después", () => {
        const a = pedidoCon(50000, 1);
        a.cancelar();
        assert.equal(a.estado, "cancelado");
        const b = pedidoCon(50000, 1);
        b.actualizarEstado("enviado");
        assert.throws(() => b.cancelar(), ErrorConflicto);
    });

    test("un pago aprobado pasa el pedido a pagado", () => {
        const p = pedidoCon(50000, 1);
        p.asignarPago(MetodoPago.crear("pse").procesar(p.calcularTotal()));
        assert.equal(p.estado, "pagado");
    });

    test("valida los datos de entrega", () => {
        assert.throws(() => DatosEntrega.desde({}), ErrorValidacion);
        assert.throws(() => DatosEntrega.desde({ name: "Ana", email: "x", phone: "3001234567", address: "a", city: "b" }), ErrorValidacion);
    });
});

describe("MetodoPago (abstracción + polimorfismo)", () => {
    test("la clase base es abstracta", () => {
        assert.throws(() => new MetodoPago(), TypeError);
    });

    test("jerarquía: Tarjeta y PSE son pagos en línea", () => {
        assert.ok(MetodoPago.crear("tarjeta") instanceof PagoTarjeta);
        assert.ok(MetodoPago.crear("tarjeta") instanceof PagoEnLinea);
        assert.ok(MetodoPago.crear("pse") instanceof PagoPSE);
        assert.ok(MetodoPago.crear("contraentrega") instanceof PagoContraEntrega);
        assert.throws(() => MetodoPago.crear("bitcoin"), ErrorValidacion);
    });

    test("procesar() se llama igual pero cada clase responde distinto", () => {
        const resultados = ["tarjeta", "pse", "contraentrega"].map((m) => MetodoPago.crear(m).procesar(10000));
        assert.deepEqual(resultados.map((r) => r.estado), ["aprobado", "aprobado", "pendiente"]);
    });

    test("rechazo simulado: afecta a los pagos en línea, no a contra entrega", () => {
        assert.equal(MetodoPago.crear("tarjeta").procesar(1000, { simularRechazo: true }).estado, "rechazado");
        assert.equal(MetodoPago.crear("contraentrega").procesar(1000, { simularRechazo: true }).estado, "pendiente");
    });
});
