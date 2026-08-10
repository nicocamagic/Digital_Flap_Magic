const video = document.getElementById("video");
const overlay = document.getElementById("overlay");
const startButton = document.getElementById("startCamera");
const status = document.getElementById("status");

const ctx = overlay.getContext("2d");

let stream = null;
let cvReady = false;
let processing = false;


// ===============================
// ESPERAR A QUE OPENCV ESTÉ LISTO
// ===============================

function esperarOpenCV() {

    if (typeof cv !== "undefined" && cv.Mat) {

        cvReady = true;

        status.textContent = "OpenCV listo ✓";

        console.log("OpenCV cargado");

    } else {

        status.textContent = "Cargando visión artificial...";

        setTimeout(esperarOpenCV, 500);
    }
}

esperarOpenCV();


// ===============================
// INICIAR CÁMARA
// ===============================

startButton.addEventListener(
    "click",
    iniciarCamara
);


async function iniciarCamara() {

    try {

        stream = await navigator.mediaDevices.getUserMedia({

            video: {
                facingMode: {
                    ideal: "environment"
                },

                width: {
                    ideal: 1280
                },

                height: {
                    ideal: 720
                }
            },

            audio: false
        });


        video.srcObject = stream;

        status.textContent = "Cámara activa ✓";

        video.addEventListener(
            "loadedmetadata",
            prepararCanvas,
            { once: true }
        );


    } catch (error) {

        console.error(error);

        status.textContent =
            "No se pudo acceder a la cámara";

    }
}


// ===============================
// PREPARAR CANVAS
// ===============================

function prepararCanvas() {

    overlay.width = video.videoWidth;
    overlay.height = video.videoHeight;

    iniciarDeteccion();
}


// ===============================
// BUCLE DE DETECCIÓN
// ===============================

function iniciarDeteccion() {

    const canvas =
        document.createElement("canvas");

    const canvasCtx =
        canvas.getContext("2d");

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;


    function analizar() {

        if (
            !processing &&
            cvReady &&
            video.readyState >= 2
        ) {

            processing = true;


            canvasCtx.drawImage(
                video,
                0,
                0,
                canvas.width,
                canvas.height
            );


            detectarCarta(canvas);


            processing = false;
        }


        requestAnimationFrame(analizar);
    }


    analizar();
}


// ===============================
// DETECTAR CARTA
// ===============================

