function setupProbePlot(){
    console.log("Setting up probe plot");
    // grab the container
    let probeContainer = document.getElementById("pressureProbePlot");

    // Strategy is as follows
    //  *********** Main container ******************
    //  * |*********** Plot Canvas ***************  *
    //  * -*                                     *  *
    //  * |*                                     *  *
    //  * |***************************************  *
    //  * ----------------------------------------  *
    //  *                                           *
    //  ********************************************
    // The draw canvas has margins all around
    // the axes is a canvas ON TOP of the draw canvas -- more static
    // and takes up full container size

    probeContainer.style.width = widthDomain + 'px';
    console.log(probeContainer.style.width);
    let probeContainerHeight = Math.round(widthDomain / 1.618);
    probeContainer.style.height = probeContainerHeight + 'px';
    // Add the container for the axis and axis labels
    let probeAxis = document.createElement("div");
    probeAxis.classList = ["plotAxis"];
    probeContainer.append(probeAxis);

    // Add the canvas for actually drawing the probed pressure
    let probeCanvasContainer = document.createElement("div");
    probeCanvasContainer.classList = ["plotCanvas"];
    // probeCanvasContainer.style.width = widthDomain + 'px';
    probeContainer.append(probeCanvasContainer);
    probeCanvasContainer.style.marginTop = -probeContainerHeight + 'px';
    let probeCanvas = document.createElement("canvas");
    probeCanvas.width = widthDomain + 'px';
    probeCanvas.height = probeContainerHeight + 'px';
    probeCanvas.id = "probeCanvas";
    probeCanvasContainer.append(probeCanvas);
    // document.body.append(probeCanvas);
    probeCanvas = document.getElementById('probeCanvas');
    let canvasContext = probeCanvas.getContext('2d');
    probeCanvas.width = widthDomain;
    probeCanvas.height = probeContainerHeight;
    return canvasContext;
}

function mouseProbeSound() {
    if (mouseProbe) {
        mouseProbe = false;
        document.getElementById("probe-sound").innerText = "Mouse Probe OFF.";
    } else {
        mouseProbe = true;
        document.getElementById("probe-sound").innerText = "Mouse Probe ON .";
    }
}

function mouseProbeUpdate() {
    var mx = document.getElementById('mouse-x');
    var my = document.getElementById('mouse-y');
    var mp = document.getElementById('mouse-p');
    renderer.readRenderTargetPixels(
        textureRing[2],
        parseInt(mx.innerText),
        heightContainer - parseInt(my.innerText),
        1, 1, pressureBuf
    );
    mp.innerText = pressureBuf[2];
    pressureHist.push({val: pressureBuf[2], time: simTime});
    if (pressureHist.length > widthDomain){
        pressureHist = pressureHist.slice(1, pressureHist.length);
    }
}

function plotPressure(xlims=1, ylims=2){
    let plotCanvase = document.getElementsByClassName("plotCanvas")[0];
    // Figure out the axes
    let l = pressureHist.length - 1;
    let minTime = pressureHist[0].time;
    let maxTime = pressureHist[l].time;

    let w = plotCanvase.clientWidth;
    let h = plotCanvase.clientHeight;

    let drawDt = w / xlims;
    let drawDp = h / 2 / ylims;

    // probeContext.globalCompositeOperation = "destination-out";
    probeContext.clearRect(0, 0, w, h);
    probeContext.beginPath();
    probeContext.strokeStyle = "#FF0000";
    probeContext.lineWidth = 2;

    let x = w;
    let y = 0;
    while ((x > 0) & (l >= 0)) {
        x = Math.round(w - (maxTime - pressureHist[l].time) * drawDt);
        y = Math.round(pressureHist[l].val * drawDp + h / 2);
        probeContext.lineTo(x, h - y);
        console.log(x, y, l);
        l--;
    }
    probeContext.stroke();


    
}



