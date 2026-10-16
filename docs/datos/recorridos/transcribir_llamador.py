"""Columnas del Llamador 2025 transcritas a mano de la imagen (págs. 24, 32 y 42), porque su cabecera
no sigue el patrón que lee el extractor. Cada lista: hora de la primera fila y una celda por media hora ("" = vacía)."""
import json

def col(inicio, celdas):
    h, m = map(int, inicio.split(":"))
    out, t = [], h * 60 + m
    for c in celdas:
        if c:
            out.append(["%d:%02d" % ((t // 60) % 24, t % 60), c])
        t += 30
    return out

CO = ["CAMPANA", "PLAZA", "P. SAN MIGUEL", "P. PALOS"]
T = [
    (24, "LA ESTRELLA CAP. LA ESTRELLA",
     col("17:30", ["Salida", "Puente de Triana", "Reyes Católicos", "San Pablo", "San Pablo", "Rioja", *CO, "Arfe",
                   "Otto Moeckel", "Reyes Católicos", "Puente de Triana", "Pl. Altozano", "Entrada"]),
     col("19:00", ["Salida", "San Jacinto", "Puente de Triana", "San Pablo", "Rioja", *CO, "Fray Ceferino González",
                   "Postigo", "Arfe", "Adriano", "Pastor y Landero", "Reyes Católicos", "Puente de Triana", "San Jacinto", "Entrada"])),
    (24, "EL AMOR EL SALVADOR",
     col("20:30", ["Salida", "Cuna", *CO, "Argote de Molina", "Chapineros", "Entrada"]),
     col("21:30", ["Salida", "Cuna", *CO, "Argote de Molina", "Chapineros", "Entrada"])),
    (32, "SANTA MARTA PARR S ANDRÉS",
     col("18:00", ["Salida", *CO, "Alemanes", "Álvarez Quintero", "Cuna", "Entrada"]),
     col("18:30", ["Salida", *CO, "Argote de Molina", "Pl. Salvador", "Cuna", "Entrada"])),
    (32, "SAN GONZALO PARR. S. GONZALO",
     col("15:00", ["Salida", "San Jacinto", "San Jacinto", "San Jacinto", "Puente de Triana", "Reyes Católicos", "San Pablo",
                   "Rioja", *CO, "Arfe", "Adriano", "Reyes Católicos", "Paseo Cristóbal Colón", "Puente de Triana", "San Jacinto",
                   "San Jacinto", "Ntra. Sra. de la Salud", "Entrada"]),
     col("16:30", ["Salida", "Avda. Coria", "Pl. San Martín de Porres", "San Jacinto", "San Jacinto", "Paseo Cristóbal Colón",
                   "San Pablo", "Rioja", *CO, "Fray Ceferino González", "Arfe", "Adriano", "Pastor y Landero", "Puente de Triana",
                   "San Jacinto", "San Jacinto", "Pl. San Martín de Porres", "Ntra. Sra. de la Salud", "Entrada"])),
    (32, "VERA CRUZ CAP. DE JESUS",
     col("19:30", ["Salida", "Teniente Borges", *CO, "Francos", "Cuna", "Javier Lasso de la Vega", "Entrada"]),
     col("20:00", ["Salida", "Virgen de los Buenos Libros", *CO, "Francos", "Cuna", "Javier Lasso de la Vega", "Baños", "Entrada"])),
    (42, "LOS ESTUDIANTES RECTORADO",
     col("18:30", ["Salida", "Pl. Contratación", "Fray Ceferino González", "Castelar", "Gamazo", "Méndez Núñez", *CO,
                   "Miguel de Mañara", "Entrada"]),
     col("20:00", ["Salida", "Miguel de Mañara", "Arfe", "Gamazo", "Méndez Núñez", "O´Donnell", *CO, "San Gregorio",
                   "Lonja de la Universidad", "Entrada"])),
    (42, "SANTA CRUZ PARR. STA. CRUZ",
     col("19:30", ["Salida", "Mateos Gago", "Pl. Triunfo", "Tomás de Ibarra", "Castelar", "Barcelona", "Velázquez", *CO, "Entrada"]),
     col("20:30", ["Salida", "Mateos Gago", "Tomás de Ibarra", "Postigo del Aceite", "Barcelona", "CAMPANA", "SIERPES", "PLAZA",
                   "P. SAN MIGUEL", "P. PALOS", "Entrada"])),
]
json.dump([{"pagina": p, "cabecera": c, "cruz": a, "paso": b, "transcrita": True} for p, c, a, b in T],
          open("llamador2025_transcritas.json", "w"), ensure_ascii=False, indent=1)
print(len(T), "columnas transcritas")
