import { Categoria } from "../domain/Categoria.js";
import { ErrorConflicto, ErrorNoEncontrado } from "../domain/errores.js";

export class CategoriaService {
    constructor(categorias, productos) {
        this.categorias = categorias;
        this.productos = productos;
    }

    // Cada categoría con la cantidad de productos que tiene
    async listar() {
        const [lista, conteo] = await Promise.all([this.categorias.buscarTodas(), this.productos.contarPorCategoria()]);
        return lista.map((c) => ({ ...c.toJSON(), productCount: conteo[c.clave] ?? 0 }));
    }

    async obtener(clave) {
        const categoria = await this.categorias.buscarPorClave(clave);
        if (!categoria) throw new ErrorNoEncontrado("Categoría no encontrada");
        return categoria;
    }

    async crear({ name, description } = {}) {
        const categoria = new Categoria({ nombre: name, descripcion: description });
        if (await this.categorias.buscarPorClave(categoria.clave)) {
            throw new ErrorConflicto("Ya existe una categoría con ese nombre");
        }
        await this.categorias.crear(categoria);
        return categoria;
    }

    async actualizar(clave, { name, description } = {}) {
        const categoria = await this.obtener(clave);
        categoria.editar({ nombre: name, descripcion: description });
        await this.categorias.guardar(categoria);
        return categoria;
    }

    async eliminar(clave) {
        const categoria = await this.obtener(clave);
        const conteo = await this.productos.contarPorCategoria();
        categoria.verificarEliminable(conteo[clave] ?? 0); // la regla vive en la clase
        await this.categorias.eliminar(clave);
    }
}
