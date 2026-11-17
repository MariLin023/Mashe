import { Producto } from "../domain/Producto.js";
import { ErrorNoEncontrado, ErrorValidacion } from "../domain/errores.js";

// Traduce los nombres que usa el frontend (name, price...) a los del dominio (nombre, precio...)
const CAMPOS_FICHA = { name: "nombre", cat: "categoria", type: "tipo", brand: "marca",
                       best: "destacado", image: "imagen", desc: "descripcion", specs: "especificaciones" };

const traducirFicha = (cuerpo) => {
    const ficha = {};
    for (const [api, dominio] of Object.entries(CAMPOS_FICHA)) {
        if (cuerpo[api] !== undefined) ficha[dominio] = cuerpo[api];
    }
    return ficha;
};

export class ProductoService {
    constructor(productos, categorias) {
        this.productos = productos;
        this.categorias = categorias;
    }

    // Un producto solo puede pertenecer a una categoría que exista
    async #exigirCategoria(clave) {
        if (!(await this.categorias.buscarPorClave(String(clave ?? "").trim().toLowerCase()))) {
            throw new ErrorValidacion("La categoría no existe");
        }
    }

    listar({ cat, best } = {}) {
        return this.productos.buscarTodos({ categoria: cat, destacados: best === "true" });
    }

    async obtener(id) {
        const producto = await this.productos.buscarPorId(id);
        if (!producto) throw new ErrorNoEncontrado("Producto no encontrado");
        return producto;
    }

    async crear(cuerpo = {}) {
        await this.#exigirCategoria(cuerpo.cat);
        // Al construir el Producto se validan nombre, precio, categoría y stock
        const producto = new Producto({
            id: await this.productos.siguienteId(),
            ...traducirFicha(cuerpo),
            precio: cuerpo.price,
            stock: cuerpo.stock ?? 0
        });
        await this.productos.guardar(producto);
        return producto;
    }

    async actualizar(id, cuerpo = {}) {
        const producto = await this.obtener(id);
        if (cuerpo.cat !== undefined) await this.#exigirCategoria(cuerpo.cat);
        const ficha = traducirFicha(cuerpo);
        if (Object.keys(ficha).length) producto.actualizarFicha(ficha);
        if (cuerpo.price !== undefined) producto.actualizarPrecio(cuerpo.price);
        if (cuerpo.stock !== undefined) producto.establecerStock(cuerpo.stock);
        await this.productos.guardar(producto);
        return producto;
    }
}
