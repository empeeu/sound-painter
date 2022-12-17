function setupProbePlot(){
    console.log("Setting up probe plot");
    // grab the container
    let margin = 0;
    let probeContainer = document.getElementById("pressureProbePlot");
    let parent = probeContainer.parentElement;
    let myWidth = Math.round(parseInt(rs.getPropertyValue('--canvas-height')) * sndptrDM.window.aspect) - 2 * margin;
    let myHeight = Math.round(parseInt(rs.getPropertyValue('--canvas-height')) / 3) - 2 * margin;

    // Add buttons to control the xlims and ylims
    let xylims = document.createElement("div");
    xylims.innerHTML = `
        <div>
            <label id="plotXlimsLabel">Time</label>
            <input id="plotXlims" type="number" min="0.1" max="0.7" step="0.1" value="0.5">
        </div>
        <div>
            <label id="plotYlimsLabel">Amplitude</label>
            <input id="plotYlims" type="number" min="0.0" step="0.2" value="2">
        </div>
    `;
    xylims.id = "plotXYLims";
    let plotControlsContainer = document.getElementById("snd-ptr-plot-controls");
    plotControlsContainer.append(xylims);

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
    probeContainer.style.width = myWidth + margin * 2 + 'px';
    let probeContainerHeight = myHeight - margin * 2;
    probeContainer.style.height = probeContainerHeight + margin * 2 + 'px';
    // Add the container for the axis and axis labels
    let probeAxis = document.createElement("div");
    probeAxis.classList = ["plotAxis"];
    probeContainer.append(probeAxis);
    let svgContainer = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svgContainer.setAttribute("width", myWidth + margin * 2);
    svgContainer.setAttribute("height", probeContainerHeight + margin * 2);
    probeAxis.append(svgContainer);
    // Centerline
    let centerLine = drawSvgLine(
        [margin, myWidth+margin],
        [probeContainerHeight / 2 + margin, probeContainerHeight / 2 + margin],
        "rgb(50, 50, 50)",
        3);
    centerLine.id = "plotCenterline";
    svgContainer.append(centerLine); 

    let ticks = drawTicks(5, myWidth, probeContainerHeight, margin, 'rgb(0,0,0)', 1);
    for (var i =0; i< ticks.length; i++){
        svgContainer.append(ticks[i]);
    }
    let labels = drawTickLabels(5, myWidth, probeContainerHeight, margin, "#888888ff", "plotTickLabel")
    for (var i =0; i< labels.length; i++){
        svgContainer.append(labels[i]);
    }

    // Add an overlay SVG layer for drawing things ON TOP of the plot
    let svgOverlay = document.createElement("div");
    svgOverlay.id = "plotOverlayContainer";
    probeContainer.append(svgOverlay);
    svgOverlay.style.top = margin + 'px';
    svgOverlay.style.left = margin + 'px';
    svgOverlay.style.height = probeContainerHeight + 'px';
    svgOverlay.style.width = myWidth + 'px';
    let svgOverlayContainer = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svgOverlayContainer.id = "plotOverlay";
    svgOverlayContainer.setAttribute("width", myWidth + "px");
    svgOverlayContainer.setAttribute("height", probeContainerHeight + "px");
    svgOverlay.append(svgOverlayContainer);
    let testLine = drawSvgLine(
        [0, myWidth],
        [probeContainerHeight / 4, probeContainerHeight / 4],
        "rgba(256, 256, 50, 25)",
        8);
    let testLine2 = drawSvgLine(
        [0, myWidth],
        [3*probeContainerHeight / 4, 3*probeContainerHeight / 4],
        "rgba(256, 256, 50, 25)",
        8);
    svgOverlayContainer.append(testLine);
    svgOverlayContainer.append(testLine2);

    // Add the ca/nvas for actually drawing the probed pressure
    let probeCanvasContainer = document.createElement("div");
    probeCanvasContainer.classList = ["plotCanvas"];
    probeCanvasContainer.style.top = margin + 'px';
    probeCanvasContainer.style.left = margin + 'px';
    probeContainer.append(probeCanvasContainer);
    probeCanvasContainer.style.height = probeContainerHeight + 'px';
    probeCanvasContainer.style.width = myWidth + 'px';
    let probeCanvas = document.createElement("canvas");
    probeCanvas.width = myWidth + 'px';
    probeCanvas.height = probeContainerHeight + 'px';
    probeCanvas.id = "probeCanvas";
    probeCanvasContainer.append(probeCanvas);
    // document.body.append(probeCanvas);
    probeCanvas = document.getElementById('probeCanvas');
    let canvasContext = probeCanvas.getContext('2d');
    probeCanvas.width = myWidth;
    probeCanvas.height = probeContainerHeight;
    updateLabels(5, 1, 1, 1);
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

function drawSvgRect(x, y, width, height, fill, id, classNames){
    let svgRect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    svgRect.setAttribute("x", x);
    svgRect.setAttribute("y", y);
    svgRect.setAttribute("width", width);
    svgRect.setAttribute("height", height);
    svgRect.setAttribute("fill", fill);
    svgRect.id = id;
    svgRect.classList = classNames;
    return svgRect;
}

function drawTicks(n, width, height, margin, stroke, strokeWidth){
    let ticks = [];
    let dx = width / (n - 1);
    let dy = height / (n - 1);
    let tl = 20;
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
        let idvr = "svgTickBoxV" + i;
        let idhr = "svgTickBoxH" + i;
        let textv = i + "v";
        let texth = i + "h";
        if ((i > 0) & (i < n - 1)) {
            vt = drawSvgText(m, i * dy + m, fill, textv, idv, classNamesV);
            let bbox = vt.getBBox();
            console.log(bbox);
            vtr = drawSvgRect(bbox.x, bbox.y, bbox.width, bbox.height, 'white', idvr, "plotTickLabelV")
            labels.push(vtr);
            labels.push(vt);
        }
        if (i > 0) {
            ht = drawSvgText(i * dx + m, height / 2 + m, fill, texth, idh, classNamesH);
            bbox = ht.getBBox();
            htr = drawSvgRect(bbox.x, bbox.y, bbox.width, bbox.height, 'white', idhr, "plotTickLabelH")
            labels.push(htr);
            labels.push(ht);
        }
    }
    return labels;
}

