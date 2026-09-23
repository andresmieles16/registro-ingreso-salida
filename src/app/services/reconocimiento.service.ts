import { Injectable } from '@angular/core';
import * as faceapi from '@vladmandic/face-api';
import { Firestore } from '@angular/fire/firestore';
import { collection, getDocs } from 'firebase/firestore';
import { RegistroPersona } from '../models/registro.model';

@Injectable({ providedIn: 'root' })
export class ReconocimientoService {

  private modelosCargados = false;

  constructor(private firestore: Firestore) {}

  // ===== CARGAR MODELOS =====
  async cargarModelos(): Promise<void> {
    if (this.modelosCargados) return;

    const ruta = '/models';
    await Promise.all([
      faceapi.nets.ssdMobilenetv1.loadFromUri(ruta),
      faceapi.nets.faceLandmark68Net.loadFromUri(ruta),
      faceapi.nets.faceRecognitionNet.loadFromUri(ruta),
    ]);
    this.modelosCargados = true;
    console.log('Modelos de reconocimiento facial cargados');
  }

  // ===== OBTENER DESCRIPTOR DE UNA IMAGEN BASE64 =====
  async obtenerDescriptor(imagenBase64: string): Promise<Float32Array | null> {
    try {
      const img = await faceapi.fetchImage(imagenBase64);
      const deteccion = await faceapi
        .detectSingleFace(img)
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!deteccion) return null;
      return deteccion.descriptor;
    } catch (e) {
      console.error('Error obteniendo descriptor:', e);
      return null;
    }
  }

  // ===== BUSCAR PERSONA POR CARA =====
  async buscarPorCara(imagenBase64: string): Promise<RegistroPersona | null> {
    try {
      await this.cargarModelos();

      // Obtener descriptor de la imagen capturada
      const descriptorBuscado = await this.obtenerDescriptor(imagenBase64);
      if (!descriptorBuscado) return null;

      // Obtener todas las personas que tienen foto guardada
      const db = this.firestore as any;
      const snapshot = await getDocs(collection(db, 'personas'));
      const personas = snapshot.docs
        .map(d => d.data() as RegistroPersona)
        .filter(p => p.foto);

      if (personas.length === 0) return null;

      // Construir matcher con todos los descriptores guardados
      const descriptoresGuardados = await Promise.all(
        personas.map(async p => {
          const descriptor = await this.obtenerDescriptor(p.foto!);
          return { persona: p, descriptor };
        })
      );

      const validos = descriptoresGuardados.filter(d => d.descriptor !== null);
      if (validos.length === 0) return null;

      const labeledDescriptors = validos.map(v =>
        new faceapi.LabeledFaceDescriptors(
          v.persona.documento,
          [v.descriptor as Float32Array]
        )
      );

      const matcher = new faceapi.FaceMatcher(labeledDescriptors, 0.5);
      const resultado = matcher.findBestMatch(descriptorBuscado);

      if (resultado.label === 'unknown') return null;

      // Retornar la persona encontrada
      const encontrada = personas.find(p => p.documento === resultado.label);
      return encontrada || null;

    } catch (e) {
      console.error('Error en reconocimiento facial:', e);
      return null;
    }
  }
}