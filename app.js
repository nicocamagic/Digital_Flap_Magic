const video = document.getElementById("video");
const overlay = document.getElementById("overlay");
const startButton = document.getElementById("startCamera");
const status = document.getElementById("status");

const ctx = overlay.getContext("2d");

let stream = null;

startButton.addEventListener("click", iniciarCamara);


async function iniciarCamara() {

    try {

        stream = await navigator.mediaDevices.getUserMedia({

            video: {
                facingMode: {
                    ideal: "environment"
                }
            },

            audio: false

        });

        video.srcObject = stream;

        status.textContent = "Cámara activa ✓";

        video.addEventListener(
            "loadedmetadata",
            prepararCanvas
        );

    } catch (error) {

        console.error(error);

        status.textContent =
            "No se pudo acceder a la cámara";

    }

}


function prepararCanvas() {

    overlay.width = video.videoWidth;
    overlay.height = video.videoHeight;

    iniciarDeteccion();
}

function iniciarDeteccion() {

    const canvas =
        document.createElement("canvas");

    const ctxCanvas =
        canvas.getContext("2d");

    function analizar() {

        if (
            video.readyState ===
            video.HAVE_ENOUGH_DATA
        ) {

            canvas.width =
                video.videoWidth;

            canvas.height =
                video.videoHeight;

            ctxCanvas.drawImage(
                video,
                0,
                0,
                canvas.width,
                canvas.height
            );

            detectarCarta(
                canvas
            );
        }

        requestAnimationFrame(analizar);
    }

    analizar();
}

function detectarCarta(canvas) {

    ctx.clearRect(
        0,
        0,
        overlay.width,
        overlay.height
    );

    // Próximamente:
    // OpenCV detectará la carta.

}