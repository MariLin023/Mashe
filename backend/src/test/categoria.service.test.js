import { test, describe, beforeEach } from "node:test";
import assert from "node:assert/strict";

import { CategoriaService } from "../services/CategoriaService.js";
import { ProductoService } from "../services/ProductoService.js";
import { Categoria } from "../domain/Categoria.js";
import { Producto } from "../domain/Producto.js";
import { ErrorConflicto, ErrorNoEncontrado, ErrorValidacion } from "../domain/errores.js";

// Repositorios en memoria con los mismos métodos que los de MongoDB
class CategoriaRepoMemoria {
    constructor(lista = []) { this.mapa = new Map(lista.map((c) => [c.clave, c])); }
    async buscarTodas() { return [...this.mapa.values()]; }
    async buscarPorClave(clave) { return this.mapa.get(clave) ?? null; }
    async crear(c) { this.mapa.set(c.clave, c); }
    async guardar(c) { this.mapa.set(c.clave, c); }
    async eliminar(clave) { this.mapa.delete(clave); }
}

class ProductoRepoMemoria {
    constructor(lista = []) { this.mapa = new Map(lista.map((p) => [p.id, p])); }
    async buscarTodos({ categoria } = {}) { return [...this.mapa.values()].filter((p) => !categoria || p.categoria === categoria); }
    async buscarPorId(id) { return this.mapa.get(id) ?? null; }
    async siguienteId() { return Math.max(0, ...this.mapa.keys()) + 1; }
    async guardar(p) { this.mapa.set(p.id, p); }
    async contarPorCategoria() {
        const conteo = {};
        for (const p of this.mapa.values()) conteo[p.categoria] = (conteo[p.categoria] ?? 0) + 1;
        return conteo;
    }
}

const producto = (extra = {}) => new Producto({
    id: 1, nombre: "Óleo", precio: 50000, categoria: "arte", tipo: "Pintura", marca: "Mashe", stock: 5, ...extra
});

describe("CategoriaService", () => {
    let categorias, productos, servicio;

    beforeEach(() => {
        categorias = new CategoriaRepoMemoria([
            new Categoria({ nombre: "Arte", descripcion: "Pinturas" }),
            new Categoria({ nombre: "Oficina" })
        ]);
        productos = new ProductoRepoMemoria([producto({ id: 1 }), producto({ id: 2, nombre: "Lienzo" })]);
        servicio = new CategoriaService(categorias, productos);
    });

    test("listar devuelve cada categoría con su cantidad de productos", async () => {
        const lista = await servicio.listar();
        assert.deepEqual(lista.map((c) => [c.key, c.productCount]), [["arte", 2], ["oficina", 0]]);
    });

    test("crear: genera la clave y evita duplicadas (aunque cambien mayúsculas o tildes)", async () => {
        const nueva = await servicio.crear({ name: "Útiles Escolares", description: "Colegio" });
        assert.equal(nueva.clave, "utiles-escolares");
        await assert.rejects(() => servicio.crear({ name: "utiles escolares" }), ErrorConflicto);
        await assert.rejects(() => servicio.crear({ name: "Arte" }), ErrorConflicto);
        await assert.rejects(() => servicio.crear({ name: "" }), ErrorValidacion);
    });

    test("actualizar cambia el nombre; categoría inexistente da 404", async () => {
        const c = await servicio.actualizar("oficina", { name: "Oficina y papelería" });
        assert.equal(c.nombre, "Oficina y papelería");
        assert.equal(c.clave, "oficina");
        await assert.rejects(() => servicio.actualizar("nada", { name: "X" }), ErrorNoEncontrado);
    });

    test("eliminar: no si tiene productos, sí si está vacía", async () => {
        await assert.rejects(() => servicio.eliminar("arte"), ErrorConflicto);
        assert.ok(await categorias.buscarPorClave("arte"));
        await servicio.eliminar("oficina");
        assert.equal(await categorias.buscarPorClave("oficina"), null);
    });
});

describe("ProductoService con categorías", () => {
    let servicio, productos;

    beforeEach(() => {
        const categorias = new CategoriaRepoMemoria([new Categoria({ nombre: "Arte" }), new Categoria({ nombre: "Oficina" })]);
        productos = new ProductoRepoMemoria([producto()]);
        servicio = new ProductoService(productos, categorias);
    });

    const datos = (extra = {}) => ({ name: "Pincel", price: 8000, cat: "arte", type: "Pinceles", brand: "Mashe", stock: 10, ...extra });

    test("crear: asigna el siguiente id y guarda el producto", async () => {
        const p = await servicio.crear(datos());
        assert.equal(p.id, 2);
        assert.equal(p.categoria, "arte");
        assert.equal((await productos.buscarPorId(2)).stock, 10);
    });

    test("crear: rechaza categoría que no existe, precio y stock inválidos", async () => {
        await assert.rejects(() => servicio.crear(datos({ cat: "juguetes" })), /no existe/);
        await assert.rejects(() => servicio.crear(datos({ cat: undefined })), ErrorValidacion);
        await assert.rejects(() => servicio.crear(datos({ price: -5 })), ErrorValidacion);
        await assert.rejects(() => servicio.crear(datos({ stock: -1 })), ErrorValidacion);
        assert.equal((await productos.buscarTodos()).length, 1);
    });

    test("actualizar: cambia precio y stock, y solo deja mover a categorías existentes", async () => {
        const p = await servicio.actualizar(1, { price: 60000, stock: 2, cat: "oficina" });
        assert.equal(p.precio, 60000);
        assert.equal(p.stock, 2);
        assert.equal(p.categoria, "oficina");
        await assert.rejects(() => servicio.actualizar(1, { cat: "juguetes" }), /no existe/);
        await assert.rejects(() => servicio.actualizar(1, { stock: -3 }), ErrorValidacion);
        await assert.rejects(() => servicio.actualizar(99, { price: 1 }), ErrorNoEncontrado);
    });
});
