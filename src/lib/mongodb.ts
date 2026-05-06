import mongoose, { Mongoose } from "mongoose";

/**
 * Valida que la URI de MongoDB esté presente. Falla rápido si no está configurada.
 */
function getMongoUri(): string {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error(
      "MONGODB_URI no está definida. Configurala en .env.local antes de iniciar."
    );
  }
  return uri;
}

interface MongooseGlobalCache {
  conn: Mongoose | null;
  promise: Promise<Mongoose> | null;
}

declare global {
  // eslint-disable-next-line no-var
  var _mongooseCache: MongooseGlobalCache | undefined;
}

const cache: MongooseGlobalCache =
  global._mongooseCache ?? { conn: null, promise: null };

if (!global._mongooseCache) {
  global._mongooseCache = cache;
}

/**
 * Devuelve una conexión Mongoose reutilizable. Cachea la conexión globalmente
 * para evitar abrir múltiples conexiones en hot reload o serverless.
 */
export async function connectDB(): Promise<Mongoose> {
  if (cache.conn) {
    return cache.conn;
  }

  if (!cache.promise) {
    const uri = getMongoUri();
    mongoose.set("strictQuery", true);
    cache.promise = mongoose.connect(uri, {
      bufferCommands: false,
      serverSelectionTimeoutMS: 10_000,
      maxPoolSize: 10,
      minPoolSize: 1,
      retryWrites: true,
    });
  }

  try {
    cache.conn = await cache.promise;
  } catch (error) {
    cache.promise = null;
    throw error;
  }

  return cache.conn;
}

/**
 * Helper que asegura conexión antes de devolver el modelo solicitado.
 */
export async function withDB<T>(fn: () => Promise<T>): Promise<T> {
  await connectDB();
  return fn();
}
