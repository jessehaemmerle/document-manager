import { initDatabase } from "./init.js";

await initDatabase();
console.log("Datenbank wurde initialisiert und Seed-Daten sind vorhanden.");
