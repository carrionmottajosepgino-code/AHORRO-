# AHORRA+

App de finanzas personales que se adapta a pagos **quincenales o mensuales**. Funciona **sin internet** y guarda los datos solo en el celular de cada persona.

## Descargar

- **Android (APK):** [Descargar AHORRA+](https://github.com/carrionmottajosepgino-code/AHORRO-/releases/latest/download/AHORRA-plus.apk)
  Abre el archivo descargado e instálalo. Si el celular lo pide, permite "instalar apps desconocidas" para tu navegador o gestor de archivos.
- **Web / iPhone:** [carrionmottajosepgino-code.github.io/AHORRO-](https://carrionmottajosepgino-code.github.io/AHORRO-/)
  En Android: Chrome → ⋮ → *Instalar app*. En iPhone: Safari → Compartir → *Agregar a inicio*.

Cada persona tiene sus propios datos en su celular; nadie más los ve.

## Qué hace
- Configuración inicial: pago quincenal (días a elegir) o mensual, con adelanto si cae fin de semana o feriado.
- Reparte cada pago con la regla 50/30/20 o 25/15/50/10 (nombres y porcentajes editables).
- Sobres para gastos fijos: aparta una parte en cada pago antes del vencimiento (ej. alquiler 50% y 50%).
- Disponible para gastar, gasto diario sugerido y barras con el ritmo ideal del día.
- Registro rápido de gastos, alertas de ritmo y vencimientos, historial por periodo, ingresos extra.
- Respaldo y restauración en archivo JSON. Modo oscuro.

## Cómo se publica
Cada cambio que se sube a `main` dispara dos flujos de GitHub Actions:
- **APK Android** (`.github/workflows/android.yml`): empaqueta la app con Capacitor, la firma y la publica en *Releases*.
- **Versión web** (`.github/workflows/pages.yml`): publica la app en GitHub Pages.

La firma del APK usa dos secretos del repositorio (*Settings → Secrets and variables → Actions*): `ANDROID_KEYSTORE_BASE64` y `ANDROID_KEYSTORE_PASSWORD`. Usa siempre la misma clave: si cambia, las actualizaciones no se podrán instalar encima de la versión anterior.

## Desarrollo
```
npm test                      # tests del motor de cálculo
python3 -m http.server 8000   # probar en http://localhost:8000
```

Archivos principales: `engine.js` (cálculos: calendario, periodos, distribución, sobres, ritmo y alertas; montos en céntimos), `app.js` (interfaz y guardado), `index.html` (estilos), `sw.js` y `manifest.webmanifest` (modo sin internet).

Tipografía Manrope bajo licencia OFL (`fonts/OFL.txt`).