function detectarCarta(canvas) {

    let src = null;
    let gray = null;
    let blurred = null;
    let edges = null;
    let contours = null;
    let hierarchy = null;


    try {

        src = cv.imread(canvas);

        gray = new cv.Mat();

        blurred = new cv.Mat();

        edges = new cv.Mat();

        contours = new cv.MatVector();

        hierarchy = new cv.Mat();


        // ---------------------------
        // ESCALA DE GRISES
        // ---------------------------

        cv.cvtColor(
            src,
            gray,
            cv.COLOR_RGBA2GRAY
        );


        // ---------------------------
        // REDUCIR RUIDO
        // ---------------------------

        cv.GaussianBlur(
            gray,
            blurred,
            new cv.Size(5, 5),
            0
        );


        // ---------------------------
        // DETECTAR BORDES
        // ---------------------------

        cv.Canny(
            blurred,
            edges,
            50,
            150
        );


        // ---------------------------
        // BUSCAR CONTORNOS
        // ---------------------------

        cv.findContours(
            edges,
            contours,
            hierarchy,
            cv.RETR_EXTERNAL,
            cv.CHAIN_APPROX_SIMPLE
        );


        let mejorCarta = null;
        let mejorArea = 0;


        // ---------------------------
        // ANALIZAR CONTORNOS
        // ---------------------------

        for (
            let i = 0;
            i < contours.size();
            i++
        ) {

            const contour =
                contours.get(i);


            const area =
                cv.contourArea(contour);


            // Ignorar objetos pequeños

            if (area < 5000) {

                contour.delete();

                continue;
            }


            const perimeter =
                cv.arcLength(
                    contour,
                    true
                );


            const approx =
                new cv.Mat();


            cv.approxPolyDP(
                contour,
                approx,
                0.02 * perimeter,
                true
            );


            // Queremos aproximadamente
            // 4 esquinas

            if (
                approx.rows === 4 &&
                area > mejorArea
            ) {

                const rect =
                    cv.boundingRect(
                        approx
                    );


                const ratio =
                    rect.width /
                    rect.height;


                /*
                 Una carta vertical suele
                 tener una proporción cercana
                 a 0.63.

                 Horizontalmente sería
                 aproximadamente 1.58.
                */

                const esCarta =
                    (
                        ratio > 0.45 &&
                        ratio < 0.75
                    )
                    ||
                    (
                        ratio > 1.35 &&
                        ratio < 1.80
                    );


                if (esCarta) {

                    mejorArea = area;

                    mejorCarta =
                        obtenerEsquinas(
                            approx
                        );
                }
            }


            approx.delete();
            contour.delete();
        }


        // ---------------------------
        // DIBUJAR RESULTADO
        // ---------------------------

        ctx.clearRect(
            0,
            0,
            overlay.width,
            overlay.height
        );


        if (mejorCarta) {

            dibujarCarta(
                mejorCarta
            );

            status.textContent =
                "🃏 CARTA DETECTADA ✓";

        } else {

            status.textContent =
                "Buscando carta...";
        }


    } catch (error) {

        console.error(
            "Error OpenCV:",
            error
        );

    } finally {

        if (src) src.delete();
        if (gray) gray.delete();
        if (blurred) blurred.delete();
        if (edges) edges.delete();
        if (contours) contours.delete();
        if (hierarchy) hierarchy.delete();
    }
}


// ===============================
// OBTENER 4 ESQUINAS
// ===============================

function obtenerEsquinas(approx) {

    const puntos = [];

    for (
        let i = 0;
        i < 4;
        i++
    ) {

        const x =
            approx.intPtr(i, 0)[0];

        const y =
            approx.intPtr(i, 0)[1];


        puntos.push({
            x: x,
            y: y
        });
    }


    return ordenarEsquinas(
        puntos
    );
}


// ===============================
// ORDENAR ESQUINAS
// ===============================

function ordenarEsquinas(puntos) {

    const ordenados =
        [...puntos];


    const centro = {

        x:
            puntos.reduce(
                (sum, p) =>
                    sum + p.x,
                0
            ) / 4,

        y:
            puntos.reduce(
                (sum, p) =>
                    sum + p.y,
                0
            ) / 4
    };


    ordenados.sort(
        (a, b) => {

            const anguloA =
                Math.atan2(
                    a.y - centro.y,
                    a.x - centro.x
                );

            const anguloB =
                Math.atan2(
                    b.y - centro.y,
                    b.x - centro.x
                );

            return anguloA - anguloB;
        }
    );


    return ordenados;
}


// ===============================
// DIBUJAR CARTA
// ===============================

function dibujarCarta(puntos) {

    if (!puntos || puntos.length !== 4) {
        return;
    }


    ctx.beginPath();


    ctx.moveTo(
        puntos[0].x,
        puntos[0].y
    );


    for (
        let i = 1;
        i < puntos.length;
        i++
    ) {

        ctx.lineTo(
            puntos[i].x,
            puntos[i].y
        );
    }


    ctx.closePath();


    // Borde

    ctx.lineWidth = 8;

    ctx.strokeStyle =
        "#00ff66";

    ctx.stroke();


    // Esquinas

    for (const punto of puntos) {

        ctx.beginPath();

        ctx.arc(
            punto.x,
            punto.y,
            12,
            0,
            Math.PI * 2
        );

        ctx.fillStyle =
            "#ff0055";

        ctx.fill();
    }
}