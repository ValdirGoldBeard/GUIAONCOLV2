#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
compilar.py - Compilador de Fichas de Flora (Parque Oncol V2)

Recorre recursivamente la carpeta de Fichas de Especies (flora),
extrae Frontmatter YAML y secciones H2, y genera especies.json
de manera 100% dinámica ante cambios de carpetas o reorganización de fichas.
"""

import os
import json
import re
import sys

def buscar_ruta_fichas():
    """
    Localiza la carpeta 'Fichas de Especies/flora' de forma robusta,
    ya sea ejecutando desde app_flora_v2 o desde la raíz del proyecto.
    """
    directorio_script = os.path.dirname(os.path.abspath(__file__))
    posibles_rutas = [
        # Si se ejecuta dentro de app_flora_v2:
        os.path.join(directorio_script, "..", "Fichas de Especies"),
        # Si se ejecuta desde la raíz:
        os.path.join(directorio_script, "Fichas de Especies"),
        # En el directorio de trabajo actual:
        os.path.join(os.getcwd(), "Fichas de Especies")
    ]
    
    for ruta_base in posibles_rutas:
        if os.path.exists(ruta_base):
            # Priorizar la subcarpeta 'flora' si existe
            ruta_flora = os.path.join(ruta_base, "flora")
            if os.path.isdir(ruta_flora):
                return os.path.abspath(ruta_flora)
            return os.path.abspath(ruta_base)
            
    return None

def buscar_seccion(titulo, texto):
    """
    Extrae el contenido textual debajo de un título de nivel 2 (## Titulo)
    hasta el siguiente ## o el final del texto.
    Soporta saltos de línea tanto Unix (\n) como Windows (\r\n).
    """
    regex = rf"##\s+{re.escape(titulo)}\s*[\r\n]+(.*?)(?=(?:[\r\n]+##\s+)|$)"
    m = re.search(regex, texto, re.DOTALL)
    return m.group(1).strip() if m else ""

def extraer_todas_las_secciones_h2(cuerpo_texto):
    """
    Extrae dinámicamente cualquier sección ## que exista en el archivo,
    asegurando que si se agrega un nuevo título H2 no se pierda.
    """
    secciones = {}
    patron = r"##\s+([^\r\n]+)[\r\n]+(.*?)(?=(?:[\r\n]+##\s+)|$)"
    for m in re.finditer(patron, cuerpo_texto, re.DOTALL):
        titulo = m.group(1).strip()
        contenido = m.group(2).strip()
        secciones[titulo] = contenido
    return secciones

def compilar():
    ruta_flora = buscar_ruta_fichas()
    if not ruta_flora or not os.path.isdir(ruta_flora):
        print(f"❌ Error: No se pudo localizar la carpeta 'Fichas de Especies' o 'flora'.")
        print("Asegúrate de ejecutar el script dentro del proyecto.")
        sys.exit(1)

    print(f"📂 Leyendo fichas de flora desde: {ruta_flora}")

    lista_especies = []
    conteo_subcategorias = {}

    # Listar subdirectorios de flora (arboles, arbustos, helechos, etc.)
    subcategorias = sorted([
        d for d in os.listdir(ruta_flora)
        if os.path.isdir(os.path.join(ruta_flora, d)) and not d.startswith(".")
    ])

    for subcat in subcategorias:
        ruta_subcat = os.path.join(ruta_flora, subcat)
        archivos = sorted(os.listdir(ruta_subcat))
        
        for archivo in archivos:
            # Solo procesar archivos markdown reales, descartar temporales y plantillas
            if not archivo.endswith(".md"):
                continue
            if archivo.startswith("00_plantilla") or archivo.startswith("plantilla"):
                continue
            if archivo.endswith(".save") or archivo.endswith(".bak"):
                continue

            ruta_archivo = os.path.join(ruta_subcat, archivo)
            
            try:
                with open(ruta_archivo, "r", encoding="utf-8") as f:
                    contenido = f.read()
            except Exception as e:
                print(f"⚠️ Error al leer '{ruta_archivo}': {e}")
                continue

            # Separar el Frontmatter (entre ---) del cuerpo
            match_fm = re.search(r"^---\s*[\r\n]+(.*?)[\r\n]+---\s*[\r\n]+(.*)$", contenido, re.DOTALL)
            if not match_fm:
                # Intentar patrón alternativo si hay espacios iniciales
                match_fm = re.search(r"---(.*?)---(.*)", contenido, re.DOTALL)
                
            if not match_fm:
                print(f"⚠️ Ficha sin Frontmatter YAML válido: {archivo}")
                continue

            frontmatter_texto = match_fm.group(1)
            cuerpo_texto = match_fm.group(2)

            # Datos base derivados de la organización en carpetas
            datos = {
                "reino_categoria": "flora",
                "grupo_subcategoria": subcat,
                "archivo_origen": archivo
            }

            # Procesar el frontmatter línea por línea
            for linea in frontmatter_texto.strip().splitlines():
                linea = linea.strip()
                if not linea or linea.startswith("#"):
                    continue
                if ":" in linea:
                    clave, valor = linea.split(":", 1)
                    clave = clave.strip()
                    valor_limpio = valor.strip().strip('"').strip("'")
                    
                    # Normalizar booleanos
                    if valor_limpio.lower() == "true":
                        valor_limpio = True
                    elif valor_limpio.lower() == "false":
                        valor_limpio = False
                    
                    datos[clave] = valor_limpio

            # Extraer secciones estándar de la plantilla de flora
            datos["descripcion_morfologica"] = buscar_seccion("Descripción Morfológica", cuerpo_texto)
            datos["como_reconocerla"] = buscar_seccion("Cómo Reconocerla", cuerpo_texto)
            datos["dato_curioso"] = buscar_seccion("Dato Curioso", cuerpo_texto)
            datos["historia_natural"] = buscar_seccion("Historia Natural", cuerpo_texto)
            datos["habitat"] = buscar_seccion("Hábitat", cuerpo_texto)
            datos["distribucion_texto"] = buscar_seccion("Distribución", cuerpo_texto)
            datos["amenazas"] = buscar_seccion("Amenazas", cuerpo_texto)
            datos["usos"] = buscar_seccion("Usos", cuerpo_texto)
            datos["en_oncol"] = buscar_seccion("En Oncol", cuerpo_texto)
            datos["fuentes"] = buscar_seccion("Fuentes", cuerpo_texto)

            # Respaldo: agregar cualquier otra sección H2 no estándar si existiese
            secciones_adicionales = extraer_todas_las_secciones_h2(cuerpo_texto)
            secciones_extra = {}
            for tit, cont in secciones_adicionales.items():
                if tit not in [
                    "Descripción Morfológica", "Cómo Reconocerla", "Dato Curioso",
                    "Historia Natural", "Hábitat", "Distribución", "Amenazas",
                    "Usos", "En Oncol", "Fuentes"
                ]:
                    secciones_extra[tit] = cont
            if secciones_extra:
                datos["secciones_adicionales"] = secciones_extra

            lista_especies.append(datos)
            conteo_subcategorias[subcat] = conteo_subcategorias.get(subcat, 0) + 1

    # Destino de especies.json: en el mismo directorio donde reside este script
    directorio_script = os.path.dirname(os.path.abspath(__file__))
    ruta_salida = os.path.join(directorio_script, "especies.json")
    
    with open(ruta_salida, "w", encoding="utf-8") as f:
        json.dump(lista_especies, f, ensure_ascii=False, indent=2)

    print("\n✅ Compilación completada con éxito.")
    print(f"📄 Archivo generado: {ruta_salida}")
    print(f"📊 Total de especies compiladas: {len(lista_especies)}\n")
    print("Desglose por subcategoría de flora:")
    for sub, cant in conteo_subcategorias.items():
        print(f"  • {sub}: {cant} especies")

if __name__ == "__main__":
    compilar()
