import { test, describe, beforeEach } from "node:test";
import assert from "node:assert/strict";

import { PedidoService } from "../services/PedidoService.js";
import { Producto } from "../domain/Producto.js";
import { Cliente } from "../domain/Cliente.js";
import { ErrorStock, ErrorPagoRechazado, ErrorValidacion, ErrorNoEncontrado, ErrorConflicto } from "../domain/errores.js";

// Repositorios "falsos" en memoria: tienen los mismos métodos que los reales, pero sin MongoDB.
// Por eso el servicio se puede probar completo sin base de datos (inyección de dependencias).
class ProductoRepositoryMemoria {
    constructor(productos) { this.mapa = new Map(productos.map((p) => [p.id, p])); }
    async buscarPorIds(ids) { return ids.map((id) => this.mapa.get(id)).filter(Boolean); }
    async reservarStock(detalles) {
        const hechos = [];
        for (const d of detalles) {
            const p = this.mapa.get(d.idProducto);
            if (!p.verificarDisponibilidad(d.cantidad)) {
                await this.devolverStock(hechos);
                throw new ErrorStock(`No hay suficientes unidades de ${d.nombre}. Revisa tu carrito.`);
            }
            p.reservar(d.cantidad);
            hechos.push(d);
        }
    }
    async devolverStock(detalles) { detalles.forEach((d) => this.mapa.get(d.idProducto).devolver(d.cantidad)); }
}

class PedidoRepositoryMemoria {
    constructor() { this.pedidos = []; this.falla = false; }
    async guardar(p) { if (this.falla) throw new Error("BD caída"); this.pedidos.push(p); }
    async guardarEstado() {}
    async buscarPorCodigoYCliente(codigo, id) { return this.pedidos.find((p) => p.codigo === codigo && p.clienteId === id) ?? null; }
    async buscarPorCodigo(codigo) { return this.pedidos.find((p) => p.codigo === codigo) ?? null; }
    async buscarPorCliente(id) { return this.pedidos.filter((p) => p.clienteId === id); }
    async buscarTodos() { return this.pedidos; }
}

const cliente = new Cliente({ id: "u1", nombre: "Ana", correo: "ana@correo.com" });
const customer = { name: "Ana Pérez", email: "ana@correo.com", phone: "3001234567", address: "Calle 1", city: "Bogotá" };

