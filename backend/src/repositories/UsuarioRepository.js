import { User } from "../models/user.model.js";
import { crearUsuario } from "../domain/fabricaUsuario.js";

const aDominio = (doc) => crearUsuario({
    id: String(doc._id), nombre: doc.name, correo: doc.email,
    contrasenaHash: doc.password ?? null, rol: doc.role
});

export class UsuarioRepository {
    async buscarPorCorreo(correo) {
        const doc = await User.findOne({ email: String(correo).trim().toLowerCase() }).select("+password").lean();
        return doc ? aDominio(doc) : null;
    }

    async buscarPorId(id) {
        const doc = await User.findById(id).lean();
        return doc ? aDominio(doc) : null;
    }

    async crear(usuario) {
        const d = usuario.datosParaGuardar();
        const doc = await User.create({ name: d.nombre, email: d.correo, password: d.contrasenaHash, role: d.rol });
        return aDominio(doc.toObject());
    }
}
