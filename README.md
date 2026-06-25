# 🜂 El Guardián Secreto

Aplicación web responsive para actividades educativas gamificadas entre las tribus **Mapuche**, **Guaraní** y **Mocoví**. Construida con **React + Vite + Tailwind CSS + Supabase**.

---

## 1. Estructura del proyecto

```
guardian-secreto/
├── index.html
├── package.json
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
├── .env.example
├── supabase/
│   └── schema.sql          ← script SQL completo para Supabase
└── src/
    ├── main.jsx
    ├── App.jsx              ← rutas
    ├── index.css
    ├── lib/
    │   └── supabaseClient.js
    ├── components/
    │   ├── GuardianSigil.jsx
    │   ├── TribeBadge.jsx
    │   └── Loader.jsx
    └── pages/
        ├── Home.jsx          ← pantalla inicial (4 opciones)
        ├── TribeLogin.jsx    ← selección de participante por tribu
        ├── Quiz.jsx          ← pantalla de respuesta
        ├── SageLogin.jsx     ← ingreso del Sabio
        └── SageDashboard.jsx ← panel completo del Sabio
```

---

## 2. Crear el proyecto en Supabase

1. Entrá a [supabase.com](https://supabase.com) y creá un proyecto nuevo (gratis).
2. Una vez creado, abrí **SQL Editor → New query**, pegá todo el contenido de
   `supabase/schema.sql` y ejecutalo. Esto crea las tablas `activities`,
   `participants`, `responses`, las políticas de seguridad (RLS) y la función
   segura `submit_response()`.
3. Andá a **Project Settings → API** y copiá:
   - `Project URL` → lo vas a pegar en `VITE_SUPABASE_URL`
   - `anon public key` → lo vas a pegar en `VITE_SUPABASE_ANON_KEY`

### Crear al Sabio (administrador)

La contraseña del Sabio **nunca se guarda en el código**: la gestiona Supabase
Auth de forma segura.

1. Andá a **Authentication → Users → Add user**.
2. Completá un email (por ejemplo `sabio@tuescuela.edu`) y una contraseña.
3. Ese mismo email va en la variable de entorno `VITE_ADMIN_EMAIL`.
4. Listo: esa persona podrá ingresar desde `[ INGRESAR COMO SABIO ]` con esa
   contraseña, validada de forma segura por Supabase (la app nunca la
   almacena ni la compara por su cuenta).

---

## 3. Variables de entorno

Copiá `.env.example` a `.env` y completá:

```
VITE_SUPABASE_URL=https://TU-PROYECTO.supabase.co
VITE_SUPABASE_ANON_KEY=TU_ANON_KEY
VITE_ADMIN_EMAIL=sabio@tuescuela.edu
```

> ⚠️ El archivo `.env` está en `.gitignore` y nunca debe subirse a un
> repositorio público. La `anon key` es pública por diseño (está protegida
> por las políticas RLS del script SQL), pero las credenciales del Sabio
> viven exclusivamente dentro de Supabase Auth.

---

## 4. Instalación y desarrollo local

Requisitos: Node.js 18 o superior.

```bash
npm install
npm run dev
```

La app va a estar disponible en `http://localhost:5173`. Para probarla desde
un celular en la misma red, usá la URL "Network" que muestra Vite en la
consola.

---

## 5. Cómo usar la actividad (flujo recomendado)

1. El Sabio ingresa con su contraseña.
2. Configura la pregunta, las 4 opciones y marca la correcta → **Crear actividad**.
3. Carga los participantes de cada tribu (uno por uno o pegando una lista).
4. Presiona **Iniciar actividad**.
5. Cada estudiante entra desde la pantalla inicial, elige su tribu, selecciona
   su nombre en la lista (no puede escribirlo) y responde.
6. El Sabio ve el tablero en vivo (respondieron / pendientes) en tiempo real.
7. Cuando todos terminaron, presiona **Cerrar actividad**.
8. Presiona **Ver resultados**: primero el resumen de respuestas por opción,
   luego al presionar **Continuar** se revela la respuesta correcta, los
   porcentajes de acierto y la tribu ganadora (o el empate).
9. Para reutilizar la app con otro curso, presiona **Reiniciar para otro
   curso**, lo que deja todo listo para crear una actividad nueva sin perder
   el historial de la anterior (queda guardado en Supabase).

---

## 6. Build de producción

```bash
npm run build
npm run preview   # opcional, para previsualizar el build localmente
```

El resultado queda en la carpeta `dist/`.

---

## 7. Despliegue en Vercel

1. Subí el proyecto a un repositorio de GitHub (o GitLab/Bitbucket).
2. En [vercel.com](https://vercel.com), hacé **Add New → Project** y elegí el
   repositorio.
3. Vercel detecta Vite automáticamente:
   - Build Command: `npm run build`
   - Output Directory: `dist`
4. En **Settings → Environment Variables**, agregá:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_ADMIN_EMAIL`
5. Hacé **Deploy**. En unos segundos la app queda disponible en una URL
   pública (`https://tu-proyecto.vercel.app`), lista para usar desde
   celulares, tablets y computadoras.

---

## 8. Notas de seguridad

- Las tablas tienen **Row Level Security (RLS)** activado.
- Cualquier visitante puede **leer** la pregunta activa y la lista de
  participantes (necesario para que cada tribu vea sus nombres), pero **no
  puede escribir directamente** en ninguna tabla.
- Las respuestas se registran exclusivamente a través de la función SQL
  `submit_response()`, que valida atómicamente que la actividad esté activa
  y que el participante no haya respondido antes — esto evita respuestas
  duplicadas incluso si alguien intenta manipular las peticiones desde el
  navegador.
- Solo un usuario autenticado (el Sabio) puede crear, editar o borrar
  actividades y participantes, y es el único que puede leer la tabla de
  respuestas para armar el tablero de resultados.

---

¡Que gane la tribu más sabia! 🏆
