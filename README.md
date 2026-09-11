# Pop-ups condicionales para Tienda Nube

Aplicación para mostrar pop-ups (texto + imagen) en tu tienda de Tienda Nube,
disparados cuando la URL contiene cierta palabra y esperando X segundos.

Incluye:
- **`widget/popup.js`** — script que se inyecta en el storefront de tu tienda.
- **`backend/`** — servidor Express con panel de administración y conexión a la API de Tienda Nube.

---

## 1. Crear la app en Tienda Nube y obtener el token

1. Entrá al panel de partners/admin de tu tienda → **Aplicaciones a medida**
   (la pantalla que me mostraste, con el botón "Crear aplicación a medida").
2. Creá una nueva aplicación a medida.
3. Copiá el **Store ID** (aparece en la URL del admin, ej: `.../1234567/...`)
   y el **Access Token** que te genera.

Guardá esos dos datos, los vas a necesitar en el paso 3.

---

## 2. Desplegar el backend en Render

1. Subí esta carpeta (`tiendanube-popup-app`) a un repositorio de GitHub.
2. En [Render](https://render.com), creá un **New Web Service** apuntando a ese repo.
3. Configurá:
   - **Root directory:** `backend`
   - **Build command:** `npm install`
   - **Start command:** `npm start`
4. En la sección **Environment**, agregá las variables (basate en `.env.example`):
   - `ADMIN_PASSWORD` → una contraseña fuerte para entrar al panel
   - `TN_STORE_ID` → el Store ID del paso 1
   - `TN_ACCESS_TOKEN` → el Access Token del paso 1
   - `PUBLIC_BACKEND_URL` → la URL que Render te asigna (ej: `https://tn-popups.onrender.com`).
     **Importante:** hacé un primer deploy sin esta variable, copiá la URL que Render
     te da, y recién ahí agregala y volvé a desplegar.
5. Deploy. Cuando termine, entrá a `https://tu-app.onrender.com/admin` y logueate
   con tu `ADMIN_PASSWORD`.

> 💡 Alternativa: también funciona en cualquier hosting que corra Node.js
> (Railway, Fly.io, un VPS, etc.). La única particularidad es que usa SQLite
> con almacenamiento en disco, así que necesitás un plan con **disco persistente**
> (en Render, el plan free ya lo incluye para Web Services).

---

## 3. Registrar el script en tu tienda

Con el backend desplegado y las variables de entorno cargadas:

1. Entrá al panel `/admin`.
2. Hacé clic en **"Registrar script en Tienda Nube"**.
3. Eso llama automáticamente a la API de Tienda Nube (`POST /v1/{store_id}/scripts`)
   y le dice a tu tienda que cargue `widget/popup.js` en todas las páginas del storefront.

Si preferís hacerlo manualmente (por ejemplo la primera vez, para probar), podés
correr este `curl` reemplazando los valores:

```bash
curl -X POST "https://api.tiendanube.com/v1/TU_STORE_ID/scripts" \
  -H "Authentication: bearer TU_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -H "User-Agent: TiendaNube Popup App (tu-email@dominio.com)" \
  -d '{
        "src": "https://tu-app.onrender.com/widget/popup.js",
        "event": "onload",
        "where": "storefront"
      }'
```

---

## 4. Crear tus pop-ups

En `/admin`:

1. Clic en **"+ Nuevo pop-up"**.
2. Completá:
   - **Palabra o texto que debe contener la URL**: ej. `black-friday`, `/producto/zapatillas`, `oferta`
   - **Tipo de coincidencia**: contiene / es igual / empieza con
   - **Segundos de espera**: cuánto tarda en aparecer una vez que el visitante entra a esa página
   - **Título, mensaje, imagen, botón**
3. Guardar. El pop-up queda activo al instante — no hace falta volver a registrar el script,
   el widget consulta la configuración cada vez que se carga una página.

---

## 5. Cómo funciona por dentro

- Tienda Nube inyecta `widget/popup.js` en cada página del storefront.
- Ese script lee `window.location.href`, y por cada pop-up activo revisa si la URL
  cumple la condición configurada.
- Si coincide, espera los segundos configurados y muestra el pop-up (texto + imagen + botón).
- Usa `sessionStorage` para no repetir el mismo pop-up varias veces en la misma sesión
  (configurable por pop-up).
- La lista de pop-ups activos se pide en tiempo real a
  `GET /api/popups/active`, así que podés crear, editar o desactivar pop-ups
  desde el panel sin tocar código ni volver a registrar nada en Tienda Nube.

---

## Estructura del proyecto

```
tiendanube-popup-app/
├── widget/
│   └── popup.js              # Script que se inyecta en la tienda
└── backend/
    ├── server.js             # API + servidor de archivos estáticos
    ├── db.js                 # Base de datos SQLite
    ├── package.json
    ├── .env.example
    └── public/admin/         # Panel de administración (HTML/CSS/JS)
        ├── index.html
        ├── style.css
        └── app.js
```

## Probar en local

```bash
cd backend
cp .env.example .env   # completá ADMIN_PASSWORD como mínimo
npm install
npm start
```

Abrí `http://localhost:3000/admin` para el panel, y
`http://localhost:3000/widget/popup.js` para ver el script.

Para probar el pop-up sin conectar Tienda Nube todavía, podés crear un HTML
de prueba local con:

```html
<script>window.TN_POPUP_BACKEND_URL = "http://localhost:3000";</script>
<script src="http://localhost:3000/widget/popup.js"></script>
```

y navegar a una URL que contenga la palabra clave que configuraste.