describe("PedidoService (flujo completo de compra)", () => {
    let productos, pedidos, servicio, oleo, lapiz;

    beforeEach(() => {
        oleo = new Producto({ id: 1, nombre: "Óleo", precio: 50000, categoria: "arte", tipo: "Pintura", marca: "Mashe", stock: 5 });
        lapiz = new Producto({ id: 2, nombre: "Lápiz", precio: 2000, categoria: "escolares", tipo: "Lápiz", marca: "Mashe", stock: 10 });
        productos = new ProductoRepositoryMemoria([oleo, lapiz]);
        pedidos = new PedidoRepositoryMemoria();
        servicio = new PedidoService(productos, pedidos);
    });

    test("compra exitosa: descuenta inventario, calcula total y aprueba el pago", async () => {
        const pedido = await servicio.crearPedido({
            items: [{ id: 1, qty: 2 }, { id: 2, qty: 3 }], customer, pay: "tarjeta", usuario: cliente
        });
        assert.equal(pedido.estado, "pagado");
        assert.equal(pedido.calcularSubtotal(), 106000);
        assert.equal(pedido.calcularEnvio(), 9000);
        assert.equal(pedido.calcularTotal(), 115000);
        assert.equal(oleo.stock, 3);
        assert.equal(lapiz.stock, 7);
        assert.equal(pedidos.pedidos.length, 1);
    });

    test("el precio sale de la BD, no de lo que mande el navegador", async () => {
        const pedido = await servicio.crearPedido({
            items: [{ id: 1, qty: 1, price: 1 }], customer, pay: "pse", usuario: cliente
        });
        assert.equal(pedido.calcularSubtotal(), 50000);
    });

    test("contra entrega: el pedido queda pendiente", async () => {
        const pedido = await servicio.crearPedido({ items: [{ id: 1, qty: 1 }], customer, pay: "contraentrega", usuario: cliente });
        assert.equal(pedido.estado, "pendiente");
        assert.equal(pedido.pago.estado, "pendiente");
    });

    test("sin stock suficiente: error y el inventario queda intacto", async () => {
        await assert.rejects(
            () => servicio.crearPedido({ items: [{ id: 2, qty: 3 }, { id: 1, qty: 99 }], customer, pay: "tarjeta" }),
            ErrorStock
        );
        assert.equal(oleo.stock, 5);
        assert.equal(lapiz.stock, 10);
        assert.equal(pedidos.pedidos.length, 0);
    });

    test("pago rechazado: error 402 y el stock se devuelve", async () => {
        await assert.rejects(
            () => servicio.crearPedido({ items: [{ id: 1, qty: 2 }], customer, pay: "tarjeta", simularRechazo: true }),
            ErrorPagoRechazado
        );
        assert.equal(oleo.stock, 5);
        assert.equal(pedidos.pedidos.length, 0);
    });

    test("si falla al guardar el pedido, el stock se devuelve", async () => {
        pedidos.falla = true;
        await assert.rejects(() => servicio.crearPedido({ items: [{ id: 1, qty: 2 }], customer, pay: "pse" }), /BD caída/);
        assert.equal(oleo.stock, 5);
    });

    test("validaciones: carrito vacío, método de pago y datos de entrega", async () => {
        await assert.rejects(() => servicio.crearPedido({ items: [], customer, pay: "pse" }), ErrorValidacion);
        await assert.rejects(() => servicio.crearPedido({ items: [{ id: 1, qty: 1 }], customer, pay: "bitcoin" }), ErrorValidacion);
        await assert.rejects(() => servicio.crearPedido({ items: [{ id: 1, qty: 1 }], customer: {}, pay: "pse" }), ErrorValidacion);
        await assert.rejects(() => servicio.crearPedido({ items: [{ id: 1, qty: 0 }], customer, pay: "pse" }), ErrorValidacion);
        await assert.rejects(() => servicio.crearPedido({ items: [{ id: 999, qty: 1 }], customer, pay: "pse" }), ErrorValidacion);
    });

    test("cancelar devuelve el inventario; solo el dueño puede cancelar", async () => {
        const pedido = await servicio.crearPedido({ items: [{ id: 1, qty: 2 }], customer, pay: "tarjeta", usuario: cliente });
        assert.equal(oleo.stock, 3);

        const otra = new Cliente({ id: "u2", nombre: "Luis", correo: "luis@correo.com" });
        await assert.rejects(() => servicio.cancelar({ codigo: pedido.codigo, usuario: otra }), ErrorNoEncontrado);

        await servicio.cancelar({ codigo: pedido.codigo, usuario: cliente });
        assert.equal(pedido.estado, "cancelado");
        assert.equal(oleo.stock, 5);
    });

    test("un pedido ya enviado no se puede cancelar y el stock no cambia", async () => {
        const pedido = await servicio.crearPedido({ items: [{ id: 1, qty: 2 }], customer, pay: "tarjeta", usuario: cliente });
        await servicio.cambiarEstado({ codigo: pedido.codigo, estado: "enviado" });
        await assert.rejects(() => servicio.cancelar({ codigo: pedido.codigo, usuario: cliente }), ErrorConflicto);
        assert.equal(oleo.stock, 3);
    });

    test("el administrador avanza estados válidos y se rechazan los inválidos", async () => {
        const pedido = await servicio.crearPedido({ items: [{ id: 1, qty: 1 }], customer, pay: "tarjeta", usuario: cliente });
        await servicio.cambiarEstado({ codigo: pedido.codigo, estado: "enviado" });
        await servicio.cambiarEstado({ codigo: pedido.codigo, estado: "entregado" });
        assert.equal(pedido.estado, "entregado");
        await assert.rejects(() => servicio.cambiarEstado({ codigo: pedido.codigo, estado: "pendiente" }), ErrorConflicto);
        await assert.rejects(() => servicio.cambiarEstado({ codigo: "M00000000", estado: "enviado" }), ErrorNoEncontrado);
    });

    test("mis pedidos: cada cliente ve solo los suyos", async () => {
        await servicio.crearPedido({ items: [{ id: 1, qty: 1 }], customer, pay: "tarjeta", usuario: cliente });
        await servicio.crearPedido({ items: [{ id: 2, qty: 1 }], customer, pay: "tarjeta" }); // invitado
        assert.equal((await servicio.misPedidos(cliente)).length, 1);
    });
});
