import cv2
import mediapipe as mp
from mediapipe.tasks import python
from mediapipe.tasks.python import vision
import urllib.request
import os
import math
import numpy as np

# 1. Archivo del modelo
ruta_modelo = 'hand_landmarker.task'
url_modelo = "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/latest/hand_landmarker.task"

if not os.path.exists(ruta_modelo):
    urllib.request.urlretrieve(url_modelo, ruta_modelo)

# 2. Configurar API para 2 manos
base_options = python.BaseOptions(model_asset_path=ruta_modelo)
opciones = vision.HandLandmarkerOptions(base_options=base_options, num_hands=2)
detector = vision.HandLandmarker.create_from_options(opciones)

# VARIABLES DE ESTADO
tipo_filtro = 0  
cooldown = 0 

nombre_ventana = 'Filtros Dinamicos 3D (1080p)'
cv2.namedWindow(nombre_ventana, cv2.WINDOW_NORMAL)

# CAMBIO A CÁMARA EXTERNA (Si no funciona, cambia el 1 por 2 o 0)
captura = cv2.VideoCapture(1)
captura.set(cv2.CAP_PROP_FRAME_WIDTH, 1920)
captura.set(cv2.CAP_PROP_FRAME_HEIGHT, 1080)

# Matriz matemática para el filtro Sepia
kernel_sepia = np.array([
    [0.131, 0.534, 0.272], 
    [0.168, 0.686, 0.349], 
    [0.189, 0.769, 0.393]  
])

while captura.isOpened():
    exito, fotograma = captura.read()
    if not exito:
        break

    fotograma = cv2.flip(fotograma, 1)
    alto, ancho, _ = fotograma.shape

    fotograma_rgb = cv2.cvtColor(fotograma, cv2.COLOR_BGR2RGB)
    mp_imagen = mp.Image(image_format=mp.ImageFormat.SRGB, data=fotograma_rgb)

    resultado = detector.detect(mp_imagen)
    manos_detectadas = resultado.hand_landmarks

    if cooldown > 0:
        cooldown -= 1

    if manos_detectadas and len(manos_detectadas) == 2:
        
        i1 = manos_detectadas[0][8]
        p1 = manos_detectadas[0][4]
        i2 = manos_detectadas[1][8]
        p2 = manos_detectadas[1][4]

        px_i1, py_i1 = int(i1.x * ancho), int(i1.y * alto)
        px_p1, py_p1 = int(p1.x * ancho), int(p1.y * alto)
        px_i2, py_i2 = int(i2.x * ancho), int(i2.y * alto)
        px_p2, py_p2 = int(p2.x * ancho), int(p2.y * alto)

        # GESTO DE PELLIZCO
        distancia_dedos = math.hypot(px_i1 - px_p1, py_i1 - py_p1)
        if distancia_dedos < 40 and cooldown == 0:
            tipo_filtro = (tipo_filtro + 1) % 4 
            cooldown = 30 

        # POLÍGONO 3D
        puntos_crudos = np.array([[px_i1, py_i1], [px_p1, py_p1], [px_i2, py_i2], [px_p2, py_p2]])
        
        centro = puntos_crudos.mean(axis=0)
        angulos = np.arctan2(puntos_crudos[:,1] - centro[1], puntos_crudos[:,0] - centro[0])
        puntos_ordenados = puntos_crudos[angulos.argsort()]

        mascara_poligono = np.zeros((alto, ancho), dtype=np.uint8)
        cv2.fillPoly(mascara_poligono, [puntos_ordenados], 255, lineType=cv2.LINE_AA)

        # Extraer la caja contenedora sugerida
        x_rect, y_rect, w_rect, h_rect = cv2.boundingRect(puntos_ordenados)

        # --- BLINDAJE CONTRA DESBORDAMIENTOS DE PANTALLA ---
        # Nos aseguramos de que las coordenadas nunca sean menores a 0 ni mayores a tu resolución
        x1 = max(0, x_rect)
        y1 = max(0, y_rect)
        x2 = min(ancho, x_rect + w_rect)
        y2 = min(alto, y_rect + h_rect)

        # Recalcular el ancho (w) y alto (h) EXACTO y REAL que se va a mostrar
        w = x2 - x1
        h = y2 - y1

        # Solo aplicamos los filtros si la caja resultante tiene un tamaño válido
        if w > 15 and h > 15:
            # Usamos las nuevas coordenadas seguras
            region = fotograma[y1:y2, x1:x2]
            mascara_region = mascara_poligono[y1:y2, x1:x2]
            
            if tipo_filtro == 0:
                gris = cv2.cvtColor(region, cv2.COLOR_BGR2GRAY)
                region_filtrada = cv2.cvtColor(gris, cv2.COLOR_GRAY2BGR)
            
            elif tipo_filtro == 1:
                gris = cv2.cvtColor(region, cv2.COLOR_BGR2GRAY)
                gris = cv2.convertScaleAbs(gris, alpha=1.2, beta=-10)
                
                # Como w y h ahora son infalibles, la matriz X_mesh y Y_mesh siempre encajará perfecto
                X_mesh, Y_mesh = np.meshgrid(np.arange(w), np.arange(h))
                patron = np.sin(X_mesh * 1.2) * np.sin(Y_mesh * 1.2)
                patron = (patron + 1.0) / 2.0 * 255.0
                
                halftone = np.where(gris > patron, 255, 0).astype(np.uint8)
                
                region_filtrada = np.empty((h, w, 3), dtype=np.uint8)
                region_filtrada[halftone == 0] = [70, 30, 160]   
                region_filtrada[halftone == 255] = [230, 210, 255] 

            elif tipo_filtro == 2:
                gris = cv2.cvtColor(region, cv2.COLOR_BGR2GRAY)
                region_filtrada = cv2.applyColorMap(gris, cv2.COLORMAP_JET)

            elif tipo_filtro == 3:
                sepia = cv2.transform(region, kernel_sepia)
                region_filtrada = np.clip(sepia, 0, 255).astype(np.uint8)

            # Corrección de Bordes Suaves
            mascara_suave = cv2.GaussianBlur(mascara_region, (5, 5), 0)
            alpha = mascara_suave.astype(float) / 255.0
            alpha_3d = cv2.merge([alpha, alpha, alpha])
            
            region_mezclada = cv2.convertScaleAbs(region_filtrada * alpha_3d + region * (1 - alpha_3d))

            # Insertar exactamente en el hueco seguro que calculamos
            fotograma[y1:y2, x1:x2] = region_mezclada
            
            cv2.polylines(fotograma, [puntos_ordenados], isClosed=True, color=(255, 255, 255), thickness=2, lineType=cv2.LINE_AA)

    cv2.imshow(nombre_ventana, fotograma)

    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

captura.release()
cv2.destroyAllWindows()