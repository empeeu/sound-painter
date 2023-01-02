function setupCanvasDrawing() {
    const drawingCanvas = document.getElementById('drawing-canvas');
    drawingContext = drawingCanvas.getContext('2d');
    let lineOverlay = document.getElementById('draw-line-overlay-helper');

    // draw gray transparent background

    // drawingContext.fillStyle = '#FFFFFFFF';
    // drawingContext.fillRect( 504, 504, 8, 8 );

    var drawingTexture = new THREE.CanvasTexture(drawingCanvas);

    var paint = false;
    var mouseSourceIsOn = false;
    var drawFreehand = false;

    document.addEventListener('keydown', function(e) {
        if (e.key === "Escape" | e.key === "Esc"){
            paint = false;
            lineOverlay.setAttribute("opacity", 0.0);
        }
    })

    drawingCanvas.addEventListener('pointerdown', function (e) {

        paint = true & !mouseSource;
        drawFreehand = document.getElementById('free-hand-draw').checked;
        mouseSourceIsOn = mouseSource;
        if (paint) {            
            drawingContext.beginPath();
            drawStartPos.set(e.offsetX, e.offsetY);
            if (!drawFreehand){
                lineOverlay.setAttribute("x1", e.offsetX);
                lineOverlay.setAttribute("y1", e.offsetY);
                lineOverlay.setAttribute("x2", e.offsetX);
                lineOverlay.setAttribute("y2", e.offsetY);
                lineOverlay.setAttribute("opacity", 0.5);
                lineOverlay.setAttribute("stroke-width", drawWidth);
            }
        }
        if (mouseSource) {
            source.z = parseFloat(document.getElementById('amplitude-select').value);
            source.w = parseFloat(document.getElementById('frequency-select').value);
        }
    });

    drawingCanvas.addEventListener('pointermove', function (e) {
        if (paint & drawFreehand) draw(drawingContext, e.offsetX, e.offsetY);
        if (paint & !drawFreehand){
            if (e.shiftKey){
                let dx = drawStartPos.x - e.offsetX;
                let dy = drawStartPos.y - e.offsetY;
                let x, y;
                if (Math.abs(dx) > 2 * Math.abs(dy)) {
                    y = drawStartPos.y;
                    x = e.offsetX;
                } else if (Math.abs(dy) > 2 * Math.abs(dx)) {
                    x = drawStartPos.x;
                    y = e.offsetY;
                } else { // 45 degrees case
                    let da = Math.max(Math.abs(dx), Math.abs(dy));
                    x = drawStartPos.x - da * Math.sign(dx);
                    y = drawStartPos.y - da * Math.sign(dy);
                }
                lineOverlay.setAttribute("x2", x);
                lineOverlay.setAttribute("y2", y);
            } else {
                lineOverlay.setAttribute("x2", e.offsetX);
                lineOverlay.setAttribute("y2", e.offsetY);
            }
        }
        if (mouseSource) {
            source.x = e.offsetX / widthContainer;
            source.y = (heightContainer - e.offsetY) / heightContainer;
            uniforms.source.value = source;
        }
        if (mouseProbe) {
            var mx = document.getElementById('mouse-x');
            var my = document.getElementById('mouse-y');
            mx.innerText = e.offsetX;
            my.innerText = e.offsetY;
            mouseProbeUpdate();
            if (!doRunSim) {
                simTime += dt;
                plotPressure(document.getElementById("plotXlims").value,
                             document.getElementById("plotYlims").value);
            }
        }

    });

    drawingCanvas.addEventListener('pointerup', function (e) {
        if (paint) {
            if (!drawFreehand){
                lineOverlay.setAttribute("opacity", 0.0);
                if (e.shiftKey){ 
                    draw(drawingContext,
                         lineOverlay.getAttribute("x2"),
                         lineOverlay.getAttribute("y2"));
                } else {
                    draw(drawingContext, e.offsetX, e.offsetY);
                }
            } else {
                draw(drawingContext, e.offsetX, e.offsetY);
            }
        }
        if (mouseSource) source.z = 0
        paint = false;

    });

    drawingCanvas.addEventListener('pointerleave', function () {
        if (drawFreehand){
            paint = false;
        }

    });

    return drawingTexture;

}
function draw(drawContext, x, y) {
    drawContext.moveTo(drawStartPos.x, drawStartPos.y);
    let rgba = hexColtoIntArr(drawColor);
    drawContext.strokeStyle = "rgba(" + rgba + ")";
    drawContext.lineWidth = drawWidth;
    if ((x === drawStartPos.x) & (y === drawStartPos.y)) {
        y += 1;
        x += 1;
    }
    drawContext.lineTo(x, y);
    drawContext.stroke();
    // reset drawing start position to current position.
    drawStartPos.set(x, y);
    // need to flag the map as needing updating.
    // material.map.needsUpdate = true;
    drawingTexture.needsUpdate = true;

}

