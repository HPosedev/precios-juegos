import { tmpdir } from 'os';
import { join } from 'path';
import { existsSync, readFileSync, writeFileSync, unlinkSync } from 'fs';

const LOCK_FILE = join(tmpdir(), 'precios-juegos-firefox.lock');

/**
 * Comprueba si se debe abrir Firefox en esta sesión.
 * Evita abrir pestañas duplicadas cuando bun --watch reinicia el servidor ante cambios de código.
 */
function shouldOpenBrowser(): boolean {
  if (process.env.BROWSER_OPEN === 'false' || process.env.NO_OPEN === 'true') {
    return false;
  }

  try {
    if (existsSync(LOCK_FILE)) {
      const content = readFileSync(LOCK_FILE, 'utf-8');
      const data = JSON.parse(content);
      const pid = data.pid;
      const time = data.time;

      // El bloqueo expira tras 12 horas por seguridad
      const isFresh = time && Date.now() - time < 12 * 60 * 60 * 1000;

      if (isFresh && pid && typeof pid === 'number') {
        try {
          process.kill(pid, 0);
          // El proceso sigue vivo: es una recarga en caliente de bun --watch
          return false;
        } catch {
          // El proceso anterior ya no existe, el bloqueo era huérfano
        }
      }
    }
  } catch {
    // Si hay error al leer o parsear, continuar y registrar nuevo bloqueo
  }

  // Adquirir bloqueo para esta sesión
  try {
    const ownerPid = process.ppid || process.pid;
    writeFileSync(
      LOCK_FILE,
      JSON.stringify({ pid: ownerPid, project: process.cwd(), time: Date.now() })
    );
  } catch {
    // Ignorar errores de escritura de archivo
  }

  return true;
}

/**
 * Limpieza del archivo de bloqueo al salir el proceso
 */
function setupLockCleanup() {
  const cleanup = () => {
    try {
      if (existsSync(LOCK_FILE)) {
        unlinkSync(LOCK_FILE);
      }
    } catch {
      // Ignorar errores
    }
  };

  process.on('exit', cleanup);
  process.on('SIGINT', () => {
    cleanup();
    process.exit(0);
  });
  process.on('SIGTERM', () => {
    cleanup();
    process.exit(0);
  });
}

/**
 * Comprueba si una URL HTTP está lista y respondiendo peticiones
 */
async function checkUrlReady(url: string, timeoutMs = 3500): Promise<boolean> {
  const startTime = Date.now();
  while (Date.now() - startTime < timeoutMs) {
    try {
      const res = await fetch(url, {
        method: 'GET',
        signal: AbortSignal.timeout(400),
      });
      if (res.ok || res.status < 500) {
        return true;
      }
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 150));
    }
  }
  return false;
}

/**
 * Abre Firefox con la URL indicada en un proceso desacoplado.
 */
function launchFirefox(url: string): boolean {
  // Comprobar si hay pantalla gráfica en entornos Linux
  const isHeadless =
    !process.env.DISPLAY &&
    !process.env.WAYLAND_DISPLAY &&
    process.platform !== 'win32' &&
    process.platform !== 'darwin';

  if (isHeadless) {
    console.log('ℹ️ Entorno sin pantalla gráfica detectado. Omitiendo apertura automática de navegador.');
    return false;
  }

  const platform = process.platform;

  try {
    if (platform === 'linux') {
      try {
        const proc = Bun.spawn(['firefox', url], {
          detached: true,
          stdio: ['ignore', 'ignore', 'ignore'],
        });
        proc.unref();
        return true;
      } catch {
        // Alternativa con flatpak
        try {
          const proc = Bun.spawn(['flatpak', 'run', 'org.mozilla.firefox', url], {
            detached: true,
            stdio: ['ignore', 'ignore', 'ignore'],
          });
          proc.unref();
          return true;
        } catch {
          // Fallback a xdg-open si no está el binario directo de firefox
          const proc = Bun.spawn(['xdg-open', url], {
            detached: true,
            stdio: ['ignore', 'ignore', 'ignore'],
          });
          proc.unref();
          return true;
        }
      }
    } else if (platform === 'darwin') {
      try {
        const proc = Bun.spawn(['open', '-a', 'Firefox', url], {
          detached: true,
          stdio: ['ignore', 'ignore', 'ignore'],
        });
        proc.unref();
        return true;
      } catch {
        const proc = Bun.spawn(['open', url], {
          detached: true,
          stdio: ['ignore', 'ignore', 'ignore'],
        });
        proc.unref();
        return true;
      }
    } else if (platform === 'win32') {
      try {
        const proc = Bun.spawn(['cmd.exe', '/c', 'start', 'firefox', url], {
          detached: true,
          stdio: ['ignore', 'ignore', 'ignore'],
        });
        proc.unref();
        return true;
      } catch {
        const proc = Bun.spawn(['cmd.exe', '/c', 'start', url], {
          detached: true,
          stdio: ['ignore', 'ignore', 'ignore'],
        });
        proc.unref();
        return true;
      }
    } else {
      const proc = Bun.spawn(['firefox', url], {
        detached: true,
        stdio: ['ignore', 'ignore', 'ignore'],
      });
      proc.unref();
      return true;
    }
  } catch (err: any) {
    console.warn(`⚠️ No se pudo abrir Firefox automáticamente: ${err?.message || err}`);
    return false;
  }
}

/**
 * Determina la URL de destino adecuada y abre Firefox automáticamente.
 */
export async function openAppInFirefox(serverPort: number = 3001): Promise<void> {
  if (!shouldOpenBrowser()) {
    return;
  }

  setupLockCleanup();

  const isDevMode =
    process.env.CLIENT_DEV === 'true' ||
    process.argv.includes('--dev');

  let targetUrl = `http://localhost:${serverPort}`;

  if (isDevMode) {
    const viteUrl = 'http://localhost:3000';
    // Esperar a que Vite termine de arrancar si está en modo desarrollo
    const viteReady = await checkUrlReady(viteUrl, 3500);
    if (viteReady) {
      targetUrl = viteUrl;
    }
  }

  console.log(`🦊 Abriendo Firefox automáticamente en ${targetUrl}...`);
  launchFirefox(targetUrl);
}
