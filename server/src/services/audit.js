import { v4 as uuid } from "uuid";
import { run, isPostgres } from "../db.js";

export async function audit(actor, action, payload) {
  const payloadVal = isPostgres() ? payload : JSON.stringify(payload);
  await run(
    "INSERT INTO audit_log (id, actor, action, payload) VALUES (?, ?, ?, ?)",
    [uuid(), actor, action, payloadVal]
  );
}