function updateLabels(n, xlims, ylims){
    var damp = (ylims / (n - 1)) * 2;
    var timestep = xlims / (n - 1);
    for (var i = 0; i < n; i++){
        if ((i > 0) & (i < n - 1)) {
            let ht = document.getElementById("svgTickTextV" + i);
            let htr = document.getElementById("svgTickBoxV" + i);
            ht.innerHTML = Math.round((ylims - damp * i) * 1000) / 1000;
            htr.setAttribute("width", ht.getBBox().width);
            htr.setAttribute("height", ht.getBBox().height);
            htr.setAttribute("x", ht.getBBox().x);
            htr.setAttribute("y", ht.getBBox().y);
        }
        if (i > 0) {
            let vt = document.getElementById("svgTickTextH" + i);
            let vtr = document.getElementById("svgTickBoxH" + i);
            vt.innerHTML = Math.round((-(n - i - 1) * timestep) * 100) / 100;
            vtr.setAttribute("width", vt.getBBox().width);
            vtr.setAttribute("height", vt.getBBox().height);
            vtr.setAttribute("x", vt.getBBox().x);
            vtr.setAttribute("y", vt.getBBox().y);
        }
    }
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
    let margin = 10;
    let probeContainer = document.getElementById("pressureProbePlot");
    let parent = probeContainer.parentElement;
    let myWidth = parent.offsetWidth - 2 * margin;
    renderer.readRenderTargetPixels(
        textureRing[2],
        parseInt(mx.innerText),
        heightContainer - parseInt(my.innerText),
        1, 1, pressureBuf
    );
    mp.innerText = pressureBuf[2];
    pressureHist.push({val: pressureBuf[2], time: simTime});
    if (pressureHist.length > myWidth){
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
        // console.log(x, y, l);
        l--;
    }
    probeContext.stroke();


    
}



