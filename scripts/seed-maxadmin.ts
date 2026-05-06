import { config } from "dotenv";
import path from "path";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

config({ path: path.resolve(process.cwd(), ".env.local") });
config({ path: path.resolve(process.cwd(), ".env") });

const MaxAdminSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    active: { type: Boolean, default: true },
    lastLoginAt: { type: Date },
  },
  { timestamps: true }
);

/**
 * Crea o actualiza el MAXADMIN inicial usando las variables de entorno.
 */
async function main(): Promise<void> {
  const uri = process.env.MONGODB_URI;
  const email = process.env.MAXADMIN_EMAIL;
  const password = process.env.MAXADMIN_PASSWORD;

  if (!uri || !email || !password) {
    console.error(
      "Faltan variables: MONGODB_URI, MAXADMIN_EMAIL o MAXADMIN_PASSWORD."
    );
    process.exit(1);
  }
  if (password.length < 8) {
    console.error("MAXADMIN_PASSWORD debe tener al menos 8 caracteres.");
    process.exit(1);
  }

  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
  const MaxAdmin =
    (mongoose.models.MaxAdmin as mongoose.Model<unknown>) ||
    mongoose.model("MaxAdmin", MaxAdminSchema);

  const existing = await MaxAdmin.findOne({ email: email.toLowerCase() });
  const passwordHash = await bcrypt.hash(password, 12);

  if (existing) {
    await MaxAdmin.updateOne(
      { _id: (existing as { _id: unknown })._id },
      { $set: { passwordHash, active: true } }
    );
    console.log(`MAXADMIN actualizado: ${email}`);
  } else {
    await MaxAdmin.create({
      email: email.toLowerCase(),
      passwordHash,
      name: "Operador InnovaOS",
      active: true,
    });
    console.log(`MAXADMIN creado: ${email}`);
  }

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error("Error en seed-maxadmin:", err);
  process.exit(1);
});
