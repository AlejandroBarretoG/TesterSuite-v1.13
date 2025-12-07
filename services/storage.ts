
import { getStorage, ref, uploadString, getDownloadURL, deleteObject, uploadBytesResumable, listAll, getMetadata, getBytes } from 'firebase/storage';
import { FirebaseInitResult } from './firebase';

/**
 * Realiza una prueba real de subida, descarga y borrado en Firebase Storage.
 * Incluye un TIMEOUT DE 5 SEGUNDOS y manejo de errores específicos.
 */
export const testStorageConnection = async (appInstance: any): Promise<FirebaseInitResult> => {
  const TIMEOUT_MS = 5000;

  // Promesa que se rechaza automáticamente después del tiempo límite
  const timeoutPromise = new Promise<never>((_, reject) => {
    const id = setTimeout(() => {
      clearTimeout(id);
      reject(new Error("TIMEOUT_EXCEEDED"));
    }, TIMEOUT_MS);
  });

  // La operación real de almacenamiento
  const operationPromise = async (): Promise<FirebaseInitResult> => {
    try {
      const storage = getStorage(appInstance);
      const filename = `_diagnostics/test_${Date.now()}.txt`;
      const storageRef = ref(storage, filename);
      
      // 1. Subida (Upload)
      const content = "Firebase Connection Tester - Connectivity Check";
      await uploadString(storageRef, content);
      
      // 2. Verificación de Acceso (Download URL)
      const downloadURL = await getDownloadURL(storageRef);
      
      // 3. Limpieza (Delete)
      await deleteObject(storageRef);

      return {
        success: true,
        message: "Storage Test Exitoso",
        data: {
          filename,
          urlSample: downloadURL.substring(0, 40) + "...",
          latency: "OK (< 5s)"
        }
      };
    } catch (error: any) {
      throw error; // Re-lanzar para que lo capture el bloque catch principal o el race
    }
  };

  try {
    // Competencia: Lo que ocurra primero (Operación exitosa/fallida o Timeout)
    return await Promise.race([operationPromise(), timeoutPromise]);

  } catch (error: any) {
    let userMessage = "Error desconocido en Storage.";
    let technicalDetails = error.message;

    // Diagnóstico de Errores Específicos
    if (error.message === "TIMEOUT_EXCEEDED") {
      userMessage = "Tiempo de espera agotado (Timeout 5s). Verifica si el servicio Storage está habilitado o si hay bloqueos de red (Firewall/CORS).";
    } else if (error.code === 'storage/unauthorized') {
      userMessage = "Permiso denegado (storage/unauthorized). Revisa las Reglas de Seguridad en la consola de Firebase. Asegúrate de permitir lectura/escritura en la ruta de prueba.";
    } else if (error.code === 'storage/retry-limit-exceeded') {
      userMessage = "Límite de reintentos excedido. La conexión es inestable o está bloqueada.";
    } else if (error.code === 'storage/object-not-found') {
      userMessage = "Objeto no encontrado. Falló la verificación post-subida.";
    } else if (error.code === 'storage/canceled') {
      userMessage = "Operación cancelada por el sistema.";
    } else if (error.code === 'storage/unknown') {
      userMessage = "Error desconocido de configuración de Storage.";
    } else if (error.message && error.message.includes("cors")) {
      userMessage = "Error de CORS. Necesitas configurar los encabezados CORS en Google Cloud Console para tu bucket.";
    }

    return {
      success: false,
      message: userMessage,
      error: technicalDetails
    };
  }
};

/**
 * PRODUCTION METHODS
 */

export interface FileData {
  name: string;
  fullPath: string;
  url: string;
  size?: number;
  contentType?: string;
  timeCreated?: string;
  type: 'file' | 'folder';
}

