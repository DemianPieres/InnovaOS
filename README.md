# InnovaOS

Plataforma multi-tenant para gastronomía: pedidos por QR, panel operativo en tiempo real, caja inteligente, fidelización y analytics.

Construida con **Next.js 14 (App Router) + TypeScript estricto + MongoDB (Mongoose) + Tailwind + shadcn/ui**.

---

## Características principales

- **Multi-tenant total**: cada operación filtra por `tenantId` y los modelos lo tienen indexado.
- **MAXADMIN aislado**: panel global con JWT separado del sistema, propio rate limiting, propias rutas (`/maxadmin/*`).
- **Sesiones únicas por usuario**: solo una sesión activa por usuario. Si se loguea desde otro dispositivo, la sesión previa queda invalidada.
- **Pedidos QR**: cada mesa tiene un token QR único; el cliente escanea, ve la carta y pide.
- **Tiempo real con SSE**: cocina, barra y mozo reciben pedidos al instante.
- **Caja inteligente**: apertura, cierre con calculadora de billetes, cálculo automático de diferencia.
- **Pagos vinculados a caja**: efectivo, débito, crédito, transferencia, MercadoPago, QR.
- **Fidelización**: niveles bronce/plata/oro/platino + segmentación nuevo/ocasional/habitual/vip/inactivo.
- **WhatsApp ready**: triggers prearmados (bienvenida, pedido confirmado, pedido listo, cumpleaños, winback, level-up).
- **Analytics**: ventas por día, top productos, mix de métodos de pago.
- **Multi-sucursal**: cada tenant puede tener N branches.

---

## Estructura del proyecto

```
src/
  app/
    api/                  ← endpoints del sistema (filtran por tenantId)
    maxadmin/             ← rutas y APIs del MAXADMIN
    admin/                ← panel del tenant
    operations/           ← cocina / barra / mozo
    menu/[slug]/          ← carta pública del cliente
  components/
    ui/                   ← shadcn/ui
    admin/, maxadmin/     ← shells y componentes específicos
    menu/, operations/    ← UI de carta y estaciones
  lib/
    auth/                 ← JWT, password, cookies, guards
    api/                  ← errores, rate limit, sanitize
    realtime/             ← broadcast SSE
    whatsapp/             ← triggers automáticos
    loyalty/              ← cálculo de niveles
    mongodb.ts, utils.ts
  models/                 ← Mongoose schemas con tenantId indexado
  hooks/                  ← React hooks (SSE)
middleware.ts             ← protección de rutas
scripts/seed-maxadmin.ts  ← creación del primer MAXADMIN
```

---

## Variables de entorno

Copiá `.env.example` como `.env.local` (en producción, configurá estos valores en Render):

```env
MONGODB_URI=mongodb+srv://USER:PASS@cluster0.xvsdcb6.mongodb.net/innovaos?retryWrites=true&w=majority&appName=Cluster0

APP_JWT_SECRET=cambia_esto_por_una_clave_muy_larga_y_segura
APP_JWT_EXPIRES_IN=8h
REFRESH_TOKEN_SECRET=cambia_esto_por_otra_clave_muy_larga
REFRESH_TOKEN_EXPIRES_IN=7d

MAXADMIN_JWT_SECRET=clave_exclusiva_para_maxadmin_muy_larga
MAXADMIN_JWT_EXPIRES_IN=8h
MAXADMIN_EMAIL=admin@innovaos.com
MAXADMIN_PASSWORD=InnovaOS2026!Admin

NEXT_PUBLIC_APP_URL=http://localhost:3000

# Integraciones futuras (pueden quedar vacías)
WHATSAPP_API_TOKEN=
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_WHATSAPP_FROM=
```

> **Importante**: cada secret JWT debe tener mínimo 24 caracteres. Si no, el servidor falla al arrancar.

---

## Primeros pasos (desarrollo local)

```bash
# 1. Instalar dependencias
npm install

# 2. Configurar .env.local con tus credenciales

# 3. Crear el primer MAXADMIN
npm run seed:maxadmin

# 4. Iniciar el servidor de desarrollo
npm run dev
```

Abrí <http://localhost:3000>:

1. Andá a `/maxadmin/login` y entrá con `MAXADMIN_EMAIL` / `MAXADMIN_PASSWORD`.
2. Creá un tenant: nombre "Café de Prueba", slug "cafe-prueba".
3. Creá un usuario admin para ese tenant (mínimo 8 chars con mayús + minús + dígito).
4. Cerrá sesión y andá a `/login` con el usuario admin recién creado.
5. En `/admin`:
   - Cargá categorías en `/admin/categories`.
   - Cargá productos en `/admin/products`.
   - Creá una mesa en `/admin/tables` y descargá su QR.
6. Abrí `/menu/cafe-prueba?table=1&t=TOKEN_DEL_QR` (o escaneá el QR) para probar el flujo completo.
7. Como mozo / cocina, entrá a `/operations/waiter`, `/operations/kitchen`, `/operations/bar`.

---

## Deploy en Render

1. **Crear un nuevo Web Service** en [Render](https://render.com), conectando el repo `DemianPieres/InnovaOS`.
2. Configurar:
   - **Environment**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Health Check Path**: `/api/health`
3. Cargar las **Environment Variables** del bloque anterior. En `NEXT_PUBLIC_APP_URL` poné la URL pública que asigne Render.
4. Una vez deployado, ejecutá el seed manualmente desde la consola de Render:
   ```bash
   npm run seed:maxadmin
   ```
   o desde tu máquina con `MONGODB_URI` apuntando al cluster productivo.

> Por defecto el SSE corre con `runtime = "nodejs"`. Render mantiene la conexión HTTP el tiempo necesario para que la cocina reciba eventos en vivo.

---

## Reglas de seguridad implementadas

1. ✅ Toda ruta de API verifica JWT antes de ejecutar lógica (ver `src/lib/auth/guard.ts`).
2. ✅ Toda query a MongoDB filtra por `tenantId` del usuario autenticado.
3. ✅ Nunca devolvemos documentos de otro tenant aunque el ID sea correcto (validación en cada endpoint).
4. ✅ Las rutas `/maxadmin/api/*` solo aceptan tokens con contexto `maxadmin` (verificado en `verifyMaxAdminToken`).
5. ✅ Las rutas `/api/*` rechazan tokens MAXADMIN (verificado en `verifySystemToken`).
6. ✅ `sessionToken` se valida en cada request → invalida sesiones duplicadas.
7. ✅ Contraseñas y tokens nunca se loguean (los modelos los excluyen del JSON).
8. ✅ Rate limiting en login: máximo 5 intentos fallidos por minuto por IP (LoginAttempt con TTL).
9. ✅ Todos los inputs validados con Zod + límites de longitud.
10. ✅ Mongoose schemas tienen `maxlength`, validators numéricos y enums.

---

## Comandos útiles

```bash
npm run dev              # Desarrollo
npm run build            # Build de producción
npm start                # Iniciar producción
npm run lint             # Lint de Next.js
npm run typecheck        # Verificar tipos
npm run seed:maxadmin    # Crear/actualizar MAXADMIN
```

---

## Stack

- Next.js 14 (App Router) + React 18 + TypeScript estricto
- MongoDB Atlas via Mongoose
- Tailwind CSS + shadcn/ui (Radix UI)
- JWT + bcryptjs (sesiones únicas)
- Server-Sent Events para tiempo real
- QRCode para generación de QR de mesas
- Zod para validación
- date-fns para fechas
