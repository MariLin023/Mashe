import { Product } from "../models/product.model.js";
import { Producto } from "../domain/Producto.js";
import { ErrorStock } from "../domain/errores.js";

// REPOSITORIO: el único lugar que conoce Mongoose para los productos.
// Entrega y recibe objetos Producto del dominio, nunca documentos de Mongo.
const aDominio = (doc) => new Producto({
    id: doc.id, nombre: doc.name, precio: doc.price, categoria: doc.cat, tipo: doc.type,
    marca: doc.brand, stock: doc.stock, destacado: doc.best, imagen: doc.image,
    descripcion: doc.desc, especificaciones: doc.specs ?? []
});

const aDocumento = (p) => ({
    id: p.id, name: p.nombre, price: p.precio, cat: p.categoria, type: p.tipo, brand: p.marca,
    stock: p.stock, best: p.destacado, image: p.imagen, desc: p.descripcion, specs: p.especificaciones
});

export class ProductoRepository {
    async buscarTodos({ categoria, destacados } = {}) {
        const filtro = {};
        if (categoria) filtro.cat = categoria;
        if (destacados) filtro.best = true;
        const docs = await Product.find(filtro).sort({ id: 1 }).lean();
        return docs.map(aDominio);
    }

    async buscarPorId(id) {
        const doc = await Product.findOne({ id }).lean();
        return doc ? aDominio(doc) : null;
    }

    async buscarPorIds(ids) {
        const docs = await Product.find({ id: { $in: ids } }).lean();
        return docs.map(aDominio);
    }

    async siguienteId() {
        const ultimo = await Product.findOne().sort({ id: -1 }).lean();
        return ultimo ? ultimo.id + 1 : 1;
    }

    async guardar(producto) {
        await Product.findOneAndUpdate({ id: producto.id }, aDocumento(producto), {
            upsert: true, runValidators: true, setDefaultsOnInsert: true
        });
    }

    // La condición "stock >= cantidad" va DENTRO de la consulta: así dos clientes comprando
    // lo último al mismo tiempo no pueden dejar el stock en negativo.
    async reservarStock(detalles) {
        const reservados = [];
        for (const d of detalles) {
            const r = await Product.updateOne(
                { id: d.idProducto, stock: { $gte: d.cantidad } },
                { $inc: { stock: -d.cantidad } }
            );
            if (r.modifiedCount === 0) {
                await this.devolverStock(reservados); // devuelve lo que ya había descontado
                throw new ErrorStock(`No hay suficientes unidades de ${d.nombre}. Revisa tu carrito.`);
            }
            reservados.push(d);
        }
    }

    async devolverStock(detalles) {
        await Promise.all(detalles.map((d) =>
            Product.updateOne({ id: d.idProducto }, { $inc: { stock: d.cantidad } })
        ));
    }
}
