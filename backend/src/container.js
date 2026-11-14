// Aquí se "arma" la aplicación: se crean los repositorios, se le entregan a los servicios
// y los servicios a los controladores (inyección de dependencias por constructor).
import { ProductoRepository } from "./repositories/ProductoRepository.js";
import { UsuarioRepository } from "./repositories/UsuarioRepository.js";
import { PedidoRepository } from "./repositories/PedidoRepository.js";

import { UsuarioService } from "./services/UsuarioService.js";
import { ProductoService } from "./services/ProductoService.js";
import { PedidoService } from "./services/PedidoService.js";

import { UsuarioController } from "./controllers/UsuarioController.js";
import { ProductoController } from "./controllers/ProductoController.js";
import { PedidoController } from "./controllers/PedidoController.js";

const productos = new ProductoRepository();
const usuarios = new UsuarioRepository();
const pedidos = new PedidoRepository();

export const controllers = {
    usuario: new UsuarioController(new UsuarioService(usuarios)),
    producto: new ProductoController(new ProductoService(productos)),
    pedido: new PedidoController(new PedidoService(productos, pedidos))
};