export const uploadFile = async (
  appInstance: any, 
  file: File, 
  path: string = 'public_assets', 
  onProgress?: (progress: number) => void
): Promise<{ success: boolean; url?: string; error?: string }> => {
  try {
    const storage = getStorage(appInstance);
    // Ensure path ends with slash if it's not empty, to keep structure clean
    const cleanPath = path.endsWith('/') ? path : `${path}/`;
    // If path is root '/', remove the slash for the ref
    const finalPath = cleanPath === '/' ? '' : cleanPath;
    
    const storageRef = ref(storage, `${finalPath}${file.name}`);
    
    const uploadTask = uploadBytesResumable(storageRef, file);

    return new Promise((resolve) => {
      uploadTask.on('state_changed',
        (snapshot: any) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          if (onProgress) onProgress(progress);
        },
        (error: any) => {
          resolve({ success: false, error: error.message });
        },
        async () => {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          resolve({ success: true, url: downloadURL });
        }
      );
    });
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

export const createFolder = async (appInstance: any, currentPath: string, folderName: string): Promise<{ success: boolean; error?: string }> => {
  try {
    const storage = getStorage(appInstance);
    const cleanPath = currentPath.endsWith('/') ? currentPath : `${currentPath}/`;
    // Firebase Storage "folders" are just prefixes. We upload a hidden file to "hold" the folder.
    const folderRef = ref(storage, `${cleanPath}${folderName}/.keep`);
    await uploadString(folderRef, "placeholder");
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
};

export const moveFile = async (appInstance: any, oldPath: string, newPath: string): Promise<{ success: boolean; error?: string }> => {
  try {
    const storage = getStorage(appInstance);
    const oldRef = ref(storage, oldPath);
    const newRef = ref(storage, newPath);

    // 1. Download bytes
    const bytes = await getBytes(oldRef);
    
    // 2. Get Metadata to preserve content type
    const metadata = await getMetadata(oldRef);

    // 3. Upload to new location
    await uploadBytesResumable(newRef, bytes, metadata);

    // 4. Delete old
    await deleteObject(oldRef);

    return { success: true };
  } catch (e: any) {
    console.error("Move error:", e);
    return { success: false, error: e.message || "Error al mover archivo." };
  }
};

export const listFiles = async (appInstance: any, path: string = 'public_assets/'): Promise<{ success: boolean; files?: FileData[]; error?: string }> => {
  try {
    const storage = getStorage(appInstance);
    const listRef = ref(storage, path);
    const res = await listAll(listRef);

    // 1. Map Folders (Prefixes)
    const folders: FileData[] = res.prefixes.map((folderRef: any) => ({
      name: folderRef.name,
      fullPath: folderRef.fullPath,
      url: '',
      type: 'folder',
      size: 0
    }));

    // 2. Map Files (Items)
    const filesPromise = res.items.map(async (itemRef: any) => {
      // Ignore .keep files used for folders
      if (itemRef.name === '.keep') return null;

      const url = await getDownloadURL(itemRef);
      let metadata: any = {};
      try {
        metadata = await getMetadata(itemRef);
      } catch (e) { console.warn("Could not get metadata for", itemRef.name); }

      return {
        name: itemRef.name,
        fullPath: itemRef.fullPath,
        url,
        size: metadata.size,
        contentType: metadata.contentType,
        timeCreated: metadata.timeCreated,
        type: 'file'
      } as FileData;
    });

    const files = await Promise.all(filesPromise);
    const validFiles = files.filter((f): f is FileData => f !== null);

    return { success: true, files: [...folders, ...validFiles] };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

export const deleteFile = async (appInstance: any, fullPath: string): Promise<{ success: boolean; error?: string }> => {
  try {
    const storage = getStorage(appInstance);
    const fileRef = ref(storage, fullPath);
    await deleteObject(fileRef);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

/**
 * Elimina recursivamente una carpeta y todo su contenido.
 */
export const deleteFolder = async (appInstance: any, folderPath: string): Promise<{ success: boolean; error?: string; count?: number }> => {
  try {
    const storage = getStorage(appInstance);
    // Aseguramos que la ruta termine en / para evitar errores de prefijo
    const pathRef = folderPath.endsWith('/') ? folderPath : `${folderPath}/`;
    const folderRef = ref(storage, pathRef);
    
    console.log(`[Delete] Iniciando borrado recursivo en: "${pathRef}"`);
    
    const list = await listAll(folderRef);
    const totalItems = list.items.length + list.prefixes.length;

    console.log(`[Delete] Encontrados: ${list.items.length} archivos, ${list.prefixes.length} carpetas.`);

    if (totalItems === 0) {
      console.warn(`[Delete Warning] La ruta parece vacía. Verifique si la ruta "${pathRef}" coincide exactamente con Firebase.`);
    }

    // 1. Eliminar archivos
    const fileDeletes = list.items.map(item => {
        console.log(`[Delete] Eliminando archivo: ${item.fullPath}`);
        return deleteObject(item);
    });

    // 2. Eliminar subcarpetas (Recursivo)
    const folderDeletes = list.prefixes.map(prefix => {
        return deleteFolder(appInstance, prefix.fullPath);
    });

    await Promise.all([...fileDeletes, ...folderDeletes]);
    
    return { success: true, count: totalItems };
  } catch (e: any) {
    console.error("[Delete Critical Error]", e);
    return { success: false, error: e.message };
  }
};
