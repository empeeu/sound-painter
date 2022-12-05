
//Render everything!
var simTime = 0;
var startTime = 0;
var fpsOutput = document.getElementById("FPS");
var fps = baselineFramerate * document.getElementById("simSpeed").value, 
    framesThisSecond = 0,
    lastFpsUpdate = 0;
var frameId;
var i = 0;
var lastFrameTimeMs = 0;
var deltaTime = 0;
function render(timestamp) {
    if (!doRunSim) {
        return;
    }
    let simSpeed = document.getElementById("simSpeed").value;
    let timestep = 1000 / baselineFramerate / simSpeed;
    if (timestamp < (lastFrameTimeMs + (1000 / baselineFramerate / simSpeed))) {
        frameId = requestAnimationFrame(render);
        return;
    }
    deltaTime += timestamp - lastFrameTimeMs;
    lastFrameTimeMs = timestamp;
    
    // compute FPS
    if (timestamp > lastFpsUpdate + 1000) { // updates every second
        let omega = 0.5;
        fps = omega * framesThisSecond + (1 - omega) * fps;
        lastFpsUpdate = timestamp;
        framesThisSecond = 0;
        fpsOutput.innerText = Math.round(fps) + ' TIME: ' + Math.round(simTime * 100) / 100;
    }
    framesThisSecond ++;
    i = 0;
    while ((deltaTime >= timestep)){
        updateFrameData(timestep);
        deltaTime -= timestep;
        i ++;
        if (i > Math.max(simSpeed * 2, 10)){  // Panic!
            deltaTime = 0; 
            i = 0;
            document.getElementById("simSpeed").value = Math.max(1, simSpeed - 1);
            break;
        }
    }
    // console.log(i + " deltaTime: " + deltaTime);
    // deltaTime = 0;

    //Finally, draw to the screen
    uniforms2.pI.value = textureRing[2].texture;
    renderer.setRenderTarget(null);
    renderer.render(scene, camera);

    if (mouseProbe){        
        plotPressure(document.getElementById("plotXlims").value,
                     document.getElementById("plotYlims").value);
        updateLabels(5,
                     document.getElementById("plotXlims").value,
                     document.getElementById("plotYlims").value);
    }
    frameId = requestAnimationFrame(render);
    
}

function updateFrameData(){
        //Render onto our off screen texture
        simTime += dt;
        renderer.setRenderTarget(textureRing[2]);
        renderer.render(bufferScene, camera);
        uniforms.time.value = uniforms.time.value + dt;
        textureRing = [textureRing[1], textureRing[2], textureRing[0]];
        uniforms.p0I.value = textureRing[0].texture;
        uniforms.p1I.value = textureRing[1].texture;
        uniforms.walls.value = drawingTexture;
        
        // Update probe if needed
        if (mouseProbe){
            mouseProbeUpdate();
        }
}
// render();
var doRunSim = false;
function startStopRender() {
    var button = document.getElementById("Start");
    if (doRunSim) {
        // Already running, stop it
        button.innerText = "Start"
        doRunSim = false;
        cancelAnimationFrame(frameId);
    } else {
        doRunSim = true;
        button.innerText = "Stop"
        lastFrameTimeMs = performance.now();
        render(performance.now());
    }
}
startStopRender();
