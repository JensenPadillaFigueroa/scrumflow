# ScrumFlow Windows Service Setup

Este documento explica cómo configurar ScrumFlow como un servicio de Windows que se ejecuta automáticamente en el puerto **3008**.

## Requisitos Previos

- Node.js instalado (v18 o superior)
- Permisos de administrador en Windows
- PM2 y PM2-Windows-Service (se instalan automáticamente)

## 🚀 Instalación Rápida

### Opción 1: Instalación Automática (Recomendada)

1. **Ejecutar como Administrador** el archivo `install-service.bat`
2. Esperar a que se complete la instalación
3. El servicio se iniciará automáticamente

```bash
# Click derecho en install-service.bat > "Ejecutar como administrador"
```

### Opción 2: Instalación Manual

```bash
# 1. Instalar PM2 globalmente
npm install -g pm2
npm install -g pm2-windows-service

# 2. Compilar la aplicación
npm run build

# 3. Instalar PM2 como servicio de Windows
pm2-service-install -n PM2-ScrumFlow

# 4. Iniciar la aplicación
pm2 start ecosystem.config.cjs

# 5. Guardar configuración
pm2 save

# 6. Configurar inicio automático
pm2 startup
```

## 📊 Gestión del Servicio

### Usando el Script de Gestión

```bash
# Ver estado del servicio
manage-service.bat status

# Iniciar el servicio
manage-service.bat start

# Detener el servicio
manage-service.bat stop

# Reiniciar el servicio
manage-service.bat restart

# Ver logs en tiempo real
manage-service.bat logs
```

### Comandos PM2 Directos

```bash
# Ver estado
pm2 status

# Ver logs
pm2 logs scrumflow-server

# Reiniciar
pm2 restart scrumflow-server

# Detener
pm2 stop scrumflow-server

# Ver información detallada
pm2 show scrumflow-server

# Monitoreo en tiempo real
pm2 monit
```

## 🗑️ Desinstalación

1. **Ejecutar como Administrador** el archivo `uninstall-service.bat`
2. Confirmar la desinstalación

```bash
# O manualmente:
pm2 stop all
pm2 delete all
pm2-service-uninstall
pm2 kill
```

## 📁 Ubicación de Archivos

### Archivos de Configuración
- `ecosystem.config.cjs` - Configuración de PM2
- `.env` - Variables de entorno (PORT=3008)

### Logs del Servicio
Los logs se guardan en la carpeta `logs/`:
- `scrumflow-server-error.log` - Errores
- `scrumflow-server-out.log` - Salida estándar
- `scrumflow-server-combined.log` - Combinado

### Archivos de Gestión
- `install-service.bat` - Instalación del servicio
- `uninstall-service.bat` - Desinstalación del servicio
- `manage-service.bat` - Gestión del servicio

## 🔧 Configuración

### Puerto del Servidor
El servidor está configurado para correr en el **puerto 3008**. Puedes verificarlo en:
- Archivo `.env`: `PORT=3008`
- Archivo `ecosystem.config.cjs`: `env.PORT: 3008`
- Archivo `server/index.ts`: `const port = Number(process.env.PORT) || 3008`

### Variables de Entorno
Asegúrate de que el archivo `.env` contenga:
```env
PORT=3008
NODE_ENV=production
DB_HOST=tekpro.crec8oyg2aj7.us-east-1.rds.amazonaws.com
DB_PORT=3306
DB_USER=admin
DB_PASSWORD=Tekpro2024
DB_NAME=scrumflow
```

## 🌐 Acceso al Servicio

Una vez instalado, puedes acceder a ScrumFlow en:
- **URL Local**: http://localhost:3008
- **URL de Red**: http://[IP-de-tu-máquina]:3008

## ⚠️ Solución de Problemas

### El servicio no inicia
1. Verificar que el build se completó: `npm run build`
2. Verificar logs: `pm2 logs scrumflow-server`
3. Verificar puerto disponible: `netstat -ano | findstr :3008`

### Error de permisos
- Ejecutar scripts BAT como **Administrador**
- Verificar que Node.js y PM2 estén en el PATH

### Base de datos no conecta
- Verificar credenciales en `.env`
- Verificar conectividad: `ping tekpro.crec8oyg2aj7.us-east-1.rds.amazonaws.com`
- Revisar logs de error

### Servicio no inicia con Windows
```bash
# Re-configurar startup
pm2 unstartup
pm2 startup
pm2 save
```

## 📝 Notas Importantes

1. **Compilación Requerida**: El servicio ejecuta código compilado de `dist/index.js`
2. **Inicio Automático**: El servicio se inicia automáticamente al arrancar Windows
3. **Reinicio Automático**: PM2 reinicia el servicio si falla
4. **Logs Rotativos**: Los logs se guardan con timestamps
5. **Múltiples Instancias**: Configurado para 1 instancia (modificar en ecosystem.config.cjs)

## 🔄 Actualización del Servicio

Después de hacer cambios en el código:

```bash
# 1. Detener el servicio
manage-service.bat stop

# 2. Compilar nuevamente
npm run build

# 3. Reiniciar el servicio
manage-service.bat start
```

## 📞 Soporte

Para más información sobre PM2:
- Documentación oficial: https://pm2.keymetrics.io/
- PM2 Windows Service: https://www.npmjs.com/package/pm2-windows-service

## ✅ Verificación de Instalación

Para verificar que todo funciona correctamente:

1. **Verificar servicio de Windows**
   - Abrir `services.msc`
   - Buscar "PM2-ScrumFlow"
   - Estado debe ser "En ejecución"

2. **Verificar PM2**
   ```bash
   pm2 status
   # Debe mostrar scrumflow-server como "online"
   ```

3. **Verificar servidor**
   - Abrir navegador en http://localhost:3008
   - Debe cargar la aplicación ScrumFlow

4. **Verificar logs**
   ```bash
   pm2 logs scrumflow-server --lines 50
   # Debe mostrar "serving on http://localhost:3008"
   ```
