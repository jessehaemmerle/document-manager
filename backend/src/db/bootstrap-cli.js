import { initDatabase } from "./init.js";

await initDatabase();
console.log("Datenbank wurde initialisiert. Bootstrap-Admin ist vorhanden, falls noch keine Benutzer existierten.");
