import { Category } from "../models/category.model.js";
import { Categoria } from "../domain/Categoria.js";

const aDominio = (doc) => new Categoria({ clave: doc.key, nombre: doc.name, descripcion: doc.description });

export class CategoriaRepository {
    async buscarTodas() {
        const docs = await Category.find().sort({ name: 1 }).lean();
        return docs.map(aDominio);
    }

    async buscarPorClave(clave) {
        const doc = await Category.findOne({ key: clave }).lean();
        return doc ? aDominio(doc) : null;
    }

    async crear(categoria) {
        await Category.create({ key: categoria.clave, name: categoria.nombre, description: categoria.descripcion });
    }

    async guardar(categoria) {
        await Category.updateOne({ key: categoria.clave }, { name: categoria.nombre, description: categoria.descripcion });
    }

    async eliminar(clave) {
        await Category.deleteOne({ key: clave });
    }
}
