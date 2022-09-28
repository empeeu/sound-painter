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
    let probeContainerHeight = widthDomain / 1.618;
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
    probeCanvas.style.width = widthDomain + 'px';
    probeCanvas.style.height = probeContainerHeight + 'px';
    probeCanvasContainer.append(probeCanvas);
    return probeCanvas.getContext('2d');

}



