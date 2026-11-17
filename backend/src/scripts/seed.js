// Carga los productos del frontend a MongoDB.  Uso:  npm run seed
// OJO: borra los productos y categorías que haya y los vuelve a crear (el stock vuelve al inicial).
import dotenv from "dotenv";
dotenv.config({ path: "./.env" });

import mongoose from "mongoose";
import { readFile } from "node:fs/promises";
import connectDB from "../config/database.js";
import { Product } from "../models/product.model.js";
import { Category } from "../models/category.model.js";

const products = JSON.parse(await readFile(new URL("../data/products.json", import.meta.url), "utf8"));
const categories = JSON.parse(await readFile(new URL("../data/categories.json", import.meta.url), "utf8"));

await connectDB();
await Product.deleteMany({});
await Product.insertMany(products);
await Category.deleteMany({});
await Category.insertMany(categories);
console.log(`${products.length} productos y ${categories.length} categorías cargados`);
await mongoose.disconnect();
