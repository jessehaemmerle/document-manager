import { initDatabase } from "./init.js";
import { resetBootstrapAdminPassword } from "./bootstrap.js";

await initDatabase();
const result = await resetBootstrapAdminPassword();
console.log(`Bootstrap-Admin ${result.created ? "wurde erstellt" : "wurde aktualisiert"}: ${result.email}`);
