// Carga los productos del frontend a MongoDB.  Uso:  npm run seed
// OJO: borra los productos que haya y los vuelve a crear (el stock vuelve al inicial).
import dotenv from "dotenv";
dotenv.config({ path: "./.env" });

import mongoose from "mongoose";
import { readFile } from "node:fs/promises";
import connectDB from "../config/database.js";
import { Product } from "../models/product.model.js";

const products = JSON.parse(await readFile(new URL("../data/products.json", import.meta.url), "utf8"));

await connectDB();
await Product.deleteMany({});
await Product.insertMany(products);
console.log(`${products.length} productos cargados`);
await mongoose.disconnect();
