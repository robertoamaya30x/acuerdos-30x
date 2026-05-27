# Acuerdos de Pago 30X

Portal web para generar acuerdos de pago en PDF. Construido con Next.js 14 y pdfmake.

## Cómo correr en local

```bash
npm install
npm run dev
# Abrir http://localhost:3000
```

## Cómo modificar la plantilla del acuerdo

Editar el archivo `templates/acuerdo_pago.txt`. Las variables están entre `{{` y `}}`. No cambiar los nombres de las variables, solo el texto alrededor.

## Cómo agregar un campo nuevo

1. Agregar el campo en `config/campos.json`
2. Agregar la variable `{{NUEVA_VARIABLE}}` en `templates/acuerdo_pago.txt`
3. Agregar la lógica de reemplazo en `lib/generador.ts`
4. El formulario en `app/page.tsx` se actualiza para campos de participante si usa `campos.json`

## Cómo hacer deploy en Vercel

1. Subir el código a un repositorio en GitHub
2. Entrar a vercel.com
3. Clic en "Add New Project"
4. Importar el repositorio `acuerdos-30x`
5. Vercel detecta Next.js automáticamente
6. Clic en "Deploy"
7. En ~2 minutos tienes la URL pública

## Variables disponibles en la plantilla

| Variable | Descripción |
|---|---|
| `{{NOMBRE_PARTICIPANTE}}` | Nombre completo del participante |
| `{{TIPO_DOCUMENTO}}` | Tipo de documento de identidad |
| `{{NUMERO_DOCUMENTO}}` | Número del documento |
| `{{CIUDAD_PAIS}}` | Ciudad y país de domicilio |
| `{{DIRECCION}}` | Dirección del participante |
| `{{FECHA_ACUERDO}}` | Fecha del acuerdo en español |
| `{{MONTO_TOTAL}}` | Monto total en USD (número) |
| `{{MONTO_LETRAS}}` | Monto total en palabras en español |
| `{{NUMERO_CUOTAS}}` | Número de cuotas |
| `{{TABLA_CUOTAS}}` | Tabla dinámica de cuotas |
| `{{NOMBRE_PROGRAMA}}` | Nombre del programa (desde campos.json) |
