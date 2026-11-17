// Crea las 3 categorías base SIN tocar los productos. Uso:  npm run seed:categorias
// Se puede correr varias veces: si la categoría ya existe, solo actualiza su nombre y descripción.
import dotenv from "dotenv";
dotenv.config({ path: "./.env" });

import mongoose from "mongoose";
import { readFile } from "node:fs/promises";
import connectDB from "../config/database.js";
import { Category } from "../models/category.model.js";

const categorias = JSON.parse(await readFile(new URL("../data/categories.json", import.meta.url), "utf8"));

await connectDB();
for (const c of categorias) {
    await Category.updateOne({ key: c.key }, c, { upsert: true });
}
console.log(`${categorias.length} categorías listas`);
await mongoose.disconnect();
