import { Product } from "../models/product.model.js";

// GET /products            -> todos
// GET /products?cat=arte   -> solo una categoría
// GET /products?best=true  -> los más vendidos
const listProducts = async (req, res) => {
    const filter = {};
    if (req.query.cat) filter.cat = req.query.cat;
    if (req.query.best === "true") filter.best = true;

    const products = await Product.find(filter).sort({ id: 1 });
    res.json({ products });
};

const getProduct = async (req, res) => {
    const product = await Product.findOne({ id: Number(req.params.id) });
    if (!product) return res.status(404).json({ message: "Producto no encontrado" });
    res.json({ product });
};

// --- Solo administrador ---
const createProduct = async (req, res) => {
    const last = await Product.findOne().sort({ id: -1 });
    const product = await Product.create({ ...req.body, id: last ? last.id + 1 : 1 });
    res.status(201).json({ product });
};

const updateProduct = async (req, res) => {
    const { id: _ignored, ...changes } = req.body ?? {}; // el id no se cambia
    const product = await Product.findOneAndUpdate({ id: Number(req.params.id) }, changes, {
        new: true,
        runValidators: true
    });
    if (!product) return res.status(404).json({ message: "Producto no encontrado" });
    res.json({ product });
};

export { listProducts, getProduct, createProduct, updateProduct };
