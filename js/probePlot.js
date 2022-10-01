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
    let margin = 50;
    probeContainer.style.width = widthDomain + margin * 2 + 'px';
    let probeContainerHeight = Math.round(widthDomain / 1.618);
    probeContainer.style.height = probeContainerHeight + margin * 2 + 'px';
    // Add the container for the axis and axis labels
    let probeAxis = document.createElement("div");
    probeAxis.classList = ["plotAxis"];
    probeContainer.append(probeAxis);
    let svgContainer = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svgContainer.setAttribute("width", widthDomain + margin * 2);
    svgContainer.setAttribute("height", probeContainerHeight + margin * 2);
    probeAxis.append(svgContainer);
    // Centerline
    let centerLine = drawSvgLine(
        [margin, widthDomain+margin],
        [probeContainerHeight / 2 + margin, probeContainerHeight / 2 + margin],
        "rgb(50, 50, 50)",
        3);
    centerLine.id = "plotCenterline";
    svgContainer.append(centerLine); 

    let ticks = drawTicks(5, widthDomain, probeContainerHeight, margin, 'rgb(0,0,0)', 1);
    for (var i =0; i< ticks.length; i++){
        svgContainer.append(ticks[i]);
    }
    let labels = drawTickLabels(5, widthDomain, probeContainerHeight, margin, "#888888FF", "plotTickLabel")
    for (var i =0; i< labels.length; i++){
        svgContainer.append(labels[i]);
    }


    // Add the canvas for actually drawing the probed pressure
    let probeCanvasContainer = document.createElement("div");
    probeCanvasContainer.classList = ["plotCanvas"];
    probeCanvasContainer.style.top = margin + 'px';
    probeCanvasContainer.style.left = margin + 'px';
    probeContainer.append(probeCanvasContainer);
    probeCanvasContainer.style.height = probeContainerHeight + 'px';
    probeCanvasContainer.style.width = widthDomain + 'px';
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

function drawSvgLine(x, y, stroke, strokeWidth){
    let svgLine = document.createElementNS("http://www.w3.org/2000/svg", "line");
    svgLine.id = "plotCenterline";
    svgLine.setAttribute("x1", x[0]);
    svgLine.setAttribute("x2", x[1]);
    svgLine.setAttribute("y1", y[0]);
    svgLine.setAttribute("y2", y[1]);
    svgLine.setAttribute("stroke", stroke);
    svgLine.setAttribute("stroke-width", strokeWidth);
    return svgLine;
}

function drawSvgText(x, y, fill, text, id, classNames) {
    let svgText = document.createElementNS("http://www.w3.org/2000/svg", "text");
    svgText.id = id;
    svgText.setAttribute("x", x);
    svgText.setAttribute("y", y);
    svgText.setAttribute("fill", fill);
    svgText.innerHTML = text;
    svgText.classList = classNames;
    return svgText;
}

function drawTicks(n, width, height, margin, stroke, strokeWidth){
    let ticks = [];
    let dx = width / (n - 1);
    let dy = height / (n - 1);
    let tl = 5;
    let m = margin;
    for (var i = 0; i < n; i++){
        vt = drawSvgLine([i * dx + m, i * dx + m], [height / 2 - tl + m, height / 2 + tl + m], stroke, strokeWidth);
        vt2 = drawSvgLine([i * dx + m, i * dx + m], [height + m, height + tl + m], stroke, strokeWidth);
        ht = drawSvgLine([-tl + m, tl + m], [i * dy + m, i * dy + m], stroke, strokeWidth);
        ticks.push(vt);
        ticks.push(vt2);
        ticks.push(ht);
    }
    return ticks;
}

function drawTickLabels(n, width, height, margin, fill, className){
    let labels = [];
    let dx = width / (n - 1);
    let dy = height / (n - 1);
    let tl = 5;
    let m = margin;
    let classNamesH =className + " plotTickLabelH";
    let classNamesV =className + " plotTickLabelV";
    for (var i = 0; i < n; i++){
        let idh = "svgTickTextH" + i;
        let idv = "svgTickTextV" + i;
        let textv = i + "v";
        let texth = i + "h";
        ht = drawSvgText(i * dx + m, height + m, fill, texth, idv, classNamesH);
        vt = drawSvgText(m, i * dy + m, fill, textv, idv, classNamesV);
        labels.push(vt);
        labels.push(ht);
    }
    return labels;
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



