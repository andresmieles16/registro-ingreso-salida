import { Component, Output, EventEmitter, OnDestroy, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
  selector: 'app-camara',
  standalone: true,
  templateUrl: './camara.component.html',
  styleUrls: ['./camara.component.css'],
  imports: [CommonModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule]
})
export class CamaraComponent implements OnDestroy {

  @Input()  modoReconocimiento = false;
  @Output() fotoCaptada        = new EventEmitter<string>();
  @Output() cerrar             = new EventEmitter<void>();

  stream: MediaStream | null = null;
  fotoCapturada: string | null = null;
  error: string = '';
  camaraActiva  = false;
  procesando    = false;

  async abrirCamara(): Promise<void> {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' },
        audio: false
      });
      const video = document.getElementById('video-camara') as HTMLVideoElement;
      if (video) {
        video.srcObject = this.stream;
        video.play();
      }
      this.camaraActiva = true;
      this.error = '';
    } catch (e: any) {
      this.error = 'No se pudo acceder a la camara. Verifica los permisos.';
      console.error('Error camara:', e);
    }
  }

  capturarFoto(): void {
    const video  = document.getElementById('video-camara') as HTMLVideoElement;
    const canvas = document.getElementById('canvas-foto') as HTMLCanvasElement;

    if (video && canvas) {
      canvas.width  = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0);
        this.fotoCapturada = canvas.toDataURL('image/jpeg', 0.5);
      }
    }
  }

  usarFoto(): void {
    if (this.fotoCapturada) {
      this.fotoCaptada.emit(this.fotoCapturada);
      this.detenerCamara();
    }
  }

  repetir(): void {
    this.fotoCapturada = null;
  }

  detenerCamara(): void {
    if (this.stream) {
      this.stream.getTracks().forEach(t => t.stop());
      this.stream = null;
    }
    this.camaraActiva = false;
  }

  ngOnDestroy(): void {
    this.detenerCamara();
  }
}