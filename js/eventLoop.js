
//Render everything!
var simTime = 0;
var startTime = 0;
var fpsOutput = document.getElementById("FPS");
var fps = 0;
var i = 0;
function render() {
    if (!doRunSim) {
        return;
    }
    setTimeout(function () {
        requestAnimationFrame(render);
    }, Math.max(0, 1000 / 30 - (Date.now() - startTime)));
    //Make the plane rotate on plane axes
    //mainPlaneObject.rotation.z += 0.02;
    //mainPlaneObject.rotation.x += 0.01;
    fps = 0.9 * fps + 0.05 * (1000 / (Date.now() - startTime));
    fpsOutput.innerText = Math.round(fps) + ' TIME: ' + Math.round(simTime * 100) / 100;
    startTime = Date.now();
    //Render onto our off screen texture
    for (var j = 0; j < 1; j++) {
        simTime += dt;
        renderer.setRenderTarget(textureRing[2]);
        renderer.render(bufferScene, camera);
        uniforms.time.value = uniforms.time.value + dt;
        textureRing = [textureRing[1], textureRing[2], textureRing[0]];
        uniforms.p0I.value = textureRing[0].texture;
        uniforms.p1I.value = textureRing[1].texture;
        uniforms.walls.value = drawingTexture;
    }

    //Finally, draw to the screen
    uniforms2.pI.value = textureRing[2].texture;
    renderer.setRenderTarget(null);
    renderer.render(scene, camera);
    i += 1;

    // TO READ pixels off a float texture, the texture needs to be in RGBA format
    // buff = new Float32Array(4);
    // renderer.readRenderTargetPixels(pressureTexture0, 64, 64, 1, 1, buff);
    // https://r105.threejsfundamentals.org/threejs/lessons/threejs-indexed-textures.html

}
// render();
var doRunSim = false;
function startStopRender() {
    var button = document.getElementById("Start");
    if (doRunSim) {
        // Already running, stop it
        button.innerText = "Start"
        doRunSim = false;
    } else {
        doRunSim = true;
        button.innerText = "Stop"
        render();
    }
}
startStopRender();
