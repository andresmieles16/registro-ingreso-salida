import sys
import os
from PyQt6.QtWidgets import QApplication, QMainWindow, QSplashScreen, QLabel
from PyQt6.QtWebEngineWidgets import QWebEngineView
from PyQt6.QtWebEngineCore import QWebEngineProfile, QWebEnginePage
from PyQt6.QtCore import QUrl, Qt, QTimer, QSize
from PyQt6.QtGui import QIcon, QPixmap, QColor, QPainter, QFont

class VentanaPrincipal(QMainWindow):
    def __init__(self):
        super().__init__()
        self.setWindowTitle("Sistema de Registro - Control de Acceso")
        self.setMinimumSize(1280, 800)
        self.showMaximized()

        # Icono de la aplicacion
        # self.setWindowIcon(QIcon('public/favicon.ico'))

        # Configurar el navegador interno
        self.navegador = QWebEngineView()

        # Habilitar caracteristicas necesarias para Firebase y camara
        perfil = QWebEngineProfile.defaultProfile()
        perfil.setHttpCacheType(QWebEngineProfile.HttpCacheType.NoCache)

        # Configurar permisos
        pagina = self.navegador.page()
        pagina.featurePermissionRequested.connect(self.manejarPermiso)

        # Cargar la app Angular compilada
        ruta_index = os.path.join(
            os.path.dirname(os.path.abspath(__file__)),
            'dist', 'registro-ingreso-salida', 'browser', 'index.html'
        )

        if os.path.exists(ruta_index):
            # Leer y modificar el base href para que funcione localmente
            with open(ruta_index, 'r', encoding='utf-8') as f:
                contenido = f.read()

            contenido = contenido.replace('<base href="/">', '<base href="./">')

            # Guardar version modificada
            ruta_temp = ruta_index.replace('index.html', 'index-desktop.html')
            with open(ruta_temp, 'w', encoding='utf-8') as f:
                f.write(contenido)

            self.navegador.load(QUrl.fromLocalFile(ruta_temp))
        else:
            # Si no esta compilado, cargar desde el servidor de desarrollo
            self.navegador.load(QUrl("http://localhost:4200"))

        self.setCentralWidget(self.navegador)

    def manejarPermiso(self, url, feature):
        # Aceptar automaticamente permisos de camara y microfono
        from PyQt6.QtWebEngineCore import QWebEnginePage
        permisos_aceptar = [
            QWebEnginePage.Feature.MediaAudioCapture,
            QWebEnginePage.Feature.MediaVideoCapture,
            QWebEnginePage.Feature.MediaAudioVideoCapture,
            QWebEnginePage.Feature.Geolocation,
            QWebEnginePage.Feature.Notifications,
        ]
        if feature in permisos_aceptar:
            self.navegador.page().setFeaturePermission(
                url, feature,
                QWebEnginePage.PermissionPolicy.PermissionGrantedByUser
            )


class SplashScreen(QSplashScreen):
    def __init__(self):
        # Crear pantalla de carga personalizada
        pixmap = QPixmap(500, 300)
        pixmap.fill(QColor('#1565c0'))

        painter = QPainter(pixmap)
        painter.setRenderHint(QPainter.RenderHint.Antialiasing)

        # Titulo
        painter.setPen(QColor('white'))
        font_titulo = QFont('Arial', 24, QFont.Weight.Bold)
        painter.setFont(font_titulo)
        painter.drawText(0, 80, 500, 60, Qt.AlignmentFlag.AlignCenter, 'Sistema de Registro')

        # Subtitulo
        font_sub = QFont('Arial', 12)
        painter.setFont(font_sub)
        painter.drawText(0, 140, 500, 40, Qt.AlignmentFlag.AlignCenter, 'Control de Ingreso y Salida')

        # Version
        font_ver = QFont('Arial', 10)
        painter.setFont(font_ver)
        painter.setPen(QColor('#90caf9'))
        painter.drawText(0, 240, 500, 30, Qt.AlignmentFlag.AlignCenter, 'Cargando...')

        painter.end()
        super().__init__(pixmap)
        self.setWindowFlag(Qt.WindowType.WindowStaysOnTopHint)


def main():
    # Necesario para que funcione en Windows
    os.environ['QTWEBENGINE_CHROMIUM_FLAGS'] = '--disable-web-security --allow-file-access-from-files'

    app = QApplication(sys.argv)
    app.setApplicationName("Sistema de Registro")
    app.setOrganizationName("Control de Acceso")

    # Mostrar splash screen mientras carga
    splash = SplashScreen()
    splash.show()
    app.processEvents()

    # Crear ventana principal
    ventana = VentanaPrincipal()

    # Cerrar splash y mostrar ventana despues de 2 segundos
    QTimer.singleShot(2000, lambda: (splash.finish(ventana), ventana.show()))

    sys.exit(app.exec())


if __name__ == '__main__':
    main()