function updateCanvasFromFile(event){
    console.log('updating canvas');
    let img = new Image();
    img.onload = function(){
        drawingContext.drawImage(img, 0, 0);
        drawingTexture.needsUpdate = true;
        console.log("Drawing image.");
    }
    img.onerror = function(){console.error("image load error")}
    img.src = URL.createObjectURL(event.files[0]);
}


function setDrawColor(color) {
    drawColor = color;
    drawingContext.globalCompositeOperation = "source-over";
}

function eraseColor() {
    setDrawColor('#888888ff');
    drawingContext.globalCompositeOperation = "destination-out";
}

function pressureErase() {
    renderer.setRenderTarget(pressureTexture0);
    renderer.render(initScene, camera);
    renderer.setRenderTarget(pressureTexture1);
    renderer.render(initScene, camera);
    renderer.setRenderTarget(pressureTexture2);
    renderer.render(initScene, camera);
    renderer.setRenderTarget(null);
    renderer.render(scene, camera);
}

function str_pad_left(string, pad, length) {
    // Pads the number with zeros to look nice for the timer display
    // string: string
    //    string to pad
    // pad: string
    //     What to pad with
    // length: int
    //     Length of section
    return (new Array(length + 1).join(pad) + string).slice(-length);
}

function hexColtoIntArr(c) {
    let r = (parseInt(c.substring(1, 3), 16));
    let g = (parseInt(c.substring(3, 5), 16));
    let b = (parseInt(c.substring(5, 7), 16));
    let a = (parseInt(c.substring(7, 9), 16));
    return [r, g, b, a];
}

function float2Hex(n) {
    return str_pad_left(Math.round(n * 255).toString(16), "0", 2);
}

// From: https://stackoverflow.com/questions/17242144/javascript-convert-hsb-hsv-color-to-rgb-accurately
// input: h in [0,360] and s,v in [0,1] - output: r,g,b in [0,1]
function hsv2rgb(h, s, v) {
    let f = (n, k = (n + h / 60) % 6) => v - v * s * Math.max(Math.min(k, 4 - k, 1), 0);
    rgb = [f(5), f(3), f(1)];
    return "#" + float2Hex(rgb[0]) + float2Hex(rgb[1]) + float2Hex(rgb[2]);
}

function updateDrawColor() {
    var hue = document.getElementById("frequency-select").value;
    hue = hue * 212 / 255 * 360;
    var sat = document.getElementById("amplitude-select").value;
    var val = document.getElementById("phase-select").value;

    var rgb = hsv2rgb(hue, sat, val) + "88";

    let ampRamp = document.getElementById('amplitude-select');
    let lowramp = hsv2rgb(hue, 0, 1);
    let highramp = hsv2rgb(hue, 1, 1);

    ampRamp.style.setProperty("--amp-track-color", 'linear-gradient(to right,' + lowramp + ',' + highramp + ')');

    let phaseRamp = document.getElementById('phase-select');
    lowramp = hsv2rgb(hue, 1, 0);
    highramp = hsv2rgb(hue, 1, 1);

    phaseRamp.style.setProperty("--phase-track-color", 'linear-gradient(to right,' + lowramp + ',' + highramp + ')');


    setDrawColor(rgb);
}

function mouseTestSound() {
    if (mouseSource) {
        mouseSource = false;
        document.getElementById("test-sound").innerText = "Mouse Sound OFF";
    } else {
        mouseSource = true;
        document.getElementById("test-sound").innerText = "Mouse Sound ON ";
    }
}

function clearCanvas(){
    const drawingCanvas = document.getElementById('drawing-canvas');
    drawingContext = drawingCanvas.getContext('2d');

    drawingContext.clearRect( 0, 0, drawingCanvas.width, drawingCanvas.height);
    drawingTexture.needsUpdate = true;
}

